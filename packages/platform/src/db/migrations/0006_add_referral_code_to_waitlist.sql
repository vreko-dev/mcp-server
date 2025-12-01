-- Migration: Add referralCode field to waitlist table
-- This field stores cryptographically secure referral codes (nanoid)
-- Used for referral tracking system

-- Add referral_code column
ALTER TABLE waitlist
ADD COLUMN referral_code text;

-- Backfill existing entries with generated codes
-- (In production, you may want to do this in batches)
UPDATE waitlist
SET referral_code = gen_random_uuid()::text
WHERE referral_code IS NULL;

-- Now make it NOT NULL after backfilling
ALTER TABLE waitlist
ALTER COLUMN referral_code SET NOT NULL;

-- Add unique constraint
ALTER TABLE waitlist
ADD CONSTRAINT waitlist_referral_code_unique UNIQUE (referral_code);

-- Create index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_referral_code_idx ON waitlist(referral_code);
