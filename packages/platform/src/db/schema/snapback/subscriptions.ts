import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { boolean, integer, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, usageLimits, user } from "../postgres.js";

// Enums - matching those in postgres.ts
export const planTypeEnum = pgEnum("plan_type", ["free", "solo", "team", "enterprise"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
	"active",
	"canceled",
	"past_due",
	"trialing",
	"paused",
]);

// Subscriptions table - matching the definition in postgres.ts
export const subscriptions = pgTable("subscriptions", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => cuid()),
	userId: text("user_id").references(() => user.id, {
		onDelete: "cascade",
	}),
	organizationId: text("organization_id").references(() => organization.id, {
		onDelete: "cascade",
	}),
	stripeSubscriptionId: text("stripe_subscription_id").unique(),
	stripeCustomerId: text("stripe_customer_id"),
	plan: planTypeEnum("plan").notNull().default("free"),
	status: subscriptionStatusEnum("status").notNull().default("active"),
	currentPeriodStart: timestamp("current_period_start"),
	currentPeriodEnd: timestamp("current_period_end"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	trialEnd: timestamp("trial_end"),
	seats: integer("seats").default(1),
	metadata: json("metadata"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
	user: one(user, {
		fields: [subscriptions.userId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [subscriptions.organizationId],
		references: [organization.id],
	}),
	limits: many(usageLimits),
}));
