-- Create partitioned tables and materialized views

-- Create partitions for api_usage_logs
CREATE TABLE IF NOT EXISTS api_usage_logs_2025_10 PARTITION OF api_usage_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS api_usage_logs_2025_11 PARTITION OF api_usage_logs
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Create partitions for feature_usage
CREATE TABLE IF NOT EXISTS feature_usage_2025_10 PARTITION OF feature_usage
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Create partitions for error_logs
CREATE TABLE IF NOT EXISTS error_logs_2025_10 PARTITION OF error_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Create materialized views
-- Daily active users
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_active_users AS
SELECT 
  date_trunc('day', created_at)::date as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(*) as total_requests,
  AVG(response_time_ms)::INTEGER as avg_response_time,
  COUNT(*) FILTER (WHERE response_status >= 500) as server_errors,
  COUNT(*) FILTER (WHERE response_status >= 400 AND response_status < 500) as client_errors
FROM api_usage_logs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_active_users_date_idx ON mv_daily_active_users(date);

-- Popular features
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_features AS
SELECT 
  feature_name,
  feature_category,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(duration_ms)::INTEGER as avg_duration,
  (COUNT(*) FILTER (WHERE success = TRUE)::FLOAT / COUNT(*)::FLOAT * 100)::NUMERIC(5,2) as success_rate
FROM feature_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature_name, feature_category
ORDER BY usage_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_popular_features_name_idx ON mv_popular_features(feature_name);

-- User cohorts (signup month)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_cohorts AS
SELECT 
  date_trunc('month', u.created_at)::date as cohort_month,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE s.plan != 'free') as paid_users,
  (COUNT(*) FILTER (WHERE s.plan != 'free')::FLOAT / COUNT(*)::FLOAT * 100)::NUMERIC(5,2) as conversion_rate,
  AVG(s.amount_cents) FILTER (WHERE s.plan != 'free') as avg_revenue_cents
FROM "user" u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.created_at >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', u.created_at)
ORDER BY cohort_month DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_user_cohorts_month_idx ON mv_user_cohorts(cohort_month);