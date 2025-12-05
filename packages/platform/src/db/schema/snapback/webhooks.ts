import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { bigint, boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../postgres";

// Webhook events
export const webhookEvents = pgTable("webhook_events", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	eventId: text("event_id")
		.notNull()
		.$defaultFn(() => cuid()),
	eventType: text("event_type").notNull(), // "subscription.created", "usage.exceeded"

	source: text("source").notNull(), // "stripe", "github", "internal"
	sourceId: text("source_id"),

	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),

	payload: jsonb("payload").notNull(),

	processed: boolean("processed").default(false),
	processedAt: timestamp("processed_at"),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),

	createdAt: timestamp("created_at").defaultNow(),
});

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
	user: one(user, {
		fields: [webhookEvents.userId],
		references: [user.id],
	}),
}));

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
