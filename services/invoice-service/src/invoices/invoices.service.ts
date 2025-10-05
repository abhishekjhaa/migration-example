import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  calculateTax,
  calculateTotal,
  generateInvoiceNumber,
  handlePrismaError,
} from '@order-management/shared';
import { OrderApiService } from '../external/order-api.service';
import { InvoiceRepository } from './invoice.repository';

export interface CreateInvoiceData {
  orderId: string;
  taxRate?: number;
  discountAmount?: number;
  dueDate?: Date;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly orderApiService: OrderApiService,
  ) {}

  async createInvoice(createInvoiceData: CreateInvoiceData) {
    try {
      // Check if invoice already exists for this order
      const existingInvoice = await this.invoiceRepository.findByOrderId(createInvoiceData.orderId);

      if (existingInvoice) {
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.CONFLICT.toString(),
                title: 'Conflict',
                detail: 'Invoice already exists for this order',
                code: 'CONFLICT',
              },
            ],
          },
          HttpStatus.CONFLICT,
        );
      }

      // Get order details and validate order exists in a single call
      const orderData = (await this.orderApiService.getOrderById(createInvoiceData.orderId)) as any;

      // Validate discount amount
      const discountAmount = createInvoiceData.discountAmount ?? 0;
      if (discountAmount > orderData.subtotal) {
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.BAD_REQUEST.toString(),
                title: 'Bad Request',
                detail: 'Discount amount cannot be greater than subtotal',
                code: 'BAD_REQUEST',
              },
            ],
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate due date is not in the past
      if (createInvoiceData.dueDate) {
        const dueDate = new Date(createInvoiceData.dueDate);
        const now = new Date();
        if (dueDate < now) {
          throw new HttpException(
            {
              errors: [
                {
                  status: HttpStatus.BAD_REQUEST.toString(),
                  title: 'Bad Request',
                  detail: 'Due date cannot be in the past',
                  code: 'BAD_REQUEST',
                },
              ],
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Calculate invoice totals
      const taxRate = createInvoiceData.taxRate ?? 0.1; // ASSUMPTION - Default 10% tax

      const subtotal = orderData.subtotal;
      const tax = calculateTax(subtotal, taxRate);
      const total = calculateTotal(subtotal, tax, discountAmount);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice
      const invoice = await this.invoiceRepository.create({
        orderId: createInvoiceData.orderId,
        customerId: orderData.customerId,
        number: invoiceNumber,
        status: 'DRAFT',
        subtotal,
        tax,
        discount: discountAmount,
        total,
        dueDate: createInvoiceData.dueDate,
      });

      return invoice;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw handlePrismaError(error, 'creating invoice');
    }
  }

  async findById(id: string) {
    try {
      const invoice = await this.invoiceRepository.findById(id);

      if (!invoice) {
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.NOT_FOUND.toString(),
                title: 'Not Found',
                detail: `Invoice with id ${id} not found`,
                code: 'NOT_FOUND',
              },
            ],
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return invoice;
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
              detail: `Invoice with id ${id} not found`,
              code: 'NOT_FOUND',
            },
          ],
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async findAll(filters?: {
    customerId?: string;
    status?: string;
    orderId?: string;
  }): Promise<unknown[]> {
    try {
      const whereClause: Record<string, unknown> = {};

      if (filters?.customerId) {
        whereClause.customerId = filters.customerId;
      }

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.orderId) {
        whereClause.orderId = filters.orderId;
      }

      const invoices = await this.invoiceRepository.findWithFilters(filters || {});

      return invoices;
    } catch (error) {
      // For invalid filter values, return empty array instead of throwing error
      if (
        error instanceof Error &&
        (error.message.includes('Invalid enum value') ||
          error.message.includes('Unknown argument') ||
          error.message.includes('Invalid value'))
      ) {
        return [];
      }

      // Log the actual error for debugging
      console.error('Error in findAll:', error);

      throw new HttpException(
        {
          errors: [
            {
              status: HttpStatus.BAD_REQUEST.toString(),
              title: 'Bad Request',
              detail: 'Failed to retrieve invoices',
              code: 'BAD_REQUEST',
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    // Get the count of invoices for this month
    const count = await this.invoiceRepository.countByMonth(year, month);

    return generateInvoiceNumber(count + 1);
  }
}
