import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";

/**
 * Rule Violations - Track detected policy/rule violations
 */
export const ruleViolations = pgTable("rule_violations", {
	id: uuid("id").primaryKey().defaultRandom(),

	// Ownership
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id")
		.notNull()
		.references(() => apiKeys.id, { onDelete: "cascade" }),

	// Violation details
	ruleId: text("rule_id").notNull(),
	ruleName: text("rule_name").notNull(),
	ruleCategory: text("rule_category"), // "security", "privacy", "compliance", etc.

	// Detection context
	filePath: text("file_path"),
	lineStart: integer("line_start"),
	lineEnd: integer("line_end"),
	characterStart: integer("character_start"),
	characterEnd: integer("character_end"),

	// Violation severity
	severity: text("severity").notNull(), // "low", "medium", "high", "critical"
	confidence: integer("confidence"), // 0-100

	// Match details
	matchText: text("match_text"),
	pattern: text("pattern"),
	description: text("description"),

	// Remediation
	remediation: text("remediation"),
	remediationLink: text("remediation_link"),

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
export const ruleViolationsRelations = relations(ruleViolations, ({ one }) => ({
	user: one(user, {
		fields: [ruleViolations.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [ruleViolations.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Type exports
export type RuleViolation = typeof ruleViolations.$inferSelect;
export type NewRuleViolation = typeof ruleViolations.$inferInsert;
