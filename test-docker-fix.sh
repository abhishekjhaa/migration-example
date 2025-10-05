#!/bin/bash

# Test script to verify Docker fix without hanging
echo "🧪 Testing Docker fix for integration tests..."

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.integration.yml down --remove-orphans 2>/dev/null || true

# Build and start services with timeout
echo "🔨 Building and starting services..."
timeout 120 docker-compose -f docker-compose.integration.yml up postgres-integration order-service-integration -d --build

if [ $? -eq 0 ]; then
    echo "✅ Services started successfully"
    
    # Check if containers are running
    echo "🔍 Checking container status..."
    docker ps --filter "name=order-service-integration" --format "table {{.Names}}\t{{.Status}}"
    
    # Check logs briefly
    echo "📋 Checking Order Service logs..."
    docker logs order-service-integration --tail 10
    
    echo "🎉 Docker fix appears to be working!"
else
    echo "❌ Services failed to start within timeout"
    echo "📋 Checking logs for errors..."
    docker logs order-service-integration --tail 20
fi

# Clean up
echo "🧹 Cleaning up test containers..."
docker-compose -f docker-compose.integration.yml down --remove-orphans
