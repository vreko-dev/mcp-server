-- Migration: Rename 'solo' tier to 'pro'
-- Date: 2025-12-05
-- Description: Updates subscription tier naming to align with new pricing strategy

BEGIN;

-- Update existing subscriptions from 'solo' to 'pro'
UPDATE subscriptions SET plan = 'pro' WHERE plan = 'solo';

-- Update user subscription_tier column if it exists
UPDATE "user" SET subscription_tier = 'pro' WHERE subscription_tier = 'solo';

-- Note: PostgreSQL enum rename requires dropping and recreating the type
-- This is handled automatically by Drizzle ORM migrations

COMMIT;
