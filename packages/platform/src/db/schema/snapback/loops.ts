import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys.js";

export const loops = pgTable(
	"loops",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		userId: text("user_id").notNull(),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		sessionId: text("session_id"),
		requestId: text("request_id").notNull(),
		loopType: text("loop_type").notNull(),
		iterationCount: integer("iteration_count").default(0),
		durationMs: integer("duration_ms"),
		success: boolean("success").default(false),
		errorMessage: text("error_message"),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			userCreatedAtIndex: index("loops_user_created_at_idx").on(table.userId, table.createdAt),
			apiKeyCreatedAtIndex: index("loops_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
			loopTypeCheck: check(
				"loops_loop_type_check",
				sql`loop_type IN ('retry', 'recovery', 'optimization', 'validation')`,
			),
		};
	},
);

export type Loop = typeof loops.$inferSelect;
export type NewLoop = typeof loops.$inferInsert;
