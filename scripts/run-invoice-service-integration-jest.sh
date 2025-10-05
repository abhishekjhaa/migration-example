#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Invoice Service integration tests with Jest...${NC}"

# Function to clean up Docker containers and local processes
cleanup() {
    echo -e "${YELLOW}🛑 Stopping Invoice Service...${NC}"
    kill $INVOICE_SERVICE_PID || true
    wait $INVOICE_SERVICE_PID 2>/dev/null || true
    echo -e "${YELLOW}🧹 Cleaning up Docker containers...${NC}"
    docker-compose -f docker-compose.integration.yml down --remove-orphans
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap to ensure cleanup is called on script exit or interruption
trap cleanup EXIT

echo -e "${BLUE}📦 Starting PostgreSQL database and Order Service in Docker...${NC}"
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.integration.yml up postgres-integration order-service-integration -d --wait

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start Docker services. Exiting.${NC}"
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

echo -e "${BLUE}🔧 Setting up database schema...${NC}"
cd lib
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
npx prisma migrate deploy
npx prisma generate
cd ..

echo -e "${BLUE}🚀 Starting Invoice Service locally...${NC}"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
export ORDER_SERVICE_URL="http://localhost:3003" # Order Service running in Docker on port 3003
export PORT=3005
export NODE_ENV=test

# Start the service in background from the invoice service directory
(cd services/invoice-service && npm run start:dev) &
INVOICE_SERVICE_PID=$!

echo -e "${YELLOW}⏳ Waiting for Invoice Service to be ready...${NC}"
timeout=60
counter=0
while ! curl -f http://localhost:3005/health > /dev/null 2>&1 && [ $counter -lt $timeout ]; do
    sleep 3
    counter=$((counter+3))
done

if [ $counter -ge $timeout ]; then
    echo -e "${RED}❌ Invoice Service did not become ready in time. Exiting.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Invoice Service is ready${NC}"

echo -e "${BLUE}🧪 Running Invoice Service integration tests with Jest...${NC}"

# Run Jest e2e tests for Invoice Service
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/order_management_integration"
export ORDER_SERVICE_URL="http://localhost:3003"
export NODE_ENV=test

# Run the integration e2e tests from the invoice service directory
# Use a simple approach - we know we're in the project root
echo "Current directory: $(pwd)"
echo "Invoice service directory: $(pwd)/services/invoice-service"

# Run the tests
INVOICE_TEST_OUTPUT=$(cd "$(pwd)/services/invoice-service" && npx jest --config ./test/jest-e2e.json --testPathPatterns="integration.e2e-spec.ts|service-communication.e2e-spec.ts" 2>&1)
TEST_RESULT=$?

# Extract test count from Jest output
INVOICE_TEST_COUNT=$(echo "$INVOICE_TEST_OUTPUT" | grep -o "Tests:.*[0-9]\+ passed" | grep -o "[0-9]\+" | head -1)
echo "$INVOICE_TEST_OUTPUT"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 All Invoice Service integration tests passed!${NC}"
    echo -e "${BLUE}📊 Test Summary:${NC}"
    echo -e "  ${GREEN}✅ PostgreSQL database running in Docker${NC}"
    echo -e "  ${GREEN}✅ Order Service running in Docker${NC}"
    echo -e "  ${GREEN}✅ Invoice Service running locally${NC}"
    echo -e "  ${GREEN}✅ Invoice Service integration tests via Jest (${INVOICE_TEST_COUNT}/${INVOICE_TEST_COUNT} tests)${NC}"
    echo -e "  ${GREEN}✅ Invoice creation and management${NC}"
    echo -e "  ${GREEN}✅ Invoice retrieval and filtering${NC}"
    echo -e "  ${GREEN}✅ 404 error handling${NC}"
    echo -e "  ${GREEN}✅ Health check endpoint${NC}"
else
    echo -e "${RED}❌ Invoice Service integration tests failed${NC}"
    exit 1
fi

# The cleanup trap will handle stopping containers and local processes
