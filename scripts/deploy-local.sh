#!/bin/bash

# Deploy Order Management System locally with Docker Compose

set -e

echo "🚀 Deploying Order Management System locally..."

# Build and start services
echo "📦 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
curl -f http://localhost:3001/health || (echo "❌ Order Service health check failed" && exit 1)
curl -f http://localhost:3004/health || (echo "❌ Invoice Service health check failed" && exit 1)

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec order-service sh -c "cd /app/lib && npx prisma migrate deploy"

echo "✅ Order Management System deployed successfully!"
echo "🌐 Services available at:"
echo "   - Order Service: http://localhost:3001"
echo "   - Invoice Service: http://localhost:3004"
echo "   - PostgreSQL: localhost:5433"
