# Production Dockerfile for SnapBack MCP Server
# Uses turbo prune for minimal build context (like apps/web/Dockerfile.prod)
#
# Build from monorepo root:
# fly deploy . --config apps/mcp-server/fly.toml --dockerfile apps/mcp-server/Dockerfile

# ================================
# Base Stage
# ================================
FROM node:20.11.0-alpine AS base

RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat openssl ca-certificates dumb-init

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# ================================
# Pruner Stage - Use turbo prune
# ================================
FROM base AS pruner

RUN npm install -g turbo@2.6.3

# Copy entire monorepo for pruning
COPY . .

# Prune to only what snapback-mcp-server needs
RUN turbo prune snapback-mcp-server --docker

# ================================
# Deps Stage - Install dependencies
# ================================
FROM base AS deps

# Copy pruned lockfile and package files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install deps (pruned workspace) - use no-frozen-lockfile due to turbo prune
RUN pnpm install --ignore-scripts

# ================================
# Builder Stage - Build the app
# ================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .

# Build with turbo (respects dependency order)
RUN cd apps/mcp-server && pnpm build

# ================================
# Runner Stage - Minimal runtime
# ================================
FROM base AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mcp --ingroup nodejs

# Copy only what's needed to run
COPY --from=builder --chown=mcp:nodejs /app/apps/mcp-server/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/apps/mcp-server/package.json ./
COPY --from=builder --chown=mcp:nodejs /app/node_modules ./node_modules

USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 8080

ENV NODE_ENV=production

# Use dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/index.js"]
