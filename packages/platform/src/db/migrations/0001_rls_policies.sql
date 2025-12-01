-- Enable Row Level Security on waitlist tables
-- Generated: 2025-01-12
-- NOTE: This migration assumes application-level auth context via current_setting()
-- The application must set session variables before queries:
--   SET LOCAL app.current_user_id = 'user-id';
--   SET LOCAL app.current_user_email = 'user@example.com';
--   SET LOCAL app.current_org_id = 'org-id';

-- Enable RLS on waitlist table
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Enable RLS on waitlist_referrals table
ALTER TABLE waitlist_referrals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on waitlist_tasks table
ALTER TABLE waitlist_tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on waitlist_audit_logs table
ALTER TABLE waitlist_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own waitlist entry
-- Uses application-level session context
CREATE POLICY "Users can view own waitlist entry" ON waitlist
FOR SELECT
USING (
  email = current_setting('app.current_user_email', true)::text
);

-- Policy: Service role can insert into waitlist (for signup flow)
-- Anyone can join waitlist, but RLS enforced on SELECT
CREATE POLICY "Anyone can join waitlist" ON waitlist
FOR INSERT
WITH CHECK (true);

-- Policy: Users can only update their own entry
CREATE POLICY "Users can update own waitlist entry" ON waitlist
FOR UPDATE
USING (
  email = current_setting('app.current_user_email', true)::text
);

-- Policy: Service role has full access (bypass RLS for admin operations)
-- This policy applies when app.bypass_rls = 'true' is set
CREATE POLICY "Service role has full access to waitlist" ON waitlist
FOR ALL
USING (
  current_setting('app.bypass_rls', true)::text = 'true'
);

-- Referrals policies
CREATE POLICY "Users can view their referrals" ON waitlist_referrals
FOR SELECT
USING (
  referrer_id IN (
    SELECT id FROM waitlist
    WHERE email = current_setting('app.current_user_email', true)::text
  )
);

CREATE POLICY "Service role can create referrals" ON waitlist_referrals
FOR INSERT
WITH CHECK (
  current_setting('app.bypass_rls', true)::text = 'true'
);

-- Tasks policies
CREATE POLICY "Users can view their tasks" ON waitlist_tasks
FOR SELECT
USING (
  waitlist_id IN (
    SELECT id FROM waitlist
    WHERE email = current_setting('app.current_user_email', true)::text
  )
);

CREATE POLICY "Users can update their tasks" ON waitlist_tasks
FOR UPDATE
USING (
  waitlist_id IN (
    SELECT id FROM waitlist
    WHERE email = current_setting('app.current_user_email', true)::text
  )
);

CREATE POLICY "Service role can manage tasks" ON waitlist_tasks
FOR ALL
USING (
  current_setting('app.bypass_rls', true)::text = 'true'
);

-- Audit logs policies (read-only for users)
CREATE POLICY "Users can view their audit logs" ON waitlist_audit_logs
FOR SELECT
USING (
  waitlist_id IN (
    SELECT id FROM waitlist
    WHERE email = current_setting('app.current_user_email', true)::text
  )
);

CREATE POLICY "Service role can insert audit logs" ON waitlist_audit_logs
FOR INSERT
WITH CHECK (
  current_setting('app.bypass_rls', true)::text = 'true'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email_lookup ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status_position ON waitlist(status, queue_position);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_lookup ON waitlist_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_waitlist_time ON waitlist_audit_logs(waitlist_id, created_at DESC);

-- Grant permissions (assuming 'authenticated' and 'service_role' roles exist)
-- If using different role names, adjust accordingly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON waitlist TO authenticated;
    GRANT SELECT ON waitlist_referrals TO authenticated;
    GRANT SELECT ON waitlist_tasks TO authenticated;
    GRANT SELECT ON waitlist_audit_logs TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON waitlist TO service_role;
    GRANT ALL ON waitlist_referrals TO service_role;
    GRANT ALL ON waitlist_tasks TO service_role;
    GRANT ALL ON waitlist_audit_logs TO service_role;
  END IF;
END $$;
