CREATE TABLE "checkpoint_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL,
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
CREATE TABLE "checkpoints" (
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
ALTER TABLE "checkpoint_files" ADD CONSTRAINT "checkpoint_files_checkpoint_id_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."checkpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;