# Implementation Specification: Database & Service Consolidation
**Document Version:** 1.0
**Date:** 2025-12-22
**Owner:** Database Architecture Team
**Status:** Ready for Implementation

---

## Executive Summary

This spec outlines the implementation of database migrations and service consolidations identified in the Service-to-DB Table Mapping audit. Work is organized into 4 phases with clear success criteria and rollback procedures.

**Total Effort:** ~3-4 weeks
**Risk Level:** MEDIUM (data migrations + schema changes)
**Deployments Required:** 4 (one per phase)

---

## Phase 1: Critical Path Migrations (WEEK 1) ✅ IMPLEMENTED

> **Status:** Migration files created on 2025-12-22
> **Files Created:**
> - `packages/platform/src/db/0012_intelligence_layer_and_pioneer.sql`
> - `packages/platform/src/db/0013_time_series_and_partial_indexes.sql`
> - `packages/platform/src/db/0014_formalize_partitioning.sql`
> - `packages/platform/src/db/0015_retention_automation.sql`

### Objective
Create missing migrations for tables actively used by services (MCP, Pioneer, Trust Calibration).

### 1.1 Create Migration: 0012_intelligence_layer_and_pioneer.sql

**File:** `packages/platform/drizzle/migrations/0012_intelligence_layer_and_pioneer.sql`

**Content:** See end of this document in "Migration Scripts" section

**Tables Created:**
- `pioneers` - Pioneer program user profiles
- `pioneer_actions` - Pioneer point transactions
- `pioneer_tier_history` - Tier progression tracking
- `mcp_sessions` - MCP development session metadata
- `mcp_aggregated_learnings` - Cross-workspace pattern aggregation
- `mcp_activity_events` - MCP activity metrics
- `trust_scores` - EWMA-based AI tool confidence
- `predictions` - ML prediction tracking with ground truth

**Enums Created:**
- `pioneer_tier` (seedling, grower, cultivator, guardian)
- `leaderboard_visibility` (public, anonymous, hidden)
- `pioneer_action_type` (8 action types)

**Indexes:** 15 total (see migration script)

**Execution:**
```bash
# Generate from schema (preferred)
pnpm drizzle-kit generate:sqlite

# OR apply manual migration
psql $DATABASE_URL < packages/platform/drizzle/migrations/0012_intelligence_layer_and_pioneer.sql
```

**Verification:**
```bash
# Check tables created
psql $DATABASE_URL -c "\dt pioneers, pioneer_*, mcp_*, trust_scores, predictions"

# Check column counts match schema
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'pioneers' ORDER BY ordinal_position;" | wc -l
# Expected: 13 columns
```

**Rollback:**
```sql
DROP TABLE IF EXISTS mcp_activity_events CASCADE;
DROP TABLE IF EXISTS mcp_aggregated_learnings CASCADE;
DROP TABLE IF EXISTS mcp_sessions CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS trust_scores CASCADE;
DROP TABLE IF EXISTS pioneer_tier_history CASCADE;
DROP TABLE IF EXISTS pioneer_actions CASCADE;
DROP TABLE IF EXISTS pioneers CASCADE;
DROP TYPE IF EXISTS pioneer_action_type;
DROP TYPE IF EXISTS leaderboard_visibility;
DROP TYPE IF EXISTS pioneer_tier;
```

---

### 1.2 Verify Service Compatibility

**Services Affected:**
- [MCPService](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/api/src/services/mcp.ts) ← Uses mcp_sessions
- [PioneerService](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/api/src/services/pioneer-service.ts) ← Uses pioneers, pioneer_actions
- [TrustCalibrationService](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/api/src/services/trust-calibration.ts) ← Uses trust_scores, predictions

**Verification Steps:**

1. **Compile TypeScript:**
```bash
pnpm type-check --filter="@snapback/platform"
pnpm type-check --filter="@snapback/core"
```

2. **Run Service Tests:**
```bash
pnpm test --filter="@snapback/platform" -- trust-scores.test.ts
pnpm test --filter="apps/api" -- mcp.test.ts
pnpm test --filter="apps/api" -- pioneer-service.test.ts
```

