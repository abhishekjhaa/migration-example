#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Order Service integration tests with Jest...${NC}"

# Function to clean up Docker containers
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up Docker containers...${NC}"
    docker-compose -f docker-compose.integration.yml down --remove-orphans
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap to ensure cleanup is called on script exit or interruption
trap cleanup EXIT

echo -e "${BLUE}📦 Starting PostgreSQL database in Docker...${NC}"
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.integration.yml up postgres-integration -d --wait

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start PostgreSQL. Exiting.${NC}"
    exit 1
fi

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
timeout=60
counter=0
while ! docker exec order-management-postgres-integration pg_isready -U postgres > /dev/null 2>&1 && [ $counter -lt $timeout ]; do
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL... (${counter}s)${NC}"
    sleep 3
    counter=$((counter+3))
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ PostgreSQL did not become ready in time. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

echo -e "${BLUE}🔧 Setting up database schema...${NC}"
cd lib
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
npx prisma migrate deploy
npx prisma generate
cd ..

echo -e "${BLUE}🧪 Running Order Service integration tests with Jest...${NC}"

# Run Jest e2e tests for Order Service
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
export NODE_ENV=test

# Run the integration e2e tests from the order service directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ORDER_TEST_OUTPUT=$(cd "$PROJECT_ROOT/services/order-service" && npx jest --config ./test/jest-e2e.json --testPathPatterns=integration.e2e-spec.ts 2>&1)
ORDER_TEST_RESULT=$?

# Extract test count from Jest output
ORDER_TEST_COUNT=$(echo "$ORDER_TEST_OUTPUT" | grep -o "Tests:.*[0-9]\+ passed" | grep -o "[0-9]\+" | head -1)
echo "$ORDER_TEST_OUTPUT"

if [ $ORDER_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 All Order Service integration tests passed!${NC}"
    echo -e "${BLUE}📊 Test Summary:${NC}"
    echo -e "  ${GREEN}✅ PostgreSQL database running in Docker${NC}"
    echo -e "  ${GREEN}✅ Order Service integration tests via Jest (${ORDER_TEST_COUNT}/${ORDER_TEST_COUNT} tests)${NC}"
    echo -e "  ${GREEN}✅ Customer creation and management${NC}"
    echo -e "  ${GREEN}✅ Order creation and management${NC}"
    echo -e "  ${GREEN}✅ Active orders retrieval${NC}"
    echo -e "  ${GREEN}✅ Order details retrieval${NC}"
    echo -e "  ${GREEN}✅ 404 error handling${NC}"
    echo -e "  ${GREEN}✅ Health check endpoint${NC}"
else
    echo -e "${RED}❌ Order Service integration tests failed${NC}"
    exit 1
fi

cd ../..

# The cleanup trap will handle stopping containers
