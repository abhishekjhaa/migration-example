# 🚀 Deployment Guide

Complete deployment strategy for Order Management System with Docker, AWS ECS, and enterprise-grade security.

## 🐳 Local Development

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure ports are available
# 3001, 3004, 5433, 6379 (local)
# 3003, 3005, 5434, 6380 (integration tests)
```

### Quick Start
```bash
# Deploy entire system locally
npm run deploy:local

# Or deploy individual services
npm run dev:order      # Order Service on port 3001
npm run dev:invoice    # Invoice Service on port 3004
```

### Verification
```bash
# Check service health
curl http://localhost:3001/health  # Order Service
curl http://localhost:3004/health  # Invoice Service

# Check cache health
curl http://localhost:3001/cache/health
curl http://localhost:3004/cache/health

# View API documentation
open http://localhost:3001/api
open http://localhost:3004/api
```

### Graceful Shutdown
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop with volume cleanup
docker-compose -f docker-compose.prod.yml down -v
```

## ☁️ AWS Cloud Deployment

### Prerequisites
```bash
# AWS CLI configured
aws configure

# Docker for building images
docker --version

# Node.js for scripts
node --version
```

### Infrastructure Deployment
```bash
# Deploy complete AWS infrastructure
./scripts/deploy-ecs-complete.sh

# This creates:
# - VPC with public/private subnets
# - ECS cluster with Fargate
# - Application Load Balancer
# - RDS PostgreSQL instance
# - ElastiCache Redis cluster
# - IAM roles and security groups
```

### Application Deployment
```bash
# Build and push Docker images
./scripts/build-and-push-images.sh

# Deploy services to ECS
aws ecs update-service --cluster order-management --service order-service --force-new-deployment
aws ecs update-service --cluster order-management --service invoice-service --force-new-deployment
```

### Environment Configuration
```bash
# Set up environment variables
./scripts/setup-parameters.sh

# Configure secrets
aws secretsmanager create-secret --name order-management/database-url
aws secretsmanager create-secret --name order-management/redis-url
```

### Verification
```bash
# Get load balancer URL
aws elbv2 describe-load-balancers --names order-management-alb

# Test endpoints
curl https://your-alb-url/health
curl https://your-alb-url/api
```

## 🔧 Containerization

### Production Dockerfiles
- **Order Service**: `services/order-service/Dockerfile`
- **Invoice Service**: `services/invoice-service/Dockerfile`

**Features:**
- Multi-stage builds for optimization
- Non-root user for security
- Health checks and monitoring
- Prisma client generation
- ESLint configuration for code quality

### Docker Compose Files
- **Production**: `docker-compose.prod.yml`
- **Integration Tests**: `docker-compose.integration.yml`

### Port Separation Strategy
| Environment | PostgreSQL | Redis | Order Service | Invoice Service |
|-------------|------------|-------|---------------|-----------------|
| Local | 5433 | 6379 | 3001 | 3004 |
| Integration | 5434 | 6380 | 3003 | 3005 |

## 🏗️ Infrastructure Components

### AWS ECS Architecture
```yaml
# CloudFormation creates:
- VPC with public/private subnets
- ECS cluster with Fargate
- Application Load Balancer
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis cluster
- IAM roles and security groups
- CloudWatch logging and monitoring
```

### Security Configuration
- **Network Security**: VPC with private subnets
- **Application Security**: Non-root containers, security groups
- **Data Security**: Encryption at rest and in transit
- **Access Control**: IAM roles with least privilege

### Monitoring and Logging
- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Performance monitoring
- **X-Ray Tracing**: Distributed request tracing
- **Health Checks**: Application and infrastructure health

## 🔄 Migration Deployment

### Legacy Data Migration
```bash
# Run migration service
npm run migrate:legacy-data

# Validate migration
npm run migrate:validate

# Run reconciliation
npm run reconciliation:run
```

### Database Migration
```bash
# Deploy database migrations
docker-compose -f docker-compose.prod.yml exec order-service sh -c "cd /app/lib && npx prisma migrate deploy"

# Or in ECS
aws ecs run-task --cluster order-management --task-definition migration-task
```

## 🚨 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
lsof -i :3001
lsof -i :5433

# Kill processes using ports
kill -9 <PID>
```

#### Docker Issues
```bash
# Clean up Docker
docker system prune -a
docker volume prune

# Rebuild containers
docker-compose -f docker-compose.prod.yml up -d --build
```

#### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d order_management
```

#### Cache Issues
```bash
# Check Redis status
docker-compose -f docker-compose.prod.yml logs redis

# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Health Checks
```bash
# Service health
curl http://localhost:3001/health
curl http://localhost:3004/health

# Cache health
curl http://localhost:3001/cache/health
curl http://localhost:3004/cache/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

## 📊 Performance Optimization

### Caching Strategy
- **Redis**: Primary cache layer
- **In-Memory**: Fallback cache
- **TTL Strategy**: Intelligent cache expiration
- **Invalidation**: Automatic cache invalidation

### Database Optimization
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries
- **Read Replicas**: Distribute read load

### Container Optimization
- **Multi-stage Builds**: Smaller image sizes
- **Layer Caching**: Faster builds
- **Resource Limits**: Appropriate CPU/memory allocation

## 🔐 Security Best Practices

### Container Security
- Non-root user execution
- Minimal base images
- Security scanning
- Regular updates

### Network Security
- VPC isolation
- Security groups
- Private subnets for databases
- TLS encryption

### Data Security
- Encryption at rest
- Encryption in transit
- Secrets management
- Access logging

This deployment guide provides comprehensive instructions for both local development and production cloud deployment with security and performance best practices.
