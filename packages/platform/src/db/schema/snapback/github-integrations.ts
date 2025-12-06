import { relations } from "drizzle-orm";
import { boolean, decimal, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * GitHub Installations - GitHub App integration tracking
 *
 * Stores GitHub App installation metadata and webhook configuration.
 * Links GitHub organizations/users to SnapBack users for ground truth collection.
 */
export const githubInstallations = pgTable(
	"github_installations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// SnapBack user who installed the app
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// GitHub installation details
		githubInstallationId: text("github_installation_id").unique().notNull(),
		githubAccountId: text("github_account_id").notNull(), // User or org ID
		githubAccountType: text("github_account_type").notNull(), // 'User' or 'Organization'
		githubAccountLogin: text("github_account_login").notNull(), // Username or org name

		// Permissions granted
		permissions: jsonb("permissions").$type<Record<string, string>>().default({}),
		repositorySelection: text("repository_selection").notNull(), // 'all' or 'selected'
		selectedRepositoryIds: jsonb("selected_repository_ids").$type<string[]>().default([]),

		// Webhook configuration
		webhookId: text("webhook_id"),
		webhookSecret: text("webhook_secret"), // Encrypted
		webhookActive: boolean("webhook_active").default(true),

		// Status
		suspended: boolean("suspended").default(false),
		suspendedAt: timestamp("suspended_at"),

		// Timestamps
		installedAt: timestamp("installed_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique GitHub installation per app
		uniqueIndex("github_installations_github_id_idx").on(table.githubInstallationId),

		// Query by SnapBack user
		index("github_installations_user_idx").on(table.userId),

		// Query active installations
		index("github_installations_active_idx").on(table.suspended),
	],
);

/**
 * GitHub PR Analyses - Pull request AI contribution analysis
 *
 * Stores analysis results from GitHub PR checks.
 * Provides ground truth for trust calibration via Co-authored-by tags.
 */
export const githubPrAnalyses = pgTable(
	"github_pr_analyses",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Link to installation
		installationId: text("installation_id")
			.notNull()
			.references(() => githubInstallations.id, { onDelete: "cascade" }),

		// PR identification (hashed for privacy)
		repoId: text("repo_id").notNull(), // Hashed
		prNumber: integer("pr_number").notNull(),

		// Analysis results
		riskScore: integer("risk_score").notNull(), // 0-100
		aiContributionPercentage: decimal("ai_contribution_percentage", { precision: 5, scale: 2 }), // 0.00-100.00
		estimatedAiTool: text("estimated_ai_tool"), // 'cursor', 'copilot', etc.

		// Metrics
		filesChanged: integer("files_changed").notNull(),
		linesAdded: integer("lines_added").notNull(),
		linesRemoved: integer("lines_removed").notNull(),

		// Patterns detected
		patternsDetected: jsonb("patterns_detected").$type<string[]>().default([]),

		// Check status
		checkStatus: text("check_status").notNull(), // 'queued', 'in_progress', 'completed'
		checkConclusion: text("check_conclusion"), // 'success', 'neutral', 'failure'
		checkDetailsUrl: text("check_details_url"),

		// Ground truth (if commit has Co-authored-by)
		hasCoAuthorTag: boolean("has_co_author_tag").default(false),
		coAuthorTools: jsonb("co_author_tools").$type<string[]>().default([]),
		fedToCalibration: boolean("fed_to_calibration").default(false),

		// Timestamps
		analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique: one analysis per PR
		uniqueIndex("github_pr_analyses_repo_pr_idx").on(table.repoId, table.prNumber),

		// Query by installation
		index("github_pr_analyses_installation_idx").on(table.installationId),

		// Query ground truth data
		index("github_pr_analyses_ground_truth_idx").on(table.hasCoAuthorTag, table.fedToCalibration),
	],
);

export const githubInstallationsRelations = relations(githubInstallations, ({ one, many }) => ({
	user: one(user, {
		fields: [githubInstallations.userId],
		references: [user.id],
	}),
	prAnalyses: many(githubPrAnalyses),
}));

export const githubPrAnalysesRelations = relations(githubPrAnalyses, ({ one }) => ({
	installation: one(githubInstallations, {
		fields: [githubPrAnalyses.installationId],
		references: [githubInstallations.id],
	}),
}));
