import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Cacheable, CacheInvalidate, handlePrismaError } from '@order-management/shared';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  @CacheInvalidate(['customer:*'])
  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const customer = await this.customerRepository.create(createCustomerDto);
      return customer;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw handlePrismaError(error, 'creating customer');
    }
  }

  @Cacheable({ ttl: 600, keyPrefix: 'customer' })
  async findById(id: string) {
    try {
      const customer = await this.customerRepository.findById(id);

      if (!customer) {
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.NOT_FOUND.toString(),
                title: 'Not Found',
                detail: `Customer with id ${id} not found`,
                code: 'NOT_FOUND',
              },
            ],
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return customer;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw handlePrismaError(error, 'retrieving customer');
    }
  }

  @Cacheable({ ttl: 300, keyPrefix: 'customer-orders' })
  async findCustomerOrders(customerId: string, isActive?: boolean): Promise<unknown[]> {
    try {
      // First verify customer exists
      await this.findById(customerId);

      const whereClause: Record<string, unknown> = { customerId };

      if (isActive !== undefined) {
        if (isActive) {
          // Active orders are those that are not cancelled, returned, or delivered
          whereClause.status = {
            in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'],
          };
        } else {
          // Inactive orders are those that are cancelled, returned, or delivered
          whereClause.status = {
            in: ['CANCELLED', 'RETURNED', 'DELIVERED'],
          };
        }
      }

      const orders = await this.customerRepository.findOrdersByCustomer(customerId, isActive);

      return orders;
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
              detail: `Customer with id ${customerId} not found`,
              code: 'NOT_FOUND',
            },
          ],
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
