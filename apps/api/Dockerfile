# Production Multi-stage Dockerfile for SnapBack API Service
# Optimized for layer caching, security, and minimal image size

# Base image with specific version for reproducibility
FROM node:20.11.0-alpine AS base

# Install system dependencies and security updates
RUN apk update && apk upgrade
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    dumb-init

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Set work directory
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs --ingroup nodejs

# ================================
# Dependencies stage
# ================================
FROM base AS deps

# Copy package.json files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages
COPY packages-oss ./packages-oss
COPY config/package.json ./config/
COPY tooling ./tooling

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --no-frozen-lockfile --ignore-scripts

# ================================
# Builder stage
# ================================
FROM base AS builder

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build the API service
RUN pnpm build --filter @snapback/api-service

# ================================
# Runner stage - Final production image
# ================================
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Create app directory and set ownership
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy migration runner (db:push script from pnpm)
COPY --from=builder --chown=nodejs:nodejs /app/packages/platform/drizzle ./packages/platform/drizzle
COPY --from=builder --chown=nodejs:nodejs /app/packages/platform/drizzle.config.ts ./packages/platform/

# Copy and setup entrypoint script for migrations
COPY --chown=nodejs:nodejs apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose the port
EXPOSE 3001

# Add health check endpoint
RUN echo 'const http = require("http"); \
const options = { hostname: "localhost", port: 3001, path: "/api/health", timeout: 2000 }; \
const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
req.on("error", () => process.exit(1)); \
req.on("timeout", () => process.exit(1)); \
req.end();' > /app/healthcheck.js

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node /app/healthcheck.js || exit 1

# Start the API service with migrations via entrypoint
CMD ["/app/docker-entrypoint.sh"]
