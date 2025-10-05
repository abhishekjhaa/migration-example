import { Injectable } from '@nestjs/common';
import { PrismaService } from '@order-management/shared';
import { Invoice } from '@prisma/client';

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: unknown): Promise<Invoice> {
    return this.prisma.invoice.create({ data: data as any });
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({ where: { orderId } });
  }

  async findWithFilters(filters: {
    customerId?: string;
    orderId?: string;
    status?: string;
  }): Promise<Invoice[]> {
    const where: Record<string, unknown> = {};
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.orderId) {
      where.orderId = filters.orderId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByMonth(year: number, month: number): Promise<number> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    return this.prisma.invoice.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });
  }
}
