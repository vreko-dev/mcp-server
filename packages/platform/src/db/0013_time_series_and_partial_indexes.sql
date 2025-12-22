-- Migration: 0013_time_series_and_partial_indexes.sql
-- Created: 2025-12-22
-- Description: Add high-impact indexes following 2025 sustainable design patterns
-- Phase 2: Performance Optimization Indexes

-- ============================================================================
-- 1. BRIN INDEXES FOR TIME-SERIES (Replace B-tree for massive space savings)
-- BRIN (Block Range Index) is ideal for time-series data where values are
-- naturally ordered by insertion time. 80% space savings vs B-tree.
-- ============================================================================

-- Telemetry events - timestamp-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "telemetry_events_timestamp_brin_idx"
  ON "telemetry_events" USING BRIN ("timestamp");

-- Feature usage - created_at based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "feature_usage_created_at_brin_idx"
  ON "feature_usage" USING BRIN ("created_at");

-- Error logs - created_at based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "error_logs_created_at_brin_idx"
  ON "error_logs" USING BRIN ("created_at");

-- API usage logs - created_at based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "api_usage_logs_created_at_brin_idx"
  ON "api_usage_logs" USING BRIN ("created_at");

-- ============================================================================
-- 2. PARTIAL INDEXES FOR SOFT DELETES
-- Only index active records to dramatically reduce index size and speed up
-- queries that filter by status.
-- ============================================================================

-- Subscriptions - Only index active subscriptions (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "subscriptions_active_user_idx"
  ON "subscriptions" ("user_id")
  WHERE status = 'active';

-- Device trials - Only index non-blocked devices
CREATE INDEX CONCURRENTLY IF NOT EXISTS "device_trials_unblocked_idx"
  ON "device_trials" ("device_fingerprint")
  WHERE "blocked_until" IS NULL;

-- Pioneers - Only index visible leaderboard entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "pioneers_visible_leaderboard_idx"
  ON "pioneers" ("total_points" DESC)
  WHERE "leaderboard_visibility" != 'hidden';

-- ============================================================================
-- 3. JSONB GIN INDEXES
-- Enable fast searches within JSONB fields using GIN (Generalized Inverted Index)
-- ============================================================================

-- Snapshots metadata - enable queries like: WHERE metadata @> '{"key": "value"}'
CREATE INDEX CONCURRENTLY IF NOT EXISTS "snapshots_metadata_gin_idx"
  ON "snapshots" USING GIN ("metadata");

-- Telemetry events properties - enable property-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "telemetry_events_properties_gin_idx"
  ON "telemetry_events" USING GIN ("properties");

-- MCP aggregated learnings workspace_ids - enable @> queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "mcp_learnings_workspace_ids_gin_idx"
  ON "mcp_aggregated_learnings" USING GIN ("workspace_ids");

-- ============================================================================
-- 4. COMPOSITE INDEXES
-- Optimize common query patterns that filter by user and sort by date
-- ============================================================================

-- Telemetry events: user + timestamp (recent events for a user)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "telemetry_events_user_timestamp_idx"
  ON "telemetry_events" ("user_id", "timestamp" DESC);

-- Feature usage: user + created_at (user's recent feature usage)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "feature_usage_user_created_idx"
  ON "feature_usage" ("user_id", "created_at" DESC);

-- Error logs: user + created_at (user's recent errors)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "error_logs_user_created_idx"
  ON "error_logs" ("user_id", "created_at" DESC);

-- API usage logs: user + created_at (user's API usage history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "api_usage_logs_user_created_idx"
  ON "api_usage_logs" ("user_id", "created_at" DESC);

-- Predictions: user + was_correct + created_at (accuracy analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "predictions_user_accuracy_idx"
  ON "predictions" ("user_id", "was_correct", "created_at" DESC);

-- Trust scores: user + score (high-confidence tools lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "trust_scores_user_high_score_idx"
  ON "trust_scores" ("user_id", "score" DESC);

-- MCP sessions: workspace + started_at (session lookup by workspace)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "mcp_sessions_workspace_started_idx"
  ON "mcp_sessions" ("workspace_id", "started_at" DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify BRIN indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE '%brin%';
-- Expected: 4 BRIN indexes

-- Verify partial indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE indexname LIKE '%active%' OR indexname LIKE '%unblocked%' OR indexname LIKE '%visible%';
-- Expected: 3 partial indexes

-- Verify GIN indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes WHERE indexdef LIKE '%gin%';
-- Expected: 3 GIN indexes

-- Verify composite indexes exist:
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE indexname LIKE '%_user_%' AND indexname LIKE '%_idx';
-- Expected: 7+ composite indexes

-- ============================================================================
-- PERFORMANCE TESTING
-- ============================================================================

-- Before optimization (should use Seq Scan):
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM telemetry_events
--   WHERE timestamp > NOW() - INTERVAL '7 days';
-- Expected improvement: Seq Scan → BRIN Index Scan, 10-20x faster

-- After optimization (should use Index Scan):
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM telemetry_events
--   WHERE timestamp > NOW() - INTERVAL '7 days';
-- Expected: Bitmap Index Scan using BRIN index

-- Space savings check:
-- SELECT pg_size_pretty(pg_relation_size('telemetry_events_timestamp_brin_idx')) as brin_size,
--        pg_size_pretty(pg_table_size('telemetry_events')) as table_size;
-- Expected: BRIN index ~80% smaller than equivalent B-tree

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- Drop BRIN indexes:
-- DROP INDEX CONCURRENTLY IF EXISTS telemetry_events_timestamp_brin_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS feature_usage_created_at_brin_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS error_logs_created_at_brin_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS api_usage_logs_created_at_brin_idx;

-- Drop partial indexes:
-- DROP INDEX CONCURRENTLY IF EXISTS subscriptions_active_user_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS device_trials_unblocked_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS pioneers_visible_leaderboard_idx;

-- Drop GIN indexes:
-- DROP INDEX CONCURRENTLY IF EXISTS snapshots_metadata_gin_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS telemetry_events_properties_gin_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS mcp_learnings_workspace_ids_gin_idx;

-- Drop composite indexes:
-- DROP INDEX CONCURRENTLY IF EXISTS telemetry_events_user_timestamp_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS feature_usage_user_created_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS error_logs_user_created_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS api_usage_logs_user_created_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS predictions_user_accuracy_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS trust_scores_user_high_score_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS mcp_sessions_workspace_started_idx;
