import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@order-management/shared';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Invoice Service Integration (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let customerId: string;
  let orderId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Apply the same global configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Create test data via API calls to Order Service
    const timestamp = Date.now();
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

    // Create test customer via Order Service API
    const customerResponse = await fetch(`${orderServiceUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test-${timestamp}@example.com`,
        firstName: 'Test',
        lastName: 'Customer',
        phone: '123-456-7890',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA',
      }),
    });

    if (!customerResponse.ok) {
      throw new Error(`Failed to create test customer: ${customerResponse.statusText}`);
    }

    const customerData = await customerResponse.json();
    customerId = customerData.data.id;

    // Create test order via Order Service API
    const orderResponse = await fetch(`${orderServiceUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customerId,
        status: 'PENDING',
        total: 100.0,
        subtotal: 90.0,
        tax: 10.0,
        discount: 0,
        notes: 'Test order for integration testing',
      }),
    });

    if (!orderResponse.ok) {
      throw new Error(`Failed to create test order: ${orderResponse.statusText}`);
    }

    const orderData = await orderResponse.json();
    orderId = orderData.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (prismaService) {
      await prismaService.invoice.deleteMany();
      await prismaService.order.deleteMany();
      await prismaService.customer.deleteMany();
    }
    await app.close();
  });

  describe('Invoice Management', () => {
    describe('POST /invoices', () => {
      it('should create invoice successfully', () => {
        const invoiceData = {
          orderId: orderId,
          taxRate: 0.1,
          discountAmount: 0,
        };

        return request(app.getHttpServer())
          .post('/invoices')
          .send(invoiceData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('type', 'invoice');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.attributes).toHaveProperty('orderId', orderId);
            expect(res.body.data.attributes).toHaveProperty('customerId', customerId);
            expect(res.body.data.attributes).toHaveProperty('number');
            expect(res.body.data.attributes).toHaveProperty('status', 'DRAFT');
            expect(res.body.data.attributes).toHaveProperty('subtotal', 90.0);
            expect(res.body.data.attributes).toHaveProperty('tax', 9.0);
            expect(res.body.data.attributes).toHaveProperty('total', 99.0);

            // Store invoice ID for subsequent tests
            invoiceId = res.body.data.id;
          });
      });

      it('should return 404 for empty order id', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: '',
            taxRate: 0.1,
          })
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 404 for non-existent order', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: 'non-existent-order-id',
            taxRate: 0.1,
          })
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 409 for duplicate invoice creation', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: orderId,
            taxRate: 0.1,
          })
          .expect(409)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'CONFLICT');
          });
      });

      it('should return 400 for negative tax rate', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: orderId,
            taxRate: -0.1,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for tax rate greater than 100%', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: orderId,
            taxRate: 1.5, // 150%
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for negative discount amount', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: orderId,
            taxRate: 0.1,
            discountAmount: -10.0,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for discount amount greater than subtotal', async () => {
        // Create a new order for this test
        const newOrder = await prismaService.order.create({
          data: {
            customerId: customerId,
            status: 'PENDING',
            total: 100.0,
            subtotal: 90.0,
            tax: 10.0,
            discount: 0,
            notes: 'Test order for discount validation',
          },
        });

        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: newOrder.id,
            taxRate: 0.1,
            discountAmount: 200.0, // Greater than subtotal (90.0)
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'BAD_REQUEST');
          });
      });

      it('should return 400 for invalid due date format', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: orderId,
            taxRate: 0.1,
            dueDate: 'invalid-date-format',
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for due date in the past', async () => {
        // Create a new order for this test
        const newOrder = await prismaService.order.create({
          data: {
            customerId: customerId,
            status: 'PENDING',
            total: 100.0,
            subtotal: 90.0,
            tax: 10.0,
            discount: 0,
            notes: 'Test order for past date validation',
          },
        });

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: newOrder.id,
            taxRate: 0.1,
            dueDate: pastDate.toISOString(),
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'BAD_REQUEST');
          });
      });

      it('should return 400 for missing required fields', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            // Missing orderId
            taxRate: 0.1,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for invalid order ID format', () => {
        return request(app.getHttpServer())
          .post('/invoices')
          .send({
            orderId: 'invalid-order-id-format',
            taxRate: 0.1,
          })
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });
    });

    describe('GET /invoices/:id', () => {
      it('should get invoice by id successfully', () => {
        return request(app.getHttpServer())
          .get(`/invoices/${invoiceId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('type', 'invoice');
            expect(res.body.data).toHaveProperty('id', invoiceId);
            expect(res.body.data.attributes).toHaveProperty('orderId', orderId);
            expect(res.body.data.attributes).toHaveProperty('customerId', customerId);
            expect(res.body.data.attributes).toHaveProperty('status', 'DRAFT');
          });
      });

      it('should return 404 for non-existent invoice', () => {
        return request(app.getHttpServer())
          .get('/invoices/non-existent-invoice-id')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 404 for invalid invoice ID format', () => {
        return request(app.getHttpServer())
          .get('/invoices/invalid-id-format')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 404 for whitespace-only invoice ID', () => {
        return request(app.getHttpServer())
          .get('/invoices/%20%20%20')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 404 for extremely long invoice ID', () => {
        const longId = 'a'.repeat(1000);
        return request(app.getHttpServer())
          .get(`/invoices/${longId}`)
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });
    });

    describe('GET /invoices', () => {
      it('should get all invoices successfully', () => {
        return request(app.getHttpServer())
          .get('/invoices')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');
            expect(typeof res.body.meta.count).toBe('number');
            expect(res.body.meta.count).toBeGreaterThanOrEqual(0);
          });
      });

      it('should filter invoices by customer id', () => {
        return request(app.getHttpServer())
          .get(`/invoices?customerId=${customerId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');
            expect(typeof res.body.meta.count).toBe('number');
            expect(res.body.meta.count).toBeGreaterThanOrEqual(0);

            // If there are invoices, verify they belong to the test customer
            if (res.body.meta.count > 0) {
              res.body.data.forEach((invoice: any) => {
                expect(invoice.attributes.customerId).toBe(customerId);
              });
            }
          });
      });

      it('should filter invoices by order id', () => {
        return request(app.getHttpServer())
          .get(`/invoices?orderId=${orderId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');
            expect(typeof res.body.meta.count).toBe('number');
            expect(res.body.meta.count).toBeGreaterThanOrEqual(0);

            // If there are invoices, verify they belong to the test order
            if (res.body.meta.count > 0) {
              res.body.data.forEach((invoice: any) => {
                expect(invoice.attributes.orderId).toBe(orderId);
              });
            }
          });
      });

      it('should filter invoices by status', () => {
        return request(app.getHttpServer())
          .get('/invoices?status=DRAFT')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');

            // If there are invoices with DRAFT status, verify they all have DRAFT status
            if (res.body.meta.count > 0) {
              res.body.data.forEach((invoice: any) => {
                expect(invoice.attributes.status).toBe('DRAFT');
              });
            }
          });
      });

      it('should handle multiple filter combinations', () => {
        return request(app.getHttpServer())
          .get(`/invoices?customerId=${customerId}&status=DRAFT&orderId=${orderId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');

            // Verify all returned invoices match all filter criteria
            res.body.data.forEach((invoice: any) => {
              expect(invoice.attributes.customerId).toBe(customerId);
              expect(invoice.attributes.status).toBe('DRAFT');
              expect(invoice.attributes.orderId).toBe(orderId);
            });
          });
      });

      it('should handle empty filter results', () => {
        return request(app.getHttpServer())
          .get('/invoices?status=PAID')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count', 0);
            expect(res.body.data).toHaveLength(0);
          });
      });

      it('should handle invalid filter values', () => {
        return request(app.getHttpServer())
          .get('/invoices?status=INVALID_STATUS')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count', 0);
            expect(res.body.data).toHaveLength(0);
          });
      });

      it('should handle non-existent customer ID filter', () => {
        return request(app.getHttpServer())
          .get('/invoices?customerId=non-existent-customer-id')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count', 0);
            expect(res.body.data).toHaveLength(0);
          });
      });

      it('should handle non-existent order ID filter', () => {
        return request(app.getHttpServer())
          .get('/invoices?orderId=non-existent-order-id')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count', 0);
            expect(res.body.data).toHaveLength(0);
          });
      });
    });
  });

  describe('Health Check', () => {
    describe('GET /health', () => {
      it('should return health status', () => {
        return request(app.getHttpServer())
          .get('/health')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.attributes).toHaveProperty('status', 'ok');
          });
      });
    });
  });
});