3. **Insert Test Data:**
```sql
INSERT INTO pioneers (id, user_id, username, github_id, tier, total_points, referral_code)
VALUES ('test-pioneer-1', 'test-user-1', 'testuser', '12345', 'seedling', 0, 'TESTUSER_ABC123');

INSERT INTO mcp_sessions (id, user_id, workspace_id, started_at)
VALUES (gen_random_uuid(), 'test-user-1', 'workspace-hash', NOW());

INSERT INTO trust_scores (id, user_id, tool_id, context_key, score, model_version)
VALUES ('test-ts-1', 'test-user-1', 'cursor_0.42', 'react_typescript', 0.750, 'v1');
```

4. **Verify Service Queries Execute:**
```bash
# Test MCPService
curl -X POST http://localhost:3000/api/mcp/create-session \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"workspaceId": "test-workspace"}'

# Test PioneerService
curl -X GET http://localhost:3000/api/pioneer/profile \
  -H "Authorization: Bearer $TEST_TOKEN"

# Test TrustCalibrationService
curl -X GET http://localhost:3000/api/trust/scores \
  -H "Authorization: Bearer $TEST_TOKEN"
```

**Success Criteria:**
- ✅ All 8 tables exist in database
- ✅ All foreign keys resolve correctly
- ✅ All indexes are present
- ✅ TypeScript compilation passes (0 errors)
- ✅ Service tests pass (all 3 services)
- ✅ Test data inserts succeed
- ✅ API endpoints respond with correct data

**Timeline:** 2-3 hours

---

## Phase 2: Performance Optimization Indexes (WEEK 1-2) ✅ IMPLEMENTED

### Objective
Add high-impact indexes following 2025 sustainable design patterns.

### 2.1 Create Migration: 0013_time_series_and_partial_indexes.sql

**File:** `packages/platform/drizzle/migrations/0013_time_series_and_partial_indexes.sql`

**Changes:**

1. **BRIN Indexes for Time-Series (Replace B-tree)**
   - `telemetry_events.timestamp` → BRIN (80% space savings)
   - `feature_usage.created_at` → BRIN
   - `error_logs.created_at` → BRIN

2. **Partial Indexes for Soft Deletes**
   - `subscriptions(user_id)` WHERE status = 'active'
   - `device_trials(device_fingerprint)` WHERE blocked_until IS NULL

3. **JSONB GIN Indexes**
   - `snapshots.metadata` → GIN (for metadata field queries)
   - `telemetry_events.properties` → GIN

4. **Composite Indexes**
   - `(user_id, created_at DESC)` for recent-first queries
   - Applied to: `telemetry_events`, `feature_usage`, `error_logs`, `api_usage_logs`

**Execution:**
```bash
psql $DATABASE_URL < packages/platform/drizzle/migrations/0013_time_series_and_partial_indexes.sql
```

**Verification:**
```bash
# List all indexes on telemetry_events
psql $DATABASE_URL -c "\di+ *telemetry*"

# Check BRIN index exists
psql $DATABASE_URL -c "SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE '%brin%';"
```

**Performance Testing:**

Before:
```sql
EXPLAIN ANALYZE SELECT COUNT(*) FROM telemetry_events
WHERE timestamp > NOW() - INTERVAL '7 days';
-- Expected: Full table scan, ~1000ms
```

After:
```sql
EXPLAIN ANALYZE SELECT COUNT(*) FROM telemetry_events
WHERE timestamp > NOW() - INTERVAL '7 days';
-- Expected: Index scan, ~50ms (20x faster)
```

**Success Criteria:**
- ✅ 12 new indexes created
- ✅ Time-range queries 10-20x faster
- ✅ Active-only queries 60% faster (soft delete pattern)
- ✅ No table locks during index creation (CONCURRENTLY used)
- ✅ Query plans use new indexes

**Timeline:** 4-5 hours

**Rollback:**
```bash
# Indexes can be dropped safely
psql $DATABASE_URL -c "DROP INDEX IF EXISTS telemetry_events_timestamp_brin_idx CASCADE;"
# Repeat for all 12 indexes
```

---

