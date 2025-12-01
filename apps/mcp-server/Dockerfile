# Use Node.js 20 LTS as base image
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Create builder stage
FROM base AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/mcp-server/package.json ./apps/mcp-server/

# Install dependencies with pnpm
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build the MCP server
RUN pnpm run build

# Create production stage
FROM base AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/mcp-server/package.json ./apps/mcp-server/

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod --ignore-scripts

# Copy built dist files
COPY --from=builder /app/apps/mcp-server/dist ./apps/mcp-server/dist

# Expose port for MCP server (use 3002 to avoid conflict with web on 3000)
EXPOSE 3002

# Run the MCP server
CMD ["pnpm", "start"]
