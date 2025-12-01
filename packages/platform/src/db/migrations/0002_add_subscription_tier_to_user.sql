-- Add subscription_tier column to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "subscription_tier" plan_type DEFAULT 'free';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "user_subscription_tier_idx" ON "user" ("subscription_tier");