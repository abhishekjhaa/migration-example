import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@order-management/shared';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Order Service Integration (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let customerId: string;
  let orderId: string;

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

  describe('Customer Management', () => {
    describe('POST /customers', () => {
      it('should create a new customer successfully', () => {
        const timestamp = Date.now();
        const customerData = {
          email: `test-${timestamp}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          phone: '123-456-7890',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA',
        };

        return request(app.getHttpServer())
          .post('/customers')
          .send(customerData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('type', 'customer');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.attributes).toHaveProperty('email', customerData.email);
            expect(res.body.data.attributes).toHaveProperty('firstName', customerData.firstName);
            expect(res.body.data.attributes).toHaveProperty('lastName', customerData.lastName);

            // Store customer ID for subsequent tests
            customerId = res.body.data.id;
          });
      });

      it('should return 400 for invalid customer data', () => {
        return request(app.getHttpServer())
          .post('/customers')
          .send({
            email: 'invalid-email',
            firstName: '',
            lastName: 'Doe',
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for duplicate email', async () => {
        const timestamp = Date.now();
        const customerData = {
          email: `duplicate-${timestamp}@example.com`,
          firstName: 'Test',
          lastName: 'User',
        };

        // Create first customer
        await request(app.getHttpServer()).post('/customers').send(customerData).expect(201);

        // Try to create second customer with same email
        return request(app.getHttpServer())
          .post('/customers')
          .send(customerData)
          .expect(409)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'DUPLICATE_ENTRY');
          });
      });

      it('should return 400 for missing required fields', () => {
        return request(app.getHttpServer())
          .post('/customers')
          .send({
            firstName: 'Test',
            // Missing email and lastName
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for extremely long email', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        return request(app.getHttpServer())
          .post('/customers')
          .send({
            email: longEmail,
            firstName: 'Test',
            lastName: 'User',
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for invalid email format variations', async () => {
        const invalidEmails = [
          'test@',
          '@example.com',
          'test..test@example.com',
          'test@example',
          'test@.com',
          'test@example..com',
        ];

        for (const email of invalidEmails) {
          await request(app.getHttpServer())
            .post('/customers')
            .send({
              email,
              firstName: 'Test',
              lastName: 'User',
            })
            .expect(400)
            .expect((res) => {
              expect(res.body).toHaveProperty('error', 'Bad Request');
              expect(res.body).toHaveProperty('message');
              expect(Array.isArray(res.body.message)).toBe(true);
            });
        }
      });
    });
  });

  describe('Order Management', () => {
    describe('POST /orders', () => {
      it('should create a new order successfully', () => {
        const orderData = {
          customerId: customerId,
          status: 'PENDING',
          total: 100.0,
          subtotal: 90.0,
          tax: 10.0,
          discount: 0,
          notes: 'Integration test order',
        };

        return request(app.getHttpServer())
          .post('/orders')
          .send(orderData)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('type', 'order');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.attributes).toHaveProperty('customerId', customerId);
            expect(res.body.data.attributes).toHaveProperty('status', 'PENDING');
            expect(res.body.data.attributes).toHaveProperty('total', 100.0);

            // Store order ID for subsequent tests
            orderId = res.body.data.id;
          });
      });

      it('should return 400 for invalid order data', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: '',
            status: 'INVALID_STATUS',
            total: -100,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for non-existent customer ID', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: 'non-existent-customer-id',
            status: 'PENDING',
            total: 100.0,
            subtotal: 90.0,
            tax: 10.0,
            discount: 0,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'INVALID_REFERENCE');
          });
      });

      it('should return 400 for negative monetary values', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'PENDING',
            total: -100.0,
            subtotal: -90.0,
            tax: -10.0,
            discount: -5.0,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for zero monetary values', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'PENDING',
            total: 0,
            subtotal: 0,
            tax: 0,
            discount: 0,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 500 for extremely large monetary values (database overflow)', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'PENDING',
            total: 999999999.99,
            subtotal: 999999999.99,
            tax: 999999999.99,
            discount: 0,
          })
          .expect(500)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'DATABASE_ERROR');
          });
      });

      it('should return 400 for invalid order status', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'INVALID_STATUS',
            total: 100.0,
            subtotal: 90.0,
            tax: 10.0,
            discount: 0,
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });

      it('should return 400 for missing required fields', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'PENDING',
            // Missing total, subtotal, tax
          })
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('error', 'Bad Request');
            expect(res.body).toHaveProperty('message');
            expect(Array.isArray(res.body.message)).toBe(true);
          });
      });
    });

    describe('GET /orders/:id', () => {
      it('should get order by id successfully', () => {
        return request(app.getHttpServer())
          .get(`/orders/${orderId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('type', 'order');
            expect(res.body.data).toHaveProperty('id', orderId);
            expect(res.body.data.attributes).toHaveProperty('customerId', customerId);
            expect(res.body.data.attributes).toHaveProperty('status', 'PENDING');
          });
      });

      it('should return 404 for non-existent order', () => {
        return request(app.getHttpServer())
          .get('/orders/non-existent-order-id')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 404 for invalid order ID format', () => {
        return request(app.getHttpServer())
          .get('/orders/invalid-id-format')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should return 404 for empty order ID', () => {
        return request(app.getHttpServer()).get('/orders/').expect(404);
      });

      it('should return 404 for extremely long order ID', () => {
        const longId = 'a'.repeat(1000);
        return request(app.getHttpServer())
          .get(`/orders/${longId}`)
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });
    });
  });

  describe('Customer Orders', () => {
    describe('GET /customers/:id/orders', () => {
      it('should get all customer orders successfully (no filter)', async () => {
        // Create an inactive order for the customer via API
        await request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'DELIVERED',
            total: 50.0,
            subtotal: 45.0,
            tax: 5.0,
            discount: 0.0,
            notes: 'Inactive order',
          })
          .expect(201);

        return request(app.getHttpServer())
          .get(`/customers/${customerId}/orders`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');
            expect(res.body.meta.count).toBeGreaterThanOrEqual(2); // At least 2 orders now

            // Should include both active and inactive orders
            const orderIds = res.body.data.map((order: any) => order.id);
            expect(orderIds).toContain(orderId);
          });
      });

      it('should get active customer orders successfully', () => {
        return request(app.getHttpServer())
          .get(`/customers/${customerId}/orders?isActive=true`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');
            expect(res.body.meta.count).toBeGreaterThanOrEqual(1);

            // Verify the order we created is in the active orders
            const activeOrder = res.body.data.find((order: any) => order.id === orderId);
            expect(activeOrder).toBeDefined();
            expect(activeOrder.attributes.status).toBe('PENDING');
          });
      });

      it('should get inactive customer orders successfully', async () => {
        // Create an inactive order for the customer via API
        const inactiveOrderResponse = await request(app.getHttpServer())
          .post('/orders')
          .send({
            customerId: customerId,
            status: 'CANCELLED',
            total: 25.0,
            subtotal: 25.0,
            tax: 0.0,
            discount: 0.0,
            notes: 'Cancelled order',
          })
          .expect(201);
        
        const inactiveOrder = inactiveOrderResponse.body.data;

        return request(app.getHttpServer())
          .get(`/customers/${customerId}/orders?isActive=false`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('count');
            expect(res.body.meta.count).toBeGreaterThanOrEqual(1);

            // Should include inactive orders
            const inactiveOrderFound = res.body.data.find(
              (order: any) => order.id === inactiveOrder.id,
            );
            expect(inactiveOrderFound).toBeDefined();
            expect(inactiveOrderFound.attributes.status).toBe('CANCELLED');
          });
      });

      it('should return 404 for non-existent customer', () => {
        return request(app.getHttpServer())
          .get('/customers/non-existent-customer-id/orders?isActive=true')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should handle invalid customer ID format', () => {
        return request(app.getHttpServer())
          .get('/customers/invalid-id-format/orders')
          .expect(404)
          .expect((res) => {
            expect(res.body).toHaveProperty('errors');
            expect(res.body.errors[0]).toHaveProperty('code', 'NOT_FOUND');
          });
      });

      it('should handle invalid isActive parameter', () => {
        return request(app.getHttpServer())
          .get(`/customers/${customerId}/orders?isActive=invalid`)
          .expect(200) // Should treat as undefined and return all orders
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
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
