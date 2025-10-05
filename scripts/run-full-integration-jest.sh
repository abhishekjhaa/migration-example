#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting full integration tests with Jest...${NC}"

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

echo -e "${BLUE}🧪 Running Order Service integration tests...${NC}"

# Run Order Service Jest integration tests
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
export NODE_ENV=test

ORDER_TEST_OUTPUT=$(cd services/order-service && npx jest --config ./test/jest-e2e.json --testPathPatterns=integration.e2e-spec.ts 2>&1)
ORDER_TEST_RESULT=$?

# Extract test count from Jest output
ORDER_TEST_COUNT=$(echo "$ORDER_TEST_OUTPUT" | grep -o "Tests:.*[0-9]\+ passed" | grep -o "[0-9]\+" | head -1)
echo "$ORDER_TEST_OUTPUT"

if [ $ORDER_TEST_RESULT -ne 0 ]; then
    echo -e "${RED}❌ Order Service integration tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Order Service integration tests passed!${NC}"

echo -e "${BLUE}🧪 Running Invoice Service integration tests...${NC}"

# Start Order Service in Docker for Invoice Service tests
echo -e "${BLUE}📦 Starting Order Service in Docker...${NC}"
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.integration.yml up order-service-integration -d --wait

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start Order Service. Exiting.${NC}"
    exit 1
fi

echo -e "${YELLOW}⏳ Waiting for Order Service to be ready...${NC}"
timeout=120
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3003/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Order Service is ready${NC}"
        break
    fi
    echo -e "${YELLOW}⏳ Waiting for Order Service... (${counter}s)${NC}"
    sleep 3
    counter=$((counter+3))
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ Order Service did not become ready in time. Exiting.${NC}"
    exit 1
fi

# Run Invoice Service Jest integration tests
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
export ORDER_SERVICE_URL="http://localhost:3003"
export NODE_ENV=test

INVOICE_TEST_OUTPUT=$(cd services/invoice-service && npx jest --config ./test/jest-e2e.json --testPathPatterns="integration.e2e-spec.ts|service-communication.e2e-spec.ts" 2>&1)
INVOICE_TEST_RESULT=$?

# Extract test count from Jest output
INVOICE_TEST_COUNT=$(echo "$INVOICE_TEST_OUTPUT" | grep -o "Tests:.*[0-9]\+ passed" | grep -o "[0-9]\+" | head -1)
echo "$INVOICE_TEST_OUTPUT"

if [ $INVOICE_TEST_RESULT -ne 0 ]; then
    echo -e "${RED}❌ Invoice Service integration tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Invoice Service integration tests passed!${NC}"

echo -e "${GREEN}🎉 All full integration tests passed!${NC}"
echo -e "${BLUE}📊 Full Integration Test Summary:${NC}"
echo -e "  ${GREEN}✅ PostgreSQL database running in Docker${NC}"
echo -e "  ${GREEN}✅ Order Service integration tests via Jest (${ORDER_TEST_COUNT}/${ORDER_TEST_COUNT} tests)${NC}"
echo -e "  ${GREEN}✅ Order Service running in Docker${NC}"
echo -e "  ${GREEN}✅ Invoice Service integration tests via Jest (${INVOICE_TEST_COUNT}/${INVOICE_TEST_COUNT} tests)${NC}"
echo -e "  ${GREEN}✅ End-to-end workflow validated${NC}"

# Calculate total tests
TOTAL_TESTS=$((ORDER_TEST_COUNT + INVOICE_TEST_COUNT))
echo -e "  ${GREEN}✅ Total: ${TOTAL_TESTS}/${TOTAL_TESTS} integration tests passing${NC}"

# The cleanup trap will handle stopping containers
