-- Migration: Add signing_secret to api_key_metadata table
-- Date: 2025-11-08
-- Description: Adds a dedicated signing secret field for HMAC-SHA256 signature verification

-- Ensure pgcrypto extension is available for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add the signing_secret column (allowing NULL temporarily for backfill)
ALTER TABLE api_key_metadata
ADD COLUMN signing_secret TEXT;

-- Backfill existing records with cryptographically random secrets
-- This uses pgcrypto's gen_random_bytes to generate 32-byte (256-bit) secrets
UPDATE api_key_metadata
SET signing_secret = encode(gen_random_bytes(32), 'hex')
WHERE signing_secret IS NULL;

-- Make the column NOT NULL after backfill
ALTER TABLE api_key_metadata
ALTER COLUMN signing_secret SET NOT NULL;

-- Note: No index on signing_secret - it's only used for HMAC verification after
-- looking up by api_key_id. An index here would be wasteful and could facilitate timing attacks.

-- Add comment for documentation
COMMENT ON COLUMN api_key_metadata.signing_secret IS 'HMAC-SHA256 signing secret (256-bit) for request signature verification';
