import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface ReconciliationResult {
  entity: string;
  totalRecords: number;
  matchingRecords: number;
  mismatchedRecords: number;
  discrepancies: Array<{
    id: string;
    field: string;
    legacyValue: any;
    modernValue: any;
    difference: number;
  }>;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runFullReconciliation(): Promise<{
    invoices: ReconciliationResult;
    orders: ReconciliationResult;
    overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  }> {
    this.logger.log('Starting full data reconciliation...');

    const [invoices, orders] = await Promise.all([
      this.reconcileInvoices(),
      this.reconcileOrders(),
    ]);

    const totalRecords = invoices.totalRecords + orders.totalRecords;
    const totalMatching = invoices.matchingRecords + orders.matchingRecords;
    const matchRate = totalRecords > 0 ? totalMatching / totalRecords : 1;

    let overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    if (matchRate >= 0.999) {
      overallHealth = 'HEALTHY';
    } else if (matchRate >= 0.99) {
      overallHealth = 'WARNING';
    } else {
      overallHealth = 'CRITICAL';
    }

    return { invoices, orders, overallHealth };
  }

  private async reconcileInvoices(): Promise<ReconciliationResult> {
    // Simulate legacy data comparison
    const legacyInvoices = [
      { id: 'inv-1', total: 110.00, status: 'draft' },
      { id: 'inv-2', total: 198.00, status: 'draft' },
    ];

    const modernInvoices = await this.prisma.invoice.findMany();
    const discrepancies = [];
    let matchingRecords = 0;

    for (const legacy of legacyInvoices) {
      const modern = modernInvoices.find(m => m.id === legacy.id);
      if (!modern) {
        discrepancies.push({
          id: legacy.id,
          field: 'existence',
          legacyValue: 'exists',
          modernValue: 'missing',
          difference: 1,
        });
        continue;
      }

      let recordMatches = true;
      if (Math.abs(legacy.total - Number(modern.total)) > 0.01) {
        discrepancies.push({
          id: legacy.id,
          field: 'total',
          legacyValue: legacy.total,
          modernValue: Number(modern.total),
          difference: Math.abs(legacy.total - Number(modern.total)),
        });
        recordMatches = false;
      }

      if (recordMatches) {matchingRecords++;}
    }

    return {
      entity: 'invoices',
      totalRecords: legacyInvoices.length,
      matchingRecords,
      mismatchedRecords: legacyInvoices.length - matchingRecords,
      discrepancies,
    };
  }

  private async reconcileOrders(): Promise<ReconciliationResult> {
    // Simulate legacy data comparison
    const legacyOrders = [
      { id: 'ord-1', status: 'pending', total: 100.00 },
      { id: 'ord-2', status: 'confirmed', total: 200.00 },
    ];

    const modernOrders = await this.prisma.order.findMany();
    const discrepancies = [];
    let matchingRecords = 0;

    for (const legacy of legacyOrders) {
      const modern = modernOrders.find(m => m.id === legacy.id);
      if (!modern) {
        discrepancies.push({
          id: legacy.id,
          field: 'existence',
          legacyValue: 'exists',
          modernValue: 'missing',
          difference: 1,
        });
        continue;
      }

      let recordMatches = true;
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'confirmed': 'CONFIRMED',
      };

      if (statusMap[legacy.status] !== modern.status) {
        discrepancies.push({
          id: legacy.id,
          field: 'status',
          legacyValue: legacy.status,
          modernValue: modern.status,
          difference: 1,
        });
        recordMatches = false;
      }

      if (recordMatches) {matchingRecords++;}
    }

    return {
      entity: 'orders',
      totalRecords: legacyOrders.length,
      matchingRecords,
      mismatchedRecords: legacyOrders.length - matchingRecords,
      discrepancies,
    };
  }
}
