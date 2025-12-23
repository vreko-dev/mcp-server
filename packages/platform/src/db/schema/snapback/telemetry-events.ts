import { integer, json, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { apiKeys, user } from "../postgres";

// Telemetry events for time-series tracking
export const telemetryEvents = pgTable(
	"telemetry_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		apiKeyId: text("api_key_id").references(() => apiKeys.id, {
			onDelete: "cascade",
		}),

		// Event identification
		eventType: text("event_type").notNull(),
		eventCategory: text("event_category"), // "lifecycle", "feature_usage", "error", "system", "engagement"

		// Event data
		properties: json("properties").$type<Record<string, unknown>>().default({}),

		// Platform context
		platform: text("platform"), // "vscode", "cli", "web", "mcp", "mobile"
		clientVersion: text("client_version"),
		ideVersion: text("ide_version"),

		// Device context (for anonymous users)
		deviceFingerprint: text("device_fingerprint"),

		// Session context
		sessionId: text("session_id"),

		// Metadata
		timestamp: timestamp("timestamp").notNull().defaultNow(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("telemetry_events_user_timestamp_idx").on(table.userId, table.timestamp),
		uniqueIndex("telemetry_events_api_key_timestamp_idx").on(table.apiKeyId, table.timestamp),
		uniqueIndex("telemetry_events_event_type_idx").on(table.eventType),
		uniqueIndex("telemetry_events_timestamp_idx").on(table.timestamp),
	],
);

// Idempotency keys for preventing duplicate processing of telemetry events
// MVP Note: Added for idempotency support in telemetry API to prevent
// duplicate event processing and inflated analytics/billing
export const telemetryIdempotencyKeys = pgTable(
	"telemetry_idempotency_keys",
	{
		idempotencyKey: text("idempotency_key").primaryKey(),
		responseData: json("response_data").$type<Record<string, unknown>>().notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		expiresAt: timestamp("expires_at").notNull(),
	},
	(table) => [uniqueIndex("telemetry_idempotency_keys_expires_at_idx").on(table.expiresAt)],
);

// Daily aggregated telemetry stats for performance
export const telemetryDailyStats = pgTable(
	"telemetry_daily_stats",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		date: timestamp("date").notNull(),

		// Event counts by category
		totalEvents: integer("total_events").notNull().default(0),
		featureUsageEvents: integer("feature_usage_events").notNull().default(0),
		errorEvents: integer("error_events").notNull().default(0),
		lifecycleEvents: integer("lifecycle_events").notNull().default(0),
		engagementEvents: integer("engagement_events").notNull().default(0),

		// Platform usage
		platforms: json("platforms").$type<Record<string, number>>().default({}),

		// Most used features
		topFeatures: json("top_features").$type<{ feature: string; count: number }[]>().default([]),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [uniqueIndex("telemetry_daily_stats_user_date_idx").on(table.userId, table.date)],
);
