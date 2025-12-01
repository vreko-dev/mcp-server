-- Add session summary fields to extension_sessions table
CREATE TYPE "severity_level" AS ENUM ('low', 'medium', 'high', 'critical');
--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD COLUMN "highest_severity" "severity_level";
--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD COLUMN "ai_present" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD COLUMN "issues_by_type" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "extension_sessions" ADD COLUMN "bytes_saved" integer DEFAULT 0;