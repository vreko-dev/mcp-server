-- Migration: 0014_formalize_partitioning.sql
-- Created: 2025-12-22
-- Description: Formalize table partitioning with native PostgreSQL partitioning
-- Phase 3: Table Partitioning Formalization

-- ============================================================================
-- PREREQUISITES
-- Ensure pg_partman extension is available (managed by cloud provider or DBA)
-- ============================================================================

-- Create pg_partman extension if not exists (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Create pg_cron extension for automated maintenance (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. FORMALIZE API_USAGE_LOGS PARTITIONING
-- Convert existing ad-hoc partitions to native PostgreSQL partitioning
-- ============================================================================

-- Step 1: Create new partitioned table structure
CREATE TABLE IF NOT EXISTS "api_usage_logs_partitioned" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "api_key_id" text,
  "endpoint" text NOT NULL,
  "method" text NOT NULL,
  "status_code" integer,
  "request_duration_ms" integer,
  "request_size" integer,
  "response_size" integer,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT NOW()
) PARTITION BY RANGE ("created_at");

-- Step 2: Create partitions for historical and future months
-- Note: pg_partman will manage future partitions automatically
CREATE TABLE IF NOT EXISTS "api_usage_logs_202501" PARTITION OF "api_usage_logs_partitioned"
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS "api_usage_logs_202502" PARTITION OF "api_usage_logs_partitioned"
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS "api_usage_logs_202503" PARTITION OF "api_usage_logs_partitioned"
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS "api_usage_logs_202504" PARTITION OF "api_usage_logs_partitioned"
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS "api_usage_logs_202505" PARTITION OF "api_usage_logs_partitioned"
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS "api_usage_logs_202506" PARTITION OF "api_usage_logs_partitioned"
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Step 3: Add primary key and indexes to partitioned table
ALTER TABLE "api_usage_logs_partitioned" ADD PRIMARY KEY ("id", "created_at");

CREATE INDEX IF NOT EXISTS "api_usage_logs_partitioned_user_idx"
  ON "api_usage_logs_partitioned" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "api_usage_logs_partitioned_api_key_idx"
  ON "api_usage_logs_partitioned" ("api_key_id", "created_at" DESC);

-- ============================================================================
-- 2. FORMALIZE TELEMETRY_EVENTS PARTITIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS "telemetry_events_partitioned" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "event_type" text NOT NULL,
  "event_name" text NOT NULL,
  "properties" jsonb DEFAULT '{}',
  "session_id" text,
  "device_id" text,
  "app_version" text,
  "timestamp" timestamp NOT NULL DEFAULT NOW()
) PARTITION BY RANGE ("timestamp");

-- Create partitions
CREATE TABLE IF NOT EXISTS "telemetry_events_202501" PARTITION OF "telemetry_events_partitioned"
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS "telemetry_events_202502" PARTITION OF "telemetry_events_partitioned"
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS "telemetry_events_202503" PARTITION OF "telemetry_events_partitioned"
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS "telemetry_events_202504" PARTITION OF "telemetry_events_partitioned"
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS "telemetry_events_202505" PARTITION OF "telemetry_events_partitioned"
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS "telemetry_events_202506" PARTITION OF "telemetry_events_partitioned"
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Add primary key and indexes
ALTER TABLE "telemetry_events_partitioned" ADD PRIMARY KEY ("id", "timestamp");

CREATE INDEX IF NOT EXISTS "telemetry_events_partitioned_user_idx"
  ON "telemetry_events_partitioned" ("user_id", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "telemetry_events_partitioned_event_type_idx"
  ON "telemetry_events_partitioned" ("event_type", "timestamp" DESC);

-- ============================================================================
-- 3. FORMALIZE FEATURE_USAGE PARTITIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS "feature_usage_partitioned" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "feature_name" text NOT NULL,
  "usage_count" integer DEFAULT 1,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT NOW()
) PARTITION BY RANGE ("created_at");

-- Create partitions
CREATE TABLE IF NOT EXISTS "feature_usage_202501" PARTITION OF "feature_usage_partitioned"
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS "feature_usage_202502" PARTITION OF "feature_usage_partitioned"
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS "feature_usage_202503" PARTITION OF "feature_usage_partitioned"
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS "feature_usage_202504" PARTITION OF "feature_usage_partitioned"
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS "feature_usage_202505" PARTITION OF "feature_usage_partitioned"
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS "feature_usage_202506" PARTITION OF "feature_usage_partitioned"
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Add primary key and indexes
ALTER TABLE "feature_usage_partitioned" ADD PRIMARY KEY ("id", "created_at");

CREATE INDEX IF NOT EXISTS "feature_usage_partitioned_user_idx"
  ON "feature_usage_partitioned" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "feature_usage_partitioned_feature_idx"
  ON "feature_usage_partitioned" ("feature_name", "created_at" DESC);

