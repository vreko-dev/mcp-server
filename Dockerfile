# Production Multi-stage Dockerfile for Turborepo monorepo
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
RUN adduser --system --uid 1001 nextjs --ingroup nodejs

# ================================
# Dependencies stage
# ================================
FROM base AS deps

# Copy package.json files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages ./packages
COPY packages-oss ./packages-oss
COPY config/package.json ./config/
COPY tooling ./tooling

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --no-frozen-lockfile --ignore-scripts

# ================================
# Pruner stage - Extract only needed files
# ================================
FROM base AS pruner

# Copy entire source code
COPY . .

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Install turbo globally and prune the monorepo for the web app
RUN pnpm add -g turbo@latest
RUN turbo prune web --docker

# ================================
# Builder stage
# ================================
FROM base AS builder

# Copy pruned source and package files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies for pruned workspace
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --no-frozen-lockfile --ignore-scripts

# Copy pruned source code
COPY --from=pruner /app/out/full/ .

# Generate Drizzle schema files (must run before build)
RUN pnpm --filter @snapback/platform run db:generate

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Build the application
RUN pnpm turbo build --filter=web

# ================================
# Runner stage - Final production image
# ================================
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create app directory and set ownership
WORKDIR /app
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy package.json for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Expose the port
EXPOSE 3000

# Add health check endpoint
RUN echo 'const http = require("http"); \
const options = { hostname: "localhost", port: 3000, path: "/api/health", timeout: 2000 }; \
const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
req.on("error", () => process.exit(1)); \
req.on("timeout", () => process.exit(1)); \
req.end();' > /app/healthcheck.js

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node /app/healthcheck.js || exit 1

# Start the application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "apps/web/server.js"]
