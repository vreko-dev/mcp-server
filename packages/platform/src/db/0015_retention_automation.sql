-- Migration: 0015_retention_automation.sql
-- Created: 2025-12-22
-- Description: Implement automated data retention policies and cleanup jobs
-- Phase 4: Data Retention & Cleanup Automation

-- ============================================================================
-- PREREQUISITES
-- Ensure pg_cron extension is available
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. POPULATE RETENTION CONFIG
-- Configure retention policies for time-series tables
-- ============================================================================

-- Ensure retention_config table has our policies
INSERT INTO "retention_config" ("id", "table_name", "retention_days", "is_enabled")
VALUES
  (gen_random_uuid()::text, 'telemetry_events', 90, true),
  (gen_random_uuid()::text, 'error_logs', 180, true),
  (gen_random_uuid()::text, 'api_usage_logs', 365, true),
  (gen_random_uuid()::text, 'feature_usage', 180, true),
  (gen_random_uuid()::text, 'analysis_events', 365, true),
  (gen_random_uuid()::text, 'mcp_activity_events', 90, true),
  (gen_random_uuid()::text, 'predictions', 365, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. CREATE ARCHIVE TABLES
-- For tables that need long-term audit capability
-- ============================================================================

-- Archive table for api_usage_logs (365 day retention → archive)
CREATE TABLE IF NOT EXISTS "api_usage_logs_archive" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "api_key_id" text,
  "endpoint" text NOT NULL,
  "method" text NOT NULL,
  "status_code" integer,
  "request_duration_ms" integer,
  "request_size" integer,
  "response_size" integer,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL,
  "archived_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "api_usage_logs_archive_user_idx"
  ON "api_usage_logs_archive" ("user_id");
CREATE INDEX IF NOT EXISTS "api_usage_logs_archive_created_idx"
  ON "api_usage_logs_archive" ("created_at");

-- Archive table for analysis_events (365 day retention → archive)
CREATE TABLE IF NOT EXISTS "analysis_events_archive" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "analysis_type" text NOT NULL,
  "file_path" text,
  "result" jsonb DEFAULT '{}',
  "duration_ms" integer,
  "created_at" timestamp NOT NULL,
  "archived_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "analysis_events_archive_user_idx"
  ON "analysis_events_archive" ("user_id");
CREATE INDEX IF NOT EXISTS "analysis_events_archive_created_idx"
  ON "analysis_events_archive" ("created_at");

-- ============================================================================
-- 3. CREATE CLEANUP FUNCTIONS
-- Reusable functions for each cleanup operation
-- ============================================================================

-- Function to cleanup telemetry_events (90 days)
CREATE OR REPLACE FUNCTION cleanup_telemetry_events()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM telemetry_events
  WHERE "timestamp" < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % telemetry_events records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup error_logs (180 days)
CREATE OR REPLACE FUNCTION cleanup_error_logs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM error_logs
  WHERE "created_at" < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % error_logs records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup feature_usage (180 days)
CREATE OR REPLACE FUNCTION cleanup_feature_usage()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM feature_usage
  WHERE "created_at" < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % feature_usage records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup mcp_activity_events (90 days)
CREATE OR REPLACE FUNCTION cleanup_mcp_activity_events()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM mcp_activity_events
  WHERE "timestamp" < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % mcp_activity_events records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive and cleanup api_usage_logs (365 days)
CREATE OR REPLACE FUNCTION archive_api_usage_logs()
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Insert into archive
  INSERT INTO api_usage_logs_archive (
    id, user_id, api_key_id, endpoint, method, status_code,
    request_duration_ms, request_size, response_size, metadata, created_at
  )
  SELECT id, user_id, api_key_id, endpoint, method, status_code,
         request_duration_ms, request_size, response_size, metadata, created_at
  FROM api_usage_logs
  WHERE "created_at" < NOW() - INTERVAL '365 days';

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Delete from main table
  DELETE FROM api_usage_logs
  WHERE "created_at" < NOW() - INTERVAL '365 days';

  RAISE NOTICE 'Archived % api_usage_logs records', archived_count;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive and cleanup analysis_events (365 days)
CREATE OR REPLACE FUNCTION archive_analysis_events()
RETURNS integer AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Insert into archive
  INSERT INTO analysis_events_archive (
    id, user_id, analysis_type, file_path, result, duration_ms, created_at
  )
  SELECT id, user_id, analysis_type, file_path, result, duration_ms, created_at
  FROM analysis_events
  WHERE "created_at" < NOW() - INTERVAL '365 days';

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Delete from main table
  DELETE FROM analysis_events
  WHERE "created_at" < NOW() - INTERVAL '365 days';

  RAISE NOTICE 'Archived % analysis_events records', archived_count;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Master cleanup function (runs all cleanups)
CREATE OR REPLACE FUNCTION run_all_retention_cleanups()
RETURNS TABLE(table_name text, records_affected integer) AS $$
BEGIN
  RETURN QUERY SELECT 'telemetry_events'::text, cleanup_telemetry_events();
  RETURN QUERY SELECT 'error_logs'::text, cleanup_error_logs();
  RETURN QUERY SELECT 'feature_usage'::text, cleanup_feature_usage();
  RETURN QUERY SELECT 'mcp_activity_events'::text, cleanup_mcp_activity_events();
  RETURN QUERY SELECT 'api_usage_logs'::text, archive_api_usage_logs();
  RETURN QUERY SELECT 'analysis_events'::text, archive_analysis_events();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. SCHEDULE CLEANUP JOBS WITH pg_cron
-- Note: These need to be run by a user with cron.schedule privileges
-- ============================================================================

-- Daily cleanup at 2 AM UTC for 90-day tables
-- SELECT cron.schedule(
--   'cleanup_telemetry_events',
--   '0 2 * * *',
--   $$SELECT cleanup_telemetry_events()$$
-- );

-- SELECT cron.schedule(
--   'cleanup_mcp_activity_events',
--   '10 2 * * *',
--   $$SELECT cleanup_mcp_activity_events()$$
-- );

-- Daily cleanup at 3 AM UTC for 180-day tables
-- SELECT cron.schedule(
--   'cleanup_error_logs',
--   '0 3 * * *',
--   $$SELECT cleanup_error_logs()$$
-- );

-- SELECT cron.schedule(
--   'cleanup_feature_usage',
--   '10 3 * * *',
--   $$SELECT cleanup_feature_usage()$$
-- );

-- Daily archive at 4 AM UTC for 365-day tables
-- SELECT cron.schedule(
--   'archive_api_usage_logs',
--   '0 4 * * *',
--   $$SELECT archive_api_usage_logs()$$
-- );

-- SELECT cron.schedule(
--   'archive_analysis_events',
--   '10 4 * * *',
--   $$SELECT archive_analysis_events()$$
-- );

-- ============================================================================
-- 5. CLEANUP MONITORING TABLE
-- Track cleanup job execution history
-- ============================================================================

CREATE TABLE IF NOT EXISTS "retention_cleanup_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_name" text NOT NULL,
  "table_name" text NOT NULL,
  "records_affected" integer NOT NULL,
  "duration_ms" integer,
  "success" boolean NOT NULL DEFAULT true,
  "error_message" text,
  "executed_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "retention_cleanup_log_job_idx"
  ON "retention_cleanup_log" ("job_name", "executed_at" DESC);

CREATE INDEX IF NOT EXISTS "retention_cleanup_log_table_idx"
  ON "retention_cleanup_log" ("table_name", "executed_at" DESC);

-- ============================================================================
-- 6. ENHANCED CLEANUP FUNCTION WITH LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION run_all_retention_cleanups_with_logging()
RETURNS TABLE(table_name text, records_affected integer, success boolean) AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('telemetry_events', 'cleanup_telemetry_events'),
      ('error_logs', 'cleanup_error_logs'),
      ('feature_usage', 'cleanup_feature_usage'),
      ('mcp_activity_events', 'cleanup_mcp_activity_events'),
      ('api_usage_logs', 'archive_api_usage_logs'),
      ('analysis_events', 'archive_analysis_events')
    ) AS t(tbl, func)
  LOOP
    start_time := clock_timestamp();
    BEGIN
      EXECUTE format('SELECT %I()', rec.func) INTO records_affected;
      end_time := clock_timestamp();

      INSERT INTO retention_cleanup_log (job_name, table_name, records_affected, duration_ms, success)
      VALUES (
        rec.func,
        rec.tbl,
        records_affected,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::integer,
        true
      );

      RETURN QUERY SELECT rec.tbl, records_affected, true;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO retention_cleanup_log (job_name, table_name, records_affected, duration_ms, success, error_message)
      VALUES (
        rec.func,
        rec.tbl,
        0,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::integer,
        false,
        SQLERRM
      );

      RETURN QUERY SELECT rec.tbl, 0, false;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check retention_config is populated:
