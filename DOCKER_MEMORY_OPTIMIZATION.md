# Docker Memory & CPU Optimization Guide

This guide provides configuration recommendations to reduce memory and CPU usage for your PostgreSQL database and Docker services.

## Quick Summary

Your current setup has **room for optimization**:
- PostgreSQL: No explicit memory limits (can consume all available RAM)
- Redis: 256MB max (production), 128MB (dev) - good
- Node services: 512MB limit with 256MB reservation - reasonable
- Monitoring stack: Multiple services without limits (Prometheus, Grafana, Jaeger)

---

## 1. PostgreSQL Optimization (Biggest Impact)

### Problem
PostgreSQL defaults to minimal configuration. On modern systems, it allocates memory aggressively without explicit limits.

### Solution: Update `docker-compose.dev.yml`

```yaml
postgres:
  image: postgres:16-alpine
  # ... existing config ...
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
    PGDATA: /var/lib/postgresql/data/pgdata
    # PostgreSQL Memory Tuning for Development
    POSTGRES_INITDB_ARGS: "-c shared_buffers=128MB -c effective_cache_size=256MB -c maintenance_work_mem=32MB -c work_mem=8MB -c max_connections=50"
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: "0.5"
      reservations:
        memory: 256M
        cpus: "0.25"
```

### Solution: Update `docker-compose.yml` (Production)

```yaml
postgres:
  image: postgres:16-alpine
  # ... existing config ...
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
    PGDATA: /var/lib/postgresql/data/pgdata
    # PostgreSQL Memory Tuning for Production
    POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c effective_cache_size=512MB -c maintenance_work_mem=64MB -c work_mem=16MB -c max_connections=100"
  deploy:
    resources:
      limits:
        memory: 1024M
        cpus: "1"
      reservations:
        memory: 512M
        cpus: "0.5"
```

### Key Parameters Explained

| Parameter | Dev | Prod | Purpose |
|-----------|-----|------|---------|
| `shared_buffers` | 128MB | 256MB | PostgreSQL internal cache (25% of total memory) |
| `effective_cache_size` | 256MB | 512MB | Estimated OS page cache (50% of total memory) |
| `maintenance_work_mem` | 32MB | 64MB | Memory for VACUUM, CREATE INDEX, ALTER TABLE |
| `work_mem` | 8MB | 16MB | Per-operation sort/hash memory (shared_buffers / max_connections) |
| `max_connections` | 50 | 100 | Connection pool limit |

---

## 2. Redis Optimization

Your Redis configuration is already optimized:

**Current (Good):**
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**Optional Fine-tuning for Development:**
```yaml
redis:
  command: redis-server --appendonly no --maxmemory 64mb --maxmemory-policy allkeys-lru --tcp-backlog 511
  deploy:
    resources:
      limits:
        memory: 128M
      reservations:
        memory: 64M
```

**Explanation:**
- `--appendonly no`: Disables persistence in dev (faster, less disk I/O)
- `--maxmemory 64mb`: Reduces from 128MB for lightweight dev
- `--maxmemory-policy allkeys-lru`: Evicts least-used keys when limit reached

---

## 3. Node.js Services Optimization

Your API, Web, and MCP services already have limits. Consider these tweaks:

### For Development (Faster startup, less memory)

```yaml
api:
  environment:
    NODE_OPTIONS: "--max-old-space-size=256"
  deploy:
    resources:
      limits:
        memory: 512M
      reservations:
        memory: 128M  # Reduced from 256M for dev
```

### For Production (Current is good)

Keep existing config:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: "0.5"
    reservations:
      memory: 256M
      cpus: "0.25"
```

---

## 4. Monitoring Stack Optimization (Dev Only)

Your dev compose includes Prometheus, Grafana, and Jaeger **without resource limits**. This can consume significant memory.

### Option A: Remove in Development (Recommended)

Simply comment out or remove these services if you're not actively monitoring:

```yaml
# DISABLED FOR DEVELOPMENT
# prometheus:
# grafana:
# jaeger:
```

### Option B: Add Resource Limits (If keeping for monitoring)

```yaml
prometheus:
  image: prom/prometheus:latest
  # ... existing config ...
  command:
    - "--storage.tsdb.retention.time=24h"  # Reduced from 200h
    - "--query.staleness-delta=5m"
    - "--storage.tsdb.max-block-duration=2h"
  deploy:
    resources:
      limits:
        memory: 256M
      reservations:
        memory: 128M

grafana:
  image: grafana/grafana-enterprise
  # ... existing config ...
  deploy:
    resources:
      limits:
        memory: 256M
      reservations:
        memory: 128M

jaeger:
  image: jaegertracing/all-in-one:latest
  # ... existing config ...
  deploy:
    resources:
      limits:
        memory: 256M
      reservations:
        memory: 128M
