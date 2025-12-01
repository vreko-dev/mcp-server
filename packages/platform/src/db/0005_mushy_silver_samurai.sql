DROP INDEX "api_keys_user_idx";--> statement-breakpoint
DROP INDEX "api_keys_org_idx";--> statement-breakpoint
DROP INDEX "api_usage_key_idx";--> statement-breakpoint
DROP INDEX "api_usage_timestamp_idx";--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_org_idx" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_usage_key_idx" ON "api_usage" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_usage_timestamp_idx" ON "api_usage" USING btree ("timestamp");