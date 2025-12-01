# Docker Deployment Blockers

**Analysis Date**: 2025-11-14
**Status**: 5 blockers identified (2 critical, 2 high, 1 medium)

---

## BLOCKER-001: Database Migrations Not Automated ⚠️ CRITICAL

**Severity**: 🔴 Critical
**Component**: Database
**Estimated Effort**: 2 hours

### Problem Description

Database migrations are not automatically executed when Docker containers start. This means:
- Fresh deployments will have an empty database schema
- Developers must manually run `pnpm --filter @snapback/platform run db:migrate`
- Production deployments require manual intervention
- High risk of schema drift between environments

### Current State

Migrations exist in `packages/platform/src/db/migrations/`:
```
0001_rls_policies.sql
0002_add_subscription_tier_to_user.sql
0003_create_org_daily_metrics.sql
0004_create_rule_violations.sql
0005_add_signing_secret_to_api_key_metadata.sql
0006_add_referral_code_to_waitlist.sql
0007_session_summary_fields.sql
... and more
```

But they are not executed automatically in Docker.

### Impact

- ❌ Fresh Docker deployments will fail
- ❌ Database schema must be manually synchronized
- ❌ Risk of production incidents from missing migrations
- ❌ Difficult to onboard new developers
- ❌ CI/CD pipelines require manual steps

### Solution

#### Option 1: Add to Dockerfile (Recommended)

Add migration step to the builder stage:

```dockerfile
# In Dockerfile (web) and apps/api/Dockerfile
FROM base AS builder

# ... existing code ...

# Generate Prisma client and run migrations
RUN pnpm --filter @snapback/platform run db:generate
RUN pnpm --filter @snapback/platform run db:migrate  # ADD THIS LINE

# ... rest of build ...
```

**Pros**:
- ✅ Migrations baked into image
- ✅ Guaranteed to run before app starts
- ✅ No external dependencies

**Cons**:
- ⚠️ Requires DATABASE_URL at build time
- ⚠️ Migrations run during build, not at runtime

#### Option 2: Entrypoint Script (Alternative)

Create `docker/entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
pnpm --filter @snapback/platform run db:migrate

echo "Starting application..."
exec "$@"
```

Update Dockerfile:

```dockerfile
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
```

**Pros**:
- ✅ Migrations run at container start
- ✅ Works with runtime DATABASE_URL
- ✅ Can include health checks

**Cons**:
- ⚠️ Requires pnpm and source code in final image
- ⚠️ Slower startup time

#### Option 3: Init Container (Kubernetes)

For Kubernetes deployments, use an init container:

```yaml
initContainers:
  - name: migrate
    image: snapback-web:latest
    command:
      - pnpm
      - --filter
      - @snapback/platform
      - run
      - db:migrate
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: snapback-db
            key: url
```

**Pros**:
- ✅ Separate concern
- ✅ Can retry on failure
- ✅ Kubernetes-native pattern

**Cons**:
- ⚠️ Only works with Kubernetes
- ⚠️ Requires additional container

### Recommended Approach

**Use Option 2 (Entrypoint Script)** for Docker deployments:

1. Create `docker/entrypoint.sh` with migration logic
2. Add to both web and api Dockerfiles
3. Test with `docker-compose up`
4. Verify migrations run successfully before app starts

### Testing

```bash
# Test migration script
docker-compose down -v  # Remove volumes
docker-compose up       # Should auto-migrate

# Verify migrations ran
docker-compose exec postgres psql -U snapback -d snapback -c "\dt postgres.*"
docker-compose exec postgres psql -U snapback -d snapback -c "\dt snapback.*"
```

---

## BLOCKER-002: MCP Server Not in Docker Compose ⚠️ HIGH

**Severity**: 🟡 High
**Component**: MCP Server
**Estimated Effort**: 1 hour

### Problem Description

The MCP server has a Dockerfile (`apps/mcp-server/Dockerfile`) but is not included in `docker-compose.yml`. This means:
- MCP server cannot be deployed with the rest of the stack
- VS Code extension and CLI tools cannot connect to MCP server
- AI-assisted coding features are unavailable in Docker deployments

### Current State

- ✅ Dockerfile exists: `apps/mcp-server/Dockerfile`
- ❌ Not in docker-compose.yml
- ❌ No port allocation (suggest 3002)
- ❌ No environment variables configured

### Impact

- ❌ MCP server must be run separately (not containerized)
- ❌ Cannot use Guardian AI detection in Docker
- ❌ Cannot use claude-code or cursor with Docker stack
- ❌ Missing critical functionality for production

### Solution

Add MCP server service to `docker-compose.yml`:

