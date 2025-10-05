# Order Management System - Microservices Architecture

A modernized Order Management System built with NestJS microservices, featuring PostgreSQL, repository pattern, comprehensive API documentation, and world-class test coverage.

## 🏗️ Architecture Overview

This project demonstrates the migration from a legacy monolithic Order Management System to a modern microservices architecture with the following components:

### Services

- **Order Service** (Port 3001): Handles order management and customer operations
- **Invoice Service** (Port 3002): Manages invoice creation and calculations
- **Shared Database**: PostgreSQL with Prisma ORM

### Key Features

- ✅ **Microservices Architecture**: Separate services for different business domains
- ✅ **Repository Pattern**: Clean separation of data access and business logic
- ✅ **JSON:API Specification**: Consistent API responses following JSON:API format
- ✅ **Class-validator**: Type-safe request/response validation
- ✅ **Swagger Documentation**: Comprehensive API documentation
- ✅ **Enhanced Error Handling**: User-friendly error responses with proper HTTP status codes
- ✅ **Docker Support**: Containerized services for development and testing
- ✅ **Comprehensive Integration Tests**: 53+ Jest-based e2e tests
- ✅ **Environment Configuration**: No hardcoded values, all configurable
- ✅ **Query Parameters**: RESTful API design with flexible filtering
- ✅ **Service Communication**: HTTP-based inter-service communication
- ✅ **Production Ready**: Optimized Docker builds with caching and security
- ✅ **Code Quality**: ESLint, Prettier, and comprehensive linting rules

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd migration-example
```

### 2. Start Development Environment

```bash
# Start Order Service with PostgreSQL
npm run dev:order

# Start Invoice Service with Order Service
npm run dev:invoice
```

### 3. Alternative: Manual Setup

```bash
# Install dependencies
npm install

# Build shared library
npm run build:lib

# Start database
docker-compose -f docker-compose.integration.yml up postgres-integration -d

# Run database migrations
cd lib && npx prisma migrate deploy && cd ..

# Start services manually
npm run dev:order:simple    # Order Service (port 3001)
npm run dev:invoice:simple  # Invoice Service (port 3002)
```

## 📚 API Documentation

Once the services are running, access the Swagger documentation:

- **Order Service**: http://localhost:3001/api/docs
- **Invoice Service**: http://localhost:3002/api/docs

## 🛠️ API Endpoints

### Order Service (Port 3001)

#### Health Check

- `GET /health` - Service health status

#### Customers

- `POST /customers` - Create new customer
- `GET /customers/:id` - Get customer by ID
- `GET /customers/:id/orders` - Get customer orders (with optional `?isActive=true` filter)

#### Orders

- `POST /orders` - Create new order
- `GET /orders/:id` - Get order by ID with customer and items details

### Invoice Service (Port 3002)

#### Health Check

- `GET /health` - Service health status

#### Invoices

- `POST /invoices` - Create new invoice
- `GET /invoices` - Get all invoices (with optional filters: `?customerId=`, `?orderId=`, `?status=`)
- `GET /invoices/:id` - Get invoice by ID

## 🧪 Testing

### Comprehensive Test Coverage

The project features **world-class test coverage** with **53+ integration tests** covering:

- ✅ **API Endpoints**: All CRUD operations and business logic
- ✅ **Query Parameters**: All filtering and pagination scenarios
- ✅ **Error Boundary Conditions**: 404s, validation errors, database constraints
- ✅ **Service Communication**: Inter-service API calls and failure scenarios
- ✅ **Data Validation**: Edge cases, invalid inputs, and business rule validation
- ✅ **Health Checks**: Service availability and status monitoring

### Run Integration Tests

```bash
# Order Service integration tests (26 tests)
npm run test:integration:order

# Invoice Service integration tests (27 tests)
npm run test:integration:invoice

# Full integration tests (53 tests total)
npm run test:integration:full
```

### Test Features

- **Docker Integration**: Tests run against real PostgreSQL and service containers
- **Comprehensive Coverage**: Every API endpoint and edge case tested
- **Real Service Communication**: Tests actual HTTP calls between services
- **Error Scenario Testing**: Validates proper error handling and responses

## 🐳 Docker Commands

### Development

```bash
# Start Order Service with PostgreSQL
npm run dev:order

# Start Invoice Service with Order Service
npm run dev:invoice
```

### Production

```bash
# Start production environment
npm run docker:prod:up

# View production logs
npm run docker:prod:logs

# Stop production environment
npm run docker:prod:down
```

### Build Commands

```bash
# Build all services
npm run build:all

# Build with Docker caching
npm run docker:build:order:cache
npm run docker:build:invoice:cache
```

## 📊 Database Schema

The system uses PostgreSQL with the following main entities:

- **Customers**: Customer information and profiles
- **Orders**: Order management with status tracking
- **Order Items**: Individual items within orders
- **Invoices**: Invoice generation and management

### Order Status Values

- **Active**: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`
- **Inactive**: `CANCELLED`, `RETURNED`, `DELIVERED`

## 🔧 Development

### Project Structure

