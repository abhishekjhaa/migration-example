# Complete Deployment Guide: Order Management System

## Overview

Complete deployment strategy for Order Management System with Docker, AWS ECS, and enterprise-grade security. Features separate port allocation for local deployment and integration tests to prevent conflicts.

## 🐳 **Containerization**

### **Production Dockerfiles**
- **Order Service**: `services/order-service/Dockerfile`
- **Invoice Service**: `services/invoice-service/Dockerfile`

**Features:**
- Multi-stage builds for optimization
- Non-root user for security
- Health checks and monitoring
- Prisma client generation
- ESLint configuration for code quality
- Fixed main.js paths for proper container startup

## 🚀 **Local Development**

### **Quick Start**
```bash
# Deploy locally with one command
./scripts/deploy-local.sh
```

### **Graceful Shutdown**
```bash
# Stop all services gracefully
docker-compose down

# Stop services and remove volumes (clean reset)
docker-compose down -v

# Stop services and remove orphaned containers
docker-compose down --remove-orphans
```

### **Manual Deployment**
```bash
# Start all services
docker-compose up -d --build

# Run database migrations
docker-compose exec order-service sh -c "cd /app/lib && npx prisma migrate deploy"

# Check health
curl http://localhost:3001/health  # Order Service
curl http://localhost:3004/health  # Invoice Service

# Test API endpoints
curl http://localhost:3001/customers  # Order Service
curl http://localhost:3004/invoices   # Invoice Service
```

