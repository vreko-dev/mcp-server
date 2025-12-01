-- Create device_trials table for anonymous VSCode extension trials
-- Progressive funnel: device → email → payment

CREATE TABLE IF NOT EXISTS "device_trials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  -- Device Identity (from VSCode machineId)
  "device_fingerprint" text NOT NULL UNIQUE,

  -- API Key for this device trial
  "api_key_id" text NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,

  -- Usage Tracking
  "checkpoints_used" integer NOT NULL DEFAULT 0,
  "api_calls_used" integer NOT NULL DEFAULT 0,

  -- Limits (increase on conversion)
  "checkpoint_limit" integer NOT NULL DEFAULT 50,
  "api_call_limit" integer NOT NULL DEFAULT 10000,

  -- User Conversion (null until email signup)
  "user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
  "converted_at" timestamp,

  -- Abuse Prevention
  "install_count" integer NOT NULL DEFAULT 1,
  "blocked_until" timestamp,

  -- Timestamps
  "last_seen_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Index for fast fingerprint lookups
CREATE UNIQUE INDEX IF NOT EXISTS "device_trials_fingerprint_idx" ON "device_trials"("device_fingerprint");

-- Index for finding all devices for a user
CREATE INDEX IF NOT EXISTS "device_trials_user_idx" ON "device_trials"("user_id") WHERE "user_id" IS NOT NULL;

-- Index for checking blocked devices
CREATE INDEX IF NOT EXISTS "device_trials_blocked_idx" ON "device_trials"("blocked_until") WHERE "blocked_until" IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE "device_trials" IS 'Tracks anonymous VSCode extension trials using device fingerprints. Enables progressive authentication: device → email → payment.';
COMMENT ON COLUMN "device_trials"."device_fingerprint" IS 'Hashed VSCode machineId for privacy-preserving device identity';
COMMENT ON COLUMN "device_trials"."checkpoint_limit" IS 'Trial: 50, Email signup: 1000, Paid: unlimited';
COMMENT ON COLUMN "device_trials"."install_count" IS 'Tracks reinstalls. Blocks after 3 reinstalls within 24h';
COMMENT ON COLUMN "device_trials"."blocked_until" IS 'Null = not blocked. Set to 24h from now after 3 reinstalls';
