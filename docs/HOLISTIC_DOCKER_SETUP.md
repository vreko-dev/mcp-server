# Holistic Docker Development Setup

## Overview

This guide explains how to run **all SnapBack services and applications** holistically within Docker for comprehensive platform debugging, development, and testing.

The holistic setup includes:
- **Web Application** (Next.js) - Marketing & Console UI
- **API Service** (Hono) - Backend API
- **MCP Server** - Model Context Protocol server
- **CLI Tool** - Command-line interface
- **Documentation** (Next.js) - Project documentation
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **Mailhog** - Email testing service
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization & dashboards
- **Jaeger** - Distributed tracing
- **Redis Insight** - Redis GUI/management
- **Nginx** - Reverse proxy for subdomain routing

## Quick Start

### 1. Setup Environment Variables

Create `.env.docker.local` with your local credentials:

```bash
# Copy example and customize
cp .env.docker.example .env.docker.local

# Edit with your settings
nano .env.docker.local
```

Minimum required settings:
```env
POSTGRES_USER=snapback
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=snapback
BETTER_AUTH_SECRET=your_super_secure_auth_secret_min_32_chars
```

### 2. Launch All Services

```bash
# Start everything
make dev-holistic

# Or manually:
docker-compose --env-file .env.docker -f docker-compose.holistic.yml up -d
```

### 3. Access Services

Once all services are running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Web UI** | http://snapback.dev:3000 | Marketing site |
| **Console** | http://console.snapback.dev:3000 | Main application |
| **Docs** | http://docs.snapback.dev:3001 | Documentation |
| **API** | http://api.snapback.dev:8080 | Backend API |
| **MCP** | http://mcp.snapback.dev:8081 | MCP Server |
| **Mailhog** | http://localhost:8025 | Email testing |
| **Prometheus** | http://localhost:9090 | Metrics raw data |
| **Grafana** | http://localhost:3002 | Dashboards (admin/admin) |
| **Jaeger** | http://localhost:16686 | Distributed tracing |
| **Redis Insight** | http://localhost:8001 | Redis management |

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Nginx (Reverse Proxy)                 │
│              Routes subdomain traffic                   │
└─────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │   Web   │  │ Console  │  │   Docs   │  │   API    │
    │ (Next.js)│  │ (Next.js)│  │ (Next.js)│  │  (Hono)  │
    └────┬────┘  └──────┬───┘  └──────┬───┘  └────┬─────┘
         │               │             │           │
         └───────────────┴─────────────┴───────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐   ┌────────┐
    │   MCP   │    │   Redis  │   │ Mailhog│
    └────┬────┘    └──────────┘   └────────┘
         │               │
         └───────────┬───┘
                     ▼
                ┌──────────┐
                │ PostgreSQL│
                └──────────┘

    ┌─────────────────────────────────────┐
    │   Observability Stack               │
    │ ┌──────┐  ┌────────┐  ┌────────┐  │
    │ │Prom  │  │ Grafana│  │ Jaeger │  │
    │ └──────┘  └────────┘  └────────┘  │
    └─────────────────────────────────────┘
```

## Development Workflows

### Workflow 1: Full Platform Testing

Test the entire platform end-to-end:

```bash
# Start all services
make dev-holistic

# Wait for services to become healthy (30-60 seconds)
docker-compose -f docker-compose.holistic.yml ps

# Run E2E tests
pnpm test:e2e

# View logs to debug issues
make logs-holistic
```

### Workflow 2: API Development with Debugging

Develop and debug API endpoints:

```bash
# Start services
make dev-holistic

# Attach Node debugger
# In Chrome: chrome://inspect
# Look for "api" service target
# Click "inspect"

# Make requests to API
curl http://api.snapback.dev:8080/api/health

# View API logs in real-time
make logs-holistic-api

# Set breakpoints in VSCode with debugger attachment
# Or inspect network calls in Chrome DevTools
```

### Workflow 3: CLI Development

Develop and test CLI tool:

```bash
# Start services (CLI needs database)
make dev-holistic

# Enter CLI container shell
make cli-shell

# Now you're inside the CLI container, can run:
pnpm build
pnpm test
pnpm dev

# Or run commands directly:
docker-compose -f docker-compose.holistic.yml exec cli pnpm test:coverage
```

### Workflow 4: Monitoring & Performance Analysis

Monitor application performance:

```bash
# Start all services
make dev-holistic

# View system metrics
# Open: http://localhost:3002
# Login: admin / admin
# Explore pre-built dashboards

# View distributed traces
# Open: http://localhost:16686
# Search for service: api, web, mcp

# Check raw Prometheus metrics
# Open: http://localhost:9090
# Query: rate(http_requests_total[5m])
```

### Workflow 5: Database Debugging

Debug database issues:

```bash
# Start services
make dev-holistic

# Access PostgreSQL directly
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback

# View Redis data
# Open: http://localhost:8001
# No authentication needed in dev

# Check Redis via CLI
docker-compose -f docker-compose.holistic.yml exec redis redis-cli
> KEYS *
> GET key_name
```

## Node.js Debugging

### Chrome DevTools Debugging

1. **Start services:**
   ```bash
   make dev-holistic
   ```

2. **Open Chrome DevTools:**
   - Go to `chrome://inspect`
   - Enable "Discover network targets"
   - Add `localhost:9230`, `localhost:9231`, `localhost:9229`, `localhost:9232`, `localhost:9233`

3. **Select service to debug:**
   - **API (Hono)**: Port 9230
   - **MCP**: Port 9231
   - **Web (Next.js)**: Port 9229
   - **Docs (Next.js)**: Port 9232
   - **CLI**: Port 9233

