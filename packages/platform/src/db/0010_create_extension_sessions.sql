-- Migration: 0010_create_extension_sessions.sql
-- Purpose: Create table for long-lived refresh tokens for extension authentication
-- MVP Scope: Only supports client='vscode', no revocation UI yet

CREATE TABLE IF NOT EXISTS extension_sessions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255), -- References organization.id (nullable for MVP)
  client TEXT NOT NULL CHECK (client IN ('vscode', 'cli', 'mcp')),
  refresh_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  metadata JSONB -- { extensionVersion, vscodeVersion, platform, hostname }
);

-- Unique index for fast refresh token lookup
-- Partial index to only index non-revoked sessions
CREATE UNIQUE INDEX idx_extension_sessions_refresh_hash
  ON extension_sessions(refresh_token_hash)
  WHERE revoked_at IS NULL;

-- Index for user session queries (Phase 2 session management UI)
CREATE INDEX idx_extension_sessions_user
  ON extension_sessions(user_id)
  WHERE revoked_at IS NULL;

-- Index for active session queries
CREATE INDEX idx_extension_sessions_active
  ON extension_sessions(user_id, revoked_at)
  WHERE revoked_at IS NULL AND expires_at > NOW();

-- Comment for documentation
COMMENT ON TABLE extension_sessions IS 'Long-lived refresh tokens for extension authentication (90 day TTL)';
COMMENT ON COLUMN extension_sessions.refresh_token_hash IS 'SHA-256 hash of refresh token (80 hex chars)';
COMMENT ON COLUMN extension_sessions.client IS 'Client identifier (vscode, cli, or mcp)';
COMMENT ON COLUMN extension_sessions.revoked_at IS 'Session revocation timestamp (NULL = active)';
COMMENT ON COLUMN extension_sessions.metadata IS 'Device information: extensionVersion, vscodeVersion, platform, hostname';
