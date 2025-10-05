import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', example: 'clx1234567890' },
        status: { type: 'string', example: 'PENDING' },
        total: { type: 'number', example: 100.0 },
        subtotal: { type: 'number', example: 90.0 },
        tax: { type: 'number', example: 10.0 },
        discount: { type: 'number', example: 0.0 },
        notes: { type: 'string', example: 'Order notes' },
      },
      required: ['customerId', 'status', 'total', 'subtotal', 'tax'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'order' },
            id: { type: 'string', example: 'clx1234567890' },
            attributes: {
              type: 'object',
              properties: {
                customerId: { type: 'string', example: 'clx1234567890' },
                status: { type: 'string', example: 'PENDING' },
                total: { type: 'number', example: 100.0 },
                subtotal: { type: 'number', example: 90.0 },
                tax: { type: 'number', example: 10.0 },
                discount: { type: 'number', example: 0.0 },
                notes: { type: 'string', example: 'Order notes' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);

    return {
      data: {
        type: 'order',
        id: order.id,
        attributes: {
          customerId: order.customerId,
          status: order.status,
          total: parseFloat(order.total.toString()),
          subtotal: parseFloat(order.subtotal.toString()),
          tax: parseFloat(order.tax.toString()),
          discount: parseFloat(order.discount.toString()),
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: 'clx1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async getOrder(@Param('id') id: string) {
    const order = await this.ordersService.findById(id);

    const orderData = order as any;
    return {
      data: {
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
          customer: {
            data: {
              type: 'customer',
              id: orderData.customer.id,
            },
          },
          items: {
            data: orderData.items.map((item: any) => ({
              type: 'order-item',
              id: item.id,
            })),
          },
        },
      },
    };
  }
}
