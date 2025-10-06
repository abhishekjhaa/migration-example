# 🔄 Migration Guide

Complete migration strategy from legacy Order Management System to modern microservices architecture with PostgreSQL and Prisma ORM.

## 🎯 Migration Strategy

### **Option 1: Enterprise Tools (Recommended)**
- **Data Migration**: AWS Database Migration Service (DMS)
- **Data Validation**: pg_diff, dbt tests, or Great Expectations

### **Option 2: Custom Implementation**
- **Data Migration**: Custom migration scripts
- **Data Validation**: Custom reconciliation services

## 🚀 Migration Components

### **1. Data Migration**
```typescript
// One-time migration script
scripts/migrate-legacy-data.ts

// Migration validation
lib/src/migration/migration.service.ts
lib/src/migration/migration.controller.ts
```

### **2. Data Reconciliation**
```typescript
// Reconciliation services
lib/src/reconciliation/reconciliation.service.ts
lib/src/reconciliation/data-reconciliation.service.ts
lib/src/reconciliation/reconciliation.controller.ts
```

## 🗄️ Database Modernization

### **Legacy to Modern Migration**

#### **From Legacy Database (SQL Server/Oracle)**
- Stored procedures and triggers
- Proprietary data types
- Complex business logic in database
- Tight coupling with application

#### **To Modern PostgreSQL with Prisma**
- Application-layer business logic
- Standard SQL data types
- Type-safe ORM queries
- Clean separation of concerns

### **Database Schema Design**

#### **PostgreSQL Schema (Prisma)**
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
  status     OrderStatus
  total      Decimal     @db.Decimal(10, 2)
  subtotal   Decimal     @db.Decimal(10, 2)
  tax        Decimal     @db.Decimal(10, 2)
  discount   Decimal     @db.Decimal(10, 2)
  notes      String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  
  customer   Customer    @relation(fields: [customerId], references: [id])
  items      OrderItem[]
  invoices   Invoice[]
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  
  order     Order   @relation(fields: [orderId], references: [id])
}

