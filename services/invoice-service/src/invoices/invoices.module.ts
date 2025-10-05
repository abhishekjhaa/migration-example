import { Module } from '@nestjs/common';
import { PrismaModule } from '@order-management/shared';
import { ExternalModule } from '../external/external.module';
import { InvoiceRepository } from './invoice.repository';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [PrismaModule, ExternalModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceRepository],
  exports: [InvoicesService],
})
export class InvoicesModule {}
