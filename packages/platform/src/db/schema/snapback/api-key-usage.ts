import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apiKeyUsage = pgTable("api_key_usage", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	apiKeyId: text("api_key_id").notNull(),
	requestId: text("request_id").notNull(),
	endpoint: text("endpoint").notNull(),
	tokensUsed: integer("tokens_used").default(0),
	requestTimeMs: integer("request_time_ms").default(0),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type ApiKeyUsage = typeof apiKeyUsage.$inferSelect;
export type NewApiKeyUsage = typeof apiKeyUsage.$inferInsert;
