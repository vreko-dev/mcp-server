import { boolean, check, index, integer, pgTable, text, timestamp, uuid, foreignKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { apiKeys } from "./api-keys.js";

export const agentSuggestions = pgTable(
	"agent_suggestions",
	{
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
	},
	(table) => {
		return {
			userIdFk: foreignKey({
				columns: [table.userId],
				foreignColumns: [table.userId],
				name: "agent_suggestions_user_id_fk",
			}).onDelete("cascade"),
			apiKeyIdFk: foreignKey({
				columns: [table.apiKeyId],
				foreignColumns: [apiKeys.id],
				name: "agent_suggestions_api_key_id_fk",
			}).onDelete("cascade"),
			userCreatedAtIndex: index("agent_suggestions_user_created_at_idx").on(
				table.userId,
				table.createdAt,
			),
			apiKeyCreatedAtIndex: index("agent_suggestions_api_key_created_at_idx").on(
				table.apiKeyId,
				table.createdAt,
			),
			suggestionTypeCheck: check(
				"agent_suggestions_suggestion_type_check",
				sql`suggestion_type IN ('code', 'refactor', 'documentation', 'test', 'optimization', 'security')`,
			),
		};
	},
);

export type AgentSuggestion = typeof agentSuggestions.$inferSelect;
export type NewAgentSuggestion = typeof agentSuggestions.$inferInsert;
