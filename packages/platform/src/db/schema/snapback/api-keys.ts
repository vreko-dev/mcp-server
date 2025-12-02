import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
	id: text("id").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text("name"),
	permissions: text("permissions").array().default([]).notNull(),
	revoked: boolean("revoked").default(false).notNull(),
	lastUsedAt: timestamp("last_used_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at"),
});
