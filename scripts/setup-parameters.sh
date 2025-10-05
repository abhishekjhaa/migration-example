#!/bin/bash

# Setup AWS Systems Manager Parameter Store for Order Management System

set -e

echo "🔧 Setting up AWS Systems Manager Parameter Store..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Database URL parameter (SecureString)
echo "📊 Setting up database URL parameter..."
aws ssm put-parameter \
    --name "/order-management/database/url" \
    --value "postgresql://postgres:your-secure-password@postgres-cluster.cluster-xyz.us-east-1.rds.amazonaws.com:5432/order_management" \
    --type "SecureString" \
    --description "Database connection URL for Order Management System" \
    --overwrite 2>/dev/null || echo "Parameter already exists, skipping..."

# Order Service URL parameter (String)
echo "🔗 Setting up order service URL parameter..."
aws ssm put-parameter \
    --name "/order-management/services/order-service/url" \
    --value "http://order-service:3001" \
    --type "String" \
    --description "Order Service URL for inter-service communication" \
    --overwrite 2>/dev/null || echo "Parameter already exists, skipping..."

# Optional: Additional parameters
echo "🔐 Setting up additional parameters..."

# JWT Secret (if needed)
aws ssm put-parameter \
    --name "/order-management/auth/jwt-secret" \
    --value "your-super-secret-jwt-key-change-this-in-production" \
    --type "SecureString" \
    --description "JWT secret for authentication" \
    --overwrite 2>/dev/null || echo "JWT secret parameter already exists, skipping..."

# Redis URL (if needed)
aws ssm put-parameter \
    --name "/order-management/cache/redis-url" \
    --value "redis://redis-cluster.cache.amazonaws.com:6379" \
    --type "String" \
    --description "Redis URL for caching" \
    --overwrite 2>/dev/null || echo "Redis URL parameter already exists, skipping..."

echo "✅ Parameter Store setup completed!"
echo ""
echo "📋 Created parameters:"
echo "   - /order-management/database/url (SecureString)"
echo "   - /order-management/services/order-service/url (String)"
echo "   - /order-management/auth/jwt-secret (SecureString)"
echo "   - /order-management/cache/redis-url (String)"
echo ""
echo "🔍 To view parameters:"
echo "   aws ssm get-parameter --name '/order-management/database/url' --with-decryption"
echo "   aws ssm get-parameters --names '/order-management/database/url' '/order-management/services/order-service/url'"
echo ""
echo "⚠️  Remember to update the database URL with your actual RDS endpoint and secure password!"


