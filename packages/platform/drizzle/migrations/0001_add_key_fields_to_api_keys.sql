CREATE TYPE "public"."pioneer_action_type" AS ENUM('github_star', 'discord_join', 'referral_direct', 'referral_bonus', 'feedback', 'bug_report', 'tutorial_complete', 'waitlist_early');--> statement-breakpoint
CREATE TYPE "public"."leaderboard_visibility" AS ENUM('public', 'anonymous', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."pioneer_tier" AS ENUM('seedling', 'grower', 'cultivator', 'guardian');--> statement-breakpoint
CREATE TABLE "pioneer_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"pioneer_id" text NOT NULL,
	"action_type" "pioneer_action_type" NOT NULL,
	"points" integer NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pioneer_tier_history" (
	"id" text PRIMARY KEY NOT NULL,
	"pioneer_id" text NOT NULL,
	"previous_tier" "pioneer_tier",
	"new_tier" "pioneer_tier" NOT NULL,
	"points_at_transition" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pioneers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"github_id" text NOT NULL,
	"contact_email" text,
	"tier" "pioneer_tier" DEFAULT 'seedling' NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"referral_code" text NOT NULL,
	"github_starred" boolean DEFAULT false NOT NULL,
	"leaderboard_visibility" "leaderboard_visibility" DEFAULT 'anonymous' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pioneers_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "engagement_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action_type" text NOT NULL,
	"points_earned" integer NOT NULL,
	"tier_progress_before" integer NOT NULL,
	"tier_progress_after" integer NOT NULL,
	"engagement_score_delta" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"performed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_engagement_score" integer DEFAULT 0 NOT NULL,
	"usage_score" integer DEFAULT 0 NOT NULL,
	"feedback_quality_score" integer DEFAULT 0 NOT NULL,
	"community_score" integer DEFAULT 0 NOT NULL,
	"referral_score" integer DEFAULT 0 NOT NULL,
	"beta_tier" text DEFAULT 'none' NOT NULL,
	"tier_unlocked_at" timestamp,
	"qualifying_actions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_scores_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"github_installation_id" text NOT NULL,
	"github_account_id" text NOT NULL,
	"github_account_type" text NOT NULL,
	"github_account_login" text NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"repository_selection" text NOT NULL,
	"selected_repository_ids" jsonb DEFAULT '[]'::jsonb,
	"webhook_id" text,
	"webhook_secret" text,
	"webhook_active" boolean DEFAULT true,
	"suspended" boolean DEFAULT false,
	"suspended_at" timestamp,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_github_installation_id_unique" UNIQUE("github_installation_id")
);
--> statement-breakpoint
CREATE TABLE "github_pr_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"pr_number" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"ai_contribution_percentage" numeric(5, 2),
	"estimated_ai_tool" text,
	"files_changed" integer NOT NULL,
	"lines_added" integer NOT NULL,
	"lines_removed" integer NOT NULL,
	"patterns_detected" jsonb DEFAULT '[]'::jsonb,
	"check_status" text NOT NULL,
	"check_conclusion" text,
	"check_details_url" text,
	"has_co_author_tag" boolean DEFAULT false,
	"co_author_tools" jsonb DEFAULT '[]'::jsonb,
	"fed_to_calibration" boolean DEFAULT false,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"file_count" integer,
	"total_bytes" integer,
	"risk_level" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_aggregated_learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"pattern_key" text NOT NULL,
	"pattern_type" text NOT NULL,
	"workspace_count" integer DEFAULT 1 NOT NULL,
	"workspace_ids" jsonb DEFAULT '[]' NOT NULL,
	"total_occurrences" integer DEFAULT 1 NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"task_description" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"snapshot_count" integer DEFAULT 0,
	"risk_analysis_count" integer DEFAULT 0,
	"learnings_recorded" integer DEFAULT 0,
	"detected_stack" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patterns" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"pattern_signature" text NOT NULL,
	"embedding" text,
	"pattern_type" text NOT NULL,
	"tool_affinity" text[],
	"file_types" text[],
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"success_rate" numeric(4, 3),
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	CONSTRAINT "patterns_pattern_signature_unique" UNIQUE("pattern_signature")
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"prediction_type" text NOT NULL,
	"predicted_value" numeric(5, 4) NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"model_version" text NOT NULL,
	"source" text NOT NULL,
	"latency_ms" integer,
	"features_used" jsonb DEFAULT '[]'::jsonb,
	"context_hash" text,
	"actual_outcome" boolean,
	"was_correct" boolean,
	"outcome_recorded_at" timestamp,
	"feedback_source" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_personalities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"repo_name" text,
	"risk_profile" text NOT NULL,
	"ai_tolerance" numeric(4, 3) DEFAULT '0.5',
	"volatility" numeric(4, 3) DEFAULT '0.5',
	"incident_count" integer DEFAULT 0,
	"total_commits" integer DEFAULT 0,
	"ai_contribution_percentage" numeric(5, 2),
	"primary_language" text,
	"frameworks" jsonb DEFAULT '[]'::jsonb,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"context_key" text NOT NULL,
	"score" numeric(4, 3) NOT NULL,
	"momentum" numeric(4, 3) DEFAULT '0',
	"volatility" numeric(4, 3) DEFAULT '0.5',
	"sample_count" integer DEFAULT 0 NOT NULL,
	"recent_window" jsonb DEFAULT '[]'::jsonb,
	"last_calibration" timestamp DEFAULT now() NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'free'::text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "subscription_tier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "subscription_tier" SET DEFAULT 'free'::text;--> statement-breakpoint
