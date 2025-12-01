import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres.js";

export const responseCache = pgTable(
	"response_cache",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),

		// Cache key (hash of normalized request)
		cacheKey: text("cache_key").notNull().unique(),
		userId: text("user_id").notNull(),
		endpoint: text("endpoint").notNull(),

		// Cached response
		response: jsonb("response").notNull(),
		tokensUsed: integer("tokens_used").default(0),

		// Cache management
		expiresAt: timestamp("expires_at").notNull(),
		hitCount: integer("hit_count").default(0),
		lastHitAt: timestamp("last_hit_at").defaultNow(),

		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		userIdIndex: index("idx_response_cache_user").on(table.userId),
		cacheKeyIndex: uniqueIndex("idx_response_cache_key").on(table.cacheKey),
		expiryIndex: index("idx_response_cache_expiry").on(table.expiresAt),
	}),
);

export const responseCacheRelations = relations(responseCache, ({ one }) => ({
	user: one(user, {
		fields: [responseCache.userId],
		references: [user.id],
	}),
}));

export type ResponseCache = typeof responseCache.$inferSelect;
export type NewResponseCache = typeof responseCache.$inferInsert;
