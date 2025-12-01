-- Enable TimescaleDB extension (if available in Supabase)
-- Note: TimescaleDB is not available in free Supabase tiers
-- This will be a no-op if TimescaleDB is not available
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable other useful extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Convert analysis_events table to a hypertable for time-series performance
-- This will be a no-op if TimescaleDB is not available
SELECT create_hypertable('analysis_events', 'timestamp', if_not_exists => true);

-- Create function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables that have updated_at columns
-- user_safety_profiles table
DROP TRIGGER IF EXISTS update_user_safety_profiles_updated_at ON user_safety_profiles;
CREATE TRIGGER update_user_safety_profiles_updated_at 
    BEFORE UPDATE ON user_safety_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- code_contexts table
DROP TRIGGER IF EXISTS update_code_contexts_updated_at ON code_contexts;
CREATE TRIGGER update_code_contexts_updated_at 
    BEFORE UPDATE ON code_contexts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- workspace_settings table
DROP TRIGGER IF EXISTS update_workspace_settings_updated_at ON workspace_settings;
CREATE TRIGGER update_workspace_settings_updated_at 
    BEFORE UPDATE ON workspace_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies for sensitive tables
-- Note: These are examples and should be customized based on your security requirements

-- Enable RLS on analysis_events table
ALTER TABLE analysis_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own analysis events
CREATE POLICY "Users can view their own analysis events" 
    ON analysis_events 
    FOR SELECT 
    USING (user_id = auth.uid());

-- Create policy to allow users to insert their own analysis events
CREATE POLICY "Users can insert their own analysis events" 
    ON analysis_events 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Enable RLS on rule_violations table
ALTER TABLE rule_violations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own rule violations
CREATE POLICY "Users can view their own rule violations" 
    ON rule_violations 
    FOR SELECT 
    USING (user_id = auth.uid());

-- Create policy to allow users to insert their own rule violations
CREATE POLICY "Users can insert their own rule violations" 
    ON rule_violations 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Enable RLS on bypass_events table
ALTER TABLE bypass_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own bypass events
CREATE POLICY "Users can view their own bypass events" 
    ON bypass_events 
    FOR SELECT 
    USING (user_id = auth.uid());

-- Create policy to allow users to insert their own bypass events
CREATE POLICY "Users can insert their own bypass events" 
    ON bypass_events 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Enable RLS on suppression_patterns table
ALTER TABLE suppression_patterns ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own suppression patterns
CREATE POLICY "Users can view their own suppression patterns" 
    ON suppression_patterns 
    FOR SELECT 
    USING (user_id = auth.uid());

-- Create policy to allow users to insert their own suppression patterns
CREATE POLICY "Users can insert their own suppression patterns" 
    ON suppression_patterns 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Create indexes for better query performance on frequently queried columns
-- These are additional indexes beyond what Drizzle ORM defines

-- Index on analysis_events for risk score queries
CREATE INDEX IF NOT EXISTS idx_analysis_events_risk_score_user 
    ON analysis_events (user_id, risk_score);

-- Index on analysis_events for client type queries
CREATE INDEX IF NOT EXISTS idx_analysis_events_client_type_user 
    ON analysis_events (user_id, client_type);

-- Index on rule_violations for severity queries
CREATE INDEX IF NOT EXISTS idx_rule_violations_severity_user 
    ON rule_violations (user_id, severity);

-- Index on rule_violations for rule category queries
CREATE INDEX IF NOT EXISTS idx_rule_violations_category_user 
    ON rule_violations (user_id, rule_category);

-- Index on bypass_events for risk level queries
CREATE INDEX IF NOT EXISTS idx_bypass_events_risk_level_user 
    ON bypass_events (user_id, risk_level);

-- Index on suppression_patterns for active patterns
CREATE INDEX IF NOT EXISTS idx_suppression_patterns_active_user 
    ON suppression_patterns (user_id, is_active);

-- Index on user_safety_profiles for risk score queries
CREATE INDEX IF NOT EXISTS idx_user_safety_profiles_risk_score 
    ON user_safety_profiles (user_id, average_risk_score);

-- Create a view for dashboard metrics
CREATE OR REPLACE VIEW user_dashboard_metrics AS
SELECT 
    user_id,
    COUNT(*) as total_analyses,
    COUNT(CASE WHEN risk_score >= 80 THEN 1 END) as high_risk_analyses,
    COUNT(CASE WHEN risk_score >= 50 AND risk_score < 80 THEN 1 END) as medium_risk_analyses,
    COUNT(CASE WHEN risk_score < 50 THEN 1 END) as low_risk_analyses,
    AVG(risk_score) as avg_risk_score,
    MAX(timestamp) as last_analysis_at
FROM analysis_events
GROUP BY user_id;

-- Create a function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(target_user_id TEXT)
RETURNS TABLE(
    total_analyses BIGINT,
    high_risk_analyses BIGINT,
    medium_risk_analyses BIGINT,
    low_risk_analyses BIGINT,
    avg_risk_score NUMERIC,
    last_analysis TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN risk_score >= 80 THEN 1 END) as high_risk_analyses,
        COUNT(CASE WHEN risk_score >= 50 AND risk_score < 80 THEN 1 END) as medium_risk_analyses,
        COUNT(CASE WHEN risk_score < 50 THEN 1 END) as low_risk_analyses,
        COALESCE(AVG(risk_score), 0) as avg_risk_score,
        MAX(timestamp) as last_analysis
    FROM analysis_events
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old analysis events (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analysis_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analysis_events 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;