-- ============================================================================
-- 4. FORMALIZE ERROR_LOGS PARTITIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS "error_logs_partitioned" (
  "id" text NOT NULL,
  "user_id" text,
  "error_type" text NOT NULL,
  "error_message" text NOT NULL,
  "stack_trace" text,
  "context" jsonb DEFAULT '{}',
  "severity" text DEFAULT 'error',
  "resolved" boolean DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT NOW()
) PARTITION BY RANGE ("created_at");

-- Create partitions
CREATE TABLE IF NOT EXISTS "error_logs_202501" PARTITION OF "error_logs_partitioned"
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS "error_logs_202502" PARTITION OF "error_logs_partitioned"
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS "error_logs_202503" PARTITION OF "error_logs_partitioned"
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS "error_logs_202504" PARTITION OF "error_logs_partitioned"
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS "error_logs_202505" PARTITION OF "error_logs_partitioned"
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS "error_logs_202506" PARTITION OF "error_logs_partitioned"
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Add primary key and indexes
ALTER TABLE "error_logs_partitioned" ADD PRIMARY KEY ("id", "created_at");

CREATE INDEX IF NOT EXISTS "error_logs_partitioned_user_idx"
  ON "error_logs_partitioned" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "error_logs_partitioned_type_idx"
  ON "error_logs_partitioned" ("error_type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "error_logs_partitioned_severity_idx"
  ON "error_logs_partitioned" ("severity", "created_at" DESC);

-- ============================================================================
-- 5. SETUP pg_partman FOR AUTO-CREATION
-- Schedule automatic partition creation
-- ============================================================================

-- Setup pg_partman for api_usage_logs
-- Note: This requires the partitioned table to already exist
-- Run after confirming data migration is complete:
-- SELECT partman.create_parent(
--   'public.api_usage_logs_partitioned',
--   'created_at',
--   'native',
--   'monthly',
--   p_start_partition := '2025-01-01'
-- );

-- Setup pg_partman for telemetry_events
-- SELECT partman.create_parent(
--   'public.telemetry_events_partitioned',
--   'timestamp',
--   'native',
--   'monthly',
--   p_start_partition := '2025-01-01'
-- );

-- Setup pg_partman for feature_usage
-- SELECT partman.create_parent(
--   'public.feature_usage_partitioned',
--   'created_at',
--   'native',
--   'monthly',
--   p_start_partition := '2025-01-01'
-- );

-- Setup pg_partman for error_logs
-- SELECT partman.create_parent(
--   'public.error_logs_partitioned',
--   'created_at',
--   'native',
--   'monthly',
--   p_start_partition := '2025-01-01'
-- );

-- ============================================================================
-- 6. SCHEDULE MAINTENANCE JOBS WITH pg_cron
-- ============================================================================

-- Daily partition maintenance at 1 AM UTC
-- SELECT cron.schedule(
--   'partman_maintenance',
--   '0 1 * * *',
--   $$SELECT partman.run_maintenance(p_analyze := true)$$
-- );

-- ============================================================================
-- DATA MIGRATION NOTES
-- ============================================================================

-- IMPORTANT: Data migration should be done AFTER this migration runs
-- and BEFORE renaming tables. Use the following pattern:

-- 1. Insert historical data:
-- INSERT INTO api_usage_logs_partitioned SELECT * FROM api_usage_logs;

-- 2. Verify row counts match:
-- SELECT COUNT(*) FROM api_usage_logs;
-- SELECT COUNT(*) FROM api_usage_logs_partitioned;

-- 3. Rename tables (during maintenance window):
-- ALTER TABLE api_usage_logs RENAME TO api_usage_logs_old;
-- ALTER TABLE api_usage_logs_partitioned RENAME TO api_usage_logs;

-- 4. Update foreign keys if any (none expected for these tables)

-- 5. Drop old table after verification:
-- DROP TABLE api_usage_logs_old;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify partitioned tables exist:
-- SELECT schemaname, tablename FROM pg_tables
--   WHERE tablename LIKE '%_partitioned'
--   ORDER BY tablename;
-- Expected: 4 partitioned parent tables

-- Verify partitions exist:
-- SELECT inhrelid::regclass as partition, pg_get_expr(relpartbound, inhrelid) as bounds
--   FROM pg_inherits
--   WHERE inhparent = 'api_usage_logs_partitioned'::regclass;
-- Expected: 6+ partitions per table

-- Verify partition pruning works:
-- EXPLAIN ANALYZE SELECT * FROM api_usage_logs_partitioned
--   WHERE created_at >= '2025-01-01' AND created_at < '2025-02-01';
-- Expected: Should only scan api_usage_logs_202501

-- ============================================================================
-- ROLLBACK (if needed - before data migration)
-- ============================================================================

-- DROP TABLE IF EXISTS api_usage_logs_partitioned CASCADE;
-- DROP TABLE IF EXISTS telemetry_events_partitioned CASCADE;
-- DROP TABLE IF EXISTS feature_usage_partitioned CASCADE;
-- DROP TABLE IF EXISTS error_logs_partitioned CASCADE;
