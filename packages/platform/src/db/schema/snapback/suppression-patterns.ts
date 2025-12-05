import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * Suppression Patterns - Track user-defined suppression patterns
 */
export const suppressionPatterns = pgTable("suppression_patterns", {
	id: uuid("id").primaryKey().defaultRandom(),

	// Ownership
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Pattern details
	pattern: text("pattern").notNull(),
	patternType: text("pattern_type").notNull(), // "regex", "glob", "literal"
	description: text("description"),

	// Usage metrics
	useCount: integer("use_count").notNull().default(0),
	lastUsedAt: timestamp("last_used_at"),

	// Effectiveness
	suppressedViolations: integer("suppressed_violations").notNull().default(0),
	falsePositives: integer("false_positives").notNull().default(0),

	// Metadata
	metadata: jsonb("metadata").$type<Record<string, any>>().default({}),

	// Settings
	isActive: boolean("is_active").notNull().default(true),
	isGlobal: boolean("is_global").notNull().default(false), // Apply to all projects

	// Context
	clientType: text("client_type"), // "vscode", "cli", "mcp", "web"
	projectId: text("project_id"),

	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const suppressionPatternsRelations = relations(suppressionPatterns, ({ one }) => ({
	user: one(user, {
		fields: [suppressionPatterns.userId],
		references: [user.id],
	}),
}));

// Type exports
export type SuppressionPattern = typeof suppressionPatterns.$inferSelect;
export type NewSuppressionPattern = typeof suppressionPatterns.$inferInsert;
