# Monitoring & Debugging Quick Reference

**Bookmark this for fast access to monitoring tools and commands.**

---

## 🚀 Quick Start Commands

```bash
# Start holistic environment with all monitoring
make dev-holistic

# Or manually
docker-compose -f docker-compose.holistic.yml up -d

# View all logs
docker-compose -f docker-compose.holistic.yml logs -f

# Stop everything
make clean-holistic
```

---

## 📊 Monitoring Dashboard URLs

| Tool | URL | Login |
|------|-----|-------|
| **Prometheus** | http://localhost:9090 | N/A |
| **Grafana** | http://localhost:3002 | admin / admin |
| **Jaeger** | http://localhost:16686 | N/A |
| **Redis Insight** | http://localhost:8001 | N/A |
| **Mailhog** | http://localhost:8025 | N/A |

---

## 🐛 Debugging

### View Logs

```bash
# All services
docker-compose -f docker-compose.holistic.yml logs -f

# Specific service
docker-compose -f docker-compose.holistic.yml logs -f api
docker-compose -f docker-compose.holistic.yml logs -f web --tail=100

# Real-time grep
docker-compose -f docker-compose.holistic.yml logs -f api | grep error
```

### Node.js Debugger

```bash
# VS Code: Run → Start Debugging → "Debug API (Docker)"
# Breakpoints will pause execution on port 9230

# Ports:
# API:   9230
# MCP:   9231
# Web:   9229
# CLI:   9233
```

### Database Shell

```bash
# PostgreSQL
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback

# Redis
docker-compose -f docker-compose.holistic.yml exec redis redis-cli
```

---

## 🔴 Sentry Error Tracking

### Setup

```bash
# 1. Create account: https://sentry.io
# 2. Add SENTRY_DSN to .env.docker.local
SENTRY_DSN=https://xxxxx@sentry.io/12345
DISABLE_SENTRY=false

# 3. Restart services
docker-compose -f docker-compose.holistic.yml restart api mcp
```

### Capture Errors

```typescript
import { captureError, setSentryUser } from "@snapback/infrastructure/sentry";

// Set user context
setSentryUser(user.id, { email: user.email });

// Capture errors
try {
  await operation();
} catch (error) {
  captureError(error, {
    userId: user.id,
    tags: { feature: "snapshots" },
  });
}
```

### Test Integration

```bash
curl http://api.snapback.dev:8080/api/test/error
# Error should appear in Sentry dashboard
```

---

## 📈 Metrics & Logging

### Log Levels

```typescript
import { logger } from "@snapback/infrastructure";

logger.debug("Detailed info");
logger.info("General info");
logger.warn("Warning");
logger.error("Error with context", { userId, error: e.message });
logger.fatal("Critical failure");
```

### Collect Metrics

```typescript
import { metrics } from "@snapback/infrastructure";

metrics.counter("snapshots.created", 1, { source: "web" });
metrics.gauge("active.users", 42);
metrics.histogram("request.duration", 150, { endpoint: "/api/v1/snapshots" });
```

### Query Metrics (Prometheus)

```promql
# Error rate
rate(api_requests_total{status="500"}[5m])

# Request latency
histogram_quantile(0.95, api_request_duration_ms)

# Cache effectiveness
redis_cache_hits / (redis_cache_hits + redis_cache_misses)
```

---

## 🔗 Distributed Tracing (Jaeger)

### View Traces

```
1. Go to http://localhost:16686
2. Select service (api, web, mcp)
3. Select operation
4. Click trace to see waterfall
```

### Trace Duration Breakdown

```
Root Span: POST /api/snapshots (150ms)
├── db.query (50ms)
├── redis.get (10ms)
├── redis.set (5ms)
└── external.api (85ms)
```

---

## 🔧 Service Management

### Restart Service

```bash
docker-compose -f docker-compose.holistic.yml restart api
```

### View Service Status

```bash
docker-compose -f docker-compose.holistic.yml ps
# Shows: RUNNING, EXITED, UNHEALTHY, etc.
```

### Execute Command in Container

