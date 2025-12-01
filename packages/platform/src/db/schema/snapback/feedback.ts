import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const feedback = pgTable("feedback", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	userId: text("user_id").notNull(),
	apiKeyId: text("api_key_id").notNull(),
	sessionId: text("session_id"),
	requestId: text("request_id"),
	feedbackType: text("feedback_type").notNull(),
	feedbackText: text("feedback_text"),
	rating: integer("rating"),
	metadata: jsonb("metadata").default({}),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
