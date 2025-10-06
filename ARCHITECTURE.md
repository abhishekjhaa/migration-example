# 🏗️ **System Architecture**

## **High-Level Architecture Diagram**

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Client Applications<br/>Web, Mobile, API]
    end

    subgraph "Services Layer"
        ORDER_SVC[Order Service<br/>Port 3001]
        INVOICE_SVC[Invoice Service<br/>Port 3004]
    end

    subgraph "Caching Layer"
        CACHE[Redis Cache<br/>Port 6379]
    end

    subgraph "Data Layer"
        DATABASE[(PostgreSQL<br/>Port 5433)]
    end

    %% Simple connections
    CLIENT --> ORDER_SVC
    CLIENT --> INVOICE_SVC
    ORDER_SVC --> INVOICE_SVC
    
    ORDER_SVC --> CACHE
    INVOICE_SVC --> CACHE
    
    ORDER_SVC --> DATABASE
    INVOICE_SVC --> DATABASE

    %% Styling
    classDef service fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef database fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef client fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px

    class ORDER_SVC,INVOICE_SVC service
    class DATABASE database
    class CACHE cache
    class CLIENT client
```

## **Legacy to Modern Services Migration Architecture**

```mermaid
graph TB
    subgraph "Legacy System"
        LEGACY_APP[Legacy Monolithic Application<br/>SQL Server/Oracle]
        LEGACY_DB[(Legacy Database<br/>SQL Server/Oracle)]
        LEGACY_API[Legacy API Endpoints]
    end

    subgraph "Migration Layer"
        MIGRATION_SVC[Migration Service<br/>Port 3000]
        RECONCILIATION[Data Reconciliation Service]
        SHADOW_COMPARISON[Shadow Comparison Service]
    end

    subgraph "Modern Microservices"
        ORDER_SVC[Order Service<br/>Port 3001]
        INVOICE_SVC[Invoice Service<br/>Port 3004]
        CACHE[Redis Cache<br/>Port 6379]
        MODERN_DB[(Modern PostgreSQL<br/>Port 5433)]
    end

    subgraph "Client Layer"
        CLIENTS[Client Applications]
    end

    %% Legacy system connections
    LEGACY_APP --> LEGACY_DB
    LEGACY_APP --> LEGACY_API

    %% Migration process
    LEGACY_DB -.->|Data Extraction| MIGRATION_SVC
    MIGRATION_SVC -->|Data Transformation| MODERN_DB
    MIGRATION_SVC -->|Data Validation| RECONCILIATION
    
    %% Reconciliation process
    RECONCILIATION -.->|Compare Data| LEGACY_DB
    RECONCILIATION -->|Validate Consistency| MODERN_DB
    RECONCILIATION -->|Generate Reports| SHADOW_COMPARISON

    %% Modern services communication
    ORDER_SVC --> MODERN_DB
    INVOICE_SVC --> MODERN_DB
    ORDER_SVC --> CACHE
    INVOICE_SVC --> CACHE
    ORDER_SVC --> INVOICE_SVC

    %% Client routing (dual mode)
    CLIENTS -->|Legacy Mode| LEGACY_API
    CLIENTS -->|Modern Mode| ORDER_SVC
    CLIENTS -->|Modern Mode| INVOICE_SVC

    %% Styling
    classDef legacy fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef migration fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef modern fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef client fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef database fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef cache fill:#fff8e1,stroke:#f57f17,stroke-width:2px

    class LEGACY_APP,LEGACY_DB,LEGACY_API legacy
    class MIGRATION_SVC,RECONCILIATION,SHADOW_COMPARISON migration
    class ORDER_SVC,INVOICE_SVC modern
    class CLIENTS client
    class MODERN_DB,LEGACY_DB database
    class CACHE cache
