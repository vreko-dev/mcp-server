import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID())
		.notNull(),
	userId: text("user_id").notNull(),
	name: text("name"),
	key: text("key").notNull(), // Hashed API key
	keyPreview: text("key_preview").notNull(), // First 12 chars for display (e.g., "sk_live_abc123...")
	permissions: text("permissions").array().default([]).notNull(),
	revoked: boolean("revoked").default(false).notNull(),
	revokedAt: timestamp("revoked_at"), // When the key was revoked
	lastUsedAt: timestamp("last_used_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at"),
});
