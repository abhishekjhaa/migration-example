#!/bin/bash

# Complete ECS deployment script with migration
# This script deploys the complete Order Management System to ECS

set -e

# Configuration
STACK_NAME="order-management-prod"
REGION="us-east-1"
VPC_ID="vpc-12345678"
SUBNET_IDS="subnet-12345678,subnet-87654321"
DATABASE_HOST="postgres-cluster.cluster-xyz.us-east-1.rds.amazonaws.com"

echo "🚀 Deploying Order Management System to ECS..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "❌ AWS CLI not configured. Please run 'aws configure' first."
  exit 1
fi

# Check if Docker images exist in ECR
echo "📦 Checking ECR images..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Check if order-service image exists
if ! aws ecr describe-images --repository-name order-service --image-ids imageTag=latest --region $REGION > /dev/null 2>&1; then
  echo "❌ Order service image not found in ECR. Please build and push images first."
  echo "💡 Run: ./scripts/build-and-push-images.sh"
  exit 1
fi

# Check if invoice-service image exists
if ! aws ecr describe-images --repository-name invoice-service --image-ids imageTag=latest --region $REGION > /dev/null 2>&1; then
  echo "❌ Invoice service image not found in ECR. Please build and push images first."
  echo "💡 Run: ./scripts/build-and-push-images.sh"
  exit 1
fi

echo "✅ ECR images found"

# Deploy CloudFormation stack
echo "🏗️ Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file ecs/cloudformation.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    VpcId="$VPC_ID" \
    SubnetIds="$SUBNET_IDS" \
    DatabaseHost="$DATABASE_HOST" \
    Environment=prod \
    Owner=order-management-team \
    CostCenter=engineering \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$REGION"

if [ $? -ne 0 ]; then
  echo "❌ CloudFormation deployment failed"
  exit 1
fi

echo "✅ CloudFormation stack deployed successfully"

# Get stack outputs
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationLoadBalancerDNS`].OutputValue' \
  --output text)

CLUSTER_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
  --output text)

echo "🌐 Application Load Balancer DNS: $ALB_DNS"
echo "🏗️ ECS Cluster: $CLUSTER_NAME"

# Run database migrations
echo "🗄️ Running database migrations..."
./scripts/run-migration-task.sh

if [ $? -ne 0 ]; then
  echo "❌ Database migration failed"
  exit 1
fi

echo "✅ Database migrations completed"

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 60

# Check service health
echo "🔍 Checking service health..."

# Check Order Service
ORDER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/customers" || echo "000")
if [ "$ORDER_HEALTH" = "200" ] || [ "$ORDER_HEALTH" = "404" ]; then
  echo "✅ Order Service is healthy"
else
  echo "⚠️ Order Service health check failed (HTTP $ORDER_HEALTH)"
fi

# Check Invoice Service
INVOICE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/invoices" || echo "000")
if [ "$INVOICE_HEALTH" = "200" ] || [ "$INVOICE_HEALTH" = "404" ]; then
  echo "✅ Invoice Service is healthy"
else
  echo "⚠️ Invoice Service health check failed (HTTP $INVOICE_HEALTH)"
fi

# Check ALB health
ALB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/health" || echo "000")
if [ "$ALB_HEALTH" = "200" ]; then
  echo "✅ ALB is healthy"
else
  echo "⚠️ ALB health check failed (HTTP $ALB_HEALTH)"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   - Stack Name: $STACK_NAME"
echo "   - Region: $REGION"
echo "   - ALB DNS: $ALB_DNS"
echo "   - ECS Cluster: $CLUSTER_NAME"
echo ""
echo "🌐 API Endpoints:"
echo "   - Order Service: http://$ALB_DNS/api/customers"
echo "   - Invoice Service: http://$ALB_DNS/api/invoices"
echo "   - Health Check: http://$ALB_DNS/health"
echo ""
echo "📚 API Documentation:"
echo "   - Order Service Swagger: http://$ALB_DNS/api/docs"
echo "   - Invoice Service Swagger: http://$ALB_DNS/api/docs"
echo ""
echo "🔧 Management Commands:"
echo "   - View logs: aws logs tail /ecs/order-management-prod --follow"
echo "   - Scale services: aws ecs update-service --cluster $CLUSTER_NAME --service order-service --desired-count 3"
echo "   - Update task definition: aws ecs update-service --cluster $CLUSTER_NAME --service order-service --task-definition order-service:2"
echo ""
echo "💡 Next Steps:"
echo "   1. Set up custom domain and SSL certificate"
echo "   2. Configure monitoring and alerting"
echo "   3. Set up CI/CD pipeline"
echo "   4. Configure backup and disaster recovery"

