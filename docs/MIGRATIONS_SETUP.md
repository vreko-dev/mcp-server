# Database Migrations Setup & Verification

**Last Updated**: 2025-12-04
**Status**: ✅ Production-Ready

## Overview

This document describes the complete database migration system for SnapBack, including:
- Migration file organization
- Execution flow (development vs production)
- Verification procedures
- Troubleshooting guide

## Migration Files

All migrations are located in:
```
packages/platform/drizzle/migrations/
```

### Current Migrations (6 files)

| File | Purpose | Size |
|------|---------|------|
| `0001_wild_psynapse.sql` | Core schema (tables, indexes, constraints) | 34.8KB |
| `0002_better_auth.sql` | Authentication tables (Better Auth) | 3.6KB |
| `0003_supabase_extensions.sql` | PostgreSQL extensions (uuid-ossp, citext, pg_trgm, btree_gin) | 6.7KB |
| `0005_auth_security_rls_audit.sql` | RLS policies, audit logging, security | 9.5KB |
| `0006_telemetry_daily_metrics.sql` | Analytics and metrics tables | 1.4KB |
| Additional files | Utility migrations | ~8KB |

**Total**: ~63.5KB of migration SQL

## Execution Flow

### Development Environment

```
docker-compose -f docker-compose.dev.yml up
    ↓
1. postgres service starts
   └─ Health check: pg_isready
   └─ Status: Ready when TCP port 5432 responds
   ↓
2. migrations service starts (waits for postgres healthy)
   └─ Runs: ops/scripts/run-migrations.sh
   └─ Creates: _snapback_migrations tracking table
   └─ Applies: Each migration in sorted order
   └─ Tracking: Records applied migrations to prevent re-runs
   ↓
3. api service starts (waits for migrations completed)
   └─ Database schema is now ready
   └─ Runs entrypoint: apps/api/docker-entrypoint.sh
   └─ Additional check: db:push (no-op if migrations applied)
   ↓
4. web/docs/mcp services start
   └─ All connect to postgres with full schema
```

### Production Environment

```
docker-compose up
    ↓
1. postgres service starts
   └─ Health check: pg_isready
   └─ Status: Ready when TCP port 5432 responds
   ↓
2. migrations service starts (NEW - added in fix)
   └─ Same as development
   ↓
3. api/web/mcp services wait for migrations
   └─ Dependencies configured in docker-compose.yml
   └─ api: depends_on migrations (service_completed_successfully)
   └─ web: depends_on api, postgres, redis
```

## Configuration Files

### Drizzle Config (Authoritative)

**Location**: `packages/platform/drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/snapback/*.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
```

**Key Points**:
- Schema location: `packages/platform/src/db/schema/snapback/`
- Output location: `packages/platform/drizzle/migrations/`
- Reads DATABASE_URL from environment

### Migration Runner Script

**Location**: `ops/scripts/run-migrations.sh`

**Features**:
- Waits for PostgreSQL readiness (30-second timeout)
- Creates migration tracking table (`_snapback_migrations`)
- Applies migrations in sorted order
- Idempotent: skips already-applied migrations
- Exit codes: 0 (success), 1 (failure)

**Usage**:
```bash
# Inside container
sh /run-migrations.sh

# From host (requires docker network)
docker-compose exec postgres sh /run-migrations.sh
```

### Docker Entrypoint (API Service)

**Location**: `apps/api/docker-entrypoint.sh`

**Flow**:
1. Waits for database (pg_isready)
2. Runs `pnpm --filter @snapback/platform run db:push`
3. Verifies schema exists
4. Starts Node.js application

**Note**: This is a secondary check; migrations service runs first

## Verification Procedures

### 1. Check Migration Files Exist

```bash
# List all migrations
ls -la packages/platform/drizzle/migrations/ | grep -E "\.sql$"

# Verify 6 main migrations present
ls packages/platform/drizzle/migrations/*.sql | wc -l
# Should output: 6 or more
```

### 2. Verify Development Setup

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Check migrations service completed
docker-compose -f docker-compose.dev.yml ps migrations
# Status should be: Exit 0

# Check logs
docker-compose -f docker-compose.dev.yml logs migrations | tail -20
```

### 3. Verify Migration Tracking

```bash
# Access database
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U snapback -d snapback

# Check migration tracking table
SELECT filename, applied_at FROM _snapback_migrations ORDER BY applied_at;

# Should show all 6 migrations applied
```

### 4. Verify Schema Created

```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U snapback -d snapback

# List all tables
\dt

# Verify key tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

# Expected tables:
# - user (Better Auth)
# - session (Better Auth)
# - account (Better Auth)
# - verification (Better Auth)
# - user_daily_metrics
# - audit_logs
# + others from main schema
```

### 5. Verify Extensions Created

```bash
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U snapback -d snapback -c "\dx"

