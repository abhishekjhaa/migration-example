import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { handlePrismaError } from '@order-management/shared';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly orderRepository: OrderRepository) {}

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
