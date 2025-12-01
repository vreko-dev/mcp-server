import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const postAcceptOutcomes = pgTable("post_accept_outcomes", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	userId: text("user_id").notNull(),
	apiKeyId: text("api_key_id").notNull(),
	suggestionId: text("suggestion_id").notNull(),
	editsMade: jsonb("edits_made").default([]),
	timeToEditMs: integer("time_to_edit_ms"),
	timeToSubmitMs: integer("time_to_submit_ms"),
	userFeedback: text("user_feedback"),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PostAcceptOutcome = typeof postAcceptOutcomes.$inferSelect;
export type NewPostAcceptOutcome = typeof postAcceptOutcomes.$inferInsert;
