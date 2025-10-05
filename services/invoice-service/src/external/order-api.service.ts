import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrderApiService {
  private readonly orderServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.orderServiceUrl = this.configService.get<string>(
      'ORDER_SERVICE_URL',
      'http://localhost:3001',
    );
  }

  async getOrderById(orderId: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.orderServiceUrl}/orders/${orderId}`);

      if (!response.ok) {
        // Handle different HTTP error status codes
        if (response.status === 500) {
          throw new HttpException(
            {
              errors: [
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
                  title: 'Internal Server Error',
                  detail: 'Order service returned internal server error',
                  code: 'SERVICE_COMMUNICATION_ERROR',
                },
              ],
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        } else if (response.status === 404) {
          throw new HttpException(
            {
              errors: [
                {
                  status: HttpStatus.NOT_FOUND.toString(),
                  title: 'Not Found',
                  detail: `Order with id ${orderId} not found`,
                  code: 'NOT_FOUND',
                },
              ],
            },
            HttpStatus.NOT_FOUND,
          );
        } else {
          // For other HTTP errors, treat as service communication error
          throw new HttpException(
            {
              errors: [
                {
                  status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
                  title: 'Internal Server Error',
                  detail: `Order service returned ${response.status} error`,
                  code: 'SERVICE_COMMUNICATION_ERROR',
                },
              ],
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Handle JSON parsing errors
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
                title: 'Internal Server Error',
                detail: 'Order service returned malformed response',
                code: 'SERVICE_COMMUNICATION_ERROR',
              },
            ],
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (data?.data) {
        const orderData = data.data as any;
        return {
          id: orderData.id,
          customerId: orderData.attributes.customerId,
          status: orderData.attributes.status,
          total: orderData.attributes.total,
          subtotal: orderData.attributes.subtotal,
          tax: orderData.attributes.tax,
          discount: orderData.attributes.discount,
          notes: orderData.attributes.notes,
          createdAt: orderData.attributes.createdAt,
          updatedAt: orderData.attributes.updatedAt,
        };
      }

      throw new HttpException(
        {
          errors: [
            {
              status: HttpStatus.NOT_FOUND.toString(),
              title: 'Not Found',
              detail: `Order with id ${orderId} not found`,
              code: 'NOT_FOUND',
            },
          ],
        },
        HttpStatus.NOT_FOUND,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle different types of service communication failures
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for network/communication failures that should return 500
      const networkErrorPatterns = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNRESET',
        'socket hang up',
        'timeout',
        'certificate',
        'SSL',
        'TLS',
        'CERT',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'SELF_SIGNED_CERTIFICATE',
        'CERT_HAS_EXPIRED',
        'getaddrinfo',
        'network',
        'fetch',
      ];

      if (networkErrorPatterns.some((pattern) => errorMessage.includes(pattern))) {
        throw new HttpException(
          {
            errors: [
              {
                status: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
                title: 'Internal Server Error',
                detail: 'Service communication failure',
                code: 'SERVICE_COMMUNICATION_ERROR',
              },
            ],
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // For other errors, return 400 Bad Request
      throw new HttpException(
        {
          errors: [
            {
              status: HttpStatus.BAD_REQUEST.toString(),
              title: 'Bad Request',
              detail: 'Failed to fetch order from order service',
              code: 'BAD_REQUEST',
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
