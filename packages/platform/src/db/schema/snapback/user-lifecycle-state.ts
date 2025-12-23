import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "../postgres";

// Lifecycle state enum
export const lifecycleStageEnum = pgEnum("lifecycle_stage", ["new", "engaged", "power_user", "at_risk", "churned"]);

// User lifecycle state table
// Tracks user progression through lifecycle stages
export const userLifecycleState = pgTable(
	"user_lifecycle_state",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Current stage
		stage: lifecycleStageEnum("stage").notNull().default("new"),

		// Stage transition tracking
		stagedAt: timestamp("staged_at").notNull().defaultNow(),
		transitionReason: text("transition_reason"),

		// Engagement metrics for state decisions
		snapshotsSinceStart: text("snapshots_since_start").notNull().default("0"),
		daysSinceLastActivity: text("days_since_last_activity").notNull().default("0"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userIdIdx: index("user_lifecycle_state_user_id_idx").on(table.userId),
		stageIdx: index("user_lifecycle_state_stage_idx").on(table.stage),
		updatedAtIdx: index("user_lifecycle_state_updated_at_idx").on(table.updatedAt),
	}),
);

export type UserLifecycleState = typeof userLifecycleState.$inferSelect;
export type NewUserLifecycleState = typeof userLifecycleState.$inferInsert;
