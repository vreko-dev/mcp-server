# Monitoring & Debugging Stack Setup Guide

Complete guide for setting up and using the integrated monitoring, debugging, and error tracking systems in SnapBack.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Monitoring Services](#monitoring-services)
3. [Sentry Error Tracking](#sentry-error-tracking)
4. [Node.js Debugging](#nodejs-debugging)
5. [Logging & Metrics](#logging--metrics)
6. [Docker Integration](#docker-integration)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Start the Holistic Environment

```bash
# From workspace root
make dev-holistic

# Or manually
docker-compose -f docker-compose.holistic.yml up -d
```

### 2. Access All Services

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | http://api.snapback.dev:8080 | Backend API |
| **Web** | http://snapback.dev:3000 | Frontend application |
| **Prometheus** | http://localhost:9090 | Metrics collection & querying |
| **Grafana** | http://localhost:3002 | Dashboards (admin/admin) |
| **Jaeger** | http://localhost:16686 | Distributed tracing |
| **Redis Insight** | http://localhost:8001 | Cache management |
| **Mailhog** | http://localhost:8025 | Email testing |

### 3. Enable Sentry (Non-Production)

```bash
# Edit .env.docker.local
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DISABLE_SENTRY=false
```

Then restart services:

```bash
docker-compose -f docker-compose.holistic.yml restart api mcp
```

---

## Monitoring Services

### Prometheus (Metrics Collection)

**Purpose**: Collect and store application metrics

**URL**: http://localhost:9090

**What It Does**:
- Scrapes metrics from your services every 15 seconds
- Stores metrics in time-series database
- Provides PromQL query language for analysis

**Key Metrics Available**:
- `api_requests_total` - Total API requests
- `api_request_duration_ms` - Request latency (histogram)
- `database_query_duration_ms` - Database query performance
- `redis_cache_hits` - Cache hit rate
- `error_rate` - Application error frequency

**Query Examples** (in Prometheus UI):

```promql
# Error rate over time
rate(api_requests_total{status="500"}[5m])

# Average request latency
avg(api_request_duration_ms)

# Cache hit rate
redis_cache_hits / (redis_cache_hits + redis_cache_misses)
```

---

### Grafana (Visualization & Dashboards)

**Purpose**: Create dashboards and visualizations from metrics

**URL**: http://localhost:3002
**Credentials**: admin / admin

**Key Features**:
- Real-time dashboards
- Alert rules with notifications
- Multisource data queries
- User management and permissions

**Pre-configured Dashboards** (when added):
- Application Performance (latency, throughput, errors)
- Infrastructure (CPU, memory, disk)
- Business Metrics (snapshots created, users active)
- Service Health (uptime, error rates)

**Quick Setup**:

```
1. Go to Data Sources → Add Prometheus
2. URL: http://prometheus:9090
3. Save & test
4. Create dashboard → Choose Prometheus datasource
```

---

### Jaeger (Distributed Tracing)

**Purpose**: Trace requests across services for debugging and performance analysis

**URL**: http://localhost:16686

**What It Shows**:
- Complete request flow across services
- Latency breakdown per service
- Service dependencies
- Error locations and stack traces

**How It Works**:

```
1. API receives request → creates root span
2. Calls database → child span "db.query"
3. Calls Redis → child span "redis.get"
4. Calls external API → child span "http.request"
All spans collected and visualized in Jaeger UI
```

**Accessing Traces**:

```
1. Go to Jaeger UI (http://localhost:16686)
2. Select service (e.g., "api")
3. Choose operation (e.g., "POST /api/snapshots")
4. Click trace to see waterfall diagram
```

---

### Redis Insight (Cache Management)

**Purpose**: Monitor and manage Redis cache

**URL**: http://localhost:8001

**Key Metrics**:
- Memory usage
- Key expiration (TTL)
- Cache hit/miss rate
- Hot keys (most accessed)
- Memory efficiency

**Use Cases**:
- Debug cache invalidation issues
- Monitor memory usage
- Identify memory leaks
- Analyze access patterns
- Optimize TTL settings

---

## Sentry Error Tracking

### Setup

#### Option 1: Use Sentry Cloud (Recommended)

```bash
# Create free account at https://sentry.io
# Create new project for SnapBack
# Copy the DSN
```

#### Option 2: Self-Hosted Sentry

```bash
# Deploy Sentry on your own infrastructure
# See https://docs.sentry.io/product/sentry-on-premise/
```

### Configuration

#### 1. Set Sentry DSN

Edit `.env.docker.local`:

```bash
# Backend error tracking
SENTRY_DSN=https://xxxxx@sentry.io/12345

# Disable for development if needed
DISABLE_SENTRY=false
```

#### 2. Restart Services

```bash
docker-compose -f docker-compose.holistic.yml restart api mcp
```

#### 3. Verify Initialization

```bash
# Check logs for Sentry initialization
docker-compose -f docker-compose.holistic.yml logs api | grep -i sentry
# Should see: "✅ Sentry initialized for API error tracking"
```

### Usage in Code

#### Capturing Errors

```typescript
import { captureError } from "@snapback/infrastructure/sentry";

try {
  await riskyOperation();
} catch (error) {
  captureError(error, {
    userId: user.id,
    organizationId: org.id,
    tags: {
      operation: "snapshot.creation",
      severity: "critical",
    },
    extra: {
      snapshotId: snapshot.id,
      fileCount: files.length,
    },
  });
}
```

#### Capturing Messages

```typescript
import { captureMessage } from "@snapback/infrastructure/sentry";

captureMessage("Snapshot creation started", "info", {
  userId: user.id,
  tags: { phase: "initialization" },
});
```

#### Setting User Context

```typescript
import { setSentryUser } from "@snapback/infrastructure/sentry";

setSentryUser(user.id, {
  email: user.email,
  username: user.username,
  organizationId: org.id,
});
```

#### Adding Breadcrumbs

```typescript
import { addSentryBreadcrumb } from "@snapback/infrastructure/sentry";

// Track important events before errors occur
addSentryBreadcrumb("Database query started", { query: "SELECT * FROM snapshots" });
addSentryBreadcrumb("Cache miss for key: snapshot_123");
addSentryBreadcrumb("Retrying failed request", { attempt: 2 });
```

### Auto-Captured Context

The Hono middleware automatically captures:

- **Request metadata**: Method, path, status code
- **Response status**: 200, 404, 500, etc.
- **User context**: User ID (if available)
- **Organization context**: Org ID (if available)
- **Breadcrumbs**: HTTP requests, database calls
- **Performance traces**: Request duration, service latency

### Sentry Dashboard

**Error Investigation**:

```
1. Go to Sentry Dashboard
2. Click error group
3. View:
   - Stack trace (source-mapped)
   - User impact (how many users affected)
   - Breadcrumbs (what happened before error)
   - Release info (when error first appeared)
   - Environment (dev, staging, prod)
```

---

## Node.js Debugging

### Debugging in Docker

Each Node service exposes a debugger port:

| Service | Port | Command |
|---------|------|---------|
| API | 9230 | `docker-compose exec api node --inspect` |
| MCP | 9231 | Debug via VS Code |
| Web | 9229 | Debug via VS Code |
| CLI | 9233 | Debug via VS Code |

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API (Docker)",
      "type": "node",
      "request": "attach",
      "port": 9230,
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"],
      "sourceMapPathOverride": {
        "/app/apps/api/**": "${workspaceFolder}/apps/api/**"
      }
    },
    {
      "name": "Debug MCP (Docker)",
      "type": "node",
      "request": "attach",
      "port": 9231,
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug Web (Docker)",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

### Debugging Steps

1. Add breakpoints in your code
2. Start services with `make dev-holistic`
3. In VS Code: Run → Start Debugging → Select "Debug API (Docker)"
4. Code execution pauses at breakpoints
5. Inspect variables, step through code

### Debug Output

View debug logs from any service:

```bash
# API logs
docker-compose -f docker-compose.holistic.yml logs -f api

# MCP logs
docker-compose -f docker-compose.holistic.yml logs -f mcp

# Web logs
docker-compose -f docker-compose.holistic.yml logs -f web
```

---

## Logging & Metrics

### Infrastructure Logger

Use the centralized logger from infrastructure package:

```typescript
import { logger } from "@snapback/infrastructure";

logger.info("Operation started", {
  snapshotId: "snap-123",
  fileCount: 5,
});

logger.error("Operation failed", {
  error: error.message,
  snapshotId: "snap-123",
  stack: error.stack,
});
```

### Metrics Collection

```typescript
import { metrics } from "@snapback/infrastructure";

// Counter - increment for each event
metrics.counter("snapshots.created", 1, {
  source: "web",
  workspace: "ws-123",
});

// Gauge - current value
metrics.gauge("active.users", 42);

// Histogram - distribution
metrics.histogram("api.request.duration.ms", 150, {
  endpoint: "/api/v1/snapshots",
});
```

### Log Levels

- `debug` - Detailed debugging information
- `info` - Informational messages
- `warn` - Warning messages
- `error` - Error messages
- `fatal` - Fatal errors (process termination)

---

## Docker Integration

### Service Startup Sequence

```
1. postgres starts (needs time to initialize)
2. redis starts (fast)
3. migrations runs (applies database schema)
4. api starts (depends on postgres & migrations)
5. mcp starts (depends on api)
6. web starts (depends on api)
7. jaeger starts (independent)
8. prometheus starts (independent)
9. grafana starts (independent)
```

### Health Checks

Each service has health checks:

```bash
# View health status
docker-compose -f docker-compose.holistic.yml ps

# Example output:
# snapback-api       "HEALTHY"
# snapback-postgres  "HEALTHY"
# snapback-web       "HEALTHY"
```

### Environment Variables in Docker

Services receive environment variables from:

1. `.env.docker` (version controlled)
2. `.env.docker.local` (gitignored, for secrets)
3. Docker Compose `environment:` section

Priority: Docker Compose > .env.docker.local > .env.docker

### Networking

All services connected via `snapback` network:

```
snapback-api → snapback-postgres (DATABASE_URL)
snapback-api → snapback-redis (REDIS_URL)
snapback-web → snapback-api (API_URL)
snapback-mcp → snapback-api (API_URL)
```

**Important**: Use service names for internal communication, not localhost!

---

## Development Workflow

### Common Tasks

#### 1. View All Service Logs

```bash
docker-compose -f docker-compose.holistic.yml logs -f
```

#### 2. View Specific Service Logs

```bash
docker-compose -f docker-compose.holistic.yml logs -f api
docker-compose -f docker-compose.holistic.yml logs -f web --tail=100
```

#### 3. Execute Commands in Container

```bash
# Install dependencies
docker-compose -f docker-compose.holistic.yml exec api pnpm install

# Run database migrations
docker-compose -f docker-compose.holistic.yml exec api pnpm db:migrate

# Database shell
docker-compose -f docker-compose.holistic.yml exec postgres psql -U snapback -d snapback
```

#### 4. Rebuild Services

```bash
docker-compose -f docker-compose.holistic.yml build --no-cache api
docker-compose -f docker-compose.holistic.yml up -d api
```

#### 5. Clean Up

```bash
# Stop all services
make clean-holistic

# Remove volumes (database data will be lost!)
docker-compose -f docker-compose.holistic.yml down -v

# Remove all SnapBack images
docker rmi snapback-api snapback-web snapback-mcp snapback-cli
```

### Monitoring During Development

**In separate terminals**:

```bash
# Terminal 1: View all logs
docker-compose -f docker-compose.holistic.yml logs -f

# Terminal 2: Watch metrics in Prometheus
open http://localhost:9090

# Terminal 3: Watch traces in Jaeger
open http://localhost:16686

# Terminal 4: Watch dashboards in Grafana
open http://localhost:3002
```

### Testing Error Tracking

#### 1. Test Sentry Integration

```bash
# Create a test error
curl -X GET http://api.snapback.dev:8080/api/test/error

# Check Sentry dashboard for new error
open https://sentry.io/organizations/your-org/issues/
```

#### 2. View Sentry Breadcrumbs

```
1. Go to error in Sentry dashboard
2. Scroll to "Breadcrumbs" section
3. See what happened before error occurred
```

#### 3. Test User Context

```
1. Trigger error with user logged in
2. Go to error in Sentry
3. See affected user in "User" section
```

---

## Troubleshooting

### Services Won't Start

**Problem**: Containers fail to start

```bash
# Check logs
docker-compose -f docker-compose.holistic.yml logs

# Common causes:
# 1. Port already in use
# 2. Volume permission issues
# 3. Environment variables missing
```

**Solution**:

```bash
# Check which process uses port 8080
lsof -i :8080

# Kill process or use different port
# Fix missing env vars in .env.docker.local
```

### Database Connection Failed

**Problem**: "Connection refused" to postgres

```
docker-compose -f docker-compose.holistic.yml logs postgres
```

**Solution**:

```bash
# Ensure postgres has time to start
sleep 10 && docker-compose -f docker-compose.holistic.yml logs postgres

# Or restart all services
docker-compose -f docker-compose.holistic.yml restart
```

### Sentry Not Capturing Errors

**Problem**: Errors don't appear in Sentry dashboard

**Checklist**:

```bash
# 1. Check SENTRY_DSN is set
docker-compose -f docker-compose.holistic.yml exec api env | grep SENTRY

# 2. Check Sentry is initialized
docker-compose -f docker-compose.holistic.yml logs api | grep "Sentry"

# 3. Check DISABLE_SENTRY is not set
docker-compose -f docker-compose.holistic.yml exec api env | grep DISABLE

# 4. Trigger test error
curl http://api.snapback.dev:8080/api/test/error
```

### High Memory Usage

**Problem**: Docker containers consuming too much memory

```bash
# Check memory usage
docker stats

# Services are configured with memory limits in docker-compose
# If exceeded, increase limits in docker-compose.holistic.yml
```

### Jaeger Not Showing Traces

**Problem**: Traces not appearing in Jaeger UI

**Cause**: Tracing not initialized in services

**Solution**: Ensure environment variables are set:

```bash
# In docker-compose.holistic.yml
JAEGER_AGENT_HOST: jaeger
JAEGER_AGENT_PORT: 6831
```

### Metrics Not in Prometheus

**Problem**: No metrics in Prometheus dashboard

**Solution**:

```bash
# 1. Check prometheus targets
open http://localhost:9090/targets

# 2. Ensure services expose /metrics endpoint
curl http://api.snapback.dev:8080/metrics

# 3. Check Prometheus scrape configuration
docker-compose -f docker-compose.holistic.yml logs prometheus
```

---

## Performance Tips

### 1. Reduce Trace Sample Rate in Production

```typescript
initSentryAPI({
  tracesSampleRate: 0.01, // Only 1% of requests
});
```

### 2. Set Appropriate Log Levels

```bash
LOG_LEVEL=info  # Production
LOG_LEVEL=debug # Development
```

### 3. Configure Metric Batching

```typescript
// Don't send metrics immediately
// Batch them for efficiency
metrics.flush(interval: 30000); // Every 30 seconds
```

### 4. Limit Jaeger Span Storage

```bash
# In docker-compose.holistic.yml
COLLECTOR_OTLP_ENABLED=true
SPAN_STORAGE_TYPE=badger  # More efficient than in-memory
```

---

## Next Steps

1. **Configure Sentry**: Create account, add DSN to `.env.docker.local`
2. **Set Up Grafana**: Add dashboards for your key metrics
3. **Test Integration**: Trigger errors and verify they appear in Sentry
4. **Add Alerts**: Configure alert rules in Prometheus/Grafana
5. **Production Setup**: Adapt configuration for production environment

---

## Documentation Links

- **Sentry**: https://docs.sentry.io/
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/grafana/latest/
- **Jaeger**: https://www.jaegertracing.io/docs/
- **Redis Insight**: https://docs.redis.com/latest/ri/
- **Infrastructure Package**: `packages/infrastructure/README.md`

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review logs: `docker-compose logs -f [service]`
3. Check GitHub Issues: https://github.com/snapback/snapback/issues
4. Consult individual tool documentation (links above)
