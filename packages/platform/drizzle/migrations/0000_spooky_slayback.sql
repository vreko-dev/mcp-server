CREATE TYPE "public"."plan_type" AS ENUM('free', 'solo', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."PurchaseType" AS ENUM('SUBSCRIPTION', 'ONE_TIME');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'paused');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'invited', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('debug', 'info', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."session_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."feature_category" AS ENUM('code_analysis', 'code_refactor', 'code_search', 'git_operations', 'ai_assistance', 'debugging', 'testing', 'documentation');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'member', 'billing');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_stage" AS ENUM('new', 'engaged', 'power_user', 'at_risk', 'churned');--> statement-breakpoint
CREATE TABLE "account" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"expiresAt" timestamp,
	"password" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "aiChat" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text,
	"userId" text,
	"title" text,
	"messages" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer,
	"metadata" json,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"token_preview" text NOT NULL,
	"permissions" json DEFAULT '{}'::json,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_tokens_token_unique" UNIQUE("token")
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
CREATE TABLE "invitation" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"inviterId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'website',
	"hubspot_contact_id" text,
	"hubspot_synced_at" timestamp,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"createdAt" timestamp NOT NULL,
	"metadata" text,
	"paymentsCustomerId" text
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" text,
	"publicKey" text NOT NULL,
	"userId" text NOT NULL,
	"credentialID" text NOT NULL,
	"counter" integer NOT NULL,
	"deviceType" text NOT NULL,
	"backedUp" boolean NOT NULL,
	"transports" text,
	"createdAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text,
	"userId" text,
	"type" "PurchaseType" NOT NULL,
	"customerId" text NOT NULL,
	"subscriptionId" text,
	"productId" text NOT NULL,
	"status" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "purchase_subscriptionId_unique" UNIQUE("subscriptionId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text,
	"activeOrganizationId" text,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
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
CREATE TABLE "twoFactor" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text,
	"month" timestamp NOT NULL,
	"snapshots_used" integer DEFAULT 0,
	"snapshots_limit" integer,
	"cloud_storage_used_mb" integer DEFAULT 0,
	"cloud_storage_limit_mb" integer,
	"api_calls_used" integer DEFAULT 0,
	"api_calls_limit" integer
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"role" text,
	"banned" boolean,
	"banReason" text,
	"banExpires" timestamp,
	"onboardingComplete" boolean DEFAULT false NOT NULL,
	"paymentsCustomerId" text,
	"locale" text,
	"totalSnapshots" integer DEFAULT 0 NOT NULL,
	"totalRecoveries" integer DEFAULT 0 NOT NULL,
	"subscription_tier" "plan_type" DEFAULT 'free',
	"twoFactorEnabled" boolean DEFAULT false,
	"deviceFingerprint" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
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
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"github_username" text,
	"editor" text,
	"language" text,
	"team_size" text,
	"queue_position" integer NOT NULL,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"referral_code" text NOT NULL,
	"hubspot_contact_id" text,
	"hubspot_synced_at" timestamp,
	"email_sent" timestamp,
	"email_sent_at" timestamp,
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "waitlist_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"waitlist_id" text NOT NULL,
	"action" text NOT NULL,
	"user_id" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
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
	"signing_secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_metadata_api_key_id_unique" UNIQUE("api_key_id")
);
--> statement-breakpoint
CREATE TABLE "api_key_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "device_auth_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"device_code" text NOT NULL,
	"user_code" text NOT NULL,
	"client_id" text NOT NULL,
	"verification_uri" text NOT NULL,
	"user_id" text,
	"approved" text DEFAULT 'false' NOT NULL,
	"approved_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"issued_api_key_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_auth_codes_device_code_unique" UNIQUE("device_code")
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
	"ai_assist_level" text DEFAULT 'unknown' NOT NULL,
	"ai_confidence_score" real DEFAULT 0 NOT NULL,
	"ai_provider" text DEFAULT 'none' NOT NULL,
	"ai_metadata" json,
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
CREATE TABLE "feedback" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_feedback_type_check" CHECK (feedback_type IN ('positive', 'negative', 'neutral', 'bug_report'))
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
CREATE TABLE "loops" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loops_loop_type_check" CHECK (loop_type IN ('retry', 'recovery', 'optimization', 'validation'))
);
--> statement-breakpoint
CREATE TABLE "nurture_track" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_name" text NOT NULL,
	"track_version" text DEFAULT '1' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"total_steps" integer NOT NULL,
	"last_email_sent_id" text,
	"last_email_sent_at" timestamp,
	"last_email_opened_at" timestamp,
	"last_email_clicked_at" timestamp,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"emails_opened" integer DEFAULT 0 NOT NULL,
	"emails_clicked" integer DEFAULT 0 NOT NULL,
	"unsubscribed" text DEFAULT 'false' NOT NULL,
	"paused" text DEFAULT 'false' NOT NULL,
	"paused_at" timestamp,
	"resumed_at" timestamp,
	"completed_at" timestamp,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "policy_evaluations" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "policy_evaluations_evaluation_result_check" CHECK (evaluation_result IN ('passed', 'failed', 'warning', 'error'))
);
--> statement-breakpoint
CREATE TABLE "post_accept_outcomes" (
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
--> statement-breakpoint
CREATE TABLE "protection_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"decision_type" text NOT NULL,
	"file_path" text NOT NULL,
	"risk_score" integer NOT NULL,
	"outcome_label" text,
	"user_feedback" text,
	"file_size" integer,
	"file_type" text,
	"source_context" text,
	"decision_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarantine_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"api_key_id" text,
	"original_event" jsonb NOT NULL,
	"error_reason" text NOT NULL,
	"error_stack" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "retention_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"retention_days" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "user_analytics_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"posthog_user_id" text,
	"posthog_distinct_id" text,
	"hubspot_contact_id" text,
	"resend_contact_id" text,
	"anonymous_id" text,
	"synced" text DEFAULT 'false' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_daily_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"snapshots_created" integer DEFAULT 0 NOT NULL,
	"snapshots_restored" integer DEFAULT 0 NOT NULL,
	"minutes_saved_estimate" integer DEFAULT 0 NOT NULL,
	"ai_sessions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_lifecycle_state" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stage" "lifecycle_stage" DEFAULT 'new' NOT NULL,
	"staged_at" timestamp DEFAULT now() NOT NULL,
	"transition_reason" text,
	"snapshots_since_start" text DEFAULT '0' NOT NULL,
	"days_since_last_activity" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_product_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"snapshots_total" integer DEFAULT 0 NOT NULL,
	"restores_total" integer DEFAULT 0 NOT NULL,
	"minutes_saved_total" integer DEFAULT 0 NOT NULL,
	"ai_sessions_total" integer DEFAULT 0 NOT NULL,
	"snapshots_7d" integer DEFAULT 0 NOT NULL,
	"restores_7d" integer DEFAULT 0 NOT NULL,
	"minutes_saved_7d" integer DEFAULT 0 NOT NULL,
	"ai_sessions_7d" integer DEFAULT 0 NOT NULL,
	"snapshots_30d" integer DEFAULT 0 NOT NULL,
	"restores_30d" integer DEFAULT 0 NOT NULL,
	"last_snapshot_at" timestamp,
	"last_restore_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_suggestions" ADD CONSTRAINT "agent_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_suggestions" ADD CONSTRAINT "agent_suggestions_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aiChat" ADD CONSTRAINT "aiChat_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aiChat" ADD CONSTRAINT "aiChat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_tokens" ADD CONSTRAINT "client_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_trials" ADD CONSTRAINT "device_trials_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_trials" ADD CONSTRAINT "device_trials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_files" ADD CONSTRAINT "snapshot_files_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_audit_logs" ADD CONSTRAINT "waitlist_audit_logs_waitlist_id_waitlist_id_fk" FOREIGN KEY ("waitlist_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_referrals" ADD CONSTRAINT "waitlist_referrals_referrer_id_waitlist_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_referrals" ADD CONSTRAINT "waitlist_referrals_referred_id_waitlist_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."waitlist"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_tasks" ADD CONSTRAINT "waitlist_tasks_waitlist_id_waitlist_id_fk" FOREIGN KEY ("waitlist_id") REFERENCES "public"."waitlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_events" ADD CONSTRAINT "analysis_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_metadata" ADD CONSTRAINT "api_key_metadata_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_metadata" ADD CONSTRAINT "api_key_metadata_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bypass_events" ADD CONSTRAINT "bypass_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bypass_events" ADD CONSTRAINT "bypass_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_contexts" ADD CONSTRAINT "code_contexts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_auth_codes" ADD CONSTRAINT "device_auth_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs_2025_10" ADD CONSTRAINT "error_logs_2025_10_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD CONSTRAINT "extension_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD CONSTRAINT "extension_sessions_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_session_id_extension_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."extension_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage_2025_10" ADD CONSTRAINT "feature_usage_2025_10_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage_2025_10" ADD CONSTRAINT "feature_usage_2025_10_session_id_extension_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."extension_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs_2025_10" ADD CONSTRAINT "api_usage_logs_2025_10_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs_2025_11" ADD CONSTRAINT "api_usage_logs_2025_11_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loops" ADD CONSTRAINT "loops_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurture_track" ADD CONSTRAINT "nurture_track_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_daily_metrics" ADD CONSTRAINT "org_daily_metrics_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_accept_outcomes" ADD CONSTRAINT "post_accept_outcomes_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_decisions" ADD CONSTRAINT "protection_decisions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarantine_events" ADD CONSTRAINT "quarantine_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_violations" ADD CONSTRAINT "rate_limit_violations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_patterns" ADD CONSTRAINT "suppression_patterns_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "user_analytics_identities" ADD CONSTRAINT "user_analytics_identities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_metrics" ADD CONSTRAINT "user_daily_metrics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lifecycle_state" ADD CONSTRAINT "user_lifecycle_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_product_metrics" ADD CONSTRAINT "user_product_metrics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_referred_by_user_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_safety_profiles" ADD CONSTRAINT "user_safety_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_suggestions_user_created_at_idx" ON "agent_suggestions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_suggestions_api_key_created_at_idx" ON "agent_suggestions" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "api_usage_key_idx" ON "api_usage" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_usage_timestamp_idx" ON "api_usage" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "client_tokens_user_idx" ON "client_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_tokens_token_idx" ON "client_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_fingerprint_idx" ON "device_trials" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_user_idx" ON "device_trials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_trials_blocked_idx" ON "device_trials" USING btree ("blocked_until");--> statement-breakpoint
CREATE UNIQUE INDEX "member_user_org_idx" ON "member" USING btree ("userId","organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_limits_subscription_month_unique" ON "usage_limits" USING btree ("subscription_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_idx" ON "waitlist" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_referral_code_idx" ON "waitlist" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "waitlist_status_idx" ON "waitlist" USING btree ("status");--> statement-breakpoint
CREATE INDEX "waitlist_queue_position_idx" ON "waitlist" USING btree ("queue_position");--> statement-breakpoint
CREATE INDEX "waitlist_audit_logs_waitlist_idx" ON "waitlist_audit_logs" USING btree ("waitlist_id");--> statement-breakpoint
CREATE INDEX "waitlist_audit_logs_action_idx" ON "waitlist_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "waitlist_audit_logs_created_at_idx" ON "waitlist_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "waitlist_referrals_referrer_idx" ON "waitlist_referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "waitlist_referrals_referred_idx" ON "waitlist_referrals" USING btree ("referred_id");--> statement-breakpoint
CREATE INDEX "waitlist_tasks_waitlist_idx" ON "waitlist_tasks" USING btree ("waitlist_id");--> statement-breakpoint
CREATE INDEX "waitlist_tasks_type_idx" ON "waitlist_tasks" USING btree ("task_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_code_contexts_user_workspace" ON "code_contexts" USING btree ("user_id","workspace_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_code_contexts_last_accessed" ON "code_contexts" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_code_contexts_user_workspace_path_unique" ON "code_contexts" USING btree ("user_id","workspace_hash","file_path_hash");--> statement-breakpoint
CREATE INDEX "device_auth_codes_device_code_idx" ON "device_auth_codes" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "device_auth_codes_user_code_idx" ON "device_auth_codes" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "device_auth_codes_user_id_idx" ON "device_auth_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_auth_codes_expires_at_idx" ON "device_auth_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "device_auth_codes_approved_idx" ON "device_auth_codes" USING btree ("approved");--> statement-breakpoint
CREATE INDEX "feedback_user_created_at_idx" ON "feedback" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_api_key_created_at_idx" ON "feedback" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "loops_user_created_at_idx" ON "loops" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "loops_api_key_created_at_idx" ON "loops" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "nurture_track_user_id_idx" ON "nurture_track" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nurture_track_track_name_idx" ON "nurture_track" USING btree ("track_name");--> statement-breakpoint
CREATE INDEX "nurture_track_paused_idx" ON "nurture_track" USING btree ("paused");--> statement-breakpoint
CREATE INDEX "nurture_track_completed_at_idx" ON "nurture_track" USING btree ("completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_daily_metrics_org_date_unique" ON "org_daily_metrics" USING btree ("organization_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "org_daily_metrics_date_idx" ON "org_daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "policy_evaluations_user_created_at_idx" ON "policy_evaluations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "policy_evaluations_api_key_created_at_idx" ON "policy_evaluations" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "post_accept_outcomes_user_created_at_idx" ON "post_accept_outcomes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "post_accept_outcomes_api_key_created_at_idx" ON "post_accept_outcomes" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "protection_decisions_user_id_idx" ON "protection_decisions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "protection_decisions_decision_type_idx" ON "protection_decisions" USING btree ("decision_type");--> statement-breakpoint
CREATE INDEX "protection_decisions_outcome_label_idx" ON "protection_decisions" USING btree ("outcome_label");--> statement-breakpoint
CREATE INDEX "quarantine_events_attempted_at_idx" ON "quarantine_events" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "quarantine_events_user_created_at_idx" ON "quarantine_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "quarantine_events_api_key_created_at_idx" ON "quarantine_events" USING btree ("api_key_id","created_at");--> statement-breakpoint
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
CREATE INDEX "user_analytics_identities_user_id_idx" ON "user_analytics_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_analytics_identities_posthog_user_id_idx" ON "user_analytics_identities" USING btree ("posthog_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_analytics_identities_hubspot_contact_id_idx" ON "user_analytics_identities" USING btree ("hubspot_contact_id");--> statement-breakpoint
CREATE INDEX "user_analytics_identities_anonymous_id_idx" ON "user_analytics_identities" USING btree ("anonymous_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_daily_metrics_user_date_unique" ON "user_daily_metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "user_daily_metrics_user_id_idx" ON "user_daily_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_daily_metrics_date_idx" ON "user_daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "user_lifecycle_state_user_id_idx" ON "user_lifecycle_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_lifecycle_state_stage_idx" ON "user_lifecycle_state" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "user_lifecycle_state_updated_at_idx" ON "user_lifecycle_state" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "user_product_metrics_user_id_idx" ON "user_product_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_product_metrics_last_snapshot_idx" ON "user_product_metrics" USING btree ("last_snapshot_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workspace_settings_user" ON "workspace_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_settings_user_id_workspace_hash_unique" ON "workspace_settings" USING btree ("user_id","workspace_hash");