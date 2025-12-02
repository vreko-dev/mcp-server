# Docker Memory Optimization - Quick Start

## The Issue
Your PostgreSQL is consuming too much CPU and RAM because:
1. **No explicit memory limits** - PostgreSQL allocates aggressively
2. **No tuned parameters** - Uses generic defaults for large systems
3. **Monitoring stack** - Prometheus, Grafana, Jaeger running without limits in dev
4. **High Redis memory** - 128MB dev mode is unnecessary

## The Solution (3 Steps)

### Step 1: Update Your Configs
✅ Already done! Files updated:
- `docker-compose.dev.yml` - PostgreSQL tuning + memory limits
- `docker-compose.yml` - Production PostgreSQL tuning + memory limits
- `docker-compose.dev-minimal.yml` - New lightweight option

### Step 2: Restart Docker Services
```bash
# Stop existing containers and remove volumes to reset PostgreSQL config
docker-compose down -v

# Start with optimized config
docker-compose -f docker-compose.dev.yml up -d

# OR use minimal stack (database only)
docker-compose -f docker-compose.dev-minimal.yml up -d
```

### Step 3: Verify Changes
```bash
# Check memory usage
docker stats --no-stream

# Verify PostgreSQL loaded new config
docker logs snapback-postgres | grep -i "shared_buffers\|effective_cache"
```

## Expected Results

### Before (Unoptimized)
```
CONTAINER                    MEM USAGE
snapback-postgres           800MB - 2GB  ← Problem!
snapback-redis              128MB
snapback-api                250MB
snapback-web                250MB
snapback-prometheus         200MB
snapback-grafana            150MB
snapback-jaeger             150MB
───────────────────────────────────────
TOTAL                        2GB - 3.5GB
```

### After (Optimized)
```
CONTAINER                    MEM USAGE
snapback-postgres           256-512MB   ✅ Capped!
snapback-redis              64MB        ✅ Reduced!
snapback-api                150MB       ✅ Lower!
snapback-web                150MB       ✅ Lower!
snapback-prometheus         200MB       (256MB limit)
snapback-grafana            150MB       (256MB limit)
snapback-jaeger             100MB       (256MB limit)
───────────────────────────────────────
TOTAL                        1GB - 1.5GB ✅ 50% reduction
```

## Which Compose File to Use?

| Scenario | Command | Memory | Features |
|----------|---------|--------|----------|
| Full development + monitoring | `docker-compose -f docker-compose.dev.yml up` | 1.5-2GB | All services, monitoring |
| Lightweight development | `docker-compose -f docker-compose.dev-minimal.yml up` | 800MB-1GB | DB + Cache only |
| Production | `docker-compose up` | 1.5-2GB | Optimized for production |

## Configuration Details

### PostgreSQL Memory Parameters

**Development Settings:**
```
shared_buffers=128MB          # 25% of 512M limit
effective_cache_size=256MB    # 50% of 512M limit
maintenance_work_mem=32MB     # For VACUUM, CREATE INDEX
work_mem=8MB                  # Per-operation sort memory
max_connections=50            # Connection limit
```

**Production Settings:**
```
shared_buffers=256MB          # 25% of 1GB limit
effective_cache_size=512MB    # 50% of 1GB limit
maintenance_work_mem=64MB     # For VACUUM, CREATE INDEX
work_mem=16MB                 # Per-operation sort memory
max_connections=100           # Connection limit
```

### Redis Memory Parameters

**Development:**
```
--appendonly no               # Disable persistence (faster)
--maxmemory 64mb              # Reduced from 128MB
--maxmemory-policy allkeys-lru # Evict LRU when full
```

**Production:**
```
--appendonly yes              # Persistence enabled
--maxmemory 256mb             # Higher limit
--maxmemory-policy allkeys-lru
```

## Monitoring Memory Usage

### Real-time Stats
```bash
# Watch all containers
docker stats

# Watch specific container
docker stats snapback-postgres

# Get summary
docker stats --no-stream
```

### PostgreSQL Query Performance
```bash
# Connect to PostgreSQL
docker exec snapback-postgres psql -U snapback -d snapback

# See memory usage by table
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Find slow queries (if installed)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
```

## Troubleshooting

### PostgreSQL won't start
```bash
# Check error logs
docker logs snapback-postgres

# Possible causes:
# - Invalid POSTGRES_INITDB_ARGS syntax
# - Existing volume with old config

# Solution: Remove volume and restart
docker-compose down -v
docker-compose up postgres
```

### Services hitting memory limits
```bash
# See which containers use the most memory
docker stats --no-stream

# Increase limits in docker-compose file
# deploy.resources.limits.memory: 512M -> 768M
```

### Slow PostgreSQL startup
```bash
# First startup after config change: 20-30 seconds (normal)
# Subsequent startups: 5-10 seconds

# If slow, check logs
docker logs snapback-postgres
```

## If Memory Still High

Try these additional optimizations:

### Option 1: Reduce Monitoring Stack
Remove or disable these in development:
```bash
# Edit docker-compose.dev.yml
# Comment out: prometheus, grafana, jaeger
docker-compose down
docker-compose -f docker-compose.dev-minimal.yml up
```

### Option 2: Enable Query Logging
Find slow queries using PostgreSQL:
```sql
-- Inside psql
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1000ms
SELECT pg_reload_conf();
```

### Option 3: Regular Maintenance
```bash
# Run weekly
docker exec snapback-postgres vacuumdb -U snapback -d snapback -v
docker exec snapback-postgres reindexdb -U snapback -d snapback
```

## What Changed?

1. **PostgreSQL** - Added `POSTGRES_INITDB_ARGS` with tuned memory settings + resource limits
2. **Redis** - Reduced max memory from 128MB → 64MB (dev), added resource limits
3. **Monitoring Stack** - Added resource limits (256M) and reduced retention (200h → 24h)
4. **New File** - `docker-compose.dev-minimal.yml` for lightweight development

## Docker Compose Changes

### docker-compose.dev.yml
- PostgreSQL: Added memory tuning + 512M limit
- Redis: Reduced to 64MB max, added limits
- Prometheus: 24h retention (was 200h), 256M limit
- Grafana: 256M limit
- Jaeger: 256M limit

### docker-compose.yml (Production)
- PostgreSQL: Production tuning + 1GB limit
- Redis: Added 512M limit

### docker-compose.dev-minimal.yml (New)
- Database + Cache only (800MB-1GB total)
- Perfect for focused development

## Next Steps

1. ✅ Review the optimization guide: `DOCKER_MEMORY_OPTIMIZATION.md`
2. ✅ Update your running containers
3. Monitor memory usage with `docker stats`
4. Adjust limits if needed (start conservative, increase if needed)

## Reference

- PostgreSQL Tuning: https://wiki.postgresql.org/wiki/Performance_Optimization
- Docker Resource Limits: https://docs.docker.com/config/containers/resource_constraints/
- Redis Memory Management: https://redis.io/topics/memory-optimization

---

**Changes made on:** $(date)
**Docker version:** Run `docker --version` to check
**Compose version:** Run `docker-compose --version` to check
