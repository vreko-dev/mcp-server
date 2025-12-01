-- Populate session summary fields for existing sessions
-- This migration will set default values for the new summary fields

-- Set default values for existing sessions
UPDATE "extension_sessions" 
SET 
    "highest_severity" = 'low',
    "ai_present" = false,
    "issues_by_type" = '{}'::jsonb,
    "bytes_saved" = 0
WHERE 
    "highest_severity" IS NULL;