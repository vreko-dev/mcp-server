import { relations } from "drizzle-orm";
import { bigint, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { apiKeys, planTypeEnum, user } from "../postgres";

// Rate limiting violations
export const rateLimitViolations = pgTable("rate_limit_violations", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id").notNull(),

	// Violation details
	limitType: text("limit_type").notNull(), // "per_minute", "per_hour", "daily", "monthly"
	limitValue: integer("limit_value").notNull(),
	currentValue: integer("current_value").notNull(),

	// Context
	endpoint: text("endpoint"),
	plan: planTypeEnum("plan"),

	// Response
	retryAfterSeconds: integer("retry_after_seconds"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

export const rateLimitViolationsRelations = relations(rateLimitViolations, ({ one }) => ({
	user: one(user, {
		fields: [rateLimitViolations.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [rateLimitViolations.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Token bucket state (for smooth rate limiting)
export const tokenBuckets = pgTable(
	"token_buckets",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),

		// Bucket state
		tokens: numeric("tokens").notNull(), // Current tokens
		capacity: integer("capacity").notNull(), // Max tokens
		refillRate: numeric("refill_rate").notNull(), // Tokens per second
		lastRefill: timestamp("last_refill").defaultNow(),

		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		userIdIndex: uniqueIndex("idx_token_buckets_user").on(table.userId),
	}),
);

export const tokenBucketsRelations = relations(tokenBuckets, ({ one }) => ({
	user: one(user, {
		fields: [tokenBuckets.userId],
		references: [user.id],
	}),
}));

export type RateLimitViolation = typeof rateLimitViolations.$inferSelect;
export type NewRateLimitViolation = typeof rateLimitViolations.$inferInsert;
export type TokenBucket = typeof tokenBuckets.$inferSelect;
export type NewTokenBucket = typeof tokenBuckets.$inferInsert;
