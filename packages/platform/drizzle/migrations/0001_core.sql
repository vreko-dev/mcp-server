-- Create agent_suggestions table
CREATE TABLE IF NOT EXISTS "agent_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"session_id" text,
	"request_id" text NOT NULL,
	"suggestion_id" text NOT NULL,
	"suggestion_text" text NOT NULL,
	"suggestion_type" text,
	"file_path" text,
	"line_start" integer,
	"line_end" integer,
	"character_start" integer,
	"character_end" integer,
	"accepted" boolean DEFAULT false,
	"dismissed" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create post_accept_outcomes table
CREATE TABLE IF NOT EXISTS "post_accept_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"suggestion_id" text NOT NULL,
	"edits_made" jsonb DEFAULT '[]'::jsonb,
	"time_to_edit_ms" integer,
	"time_to_submit_ms" integer,
	"user_feedback" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create policy_evaluations table
CREATE TABLE IF NOT EXISTS "policy_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"session_id" text,
	"request_id" text NOT NULL,
	"policy_name" text NOT NULL,
	"policy_version" text,
	"evaluation_result" text,
	"violations" jsonb DEFAULT '[]'::jsonb,
	"remediation_steps" jsonb DEFAULT '[]'::jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create loops table
CREATE TABLE IF NOT EXISTS "loops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"session_id" text,
	"request_id" text NOT NULL,
	"loop_type" text NOT NULL,
	"iteration_count" integer DEFAULT 0,
	"duration_ms" integer,
	"success" boolean DEFAULT false,
	"error_message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"session_id" text,
	"request_id" text,
	"feedback_type" text NOT NULL,
	"feedback_text" text,
	"rating" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "agent_suggestions_user_id_idx" ON "agent_suggestions" ("user_id");
CREATE INDEX IF NOT EXISTS "agent_suggestions_api_key_id_idx" ON "agent_suggestions" ("api_key_id");
CREATE INDEX IF NOT EXISTS "agent_suggestions_request_id_idx" ON "agent_suggestions" ("request_id");
CREATE INDEX IF NOT EXISTS "agent_suggestions_timestamp_idx" ON "agent_suggestions" ("timestamp");

CREATE INDEX IF NOT EXISTS "post_accept_outcomes_user_id_idx" ON "post_accept_outcomes" ("user_id");
CREATE INDEX IF NOT EXISTS "post_accept_outcomes_suggestion_id_idx" ON "post_accept_outcomes" ("suggestion_id");
CREATE INDEX IF NOT EXISTS "post_accept_outcomes_timestamp_idx" ON "post_accept_outcomes" ("timestamp");

CREATE INDEX IF NOT EXISTS "policy_evaluations_user_id_idx" ON "policy_evaluations" ("user_id");
CREATE INDEX IF NOT EXISTS "policy_evaluations_api_key_id_idx" ON "policy_evaluations" ("api_key_id");
CREATE INDEX IF NOT EXISTS "policy_evaluations_request_id_idx" ON "policy_evaluations" ("request_id");
CREATE INDEX IF NOT EXISTS "policy_evaluations_policy_name_idx" ON "policy_evaluations" ("policy_name");
CREATE INDEX IF NOT EXISTS "policy_evaluations_timestamp_idx" ON "policy_evaluations" ("timestamp");

CREATE INDEX IF NOT EXISTS "loops_user_id_idx" ON "loops" ("user_id");
CREATE INDEX IF NOT EXISTS "loops_api_key_id_idx" ON "loops" ("api_key_id");
CREATE INDEX IF NOT EXISTS "loops_request_id_idx" ON "loops" ("request_id");
CREATE INDEX IF NOT EXISTS "loops_loop_type_idx" ON "loops" ("loop_type");
CREATE INDEX IF NOT EXISTS "loops_timestamp_idx" ON "loops" ("timestamp");

CREATE INDEX IF NOT EXISTS "feedback_user_id_idx" ON "feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "feedback_api_key_id_idx" ON "feedback" ("api_key_id");
CREATE INDEX IF NOT EXISTS "feedback_feedback_type_idx" ON "feedback" ("feedback_type");
CREATE INDEX IF NOT EXISTS "feedback_timestamp_idx" ON "feedback" ("timestamp");