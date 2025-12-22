import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * MCP Aggregated Learnings - Cross-workspace pattern aggregation
 * Privacy: Pattern keys only, no code content (C-006)
 *
 * Auto-promotion rules:
 * - 2+ workspaces with same pattern → promoted to user preferences
 * - High confidence (>0.8) → included in recommendations
 */
export const mcpAggregatedLearnings = pgTable("mcp_aggregated_learnings", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Pattern identification (no code content)
	patternKey: text("pattern_key").notNull(), // e.g., "typescript", "react-hooks", "vitest"
	patternType: text("pattern_type").notNull(), // "stack", "practice", "preference"

	// Cross-workspace aggregation
	workspaceCount: integer("workspace_count").default(1).notNull(),
	workspaceIds: jsonb("workspace_ids").default(JSON.stringify([])).notNull(), // Array of workspace IDs seen
	totalOccurrences: integer("total_occurrences").default(1).notNull(),
	confidence: real("confidence").default(0.5).notNull(), // 0.0-1.0

	// Last seen metadata
	lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
	firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mcpAggregatedLearningsRelations = relations(mcpAggregatedLearnings, ({ one }) => ({
	user: one(user, {
		fields: [mcpAggregatedLearnings.userId],
		references: [user.id],
	}),
}));

/**
 * MCP Activity Events - Metadata-only activity tracking
 * Privacy: Event types and counts only, never code content (C-006)
 */
export const mcpActivityEvents = pgTable("mcp_activity_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	sessionId: uuid("session_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Event metadata (no code content)
	eventType: text("event_type").notNull(), // "snapshot_created", "risk_analyzed", "learning_recorded"

	// Aggregate data only
	fileCount: integer("file_count"), // Number of files, not paths
	totalBytes: integer("total_bytes"), // Size, not content
	riskLevel: text("risk_level"), // "low", "medium", "high", "critical"

	timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const mcpActivityEventsRelations = relations(mcpActivityEvents, ({ one }) => ({
	user: one(user, {
		fields: [mcpActivityEvents.userId],
		references: [user.id],
	}),
}));
