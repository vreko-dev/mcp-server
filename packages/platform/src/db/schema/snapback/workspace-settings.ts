import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres.js";

export const workspaceSettings = pgTable(
	"workspace_settings",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		workspaceHash: text("workspace_hash").notNull(),

		// User preferences per workspace
		settings: jsonb("settings").default(
			JSON.stringify({
				autoAnalyze: true,
				inlineSuggestions: true,
				maxFileSizeKB: 500,
			}),
		),

		// Ignore patterns
		ignoredPatterns: text("ignored_patterns").array().default(["node_modules/**", "dist/**", ".git/**"]),

		// Custom rules
		customRules: jsonb("custom_rules").default(JSON.stringify({})),

		// Language-specific settings
		languageSettings: jsonb("language_settings").default(JSON.stringify({})),

		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		userIdIndex: uniqueIndex("idx_workspace_settings_user").on(table.userId),
		userWorkspaceUnique: uniqueIndex("workspace_settings_user_id_workspace_hash_unique").on(
			table.userId,
			table.workspaceHash,
		),
	}),
);

export const workspaceSettingsRelations = relations(workspaceSettings, ({ one }) => ({
	user: one(user, {
		fields: [workspaceSettings.userId],
		references: [user.id],
	}),
}));

export type WorkspaceSetting = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSetting = typeof workspaceSettings.$inferInsert;
