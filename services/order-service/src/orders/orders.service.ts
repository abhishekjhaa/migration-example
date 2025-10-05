import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Cacheable, CacheInvalidate, handlePrismaError } from '@order-management/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderRepository } from './order.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly orderRepository: OrderRepository) {}

  @CacheInvalidate(['order:*', 'customer-orders:*'])
  async create(createOrderDto: CreateOrderDto) {
    try {
      const order = await this.orderRepository.create(createOrderDto);
      return order;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw handlePrismaError(error, 'creating order');
    }
  }

  @Cacheable({ ttl: 300, keyPrefix: 'order' })
  async findById(id: string) {
    try {
      const order = await this.orderRepository.findByIdWithDetails(id);

      if (!order) {
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.NOT_FOUND.toString(),
                title: 'Not Found',
                detail: `Order with id ${id} not found`,
                code: 'NOT_FOUND',
              },
            ],
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return order;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          errors: [
            {
              status: HttpStatus.NOT_FOUND.toString(),
              title: 'Not Found',
              detail: `Order with id ${id} not found`,
              code: 'NOT_FOUND',
            },
          ],
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
