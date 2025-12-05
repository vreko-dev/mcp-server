import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";

/**
 * Bypass Events - Track when users bypass safety checks
 */
export const bypassEvents = pgTable("bypass_events", {
	id: uuid("id").primaryKey().defaultRandom(),

	// Ownership
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id")
		.notNull()
		.references(() => apiKeys.id, { onDelete: "cascade" }),

	// Bypass details
	reason: text("reason"), // User provided reason for bypass
	forced: boolean("forced").notNull().default(false), // Whether bypass was forced by admin

	// Context
	filePath: text("file_path"),
	lineStart: integer("line_start"),
	lineEnd: integer("line_end"),
	characterStart: integer("character_start"),
	characterEnd: integer("character_end"),

	// Risk at time of bypass
	riskScore: integer("risk_score"), // 0-100
	riskLevel: text("risk_level"), // "low", "medium", "high", "critical"

	// Violation details
	ruleId: text("rule_id"),
	ruleName: text("rule_name"),
	violationDescription: text("violation_description"),

	// Metadata
	metadata: jsonb("metadata").$type<Record<string, any>>().default({}),

	// Context
	clientType: text("client_type"), // "vscode", "cli", "mcp", "web"
	clientVersion: text("client_version"),
	ideVersion: text("ide_version"),

	// Git context
	gitBranch: text("git_branch"),
	gitCommit: text("git_commit"),

	// Project context
	projectId: text("project_id"),
	workspaceId: text("workspace_id"),

	// Timestamps
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const bypassEventsRelations = relations(bypassEvents, ({ one }) => ({
	user: one(user, {
		fields: [bypassEvents.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [bypassEvents.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Type exports
export type BypassEvent = typeof bypassEvents.$inferSelect;
export type NewBypassEvent = typeof bypassEvents.$inferInsert;
