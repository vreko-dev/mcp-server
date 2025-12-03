import { createId as cuid } from "@paralleldrive/cuid2";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../postgres.js";

// Protection decisions table
// ML training data for protection decision models (historical outcomes)
export const protectionDecisions = pgTable(
	"protection_decisions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Decision details
		decisionType: text("decision_type").notNull(), // "block", "allow", "quarantine"
		filePath: text("file_path").notNull(),
		riskScore: integer("risk_score").notNull(), // 0-100

		// Outcome label (for supervised ML training)
		outcomeLabel: text("outcome_label"), // "correct_block", "false_positive", "correct_allow", "missed_threat"
		userFeedback: text("user_feedback"), // User's judgment

		// Context for retraining
		fileSize: integer("file_size"),
		fileType: text("file_type"),
		sourceContext: text("source_context"),

		decisionAt: timestamp("decision_at").notNull().defaultNow(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index("protection_decisions_user_id_idx").on(table.userId),
		decisionTypeIdx: index("protection_decisions_decision_type_idx").on(table.decisionType),
		outcomeLabelIdx: index("protection_decisions_outcome_label_idx").on(table.outcomeLabel),
	}),
);

export type ProtectionDecision = typeof protectionDecisions.$inferSelect;
export type NewProtectionDecision = typeof protectionDecisions.$inferInsert;
