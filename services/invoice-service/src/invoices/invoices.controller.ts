import { Body, Controller, Get, HttpException, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new invoice',
    description: 'Create an invoice for an existing order with tax and discount calculations',
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'invoice' },
            id: { type: 'string', example: 'clx1234567890' },
            attributes: {
              type: 'object',
              properties: {
                orderId: { type: 'string', example: 'clx1234567890' },
                customerId: { type: 'string', example: 'clx1234567891' },
                number: { type: 'string', example: 'INV-202412-0001' },
                status: { type: 'string', example: 'DRAFT' },
                subtotal: { type: 'number', example: 89.99 },
                tax: { type: 'number', example: 9.0 },
                discount: { type: 'number', example: 0 },
                total: { type: 'number', example: 98.99 },
                dueDate: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: '400' },
              title: { type: 'string', example: 'Validation Error' },
              detail: { type: 'string', example: 'Order ID is required' },
              code: { type: 'string', example: 'VALIDATION_ERROR' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
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
                example: 'Order with id clx1234567890 not found',
              },
              code: { type: 'string', example: 'NOT_FOUND' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Invoice already exists for this order',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: '409' },
              title: { type: 'string', example: 'Conflict' },
              detail: {
                type: 'string',
                example: 'Invoice already exists for this order',
              },
              code: { type: 'string', example: 'CONFLICT' },
            },
          },
        },
      },
    },
  })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.createInvoice({
      orderId: createInvoiceDto.orderId,
      taxRate: createInvoiceDto.taxRate,
      discountAmount: createInvoiceDto.discountAmount,
      dueDate: createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : undefined,
    });

    return {
      data: {
        type: 'invoice',
        id: invoice.id,
        attributes: {
          orderId: invoice.orderId,
          customerId: invoice.customerId,
          number: invoice.number,
          status: invoice.status,
          subtotal: parseFloat(invoice.subtotal.toString()),
          tax: parseFloat(invoice.tax.toString()),
          discount: parseFloat(invoice.discount.toString()),
          total: parseFloat(invoice.total.toString()),
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        },
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all invoices',
    description: 'Retrieve all invoices with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'invoice' },
              id: { type: 'string', example: 'clx1234567890' },
              attributes: {
                type: 'object',
                properties: {
                  orderId: { type: 'string', example: 'clx1234567890' },
                  customerId: { type: 'string', example: 'clx1234567891' },
                  number: { type: 'string', example: 'INV-202412-0001' },
                  status: { type: 'string', example: 'DRAFT' },
                  subtotal: { type: 'number', example: 89.99 },
                  tax: { type: 'number', example: 9.0 },
                  discount: { type: 'number', example: 0 },
                  total: { type: 'number', example: 98.99 },
                  dueDate: {
                    type: 'string',
                    format: 'date-time',
                    nullable: true,
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  async getInvoices(
    @Query('customerId') customerId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
  ) {
    const invoices = await this.invoicesService.findAll({
      customerId,
      orderId,
      status,
    });

    return {
      data: invoices.map((invoice) => {
        const invoiceData = invoice as any;
        return {
          type: 'invoice',
          id: invoiceData.id,
          attributes: {
            orderId: invoiceData.orderId,
            customerId: invoiceData.customerId,
            number: invoiceData.number,
            status: invoiceData.status,
            subtotal: parseFloat(invoiceData.subtotal.toString()),
            tax: parseFloat(invoiceData.tax.toString()),
            discount: parseFloat(invoiceData.discount.toString()),
            total: parseFloat(invoiceData.total.toString()),
            dueDate: invoiceData.dueDate,
            createdAt: invoiceData.createdAt,
            updatedAt: invoiceData.updatedAt,
          },
        };
      }),
      meta: {
        count: invoices.length,
      },
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Retrieve a specific invoice by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'invoice' },
            id: { type: 'string', example: 'clx1234567890' },
            attributes: {
              type: 'object',
              properties: {
                orderId: { type: 'string', example: 'clx1234567890' },
                customerId: { type: 'string', example: 'clx1234567891' },
                number: { type: 'string', example: 'INV-202412-0001' },
                status: { type: 'string', example: 'DRAFT' },
                subtotal: { type: 'number', example: 89.99 },
                tax: { type: 'number', example: 9.0 },
                discount: { type: 'number', example: 0 },
                total: { type: 'number', example: 98.99 },
                dueDate: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
    schema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: '404' },
              title: { type: 'string', example: 'Not Found' },
              detail: {
                type: 'string',
                example: 'Invoice with ID clx1234567890 not found',
              },
              code: { type: 'string', example: 'NOT_FOUND' },
            },
          },
        },
      },
    },
  })
  async getInvoice(@Param('id') id: string) {
    if (!id || id.trim() === '' || id.trim().length === 0) {
      throw new HttpException(
        {
          errors: [
            {
              status: '404',
              title: 'Not Found',
              detail: 'Invoice ID is required',
              code: 'NOT_FOUND',
            },
          ],
        },
        404,
      );
    }

    const invoice = await this.invoicesService.findById(id);

    return {
      data: {
        type: 'invoice',
        id: invoice.id,
        attributes: {
          orderId: invoice.orderId,
          customerId: invoice.customerId,
          number: invoice.number,
          status: invoice.status,
          subtotal: parseFloat(invoice.subtotal.toString()),
          tax: parseFloat(invoice.tax.toString()),
          discount: parseFloat(invoice.discount.toString()),
          total: parseFloat(invoice.total.toString()),
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        },
      },
    };
  }
}
