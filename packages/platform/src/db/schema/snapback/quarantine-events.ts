import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
		originalEvent: jsonb("original_event").notNull(),
		errorReason: text("error_reason").notNull(),
		errorStack: text("error_stack"),
		attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			attemptedAtIndex: index("quarantine_events_attempted_at_idx").on(table.attemptedAt),
		};
	},
);

export type QuarantineEvent = typeof quarantineEvents.$inferSelect;
export type NewQuarantineEvent = typeof quarantineEvents.$inferInsert;
