import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "../postgres";

export const codeContexts = pgTable(
	"code_contexts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Context identification (hashed for privacy)
		workspaceHash: text("workspace_hash").notNull(),
		filePathHash: text("file_path_hash").notNull(),

		// File metadata only (never store actual code)
		fileExtension: text("file_extension").notNull(),
		fileSizeBytes: integer("file_size_bytes"),
		lineCount: integer("line_count"),
		language: text("language"), // Detected language

		// Analysis results cache (can be reused)
		lastAnalysis: jsonb("last_analysis"),
		lastAnalysisAt: timestamp("last_analysis_at"),
		lastRefactor: jsonb("last_refactor"),
		lastRefactorAt: timestamp("last_refactor_at"),

		// Usage tracking
		analysisCount: integer("analysis_count").default(0),
		refactorCount: integer("refactor_count").default(0),
		lastAccessedAt: timestamp("last_accessed_at").defaultNow(),

		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		userIdWorkspaceHashIndex: uniqueIndex("idx_code_contexts_user_workspace").on(table.userId, table.workspaceHash),
		lastAccessedAtIndex: uniqueIndex("idx_code_contexts_last_accessed").on(table.lastAccessedAt),
		userWorkspacePathUnique: uniqueIndex("idx_code_contexts_user_workspace_path_unique").on(
			table.userId,
			table.workspaceHash,
			table.filePathHash,
		),
	}),
);

export const codeContextsRelations = relations(codeContexts, ({ one }) => ({
	user: one(user, {
		fields: [codeContexts.userId],
		references: [user.id],
	}),
}));

export type CodeContext = typeof codeContexts.$inferSelect;
export type NewCodeContext = typeof codeContexts.$inferInsert;
