import { relations } from "drizzle-orm";
import { boolean, decimal, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * Predictions - ML-based risk and recovery predictions
 *
 * Stores predictions made by the tiered prediction engine and their outcomes.
 * Used for model accuracy tracking and calibration loop feedback.
 */
export const predictions = pgTable(
	"predictions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Session context
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		sessionId: text("session_id").notNull(), // Groups related predictions

		// Prediction details
		predictionType: text("prediction_type").notNull(), // 'risk_level', 'will_need_recovery', 'ai_tool_confidence'
		predictedValue: decimal("predicted_value", { precision: 5, scale: 4 }).notNull(), // 0.0000-1.0000
		confidence: decimal("confidence", { precision: 4, scale: 3 }).notNull(), // Model confidence

		// Model metadata
		modelVersion: text("model_version").notNull(),
		source: text("source").notNull(), // 'cache', 'heuristic', 'ml'
		latencyMs: integer("latency_ms"), // How long prediction took

		// Features used (for explainability)
		featuresUsed: jsonb("features_used").$type<string[]>().default([]),
		contextHash: text("context_hash"), // Anonymized context identifier

		// Outcome tracking
		actualOutcome: boolean("actual_outcome"), // Filled in later
		wasCorrect: boolean("was_correct"), // Prediction accuracy
		outcomeRecordedAt: timestamp("outcome_recorded_at"),
		feedbackSource: text("feedback_source"), // 'user_action', 'build_result', 'recovery_triggered'

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		// Query by user
		index("predictions_user_idx").on(table.userId),

		// Query by session
		index("predictions_session_idx").on(table.sessionId),

		// Query by model version (for A/B testing)
		index("predictions_model_idx").on(table.modelVersion),

		// Query accuracy (for monitoring)
		index("predictions_accuracy_idx").on(table.wasCorrect),
	],
);

export const predictionsRelations = relations(predictions, ({ one }) => ({
	user: one(user, {
		fields: [predictions.userId],
		references: [user.id],
	}),
}));