## Phase 3: Table Partitioning Formalization (WEEK 2) ✅ IMPLEMENTED

### Objective
Convert ad-hoc partitions to native PostgreSQL partitioning with pg_partman automation.

### 3.1 Create Migration: 0014_formalize_partitioning.sql

**Tables to Partition:**
- `api_usage_logs` (monthly by created_at)
- `telemetry_events` (monthly by timestamp)
- `feature_usage` (monthly by created_at)
- `error_logs` (monthly by created_at)

**Current State:**
```
api_usage_logs
├── api_usage_logs (parent, empty)
├── api_usage_logs_2025_10 (manual)
├── api_usage_logs_2025_11 (manual)
└── [no automation]
```

**Desired State (Native Partitioning):**
```
api_usage_logs (RANGE partitioned on created_at)
├── api_usage_logs_202501
├── api_usage_logs_202502
├── api_usage_logs_202503
└── [auto-created by pg_partman]
```

**Migration Steps:**

1. **Enable pg_partman Extension**
```sql
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

2. **Migrate api_usage_logs**
```sql
-- Create new partitioned table
CREATE TABLE api_usage_logs_new (
  LIKE api_usage_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Migrate data (in batches to avoid locks)
INSERT INTO api_usage_logs_new SELECT * FROM api_usage_logs;

-- Rename
ALTER TABLE api_usage_logs RENAME TO api_usage_logs_old;
ALTER TABLE api_usage_logs_new RENAME TO api_usage_logs;

-- Setup pg_partman
SELECT partman.create_parent(
  'public.api_usage_logs',
  'created_at',
  'native',
  'monthly'
);

-- Drop old table
DROP TABLE api_usage_logs_old;
```

3. **Schedule pg_cron Maintenance**
```sql
-- Create maintenance job
SELECT cron.schedule(
  'partman_api_usage_logs_maintenance',
  '0 1 * * *',  -- Daily at 1 AM
  'SELECT partman.run_maintenance(p_parent_table => ''public.api_usage_logs'')'
);
```

**Verification:**
```bash
# Check partitions exist
psql $DATABASE_URL -c "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE 'api_usage_logs_%' ORDER BY tablename;"

# Verify partition function works
psql $DATABASE_URL -c "SELECT partman.show_partitions('public.api_usage_logs');"
```

**Success Criteria:**
- ✅ 4 tables partitioned natively
- ✅ pg_cron job scheduled (4 jobs)
- ✅ Data migrated with zero downtime
- ✅ Auto-partition creation working
- ✅ Query performance maintained

**Timeline:** 6-8 hours (staggered over 2 days due to data migration size)

**Rollback:**
```sql
-- Disable partman maintenance
SELECT partman.undo_partition('public.api_usage_logs');

-- Restore old tables if needed
-- This is a non-trivial operation - requires backup strategy
```

---

## Phase 4: Data Retention & Cleanup Automation (WEEK 2-3) ✅ IMPLEMENTED

### Objective
Implement automated data retention policies and cleanup jobs.

### 4.1 Create Migration: 0015_retention_automation.sql

**Retention Policies (from retention_config):**

| Table | Retention | Action |
|-------|-----------|--------|
| `telemetry_events` | 90 days | DELETE |
| `error_logs` | 180 days | DELETE |
| `api_usage_logs` | 365 days | ARCHIVE* |
| `feature_usage` | 180 days | DELETE |
| `analysis_events` | 365 days | ARCHIVE* |

*Archive = Move to separate cold storage table

**Migration:**

1. **Update retention_config table**
```sql
INSERT INTO retention_config (id, table_name, retention_days, is_enabled) VALUES
  (gen_random_uuid(), 'telemetry_events', 90, true),
  (gen_random_uuid(), 'error_logs', 180, true),
  (gen_random_uuid(), 'api_usage_logs', 365, true),
  (gen_random_uuid(), 'feature_usage', 180, true),
  (gen_random_uuid(), 'analysis_events', 365, true);
```

2. **Create Archive Tables** (for long-term audit)
```sql
CREATE TABLE telemetry_events_archive AS
  SELECT * FROM telemetry_events WHERE 1=0;

CREATE TABLE error_logs_archive AS
  SELECT * FROM error_logs WHERE 1=0;

-- Add indexes
CREATE INDEX telemetry_events_archive_user_idx
  ON telemetry_events_archive(user_id);
```

3. **Schedule Cleanup Jobs**
```sql
-- Delete old telemetry (90 days)
SELECT cron.schedule(
  'cleanup_telemetry_events',
  '0 3 * * *',  -- Daily at 3 AM
  $$DELETE FROM telemetry_events WHERE timestamp < NOW() - INTERVAL '90 days'$$
);

-- Delete old error logs (180 days)
SELECT cron.schedule(
  'cleanup_error_logs',
  '0 4 * * *',  -- Daily at 4 AM
  $$DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '180 days'$$
);

-- Archive old API usage logs (365 days → archive, then delete)
SELECT cron.schedule(
  'archive_api_usage_logs',
  '0 2 * * *',  -- Daily at 2 AM
  $$
  INSERT INTO api_usage_logs_archive
    SELECT * FROM api_usage_logs
    WHERE created_at < NOW() - INTERVAL '365 days';
  DELETE FROM api_usage_logs
    WHERE created_at < NOW() - INTERVAL '365 days';
  $$
);
```

4. **Monitor Job Execution**
```sql
-- View job history
SELECT jobid, jobname, schedule, last_run_time, last_run_success
FROM cron.job
WHERE jobname LIKE 'cleanup_%' OR jobname LIKE 'archive_%';
```

**Verification:**
```bash
# Check retention_config is populated
psql $DATABASE_URL -c "SELECT * FROM retention_config WHERE is_enabled = true;"

# Check cron jobs scheduled
psql $DATABASE_URL -c "SELECT jobid, jobname, schedule FROM cron.job ORDER BY jobid;"

# Verify archive tables exist
psql $DATABASE_URL -c "\dt *archive"
```

**Success Criteria:**
- ✅ retention_config populated (5 policies)
- ✅ 3 cron jobs scheduled
- ✅ Archive tables created
- ✅ Test run executed successfully
- ✅ Job monitoring in place

**Timeline:** 3-4 hours

---

## Phase 4b (Future): pgvector Extension & Semantic Search

**Status:** DEFERRED (not blocking anything)
**Trigger:** When patterns table is actively used

**Work:**
- Enable pgvector extension
- Create vector column on patterns table
- Create ivfflat index for similarity search
- Implement semantic pattern matching service

---

## Implementation Order & Timeline

### CRITICAL PATH (Must do before next release)
```
Week 1:
├─ Phase 1: Create 0012_intelligence_layer_and_pioneer.sql (4 hours)
├─ Phase 1: Verify service compatibility (2-3 hours)
└─ Phase 2: Create 0013_time_series_and_partial_indexes.sql (4-5 hours)

Week 2:
├─ Phase 3: Create 0014_formalize_partitioning.sql (6-8 hours, spread over 2 days)
└─ Phase 4: Create 0015_retention_automation.sql (3-4 hours)

Week 3:
└─ Integration testing, performance validation, production deployment
```

### OPTIONAL (Nice-to-have, can defer)
```
Phase 4b: pgvector & semantic search (Weeks 4-5)
```

---

## Pre-Implementation Checklist

- [ ] **Database Backup:** Full pg_dump backup before Phase 1
```bash
pg_dump $DATABASE_URL > /backups/snapback_$(date +%Y%m%d_%H%M%S).sql
```

- [ ] **Maintenance Window:** Schedule 4-hour maintenance window for Phase 3
- [ ] **Communication:** Notify users of potential API unavailability
- [ ] **Rollback Plan:** Test rollback procedures for each migration
- [ ] **Monitoring:** Set up alerts for index creation / partition maintenance
- [ ] **Code Review:** Review migrations and services before merge
- [ ] **TypeScript:** Verify all types compile correctly
- [ ] **Tests:** Run full test suite for affected modules

---

## Post-Implementation Verification

### For Each Phase:

1. **Schema Verification**
```bash
# Phase 1: Check all 8 tables exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name IN ('pioneers', 'mcp_sessions', 'trust_scores', 'predictions');"

# Phase 2: Check indexes exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE '%brin%';"

# Phase 3: Check partitions
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name LIKE 'api_usage_logs_%';"

# Phase 4: Check cron jobs
psql $DATABASE_URL -c "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE 'cleanup_%';"
```

2. **Performance Verification**
```bash
# Before/after query performance
EXPLAIN ANALYZE SELECT COUNT(*) FROM telemetry_events
  WHERE timestamp > NOW() - INTERVAL '7 days' AND user_id = 'test-user';

# Expected improvement: 10-20x faster (from full scan to index scan)
```

3. **Service Integration Testing**
```bash
pnpm test --filter="apps/api" -- --run

# Expected: All tests pass, no new failures
```

4. **API Smoke Tests**
```bash
# Test each affected endpoint
curl -X GET http://localhost:3000/api/pioneer/profile -H "Authorization: Bearer $TOKEN"
curl -X GET http://localhost:3000/api/mcp/sessions -H "Authorization: Bearer $TOKEN"
curl -X GET http://localhost:3000/api/trust/scores -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK responses with data
```

---

## Migration Scripts

### COMPLETE: 0012_intelligence_layer_and_pioneer.sql

```sql
-- Migration: 0012_intelligence_layer_and_pioneer.sql
-- Created: 2025-12-22
-- Description: Add Phase 4 Intelligence Layer and Pioneer Program tables
-- This migration addresses 3 CRITICAL gaps in the schema that are actively used by services

-- ============================================================================
-- PIONEER PROGRAM ENUMS & TABLES
-- ============================================================================

CREATE TYPE "public"."pioneer_tier" AS ENUM('seedling', 'grower', 'cultivator', 'guardian');
CREATE TYPE "public"."leaderboard_visibility" AS ENUM('public', 'anonymous', 'hidden');
CREATE TYPE "public"."pioneer_action_type" AS ENUM(
  'github_star',
  'discord_join',
  'referral_direct',
  'referral_bonus',
  'feedback',
  'bug_report',
  'tutorial_complete',
  'waitlist_early'
);

CREATE TABLE "pioneers" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "username" text NOT NULL,
  "github_id" text NOT NULL,
  "contact_email" text,
  "tier" "pioneer_tier" NOT NULL DEFAULT 'seedling',
  "total_points" integer NOT NULL DEFAULT 0,
  "joined_at" timestamp NOT NULL DEFAULT NOW(),
  "referral_code" text NOT NULL,
  "github_starred" boolean NOT NULL DEFAULT false,
  "leaderboard_visibility" "leaderboard_visibility" NOT NULL DEFAULT 'anonymous',
  "last_synced_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT "pioneers_github_id_unique" UNIQUE("github_id"),
  CONSTRAINT "pioneers_referral_code_unique" UNIQUE("referral_code"),
  CONSTRAINT "pioneers_user_id_unique" UNIQUE("user_id")
);

