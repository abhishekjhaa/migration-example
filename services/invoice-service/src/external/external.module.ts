import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderApiService } from './order-api.service';

@Module({
  imports: [ConfigModule],
  providers: [OrderApiService],
  exports: [OrderApiService],
})
export class ExternalModule {}
