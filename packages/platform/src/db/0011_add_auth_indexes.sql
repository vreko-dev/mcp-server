-- Migration: Add Missing Indexes on session.userId and account.userId
-- Priority: H-01 (High)
-- Impact: Improves performance for session lookups, user deletions, and auth queries
--
-- These indexes are critical for Better Auth performance:
-- 1. session.userId - Used for:
--    - User session lookups (frequent)
--    - Cascading deletes when user is deleted
--    - Session cleanup queries
--
-- 2. account.userId - Used for:
--    - OAuth account lookups (frequent)
--    - Cascading deletes when user is deleted
--    - Account linking queries

-- Add index on session.userId for faster user session lookups
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session"("userId");

-- Add index on account.userId for faster OAuth account lookups
CREATE INDEX IF NOT EXISTS "account_user_idx" ON "account"("userId");

-- Add composite index for account provider lookups (common query pattern)
CREATE INDEX IF NOT EXISTS "account_provider_user_idx" ON "account"("providerId", "userId");
