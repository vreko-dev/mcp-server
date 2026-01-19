# Production Multi-stage Dockerfile for SnapBack MCP Server
# Optimized with Turborepo Pruning for minimal build context (~60-80% smaller)
#
# Build: docker build -f apps/mcp-server/Dockerfile -t snapback-mcp:latest .
# Run:   docker run -p 8080:8080 snapback-mcp:latest

# ================================
# Base Stage
# ================================
FROM node:20-alpine AS base

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install system dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat dumb-init

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mcpuser --ingroup nodejs

# ================================
# Pruner Stage - Use turbo prune
# ================================
FROM base AS pruner

# Install turbo globally
RUN npm install -g turbo@2.3.4

# Copy entire monorepo
COPY . .

# Prune the workspace for MCP server only
# This creates a minimal subset in /app/out/
RUN turbo prune snapback-mcp-server --docker

# ================================
# Deps Stage - Install dependencies
# ================================
FROM base AS deps

# Copy pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm-mcp,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist

# ================================
# Builder Stage - Build MCP Server
# ================================
FROM base AS builder

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy pruned source code
COPY --from=pruner /app/out/full/ .

# Build MCP server and dependencies
RUN pnpm --filter=snapback-mcp-server... build

# ================================
# Runner Stage - Final production image
# ================================
FROM base AS runner

WORKDIR /app

# Copy the bundled output
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp-server/dist ./dist

# Copy startup check script for dependency validation
COPY --from=builder --chown=mcpuser:nodejs /app/apps/mcp-server/scripts/startup-check.js ./scripts/startup-check.js

# Copy node_modules (already pruned by turbo prune)
COPY --from=builder --chown=mcpuser:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER mcpuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "import('http').then(h => h.default.get('http://localhost:8080/health', r => { if(r.statusCode !== 200) process.exit(1) }))"

# Run startup check before starting server
CMD ["dumb-init", "sh", "-c", "node scripts/startup-check.js && node dist/index.js"]