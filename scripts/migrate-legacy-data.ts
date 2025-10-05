#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

// Simulated legacy database connection
class LegacyDatabase {
  async query<T>(sql: string): Promise<T> {
    // In real implementation, this would connect to the legacy database
    console.log(`Executing legacy query: ${sql}`);

    // Simulate legacy data
    if (sql.includes('legacy_customers')) {
      return [
        {
          customer_id: 'legacy-cust-1',
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '555-0123',
          address: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zip_code: '12345',
          country: 'USA',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01'),
        },
        {
          customer_id: 'legacy-cust-2',
          email: 'jane.smith@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '555-0456',
          address: '456 Oak Ave',
          city: 'Somewhere',
          state: 'NY',
          zip_code: '67890',
          country: 'USA',
          created_at: new Date('2023-01-02'),
          updated_at: new Date('2023-01-02'),
        },
      ] as T;
    }

    if (sql.includes('legacy_orders')) {
      return [
        {
          order_id: 'legacy-order-1',
          customer_id: 'legacy-cust-1',
          status: 'pending',
          total: 150.00,
          subtotal: 135.00,
          tax: 15.00,
          discount: 0.00,
          notes: 'First order',
          created_at: new Date('2023-01-15'),
          updated_at: new Date('2023-01-15'),
        },
        {
          order_id: 'legacy-order-2',
          customer_id: 'legacy-cust-2',
          status: 'confirmed',
          total: 200.00,
          subtotal: 180.00,
          tax: 20.00,
          discount: 0.00,
          notes: 'Second order',
          created_at: new Date('2023-01-16'),
          updated_at: new Date('2023-01-16'),
        },
      ] as T;
    }

    if (sql.includes('legacy_invoices')) {
      return [
        {
          invoice_id: 'legacy-invoice-1',
          order_id: 'legacy-order-1',
          customer_id: 'legacy-cust-1',
          invoice_number: 'INV-2023-0001',
          status: 'draft',
          subtotal: 135.00,
          tax: 15.00,
          discount: 0.00,
          total: 150.00,
          due_date: new Date('2023-02-15'),
          paid_at: null,
          created_at: new Date('2023-01-20'),
          updated_at: new Date('2023-01-20'),
        },
      ] as T;
    }

    return [] as T;
  }

  async disconnect() {
    console.log('Disconnected from legacy database');
  }
}

interface LegacyCustomer {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  created_at: Date;
  updated_at: Date;
}

interface LegacyOrder {
  order_id: string;
  customer_id: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

interface LegacyInvoice {
  invoice_id: string;
  order_id: string;
  customer_id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  due_date?: Date;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

class DataMigrator {
  private prisma: PrismaClient;
  private legacyDb: LegacyDatabase;

  constructor() {
    this.prisma = new PrismaClient();
    this.legacyDb = new LegacyDatabase();
  }

  async migrateAllData() {
    console.log('🚀 Starting data migration...');

    try {
      // 1. Migrate customers first (no dependencies)
      await this.migrateCustomers();

      // 2. Migrate orders (depends on customers)
      await this.migrateOrders();

      // 3. Migrate invoices (depends on orders)
      await this.migrateInvoices();

      console.log('✅ Data migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
      await this.legacyDb.disconnect();
    }
  }

  async migrateCustomers() {
    console.log('📦 Migrating customers...');

    const legacyCustomers = await this.legacyDb.query<LegacyCustomer[]>(`
      SELECT * FROM legacy_customers 
      ORDER BY created_at ASC
    `);

    let migrated = 0;
    const batchSize = 1000;

    for (let i = 0; i < legacyCustomers.length; i += batchSize) {
      const batch = legacyCustomers.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const legacyCustomer of batch) {
          try {
            await tx.customer.create({
              data: {
                id: legacyCustomer.customer_id,
                email: legacyCustomer.email,
                firstName: legacyCustomer.first_name,
                lastName: legacyCustomer.last_name,
                phone: legacyCustomer.phone,
                address: legacyCustomer.address,
                city: legacyCustomer.city,
                state: legacyCustomer.state,
                zipCode: legacyCustomer.zip_code,
                country: legacyCustomer.country,
                createdAt: legacyCustomer.created_at,
                updatedAt: legacyCustomer.updated_at,
              },
            });
            migrated++;
          } catch (error: any) {
            if (error.code === 'P2002') {
              console.warn(`⚠️ Customer ${legacyCustomer.email} already exists, skipping...`);
            } else {
              throw error;
            }
          }
        }
      });

      console.log(`📊 Migrated ${migrated}/${legacyCustomers.length} customers`);
    }
  }