4. **Set breakpoints and debug:**
   - Click "inspect" under the service
   - DevTools opens with debugger
   - Set breakpoints in code
   - Step through execution

### VSCode Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to API",
      "port": 9230,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to MCP",
      "port": 9231,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Web",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Then press F5 to attach debugger.

## Logging

### View Real-Time Logs

```bash
# All services
make logs-holistic

# Specific services
make logs-holistic-api
make logs-holistic-web
make logs-holistic-mcp
make logs-holistic-cli
make logs-holistic-docs
make logs-holistic-db
```

### Log Levels

Control log verbosity via environment variables in `.env.docker.local`:

```env
# API service
LOG_LEVEL=debug  # Options: error, warn, info, debug, trace

# Application
NODE_ENV=development
```

## Health Checks

Services include health check endpoints. View container status:

```bash
# List all containers with health status
docker-compose -f docker-compose.holistic.yml ps

# Example output:
# NAME                STATUS              PORTS
# snapback-api        Up 2 minutes (healthy)    8080->8080/tcp
# snapback-web        Up 2 minutes (healthy)    3000->3000/tcp
# snapback-postgres   Up 2 minutes (healthy)    5432->5432/tcp
```

## Service Management

### Restart Individual Services

```bash
# Development (docker-compose.dev.yml)
make restart-api
make restart-web
make restart-mcp

# Holistic (docker-compose.holistic.yml)
make restart-holistic-api
make restart-holistic-web
make restart-holistic-mcp
make restart-holistic-cli
make restart-holistic-docs
```

### Stop All Services

```bash
# Development setup
make down

# Holistic setup
make down-holistic

# Keep volumes (database data persists)
make down-holistic

# Remove volumes (fresh database)
docker-compose -f docker-compose.holistic.yml down -v
```

## Troubleshooting

### Services Not Starting

Check logs to diagnose:

```bash
# View all logs
make logs-holistic

# View specific service
make logs-holistic-api

# Check container status
docker-compose -f docker-compose.holistic.yml ps

# Inspect specific container
docker-compose -f docker-compose.holistic.yml logs api
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.holistic.yml ps postgres

# Test connection
docker-compose -f docker-compose.holistic.yml exec postgres pg_isready

# View migration logs
make logs-holistic-db

# Reset database (WARNING: Deletes data)
docker-compose -f docker-compose.holistic.yml down postgres -v
docker-compose -f docker-compose.holistic.yml up -d postgres
docker-compose -f docker-compose.holistic.yml up migrations
```

### Port Conflicts

If ports are already in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :8080

# Stop the process
kill -9 <PID>

# Or change port in docker-compose.holistic.yml:
# ports:
#   - "3000:3000"  # Change to "3010:3000"
```

### Container Build Issues

Rebuild all images:

```bash
# Clean rebuild (no cache)
docker-compose -f docker-compose.holistic.yml build --no-cache

# Then start
docker-compose -f docker-compose.holistic.yml up -d
```

### Environment Variable Issues

Verify `.env.docker.local` is created:

```bash
# Check file exists
ls -la .env.docker.local

# Verify required variables
grep POSTGRES_PASSWORD .env.docker.local
grep BETTER_AUTH_SECRET .env.docker.local
```

## Performance Optimization

### Resource Limits

Edit `docker-compose.holistic.yml` to adjust resource allocation:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M      # Maximum memory
          cpus: "0.5"       # CPU cores
        reservations:
          memory: 256M      # Reserved memory
          cpus: "0.25"      # Reserved cores
```

### Disable Unused Services

If you only need certain services, stop others:

```bash
# Stop unneeded services
docker-compose -f docker-compose.holistic.yml stop grafana prometheus jaeger redis-insight
```

## Advanced Configuration

### Custom Hostnames

Add to `/etc/hosts` (macOS/Linux):

```
127.0.0.1       snapback.dev
127.0.0.1       console.snapback.dev
127.0.0.1       api.snapback.dev
127.0.0.1       docs.snapback.dev
127.0.0.1       mcp.snapback.dev
```

On macOS, you can use `sudo nano /etc/hosts`.

### Network Inspection

```bash
# List all Docker networks
docker network ls

# Inspect snapback network
docker network inspect snapback_snapback

# View service IPs
docker-compose -f docker-compose.holistic.yml exec api hostname -i
```

## CI/CD Implications

This setup mirrors production deployment:
- All services containerized
- Database migrations automated
- Health checks configured
- Resource limits defined
- Logging and monitoring enabled

Use for testing CI/CD changes locally before pushing.

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Execution environment | `development` |
| `LOG_LEVEL` | Logging verbosity | `debug` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `REDIS_URL` | Redis connection | `redis://host:6379` |
| `BETTER_AUTH_URL` | Auth service URL | `http://api.snapback.dev:8080` |
| `NEXT_PUBLIC_API_URL` | Public API URL | `http://api.snapback.dev:8080` |
| `CORS_ORIGIN` | CORS allowed origins | `http://localhost:*` |

See `.env.docker.example` for complete list.

## Support & Debugging

For debugging issues:

1. Check service logs: `make logs-holistic-<service>`
2. Verify health: `docker-compose -f docker-compose.holistic.yml ps`
3. Check resource usage: `docker stats`
4. Inspect network: `docker network inspect snapback_snapback`
5. Review environment: `docker-compose config`

## Next Steps

- [Local Development Guide](./local-development.md)
- [Testing Strategy](./testing/README.md)
- [API Documentation](./api/README.md)
- [Architecture Overview](./architecture/README.md)