```bash
docker-compose -f docker-compose.holistic.yml exec api bash
docker-compose -f docker-compose.holistic.yml exec api pnpm install
docker-compose -f docker-compose.holistic.yml exec api pnpm db:migrate
```

### Clean Up (DESTRUCTIVE!)

```bash
# Remove volumes (loses database data!)
docker-compose -f docker-compose.holistic.yml down -v

# Remove all SnapBack images
docker rmi snapback-api snapback-web snapback-mcp snapback-cli
```

---

## 🐘 PostgreSQL

### Connect

```bash
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback
```

### Common Queries

```sql
-- List all tables
\dt

-- View schema
\d snapshots

-- Quick query
SELECT * FROM snapshots LIMIT 5;

-- Count records
SELECT COUNT(*) FROM snapshots;

-- Exit
\q
```

---

## 💾 Redis

### Connect

```bash
docker-compose -f docker-compose.holistic.yml exec redis redis-cli
```

### Commands

```bash
# See all keys
KEYS *

# Get value
GET key-name

# Set TTL
EXPIRE key-name 3600

# Delete
DEL key-name

# Flush all
FLUSHALL  # Careful!
```

---

## 📧 Email Testing (Mailhog)

### Access

```
Web UI: http://localhost:8025
```

### How It Works

```
All emails sent to smtp://mailhog:1025 are captured
View them in the web UI - perfect for development
```

---

## 🆘 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.holistic.yml logs

# Rebuild
docker-compose -f docker-compose.holistic.yml build --no-cache api
docker-compose -f docker-compose.holistic.yml up -d api
```

### Port already in use

```bash
# Find what uses port 8080
lsof -i :8080

# Kill it or use different port
kill -9 <PID>
```

### Database connection failed

```bash
# Wait for postgres to be ready
sleep 15
docker-compose -f docker-compose.holistic.yml logs postgres
```

### Out of memory

```bash
# Check usage
docker stats

# Increase limits in docker-compose.holistic.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase from 512M
```

### Sentry not working

```bash
# Verify DSN is set
docker-compose -f docker-compose.holistic.yml exec api env | grep SENTRY_DSN

# Check initialization logs
docker-compose -f docker-compose.holistic.yml logs api | grep -i sentry

# Test endpoint
curl http://api.snapback.dev:8080/api/test/error
```

---

## 📚 Documentation

- **Full Guide**: `MONITORING_DEBUGGING_SETUP.md`
- **Sentry Strategy**: `SENTRY_REINTEGRATION_STRATEGY.md`
- **Infrastructure**: `packages/infrastructure/README.md`
- **Makefile**: `Makefile` (see `make help`)

---

## 💡 Pro Tips

### 1. Multiple Terminals

```bash
# Terminal 1: Logs
docker-compose -f docker-compose.holistic.yml logs -f

# Terminal 2: Metrics (Prometheus)
open http://localhost:9090

# Terminal 3: Traces (Jaeger)
open http://localhost:16686

# Terminal 4: Dashboard (Grafana)
open http://localhost:3002
```

### 2. Watch Specific Service

```bash
docker-compose -f docker-compose.holistic.yml logs -f api --tail=50
```

### 3. Search Logs

```bash
docker-compose -f docker-compose.holistic.yml logs | grep "ERROR\|error" | tail -20
```

### 4. Health Check

```bash
curl http://api.snapback.dev:8080/api/health
curl http://snapback.dev:3000/health
```

### 5. Performance Profile

```bash
# In Sentry, check performance traces
# Duration breakdown by service
# Identify bottlenecks
# See transaction waterfall
```

---

## 🎯 Next Steps

1. **Set up Sentry** → Add DSN and test
2. **Create Grafana dashboards** → Visualize key metrics
3. **Configure alerts** → Prometheus alert rules
4. **Optimize sampling** → Reduce noise in production
5. **Document runbooks** → How to respond to alerts

---

**Last updated**: December 4, 2025
**Questions?** See `MONITORING_DEBUGGING_SETUP.md` or check tool documentation
