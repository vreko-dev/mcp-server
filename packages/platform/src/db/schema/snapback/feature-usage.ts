import { relations } from "drizzle-orm";
import { bigint, boolean, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../postgres.js";
import { extensionSessions } from "./extension-sessions.js";

// Enums
export const featureCategoryEnum = pgEnum("feature_category", [
	"code_analysis",
	"code_refactor",
	"code_search",
	"git_operations",
	"ai_assistance",
	"debugging",
	"testing",
	"documentation",
]);

// Feature usage tracking (partitioned by month)
export const featureUsage = pgTable("feature_usage", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	sessionId: text("session_id").references(() => extensionSessions.id),

	// Feature identification
	featureName: text("feature_name").notNull(),
	featureCategory: featureCategoryEnum("feature_category").notNull(),

	// Trigger method
	triggerMethod: text("trigger_method"), // "command_palette", "context_menu", "keyboard_shortcut"

	// Context
	fileType: text("file_type"),
	projectType: text("project_type"),
	projectSize: text("project_size"),

	// Metrics
	durationMs: integer("duration_ms"),
	success: boolean("success").default(true),

	// Impact (when applicable)
	linesChanged: integer("lines_changed"),
	filesAffected: integer("files_affected"),

	// Client
	clientVersion: text("client_version"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

// Partition tables for feature_usage
export const featureUsage202510 = pgTable("feature_usage_2025_10", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	sessionId: text("session_id").references(() => extensionSessions.id),

	// Feature identification
	featureName: text("feature_name").notNull(),
	featureCategory: featureCategoryEnum("feature_category").notNull(),

	// Trigger method
	triggerMethod: text("trigger_method"), // "command_palette", "context_menu", "keyboard_shortcut"

	// Context
	fileType: text("file_type"),
	projectType: text("project_type"),
	projectSize: text("project_size"),

	// Metrics
	durationMs: integer("duration_ms"),
	success: boolean("success").default(true),

	// Impact (when applicable)
	linesChanged: integer("lines_changed"),
	filesAffected: integer("files_affected"),

	// Client
	clientVersion: text("client_version"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

export const featureUsageRelations = relations(featureUsage, ({ one }) => ({
	user: one(user, {
		fields: [featureUsage.userId],
		references: [user.id],
	}),
	session: one(extensionSessions, {
		fields: [featureUsage.sessionId],
		references: [extensionSessions.id],
	}),
}));

export type FeatureUsage = typeof featureUsage.$inferSelect;
export type NewFeatureUsage = typeof featureUsage.$inferInsert;
