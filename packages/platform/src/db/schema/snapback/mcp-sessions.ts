import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * MCP Sessions - Tracks development sessions for cross-workspace learning
 * Privacy: Metadata only, no code content (C-006)
 */
export const mcpSessions = pgTable("mcp_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id").notNull(), // Hashed workspace identifier

	// Session metadata
	taskDescription: text("task_description"), // User-provided, not code
	startedAt: timestamp("started_at").defaultNow().notNull(),
	endedAt: timestamp("ended_at"),

	// Aggregate metrics (no code content)
	snapshotCount: integer("snapshot_count").default(0),
	riskAnalysisCount: integer("risk_analysis_count").default(0),
	learningsRecorded: integer("learnings_recorded").default(0),

	// Framework/stack detection (metadata only)
	detectedStack: jsonb("detected_stack").default(JSON.stringify({})),
	// Example: { frameworks: ["nextjs"], languages: ["typescript"], packageManager: "pnpm" }

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mcpSessionsRelations = relations(mcpSessions, ({ one }) => ({
	user: one(user, {
		fields: [mcpSessions.userId],
		references: [user.id],
	}),
}));
