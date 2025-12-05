import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";

/**
 * Analysis Events - Time-series table for code analysis events
 *
 * This table will be converted to a hypertable in Supabase for efficient time-series queries
 */
export const analysisEvents = pgTable("analysis_events", {
	id: uuid("id").primaryKey().defaultRandom(),

	// Ownership
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id")
		.notNull()
		.references(() => apiKeys.id, { onDelete: "cascade" }),

	// Analysis metadata
	sessionId: text("session_id"), // For grouping related analyses
	requestId: text("request_id").notNull(), // Unique ID for this analysis request

	// Code context
	filePath: text("file_path"),
	lineStart: integer("line_start"),
	lineEnd: integer("line_end"),
	characterStart: integer("character_start"),
	characterEnd: integer("character_end"),

	// Risk analysis results
	riskScore: integer("risk_score"), // 0-100
	riskLevel: text("risk_level"), // "low", "medium", "high"
	riskFactors: jsonb("risk_factors")
		.$type<
			{
				type: string;
				severity: "low" | "medium" | "high";
				message: string;
				line?: number;
			}[]
		>()
		.default([]),

	// Detection details
	detectedPatterns: jsonb("detected_patterns")
		.$type<
			{
				patternId: string;
				type: string;
				match: string;
				line: number;
				severity: "low" | "medium" | "high";
			}[]
		>()
		.default([]),

	// Performance metrics
	analysisTimeMs: integer("analysis_time_ms"),
	fileSizeBytes: integer("file_size_bytes"),

	// Client context
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
export const analysisEventsRelations = relations(analysisEvents, ({ one }) => ({
	user: one(user, {
		fields: [analysisEvents.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [analysisEvents.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Type exports
export type AnalysisEvent = typeof analysisEvents.$inferSelect;
export type NewAnalysisEvent = typeof analysisEvents.$inferInsert;
