import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys";

export const feedback = pgTable(
	"feedback",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		userId: text("user_id").notNull(),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		sessionId: text("session_id"),
		requestId: text("request_id"),
		feedbackType: text("feedback_type").notNull(),
		feedbackText: text("feedback_text"),
		rating: integer("rating"),
		metadata: jsonb("metadata").default({}),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			userCreatedAtIndex: index("feedback_user_created_at_idx").on(table.userId, table.createdAt),
			apiKeyCreatedAtIndex: index("feedback_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
			feedbackTypeCheck: check(
				"feedback_feedback_type_check",
				sql`feedback_type IN ('positive', 'negative', 'neutral', 'bug_report')`,
			),
		};
	},
);

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