CREATE INDEX "pioneers_leaderboard_idx" ON "pioneers" ("total_points" DESC);

COMMENT ON TABLE "pioneers" IS 'Pioneer Program user profiles - Beta testers and early adopters';

CREATE TABLE "pioneer_actions" (
  "id" text PRIMARY KEY,
  "pioneer_id" text NOT NULL REFERENCES "public"."pioneers"("id") ON DELETE CASCADE,
  "action_type" "pioneer_action_type" NOT NULL,
  "points" integer NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "pioneer_actions_pioneer_id_idx" ON "pioneer_actions" ("pioneer_id");
CREATE INDEX "pioneer_actions_action_type_idx" ON "pioneer_actions" ("action_type");
CREATE INDEX "pioneer_actions_created_at_idx" ON "pioneer_actions" ("created_at" DESC);

COMMENT ON TABLE "pioneer_actions" IS 'Individual pioneer action log for points calculation';

CREATE TABLE "pioneer_tier_history" (
  "id" text PRIMARY KEY,
  "pioneer_id" text NOT NULL REFERENCES "public"."pioneers"("id") ON DELETE CASCADE,
  "previous_tier" "pioneer_tier",
  "new_tier" "pioneer_tier" NOT NULL,
  "points_at_transition" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "pioneer_tier_history_pioneer_id_idx" ON "pioneer_tier_history" ("pioneer_id");

COMMENT ON TABLE "pioneer_tier_history" IS 'Track tier progression for leaderboard history';

-- ============================================================================
-- MCP SERVER TABLES (Phase 4 - Development Session Tracking)
-- ============================================================================

CREATE TABLE "mcp_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "workspace_id" text NOT NULL,
  "task_description" text,
  "started_at" timestamp NOT NULL DEFAULT NOW(),
  "ended_at" timestamp,
  "snapshot_count" integer DEFAULT 0,
  "risk_analysis_count" integer DEFAULT 0,
  "learnings_recorded" integer DEFAULT 0,
  "detected_stack" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "mcp_sessions_user_idx" ON "mcp_sessions" ("user_id");
CREATE INDEX "mcp_sessions_workspace_idx" ON "mcp_sessions" ("workspace_id");
CREATE INDEX "mcp_sessions_started_at_idx" ON "mcp_sessions" ("started_at" DESC);

COMMENT ON TABLE "mcp_sessions" IS 'MCP Server development session tracking for cross-workspace learning';

CREATE TABLE "mcp_aggregated_learnings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "pattern_key" text NOT NULL,
  "pattern_type" text NOT NULL,
  "workspace_count" integer NOT NULL DEFAULT 1,
  "workspace_ids" jsonb NOT NULL DEFAULT '[]',
  "total_occurrences" integer NOT NULL DEFAULT 1,
  "confidence" real NOT NULL DEFAULT 0.5,
  "last_seen_at" timestamp NOT NULL DEFAULT NOW(),
  "first_seen_at" timestamp NOT NULL DEFAULT NOW(),
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "mcp_learnings_user_idx" ON "mcp_aggregated_learnings" ("user_id");
CREATE INDEX "mcp_learnings_pattern_idx" ON "mcp_aggregated_learnings" ("pattern_key");
CREATE INDEX "mcp_learnings_confidence_idx" ON "mcp_aggregated_learnings" ("confidence" DESC);

COMMENT ON TABLE "mcp_aggregated_learnings" IS 'Cross-workspace pattern aggregation for learning engine';

CREATE TABLE "mcp_activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "file_count" integer,
  "total_bytes" integer,
  "risk_level" text,
  "timestamp" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "mcp_activity_session_idx" ON "mcp_activity_events" ("session_id");
CREATE INDEX "mcp_activity_user_idx" ON "mcp_activity_events" ("user_id");
CREATE INDEX "mcp_activity_timestamp_idx" ON "mcp_activity_events" ("timestamp" DESC);

COMMENT ON TABLE "mcp_activity_events" IS 'Metadata-only activity tracking for MCP sessions';

-- ============================================================================
-- TRUST CALIBRATION TABLES (Intelligence Layer - AI Tool Confidence)
-- ============================================================================

CREATE TABLE "trust_scores" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "tool_id" text NOT NULL,
  "context_key" text NOT NULL,
  "score" decimal(4,3) NOT NULL,
  "momentum" decimal(4,3) DEFAULT 0,
  "volatility" decimal(4,3) DEFAULT 0.5,
  "sample_count" integer NOT NULL DEFAULT 0,
  "recent_window" jsonb DEFAULT '[]',
  "last_calibration" timestamp NOT NULL DEFAULT NOW(),
  "model_version" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT "trust_scores_user_tool_context_unique" UNIQUE("user_id", "tool_id", "context_key")
);

CREATE INDEX "trust_scores_user_idx" ON "trust_scores" ("user_id");
CREATE INDEX "trust_scores_tool_idx" ON "trust_scores" ("tool_id");
CREATE INDEX "trust_scores_score_idx" ON "trust_scores" ("score" DESC);

COMMENT ON TABLE "trust_scores" IS 'EWMA-based trust calibration for AI tool confidence scoring';

CREATE TABLE "predictions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "session_id" text NOT NULL,
  "prediction_type" text NOT NULL,
  "predicted_value" decimal(5,4) NOT NULL,
  "confidence" decimal(4,3) NOT NULL,
  "model_version" text NOT NULL,
  "source" text NOT NULL,
  "latency_ms" integer,
  "features_used" jsonb DEFAULT '[]',
  "context_hash" text,
  "actual_outcome" boolean,
  "was_correct" boolean,
  "outcome_recorded_at" timestamp,
  "feedback_source" text,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "predictions_user_idx" ON "predictions" ("user_id");
CREATE INDEX "predictions_session_idx" ON "predictions" ("session_id");
CREATE INDEX "predictions_model_idx" ON "predictions" ("model_version");
CREATE INDEX "predictions_accuracy_idx" ON "predictions" ("was_correct", "created_at" DESC);

COMMENT ON TABLE "predictions" IS 'ML prediction tracking with ground truth feedback loop';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all tables created
-- SELECT COUNT(*) as table_count FROM information_schema.tables
--   WHERE table_name IN ('pioneers', 'pioneer_actions', 'pioneer_tier_history',
--                         'mcp_sessions', 'mcp_aggregated_learnings', 'mcp_activity_events',
--                         'trust_scores', 'predictions');
-- Expected: 8

-- Verify all enums created
-- SELECT COUNT(*) as enum_count FROM pg_type
--   WHERE typname IN ('pioneer_tier', 'leaderboard_visibility', 'pioneer_action_type');
-- Expected: 3

-- Verify all indexes created
-- SELECT COUNT(*) as index_count FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename IN (
--     'pioneers', 'pioneer_actions', 'pioneer_tier_history',
--     'mcp_sessions', 'mcp_aggregated_learnings', 'mcp_activity_events',
--     'trust_scores', 'predictions');
-- Expected: 15
```

---

## Risk Mitigation

### High-Risk Operations

1. **Data Migration (Phase 3)**
   - Risk: Lock tables during migration
   - Mitigation: Use `CONCURRENTLY` for index operations, batch deletes for data moves
   - Backup: Full pg_dump before starting

2. **Partition Migration**
   - Risk: Data loss during partition reorganization
   - Mitigation: Insert/select in transactions, verify row counts before/after
   - Validation: COUNT(*) before and after must match

3. **Soft Delete Pattern (Phase 2)**
   - Risk: New queries might miss soft-deleted data
   - Mitigation: Audit all queries accessing subscriptions, device_trials
   - Testing: Add test cases for active-only scenarios

### Rollback Strategy

**Phase 1:** Full rollback script provided (drop tables and enums)

**Phase 2:** Safe - indexes can be dropped individually without data impact

**Phase 3:** Requires restore from backup if data is corrupted

**Phase 4:** Safe - can disable cron jobs without data impact

---

## Success Metrics

### Performance Improvements

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Time-range queries | 10-20x faster | EXPLAIN ANALYZE before/after |
| Active-only queries | 60% faster | Query execution time in monitoring |
| Index size | 80% reduction (BRIN) | `pg_indexes_size()` function |
| Query memory | 50% reduction | `EXPLAIN` memory usage |

### Data Integrity

- ✅ No rows lost during migration
- ✅ All foreign keys valid post-migration
- ✅ Referential integrity maintained
- ✅ Partition pruning working correctly

### Service Reliability

- ✅ All services deploy successfully
- ✅ Zero errors in production logs (24 hours)
- ✅ API response times within SLA
- ✅ No regression in feature functionality

---

## Sign-Off

| Role | Name | Date | Approval |
|------|------|------|----------|
| Database Architect | [TBD] | | |
| Backend Lead | [TBD] | | |
| DevOps | [TBD] | | |
| Product | [TBD] | | |

---

## Appendix: Related Documentation

- **ROUTER.md:** Workflow routing and task classification
- **Service-to-DB Mapping Report:** Detailed analysis of all 10 services and their table dependencies
- **0007_performance_indexes.sql:** Previous optimization migration (reference implementation)
- **retention_config table:** Already exists in schema for data retention policies

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-22 | Database Audit | Initial specification |
| | | | - 4 phases with detailed implementation steps |
| | | | - 14 missing tables identified |
| | | | - 15 performance indexes planned |
| | | | - Automated retention policies |
