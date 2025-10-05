import { Injectable } from '@nestjs/common';
import { PrismaService } from '@order-management/shared';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: unknown): Promise<Customer> {
    return this.prisma.customer.create({ data: data as any });
  }

  async findById(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async findOrdersByCustomer(customerId: string, isActive?: boolean): Promise<unknown[]> {
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
