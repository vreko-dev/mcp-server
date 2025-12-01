CREATE TYPE "public"."severity_level" AS ENUM('debug', 'info', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."session_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."feature_category" AS ENUM('code_analysis', 'code_refactor', 'code_search', 'git_operations', 'ai_assistance', 'debugging', 'testing', 'documentation');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'solo', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'paused');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'member', 'billing');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'invited', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "analysis_events" (
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
--> statement-breakpoint
CREATE TABLE "api_key_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"environment" text DEFAULT 'production',
	"scopes" jsonb DEFAULT '["code:analyze","code:refactor","code:search"]',
	"rate_limit_per_minute" integer,
	"rate_limit_per_hour" integer,
	"daily_request_limit" integer,
	"last_used_at" timestamp,
	"last_used_ip" "inet",
	"last_used_client" text,
	"total_requests" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_metadata_api_key_id_unique" UNIQUE("api_key_id")
);
--> statement-breakpoint
CREATE TABLE "bypass_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"reason" text,
	"forced" boolean DEFAULT false NOT NULL,
	"file_path" text,
	"line_start" integer,
	"line_end" integer,
	"character_start" integer,
	"character_end" integer,
	"risk_score" integer,
	"risk_level" text,
	"rule_id" text,
	"rule_name" text,
	"violation_description" text,
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
--> statement-breakpoint
CREATE TABLE "code_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_hash" text NOT NULL,
	"file_path_hash" text NOT NULL,
	"file_extension" text NOT NULL,
	"file_size_bytes" integer,
	"line_count" integer,
	"language" text,
	"last_analysis" jsonb,
	"last_analysis_at" timestamp,
	"last_refactor" jsonb,
	"last_refactor_at" timestamp,
	"analysis_count" integer DEFAULT 0,
	"refactor_count" integer DEFAULT 0,
	"last_accessed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
