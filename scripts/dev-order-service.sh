#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Order Service for local development...${NC}"

# Function to clean up Docker containers
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up Docker containers...${NC}"
    docker-compose -f docker-compose.integration.yml down --remove-orphans
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap to ensure cleanup is called on script exit or interruption
trap cleanup EXIT

echo -e "${BLUE}📦 Starting PostgreSQL database in Docker...${NC}"
docker-compose -f docker-compose.integration.yml up postgres-integration -d --wait

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start PostgreSQL. Exiting.${NC}"
    exit 1
fi

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
timeout=60
counter=0
while ! docker exec order-management-postgres-integration pg_isready -U postgres > /dev/null 2>&1 && [ $counter -lt $timeout ]; do
    sleep 3
    counter=$((counter+3))
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ PostgreSQL did not become ready in time. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

echo -e "${BLUE}🔧 Building shared library...${NC}"
cd lib
npm run build
npx prisma generate
cd ..

echo -e "${BLUE}🔧 Setting up database schema...${NC}"
cd lib
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
npx prisma migrate deploy
cd ..

echo -e "${BLUE}🚀 Starting Order Service locally...${NC}"
cd services/order-service
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
export PORT=3001
export NODE_ENV=development

echo -e "${GREEN}✅ Environment variables set:${NC}"
echo -e "  ${GREEN}DATABASE_URL:${NC} postgresql://postgres:postgres@localhost:5434/order_management_integration"
echo -e "  ${GREEN}PORT:${NC} 3001"
echo -e "  ${GREEN}NODE_ENV:${NC} development"

echo -e "${BLUE}🌐 Order Service will be available at:${NC}"
echo -e "  ${GREEN}API:${NC} http://localhost:3001"
echo -e "  ${GREEN}Swagger:${NC} http://localhost:3001/api/docs"
echo -e "  ${GREEN}Health:${NC} http://localhost:3001/health"

echo -e "${YELLOW}⏳ Starting Order Service...${NC}"
npm run start:dev
