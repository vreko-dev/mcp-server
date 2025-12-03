import { createId as cuid } from "@paralleldrive/cuid2";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../postgres.js";

// Nurture track table
// Email sequencing and nurture path enrollment tracking
export const nurtureTrack = pgTable(
	"nurture_track",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Nurture campaign tracking
		trackName: text("track_name").notNull(), // "onboarding", "engagement", "reactivation"
		trackVersion: text("track_version").notNull().default("1"),

		// Step in nurture sequence
		currentStep: integer("current_step").notNull().default(0),
		totalSteps: integer("total_steps").notNull(),

		// Email details for current step
		lastEmailSentId: text("last_email_sent_id"),
		lastEmailSentAt: timestamp("last_email_sent_at"),
		lastEmailOpenedAt: timestamp("last_email_opened_at"),
		lastEmailClickedAt: timestamp("last_email_clicked_at"),

		// Engagement tracking
		emailsSent: integer("emails_sent").notNull().default(0),
		emailsOpened: integer("emails_opened").notNull().default(0),
		emailsClicked: integer("emails_clicked").notNull().default(0),
		unsubscribed: text("unsubscribed").notNull().default("false"),

		// Pause/resume tracking
		paused: text("paused").notNull().default("false"),
		pausedAt: timestamp("paused_at"),
		resumedAt: timestamp("resumed_at"),

		// Completion status
		completedAt: timestamp("completed_at"),

		enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index("nurture_track_user_id_idx").on(table.userId),
		trackNameIdx: index("nurture_track_track_name_idx").on(table.trackName),
		pausedIdx: index("nurture_track_paused_idx").on(table.paused),
		completedIdx: index("nurture_track_completed_at_idx").on(table.completedAt),
	}),
);

export type NurtureTrack = typeof nurtureTrack.$inferSelect;
export type NewNurtureTrack = typeof nurtureTrack.$inferInsert;
