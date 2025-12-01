-- Migration: Auth Security - RLS Policies & Audit Logging
-- Created: 2025-11-12
-- Purpose: Implement tenant isolation via RLS and audit logging for Better Auth

-- ============================================================================
-- AUDIT LOGS TABLE (Append-Only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organization(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Make table append-only (no updates/deletes except by superuser)
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
-- Grant only INSERT and SELECT to app users
-- GRANT INSERT, SELECT ON audit_logs TO app_user; -- Uncomment when app_user role exists

-- ============================================================================
-- RLS TENANT ISOLATION
-- ============================================================================

-- Enable RLS on organization-scoped tables
ALTER TABLE organization_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitation ENABLE ROW LEVEL SECURITY;

-- Note: Add RLS to other org-scoped tables as needed:
-- ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: organization_member
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "org_members_select" ON organization_member;
DROP POLICY IF EXISTS "org_members_insert" ON organization_member;
DROP POLICY IF EXISTS "org_members_update" ON organization_member;
DROP POLICY IF EXISTS "org_members_delete" ON organization_member;

-- SELECT: User can view members of their active organization
CREATE POLICY "org_members_select"
  ON organization_member FOR SELECT
  USING (
    organization_id = current_setting('app.current_org', true)::TEXT
    OR user_id::TEXT = current_setting('app.current_user', true)
  );

-- INSERT: Only admins/owners can add members
CREATE POLICY "org_members_insert"
  ON organization_member FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_org', true)::TEXT
    AND EXISTS (
      SELECT 1 FROM organization_member
      WHERE organization_id = current_setting('app.current_org', true)::TEXT
        AND user_id::TEXT = current_setting('app.current_user', true)
        AND role IN ('admin', 'owner')
    )
  );

-- UPDATE: Only admins/owners can update member roles
CREATE POLICY "org_members_update"
  ON organization_member FOR UPDATE
  USING (
    organization_id = current_setting('app.current_org', true)::TEXT
    AND EXISTS (
      SELECT 1 FROM organization_member
      WHERE organization_id = current_setting('app.current_org', true)::TEXT
        AND user_id::TEXT = current_setting('app.current_user', true)
        AND role IN ('admin', 'owner')
    )
  );

-- DELETE: Only owners can remove members
CREATE POLICY "org_members_delete"
  ON organization_member FOR DELETE
  USING (
    organization_id = current_setting('app.current_org', true)::TEXT
    AND EXISTS (
      SELECT 1 FROM organization_member
      WHERE organization_id = current_setting('app.current_org', true)::TEXT
        AND user_id::TEXT = current_setting('app.current_user', true)
        AND role = 'owner'
    )
  );

-- ============================================================================
-- RLS POLICIES: organization_invitation
-- ============================================================================

DROP POLICY IF EXISTS "org_invitations_select" ON organization_invitation;
DROP POLICY IF EXISTS "org_invitations_insert" ON organization_invitation;
DROP POLICY IF EXISTS "org_invitations_update" ON organization_invitation;
DROP POLICY IF EXISTS "org_invitations_delete" ON organization_invitation;

-- SELECT: User can view invitations for their organization or their own email
CREATE POLICY "org_invitations_select"
  ON organization_invitation FOR SELECT
  USING (
    organization_id = current_setting('app.current_org', true)::TEXT
    OR email = current_setting('app.current_user_email', true)
  );

-- INSERT: Only admins/owners can create invitations
CREATE POLICY "org_invitations_insert"
  ON organization_invitation FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_org', true)::TEXT
    AND EXISTS (
      SELECT 1 FROM organization_member
      WHERE organization_id = current_setting('app.current_org', true)::TEXT
        AND user_id::TEXT = current_setting('app.current_user', true)
        AND role IN ('admin', 'owner')
    )
  );

-- UPDATE: Only admins/owners can update invitations (e.g., resend, revoke)
CREATE POLICY "org_invitations_update"
  ON organization_invitation FOR UPDATE
  USING (
    organization_id = current_setting('app.current_org', true)::TEXT
    AND EXISTS (
      SELECT 1 FROM organization_member
      WHERE organization_id = current_setting('app.current_org', true)::TEXT
        AND user_id::TEXT = current_setting('app.current_user', true)
        AND role IN ('admin', 'owner')
    )
  );

-- DELETE: Only admins/owners can delete invitations
CREATE POLICY "org_invitations_delete"
  ON organization_invitation FOR DELETE
  USING (
    organization_id = current_setting('app.current_org', true)::TEXT
    AND EXISTS (
      SELECT 1 FROM organization_member
      WHERE organization_id = current_setting('app.current_org', true)::TEXT
        AND user_id::TEXT = current_setting('app.current_user', true)
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Set current organization context
-- ============================================================================

CREATE OR REPLACE FUNCTION set_current_org_context(org_id TEXT, user_id TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_org', org_id, false);
  IF user_id IS NOT NULL THEN
    PERFORM set_config('app.current_user', user_id, false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to test RLS)
-- ============================================================================

-- Test 1: Verify RLS is enabled
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('organization_member', 'organization_invitation');

-- Test 2: Set org context and query
-- SELECT set_current_org_context('org-a-uuid', 'user-a-uuid');
-- SELECT * FROM organization_member; -- Should only see org-a members

-- Test 3: Attempt cross-org access
-- SELECT set_current_org_context('org-a-uuid', 'user-a-uuid');
-- SELECT * FROM organization_member WHERE organization_id = 'org-b-uuid'; -- Should return empty

-- Test 4: Check audit logs are append-only
-- UPDATE audit_logs SET event_type = 'modified' WHERE id = '...'; -- Should fail with permission denied

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

-- To disable RLS:
-- ALTER TABLE organization_member DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE organization_invitation DISABLE ROW LEVEL SECURITY;

-- To drop policies:
-- DROP POLICY IF EXISTS "org_members_select" ON organization_member;
-- DROP POLICY IF EXISTS "org_members_insert" ON organization_member;
-- DROP POLICY IF EXISTS "org_members_update" ON organization_member;
-- DROP POLICY IF EXISTS "org_members_delete" ON organization_member;
-- DROP POLICY IF EXISTS "org_invitations_select" ON organization_invitation;
-- DROP POLICY IF EXISTS "org_invitations_insert" ON organization_invitation;
-- DROP POLICY IF EXISTS "org_invitations_update" ON organization_invitation;
-- DROP POLICY IF EXISTS "org_invitations_delete" ON organization_invitation;

-- To drop audit table:
-- DROP TABLE IF EXISTS audit_logs CASCADE;

-- To drop helper function:
-- DROP FUNCTION IF EXISTS set_current_org_context(TEXT, TEXT);

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. This migration assumes Better Auth schema is already applied
-- 2. RLS policies use app.current_org and app.current_user session variables
-- 3. Middleware must call SET LOCAL app.current_org = '<orgId>' per request
-- 4. Audit logs table is append-only for tamper-proof logging
-- 5. Add RLS to additional org-scoped tables as needed (snapshots, etc.)
-- 6. Test RLS with negative tests (attempt cross-org IDOR)
-- 7. Grant INSERT/SELECT on audit_logs to appropriate app user role

-- ============================================================================
-- END MIGRATION
-- ============================================================================
