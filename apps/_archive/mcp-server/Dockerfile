# Use Node.js 20 LTS as base image
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@9

# Create builder stage
FROM base AS builder

# Set working directory
WORKDIR /app

# Copy root configuration files first (for caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files (for pnpm workspace resolution)
COPY packages ./packages
COPY packages-oss ./packages-oss
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY tooling ./tooling
COPY config/package.json ./config/

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy all source code
COPY apps/mcp-server ./apps/mcp-server

# Build the MCP server and its dependencies
RUN pnpm --filter @snapback/mcp-server build

# Create production stage
FROM base AS production

# Set working directory
WORKDIR /app

# Copy root configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy packages with built artifacts
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/packages-oss ./packages-oss
COPY --from=builder /app/apps/mcp-server ./apps/mcp-server
COPY --from=builder /app/tooling ./tooling
COPY --from=builder /app/config ./config

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Set PORT for Fly.io (expects 8080)
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the MCP server
WORKDIR /app/apps/mcp-server
CMD ["node", "dist/index.js"]
