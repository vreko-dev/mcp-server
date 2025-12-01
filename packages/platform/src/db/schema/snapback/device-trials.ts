import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres.js";

/**
 * Device Trials Table
 *
 * Tracks anonymous VSCode extension trials using device fingerprints.
 * Enables progressive authentication: device → email → payment.
 *
 * Progressive Funnel:
 * 1. Anonymous trial: 50 snapshots (device fingerprint only)
 * 2. Email signup: 1000 snapshots (links device to user)
 * 3. Paid tier: Unlimited snapshots (full account)
 *
 * Anti-abuse: Blocks after 3 reinstalls within 24h with 24h cooldown
 */
export const deviceTrials = pgTable(
	"device_trials",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		// Device Identity (from VSCode machineId)
		deviceFingerprint: text("device_fingerprint").notNull().unique(),

		// API Key for this device trial
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),

		// Usage Tracking
		snapshotsUsed: integer("snapshots_used").notNull().default(0),
		apiCallsUsed: integer("api_calls_used").notNull().default(0),

		// Limits (increase on conversion)
		snapshotLimit: integer("snapshot_limit").notNull().default(50),
		apiCallLimit: integer("api_call_limit").notNull().default(10000),

		// User Conversion (null until email signup)
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		convertedAt: timestamp("converted_at"),

		// Abuse Prevention
		installCount: integer("install_count").notNull().default(1),
		blockedUntil: timestamp("blocked_until"), // null = not blocked

		// Timestamps
		lastSeenAt: timestamp("last_seen_at").defaultNow(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		// Index for fast fingerprint lookups
		deviceFingerprintIdx: uniqueIndex("device_trials_fingerprint_idx").on(table.deviceFingerprint),
		// Index for finding all devices for a user
		userIdx: uniqueIndex("device_trials_user_idx").on(table.userId),
		// Index for checking blocked devices
		blockedUntilIdx: uniqueIndex("device_trials_blocked_idx").on(table.blockedUntil),
	}),
);

export const deviceTrialsRelations = relations(deviceTrials, ({ one }) => ({
	user: one(user, {
		fields: [deviceTrials.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [deviceTrials.apiKeyId],
		references: [apiKeys.id],
	}),
}));
