-- Daily Metrics Materialized View for Telemetry Data
-- This view aggregates daily metrics from all telemetry tables for dashboard queries

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_metrics AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(*) FILTER (WHERE accepted = true) AS accepted_suggestions,
  COUNT(*) FILTER (WHERE dismissed = true) AS dismissed_suggestions,
  COUNT(*) AS total_suggestions,
  AVG(time_to_edit_ms) FILTER (WHERE time_to_edit_ms IS NOT NULL) AS avg_time_to_edit_ms
FROM (
  SELECT user_id, timestamp, accepted, dismissed, NULL::integer AS time_to_edit_ms
  FROM agent_suggestions
  UNION ALL
  SELECT user_id, timestamp, NULL AS accepted, NULL AS dismissed, time_to_edit_ms
  FROM post_accept_outcomes
) AS combined_events
GROUP BY DATE_TRUNC('day', timestamp);

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS daily_metrics_date_idx ON daily_metrics (date);

COMMENT ON MATERIALIZED VIEW daily_metrics IS 'Pre-aggregated daily telemetry metrics for dashboard queries';

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics;
END;
$$;

COMMENT ON FUNCTION refresh_daily_metrics IS 'Refresh daily metrics view without blocking reads';