# Should show these extensions:
# - uuid-ossp
# - citext
# - pg_trgm
# - btree_gin
```

### 6. Test Production Migration

```bash
# Prepare environment
export POSTGRES_DB=snapback
export POSTGRES_USER=snapback
export POSTGRES_PASSWORD=your_password

# Start production compose
docker-compose up -d postgres migrations

# Wait for migrations to complete
docker-compose ps migrations
# Status: Exit 0

# Verify logs
docker-compose logs migrations | tail -30

# Check schema on production database
docker-compose exec postgres \
  psql -U snapback -d snapback -c "\dt"
```

## Environment Variables

### Required

```bash
# Database credentials
POSTGRES_DB=snapback
POSTGRES_USER=snapback
POSTGRES_PASSWORD=your_secure_password

# Connection string (auto-generated but can be overridden)
DATABASE_URL=postgresql://snapback:password@postgres:5432/snapback
```

### Optional

```bash
# Database SSL settings (for cloud databases)
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false

# Specific environment configs
DEV_DATABASE_URL=postgresql://...
STAGING_DATABASE_URL=postgresql://...
PROD_DATABASE_URL=postgresql://...
```

## Troubleshooting

### Issue: Migrations Not Running

**Symptom**: Services start but tables don't exist

**Diagnosis**:
```bash
# Check migrations service status
docker-compose ps migrations

# Check logs
docker-compose logs migrations

# Verify migration files exist
ls packages/platform/drizzle/migrations/*.sql
```

**Solution**:
```bash
# Recreate from scratch
docker-compose down -v
docker-compose up -d

# Or manually trigger
docker-compose exec postgres sh /run-migrations.sh
```

### Issue: Migration Tracking Table Error

**Symptom**: `Error: relation "_snapback_migrations" does not exist`

**Cause**: Migration script failed before creating tracking table

**Solution**:
```bash
# Create table manually
docker-compose exec postgres psql -U snapback -d snapback -c \
  "CREATE TABLE IF NOT EXISTS _snapback_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  );"

# Re-run migrations
docker-compose exec postgres sh /run-migrations.sh
```

### Issue: Database Connection Failed

**Symptom**: `psql: error: could not connect to server`

**Diagnosis**:
```bash
# Check postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres | tail -20

# Test connection manually
docker-compose exec postgres pg_isready -U snapback -d snapback
```

**Solution**:
```bash
# Ensure postgres is healthy
docker-compose up -d postgres
sleep 10

# Check health
docker-compose exec postgres pg_isready
```

### Issue: Permission Denied Error

**Symptom**: `ERROR: permission denied for schema public`

**Cause**: User permissions not set correctly

**Solution**:
```bash
# Reset permissions
docker-compose exec postgres psql -U postgres -d snapback -c \
  "GRANT ALL PRIVILEGES ON SCHEMA public TO snapback;"

# Reconnect
docker-compose exec postgres psql -U snapback -d snapback -c "SELECT 1;"
```

### Issue: Duplicate Key Violation

**Symptom**: `ERROR: duplicate key value violates unique constraint`

**Cause**: Migration previously applied, but not tracked

**Solution**:
```bash
# Check what's been applied
docker-compose exec postgres psql -U snapback -d snapback \
  -c "SELECT filename FROM _snapback_migrations ORDER BY applied_at;"

# Add missing entry if needed
docker-compose exec postgres psql -U snapback -d snapback -c \
  "INSERT INTO _snapback_migrations (filename) VALUES ('0001_wild_psynapse.sql');"
```

## Migration Generation

### Generate New Migrations

When schema files change, generate new migrations:

```bash
# From packages/platform
pnpm run db:generate

# New migration files appear in drizzle/migrations/
ls drizzle/migrations/*.sql | sort
```

### Apply Generated Migrations

```bash
# Development: automatic via migrations service
docker-compose -f docker-compose.dev.yml up

# Production: automatic via migrations service
docker-compose up

# Manual trigger
docker-compose exec postgres sh /run-migrations.sh
```

## Best Practices

1. **Version Control**: Commit all migration files to git
2. **Idempotency**: Never modify applied migrations; create new ones
3. **Testing**: Test migrations in dev before production
4. **Backups**: Always backup database before major deployments
5. **Tracking**: Verify `_snapback_migrations` table for applied migrations
6. **Order**: Migrations run in alphabetical order; name accordingly
7. **Isolation**: Run migrations in dedicated service, not in app container

## Related Documentation

- [Docker Deployment Guide](./DOCKER_DEPLOYMENT_GUIDE.md)
- [API Environment Config](../apps/api/ENVIRONMENT_CONFIG.md)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For migration issues:
1. Check logs: `docker-compose logs migrations`
2. Verify files: `ls packages/platform/drizzle/migrations/`
3. Check schema: Connect to database and query tables
4. See Troubleshooting section above