ALTER TABLE "rate_limit_violations" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."plan_type";--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'pro', 'team', 'enterprise');--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'free'::"public"."plan_type";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."plan_type" USING "plan"::"public"."plan_type";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "subscription_tier" SET DEFAULT 'free'::"public"."plan_type";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "subscription_tier" SET DATA TYPE "public"."plan_type" USING "subscription_tier"::"public"."plan_type";--> statement-breakpoint
ALTER TABLE "rate_limit_violations" ALTER COLUMN "plan" SET DATA TYPE "public"."plan_type" USING "plan"::"public"."plan_type";--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "key_preview" text NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
ALTER TABLE "pioneer_actions" ADD CONSTRAINT "pioneer_actions_pioneer_id_pioneers_id_fk" FOREIGN KEY ("pioneer_id") REFERENCES "public"."pioneers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pioneer_tier_history" ADD CONSTRAINT "pioneer_tier_history_pioneer_id_pioneers_id_fk" FOREIGN KEY ("pioneer_id") REFERENCES "public"."pioneers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pioneers" ADD CONSTRAINT "pioneers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_actions" ADD CONSTRAINT "engagement_actions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_analyses" ADD CONSTRAINT "github_pr_analyses_installation_id_github_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_activity_events" ADD CONSTRAINT "mcp_activity_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_aggregated_learnings" ADD CONSTRAINT "mcp_aggregated_learnings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_sessions" ADD CONSTRAINT "mcp_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_personalities" ADD CONSTRAINT "repo_personalities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pioneer_actions_pioneer_id_idx" ON "pioneer_actions" USING btree ("pioneer_id");--> statement-breakpoint
CREATE INDEX "pioneer_actions_action_type_idx" ON "pioneer_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "pioneer_actions_created_at_idx" ON "pioneer_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pioneer_tier_history_pioneer_id_idx" ON "pioneer_tier_history" USING btree ("pioneer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pioneers_user_id_idx" ON "pioneers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pioneers_github_id_idx" ON "pioneers" USING btree ("github_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pioneers_referral_code_idx" ON "pioneers" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "pioneers_leaderboard_idx" ON "pioneers" USING btree ("total_points");--> statement-breakpoint
CREATE INDEX "engagement_actions_user_idx" ON "engagement_actions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "engagement_actions_type_idx" ON "engagement_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "engagement_actions_time_idx" ON "engagement_actions" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "engagement_scores_user_idx" ON "engagement_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "engagement_scores_tier_idx" ON "engagement_scores" USING btree ("beta_tier");--> statement-breakpoint
CREATE INDEX "engagement_scores_total_idx" ON "engagement_scores" USING btree ("total_engagement_score");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_github_id_idx" ON "github_installations" USING btree ("github_installation_id");--> statement-breakpoint
CREATE INDEX "github_installations_user_idx" ON "github_installations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_installations_active_idx" ON "github_installations" USING btree ("suspended");--> statement-breakpoint
CREATE UNIQUE INDEX "github_pr_analyses_repo_pr_idx" ON "github_pr_analyses" USING btree ("repo_id","pr_number");--> statement-breakpoint
CREATE INDEX "github_pr_analyses_installation_idx" ON "github_pr_analyses" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "github_pr_analyses_ground_truth_idx" ON "github_pr_analyses" USING btree ("has_co_author_tag","fed_to_calibration");--> statement-breakpoint
CREATE UNIQUE INDEX "patterns_signature_idx" ON "patterns" USING btree ("pattern_signature");--> statement-breakpoint
CREATE INDEX "patterns_user_idx" ON "patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "patterns_type_idx" ON "patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "patterns_global_idx" ON "patterns" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "predictions_user_idx" ON "predictions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "predictions_session_idx" ON "predictions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "predictions_model_idx" ON "predictions" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "predictions_accuracy_idx" ON "predictions" USING btree ("was_correct");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_personalities_user_repo_idx" ON "repo_personalities" USING btree ("user_id","repo_id");--> statement-breakpoint
CREATE INDEX "repo_personalities_user_idx" ON "repo_personalities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repo_personalities_profile_idx" ON "repo_personalities" USING btree ("risk_profile");--> statement-breakpoint
CREATE UNIQUE INDEX "trust_scores_user_tool_context_idx" ON "trust_scores" USING btree ("user_id","tool_id","context_key");--> statement-breakpoint
CREATE INDEX "trust_scores_user_idx" ON "trust_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trust_scores_tool_idx" ON "trust_scores" USING btree ("tool_id");