-- SELECT * FROM retention_config WHERE is_enabled = true ORDER BY table_name;
-- Expected: 7 policies

-- Check archive tables exist:
-- SELECT tablename FROM pg_tables WHERE tablename LIKE '%_archive';
-- Expected: 2 archive tables

-- Check cleanup functions exist:
-- SELECT proname FROM pg_proc WHERE proname LIKE 'cleanup_%' OR proname LIKE 'archive_%';
-- Expected: 6+ functions

-- Check cron jobs (if scheduled):
-- SELECT jobid, jobname, schedule FROM cron.job WHERE jobname LIKE 'cleanup_%' OR jobname LIKE 'archive_%';
-- Expected: 6 scheduled jobs

-- Test cleanup functions (dry run - use SELECT instead of executing):
-- SELECT cleanup_telemetry_events();
-- Expected: Returns number of records that would be deleted

-- View cleanup history:
-- SELECT * FROM retention_cleanup_log ORDER BY executed_at DESC LIMIT 20;

-- ============================================================================
-- MANUAL EXECUTION (for initial cleanup or testing)
-- ============================================================================

-- Run all cleanups with logging:
-- SELECT * FROM run_all_retention_cleanups_with_logging();

-- Run individual cleanup:
-- SELECT cleanup_telemetry_events();
-- SELECT archive_api_usage_logs();

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- Unschedule cron jobs:
-- SELECT cron.unschedule('cleanup_telemetry_events');
-- SELECT cron.unschedule('cleanup_error_logs');
-- SELECT cron.unschedule('cleanup_feature_usage');
-- SELECT cron.unschedule('cleanup_mcp_activity_events');
-- SELECT cron.unschedule('archive_api_usage_logs');
-- SELECT cron.unschedule('archive_analysis_events');

-- Drop functions:
-- DROP FUNCTION IF EXISTS cleanup_telemetry_events();
-- DROP FUNCTION IF EXISTS cleanup_error_logs();
-- DROP FUNCTION IF EXISTS cleanup_feature_usage();
-- DROP FUNCTION IF EXISTS cleanup_mcp_activity_events();
-- DROP FUNCTION IF EXISTS archive_api_usage_logs();
-- DROP FUNCTION IF EXISTS archive_analysis_events();
-- DROP FUNCTION IF EXISTS run_all_retention_cleanups();
-- DROP FUNCTION IF EXISTS run_all_retention_cleanups_with_logging();

-- Drop archive tables (CAUTION: data loss):
-- DROP TABLE IF EXISTS api_usage_logs_archive;
-- DROP TABLE IF EXISTS analysis_events_archive;

-- Drop cleanup log:
-- DROP TABLE IF EXISTS retention_cleanup_log;

-- Remove retention_config entries:
-- DELETE FROM retention_config WHERE table_name IN (
--   'telemetry_events', 'error_logs', 'api_usage_logs',
--   'feature_usage', 'analysis_events', 'mcp_activity_events', 'predictions'
-- );
