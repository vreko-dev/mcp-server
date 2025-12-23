import { relations } from "drizzle-orm";
import { index, integer, json, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

// Waitlist status enum
export const waitlistStatusEnum = pgEnum("waitlist_status", ["pending", "invited", "accepted", "rejected"]);

// Main waitlist table
export const waitlist = pgTable(
	"waitlist",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		email: text("email").notNull().unique(),
		githubUsername: text("github_username"),
		editor: text("editor"),
		language: text("language"),
		teamSize: text("team_size"),
		queuePosition: integer("queue_position").notNull(),
		status: waitlistStatusEnum("status").notNull().default("pending"),

		// HubSpot integration
		hubspotContactId: text("hubspot_contact_id"),
		hubspotSyncedAt: timestamp("hubspot_synced_at"),

		// Email tracking
		emailSent: timestamp("email_sent"),
		emailSentAt: timestamp("email_sent_at"),

		// Invitation tracking
		invitedAt: timestamp("invited_at"),
		acceptedAt: timestamp("accepted_at"),

		// Metadata
		metadata: json("metadata").$type<{
			referrer?: string;
			utmSource?: string;
			utmMedium?: string;
			utmCampaign?: string;
			userAgent?: string;
		}>(),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("waitlist_email_idx").on(table.email),
		index("waitlist_status_idx").on(table.status),
		index("waitlist_queue_position_idx").on(table.queuePosition),
	],
);

// Referrals table
export const waitlistReferrals = pgTable(
	"waitlist_referrals",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		referrerId: text("referrer_id")
			.notNull()
			.references(() => waitlist.id, { onDelete: "cascade" }),
		referredEmail: text("referred_email").notNull(),
		referredId: text("referred_id").references(() => waitlist.id, {
			onDelete: "set null",
		}),
		pointsAwarded: integer("points_awarded").default(0).notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("waitlist_referrals_referrer_idx").on(table.referrerId),
		index("waitlist_referrals_referred_idx").on(table.referredId),
	],
);

// Queue jump tasks
export const waitlistTasks = pgTable(
	"waitlist_tasks",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		waitlistId: text("waitlist_id")
			.notNull()
			.references(() => waitlist.id, { onDelete: "cascade" }),
		taskType: text("task_type").notNull(), // 'github', 'demo', 'snapshot'
		completed: timestamp("completed"),
		pointsEarned: integer("points_earned").notNull(),
		metadata: json("metadata").$type<{
			githubStarred?: boolean;
			demoWatched?: boolean;
			snapshotCreated?: boolean;
		}>(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("waitlist_tasks_waitlist_idx").on(table.waitlistId),
		index("waitlist_tasks_type_idx").on(table.taskType),
	],
);

// Relations
export const waitlistRelations = relations(waitlist, ({ many }) => ({
	referrals: many(waitlistReferrals, { relationName: "referrer" }),
	referredBy: many(waitlistReferrals, { relationName: "referred" }),
	tasks: many(waitlistTasks),
}));

export const waitlistReferralsRelations = relations(waitlistReferrals, ({ one }) => ({
	referrer: one(waitlist, {
		fields: [waitlistReferrals.referrerId],
		references: [waitlist.id],
		relationName: "referrer",
	}),
	referred: one(waitlist, {
		fields: [waitlistReferrals.referredId],
		references: [waitlist.id],
		relationName: "referred",
	}),
}));

export const waitlistTasksRelations = relations(waitlistTasks, ({ one }) => ({
	waitlistEntry: one(waitlist, {
		fields: [waitlistTasks.waitlistId],
		references: [waitlist.id],
	}),
}));

// Type exports
export type Waitlist = typeof waitlist.$inferSelect;
export type NewWaitlist = typeof waitlist.$inferInsert;
export type WaitlistReferral = typeof waitlistReferrals.$inferSelect;
export type NewWaitlistReferral = typeof waitlistReferrals.$inferInsert;
export type WaitlistTask = typeof waitlistTasks.$inferSelect;
export type NewWaitlistTask = typeof waitlistTasks.$inferInsert;