  async migrateOrders() {
    console.log('📦 Migrating orders...');

    const legacyOrders = await this.legacyDb.query<LegacyOrder[]>(`
      SELECT * FROM legacy_orders 
      ORDER BY created_at ASC
    `);

    let migrated = 0;
    const batchSize = 1000;

    for (let i = 0; i < legacyOrders.length; i += batchSize) {
      const batch = legacyOrders.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const legacyOrder of batch) {
          try {
            // Map legacy status to new enum
            const statusMap: Record<string, string> = {
              'pending': 'PENDING',
              'confirmed': 'CONFIRMED',
              'processing': 'PROCESSING',
              'shipped': 'SHIPPED',
              'delivered': 'DELIVERED',
              'cancelled': 'CANCELLED',
              'returned': 'RETURNED',
            };

            await tx.order.create({
              data: {
                id: legacyOrder.order_id,
                customerId: legacyOrder.customer_id,
                status: (statusMap[legacyOrder.status.toLowerCase()] || 'PENDING') as any,
                total: legacyOrder.total,
                subtotal: legacyOrder.subtotal,
                tax: legacyOrder.tax,
                discount: legacyOrder.discount,
                notes: legacyOrder.notes,
                createdAt: legacyOrder.created_at,
                updatedAt: legacyOrder.updated_at,
              },
            });
            migrated++;
          } catch (error: any) {
            if (error.code === 'P2003') {
              console.warn(`⚠️ Order ${legacyOrder.order_id} references non-existent customer, skipping...`);
            } else if (error.code === 'P2002') {
              console.warn(`⚠️ Order ${legacyOrder.order_id} already exists, skipping...`);
            } else {
              throw error;
            }
          }
        }
      });

      console.log(`📊 Migrated ${migrated}/${legacyOrders.length} orders`);
    }
  }

  async migrateInvoices() {
    console.log('📦 Migrating invoices...');

    const legacyInvoices = await this.legacyDb.query<LegacyInvoice[]>(`
      SELECT * FROM legacy_invoices 
      ORDER BY created_at ASC
    `);

    let migrated = 0;
    const batchSize = 1000;

    for (let i = 0; i < legacyInvoices.length; i += batchSize) {
      const batch = legacyInvoices.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const legacyInvoice of batch) {
          try {
            // Map legacy status to new enum
            const statusMap: Record<string, string> = {
              'draft': 'DRAFT',
              'sent': 'SENT',
              'paid': 'PAID',
              'overdue': 'OVERDUE',
              'cancelled': 'CANCELLED',
            };

            await tx.invoice.create({
              data: {
                id: legacyInvoice.invoice_id,
                orderId: legacyInvoice.order_id,
                customerId: legacyInvoice.customer_id,
                number: legacyInvoice.invoice_number,
                status: (statusMap[legacyInvoice.status.toLowerCase()] || 'DRAFT') as any,
                subtotal: legacyInvoice.subtotal,
                tax: legacyInvoice.tax,
                discount: legacyInvoice.discount,
                total: legacyInvoice.total,
                dueDate: legacyInvoice.due_date,
                paidAt: legacyInvoice.paid_at,
                createdAt: legacyInvoice.created_at,
                updatedAt: legacyInvoice.updated_at,
              },
            });
            migrated++;
          } catch (error: any) {
            if (error.code === 'P2003') {
              console.warn(`⚠️ Invoice ${legacyInvoice.invoice_id} references non-existent order, skipping...`);
            } else if (error.code === 'P2002') {
              console.warn(`⚠️ Invoice ${legacyInvoice.invoice_id} already exists, skipping...`);
            } else {
              throw error;
            }
          }
        }
      });

      console.log(`📊 Migrated ${migrated}/${legacyInvoices.length} invoices`);
    }
  }

  async validateMigration() {
    console.log('🔍 Validating migration...');

    const legacyCounts = await this.legacyDb.query(`
      SELECT 
        (SELECT COUNT(*) FROM legacy_customers) as customers,
        (SELECT COUNT(*) FROM legacy_orders) as orders,
        (SELECT COUNT(*) FROM legacy_invoices) as invoices
    `);

    const modernCounts = await this.prisma.$queryRaw<Array<{
      customers: bigint;
      orders: bigint;
      invoices: bigint;
    }>>`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM invoices) as invoices
    `;

    const legacy = legacyCounts[0] as any;
    const modern = modernCounts[0];

    console.log('📊 Migration Validation:');
    console.log(`Customers: ${modern.customers}/${legacy.customers}`);
    console.log(`Orders: ${modern.orders}/${legacy.orders}`);
    console.log(`Invoices: ${modern.invoices}/${legacy.invoices}`);

    if (
      Number(modern.customers) === legacy.customers &&
      Number(modern.orders) === legacy.orders &&
      Number(modern.invoices) === legacy.invoices
    ) {
      console.log('✅ Migration validation passed!');
    } else {
      throw new Error('❌ Migration validation failed - record counts do not match');
    }
  }
}

// Run migration
async function main() {
  const migrator = new DataMigrator();
  await migrator.migrateAllData();
  await migrator.validateMigration();
}

if (require.main === module) {
  main().catch(console.error);
}
