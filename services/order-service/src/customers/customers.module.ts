import { Module } from '@nestjs/common';
import { PrismaModule } from '@order-management/shared';
import { CustomerRepository } from './customer.repository';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
