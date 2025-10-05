import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private inMemoryCache = new Map<string, { value: unknown; expires: number }>();
  // Constants for magic numbers
  private static readonly DEFAULT_TTL = 300;
  private static readonly MAX_MEMORY_CACHE_SIZE = 1000;

  private readonly defaultTtl = CacheService.DEFAULT_TTL; // 5 minutes
  private readonly maxMemoryCacheSize = CacheService.MAX_MEMORY_CACHE_SIZE; // Max items in memory cache

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeRedis();
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private async initializeRedis() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        this.redis.on('connect', () => {
          this.logger.log('Connected to Redis');
        });

        this.redis.on('error', (error) => {
          this.logger.warn(
            'Redis connection error, falling back to in-memory cache:',
            error instanceof Error ? error.message : String(error),
          );
          this.redis = null;
        });

        await this.redis.connect();
      } catch (error) {
        this.logger.warn(
          'Failed to connect to Redis, using in-memory cache:',
          error instanceof Error ? error.message : String(error),
        );
        this.redis = null;
      }
    } else {
      this.logger.log('No Redis URL provided, using in-memory cache');
    }
  }

  /**
   * Get value from cache (Redis or in-memory)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      const redisValue = await this.getFromRedis<T>(key);
      if (redisValue !== null) {
        return redisValue;
      }

      // Fallback to in-memory cache
      return this.getFromMemory<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  private getFromMemory<T>(key: string): T | null {
    const cached = this.inMemoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value as T;
    }

    // Clean up expired entry
    if (cached) {
      this.inMemoryCache.delete(key);
    }

    return null;
  }

  /**
   * Set value in cache (Redis and in-memory)
   */
  async set(key: string, value: unknown, ttl: number = this.defaultTtl): Promise<void> {
    try {
      await this.setInRedis(key, value, ttl);
      this.setInMemoryCache(key, value, ttl);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  private async setInRedis(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.redis) {
      return;
    }

    const serializedValue = JSON.stringify(value);
    await this.redis.setex(key, ttl, serializedValue);
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.delFromRedis(key);
      this.delFromMemory(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  private async delFromRedis(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
    }
  }

  private delFromMemory(key: string): void {
    this.inMemoryCache.delete(key);
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Delete from Redis
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      // Delete from in-memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.inMemoryCache.keys()) {
        if (regex.test(key)) {
          this.inMemoryCache.delete(key);
        }
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      // Check Redis first
      if (this.redis) {
        const exists = await this.redis.exists(key);
        if (exists) {
          return true;
        }
      }

      // Check in-memory cache
      const cached = this.inMemoryCache.get(key);
      return cached ? cached.expires > Date.now() : false;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryCacheSize = this.inMemoryCache.size;
    const memoryCacheKeys = Array.from(this.inMemoryCache.keys());

    return {
      redisConnected: Boolean(this.redis),
      memoryCacheSize,
      memoryCacheKeys: memoryCacheKeys.slice(0, 10), // First 10 keys for debugging
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Clear Redis
      if (this.redis) {
        await this.redis.flushdb();
      }

      // Clear in-memory cache
      this.inMemoryCache.clear();
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  private setInMemoryCache(key: string, value: unknown, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.inMemoryCache.size >= CacheService.MAX_MEMORY_CACHE_SIZE) {
      const firstKey = this.inMemoryCache.keys().next().value;
      this.inMemoryCache.delete(firstKey);
    }

    this.inMemoryCache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  /**
   * Clean up expired entries from in-memory cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, cached] of this.inMemoryCache.entries()) {
      if (cached.expires <= now) {
        this.inMemoryCache.delete(key);
      }
    }
  }
}
