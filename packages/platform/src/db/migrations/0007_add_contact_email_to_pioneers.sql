-- Migration: Add contact_email to pioneers table
-- Purpose: Capture preferred contact email (may differ from GitHub email)
-- Date: 2025-12-18

ALTER TABLE pioneers ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN pioneers.contact_email IS 'Preferred contact email for Pioneer updates (may differ from GitHub OAuth email)';
