#!/bin/bash

# Build and push Docker images to ECR
# This script builds both services and pushes them to ECR

set -e

# Configuration
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "🚀 Building and pushing Docker images to ECR..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "❌ AWS CLI not configured. Please run 'aws configure' first."
  exit 1
fi

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Create ECR repositories if they don't exist
echo "📦 Creating ECR repositories..."
aws ecr create-repository --repository-name order-service --region $REGION 2>/dev/null || echo "Repository order-service already exists"
aws ecr create-repository --repository-name invoice-service --region $REGION 2>/dev/null || echo "Repository invoice-service already exists"

# Build and push Order Service
echo "🏗️ Building Order Service..."
docker build -f services/order-service/Dockerfile -t order-service:latest .
docker tag order-service:latest $ECR_REGISTRY/order-service:latest
docker tag order-service:latest $ECR_REGISTRY/order-service:$(date +%Y%m%d-%H%M%S)

echo "📤 Pushing Order Service to ECR..."
docker push $ECR_REGISTRY/order-service:latest
docker push $ECR_REGISTRY/order-service:$(date +%Y%m%d-%H%M%S)

# Build and push Invoice Service
echo "🏗️ Building Invoice Service..."
docker build -f services/invoice-service/Dockerfile -t invoice-service:latest .
docker tag invoice-service:latest $ECR_REGISTRY/invoice-service:latest
docker tag invoice-service:latest $ECR_REGISTRY/invoice-service:$(date +%Y%m%d-%H%M%S)

echo "📤 Pushing Invoice Service to ECR..."
docker push $ECR_REGISTRY/invoice-service:latest
docker push $ECR_REGISTRY/invoice-service:$(date +%Y%m%d-%H%M%S)

echo "✅ All images built and pushed successfully!"
echo ""
echo "📋 Image Details:"
echo "   - Order Service: $ECR_REGISTRY/order-service:latest"
echo "   - Invoice Service: $ECR_REGISTRY/invoice-service:latest"
echo ""
echo "💡 You can now deploy to ECS using:"
echo "   ./scripts/deploy-ecs-complete.sh"




