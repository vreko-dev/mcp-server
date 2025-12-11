# Infrastructure & Deployment Configuration
**Consolidated from**: infrastructure directory | **Date**: December 2025
**Purpose**: System deployment, monitoring, and operational guides

---

## Part 1: Docker Configuration

### Production Build (apps/web/Dockerfile.prod)

**Multi-Stage Build Strategy** (109 lines - production-optimized):

```dockerfile
# Stage 1: Base
FROM node:20.11.0-alpine AS base

# Stage 2: Pruner (minimize build context)
FROM base AS pruner
RUN turbo prune @snapback/web --docker

# Stage 3: Dependencies
FROM base AS deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 4: Builder
FROM base AS builder
RUN pnpm turbo run build --filter=@snapback/web

# Stage 5: Runner (final image)
FROM base AS runner
COPY --from=builder /app/apps/web/.next/standalone ./
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

**Optimizations**:
- ✅ Multi-stage builds (minimal final image size)
- ✅ Turbo pruning (only necessary files)
- ✅ Layer caching (dependencies in separate layer)
- ✅ Non-root user (security hardening)
- ✅ dumb-init for proper signal handling
- ✅ Alpine base (lightweight OS)

**Build Command**:
```bash
docker build -f apps/web/Dockerfile.prod -t snapback-web:prod .
docker run -p 3000:3000 snapback-web:prod
```

### Development Build (apps/web/Dockerfile.dev)

**Interactive Development** (96 lines - hot reload enabled):

```dockerfile
# Dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
# ... individual COPY for each package

# Source code
COPY . .

# Development environment
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

CMD ["pnpm", "dev"]
```

**Features**:
- ✅ Workspace-aware dependency resolution
- ✅ File watching enabled (Chokidar polling for Docker)
- ✅ Hot reload on file changes
- ✅ Source maps included for debugging

**Build Command**:
```bash
docker build -f apps/web/Dockerfile.dev -t snapback-web:dev .
docker run -it -p 3000:3000 -v $(pwd):/app snapback-web:dev
```

**Known Issue (P1.1)**: Line 79 references non-existent `database` package
- See IMPLEMENTATION_GUIDES.md for fix details

---

## Part 2: Makefile & Build Commands

**Essential Build Targets**:

```makefile
dev:
	pnpm dev

build:
	pnpm build

docker-dev:
	docker build -f apps/web/Dockerfile.dev -t snapback-web:dev .

docker-prod:
	docker build -f apps/web/Dockerfile.prod -t snapback-web:prod .

test:
	pnpm test

test-e2e:
	pnpm test:e2e

lint:
	pnpm lint

type-check:
	pnpm type-check
```

---

## Part 3: Monitoring Setup

### Metrics Collection

**Prometheus Integration**:
```yaml
# ops/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'snapback-api'
    static_configs:
      - targets: ['localhost:3001']

  - job_name: 'snapback-web'
    static_configs:
      - targets: ['localhost:3000']
```

**Metrics to Track**:
- Request latency (p50, p95, p99)
- Error rate (HTTP 4xx, 5xx)
- Throughput (requests/second)
- Database query time
- Cache hit ratio

### Grafana Dashboards

**Key Panels**:
1. **Request Latency Distribution**
   - Query: histogram_quantile(0.95, request_duration_seconds)
   - Alert: > 1s

2. **Error Rate**
   - Query: rate(http_requests_total{status=~"5.."}[5m])
   - Alert: > 5%

3. **Cache Performance**
   - Query: rate(cache_hits_total[5m]) / rate(cache_lookups_total[5m])
   - Target: > 80%

4. **Database Connections**
   - Query: db_active_connections
   - Threshold: < max_connections * 0.8

### PostHog Analytics Integration

**Event Tracking**:
```typescript
import posthog from 'posthog-js';

// Server-side (Next.js Server Component)
import { PostHog } from 'posthog-node';
const posthog = new PostHog();

posthog.capture({
  distinctId: userId,
  event: 'snapshot_created',
  properties: {
    file_size: snapshot.size,
    detection_score: snapshot.risk,
  },
});

// Client-side (React component)
posthog.capture('snapshot_viewed', { id: snapshotId });
```

**Dashboards**:
- User engagement metrics
- Feature adoption rates
- Retention cohorts
- Funnel analysis

---

## Part 4: Performance Budgets (Non-Negotiable)

### Extension (VS Code)
- **Activation**: <500ms
- **Save Handler**: <50ms (no snapshot), <100ms (with snapshot)
- **Bundle Size**: <2MB
- **Memory**: <200MB peak

### Web Application
- **FCP (First Contentful Paint)**: <1.8s (mobile), <1s (desktop)
- **LCP (Largest Contentful Paint)**: <2.5s (mobile), <1.5s (desktop)
- **Bundle Size**: <200KB (gzipped)
- **API Response Time**: <200ms (p95)

### API Service
- **Response Time**: <100ms (p95)
- **Throughput**: >1000 requests/second
- **Error Rate**: <0.1%
- **Availability**: >99.95%

---

## Part 5: Environment Configuration

### Environment Variables

**Critical Variables** (must set):
```bash
# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# API
API_URL=http://localhost:3001
API_KEY=...

