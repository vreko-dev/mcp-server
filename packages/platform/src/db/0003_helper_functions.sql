-- Helper functions

-- Refresh materialized views (call this periodically)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_features;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_cohorts;
END;
$$ LANGUAGE plpgsql;

-- Reset usage counters at period start
CREATE OR REPLACE FUNCTION reset_usage_counters()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET 
    requests_this_period = 0,
    tokens_this_period = 0,
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month'
  WHERE current_period_end <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Aggregate daily stats (call this nightly)
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_stats_daily (
    user_id, 
    date,
    total_requests,
    total_tokens,
    successful_requests,
    failed_requests,
    avg_response_time_ms,
    endpoints_used
  )
  SELECT 
    user_id,
    target_date,
    COUNT(*) as total_requests,
    SUM(tokens_used) as total_tokens,
    COUNT(*) FILTER (WHERE response_status < 400) as successful_requests,
    COUNT(*) FILTER (WHERE response_status >= 400) as failed_requests,
    AVG(response_time_ms)::INTEGER as avg_response_time_ms,
    jsonb_object_agg(endpoint, COUNT(*)) as endpoints_used
  FROM api_usage_logs
  WHERE created_at::date = target_date
  GROUP BY user_id
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_requests = EXCLUDED.total_requests,
    total_tokens = EXCLUDED.total_tokens,
    successful_requests = EXCLUDED.successful_requests,
    failed_requests = EXCLUDED.failed_requests,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    endpoints_used = EXCLUDED.endpoints_used,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;