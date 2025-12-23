/**
 * Shared Timestamp Helpers for Drizzle Schemas
 *
 * Use these helpers to ensure consistent timestamp patterns across all tables.
 * Per Phase 3 Schema Modernization.
 *
 * @example
 * import { timestamps, primaryKeyId } from "./helpers/timestamps";
 *
 * export const myTable = pgTable("my_table", {
 *   ...primaryKeyId(),
 *   name: text("name").notNull(),
 *   ...timestamps(),
 * });
 */

import { timestamp, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

/**
 * Standard timestamp columns: createdAt and updatedAt
 *
 * - createdAt: Set on insert, never changes
 * - updatedAt: Set on insert, should be updated on each modification
 *
 * @example
 * export const users = pgTable("users", {
 *   id: varchar("id", { length: 255 }).primaryKey(),
 *   name: text("name").notNull(),
 *   ...timestamps(),
 * });
 */
export function timestamps() {
	return {
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	};
}

/**
 * Optional timestamp columns: createdAt and updatedAt (nullable)
 *
 * Use for tables where timestamps are optional (legacy data, external imports).
 */
export function optionalTimestamps() {
	return {
		createdAt: timestamp("createdAt"),
		updatedAt: timestamp("updatedAt"),
	};
}

/**
 * Standard nanoid primary key column
 *
 * Uses nanoid for collision-resistant, URL-safe IDs (130 bytes, 97% smaller than alternatives).
 *
 * @example
 * export const users = pgTable("users", {
 *   ...primaryKeyId(),
 *   name: text("name").notNull(),
 * });
 */
export function primaryKeyId() {
	return {
		id: varchar("id", { length: 255 })
			.$defaultFn(() => nanoid())
			.primaryKey(),
	};
}

/**
 * Foreign key reference column with standard options
 *
 * @param name - Column name
 * @param onDelete - Cascade behavior (default: "cascade")
 */
export function foreignKeyColumn(name: string, onDelete: "cascade" | "set null" | "no action" = "cascade") {
	return {
		options: { onDelete },
		columnName: name,
	};
}
