import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheHealthController } from './cache-health.controller';
import { CacheInterceptor } from './cache.interceptor';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [CacheHealthController],
  providers: [
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
