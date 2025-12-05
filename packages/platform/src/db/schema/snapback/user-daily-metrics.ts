import { createId as cuid } from "@paralleldrive/cuid2";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres";

// User daily metrics table
// Stores daily snapshot aggregates for each user
export const userDailyMetrics = pgTable(
	"user_daily_metrics",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),

		// Daily aggregates
		snapshotsCreated: integer("snapshots_created").notNull().default(0),
		snapshotsRestored: integer("snapshots_restored").notNull().default(0),
		minutesSavedEstimate: integer("minutes_saved_estimate").notNull().default(0),
		aiSessions: integer("ai_sessions").notNull().default(0),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userDateUnique: uniqueIndex("user_daily_metrics_user_date_unique").on(table.userId, table.date),
		userIdIdx: index("user_daily_metrics_user_id_idx").on(table.userId),
		dateIdx: index("user_daily_metrics_date_idx").on(table.date),
	}),
);

export type UserDailyMetric = typeof userDailyMetrics.$inferSelect;
export type NewUserDailyMetric = typeof userDailyMetrics.$inferInsert;
