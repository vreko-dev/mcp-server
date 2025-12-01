-- Add missing indexes and constraints for SnapBack schema

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral ON user_profiles(referral_code);

-- API key metadata indexes
CREATE INDEX IF NOT EXISTS idx_api_key_metadata_key ON api_key_metadata(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_metadata_user ON api_key_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_metadata_active ON api_key_metadata(is_active, expires_at);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions(current_period_start, current_period_end);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_date ON api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON api_usage_logs(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_id ON api_usage_logs(request_id);

-- Usage stats indexes
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON usage_stats_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats_daily(date DESC);

-- Feature usage indexes
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_date ON feature_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_category ON feature_usage(feature_category, created_at DESC);

-- Rate limit violations indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user ON rate_limit_violations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_date ON rate_limit_violations(created_at DESC);

-- Error logs indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_request ON error_logs(request_id);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source, source_id);

-- Add missing constraints
ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_user_id_unique UNIQUE (team_id, user_id);