model Invoice {
  id          String        @id @default(cuid())
  orderId     String
  customerId  String
  invoiceNumber String      @unique
  status      InvoiceStatus
  subtotal    Decimal       @db.Decimal(10, 2)
  tax         Decimal       @db.Decimal(10, 2)
  discount    Decimal       @db.Decimal(10, 2)
  total       Decimal       @db.Decimal(10, 2)
  dueDate     DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  order       Order         @relation(fields: [orderId], references: [id])
  customer    Customer      @relation(fields: [customerId], references: [id])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

## 🔧 Migration Challenges & Solutions

### **Data Type Conversions**

#### **Legacy Database Challenges**
- **SQL Server/Oracle**: Proprietary data types and functions
- **Stored Procedures**: Complex business logic in database
- **Triggers**: Automatic data transformations
- **Custom Functions**: Database-specific calculations

#### **Modernization Solutions**
```typescript
// Legacy: SQL Server stored procedure
CREATE PROCEDURE CalculateOrderTotal
    @OrderId INT,
    @TaxRate DECIMAL(5,2)
AS
BEGIN
    -- Complex calculation logic
END

// Modern: TypeScript service method
@Injectable()
export class OrdersService {
  async calculateOrderTotal(orderId: string, taxRate: number): Promise<number> {
    const order = await this.orderRepository.findById(orderId);
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * taxRate;
    return subtotal + tax;
  }
}
```

#### **Data Type Mapping**
| Legacy Type | Modern Type | Conversion Notes |
|-------------|-------------|------------------|
| `NVARCHAR(MAX)` | `String` | Unicode string handling |
| `DECIMAL(18,2)` | `Decimal` | Precision preservation |
| `DATETIME2` | `DateTime` | Timezone handling |
| `BIT` | `Boolean` | Boolean conversion |
| `UNIQUEIDENTIFIER` | `UUID` | GUID to UUID mapping |

### **Stored Procedure Replacements**

#### **Challenge: Complex Business Logic**
Legacy systems often contain critical business logic in stored procedures that need to be migrated to application code.

#### **Solution: Service Layer Migration**
```typescript
// Legacy stored procedure logic
// Migrated to TypeScript service

@Injectable()
export class InvoiceCalculationService {
  async calculateInvoice(orderId: string): Promise<InvoiceCalculation> {
    // 1. Get order details
    const order = await this.orderRepository.findByIdWithDetails(orderId);
    
    // 2. Calculate subtotal
    const subtotal = this.calculateSubtotal(order.items);
    
    // 3. Apply discounts
    const discountAmount = this.calculateDiscounts(order);
    
    // 4. Calculate tax
    const taxAmount = this.calculateTax(subtotal - discountAmount, order.taxRate);
    
    // 5. Calculate total
    const total = subtotal - discountAmount + taxAmount;
    
    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
      breakdown: this.generateBreakdown(order)
    };
  }
}
```

#### **Migration Strategy**
1. **Analysis**: Document all stored procedures and their dependencies
2. **Mapping**: Create service methods for each stored procedure
3. **Testing**: Implement comprehensive tests for business logic
4. **Validation**: Compare results between legacy and modern implementations
5. **Migration**: Gradual replacement with feature flags

### **Data Consistency Challenges**

#### **Challenge: Distributed Transactions**
Legacy systems often rely on database transactions across multiple tables.

#### **Solution: Saga Pattern**
```typescript
@Injectable()
export class OrderProcessingSaga {
  async processOrder(orderData: CreateOrderDto): Promise<Order> {
    const saga = new SagaBuilder()
      .step('create-order', () => this.orderService.create(orderData))
      .step('create-invoice', (order) => this.invoiceService.createInvoice({ orderId: order.id }))
      .step('update-inventory', (order) => this.inventoryService.reserveItems(order.items))
      .compensate('rollback-inventory', (order) => this.inventoryService.releaseItems(order.items))
      .compensate('delete-invoice', (invoice) => this.invoiceService.delete(invoice.id))
      .compensate('delete-order', (order) => this.orderService.delete(order.id));
    
    return saga.execute();
  }
}
```

### **Performance Migration Challenges**

#### **Challenge: Query Performance**
Legacy systems may have optimized queries that don't translate directly to ORM queries.

#### **Solution: Query Optimization**
```typescript
// Legacy: Optimized SQL query
SELECT o.*, c.name, SUM(oi.quantity * oi.price) as total
FROM Orders o
JOIN Customers c ON o.customerId = c.id
JOIN OrderItems oi ON o.id = oi.orderId
WHERE o.status = 'ACTIVE'
GROUP BY o.id, c.name
HAVING total > 1000

// Modern: Optimized Prisma query with caching
@Cacheable({ ttl: 300, keyPrefix: 'active-orders' })
async findActiveOrdersWithTotal(): Promise<OrderWithTotal[]> {
  return this.prisma.order.findMany({
    where: { status: 'ACTIVE' },
    include: {
      customer: { select: { name: true } },
      items: true
    }
  }).then(orders => 
    orders.map(order => ({
      ...order,
      total: order.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
    })).filter(order => order.total > 1000)
  );
}
```

## 🚀 Migration Execution

### **Phase 1: Preparation**
```bash
# Set up modern infrastructure
npm run deploy:local

# Create migration database
createdb order_management_migration
```

### **Phase 2: Data Migration**
```bash
# Run migration script
npm run migrate:legacy-data

# Monitor migration progress
tail -f logs/migration.log
```

### **Phase 3: Validation**
```bash
# Run data reconciliation
npm run reconciliation:run

# Generate validation report
npm run migrate:validate
```

### **Phase 4: Cutover**
```bash
# Switch traffic to new system
# Update DNS/load balancer configuration
# Monitor system health
```

### **Phase 5: Cleanup**
```bash
# Archive legacy system
# Update documentation
# Train team on new system
```

## 📊 Migration Monitoring

### **Key Metrics**
- **Data Volume**: Records migrated per table
- **Data Quality**: Validation success rate
- **Performance**: Query response times
- **Error Rate**: Migration failures and retries

### **Validation Checks**
- **Record Count**: Compare total records
- **Data Integrity**: Foreign key relationships
- **Business Logic**: Calculation accuracy
- **Performance**: Query performance benchmarks

### **Rollback Plan**
- **Database Backup**: Point-in-time recovery
- **Traffic Routing**: DNS/load balancer rollback
- **Data Sync**: Reverse synchronization if needed
- **Monitoring**: Continuous health checks

## 🔧 Migration Tools

### **Custom Migration Scripts**
- **Data Extraction**: Legacy database queries
- **Data Transformation**: Type conversions and business logic
- **Data Loading**: Prisma-based data insertion
- **Validation**: Reconciliation and comparison

### **Reconciliation Services**
- **Data Comparison**: Legacy vs modern data
- **Discrepancy Detection**: Identify data mismatches
- **Report Generation**: Detailed migration reports
- **Automated Fixes**: Correct common data issues

This migration guide provides a comprehensive approach to modernizing legacy Order Management Systems with detailed strategies for handling common challenges and ensuring data integrity throughout the migration process.