```

## **Migration Communication Patterns**

```mermaid
sequenceDiagram
    participant L as Legacy System
    participant M as Migration Service
    participant R as Reconciliation Service
    participant N as Modern Services
    participant C as Cache
    participant D as Modern DB

    Note over L,M: Phase 1: Data Migration
    L->>M: Extract legacy data
    M->>D: Transform and load data
    M->>R: Trigger reconciliation

    Note over R,D: Phase 2: Data Validation
    R->>L: Query legacy data
    R->>D: Query modern data
    R->>R: Compare and validate
    R->>M: Report discrepancies

    Note over N,C: Phase 3: Modern Services
    N->>C: Cache frequently accessed data
    N->>D: Query modern database
    C-->>N: Return cached data
    D-->>N: Return fresh data

    Note over L,N: Phase 4: Dual Operation
    L->>L: Handle legacy requests
    N->>N: Handle modern requests
    N->>R: Periodic reconciliation
```

## **Detailed Component Architecture**

### **1. API Gateway Layer**
- **AWS Application Load Balancer (ALB)**
  - Routes traffic to microservices
  - Health checks and auto-scaling
  - SSL termination
  - Path-based routing

- **AWS API Gateway**
  - RESTful API management
  - Rate limiting and throttling
  - API versioning
  - Request/response transformation

### **2. Microservices Layer**

#### **Order Service (Port 3001)**
```
┌─────────────────────────────────────┐
│           Order Service             │
├─────────────────────────────────────┤
│  Controllers                        │
│  ├── OrdersController               │
│  └── CustomersController            │
├─────────────────────────────────────┤
│  Services                           │
│  ├── OrdersService                  │
│  └── CustomersService               │
├─────────────────────────────────────┤
│  Repositories                       │
│  ├── OrderRepository                │
│  └── CustomerRepository             │
├─────────────────────────────────────┤
│  External Dependencies              │
│  ├── Prisma ORM                     │
│  ├── Redis Cache                    │
│  └── PostgreSQL                     │
└─────────────────────────────────────┘
```

#### **Invoice Service (Port 3004)**
```
┌─────────────────────────────────────┐
│          Invoice Service            │
├─────────────────────────────────────┤
│  Controllers                        │
│  └── InvoicesController             │
├─────────────────────────────────────┤
│  Services                           │
│  ├── InvoicesService                │
│  └── OrderApiService (External)     │
├─────────────────────────────────────┤
│  Repositories                       │
│  └── InvoiceRepository              │
├─────────────────────────────────────┤
│  External Dependencies              │
│  ├── Prisma ORM                     │
│  ├── Redis Cache                    │
│  ├── PostgreSQL                     │
│  └── Order Service API              │
└─────────────────────────────────────┘
```

#### **Migration Service (Port 3000)**
```
┌─────────────────────────────────────┐
│         Migration Service           │
├─────────────────────────────────────┤
│  Controllers                        │
│  ├── MigrationController            │
│  └── ReconciliationController       │
├─────────────────────────────────────┤
│  Services                           │
│  ├── MigrationService               │
│  ├── DataReconciliationService      │
│  └── ReconciliationService          │
├─────────────────────────────────────┤
│  External Dependencies              │
│  ├── Prisma ORM                     │
│  ├── Legacy Database Connector      │
│  └── PostgreSQL                     │
└─────────────────────────────────────┘
```

### **3. Caching Architecture**

#### **Multi-Layer Caching Strategy**
```
┌─────────────────────────────────────┐
│           Client Request            │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         API Gateway                 │
│      (Response Caching)             │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│        Microservice                 │
│    (@Cacheable Decorator)           │
└─────────────┬───────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐         ┌───▼────┐
│ Redis  │         │Memory  │
│ Cache  │         │Cache   │
│(Primary│         │(Fallback│
│ Layer) │         │ Layer) │
└────────┘         └────────┘
    │                   │
    └─────────┬─────────┘
              │
┌─────────────▼───────────────────────┐
│        PostgreSQL                   │
│      (Database Layer)               │
└─────────────────────────────────────┘
```

### **4. Data Flow Architecture**

#### **Request Flow**
```mermaid
sequenceDiagram
    participant Client
    participant ALB
    participant Service
    participant Cache
    participant DB

    Client->>ALB: HTTP Request
    ALB->>Service: Route to Service
    Service->>Cache: Check Cache
    alt Cache Hit
        Cache-->>Service: Return Cached Data
        Service-->>ALB: Response
        ALB-->>Client: HTTP Response
    else Cache Miss
        Service->>DB: Database Query
        DB-->>Service: Query Results
        Service->>Cache: Store in Cache
        Service-->>ALB: Response
        ALB-->>Client: HTTP Response
    end
