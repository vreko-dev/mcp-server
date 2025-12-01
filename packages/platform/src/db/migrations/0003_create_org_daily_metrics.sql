-- Create org_daily_metrics table for storing aggregated organization metrics
-- Computed nightly from raw telemetry and usage data

CREATE TABLE IF NOT EXISTS "org_daily_metrics" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Organization reference
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,

  -- Date for this metric
  "date" timestamp NOT NULL,

  -- Incident metrics
  "incidents_detected" integer NOT NULL DEFAULT 0,
  "incidents_prevented" integer NOT NULL DEFAULT 0,
  "time_to_restore_ms" integer,

  -- Snapshot metrics
  "snapshots_created" integer NOT NULL DEFAULT 0,
  "snapshots_restored" integer NOT NULL DEFAULT 0,
  "bytes_saved" integer NOT NULL DEFAULT 0,

  -- Risk metrics
  "high_severity_risks" integer NOT NULL DEFAULT 0,
  "medium_severity_risks" integer NOT NULL DEFAULT 0,
  "low_severity_risks" integer NOT NULL DEFAULT 0,

  -- API usage metrics
  "api_calls" integer NOT NULL DEFAULT 0,
  "api_errors" integer NOT NULL DEFAULT 0,

  -- Feature adoption metrics
  "features_used" jsonb DEFAULT '{}',

  -- Performance metrics
  "avg_response_time_ms" integer,
  "p95_response_time_ms" integer,

  -- Client metrics
  "active_users" integer NOT NULL DEFAULT 0,
  "client_versions" jsonb DEFAULT '{}',

  -- Timestamps
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Index for organization and date lookups
CREATE UNIQUE INDEX IF NOT EXISTS "org_daily_metrics_org_date_unique" ON "org_daily_metrics"("organization_id", "date");

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS "org_daily_metrics_date_idx" ON "org_daily_metrics"("date");

-- Comments for documentation
COMMENT ON TABLE "org_daily_metrics" IS 'Stores aggregated daily metrics for each organization, computed nightly from raw telemetry and usage data';
COMMENT ON COLUMN "org_daily_metrics"."incidents_prevented" IS 'Number of incidents prevented by SnapBack protection';
COMMENT ON COLUMN "org_daily_metrics"."time_to_restore_ms" IS 'Average time to restore files after incidents';
COMMENT ON COLUMN "org_daily_metrics"."bytes_saved" IS 'Total bytes saved by SnapBack snapshots';
COMMENT ON COLUMN "org_daily_metrics"."features_used" IS 'Map of feature names to usage counts';
COMMENT ON COLUMN "org_daily_metrics"."client_versions" IS 'Map of client versions to active user counts';