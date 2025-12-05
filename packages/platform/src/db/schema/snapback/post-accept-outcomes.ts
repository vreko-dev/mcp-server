import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys";

export const postAcceptOutcomes = pgTable(
	"post_accept_outcomes",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		userId: text("user_id").notNull(),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		suggestionId: text("suggestion_id").notNull(),
		editsMade: jsonb("edits_made").default([]),
		timeToEditMs: integer("time_to_edit_ms"),
		timeToSubmitMs: integer("time_to_submit_ms"),
		userFeedback: text("user_feedback"),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			userCreatedAtIndex: index("post_accept_outcomes_user_created_at_idx").on(table.userId, table.createdAt),
			apiKeyCreatedAtIndex: index("post_accept_outcomes_api_key_created_at_idx").on(
				table.apiKeyId,
				table.createdAt,
			),
		};
	},
);

export type PostAcceptOutcome = typeof postAcceptOutcomes.$inferSelect;
export type NewPostAcceptOutcome = typeof postAcceptOutcomes.$inferInsert;
