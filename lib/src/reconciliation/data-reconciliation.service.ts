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
    legacyValue: unknown;
    modernValue: unknown;
    difference: number;
  }>;
}

@Injectable()
export class DataReconciliationService {
  private readonly logger = new Logger(DataReconciliationService.name);

  // Constants for reconciliation thresholds
  private static readonly TOLERANCE = 0.01;
  private static readonly HEALTHY_THRESHOLD = 0.999;
  private static readonly WARNING_THRESHOLD = 0.99;

  constructor(private readonly prisma: PrismaService) {}

  async reconcileInvoices(): Promise<ReconciliationResult> {
    this.logger.log('Starting invoice data reconciliation...');

    // Simulate legacy invoices data
    const legacyInvoices = [
      {
        id: 'legacy-invoice-1',
        customerId: 'legacy-cust-1',
        orderId: 'legacy-order-1',
        total: 110.0,
        subtotal: 100.0,
        tax: 10.0,
        discount: 0.0,
        status: 'draft',
      },
      {
        id: 'legacy-invoice-2',
        customerId: 'legacy-cust-2',
        orderId: 'legacy-order-2',
        total: 198.0,
        subtotal: 200.0,
        tax: 18.0,
        discount: 20.0,
        status: 'draft',
      },
    ];

    // Get modern invoices
    const modernInvoices = await this.prisma.invoice.findMany();

    const discrepancies = [];
    let matchingRecords = 0;

    // Create lookup maps
    const legacyMap = new Map(legacyInvoices.map((inv: any) => [inv.id, inv]));
    const modernMap = new Map(modernInvoices.map((inv) => [inv.id, inv]));

    // Compare each invoice
    for (const [id, legacyInvoice] of legacyMap) {
      const modernInvoice = modernMap.get(id);

      if (!modernInvoice) {
        discrepancies.push({
          id,
          field: 'existence',
          legacyValue: 'exists',
          modernValue: 'missing',
          difference: 1,
        });
        continue;
      }

      // Compare key fields
      const fieldsToCompare = ['total', 'subtotal', 'tax', 'discount', 'status'];
      let recordMatches = true;

      for (const field of fieldsToCompare) {
        const legacyVal = legacyInvoice[field];
        const modernVal = modernInvoice[field];

        if (typeof legacyVal === 'number' && typeof modernVal === 'number') {
          const difference = Math.abs(legacyVal - modernVal);
          if (difference > DataReconciliationService.TOLERANCE) {
            discrepancies.push({
              id,
              field,
              legacyValue: legacyVal,
              modernValue: modernVal,
              difference,
            });
            recordMatches = false;
          }
        } else if (field === 'status') {
          // Map legacy status to modern status
          const statusMap: Record<string, string> = {
            draft: 'DRAFT',
            sent: 'SENT',
            paid: 'PAID',
            overdue: 'OVERDUE',
            cancelled: 'CANCELLED',
          };

          const mappedLegacyStatus = statusMap[legacyVal?.toLowerCase()] || legacyVal;
          if (mappedLegacyStatus !== modernVal) {
            discrepancies.push({
              id,
              field,
              legacyValue: legacyVal,
              modernValue: modernVal,
              difference: 1,
            });
            recordMatches = false;
          }
        } else if (legacyVal !== modernVal) {
          discrepancies.push({
            id,
            field,
            legacyValue: legacyVal,
            modernValue: modernVal,
            difference: 1,
          });
          recordMatches = false;
        }
      }

      if (recordMatches) {
        matchingRecords++;
      }
    }

    const result: ReconciliationResult = {
      entity: 'invoices',
      totalRecords: legacyInvoices.length,
      matchingRecords,
      mismatchedRecords: legacyInvoices.length - matchingRecords,
      discrepancies,
    };

    this.logger.log('Invoice reconciliation completed:', {
      total: result.totalRecords,
      matching: result.matchingRecords,
      mismatched: result.mismatchedRecords,
    });

    return result;
  }

  async reconcileOrders(): Promise<ReconciliationResult> {
    this.logger.log('Starting order data reconciliation...');

    // Simulate legacy orders data
    const legacyOrders = [
      {
        id: 'legacy-order-1',
        customerId: 'legacy-cust-1',
        status: 'pending',
        total: 100.0,
        subtotal: 90.0,
        tax: 10.0,
        discount: 0.0,
      },
      {
        id: 'legacy-order-2',
        customerId: 'legacy-cust-2',
        status: 'confirmed',
        total: 200.0,
        subtotal: 180.0,
        tax: 20.0,
        discount: 0.0,
      },
    ];

    // Get modern orders in batches
    const modernOrders = await this.prisma.order.findMany();

    const discrepancies = [];
    let matchingRecords = 0;

    const legacyMap = new Map(legacyOrders.map((ord: any) => [ord.id, ord]));
    const modernMap = new Map(modernOrders.map((ord) => [ord.id, ord]));

    for (const [id, legacyOrder] of legacyMap) {
      const modernOrder = modernMap.get(id);

      if (!modernOrder) {
        discrepancies.push({
          id,
          field: 'existence',
          legacyValue: 'exists',
          modernValue: 'missing',
          difference: 1,
        });
        continue;
      }

      // Compare order fields
      const fieldsToCompare = ['status', 'total', 'subtotal', 'tax', 'discount'];
      let recordMatches = true;

      for (const field of fieldsToCompare) {
        const legacyVal = legacyOrder[field];
        const modernVal = modernOrder[field];

        if (field === 'status') {
          // Map legacy status to modern status
          const statusMap: Record<string, string> = {
            pending: 'PENDING',
            confirmed: 'CONFIRMED',
            processing: 'PROCESSING',
            shipped: 'SHIPPED',
            delivered: 'DELIVERED',
            cancelled: 'CANCELLED',
            returned: 'RETURNED',
          };

          const mappedLegacyStatus = statusMap[legacyVal?.toLowerCase()] || legacyVal;
          if (mappedLegacyStatus !== modernVal) {
            discrepancies.push({
              id,
              field,
              legacyValue: legacyVal,
              modernValue: modernVal,
              difference: 1,
            });
            recordMatches = false;
          }
        } else if (typeof legacyVal === 'number' && typeof modernVal === 'number') {
          const difference = Math.abs(legacyVal - modernVal);
          if (difference > DataReconciliationService.TOLERANCE) {
            discrepancies.push({
              id,
              field,
              legacyValue: legacyVal,
              modernValue: modernVal,
              difference,
            });
            recordMatches = false;
          }
        }
      }

      if (recordMatches) {
        matchingRecords++;
      }
    }

    return {
      entity: 'orders',
      totalRecords: legacyOrders.length,
      matchingRecords,
      mismatchedRecords: legacyOrders.length - matchingRecords,
      discrepancies,
    };
  }

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

    // Determine overall health
    const totalRecords = invoices.totalRecords + orders.totalRecords;
    const totalMatching = invoices.matchingRecords + orders.matchingRecords;
    const matchRate = totalRecords > 0 ? totalMatching / totalRecords : 1;

    let overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    if (matchRate >= DataReconciliationService.HEALTHY_THRESHOLD) {
      overallHealth = 'HEALTHY';
    } else if (matchRate >= DataReconciliationService.WARNING_THRESHOLD) {
      overallHealth = 'WARNING';
    } else {
      overallHealth = 'CRITICAL';
    }

    const result = {
      invoices,
      orders,
      overallHealth,
    };

    this.logger.log('Full reconciliation completed:', {
      totalRecords,
      totalMatching,
      matchRate: `${(matchRate * 100).toFixed(2)}%`,
      overallHealth,
    });

    return result;
  }
}
