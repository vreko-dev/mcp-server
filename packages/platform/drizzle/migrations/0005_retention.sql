-- Create retention_config table
CREATE TABLE IF NOT EXISTS "retention_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"retention_days" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "retention_config_table_name_idx" ON "retention_config" ("table_name");
CREATE INDEX IF NOT EXISTS "retention_config_is_enabled_idx" ON "retention_config" ("is_enabled");