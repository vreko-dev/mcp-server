import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * Engagement Scores - Community engagement tracking
 *
 * Tracks user engagement actions for beta eligibility and growth loops.
 * Powers the community-driven growth strategy.
 */
export const engagementScores = pgTable(
	"engagement_scores",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// User
		userId: text("user_id")
			.unique()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Score components
		totalEngagementScore: integer("total_engagement_score").default(0).notNull(),
		usageScore: integer("usage_score").default(0).notNull(), // Snapshots, recoveries, etc.
		feedbackQualityScore: integer("feedback_quality_score").default(0).notNull(),
		communityScore: integer("community_score").default(0).notNull(), // GitHub, Discord, etc.
		referralScore: integer("referral_score").default(0).notNull(),

		// Beta tier
		betaTier: text("beta_tier").default("none").notNull(), // 'none', 'early_access', 'beta', 'lifetime_free'
		tierUnlockedAt: timestamp("tier_unlocked_at"),

		// Qualifying actions (for transparency)
		qualifyingActions: jsonb("qualifying_actions").$type<string[]>().default([]),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique: one score per user
		index("engagement_scores_user_idx").on(table.userId),

		// Query by tier
		index("engagement_scores_tier_idx").on(table.betaTier),

		// Leaderboard query
		index("engagement_scores_total_idx").on(table.totalEngagementScore),
	],
);

/**
 * Engagement Actions - Individual engagement action log
 *
 * Tracks each community action for points calculation and audit trail.
 */
export const engagementActions = pgTable(
	"engagement_actions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// User
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Action details
		actionType: text("action_type").notNull(), // 'github_star', 'disaster_story_shared', etc.
		pointsEarned: integer("points_earned").notNull(),

		// Progress tracking
		tierProgressBefore: integer("tier_progress_before").notNull(),
		tierProgressAfter: integer("tier_progress_after").notNull(),
		engagementScoreDelta: integer("engagement_score_delta").notNull(),

		// Action metadata
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

		// Timestamp
		performedAt: timestamp("performed_at").defaultNow().notNull(),
	},
	(table) => [
		// Query by user
		index("engagement_actions_user_idx").on(table.userId),

		// Query by action type (for analytics)
		index("engagement_actions_type_idx").on(table.actionType),

		// Query recent actions
		index("engagement_actions_time_idx").on(table.performedAt),
	],
);

export const engagementScoresRelations = relations(engagementScores, ({ one, many }) => ({
	user: one(user, {
		fields: [engagementScores.userId],
		references: [user.id],
	}),
	actions: many(engagementActions),
}));

export const engagementActionsRelations = relations(engagementActions, ({ one }) => ({
	user: one(user, {
		fields: [engagementActions.userId],
		references: [user.id],
	}),
	score: one(engagementScores, {
		fields: [engagementActions.userId],
		references: [engagementScores.userId],
	}),
}));
