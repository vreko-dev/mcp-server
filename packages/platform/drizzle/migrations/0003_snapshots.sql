-- Snapshots table - Privacy-first metadata storage
CREATE TABLE IF NOT EXISTS "snapshots" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"name" text,
	"description" text,
	"trigger" text NOT NULL,
	"file_count" integer NOT NULL DEFAULT 0,
	"total_size_bytes" integer NOT NULL DEFAULT 0,
	"file_hashes" jsonb DEFAULT '[]'::jsonb,
	"git_branch" text,
	"git_commit" text,
	"git_dirty" boolean DEFAULT false,
	"risk_score" integer,
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"project_path" text,
	"workspace_id" text,
	"cloud_backup_enabled" boolean DEFAULT false,
	"cloud_backup_url" text,
	"encryption_key_id" text,
	"encrypted_data_key" text,
	"encryption_algorithm" text DEFAULT 'AES-256-GCM',
	"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "snapshots_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE,
	CONSTRAINT "snapshots_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "api_keys" ("id") ON DELETE CASCADE
);

-- Snapshot files table - Individual file metadata
CREATE TABLE IF NOT EXISTS "snapshot_files" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"snapshot_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"file_hash" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"change_type" text,
	"lines_changed" integer,
	"contains_secrets" boolean DEFAULT false,
	"risk_level" text,
	"cloud_backup_url" text,
	"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "snapshot_files_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots" ("id") ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS "snapshots_user_id_idx" ON "snapshots" ("user_id");
CREATE INDEX IF NOT EXISTS "snapshots_api_key_id_idx" ON "snapshots" ("api_key_id");
CREATE INDEX IF NOT EXISTS "snapshots_created_at_idx" ON "snapshots" ("created_at");
CREATE INDEX IF NOT EXISTS "snapshots_expires_at_idx" ON "snapshots" ("expires_at");
CREATE INDEX IF NOT EXISTS "snapshots_workspace_id_idx" ON "snapshots" ("workspace_id");
-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS "idx_snap_ws_time" ON "snapshots" ("workspace_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "snapshot_files_snapshot_id_idx" ON "snapshot_files" ("snapshot_id");
CREATE INDEX IF NOT EXISTS "snapshot_files_file_path_idx" ON "snapshot_files" ("file_path");
