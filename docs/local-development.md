# Local Development Guide

Welcome to the SnapBack local development environment! This guide will help you set up and run the complete SnapBack platform on your local machine.

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd snapback
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.docker.example .env.docker
   # Edit .env.docker with your configuration
   ```

3. **Start the development environment**:
   ```bash
   make dev
   ```

4. **Access the services**:
   - Marketing site: http://snapback.dev
   - Console: http://console.snapback.dev
   - Documentation: http://docs.snapback.dev
   - API: http://api.snapback.dev
   - MCP: http://mcp.snapback.dev

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **Node.js** (v18+)
- **pnpm** (v8+)
- **Git**

### System Requirements

- **RAM**: 8GB minimum (16GB recommended)
- **CPU**: 4 cores minimum
- **Disk Space**: 10GB free space

## Environment Setup

### 1. DNS Configuration

Configure DNS to resolve `.dev` domains to localhost. See [DNS Configuration Guide](setup/dns-configuration.md) for detailed instructions.

### 2. Environment Variables

Copy the example environment file:
```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` to configure your environment. Key variables include:
- Database credentials
- Authentication secrets
- API keys for external services

### 3. Install Dependencies

Install all project dependencies:
```bash
pnpm install
```

## Common Tasks

### Running Services

- **Start all services**: `make dev`
- **Stop all services**: `make down`
- **View logs**: `make logs`
- **View specific service logs**: `make logs-api`, `make logs-web`, etc.

### Testing

- **Run unit tests**: `pnpm test`
- **Run E2E tests**: `pnpm test:e2e`
- **Run E2E tests with UI**: `pnpm test:e2e:ui`

### Database Management

- **Run migrations**: `make db-migrate`
- **Seed database**: `make db-seed`
- **Reset database**: `make db-reset`

### Development Workflows

- **Rebuild services**: `make rebuild`
- **Clean environment**: `make clean`
- **Access service shells**: `make shell-web`, `make shell-api`, etc.

## Troubleshooting

### Services Not Starting

1. Check Docker is running:
   ```bash
   docker info
   ```

2. Check for port conflicts:
   ```bash
   lsof -i :80
   ```

3. Restart the environment:
   ```bash
   make down && make dev
   ```

### DNS Issues

1. Verify DNS resolution:
   ```bash
   nslookup snapback.dev
   ```

2. Flush DNS cache:
   - macOS: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemctl restart dnsmasq`
   - Windows: `ipconfig /flushdns`

### Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   make logs-db
   ```

2. Verify database credentials in `.env.docker`

### Authentication Problems

1. Check `BETTER_AUTH_SECRET` in `.env.docker`
2. Ensure `BETTER_AUTH_URL` is set correctly
3. Clear browser cookies for `.snapback.dev`

## FAQ

### How do I add a new service?

1. Add the service to `docker-compose.dev.yml`
2. Configure networking in the `snapback` network
3. Add any required volumes
4. Update NGINX configuration if needed

### How do I add a new package?

1. Create the package in `packages/`
2. Add to `pnpm-workspace.yaml`
3. Add to relevant `package.json` files
4. Run `pnpm install`

### How do I debug a service?

1. Use `make shell-<service>` to access the container
2. Attach a debugger to the exposed debug port
3. Check service logs with `make logs-<service>`

### How do I update dependencies?

1. Update versions in `package.json` files
2. Run `pnpm install`
3. Rebuild services: `make rebuild`

## Additional Resources

- [DNS Configuration Guide](setup/dns-configuration.md)
- [E2E Testing Guide](testing/e2e-guide.md)
- [Docker Architecture](architecture/docker.md)
- [API Documentation](http://api.snapback.dev/docs)