```yaml
# MCP Server Service
mcp-server:
  build:
    context: .
    dockerfile: apps/mcp-server/Dockerfile
    target: runner
  container_name: snapback-mcp-server
  restart: unless-stopped
  environment:
    NODE_ENV: production
    PORT: 3002
    # Database (if needed for analytics)
    DATABASE_URL: postgresql://${POSTGRES_USER:-snapback}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-snapback}
    # Redis (if needed)
    REDIS_URL: redis://redis:6379
    # Event bus (if needed)
    SNAPBACK_EVENT_BUS_PORT: 6380
  ports:
    - "${MCP_PORT:-3002}:3002"
  networks:
    - app-network
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  healthcheck:
    test:
      [
        "CMD",
        "wget",
        "--no-verbose",
        "--tries=1",
        "--spider",
        "http://localhost:3002/health",
      ]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  security_opt:
    - no-new-privileges:true
  tmpfs:
    - /tmp:noexec,nosuid,size=100m
  deploy:
    resources:
      limits:
        memory: 256M
        cpus: "0.25"
      reservations:
        memory: 128M
        cpus: "0.1"
```

Add to `.env.docker.example`:

```bash
# MCP Server Configuration
MCP_PORT=3002
```

### Testing

```bash
# Test MCP server in Docker
docker-compose up mcp-server

# Verify it's running
curl http://localhost:3002/health
```

---

## BLOCKER-003: better-sqlite3 Native Dependency ⚠️ HIGH

**Severity**: 🟡 High
**Component**: MCP Server
**Estimated Effort**: 2 hours

### Problem Description

The MCP server uses `better-sqlite3`, which is a native Node.js module that must be compiled for the target operating system. The current Dockerfile uses Alpine Linux, which requires rebuilding native modules.

### Current State

- ❌ `better-sqlite3` compiled for macOS/Linux
- ❌ Will fail to load in Alpine Docker container
- ❌ No rebuild step in Dockerfile

### Impact

- ❌ MCP server will crash on startup with "Module not found" error
- ❌ Cannot use SQLite storage in Docker
- ❌ Must rebuild for Alpine or use alternative storage

### Error Message

```
Error: Cannot find module '/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
```

### Solution

#### Option 1: Rebuild in Dockerfile (Recommended)

Update `apps/mcp-server/Dockerfile`:

```dockerfile
FROM base AS deps

# Add build tools for native dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY packages/*/package.json ./packages/*/

# Install dependencies with frozen lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Rebuild native modules for Alpine
RUN pnpm rebuild better-sqlite3

# ... rest of Dockerfile ...
```

#### Option 2: Use MemoryStorage Instead

If SQLite is not critical for MCP server in Docker:

```typescript
// In apps/mcp-server/src/index.ts
import { MemoryStorage } from '@snapback/sdk';

// Instead of LocalStorage
const storage = new MemoryStorage();
```

**Pros**:
- ✅ No native dependencies
- ✅ Faster startup

**Cons**:
- ⚠️ Data lost on container restart
- ⚠️ Not suitable for persistence

#### Option 3: Use PostgreSQL Storage

Create a PostgreSQL-backed storage adapter:

```typescript
// Use database instead of SQLite
import { db } from '@snapback/platform';

// Store data in PostgreSQL instead
```

**Pros**:
- ✅ Persistent storage
- ✅ No native dependencies
- ✅ Shared with other services

**Cons**:
- ⚠️ Requires implementation
- ⚠️ More complex

### Recommended Approach

**Use Option 1** (Rebuild in Dockerfile) for production:

1. Add build tools to Dockerfile
2. Rebuild better-sqlite3 after pnpm install
3. Test in Docker container
4. Consider PostgreSQL storage for future

### Testing

```bash
# Build MCP server Docker image
docker build -f apps/mcp-server/Dockerfile -t snapback-mcp .

# Test better-sqlite3 loads
docker run --rm snapback-mcp node -e "require('better-sqlite3')"

# Should output nothing (success)
# If error, rebuild didn't work
```

---

## BLOCKER-004: No Environment Variable Validation ⚠️ MEDIUM

**Severity**: 🟡 Medium
**Component**: All services
**Estimated Effort**: 3 hours

### Problem Description

