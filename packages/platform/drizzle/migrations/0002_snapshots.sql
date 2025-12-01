-- Create snapshots table
CREATE TABLE IF NOT EXISTS "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"workspace_id" text,
	"name" text,
	"description" text,
	"trigger_type" text,
	"file_count" integer DEFAULT 0,
	"total_size_bytes" integer DEFAULT 0,
	"risk_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_snap_ws_time" ON "snapshots" ("workspace_id", "created_at" DESC);