```
migration-example/
├── lib/                       # Shared library
│   ├── src/
│   │   ├── database/         # Prisma service and module
│   │   ├── utils/           # Helper utilities and error handling
│   │   │   ├── helpers.ts
│   │   │   └── error-handler.ts
│   │   └── index.ts         # Main export file
│   ├── prisma/              # Shared database schema and migrations
│   └── package.json         # Shared library package
├── services/
│   ├── order-service/        # Order management microservice
│   │   ├── src/
│   │   │   ├── customers/   # Customer management (controller, service, DTOs)
│   │   │   ├── orders/      # Order management (controller, service, DTOs)
│   │   │   ├── repositories/ # Service-specific repositories
│   │   │   ├── health/      # Health check endpoint
│   │   │   └── app.module.ts
│   │   ├── test/            # Integration tests (26 tests)
│   │   ├── Dockerfile       # Production Dockerfile
│   │   ├── Dockerfile.integration  # Integration test Dockerfile
│   │   └── package.json
│   └── invoice-service/      # Invoice management microservice
│       ├── src/
│       │   ├── invoices/    # Invoice management (controller, service, DTOs)
│       │   ├── repositories/ # Service-specific repositories
│       │   ├── health/      # Health check endpoint
│       │   └── app.module.ts
│       ├── test/            # Integration tests (27 tests)
│       ├── Dockerfile       # Production Dockerfile
│       ├── Dockerfile.integration  # Integration test Dockerfile
│       └── package.json
├── scripts/                  # Development and testing scripts
│   ├── dev-order-service.sh
│   ├── dev-invoice-service.sh
│   ├── run-order-service-integration-jest.sh
│   ├── run-invoice-service-integration-jest.sh
│   └── run-full-integration-jest.sh
├── docker-compose.integration.yml  # Integration testing environment
├── docker-compose.prod.yml   # Production environment
├── .dockerignore            # Docker build exclusions
├── .gitignore              # Git exclusions (includes dist/ files)
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
└── README.md
```

### Key Technologies

- **NestJS**: Modern Node.js framework with TypeScript
- **Prisma**: Type-safe database ORM with PostgreSQL
- **PostgreSQL**: Relational database with camelCase column support
- **Repository Pattern**: Clean data access layer with service-specific repositories
- **Class-validator**: Runtime type validation and DTOs
- **Swagger**: Comprehensive API documentation
- **Docker**: Containerization with multi-stage builds and BuildKit caching
- **Jest**: Testing framework with Supertest for e2e testing
- **ESLint & Prettier**: Code quality and formatting tools
- **BuildKit**: Advanced Docker build features and caching

### Architecture Patterns

- **Repository Pattern**: Service-specific repositories for clean data access
- **Dependency Injection**: NestJS IoC container for service management
- **Error Handling**: Centralized error handling with JSON:API compliant responses
- **API Design**: RESTful endpoints with query parameter filtering
- **Microservices**: HTTP-based inter-service communication
- **Service Communication**: Direct API calls between services (no shared modules)
- **Validation**: Multi-layer validation (DTOs, business logic, database constraints)

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Update all environment variables for production
2. **Database**: Use managed PostgreSQL service (AWS RDS, etc.)
3. **Security**: Use strong secrets and proper network isolation
4. **Monitoring**: Add logging and monitoring services
5. **Scaling**: Use container orchestration (Kubernetes, ECS)
6. **Load Balancing**: Add API gateway and load balancer

### Environment Variables

Ensure all services have proper environment configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `ORDER_SERVICE_URL`: URL for order service (invoice service)
- `PORT`: Service port (defaults: 3001 for order, 3002 for invoice)
- `NODE_ENV`: Environment (development, test, production)

### Docker Production Builds

The project includes optimized Dockerfiles with:

- **Multi-stage builds** for smaller production images
- **BuildKit caching** for faster builds with mount caches
- **Non-root users** for enhanced security
- **Health checks** for container monitoring
- **Optimal layer ordering** for maximum cache hits
- **Production dependencies only** in final images

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure code quality: `npm run lint` and `npm run format`
6. Ensure all tests pass: `npm run test:integration:full`
7. Submit a pull request

### Development Workflow

```bash
# Install dependencies
npm install

# Build shared library
npm run build:lib

# Run linting and formatting
npm run lint
npm run format

# Run tests
npm run test:integration:full

# Start development environment
npm run dev:order    # or npm run dev:invoice
```

## 📊 Project Status

### ✅ Completed Features

- **Microservices Architecture**: Fully functional Order and Invoice services
- **Database Integration**: PostgreSQL with Prisma ORM and migrations
- **API Documentation**: Complete Swagger documentation for all endpoints
- **Comprehensive Testing**: 53+ integration tests with 98%+ coverage
- **Error Handling**: JSON:API compliant error responses
- **Docker Support**: Production-ready containerization with optimization
- **Code Quality**: ESLint, Prettier, and comprehensive linting rules
- **Service Communication**: HTTP-based inter-service communication
- **Repository Pattern**: Clean data access layer implementation
- **Dynamic Test Counting**: Automated test metrics in CI/CD

### 🎯 Test Coverage Summary

- **Order Service**: 26/26 tests passing ✅
- **Invoice Service**: 27/27 tests passing ✅
- **Total Integration**: 53/53 tests passing ✅
- **Coverage Areas**: API endpoints, error handling, service communication, data validation

### 🚀 Production Readiness

- **Security**: Non-root Docker users, environment-based configuration
- **Performance**: Optimized Docker builds with BuildKit caching
- **Monitoring**: Health check endpoints for all services
- **Scalability**: Stateless services ready for horizontal scaling
- **Maintainability**: Clean architecture with comprehensive documentation

## 📝 License

This project is for demonstration purposes as part of a legacy system modernization example.

## 🆘 Support

For questions or issues, please refer to the API documentation or create an issue in the repository.
