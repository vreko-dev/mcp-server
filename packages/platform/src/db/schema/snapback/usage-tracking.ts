import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { bigint, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres.js";

// High-frequency API usage logs (partitioned by month)
export const apiUsageLogs = pgTable("api_usage_logs", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	// Request identification
	requestId: text("request_id")
		.notNull()
		.$defaultFn(() => cuid()),
	apiKeyId: text("api_key_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Request details
	endpoint: text("endpoint").notNull(),
	method: text("method").notNull(),

	// Usage metrics
	tokensUsed: integer("tokens_used").default(0),
	requestCount: integer("request_count").default(1),

	// Performance
	responseTimeMs: integer("response_time_ms").notNull(),
	responseStatus: integer("response_status").notNull(),

	// Client info
	clientVersion: text("client_version"),
	clientPlatform: text("client_platform"),
	ideVersion: text("ide_version"),

	// IP/location
	ipAddress: text("ip_address"),
	countryCode: text("country_code"),

	// Error tracking
	errorCode: text("error_code"),
	errorMessage: text("error_message"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

export const apiUsageLogsRelations = relations(apiUsageLogs, ({ one }) => ({
	user: one(user, {
		fields: [apiUsageLogs.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [apiUsageLogs.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Partition tables for api_usage_logs
export const apiUsageLogs202510 = pgTable("api_usage_logs_2025_10", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	// Request identification
	requestId: text("request_id")
		.notNull()
		.$defaultFn(() => cuid()),
	apiKeyId: text("api_key_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Request details
	endpoint: text("endpoint").notNull(),
	method: text("method").notNull(),

	// Usage metrics
	tokensUsed: integer("tokens_used").default(0),
	requestCount: integer("request_count").default(1),

	// Performance
	responseTimeMs: integer("response_time_ms").notNull(),
	responseStatus: integer("response_status").notNull(),

	// Client info
	clientVersion: text("client_version"),
	clientPlatform: text("client_platform"),
	ideVersion: text("ide_version"),

	// IP/location
	ipAddress: text("ip_address"),
	countryCode: text("country_code"),

	// Error tracking
	errorCode: text("error_code"),
	errorMessage: text("error_message"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

export const apiUsageLogs202511 = pgTable("api_usage_logs_2025_11", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	// Request identification
	requestId: text("request_id")
		.notNull()
		.$defaultFn(() => cuid()),
	apiKeyId: text("api_key_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Request details
	endpoint: text("endpoint").notNull(),
	method: text("method").notNull(),

	// Usage metrics
	tokensUsed: integer("tokens_used").default(0),
	requestCount: integer("request_count").default(1),

	// Performance
	responseTimeMs: integer("response_time_ms").notNull(),
	responseStatus: integer("response_status").notNull(),

	// Client info
	clientVersion: text("client_version"),
	clientPlatform: text("client_platform"),
	ideVersion: text("ide_version"),

	// IP/location
	ipAddress: text("ip_address"),
	countryCode: text("country_code"),

	// Error tracking
	errorCode: text("error_code"),
	errorMessage: text("error_message"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

// Aggregated daily stats (computed nightly)
export const usageStatsDaily = pgTable(
	"usage_stats_daily",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),

		// Counts
		totalRequests: integer("total_requests").default(0),
		totalTokens: bigint("total_tokens", { mode: "number" }).default(0),
		successfulRequests: integer("successful_requests").default(0),
		failedRequests: integer("failed_requests").default(0),

		// Performance
		avgResponseTimeMs: integer("avg_response_time_ms"),
		p95ResponseTimeMs: integer("p95_response_time_ms"),

		// Feature usage breakdown
		endpointsUsed: jsonb("endpoints_used").default(JSON.stringify({})),

		// Client info
		clientVersions: jsonb("client_versions").default(JSON.stringify([])),

		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		userIdDateIndex: uniqueIndex("idx_usage_stats_user_date").on(table.userId, table.date),
		dateIndex: uniqueIndex("idx_usage_stats_date").on(table.date),
		userIdDateUnique: uniqueIndex("usage_stats_daily_user_id_date_unique").on(table.userId, table.date),
	}),
);

export const usageStatsDailyRelations = relations(usageStatsDaily, ({ one }) => ({
	user: one(user, {
		fields: [usageStatsDaily.userId],
		references: [user.id],
	}),
}));

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type NewApiUsageLog = typeof apiUsageLogs.$inferInsert;
export type UsageStatDaily = typeof usageStatsDaily.$inferSelect;
export type NewUsageStatDaily = typeof usageStatsDaily.$inferInsert;
