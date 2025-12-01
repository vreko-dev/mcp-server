-- Create materialized view for daily metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS "daily_metrics" AS
SELECT
	DATE("created_at") AS "date",
	COUNT(*) AS "total_events",
	COUNT(DISTINCT "user_id") AS "unique_users",
	COUNT(DISTINCT "api_key_id") AS "active_api_keys",
	AVG("risk_score") AS "avg_risk_score",
	COUNT(DISTINCT "workspace_id") AS "active_workspaces"
FROM "analysis_events"
WHERE "created_at" >= NOW() - INTERVAL '30 days'
GROUP BY DATE("created_at")
ORDER BY "date" DESC;

-- Create indexes for the materialized view
CREATE INDEX IF NOT EXISTS "daily_metrics_date_idx" ON "daily_metrics" ("date");

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION "refresh_daily_metrics"()
RETURNS VOID AS $$
BEGIN
	REFRESH MATERIALIZED VIEW "daily_metrics";
END;
$$ LANGUAGE plpgsql;