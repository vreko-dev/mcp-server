import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const agentSuggestions = pgTable("agent_suggestions", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	userId: text("user_id").notNull(),
	apiKeyId: text("api_key_id").notNull(),
	sessionId: text("session_id"),
	requestId: text("request_id").notNull(),
	suggestionId: text("suggestion_id").notNull(),
	suggestionText: text("suggestion_text").notNull(),
	suggestionType: text("suggestion_type"),
	filePath: text("file_path"),
	lineStart: integer("line_start"),
	lineEnd: integer("line_end"),
	characterStart: integer("character_start"),
	characterEnd: integer("character_end"),
	accepted: boolean("accepted").default(false),
	dismissed: boolean("dismissed").default(false),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AgentSuggestion = typeof agentSuggestions.$inferSelect;
export type NewAgentSuggestion = typeof agentSuggestions.$inferInsert;
