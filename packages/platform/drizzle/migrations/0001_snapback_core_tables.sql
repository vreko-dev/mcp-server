-- Create analysis_events table
CREATE TABLE IF NOT EXISTS "analysis_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"session_id" text,
	"request_id" text NOT NULL,
	"file_path" text,
	"line_start" integer,
	"line_end" integer,
	"character_start" integer,
	"character_end" integer,
	"risk_score" integer,
	"risk_level" text,
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"detected_patterns" jsonb DEFAULT '[]'::jsonb,
	"analysis_time_ms" integer,
	"file_size_bytes" integer,
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
 ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "analysis_events_user_id_idx" ON "analysis_events" ("user_id");
CREATE INDEX IF NOT EXISTS "analysis_events_api_key_id_idx" ON "analysis_events" ("api_key_id");
CREATE INDEX IF NOT EXISTS "analysis_events_timestamp_idx" ON "analysis_events" ("timestamp");
CREATE INDEX IF NOT EXISTS "analysis_events_risk_score_idx" ON "analysis_events" ("risk_score");
CREATE INDEX IF NOT EXISTS "analysis_events_client_type_idx" ON "analysis_events" ("client_type");