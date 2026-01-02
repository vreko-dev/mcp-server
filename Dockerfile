# Production Dockerfile for SnapBack MCP Server
# Uses tsup bundling for reliable ESM deployment

FROM node:20-alpine AS base

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install system dependencies
RUN apk add --no-cache libc6-compat dumb-init
RUN corepack enable pnpm

WORKDIR /app

# ================================
# Build stage - full monorepo build with bundling
# ================================
FROM base AS build

# Copy entire monorepo
COPY . .

# Install all dependencies (need devDeps for building)
# --ignore-scripts: Skip prepare hooks (lefthook needs git which isn't available)
# --shamefully-hoist: Hoist all transitive deps to root node_modules for runtime access
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist

# Build the MCP server and its dependencies (tsup bundles everything)
RUN pnpm --filter=snapback-mcp-server... build

# ================================
# Production stage - minimal runtime
# ================================
FROM base AS production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mcp --ingroup nodejs

WORKDIR /app

# Copy the bundled output (includes all @snapback/* packages)
COPY --from=build --chown=mcp:nodejs /app/apps/mcp-server/dist ./dist

# Copy startup check script for dependency validation
COPY --from=build --chown=mcp:nodejs /app/apps/mcp-server/scripts/startup-check.js ./scripts/startup-check.js

# Copy node_modules for external dependencies (pg, drizzle-orm, zod, etc.)
# These are externalized by tsup and need to be present at runtime
COPY --from=build --chown=mcp:nodejs /app/node_modules ./node_modules

USER mcp

EXPOSE 8080

# Health check using ESM-compatible syntax
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "import('http').then(h => h.default.get('http://localhost:8080/health', r => { if(r.statusCode !== 200) process.exit(1) }))"

# Run startup check before starting server
# This validates dependencies and provides clear error messages
CMD ["dumb-init", "sh", "-c", "node scripts/startup-check.js && node dist/index.js"]
