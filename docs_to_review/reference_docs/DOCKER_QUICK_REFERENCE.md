# Docker Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
# 1. Setup environment
cp .env.docker.example .env.docker.local
# Edit .env.docker.local with your settings

# 2. Launch everything
make dev-holistic

# 3. Access services (wait 30-60 seconds for startup)
# 🌐 http://snapback.dev:3000
# 🎛️  http://console.snapback.dev:3000
# 🔌 http://api.snapback.dev:8080
# 📚 http://docs.snapback.dev:3001
```

## 📍 Service URLs

| Service | URL | Port |
|---------|-----|------|
| Marketing Site | http://snapback.dev | 3000 |
| Console App | http://console.snapback.dev | 3000 |
| Docs | http://docs.snapback.dev | 3001 |
| API | http://api.snapback.dev | 8080 |
| MCP Server | http://mcp.snapback.dev | 8081 |
| Mailhog (Email) | http://localhost:8025 | 8025 |
| Prometheus | http://localhost:9090 | 9090 |
| Grafana | http://localhost:3002 | 3002 |
| Jaeger | http://localhost:16686 | 16686 |
| Redis Insight | http://localhost:8001 | 8001 |

## 🔧 Essential Commands

### Lifecycle Management

```bash
make dev-holistic          # Start all services ✅
make down-holistic         # Stop all services
make logs-holistic         # View all logs (realtime)
make logs-holistic-api     # View API logs
make logs-holistic-web     # View Web logs
make logs-holistic-mcp     # View MCP logs
make logs-holistic-cli     # View CLI logs
```

### Service Control

```bash
# Restart specific services
make restart-holistic-api
make restart-holistic-web
make restart-holistic-mcp
make restart-holistic-cli
make restart-holistic-docs

# Access CLI interactively
make cli-shell
```

### Container Access

```bash
# Execute command in container
docker-compose -f docker-compose.holistic.yml exec api bash

# View container status
docker-compose -f docker-compose.holistic.yml ps

# View detailed logs
docker-compose -f docker-compose.holistic.yml logs -f api
```

## 🐛 Debugging

### Node.js Inspector

Open `chrome://inspect` and attach to:
- **API**: localhost:9230
- **MCP**: localhost:9231
- **Web**: localhost:9229
- **Docs**: localhost:9232
- **CLI**: localhost:9233

### Database Access

```bash
# PostgreSQL
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback

# Redis
docker-compose -f docker-compose.holistic.yml exec redis redis-cli
```

### View Metrics

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/admin)
- **Jaeger**: http://localhost:16686

## 🔍 Troubleshooting

### Check Service Health

```bash
docker-compose -f docker-compose.holistic.yml ps

# Expected output: All services should show (healthy)
```

### View Recent Logs

```bash
# Last 50 lines
docker-compose -f docker-compose.holistic.yml logs --tail=50

# Follow logs in realtime
make logs-holistic
```

### Reset Database

```bash
# WARNING: Deletes all data
docker-compose -f docker-compose.holistic.yml down postgres -v
docker-compose -f docker-compose.holistic.yml up -d
```

### Rebuild Services

```bash
# Without cache
docker-compose -f docker-compose.holistic.yml build --no-cache

# Then restart
docker-compose -f docker-compose.holistic.yml up -d
```

## 📊 Available Services

✅ = Running in holistic setup

| Service | Type | Port | Status |
|---------|------|------|--------|
| PostgreSQL | Database | 5432 | ✅ |
| Redis | Cache | 6379 | ✅ |
| Web (Next.js) | Frontend | 3000 | ✅ |
| API (Hono) | Backend | 8080 | ✅ |
| MCP Server | Service | 8081 | ✅ |
| CLI Tool | CLI | 8082 | ✅ |
| Docs (Next.js) | Documentation | 3001 | ✅ |
| Mailhog | Email Testing | 8025 | ✅ |
| Prometheus | Metrics | 9090 | ✅ |
| Grafana | Dashboards | 3002 | ✅ |
| Jaeger | Tracing | 16686 | ✅ |
| Redis Insight | Redis GUI | 8001 | ✅ |
| Nginx | Reverse Proxy | 80 | ✅ |

## 🎯 Common Workflows

### Test Full Platform
```bash
make dev-holistic
# Test all services together
pnpm test:e2e
```

### Develop API
```bash
make dev-holistic
# Open chrome://inspect → API:9230
# Set breakpoints and debug
make logs-holistic-api
```

### Work on CLI
```bash
make dev-holistic
make cli-shell
# Now inside container: pnpm build, pnpm test, etc.
```

### Debug Database
```bash
make dev-holistic
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback
# Run SQL queries
\dt  # List tables
SELECT * FROM users;
```

### Monitor Performance
```bash
make dev-holistic
# Open http://localhost:3002 (Grafana)
# View dashboards and metrics
```

## ✅ Health Check

```bash
# Are all services healthy?
docker-compose -f docker-compose.holistic.yml ps

# Quick API test
curl http://api.snapback.dev:8080/api/health

# Check database
docker-compose -f docker-compose.holistic.yml exec postgres pg_isready
```

## 🆘 Need Help?

1. Check logs: `make logs-holistic-<service>`
2. Verify status: `docker-compose -f docker-compose.holistic.yml ps`
3. Rebuild: `docker-compose -f docker-compose.holistic.yml build --no-cache`
4. Check env: `cat .env.docker.local`
5. Read detailed guide: `docs/HOLISTIC_DOCKER_SETUP.md`

## 📝 Environment Setup

Create `.env.docker.local`:

```env
POSTGRES_USER=snapback
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=snapback
BETTER_AUTH_SECRET=your_super_secure_auth_secret_min_32_chars

# Optional - for OAuth/integrations
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
RESEND_API_KEY=xxx
```

See `.env.docker.example` for complete reference.

---

**Last Updated**: 2025-12-04
**Setup Type**: Holistic (All services in Docker)
