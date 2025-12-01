CREATE TABLE "device_trials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_fingerprint" text NOT NULL,
	"api_key_id" text NOT NULL,
	"snapshots_used" integer DEFAULT 0 NOT NULL,
	"api_calls_used" integer DEFAULT 0 NOT NULL,
	"snapshot_limit" integer DEFAULT 50 NOT NULL,
	"api_call_limit" integer DEFAULT 10000 NOT NULL,
	"user_id" text,
	"converted_at" timestamp,
	"install_count" integer DEFAULT 1 NOT NULL,
	"blocked_until" timestamp,
	"last_seen_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_trials_device_fingerprint_unique" UNIQUE("device_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "snapshot_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"file_hash" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"change_type" text,
	"lines_changed" integer,
	"contains_secrets" boolean DEFAULT false,
	"risk_level" text,
	"cloud_backup_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"name" text,
	"description" text,
	"trigger" text NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"total_size_bytes" integer DEFAULT 0 NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
DROP TABLE "checkpoint_files" CASCADE;--> statement-breakpoint
DROP TABLE "checkpoints" CASCADE;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD COLUMN "snapshots_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD COLUMN "snapshots_limit" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "totalSnapshots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "device_trials" ADD CONSTRAINT "device_trials_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_trials" ADD CONSTRAINT "device_trials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_files" ADD CONSTRAINT "snapshot_files_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_fingerprint_idx" ON "device_trials" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_user_idx" ON "device_trials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_blocked_idx" ON "device_trials" USING btree ("blocked_until");--> statement-breakpoint
ALTER TABLE "usage_limits" DROP COLUMN "checkpoints_used";--> statement-breakpoint
ALTER TABLE "usage_limits" DROP COLUMN "checkpoints_limit";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "totalCheckpoints";