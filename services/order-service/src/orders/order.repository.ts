import { Injectable } from '@nestjs/common';
import { PrismaService } from '@order-management/shared';
import { Order } from '@prisma/client';

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: unknown): Promise<Order> {
    return this.prisma.order.create({ data: data as any });
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async findByIdWithDetails(id: string): Promise<unknown> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    });
  }

  async findByCustomerId(customerId: string, isActive?: boolean): Promise<unknown[]> {
    const where: Record<string, unknown> = { customerId };

    if (isActive !== undefined) {
      where.status = isActive
        ? { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] }
        : { in: ['CANCELLED', 'RETURNED', 'DELIVERED'] };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