Services start without validating that required environment variables are set. This leads to:
- Silent failures (app starts but doesn't work)
- Cryptic error messages
- Difficult debugging
- Production incidents

### Current State

- ❌ No validation on startup
- ❌ No clear error messages for missing vars
- ❌ Apps may start in broken state

### Impact

- ⚠️ Difficult to debug configuration issues
- ⚠️ Risk of partial deployment (some services work, others don't)
- ⚠️ Poor developer experience
- ⚠️ Production downtime from misconfigurations

### Solution

Create `docker/validate-env.sh`:

```bash
#!/bin/sh
set -e

echo "Validating required environment variables..."

# Function to check if var is set
check_var() {
  var_name=$1
  var_value=$(eval echo \$$var_name)

  if [ -z "$var_value" ]; then
    echo "ERROR: Required environment variable $var_name is not set"
    exit 1
  else
    echo "✓ $var_name is set"
  fi
}

# Check required variables based on service
case "${SERVICE_NAME}" in
  "web")
    check_var "DATABASE_URL"
    check_var "BETTER_AUTH_SECRET"
    check_var "BETTER_AUTH_URL"
    ;;
  "api")
    check_var "DATABASE_URL"
    check_var "BETTER_AUTH_SECRET"
    check_var "REDIS_URL"
    ;;
  "mcp-server")
    # MCP server optional vars only
    echo "✓ MCP server has no required env vars"
    ;;
  *)
    echo "Unknown service: ${SERVICE_NAME}"
    exit 1
    ;;
esac

echo "✓ All required environment variables are set"
```

Update entrypoint script:

```bash
#!/bin/sh
set -e

# Validate environment
/app/docker/validate-env.sh

# Run migrations
echo "Running database migrations..."
pnpm --filter @snapback/platform run db:migrate

# Start service
echo "Starting ${SERVICE_NAME}..."
exec "$@"
```

Add to Dockerfile:

```dockerfile
COPY docker/validate-env.sh /app/docker/validate-env.sh
RUN chmod +x /app/docker/validate-env.sh

ENV SERVICE_NAME=web
```

### Testing

```bash
# Test with missing env var
docker-compose up web
# Should fail with clear error message

# Test with all vars set
docker-compose --env-file .env.docker up web
# Should succeed
```

---

## BLOCKER-005: NGINX Configuration Incomplete ⚠️ MEDIUM

**Severity**: 🟡 Medium
**Component**: Reverse Proxy
**Estimated Effort**: 4 hours

### Problem Description

`docker-compose.nginx.yml` exists but is incomplete. Missing:
- SSL/TLS configuration
- Rate limiting
- Gzip compression
- Static file caching
- Security headers
- WebSocket support

### Current State

- ⚠️ Basic NGINX file exists
- ❌ No SSL configuration
- ❌ No rate limiting
- ❌ No caching rules

### Impact

- ⚠️ Cannot deploy securely to production
- ⚠️ No HTTPS support
- ⚠️ Vulnerable to rate limit attacks
- ⚠️ Poor performance (no caching)

### Solution

Create complete `docker/nginx/nginx.conf`:

```nginx
# Full configuration provided in separate file
# See docker/nginx/nginx.conf in solution
```

Features to add:
1. ✅ SSL/TLS with Let's Encrypt
2. ✅ Rate limiting (10 req/sec per IP)
3. ✅ Gzip compression
4. ✅ Static file caching (1 year)
5. ✅ Security headers (HSTS, CSP, etc.)
6. ✅ WebSocket support for real-time features
7. ✅ Health check endpoints
8. ✅ Access logging

### Recommended Approach

1. Complete NGINX configuration
2. Add Certbot for SSL automation
3. Test rate limiting
4. Verify caching works
5. Security header validation

### Testing

```bash
# Start with NGINX
docker-compose -f docker-compose.yml -f docker-compose.nginx.yml up

# Test HTTPS
curl -k https://localhost

# Test rate limiting
ab -n 100 -c 10 http://localhost/

# Verify headers
curl -I https://localhost
```

---

## Summary

| Blocker | Severity | Effort | Priority |
|---------|----------|--------|----------|
| BLOCKER-001: Migrations | 🔴 Critical | 2h | P0 |
| BLOCKER-002: MCP Server | 🟡 High | 1h | P0 |
| BLOCKER-003: better-sqlite3 | 🟡 High | 2h | P1 |
| BLOCKER-004: Env Validation | 🟡 Medium | 3h | P1 |
| BLOCKER-005: NGINX Config | 🟡 Medium | 4h | P2 |

**Total Estimated Effort**: 12 hours (~1.5 days)

**Recommended Order**:
1. BLOCKER-001 (migrations) - Blocks everything
2. BLOCKER-002 (MCP server) - Quick win
3. BLOCKER-003 (better-sqlite3) - Enables MCP server
4. BLOCKER-004 (env validation) - Improves DX
5. BLOCKER-005 (NGINX) - Production hardening

---

**Next Steps**: Resolve blockers in order, test each thoroughly, then proceed to production hardening.
