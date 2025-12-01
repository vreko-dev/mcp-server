-- Migration: Add signing_secret to api_keys table
-- Date: 2025-01-15
-- Description: Adds a dedicated signing secret field for HMAC-SHA256 signature verification

-- Ensure pgcrypto extension is available for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add the signing_secret column (allowing NULL temporarily for backfill)
ALTER TABLE api_keys ADD COLUMN signing_secret TEXT;

-- Generate cryptographic secret for existing keys
UPDATE api_keys
SET signing_secret = encode(gen_random_bytes(32), 'hex')
WHERE signing_secret IS NULL;

-- Make required
ALTER TABLE api_keys ALTER COLUMN signing_secret SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_api_keys_signing_secret ON api_keys(signing_secret);
