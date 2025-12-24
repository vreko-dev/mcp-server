import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "../postgres";

// User product metrics table
// Stores lifetime aggregated metrics for each user (rolled up from daily)
export const userProductMetrics = pgTable(
	"user_product_metrics",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Lifetime aggregates
		snapshotsTotal: integer("snapshots_total").notNull().default(0),
		restoresTotal: integer("restores_total").notNull().default(0),
		minutesSavedTotal: integer("minutes_saved_total").notNull().default(0),
		aiSessionsTotal: integer("ai_sessions_total").notNull().default(0),

		// 7-day rolling window
		snapshots7d: integer("snapshots_7d").notNull().default(0),
		restores7d: integer("restores_7d").notNull().default(0),
		minutesSaved7d: integer("minutes_saved_7d").notNull().default(0),
		aiSessions7d: integer("ai_sessions_7d").notNull().default(0),

		// 30-day rolling window
		snapshots30d: integer("snapshots_30d").notNull().default(0),
		restores30d: integer("restores_30d").notNull().default(0),

		// Last activity tracking
		lastSnapshotAt: timestamp("last_snapshot_at"),
		lastRestoreAt: timestamp("last_restore_at"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index("user_product_metrics_user_id_idx").on(table.userId),
		lastSnapshotIdx: index("user_product_metrics_last_snapshot_idx").on(table.lastSnapshotAt),
	}),
);

export type UserProductMetric = typeof userProductMetrics.$inferSelect;
export type NewUserProductMetric = typeof userProductMetrics.$inferInsert;
