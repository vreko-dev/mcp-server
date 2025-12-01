ALTER TABLE "user" ADD COLUMN "totalCheckpoints" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "totalRecoveries" integer DEFAULT 0 NOT NULL;