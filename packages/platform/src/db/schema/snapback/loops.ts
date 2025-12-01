import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const loops = pgTable("loops", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	userId: text("user_id").notNull(),
	apiKeyId: text("api_key_id").notNull(),
	sessionId: text("session_id"),
	requestId: text("request_id").notNull(),
	loopType: text("loop_type").notNull(),
	iterationCount: integer("iteration_count").default(0),
	durationMs: integer("duration_ms"),
	success: boolean("success").default(false),
	errorMessage: text("error_message"),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Loop = typeof loops.$inferSelect;
export type NewLoop = typeof loops.$inferInsert;
