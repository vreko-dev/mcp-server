-- Create api_keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"permissions" text[] DEFAULT '{}'::text[],
	"revoked" boolean DEFAULT false,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);

-- Create api_key_usage table
CREATE TABLE IF NOT EXISTS "api_key_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"request_count" integer DEFAULT 1,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_revoked_idx" ON "api_keys" ("revoked");
CREATE INDEX IF NOT EXISTS "api_key_usage_api_key_id_idx" ON "api_key_usage" ("api_key_id");
CREATE INDEX IF NOT EXISTS "api_key_usage_endpoint_idx" ON "api_key_usage" ("endpoint");
CREATE INDEX IF NOT EXISTS "api_key_usage_timestamp_idx" ON "api_key_usage" ("timestamp");