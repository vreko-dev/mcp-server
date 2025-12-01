-- Migration: 0009_create_extension_link_tokens.sql
-- Purpose: Create table for short-lived one-time link tokens for extension authentication
-- MVP Scope: Only supports client='vscode'

CREATE TABLE IF NOT EXISTS extension_link_tokens (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255), -- References organization.id (nullable for MVP)
  client TEXT NOT NULL CHECK (client IN ('vscode', 'cli', 'mcp')),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast active token lookup
-- Partial index to only index unused, non-expired tokens
CREATE INDEX idx_extension_link_tokens_hash
  ON extension_link_tokens(token_hash)
  WHERE used = FALSE AND expires_at > NOW();

-- Index for cleanup jobs (Phase 2)
CREATE INDEX idx_extension_link_tokens_expiry
  ON extension_link_tokens(expires_at);

-- Comment for documentation
COMMENT ON TABLE extension_link_tokens IS 'Short-lived one-time tokens for initiating extension linking flow (5 minute TTL)';
COMMENT ON COLUMN extension_link_tokens.token_hash IS 'SHA-256 hash of raw link token (64 hex chars)';
COMMENT ON COLUMN extension_link_tokens.client IS 'Client identifier (vscode, cli, or mcp)';
COMMENT ON COLUMN extension_link_tokens.used IS 'Whether token has been exchanged (enforces one-time use)';
