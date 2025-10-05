import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        phone: { type: 'string', example: '123-456-7890' },
        address: { type: 'string', example: '123 Main St' },
        city: { type: 'string', example: 'Anytown' },
        state: { type: 'string', example: 'CA' },
        zipCode: { type: 'string', example: '12345' },
        country: { type: 'string', example: 'USA' },
      },
      required: ['email', 'firstName', 'lastName'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'customer' },
            id: { type: 'string', example: 'clx1234567890' },
            attributes: {
              type: 'object',
              properties: {
                email: { type: 'string', example: 'john.doe@example.com' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                phone: { type: 'string', example: '123-456-7890' },
                address: { type: 'string', example: '123 Main St' },
                city: { type: 'string', example: 'Anytown' },
                state: { type: 'string', example: 'CA' },
                zipCode: { type: 'string', example: '12345' },
                country: { type: 'string', example: 'USA' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  })
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    const customer = await this.customersService.create(createCustomerDto);

    return {
      data: {
        type: 'customer',
        id: customer.id,
        attributes: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          country: customer.country,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
      },
    };
  }

  @Get(':id/orders')
  @ApiOperation({
    summary: 'Get customer orders',
    description: 'Retrieve orders for a specific customer with optional filtering',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: 'clx1234567890',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description:
      'Filter by active status (true for active orders, false for inactive, omit for all)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Customer orders retrieved successfully (filtered by isActive if provided)',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'order' },
              id: { type: 'string', example: 'clx1234567890' },
              attributes: {
                type: 'object',
                properties: {
                  customerId: { type: 'string', example: 'clx1234567890' },
                  status: { type: 'string', example: 'PENDING' },
                  total: { type: 'number', example: 99.99 },
                  subtotal: { type: 'number', example: 89.99 },
                  tax: { type: 'number', example: 10.0 },
                  discount: { type: 'number', example: 0 },
                  notes: {
                    type: 'string',
                    example: 'Special delivery instructions',
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
              relationships: {
                type: 'object',
                properties: {
                  items: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string', example: 'order-item' },
                            id: { type: 'string', example: 'clx1234567891' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: '404' },
              title: { type: 'string', example: 'Resource Not Found' },
              detail: {
                type: 'string',
                example: 'Customer with id clx1234567890 not found',
              },
              code: { type: 'string', example: 'NOT_FOUND' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: '401' },
              title: { type: 'string', example: 'Unauthorized' },
              detail: { type: 'string', example: 'Unauthorized access' },
              code: { type: 'string', example: 'UNAUTHORIZED' },
            },
          },
        },
      },
    },
  })
  async getCustomerOrders(@Param('id') id: string, @Query('isActive') isActive?: string) {
    // Convert string query parameter to boolean
    const isActiveFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const orders = await this.customersService.findCustomerOrders(id, isActiveFilter);

    return {
      data: orders.map((order) => {
        const orderData = order as any;
        return {
          type: 'order',
          id: orderData.id,
          attributes: {
            customerId: orderData.customerId,
            status: orderData.status,
            total: parseFloat(orderData.total.toString()),
            subtotal: parseFloat(orderData.subtotal.toString()),
            tax: parseFloat(orderData.tax.toString()),
            discount: parseFloat(orderData.discount.toString()),
            notes: orderData.notes,
            createdAt: orderData.createdAt,
            updatedAt: orderData.updatedAt,
          },
          relationships: {
            items: {
              data: orderData.items.map((item: any) => ({
                type: 'order-item',
                id: item.id,
              })),
            },
          },
        };
      }),
      meta: {
        count: orders.length,
      },
    };
  }
}
