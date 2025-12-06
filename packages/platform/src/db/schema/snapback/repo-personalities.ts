import { relations } from "drizzle-orm";
import { decimal, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * Repository Personalities - Per-repo risk profiles
 *
 * Builds risk and AI tolerance profiles for each repository based on historical behavior.
 * Used for context-specific risk prediction and pattern matching.
 */
export const repoPersonalities = pgTable(
	"repo_personalities",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Ownership
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Repository identification (hashed for privacy)
		repoId: text("repo_id").notNull(), // Hash of repo path or GitHub repo ID
		repoName: text("repo_name"), // Optional display name

		// Risk profile
		riskProfile: text("risk_profile").notNull(), // 'production', 'experimental', 'stable'
		aiTolerance: decimal("ai_tolerance", { precision: 4, scale: 3 }).default("0.5"), // 0.000-1.000
		volatility: decimal("volatility", { precision: 4, scale: 3 }).default("0.5"), // Change frequency

		// Historical metrics
		incidentCount: integer("incident_count").default(0),
		totalCommits: integer("total_commits").default(0),
		aiContributionPercentage: decimal("ai_contribution_percentage", { precision: 5, scale: 2 }), // 0.00-100.00

		// Language and framework context
		primaryLanguage: text("primary_language"),
		frameworks: jsonb("frameworks").$type<string[]>().default([]),

		// Timestamps
		firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
		lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique: one personality per user/repo
		uniqueIndex("repo_personalities_user_repo_idx").on(table.userId, table.repoId),

		// Query by user
		index("repo_personalities_user_idx").on(table.userId),

		// Query by profile type
		index("repo_personalities_profile_idx").on(table.riskProfile),
	],
);

export const repoPersonalitiesRelations = relations(repoPersonalities, ({ one }) => ({
	user: one(user, {
		fields: [repoPersonalities.userId],
		references: [user.id],
	}),
}));