CREATE TABLE "error_logs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"error_id" text NOT NULL,
	"error_code" text,
	"error_type" text,
	"user_id" text,
	"api_key_id" text,
	"request_id" text,
	"severity" "severity_level" DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"endpoint" text,
	"method" text,
	"request_body" jsonb,
	"service_name" text DEFAULT 'api',
	"environment" text DEFAULT 'production',
	"version" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_logs_2025_10" (
	"id" bigint PRIMARY KEY NOT NULL,
	"error_id" text NOT NULL,
	"error_code" text,
	"error_type" text,
	"user_id" text,
	"api_key_id" text,
	"request_id" text,
	"severity" "severity_level" DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"endpoint" text,
	"method" text,
	"request_body" jsonb,
	"service_name" text DEFAULT 'api',
	"environment" text DEFAULT 'production',
	"version" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extension_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text,
	"session_start" timestamp DEFAULT now() NOT NULL,
	"session_end" timestamp,
	"extension_version" text NOT NULL,
	"vscode_version" text NOT NULL,
	"platform" text NOT NULL,
	"requests_count" integer DEFAULT 0 NOT NULL,
	"workspace_hash" text,
	"highest_severity" "session_severity",
	"ai_present" boolean DEFAULT false,
	"issues_by_type" json DEFAULT '{}'::json,
	"bytes_saved" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_usage" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"feature_name" text NOT NULL,
	"feature_category" "feature_category" NOT NULL,
	"trigger_method" text,
	"file_type" text,
	"project_type" text,
	"project_size" text,
	"duration_ms" integer,
	"success" boolean DEFAULT true,
	"lines_changed" integer,
	"files_affected" integer,
	"client_version" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_usage_2025_10" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"feature_name" text NOT NULL,
	"feature_category" "feature_category" NOT NULL,
	"trigger_method" text,
	"file_type" text,
	"project_type" text,
	"project_size" text,
	"duration_ms" integer,
	"success" boolean DEFAULT true,
	"lines_changed" integer,
	"files_affected" integer,
	"client_version" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"request_count" integer DEFAULT 1,
	"response_time_ms" integer NOT NULL,
	"response_status" integer NOT NULL,
	"client_version" text,
	"client_platform" text,
	"ide_version" text,
	"ip_address" text,
	"country_code" text,
	"error_code" text,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs_2025_10" (
	"id" bigint PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"request_count" integer DEFAULT 1,
	"response_time_ms" integer NOT NULL,
	"response_status" integer NOT NULL,
	"client_version" text,
	"client_platform" text,
	"ide_version" text,
	"ip_address" text,
	"country_code" text,
	"error_code" text,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs_2025_11" (
	"id" bigint PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"request_count" integer DEFAULT 1,
	"response_time_ms" integer NOT NULL,
	"response_status" integer NOT NULL,
	"client_version" text,
	"client_platform" text,
	"ide_version" text,
	"ip_address" text,
	"country_code" text,
	"error_code" text,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "org_daily_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"incidents_detected" integer DEFAULT 0 NOT NULL,
	"incidents_prevented" integer DEFAULT 0 NOT NULL,
	"time_to_restore_ms" integer,
	"snapshots_created" integer DEFAULT 0 NOT NULL,
	"snapshots_restored" integer DEFAULT 0 NOT NULL,
	"bytes_saved" integer DEFAULT 0 NOT NULL,
	"high_severity_risks" integer DEFAULT 0 NOT NULL,
	"medium_severity_risks" integer DEFAULT 0 NOT NULL,
	"low_severity_risks" integer DEFAULT 0 NOT NULL,
	"api_calls" integer DEFAULT 0 NOT NULL,
	"api_errors" integer DEFAULT 0 NOT NULL,
	"features_used" jsonb DEFAULT '{}',
	"avg_response_time_ms" integer,
	"p95_response_time_ms" integer,
	"active_users" integer DEFAULT 0 NOT NULL,
	"client_versions" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_violations" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"limit_type" text NOT NULL,
	"limit_value" integer NOT NULL,
	"current_value" integer NOT NULL,
	"endpoint" text,
	"plan" "plan_type",
	"retry_after_seconds" integer,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "response_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"response" jsonb NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"hit_count" integer DEFAULT 0,
	"last_hit_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "response_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" text,
	"api_key_id" text,
	"event_type" text NOT NULL,
	"severity" "severity_level" DEFAULT 'warning' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"endpoint" text,
	"detection_method" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
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
	"encryption_key_id" text,
	"encrypted_data_key" text,
	"encryption_algorithm" text DEFAULT 'AES-256-GCM',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"organization_id" text,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"plan" "plan_type" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"trial_end" timestamp,
	"seats" integer DEFAULT 1,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"invited_by" text,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"avatar_url" text,
	"owner_id" text NOT NULL,
	"subscription_id" text,
	"settings" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "telemetry_daily_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"date" timestamp NOT NULL,
	"total_events" integer DEFAULT 0 NOT NULL,
	"feature_usage_events" integer DEFAULT 0 NOT NULL,
	"error_events" integer DEFAULT 0 NOT NULL,
	"lifecycle_events" integer DEFAULT 0 NOT NULL,
	"engagement_events" integer DEFAULT 0 NOT NULL,
	"platforms" json DEFAULT '{}'::json,
	"top_features" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"api_key_id" text,
	"event_type" text NOT NULL,
	"event_category" text,
	"properties" json DEFAULT '{}'::json,
	"platform" text,
	"client_version" text,
	"ide_version" text,
	"device_fingerprint" text,
	"session_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_idempotency_keys" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"response_data" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tokens" numeric NOT NULL,
	"capacity" integer NOT NULL,
	"refill_rate" numeric NOT NULL,
	"last_refill" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "token_buckets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_stats_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"total_requests" integer DEFAULT 0,
	"total_tokens" bigint DEFAULT 0,
	"successful_requests" integer DEFAULT 0,
	"failed_requests" integer DEFAULT 0,
	"avg_response_time_ms" integer,
	"p95_response_time_ms" integer,
	"endpoints_used" jsonb DEFAULT '{}',
	"client_versions" jsonb DEFAULT '[]',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"company" text,
	"role" text,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" integer DEFAULT 0,
	"primary_language" text,
	"use_cases" text[],
	"referral_code" text,
	"referred_by" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigint PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"user_id" text,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_hash" text NOT NULL,
	"settings" jsonb DEFAULT '{"autoAnalyze":true,"inlineSuggestions":true,"maxFileSizeKB":500}',
	"ignored_patterns" text[] DEFAULT '{"node_modules/**","dist/**",".git/**"}',
	"custom_rules" jsonb DEFAULT '{}',
	"language_settings" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rule_violations" (
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
--> statement-breakpoint
CREATE TABLE "suppression_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"pattern" text NOT NULL,
	"pattern_type" text NOT NULL,
	"description" text,
	"use_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"suppressed_violations" integer DEFAULT 0 NOT NULL,
	"false_positives" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"client_type" text,
	"project_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_safety_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"total_analyses" integer DEFAULT 0 NOT NULL,
	"total_violations" integer DEFAULT 0 NOT NULL,
	"total_blocked" integer DEFAULT 0 NOT NULL,
	"total_bypassed" integer DEFAULT 0 NOT NULL,
	"average_risk_score" integer,
	"highest_risk_score" integer,
	"security_violations" integer DEFAULT 0 NOT NULL,
	"privacy_violations" integer DEFAULT 0 NOT NULL,
	"compliance_violations" integer DEFAULT 0 NOT NULL,
	"auto_block_high_risk" boolean DEFAULT true NOT NULL,
	"notify_on_violation" boolean DEFAULT true NOT NULL,
	"notify_on_bypass" boolean DEFAULT true NOT NULL,
	"suppression_patterns_learned" integer DEFAULT 0 NOT NULL,
	"bypass_patterns_learned" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"last_analysis_at" timestamp,
	"profile_reset_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_safety_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"github_username" text,
	"editor" text,
	"language" text,
	"team_size" text,
	"queue_position" integer NOT NULL,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"hubspot_contact_id" text,
	"hubspot_synced_at" timestamp,
	"email_sent" timestamp,
	"email_sent_at" timestamp,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist_referrals" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_email" text NOT NULL,
	"referred_id" text,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"waitlist_id" text NOT NULL,
	"task_type" text NOT NULL,
	"completed" timestamp,
	"points_earned" integer NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_metadata" ADD CONSTRAINT "api_key_metadata_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_metadata" ADD CONSTRAINT "api_key_metadata_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bypass_events" ADD CONSTRAINT "bypass_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bypass_events" ADD CONSTRAINT "bypass_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_contexts" ADD CONSTRAINT "code_contexts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_trials" ADD CONSTRAINT "device_trials_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_trials" ADD CONSTRAINT "device_trials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs_2025_10" ADD CONSTRAINT "error_logs_2025_10_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD CONSTRAINT "extension_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD CONSTRAINT "extension_sessions_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_session_id_extension_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."extension_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage_2025_10" ADD CONSTRAINT "feature_usage_2025_10_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage_2025_10" ADD CONSTRAINT "feature_usage_2025_10_session_id_extension_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."extension_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs_2025_10" ADD CONSTRAINT "api_usage_logs_2025_10_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs_2025_11" ADD CONSTRAINT "api_usage_logs_2025_11_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_daily_metrics" ADD CONSTRAINT "org_daily_metrics_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_violations" ADD CONSTRAINT "rate_limit_violations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_files" ADD CONSTRAINT "snapshot_files_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_daily_stats" ADD CONSTRAINT "telemetry_daily_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_buckets" ADD CONSTRAINT "token_buckets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_stats_daily" ADD CONSTRAINT "usage_stats_daily_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_referred_by_user_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_patterns" ADD CONSTRAINT "suppression_patterns_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_safety_profiles" ADD CONSTRAINT "user_safety_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_referrals" ADD CONSTRAINT "waitlist_referrals_referrer_id_waitlist_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_referrals" ADD CONSTRAINT "waitlist_referrals_referred_id_waitlist_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."waitlist"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_tasks" ADD CONSTRAINT "waitlist_tasks_waitlist_id_waitlist_id_fk" FOREIGN KEY ("waitlist_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_code_contexts_user_workspace" ON "code_contexts" USING btree ("user_id","workspace_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_code_contexts_last_accessed" ON "code_contexts" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_code_contexts_user_workspace_path_unique" ON "code_contexts" USING btree ("user_id","workspace_hash","file_path_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_fingerprint_idx" ON "device_trials" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_user_idx" ON "device_trials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_blocked_idx" ON "device_trials" USING btree ("blocked_until");--> statement-breakpoint
CREATE UNIQUE INDEX "org_daily_metrics_org_date_unique" ON "org_daily_metrics" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "org_daily_metrics_date_idx" ON "org_daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_response_cache_user" ON "response_cache" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_response_cache_key" ON "response_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "idx_response_cache_expiry" ON "response_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_team_members_team" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_team_members_user" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_id_user_id_unique" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_teams_owner" ON "teams" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_teams_slug" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_daily_stats_user_date_idx" ON "telemetry_daily_stats" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_events_user_timestamp_idx" ON "telemetry_events" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_events_api_key_timestamp_idx" ON "telemetry_events" USING btree ("api_key_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_events_event_type_idx" ON "telemetry_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_events_timestamp_idx" ON "telemetry_events" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "telemetry_idempotency_keys_expires_at_idx" ON "telemetry_idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_token_buckets_user" ON "token_buckets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_usage_stats_user_date" ON "usage_stats_daily" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_usage_stats_date" ON "usage_stats_daily" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_stats_daily_user_id_date_unique" ON "usage_stats_daily" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workspace_settings_user" ON "workspace_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_settings_user_id_workspace_hash_unique" ON "workspace_settings" USING btree ("user_id","workspace_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_idx" ON "waitlist" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_status_idx" ON "waitlist" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waitlist_queue_position_idx" ON "waitlist" USING btree ("queue_position");--> statement-breakpoint
CREATE INDEX "waitlist_referrals_referrer_idx" ON "waitlist_referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "waitlist_referrals_referred_idx" ON "waitlist_referrals" USING btree ("referred_id");--> statement-breakpoint
CREATE INDEX "waitlist_tasks_waitlist_idx" ON "waitlist_tasks" USING btree ("waitlist_id");--> statement-breakpoint
CREATE INDEX "waitlist_tasks_type_idx" ON "waitlist_tasks" USING btree ("task_type");