import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  CACHE_INVALIDATE_METADATA,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from './cache.decorator';
import { CacheService } from './cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const cacheKeyData = this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    const ttl = this.reflector.get(CACHE_TTL_METADATA, context.getHandler());
    const invalidatePatterns = this.reflector.get(CACHE_INVALIDATE_METADATA, context.getHandler());

    // Handle cache invalidation methods
    if (invalidatePatterns && !cacheKeyData) {
      return this.handleInvalidation(next, invalidatePatterns, context);
    }

    // Handle cacheable methods
    if (cacheKeyData && ttl) {
      return this.handleCacheable(next, cacheKeyData, ttl, invalidatePatterns, context);
    }

    // For non-cached methods, just execute normally
    return next.handle();
  }

  private handleInvalidation(
    next: CallHandler,
    patterns: unknown,
    context: ExecutionContext,
  ): Observable<unknown> {
    return next.handle().pipe(
      tap(async () => {
        await this.invalidateCache(patterns as string | string[], context);
      }),
    );
  }

  private async handleCacheable(
    next: CallHandler,
    cacheKeyData: unknown,
    ttl: number,
    invalidatePatterns: unknown,
    context: ExecutionContext,
  ): Promise<Observable<unknown>> {
    const cacheKey = this.generateCacheKey(cacheKeyData, context);

    // Try to get from cache
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult !== null) {
      return of(cachedResult);
    }

    // If not in cache, execute method and cache result
    return this.executeAndCache(next, cacheKey, ttl, invalidatePatterns, context);
  }

  private executeAndCache(
    next: CallHandler,
    cacheKey: string,
    ttl: number,
    invalidatePatterns: unknown,
    context: ExecutionContext,
  ): Observable<unknown> {
    return next.handle().pipe(
      tap(async (result) => {
        if (result !== null && result !== undefined) {
          await this.cacheService.set(cacheKey, result, ttl);
        }

        // Handle cache invalidation if specified
        if (invalidatePatterns) {
          await this.invalidateCache(invalidatePatterns as string | string[], context);
        }
      }),
    );
  }

  private generateCacheKey(cacheKeyData: unknown, context: ExecutionContext): string {
    const data = cacheKeyData as { prefix: string; method: string };
    const { prefix, method } = data;
    const args = context.getArgs();

    // Generate key parts from method arguments
    const keyParts = args.map((arg: unknown) => {
      if (typeof arg === 'string' || typeof arg === 'number') {
        return arg;
      }
      if (typeof arg === 'object' && arg !== null) {
        // For objects, create a hash of the relevant properties
        return JSON.stringify(arg);
      }
      return String(arg);
    });

    return this.cacheService.generateKey(`${prefix}:${method}`, ...keyParts);
  }

  private async invalidateCache(
    patterns: string | string[],
    context: ExecutionContext,
  ): Promise<void> {
    const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

    for (const pattern of patternsArray) {
      // Replace placeholders with actual values from context
      const resolvedPattern = this.resolvePattern(pattern, context);
      await this.cacheService.delPattern(resolvedPattern);
    }
  }

  private resolvePattern(pattern: string, context: ExecutionContext): string {
    const args = context.getArgs();

    // Replace common placeholders
    let resolvedPattern = pattern;

    // Replace :id with first argument (usually the ID)
    if (args.length > 0 && typeof args[0] === 'string') {
      resolvedPattern = resolvedPattern.replace(':id', args[0]);
    }

    // Replace :customerId with customer ID if present
    if (args.length > 0 && typeof args[0] === 'string') {
      resolvedPattern = resolvedPattern.replace(':customerId', args[0]);
    }

    return resolvedPattern;
  }
}
