# SnapBack Docker - Quick Start Guide

This guide will help you get SnapBack running locally using Docker in under 5 minutes.

## Prerequisites

- **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
- **macOS** or **Linux** (Windows WSL2 also supported)
- **16GB RAM** recommended (8GB minimum)
- **20GB free disk space**

## Step-by-Step Setup

### 1. Update Your Hosts File

Add subdomain entries for local development:

```bash
sudo ./ops/scripts/setup-hosts.sh
```

This adds the following entries to `/etc/hosts`:
- `snapback.dev` - Main marketing site
- `console.snapback.dev` - Dashboard/console
- `docs.snapback.dev` - Documentation
- `api.snapback.dev` - API service
- `mcp.snapback.dev` - MCP server

### 2. Configure Environment Variables

The `.env.docker` file is already created. You need to set at least these two values:

```bash
# Edit the environment file
nano .env.docker
```

**Required changes:**
```bash
# Change this from the placeholder
POSTGRES_PASSWORD=your_actual_secure_password

# Change this from the placeholder (minimum 32 characters)
BETTER_AUTH_SECRET=your_actual_super_secure_auth_secret_at_least_32_chars_long
```

**Tip:** Generate a secure password:
```bash
# For POSTGRES_PASSWORD
openssl rand -base64 32

# For BETTER_AUTH_SECRET
openssl rand -base64 48
```

### 3. Start All Services

```bash
./ops/scripts/docker-start.sh
```

This script will:
- ✅ Validate Docker is running
- ✅ Check environment configuration
- ✅ Verify subdomain setup
- ✅ Build all services
- ✅ Start containers
- ✅ Wait for health checks
- ✅ Display service URLs

### 4. Access Your Application

Once started, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| 🌐 Main Site | http://snapback.dev | Marketing/landing page |
| 📱 Console | http://console.snapback.dev | Dashboard |
| 📚 Docs | http://docs.snapback.dev | Documentation |
| 🔌 API | http://api.snapback.dev:8080 | Backend API |
| 🤖 MCP | http://mcp.snapback.dev:8081 | MCP Server |
| 📈 Prometheus | http://localhost:9090 | Metrics |
| 📊 Grafana | http://localhost:3002 | Dashboards (admin/admin) |
| 🔍 Jaeger | http://localhost:16686 | Tracing |
| 📧 MailHog | http://localhost:8025 | Email testing |

## Common Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f api
```

### Stop Services
```bash
./ops/scripts/docker-stop.sh

# Or manually
docker-compose -f docker-compose.dev.yml down
```

### Restart a Service
```bash
docker-compose -f docker-compose.dev.yml restart web
docker-compose -f docker-compose.dev.yml restart api
```

### Check Service Status
```bash
docker-compose -f docker-compose.dev.yml ps
```

### Access Container Shell
```bash
# Web container
docker-compose -f docker-compose.dev.yml exec web sh

# Database container
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback
```

### View Database
```bash
# Using psql
docker-compose -f docker-compose.dev.yml exec postgres psql -U snapback -d snapback

# Using a GUI client
# Connect to: localhost:5432
# Database: snapback
# Username: snapback
# Password: (your POSTGRES_PASSWORD)
```

## Troubleshooting

### Services won't start?

**Check Docker is running:**
```bash
docker info
```

**Check logs for errors:**
```bash
docker-compose -f docker-compose.dev.yml logs
```

**Rebuild containers:**
```bash
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### Can't access subdomains?

**Verify hosts file:**
```bash
cat /etc/hosts | grep snapback
```

Should show:
```
127.0.0.1 snapback.dev
127.0.0.1 console.snapback.dev
127.0.0.1 docs.snapback.dev
127.0.0.1 api.snapback.dev
127.0.0.1 mcp.snapback.dev
```

**Re-run setup:**
```bash
sudo ./ops/scripts/setup-hosts.sh
```

### Database connection errors?

**Check postgres is healthy:**
```bash
docker-compose -f docker-compose.dev.yml ps postgres
```

**Check migrations ran:**
```bash
docker-compose -f docker-compose.dev.yml logs migrations
```

**Reset database:**
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Port conflicts?

**Check what's using ports:**
```bash
# Check port 3000 (web)
lsof -i :3000

# Check port 8080 (api)
lsof -i :8080

# Check port 5432 (postgres)
lsof -i :5432
```

**Kill conflicting processes:**
```bash
# Kill process on port
kill -9 $(lsof -t -i:3000)
```

### Out of disk space?

**Clean up Docker:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (nuclear option)
docker system prune -a --volumes
```

**Check disk usage:**
```bash
docker system df
```

## Next Steps

Once everything is running:

1. **Create an account** at http://console.snapback.dev
2. **Explore the docs** at http://docs.snapback.dev
3. **Check the API** at http://api.snapback.dev:8080/api/health
4. **View metrics** at http://localhost:9090

## Development Workflow

### Hot Reload

All services support hot reload:
- Save a file in `apps/web/` → Web reloads
- Save a file in `apps/api/` → API reloads
- Save a file in `apps/docs/` → Docs reload

### Database Changes

After modifying Drizzle schemas:

```bash
# Generate migration
pnpm --filter @snapback/platform run drizzle-kit generate

# Apply migration (automatic on restart, or manually:)
docker-compose -f docker-compose.dev.yml restart migrations
```

### Adding Dependencies

```bash
# Install in the host (not in container)
pnpm add <package> --filter @snapback/web

# Rebuild container
docker-compose -f docker-compose.dev.yml build web
docker-compose -f docker-compose.dev.yml restart web
```

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  NGINX (Port 80)                │
│         Subdomain-based Reverse Proxy           │
└────────┬────────────────────────────────────────┘
         │
    ┌────┴────┬─────────┬──────────┬──────────┐
    │         │         │          │          │
    ▼         ▼         ▼          ▼          ▼
┌───────┐ ┌──────┐ ┌───────┐ ┌───────┐ ┌───────┐
│  Web  │ │ Docs │ │  API  │ │  MCP  │ │ Tools │
│ :3000 │ │ :3000│ │ :8080 │ │ :8081 │ │  ...  │
└───┬───┘ └──────┘ └───┬───┘ └───────┘ └───────┘
    │                  │
    │         ┌────────┴────────┐
    │         │                 │
    │         ▼                 ▼
    │    ┌──────────┐      ┌───────┐
    └───▶│ Postgres │      │ Redis │
         │  :5432   │      │ :6379 │
         └──────────┘      └───────┘
```

## Support

For more detailed information:
- Full Docker documentation: [docs/DOCKER.md](./DOCKER.md)
- Troubleshooting guide: [docs/DOCKER-TROUBLESHOOTING.md](./DOCKER-TROUBLESHOOTING.md)
- Architecture: [CLAUDE.md](../CLAUDE.md)

Having issues? Check the troubleshooting guide or open an issue on GitHub.
