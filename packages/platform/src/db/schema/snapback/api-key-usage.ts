import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apiKeyUsage = pgTable("api_key_usage", {
	id: uuid("id").primaryKey().defaultRandom().notNull(),
	apiKeyId: text("api_key_id").notNull(),
	endpoint: text("endpoint").notNull(),
	requestCount: integer("request_count").default(1).notNull(),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ApiKeyUsage = typeof apiKeyUsage.$inferSelect;
export type NewApiKeyUsage = typeof apiKeyUsage.$inferInsert;
