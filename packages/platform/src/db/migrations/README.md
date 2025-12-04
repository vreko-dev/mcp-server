# ⚠️ DEPRECATED MIGRATIONS DIRECTORY

This directory contains **legacy migrations** that are no longer used.

## Current Migration Location

All active migrations have been moved to:
```
packages/platform/drizzle/migrations/
```

## Why This Exists

This directory served as the original migration source but has been superseded by Drizzle Kit's official migration system at `drizzle/migrations/`.

## Action Required

These files should **not be used** for new deployments. They are kept for historical reference only.

If you're deploying SnapBack:
1. Use migrations from `packages/platform/drizzle/migrations/`
2. Run via the migrations service in docker-compose.yml/docker-compose.dev.yml
3. Tracking table: `_snapback_migrations`

## See Also

- [Drizzle Config](../drizzle.config.ts) - Authoritative configuration
- [Docker Compose Dev](../../../docker-compose.dev.yml) - Development migrations setup
- [Docker Compose Prod](../../../docker-compose.yml) - Production migrations setup
- [Migration Runner](../../../ops/scripts/run-migrations.sh) - Migration execution script
