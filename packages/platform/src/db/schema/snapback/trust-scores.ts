import { relations } from "drizzle-orm";
import { decimal, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * Trust Scores - Momentum-based EWMA calibration for AI tools
 *
 * Stores adaptive trust scores that update based on ground truth feedback.
 * Uses exponentially weighted moving average (EWMA) with momentum for fast adaptation.
 */
export const trustScores = pgTable(
	"trust_scores",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Ownership
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Tool identification
		toolId: text("tool_id").notNull(), // e.g., 'cursor_0.42', 'copilot_1.2'
		contextKey: text("context_key").notNull(), // e.g., 'react_typescript', 'python_fastapi'

		// Trust score state (EWMA with momentum)
		score: decimal("score", { precision: 4, scale: 3 }).notNull(), // 0.000-1.000
		momentum: decimal("momentum", { precision: 4, scale: 3 }).default("0"), // -1.000 to 1.000
		volatility: decimal("volatility", { precision: 4, scale: 3 }).default("0.5"), // 0.000-1.000

		// Calibration metadata
		sampleCount: integer("sample_count").default(0).notNull(),
		recentWindow: jsonb("recent_window").$type<number[]>().default([]), // Last 20 outcomes (0 or 1)
		lastCalibration: timestamp("last_calibration").defaultNow().notNull(),
		modelVersion: text("model_version").notNull(), // Which AI detection model

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique constraint: one trust score per user/tool/context
		uniqueIndex("trust_scores_user_tool_context_idx").on(table.userId, table.toolId, table.contextKey),

		// Query by user
		index("trust_scores_user_idx").on(table.userId),

		// Query by tool
		index("trust_scores_tool_idx").on(table.toolId),
	],
);

export const trustScoresRelations = relations(trustScores, ({ one }) => ({
	user: one(user, {
		fields: [trustScores.userId],
		references: [user.id],
	}),
}));