```

---

## 5. Create a Development-Only Minimal Compose

For the most efficient local development, create `docker-compose.dev-minimal.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: snapback-postgres
    env_file:
      - .env.docker
      - .env.docker.local
    environment:
      POSTGRES_INITDB_ARGS: "-c shared_buffers=128MB -c effective_cache_size=256MB -c maintenance_work_mem=32MB -c work_mem=8MB -c max_connections=50"
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - snapback
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  redis:
    image: redis:7-alpine
    container_name: snapback-redis
    command: redis-server --appendonly no --maxmemory 64mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks:
      - snapback
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

volumes:
  postgres-data:

networks:
  snapback:
    driver: bridge
```

**Usage:**
```bash
# Use minimal stack (database + cache only)
docker-compose -f docker-compose.dev-minimal.yml up

# Use full stack with monitoring
docker-compose -f docker-compose.dev.yml up
```

---

## 6. Build-Time Optimizations

### Dockerfile optimizations (already implemented in your setup)

Your Dockerfiles are good, but ensure:

1. **Use Alpine images** ✅ (postgres:16-alpine, redis:7-alpine)
2. **Multi-stage builds** ✅ (your Node.js Dockerfile)
3. **Non-root user** ✅ (security + less overhead)
4. **Proper layer caching** ✅ (already optimized)

---

## 7. Runtime Performance Tuning

### PostgreSQL Connection Pooling

For better resource management, consider adding PgBouncer (optional, for production):

```yaml
pgbouncer:
  image: edoburu/pgbouncer:latest
  container_name: snapback-pgbouncer
  environment:
    DATABASES_HOST: postgres
    DATABASES_PORT: 5432
    DATABASES_USER: snapback
    DATABASES_PASSWORD: ${POSTGRES_PASSWORD}
    DATABASES_DBNAME: snapback
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 100
    PGBOUNCER_DEFAULT_POOL_SIZE: 10
  ports:
    - "6432:6432"
  depends_on:
    - postgres
  networks:
    - app-network
```

---

## 8. Monitoring Memory Usage

### Check current usage

```bash
# Docker stats for all containers
docker stats --no-stream

# Specific PostgreSQL stats
docker stats snapback-postgres --no-stream

# PostgreSQL internal memory stats
docker exec snapback-postgres psql -U snapback -d snapback -c "
  SELECT
    sum(heap_blks_read) as heap_blks_read,
    sum(heap_blks_hit) as heap_blks_hit,
    sum(idx_blks_read) as idx_blks_read,
    sum(idx_blks_hit) as idx_blks_hit
  FROM pg_statio_user_tables;
"
```

### Monitor over time with Prometheus

Access Grafana at `http://localhost:3002` (dev setup) and view:
- Container memory usage
- Container CPU usage
- PostgreSQL connections
- PostgreSQL cache hit ratio

---

## 9. Before/After Expected Results

### Before Optimization
- PostgreSQL: 800MB - 2GB (unlimited)
- Redis: 128-256MB (has limits)
- Node services: 200-512MB each
- **Total: 1.5-3.5GB**

### After Optimization (Dev)
- PostgreSQL: 256-512MB (limited & tuned)
- Redis: 64-128MB (limited)
- Node services: 128-256MB each
- Monitoring stack: Disabled or limited
- **Total: 800MB - 1.2GB**

### After Optimization (Prod)
- PostgreSQL: 512-1024MB (limited & tuned)
- Redis: 256MB (has limits)
- Node services: 256-512MB each
- **Total: 1.5-2GB**

---

## 10. Implementation Steps

### Step 1: Update Development Compose
Edit `docker-compose.dev.yml` and add PostgreSQL resource limits and INITDB args

### Step 2: Update Production Compose
Edit `docker-compose.yml` and add PostgreSQL resource limits and INITDB args

### Step 3: Stop and Remove Containers
```bash
docker-compose down -v  # Remove volumes to reset PostgreSQL config
```

### Step 4: Restart with New Configuration
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Step 5: Verify
```bash
docker stats
docker logs snapback-postgres | head -20
```

---

## 11. Advanced Tuning (If Still High)

### PostgreSQL Query Performance
```sql
-- Inside container
docker exec snapback-postgres psql -U snapback -d snapback

-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1000ms
SELECT pg_reload_conf();

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Check for index bloat
```sql
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Vacuum and Analyze
```bash
docker exec snapback-postgres vacuumdb -U snapback -d snapback -v
```

---

## Troubleshooting

### PostgreSQL won't start with new INITDB args
```bash
# Check logs
docker logs snapback-postgres

# Remove and recreate volume
docker-compose down -v
docker-compose up postgres
```

### Services hitting memory limits
```bash
# Check which container is using memory
docker stats

# Increase limits in docker-compose.yml
# deploy.resources.limits.memory: 512M -> 768M
```

### PostgreSQL slow startup
- First start loads config: 20-30 seconds normal
- Subsequent starts: 5-10 seconds
- If still slow, reduce `maintenance_work_mem`

---

## References

- PostgreSQL Memory Tuning: https://wiki.postgresql.org/wiki/Performance_Optimization
- Docker Resource Limits: https://docs.docker.com/config/containers/resource_constraints/
- pg_stat_statements: https://www.postgresql.org/docs/16/pgstatstatements.html
- PgBouncer: https://pgbouncer.github.io/