```

#### **Migration Flow**
```mermaid
sequenceDiagram
    participant Migration
    participant LegacyDB
    participant ModernDB
    participant Reconciliation

    Migration->>LegacyDB: Extract Data
    LegacyDB-->>Migration: Raw Data
    Migration->>Migration: Transform Data
    Migration->>ModernDB: Insert Transformed Data
    ModernDB-->>Migration: Confirmation
    Migration->>Reconciliation: Validate Migration
    Reconciliation->>LegacyDB: Compare Data
    Reconciliation->>ModernDB: Compare Data
    Reconciliation-->>Migration: Validation Report
```

## **Technology Stack**

### **Backend Services**
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **API Documentation**: Swagger/OpenAPI

### **Infrastructure**
- **Containerization**: Docker
- **Orchestration**: Amazon ECS
- **Load Balancer**: AWS Application Load Balancer
- **API Gateway**: AWS API Gateway
- **Infrastructure as Code**: AWS CloudFormation
- **Container Registry**: Amazon ECR

### **Monitoring & Observability**
- **Logging**: AWS CloudWatch Logs
- **Metrics**: AWS CloudWatch Metrics
- **Tracing**: AWS X-Ray
- **Health Checks**: Custom health endpoints

### **Development & Deployment**
- **Version Control**: Git
- **CI/CD**: GitHub Actions (planned)
- **Local Development**: Docker Compose
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier

## **Security Architecture**

### **Network Security**
- **VPC**: Isolated network environment
- **Security Groups**: Firewall rules for service communication
- **Private Subnets**: Database and cache in private networks
- **NAT Gateway**: Outbound internet access for private resources

### **Application Security**
- **HTTPS**: TLS encryption for all communications
- **API Authentication**: JWT tokens (planned)
- **Input Validation**: Class-validator decorators
- **SQL Injection Prevention**: Prisma ORM parameterized queries

### **Data Security**
- **Encryption at Rest**: AWS RDS encryption
- **Encryption in Transit**: TLS for all connections
- **Secrets Management**: AWS Secrets Manager
- **Database Access**: IAM roles and policies

## **Scalability Architecture**

### **Horizontal Scaling**
- **Auto Scaling Groups**: ECS service auto-scaling
- **Load Distribution**: ALB with multiple targets
- **Stateless Services**: No session affinity required
- **Database Connection Pooling**: Prisma connection management

### **Vertical Scaling**
- **Resource Allocation**: CPU and memory optimization
- **Container Sizing**: Right-sized ECS task definitions
- **Database Scaling**: RDS instance scaling options

### **Performance Optimization**
- **Caching Strategy**: Multi-layer caching with Redis
- **Database Indexing**: Optimized Prisma queries
- **CDN Integration**: CloudFront for static assets (planned)
- **Connection Pooling**: Efficient database connections

## **Deployment Architecture**

### **Environment Separation**
```
┌─────────────────────────────────────┐
│           Production                │
│  ┌─────────┐  ┌─────────┐          │
│  │   ECS   │  │   RDS   │          │
│  │Services │  │PostgreSQL│         │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│            Staging                  │
│  ┌─────────┐  ┌─────────┐          │
│  │   ECS   │  │   RDS   │          │
│  │Services │  │PostgreSQL│         │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│           Development               │
│  ┌─────────┐  ┌─────────┐          │
│  │ Docker  │  │ Docker  │          │
│  │Compose  │  │PostgreSQL│         │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘
```

### **CI/CD Pipeline** (Planned)
```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Build & Test]
    C --> D[Build Docker Images]
    D --> E[Push to ECR]
    E --> F[Deploy to Staging]
    F --> G[Integration Tests]
    G --> H[Deploy to Production]
    H --> I[Health Checks]
```

This architecture provides a robust, scalable, and maintainable foundation for the modernized Order Management System with clear separation of concerns, comprehensive caching, and cloud-native deployment capabilities.
