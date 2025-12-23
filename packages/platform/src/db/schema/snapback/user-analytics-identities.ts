import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "../postgres";

// User analytics identities table
// Maps internal user IDs to external analytics platform identifiers
export const userAnalyticsIdentities = pgTable(
	"user_analytics_identities",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// PostHog identifier
		posthogUserId: text("posthog_user_id"),
		posthogDistinctId: text("posthog_distinct_id"),

		// HubSpot identifier
		hubspotContactId: text("hubspot_contact_id"),

		// Resend (email) identifier
		resendContactId: text("resend_contact_id"),

		// Anonymous tracking identifier (before signup)
		anonymousId: text("anonymous_id"),

		// Status and sync tracking
		synced: text("synced").notNull().default("false"),
		lastSyncedAt: timestamp("last_synced_at"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index("user_analytics_identities_user_id_idx").on(table.userId),
		posthogUserIdIdx: index("user_analytics_identities_posthog_user_id_idx").on(table.posthogUserId),
		hubspotContactIdIdx: uniqueIndex("user_analytics_identities_hubspot_contact_id_idx").on(table.hubspotContactId),
		anonymousIdIdx: index("user_analytics_identities_anonymous_id_idx").on(table.anonymousId),
	}),
);

export type UserAnalyticsIdentity = typeof userAnalyticsIdentities.$inferSelect;
export type NewUserAnalyticsIdentity = typeof userAnalyticsIdentities.$inferInsert;
