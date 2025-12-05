import { relations } from "drizzle-orm";
import { bigint, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";
import { severityLevelEnum } from "./error-logs";

// Security events
export const securityEvents = pgTable("security_events", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id"),

	// Event details
	eventType: text("event_type").notNull(), // 'invalid_signature', 'expired_key', 'suspicious_pattern', 'brute_force'
	severity: severityLevelEnum("severity").notNull().default("warning"),

	// Context
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	endpoint: text("endpoint"),

	// Detection
	detectionMethod: text("detection_method"), // 'rate_analysis', 'signature_check', 'pattern_match'

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
	user: one(user, {
		fields: [securityEvents.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [securityEvents.apiKeyId],
		references: [apiKeys.id],
	}),
}));

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;
