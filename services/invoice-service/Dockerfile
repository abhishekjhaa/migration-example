# syntax=docker/dockerfile:1.4
FROM node:18-slim AS base

# Install required system dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY lib/package*.json ./lib/
COPY services/invoice-service/package*.json ./services/invoice-service/

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

RUN --mount=type=cache,target=/root/.npm \
    cd lib && npm ci --include=dev

RUN --mount=type=cache,target=/root/.npm \
    cd services/invoice-service && npm ci --include=dev

# Build stage
FROM base AS builder

# Copy source code and configuration files
COPY .eslintrc.js ./
COPY .prettierrc ./
COPY lib ./lib
COPY services/invoice-service ./services/invoice-service

# Generate Prisma client first (needed for TypeScript compilation)
RUN cd lib && npx prisma generate

# Build without cache mount to ensure proper file generation
RUN cd lib && npm run build

RUN cd services/invoice-service && npm run build

# Production stage
FROM node:18-slim AS production

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY lib/package*.json ./lib/
COPY services/invoice-service/package*.json ./services/invoice-service/

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN --mount=type=cache,target=/root/.npm \
    cd lib && npm ci --omit=dev

RUN --mount=type=cache,target=/root/.npm \
    cd services/invoice-service && npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/lib/dist ./lib/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/services/invoice-service/dist ./services/invoice-service/dist

# Copy Prisma schema for runtime
COPY lib/prisma ./lib/prisma

# Set working directory to invoice service
WORKDIR /app/services/invoice-service

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
