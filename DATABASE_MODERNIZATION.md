# Database Modernization Guide

## Overview

Complete strategy for modernizing legacy database architecture to PostgreSQL with Prisma ORM, moving from stored procedures to application services.

## 🎯 Modernization Goals

- **Migrate from legacy DB** to PostgreSQL
- **Replace stored procedures** with ORM-based application logic
- **Improve scalability** and maintainability
- **Enable cloud deployment** and microservices

## 🗄️ Database Schema Design

### **PostgreSQL Schema (Prisma)**
```prisma
model Customer {
  id        String   @id @default(cuid())
  email     String   @unique
  firstName String
  lastName  String
  phone     String?
  address   String?
  city      String?
  state     String?
  zipCode   String?
  country   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
  invoices  Invoice[]
}

model Order {
  id         String      @id @default(cuid())
  customerId String
  status     OrderStatus @default(PENDING)
  total      Decimal     @db.Decimal(10, 2)
  subtotal   Decimal     @db.Decimal(10, 2)
  tax        Decimal     @db.Decimal(10, 2)
  discount   Decimal     @db.Decimal(10, 2) @default(0)
  notes      String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  customer   Customer    @relation(fields: [customerId], references: [id])
  invoices   Invoice[]
}

model Invoice {
  id         String       @id @default(cuid())
  orderId    String
  customerId String
  number     String       @unique
  status     InvoiceStatus @default(DRAFT)
  subtotal   Decimal      @db.Decimal(10, 2)
  tax        Decimal      @db.Decimal(10, 2)
  discount   Decimal      @db.Decimal(10, 2) @default(0)
  total      Decimal      @db.Decimal(10, 2)
  dueDate    DateTime?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  order      Order        @relation(fields: [orderId], references: [id])
  customer   Customer     @relation(fields: [customerId], references: [id])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

## 🔄 Business Logic Migration

### **From Stored Procedures to Application Services**

#### **Legacy Approach (Stored Procedures)**
```sql
-- Legacy stored procedure
CREATE OR REPLACE FUNCTION sp_createinvoice(
  p_customer_id VARCHAR,
  p_order_ids VARCHAR,
  p_discount_code VARCHAR DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
  v_discount DECIMAL(10,2);
  v_tax DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Complex business logic in database
  SELECT SUM(total) INTO v_subtotal FROM orders WHERE id IN (p_order_ids);
  
  IF p_discount_code = 'SUMMER20' THEN
    v_discount := 20.00;
  ELSIF p_discount_code = 'BULK50' THEN
    v_discount := 50.00;
  ELSE
    v_discount := 0.00;
  END IF;
  
  v_tax := (v_subtotal - v_discount) * 0.1;
  v_total := v_subtotal - v_discount + v_tax;
  
  INSERT INTO invoices (customer_id, subtotal, discount, tax, total)
  VALUES (p_customer_id, v_subtotal, v_discount, v_tax, v_total);
  
  RETURN json_build_object('success', true, 'total', v_total);
END;
$$ LANGUAGE plpgsql;
```

#### **Modern Approach (Application Services)**
```typescript
// Modern application service
@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly orderApiService: OrderApiService,
  ) {}

  async createInvoice(createInvoiceData: CreateInvoiceData) {
    // Get order details via API
    const orderData = await this.orderApiService.getOrderById(createInvoiceData.orderId);
    
    // Calculate totals using business logic
    const taxRate = createInvoiceData.taxRate ?? 0.1;
    const subtotal = orderData.subtotal;
    const tax = calculateTax(subtotal, taxRate);
    const total = calculateTotal(subtotal, tax, createInvoiceData.discountAmount ?? 0);
    
    // Create invoice using ORM
    return this.invoiceRepository.create({
      orderId: createInvoiceData.orderId,
      customerId: orderData.customerId,
      number: await this.generateInvoiceNumber(),
      status: 'DRAFT',
      subtotal,
      tax,
      discount: createInvoiceData.discountAmount ?? 0,
      total,
      dueDate: createInvoiceData.dueDate,
    });
  }
}
```

## 🚀 Migration Benefits

### **✅ Improved Maintainability**
- **Business logic in code** (version controlled, testable)
- **Type safety** with TypeScript and Prisma
- **Better debugging** and logging capabilities

### **✅ Enhanced Scalability**
- **Microservices architecture** enables independent scaling
- **API-first design** supports multiple clients
- **Cloud-native deployment** with containers

### **✅ Better Developer Experience**
- **Auto-generated types** from database schema
- **Database migrations** with version control
- **Hot reloading** during development

### **✅ Production Readiness**
- **Connection pooling** and performance optimization
- **Transaction management** with proper error handling
- **Monitoring and observability** integration

## 🛠️ Implementation Steps

### **1. Schema Migration**
```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init
```

### **2. Business Logic Migration**
```typescript
// Extract business logic from stored procedures
// Implement in application services
// Add comprehensive tests
```

### **3. API Development**
```typescript
// Create REST APIs
// Implement JSON:API specification
// Add validation and error handling
```

### **4. Testing & Validation**
```bash
# Run integration tests
npm run test:integration

# Validate data consistency
npm run reconciliation:run
```

## 📊 Performance Considerations

### **Database Optimization**
- **Proper indexing** on frequently queried columns
- **Connection pooling** for better resource utilization
- **Query optimization** with Prisma query analysis

### **Application Optimization**
- **Caching strategies** for frequently accessed data
- **Pagination** for large datasets
- **Async processing** for heavy operations

## ✅ Success Metrics

- **Migration completion**: 100% of stored procedures converted
- **Performance parity**: Modern system performs as well as legacy
- **Data integrity**: >99.99% data consistency
- **Developer productivity**: Faster feature development