**Services:**
- PostgreSQL (port 5433)
- Order Service (port 3001) - [Swagger API Docs](http://localhost:3001/api/docs)
- Invoice Service (port 3004) - [Swagger API Docs](http://localhost:3004/api/docs)

**Integration Test Services:**
- PostgreSQL Integration (port 5434)
- Order Service Integration (port 3003)
- Invoice Service Integration (port 3005)

### **Port Separation Strategy**

To prevent conflicts between local deployment and integration tests:

| Service | Local Deployment | Integration Tests |
|---------|------------------|-------------------|
| PostgreSQL | 5433 | 5434 |
| Order Service | 3001 | 3003 |
| Invoice Service | 3004 | 3005 |

This allows running integration tests and local deployment simultaneously without port conflicts.

## ☁️ **AWS ECS Deployment**

### **Prerequisites**
```bash
# Setup AWS CLI
aws configure

# Setup Parameter Store
./scripts/setup-parameters.sh
```

### **Deploy Infrastructure**
```bash
# Deploy with CloudFormation
aws cloudformation create-stack \
  --stack-name order-management-infrastructure \
  --template-body file://ecs/cloudformation.yaml \
  --parameters ParameterKey=VpcId,ParameterValue=vpc-12345678 \
               ParameterKey=SubnetIds,ParameterValue="subnet-12345678,subnet-87654321" \
               ParameterKey=DatabaseHost,ParameterValue=postgres-cluster.cluster-xyz.us-east-1.rds.amazonaws.com \
               ParameterKey=DatabasePassword,ParameterValue=your-secure-password \
               ParameterKey=Environment,ParameterValue=prod \
               ParameterKey=Owner,ParameterValue=order-management-team

# Deploy application
./scripts/deploy-ecs-complete.sh
```

### **ECS Features**
- Fargate launch type
- Application Load Balancer
- Auto-scaling (3-10 replicas)
- CloudWatch logging
- VPC endpoints for security
- Customer-managed KMS encryption

## 🔐 **Security Implementation**

### **IAM Least Privilege**
```yaml
# ECS Task Execution Role
Policies:
  - ECRImagePull: Only order-management/* repositories
  - CloudWatchLogs: Only specific log group
  - KMSDecrypt: Only specific KMS key via SSM

# ECS Task Role  
Policies:
  - ParameterStoreAccess: Only order-management/* parameters
  - SecretsManagerAccess: Only order-management/* secrets
  - KMSDecrypt: Customer-managed KMS key
```

### **Parameter Store Security**
```bash
# Database URL (SecureString with KMS encryption)
/order-management/database/url

# Service URLs (String parameters)
/order-management/services/order-service/url
```

### **Network Security**
- VPC endpoints for SSM and KMS
- Security groups with least privilege
- Private subnets for ECS tasks
- No internet-based service access

## 📊 **Deployment Comparison**

| Feature | Docker Compose | ECS Fargate |
|---------|----------------|-------------|
| **Complexity** | Low | Medium |
| **Scalability** | Limited | High (3-10 replicas) |
| **Cost** | Low | Medium |
| **Security** | Basic | Enterprise-grade |
| **Management** | Simple | AWS-managed |
| **Best For** | Development | Production |

## 🛠️ **Configuration Management**

### **Environment Variables**
```bash
# Local Development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/order_management
ORDER_SERVICE_URL=http://order-service:3001
NODE_ENV=production

# AWS ECS (via Parameter Store)
DATABASE_URL: /order-management/database/url (SecureString)
ORDER_SERVICE_URL: /order-management/services/order-service/url (String)
```

### **Secrets Management**
- **Local**: Environment variables
- **ECS**: AWS Systems Manager Parameter Store
- **Encryption**: Customer-managed KMS key
- **Access**: IAM-based with least privilege

## 📈 **Monitoring & Observability**

### **Health Checks**
- **Path**: `/health`
- **Interval**: 30s
- **Timeout**: 5s
- **Retries**: 3

### **Logging**
- **Format**: JSON
- **Destination**: CloudWatch Logs
- **Retention**: 14 days
- **Streams**: Separate per service

### **Metrics**
- **CPU/Memory**: Resource utilization
- **HTTP**: Request/response metrics
- **Database**: Connection pool metrics
- **Auto-scaling**: Based on CPU (70%) and memory (80%)

## 🚨 **Security Best Practices**

### **✅ Implemented:**
- **Least Privilege IAM**: Custom policies with specific resources
- **Customer-Managed KMS**: Encrypted Parameter Store
- **VPC Endpoints**: Private service access
- **Resource Tagging**: Environment-based governance
- **No Hardcoded Secrets**: All externalized
- **Network Segmentation**: Security groups with minimal access

### **✅ Compliance:**
- **SOC 2**: Access controls and encryption
- **PCI DSS**: No sensitive data in code
- **GDPR**: Encrypted data storage
- **Audit Trail**: CloudTrail logging

## 📚 **API Documentation**

### **Swagger UI**
- **Order Service**: http://localhost:3003/api/docs
- **Invoice Service**: http://localhost:3004/api/docs

### **API Testing**
```bash
# Create a customer
curl -X POST http://localhost:3003/api/customers \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "firstName": "John", "lastName": "Doe"}'

# Create an order
curl -X POST http://localhost:3003/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": "customer-id", "status": "PENDING", "total": 100.00}'

# Create an invoice
curl -X POST http://localhost:3004/api/invoices \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-id", "taxRate": 0.1}'
```

## 🎯 **Deployment Commands**

### **Local Development**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services safely
docker-compose down

# Stop services and remove volumes (clean reset)
docker-compose down -v

# Stop services and remove orphaned containers
docker-compose down --remove-orphans
```

### **Integration Testing**
```bash
# Run Order Service integration tests
./scripts/run-order-service-integration-jest.sh

# Run Invoice Service integration tests
./scripts/run-invoice-service-integration-jest.sh

# Run full integration tests
./scripts/run-full-integration-jest.sh

# Clean up integration test containers
docker-compose -f docker-compose.integration.yml down --remove-orphans
```

### **AWS ECS**
```bash
# Setup parameters
./scripts/setup-parameters.sh

# Deploy infrastructure
aws cloudformation create-stack --template-body file://ecs/cloudformation.yaml

# Deploy application
./scripts/deploy-ecs-complete.sh

# Update service
aws ecs update-service --cluster order-management-cluster-prod --service order-management
```

### **Verification**
```bash
# Check service health
curl http://api.order-management.com/health

# View logs
aws logs tail /ecs/order-management-prod --follow

# Check parameters
aws ssm get-parameter --name "/order-management/database/url" --with-decryption
```

## ✅ **Success Criteria**

- **Deployment**: All services healthy and responding
- **Security**: Least privilege IAM with encryption
- **Scalability**: Auto-scaling based on metrics
- **Observability**: Comprehensive logging and monitoring
- **Performance**: Sub-100ms response times
- **Compliance**: Enterprise security standards met

## 🎉 **Production-Ready Architecture**

Your Order Management System now includes:
- **Microservices architecture** with Docker containerization
- **AWS ECS deployment** with Fargate
- **Enterprise security** with least privilege IAM
- **Secure configuration** with Parameter Store and KMS
- **Auto-scaling** and load balancing
- **Comprehensive monitoring** and logging
- **Compliance-ready** security controls

Ready for production deployment! 🚀✨

## 🏗️ **Production ECS Deployment**

### **Architecture Overview**

Our ECS deployment follows **enterprise best practices**:

#### **✅ Separate Task Definitions per Service**
- **Order Service**: `task-definition-order-service.json`
- **Invoice Service**: `task-definition-invoice-service.json`
- **Migration Task**: `task-definition-migration.json`

#### **✅ Secure Configuration Management**
- **AWS Secrets Manager**: Database credentials
- **SSM Parameter Store**: Non-sensitive configuration (KMS encrypted)
- **No plaintext secrets** in task definitions

#### **✅ Migration Strategy**
- **Separate migration task** runs before service deployment
- **One-time execution** via ECS task (not init container)
- **Automated via CI/CD** pipeline

#### **✅ Load Balancer Configuration**
- **Application Load Balancer** with target groups
- **Path-based routing**: `/api/customers*` → Order Service, `/api/invoices*` → Invoice Service
- **Health checks** on `/health` endpoints

#### **✅ Autoscaling**
- **CPU-based scaling**: 70% target utilization
- **Min/Max capacity**: 2-10 instances per service
- **Cooldown periods**: 300s scale-out, 300s scale-in

#### **✅ Security & Compliance**
- **KMS encryption** for all secrets and logs
- **Least privilege IAM** roles with resource conditions
- **VPC endpoints** for private service access
- **Security groups** with minimal required ports

### **Deployment Process**

#### **1. Build and Push Images**
```bash
# Build and push to ECR
./scripts/build-and-push-images.sh
```

#### **2. Deploy Infrastructure**
```bash
# Deploy complete CloudFormation stack
./scripts/deploy-ecs-complete.sh
```

#### **3. Run Migrations**
```bash
# Run Prisma migrations via ECS task
./scripts/run-migration-task.sh
```

### **Infrastructure Components**

#### **ECS Resources**
- **Cluster**: `order-management-prod`
- **Services**: `order-service`, `invoice-service`
- **Task Definitions**: Defined in CloudFormation template
- **Auto Scaling**: CPU-based with CloudWatch metrics
- **Migration Task**: Separate task for database migrations

#### **Load Balancer**
- **ALB**: `order-management-alb-prod`
- **Target Groups**: `order-service-tg-prod`, `invoice-service-tg-prod`
- **Listener Rules**: Path-based routing

#### **Infrastructure as Code**
- **CloudFormation Template**: `ecs/cloudformation.yaml` - Complete infrastructure definition
- **Migration Task**: `ecs/task-definition-migration.json` - Database migration task

- **Health Checks**: `/health` endpoint

#### **Security**
- **KMS Key**: `alias/order-management-prod`
- **Secrets Manager**: `/order-management/database/credentials`
- **Parameter Store**: `/order-management/database/url`, `/order-management/services/order-service/url`
- **IAM Roles**: `ecsTaskExecutionRole-prod`, `ecsTaskRole-prod`

#### **Monitoring**
- **CloudWatch Logs**: `/ecs/order-management-prod`
- **Container Insights**: Enabled
- **Health Checks**: ECS and ALB level
- **Auto Scaling**: CloudWatch metrics

### **Management Commands**

#### **Service Management**
```bash
# Scale Order Service
aws ecs update-service \
  --cluster order-management-prod \
  --service order-service \
  --desired-count 5

# Update Invoice Service
aws ecs update-service \
  --cluster order-management-prod \
  --service invoice-service \
  --task-definition invoice-service:2

# View service status
aws ecs describe-services \
  --cluster order-management-prod \
  --services order-service invoice-service
```

#### **Logging**
```bash
# View Order Service logs
aws logs tail /ecs/order-management-prod --follow --filter-pattern "order-service"

# View Invoice Service logs
aws logs tail /ecs/order-management-prod --follow --filter-pattern "invoice-service"

# View migration logs
aws logs tail /ecs/order-management-prod --follow --filter-pattern "migration"
```

#### **Troubleshooting**
```bash
# Execute command in running container
aws ecs execute-command \
  --cluster order-management-prod \
  --task TASK_ARN \
  --container order-service \
  --command "/bin/sh" \
  --interactive

# Describe task details
aws ecs describe-tasks \
  --cluster order-management-prod \
  --tasks TASK_ARN
```

### **CI/CD Integration**

#### **GitHub Actions Example**
```yaml
name: Deploy to ECS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and Push Images
        run: ./scripts/build-and-push-images.sh
      
      - name: Run Migrations
        run: ./scripts/run-migration-task.sh
      
      - name: Deploy Services
        run: ./scripts/deploy-ecs-complete.sh
```

### **Cost Optimization**

#### **Resource Sizing**
- **Order Service**: 512 CPU, 1024 Memory
- **Invoice Service**: 512 CPU, 1024 Memory
- **Migration Task**: 256 CPU, 512 Memory

#### **Auto Scaling**
- **Fargate Spot**: 50% cost savings for non-critical workloads
- **CPU-based scaling**: Efficient resource utilization
- **Cooldown periods**: Prevent rapid scaling events

#### **Monitoring**
- **CloudWatch Container Insights**: Detailed metrics
- **Cost allocation tags**: Environment, Application, Owner, CostCenter
- **Log retention**: 30 days (configurable)

## 🚀 **Quick Reference**

### **Local Development**
```bash
# Start everything
./scripts/deploy-local.sh

# Or start with custom configuration
POSTGRES_PORT=5432 ORDER_SERVICE_PORT=3000 INVOICE_SERVICE_PORT=3001 docker-compose up -d

# Stop everything gracefully
docker-compose down

# Clean reset (removes volumes)
docker-compose down -v

# View API docs
open http://localhost:3003/api/docs
open http://localhost:3004/api/docs
```

### **Environment Configuration**
```bash
# Copy environment template
cp env.example .env

# Edit configuration
nano .env

# Available environment variables:
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=postgres
# POSTGRES_DB=order_management
# POSTGRES_PORT=5433
# ORDER_SERVICE_PORT=3003
# INVOICE_SERVICE_PORT=3004
# NODE_ENV=development
```

### **Production Deployment (ECS)**
```bash
# Build and push images to ECR
./scripts/build-and-push-images.sh

# Deploy complete infrastructure
./scripts/deploy-ecs-complete.sh

# Run migrations only
./scripts/run-migration-task.sh
```

### **Integration Testing**
```bash
# Run all tests
./scripts/run-full-integration-jest.sh

# Clean up
docker-compose -f docker-compose.integration.yml down --remove-orphans
```

### **AWS ECS Deployment**
```bash
# Setup and deploy
./scripts/setup-parameters.sh
./scripts/deploy-ecs-complete.sh
```
