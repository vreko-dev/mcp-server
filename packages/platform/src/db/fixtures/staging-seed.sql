-- Staging seed data for performance testing
-- This file contains sample data to test query performance against the p95 budget

-- Insert sample users
INSERT INTO "user" ("id", "email", "created_at") VALUES
('user_001', 'test1@example.com', NOW() - INTERVAL '1 day'),
('user_002', 'test2@example.com', NOW() - INTERVAL '2 days'),
('user_003', 'test3@example.com', NOW() - INTERVAL '3 days');

-- Insert sample API keys
INSERT INTO "api_keys" ("id", "user_id", "name", "permissions", "created_at") VALUES
('key_001', 'user_001', 'Test Key 1', ARRAY['read', 'write'], NOW() - INTERVAL '1 day'),
('key_002', 'user_002', 'Test Key 2', ARRAY['read'], NOW() - INTERVAL '2 days'),
('key_003', 'user_003', 'Test Key 3', ARRAY['read', 'write', 'admin'], NOW() - INTERVAL '3 days');

-- Insert sample analysis events
INSERT INTO "analysis_events" ("id", "user_id", "api_key_id", "request_id", "risk_score", "client_type", "timestamp", "created_at")
SELECT 
	gen_random_uuid(),
	'user_00' || (i % 3 + 1)::text,
	'key_00' || (i % 3 + 1)::text,
	'req_' || i::text,
	(i % 100),
	CASE WHEN i % 3 = 0 THEN 'vscode' WHEN i % 3 = 1 THEN 'cli' ELSE 'web' END,
	NOW() - INTERVAL '1 minute' * (i % 1440),
	NOW() - INTERVAL '1 minute' * (i % 1440)
FROM generate_series(1, 10000) AS i;

-- Insert sample agent suggestions
INSERT INTO "agent_suggestions" ("id", "user_id", "api_key_id", "request_id", "suggestion_id", "suggestion_text", "suggestion_type", "accepted", "timestamp", "created_at")
SELECT 
	gen_random_uuid(),
	'user_00' || (i % 3 + 1)::text,
	'key_00' || (i % 3 + 1)::text,
	'req_' || i::text,
	'sug_' || i::text,
	'Suggestion text for item ' || i::text,
	CASE WHEN i % 4 = 0 THEN 'code' WHEN i % 4 = 1 THEN 'refactor' WHEN i % 4 = 2 THEN 'explain' ELSE 'test' END,
	CASE WHEN i % 3 = 0 THEN true ELSE false END,
	NOW() - INTERVAL '1 minute' * (i % 1440),
	NOW() - INTERVAL '1 minute' * (i % 1440)
FROM generate_series(1, 5000) AS i;

-- Insert sample snapshots
INSERT INTO "snapshots" ("id", "user_id", "api_key_id", "workspace_id", "name", "trigger_type", "file_count", "total_size_bytes", "risk_score", "created_at")
SELECT 
	gen_random_uuid(),
	'user_00' || (i % 3 + 1)::text,
	'key_00' || (i % 3 + 1)::text,
	'ws_00' || (i % 5 + 1)::text,
	'Snapshot ' || i::text,
	CASE WHEN i % 3 = 0 THEN 'manual' WHEN i % 3 = 1 THEN 'auto' ELSE 'risk_detection' END,
	(i % 100),
	(i % 1000000),
	(i % 100),
	NOW() - INTERVAL '1 minute' * (i % 1440)
FROM generate_series(1, 2000) AS i;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW "daily_metrics";