# Monitoring
SENTRY_DSN=...
POSTHOG_KEY=...
```

**Optional Variables**:
```bash
# Feature Flags
FEATURE_FLAG_DETECTION=true
FEATURE_FLAG_CLUSTERING=false

# Rate Limiting
RATELIMIT_REQUESTS_PER_HOUR=1000

# Cache
CACHE_TTL_SECONDS=3600
```

**Configuration by Environment**:
- `.env.local` - Local development (not committed)
- `.env.example` - Template with all variables
- `.env.production` - Production secrets (GitHub Actions)
- `.env.staging` - Staging secrets (Vercel preview)

---

## Part 6: Deployment Guides

### Local Development with Docker Compose

```yaml
# docker-compose.dev.yml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/snapback
    volumes:
      - .:/app

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/snapback

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=snapback
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=snapback
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Start Environment**:
```bash
docker-compose -f docker-compose.dev.yml up
```

### Vercel Deployment (Web)

**Configuration** (`vercel-web.json`):
```json
{
  "name": "SnapBack Web",
  "framework": "nextjs",
  "buildCommand": "pnpm build --filter=@snapback/web",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "env": [
    {
      "key": "NEXTAUTH_SECRET",
      "value": "@snapback-nextauth-secret"
    },
    {
      "key": "API_URL",
      "value": "https://api.snapback.com"
    }
  ]
}
```

**Deploy**:
```bash
pnpm deploy-web
# Or push to main branch (auto-deploys via GitHub integration)
```

### Fly.io Deployment (API)

**Configuration** (`fly-api.toml`):
```toml
[app]
primary_region = "sjc"

[[services]]
internal_port = 3001
protocol = "tcp"

[env]
DATABASE_URL = "postgresql://..."
NEXTAUTH_SECRET = "..."

[[checks]]
grace_period = "10s"
interval = 30000
timeout = 5000
type = "http"
```

**Deploy**:
```bash
flyctl deploy --config fly-api.toml
```

---

## Part 7: Next.js 16 Specific Configuration

### Caching Strategy

**Layer 1: Turbo Build Cache**
- Managed by: Turbo
- Scope: Package build outputs
- Config: turbo.json
- Invalidation: globalDependencies

**Layer 2: Next.js Data Cache** (NEW in Next.js 16)
- Managed by: 'use cache' directive
- Scope: Server Component data
- Duration: cacheLife directive
- Revalidation: cacheTag API

**Layer 3: Next.js Full Route Cache**
- Managed by: Next.js 16
- Scope: Rendered HTML pages
- Duration: cacheLife('hours')

**Layer 4: Browser Cache**
- Managed by: TanStack Query
- Scope: API responses
- Strategy: staleTime + gcTime

### Incremental Static Regeneration (ISR)

```typescript
// app/dashboard/page.tsx
export const revalidate = 3600; // Regenerate every hour

export default async function Dashboard() {
  const data = await fetchData();
  return <div>{/* dashboard content */}</div>;
}
```

---

## Part 8: Troubleshooting Guide

### Build Failures

**Issue**: `pnpm build` fails with "database package not found"
- **Root Cause**: Dockerfile.dev references non-existent package
- **Fix**: Update line 79 in apps/web/Dockerfile.dev (see P1.1)

**Issue**: Turbo cache not invalidating on next.config.mjs changes
- **Root Cause**: Missing globalDependencies entry
- **Fix**: Add next.config.mjs to turbo.json (see P1.2)

### Docker Issues

**Issue**: Docker dev image builds but dev server doesn't start
- **Check**: CHOKIDAR_USEPOLLING and WATCHPACK_POLLING set correctly
- **Fix**: Ensure environment variables in Dockerfile.dev

**Issue**: Port 3000 already in use
- **Fix**: `lsof -i :3000` to find process, kill with `kill -9 <PID>`

### Monitoring Issues

**Issue**: Prometheus can't scrape metrics
- **Check**: Service is running on correct port
- **Fix**: Verify prometheus.yml scrape_configs point to correct targets

---

## References

- **Docker Docs**: https://docs.docker.com
- **Vercel Docs**: https://vercel.com/docs
- **Fly.io Docs**: https://fly.io/docs
- **Next.js 16 Deployment**: https://nextjs.org/docs/deployment

**Alignment**: Supporting PHASE 3 (MIGRATE) deployment and operations
