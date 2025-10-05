import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CacheService } from './cache.service';

@ApiTags('Cache Health')
@Controller('cache/health')
export class CacheHealthController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  @ApiOperation({ summary: 'Get cache health status' })
  @ApiResponse({
    status: 200,
    description: 'Cache health information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        redisConnected: { type: 'boolean', example: true },
        memoryCacheSize: { type: 'number', example: 42 },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getHealth() {
    const stats = this.cacheService.getStats();

    return {
      status: stats.redisConnected ? 'healthy' : 'degraded',
      redisConnected: stats.redisConnected,
      memoryCacheSize: stats.memoryCacheSize,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get detailed cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed cache statistics',
    schema: {
      type: 'object',
      properties: {
        redisConnected: { type: 'boolean' },
        memoryCacheSize: { type: 'number' },
        memoryCacheKeys: { type: 'array', items: { type: 'string' } },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getStats() {
    const stats = this.cacheService.getStats();

    return {
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('clear')
  @ApiOperation({ summary: 'Clear all cache entries' })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cache cleared successfully' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async clearCache() {
    await this.cacheService.clear();

    return {
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
