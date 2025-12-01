-- Create rule_violations table
CREATE TABLE IF NOT EXISTS "rule_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"rule_category" text,
	"file_path" text,
	"line_start" integer,
	"line_end" integer,
	"character_start" integer,
	"character_end" integer,
	"severity" text NOT NULL,
	"confidence" integer,
	"match_text" text,
	"pattern" text,
	"description" text,
	"remediation" text,
	"remediation_link" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"client_type" text,
	"client_version" text,
	"ide_version" text,
	"git_branch" text,
	"git_commit" text,
	"project_id" text,
	"workspace_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "rule_violations_user_id_idx" ON "rule_violations" ("user_id");
CREATE INDEX IF NOT EXISTS "rule_violations_api_key_id_idx" ON "rule_violations" ("api_key_id");
CREATE INDEX IF NOT EXISTS "rule_violations_rule_id_idx" ON "rule_violations" ("rule_id");
CREATE INDEX IF NOT EXISTS "rule_violations_severity_idx" ON "rule_violations" ("severity");
CREATE INDEX IF NOT EXISTS "rule_violations_timestamp_idx" ON "rule_violations" ("timestamp");