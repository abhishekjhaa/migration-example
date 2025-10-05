import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateMigration(): Promise<{
    success: boolean;
    message: string;
    recordCounts: {
      customers: number;
      orders: number;
      invoices: number;
    };
  }> {
    try {
      const [customers, orders, invoices] = await Promise.all([
        this.prisma.customer.count(),
        this.prisma.order.count(),
        this.prisma.invoice.count(),
      ]);

      const totalRecords = customers + orders + invoices;

      return {
        success: totalRecords > 0,
        message: totalRecords > 0
          ? `Migration successful: ${totalRecords} records migrated`
          : 'No records found - migration may have failed',
        recordCounts: { customers, orders, invoices },
      };
    } catch (error) {
      this.logger.error('Migration validation failed:', error);
      return {
        success: false,
        message: `Migration validation failed: ${error instanceof Error ? error.message : String(error)}`,
        recordCounts: { customers: 0, orders: 0, invoices: 0 },
      };
    }
  }
}
