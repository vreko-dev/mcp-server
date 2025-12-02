import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys } from "./api-keys.js";

/**
 * Quarantine Events - Dead-letter queue for failed telemetry events
 *
 * This table stores events that failed to be processed for any reason,
 * allowing for inspection, debugging, and replay of failed events.
 */
export const quarantineEvents = pgTable(
	"quarantine_events",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		userId: text("user_id"),
		apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }),
		originalEvent: jsonb("original_event").notNull(),
		errorReason: text("error_reason").notNull(),
		errorStack: text("error_stack"),
		attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			attemptedAtIndex: index("quarantine_events_attempted_at_idx").on(table.attemptedAt),
			userCreatedAtIndex: index("quarantine_events_user_created_at_idx").on(table.userId, table.createdAt),
			apiKeyCreatedAtIndex: index("quarantine_events_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
		};
	},
);

export type QuarantineEvent = typeof quarantineEvents.$inferSelect;
export type NewQuarantineEvent = typeof quarantineEvents.$inferInsert;
