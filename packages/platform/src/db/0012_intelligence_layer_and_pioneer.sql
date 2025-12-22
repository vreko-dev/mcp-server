-- Migration: 0012_intelligence_layer_and_pioneer.sql
-- Created: 2025-12-22
-- Description: Add Phase 4 Intelligence Layer and Pioneer Program tables
-- This migration addresses 3 CRITICAL gaps in the schema that are actively used by services

-- ============================================================================
-- PIONEER PROGRAM ENUMS & TABLES
-- Note: Enums already exist from previous migrations, using IF NOT EXISTS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE "public"."pioneer_tier" AS ENUM('seedling', 'grower', 'cultivator', 'guardian');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."leaderboard_visibility" AS ENUM('public', 'anonymous', 'hidden');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PIONEER TABLES (if not exists - may already be created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "pioneers" (
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
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Pioneer unique constraints (skip if exists)
DO $$ BEGIN
    ALTER TABLE "pioneers" ADD CONSTRAINT "pioneers_github_id_unique" UNIQUE("github_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "pioneers" ADD CONSTRAINT "pioneers_referral_code_unique" UNIQUE("referral_code");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "pioneers" ADD CONSTRAINT "pioneers_user_id_unique" UNIQUE("user_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "pioneers_leaderboard_idx" ON "pioneers" ("total_points" DESC);

COMMENT ON TABLE "pioneers" IS 'Pioneer Program user profiles - Beta testers and early adopters';

CREATE TABLE IF NOT EXISTS "pioneer_actions" (
  "id" text PRIMARY KEY,
  "pioneer_id" text NOT NULL REFERENCES "public"."pioneers"("id") ON DELETE CASCADE,
  "action_type" "pioneer_action_type" NOT NULL,
  "points" integer NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "metadata" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "pioneer_actions_pioneer_id_idx" ON "pioneer_actions" ("pioneer_id");
CREATE INDEX IF NOT EXISTS "pioneer_actions_action_type_idx" ON "pioneer_actions" ("action_type");
CREATE INDEX IF NOT EXISTS "pioneer_actions_created_at_idx" ON "pioneer_actions" ("created_at" DESC);

COMMENT ON TABLE "pioneer_actions" IS 'Individual pioneer action log for points calculation';

CREATE TABLE IF NOT EXISTS "pioneer_tier_history" (
  "id" text PRIMARY KEY,
  "pioneer_id" text NOT NULL REFERENCES "public"."pioneers"("id") ON DELETE CASCADE,
  "previous_tier" "pioneer_tier",
  "new_tier" "pioneer_tier" NOT NULL,
  "points_at_transition" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "pioneer_tier_history_pioneer_id_idx" ON "pioneer_tier_history" ("pioneer_id");

COMMENT ON TABLE "pioneer_tier_history" IS 'Track tier progression for leaderboard history';

-- ============================================================================
-- MCP SERVER TABLES (Phase 4 - Development Session Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "mcp_sessions" (
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

CREATE INDEX IF NOT EXISTS "mcp_sessions_user_idx" ON "mcp_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "mcp_sessions_workspace_idx" ON "mcp_sessions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "mcp_sessions_started_at_idx" ON "mcp_sessions" ("started_at" DESC);

COMMENT ON TABLE "mcp_sessions" IS 'MCP Server development session tracking for cross-workspace learning';

CREATE TABLE IF NOT EXISTS "mcp_aggregated_learnings" (
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

CREATE INDEX IF NOT EXISTS "mcp_learnings_user_idx" ON "mcp_aggregated_learnings" ("user_id");
CREATE INDEX IF NOT EXISTS "mcp_learnings_pattern_idx" ON "mcp_aggregated_learnings" ("pattern_key");
CREATE INDEX IF NOT EXISTS "mcp_learnings_confidence_idx" ON "mcp_aggregated_learnings" ("confidence" DESC);

COMMENT ON TABLE "mcp_aggregated_learnings" IS 'Cross-workspace pattern aggregation for learning engine';

CREATE TABLE IF NOT EXISTS "mcp_activity_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL,
  "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "file_count" integer,
  "total_bytes" integer,
  "risk_level" text,
  "timestamp" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "mcp_activity_session_idx" ON "mcp_activity_events" ("session_id");
CREATE INDEX IF NOT EXISTS "mcp_activity_user_idx" ON "mcp_activity_events" ("user_id");
CREATE INDEX IF NOT EXISTS "mcp_activity_timestamp_idx" ON "mcp_activity_events" ("timestamp" DESC);

COMMENT ON TABLE "mcp_activity_events" IS 'Metadata-only activity tracking for MCP sessions';

-- ============================================================================
-- TRUST CALIBRATION TABLES (Intelligence Layer - AI Tool Confidence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "trust_scores" (
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
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Unique constraint for trust scores (skip if exists)
DO $$ BEGIN
    ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_user_tool_context_unique"
      UNIQUE("user_id", "tool_id", "context_key");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "trust_scores_user_idx" ON "trust_scores" ("user_id");
CREATE INDEX IF NOT EXISTS "trust_scores_tool_idx" ON "trust_scores" ("tool_id");
CREATE INDEX IF NOT EXISTS "trust_scores_score_idx" ON "trust_scores" ("score" DESC);

COMMENT ON TABLE "trust_scores" IS 'EWMA-based trust calibration for AI tool confidence scoring';

CREATE TABLE IF NOT EXISTS "predictions" (
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

CREATE INDEX IF NOT EXISTS "predictions_user_idx" ON "predictions" ("user_id");
CREATE INDEX IF NOT EXISTS "predictions_session_idx" ON "predictions" ("session_id");
CREATE INDEX IF NOT EXISTS "predictions_model_idx" ON "predictions" ("model_version");
CREATE INDEX IF NOT EXISTS "predictions_accuracy_idx" ON "predictions" ("was_correct", "created_at" DESC);

COMMENT ON TABLE "predictions" IS 'ML prediction tracking with ground truth feedback loop';

-- ============================================================================
-- Verification Queries (run to verify migration success)
-- ============================================================================

-- Verify all tables created:
-- SELECT COUNT(*) as table_count FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN (
--     'pioneers', 'pioneer_actions', 'pioneer_tier_history',
--     'mcp_sessions', 'mcp_aggregated_learnings', 'mcp_activity_events',
--     'trust_scores', 'predictions');
-- Expected: 8

-- Verify all enums created:
-- SELECT COUNT(*) as enum_count FROM pg_type
--   WHERE typname IN ('pioneer_tier', 'leaderboard_visibility', 'pioneer_action_type');
-- Expected: 3

-- Verify indexes created:
-- SELECT COUNT(*) as index_count FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename IN (
--     'pioneers', 'pioneer_actions', 'pioneer_tier_history',
--     'mcp_sessions', 'mcp_aggregated_learnings', 'mcp_activity_events',
--     'trust_scores', 'predictions');
-- Expected: 18+
