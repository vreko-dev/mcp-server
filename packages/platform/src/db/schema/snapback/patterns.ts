import { relations } from "drizzle-orm";
import { boolean, decimal, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../postgres";

/**
 * Patterns - Code pattern library with vector similarity search
 *
 * Stores pattern signatures with pgvector embeddings for fast similarity matching.
 * Supports both local (per-user) and global (anonymized community) patterns.
 *
 * REQUIRES: pgvector extension enabled in database
 * Migration: CREATE EXTENSION IF NOT EXISTS vector;
 */
export const patterns = pgTable(
	"patterns",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Optional ownership (null = global pattern)
		userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),

		// Pattern identification
		patternSignature: text("pattern_signature").unique().notNull(), // AST-based hash

		// Vector embedding for similarity search (256 dimensions)
		// Type depends on pgvector version, handled in migration
		embedding: text("embedding"), // Will be casted to vector(256) in migration

		// Classification
		patternType: text("pattern_type").notNull(), // 'dangerous', 'beneficial', 'neutral'
		toolAffinity: text("tool_affinity").array(), // ['cursor', 'copilot', ...]
		fileTypes: text("file_types").array(), // ['.ts', '.tsx', ...]

		// Success metrics
		occurrenceCount: integer("occurrence_count").default(1).notNull(),
		successRate: decimal("success_rate", { precision: 4, scale: 3 }), // 0.000-1.000

		// Timestamps
		firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
		lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),

		// Global vs local
		isGlobal: boolean("is_global").default(false).notNull(),
	},
	(table) => [
		// Unique pattern signature
		uniqueIndex("patterns_signature_idx").on(table.patternSignature),

		// Query by user
		index("patterns_user_idx").on(table.userId),

		// Query by type
		index("patterns_type_idx").on(table.patternType),

		// Query global patterns
		index("patterns_global_idx").on(table.isGlobal),

		// NOTE: Vector similarity index created in migration
		// CREATE INDEX patterns_embedding_idx ON patterns USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
	],
);

export const patternsRelations = relations(patterns, ({ one }) => ({
	user: one(user, {
		fields: [patterns.userId],
		references: [user.id],
	}),
}));
