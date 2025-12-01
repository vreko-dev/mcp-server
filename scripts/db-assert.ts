#!/usr/bin/env tsx

/**
 * Database Schema Assertion Script
 *
 * Validates that the database schema matches expected constraints:
 * - CASCADE constraints on foreign keys
 * - NOT NULL constraints on required columns
 * - CHECK constraints for data validation
 * - Indexes on foreign keys for performance
 *
 * Exits with code 1 if any mismatches are found.
 *
 * Usage:
 *   pnpm db:assert
 */

import { db } from "@snapback/platform";
import { sql } from "drizzle-orm";

interface ForeignKeyConstraint {
	table: string;
	column: string;
	onDelete: string;
}

interface NotNullConstraint {
	table: string;
	column: string;
}

interface CheckConstraint {
	table: string;
	constraint: string;
}

interface IndexConstraint {
	table: string;
	columns: string[];
}

/**
 * Expected CASCADE constraints from Phase 1
 */
const expectedCascades: ForeignKeyConstraint[] = [
	{ table: "agent_suggestions", column: "user_id", onDelete: "CASCADE" },
	{ table: "agent_suggestions", column: "api_key_id", onDelete: "CASCADE" },
	{ table: "post_accept_outcomes", column: "user_id", onDelete: "CASCADE" },
	{ table: "post_accept_outcomes", column: "api_key_id", onDelete: "CASCADE" },
	{ table: "policy_evaluations", column: "user_id", onDelete: "CASCADE" },
	{ table: "policy_evaluations", column: "api_key_id", onDelete: "CASCADE" },
	{ table: "loops", column: "user_id", onDelete: "CASCADE" },
	{ table: "loops", column: "api_key_id", onDelete: "CASCADE" },
	{ table: "feedback", column: "user_id", onDelete: "CASCADE" },
	{ table: "feedback", column: "api_key_id", onDelete: "CASCADE" },
	{ table: "quarantine_events", column: "user_id", onDelete: "CASCADE" },
	{ table: "quarantine_events", column: "api_key_id", onDelete: "CASCADE" },
];

/**
 * Expected NOT NULL constraints
 */
const expectedNotNulls: NotNullConstraint[] = [
	{ table: "agent_suggestions", column: "user_id" },
	{ table: "agent_suggestions", column: "api_key_id" },
	{ table: "agent_suggestions", column: "request_id" },
	{ table: "agent_suggestions", column: "suggestion_id" },
	{ table: "post_accept_outcomes", column: "user_id" },
	{ table: "post_accept_outcomes", column: "api_key_id" },
	{ table: "post_accept_outcomes", column: "request_id" },
	{ table: "post_accept_outcomes", column: "suggestion_id" },
	{ table: "policy_evaluations", column: "user_id" },
	{ table: "policy_evaluations", column: "api_key_id" },
	{ table: "policy_evaluations", column: "request_id" },
	{ table: "policy_evaluations", column: "policy_name" },
	{ table: "loops", column: "user_id" },
	{ table: "loops", column: "api_key_id" },
	{ table: "loops", column: "request_id" },
	{ table: "feedback", column: "user_id" },
	{ table: "feedback", column: "api_key_id" },
	{ table: "feedback", column: "request_id" },
	{ table: "quarantine_events", column: "user_id" },
	{ table: "quarantine_events", column: "api_key_id" },
	{ table: "quarantine_events", column: "original_event" },
	{ table: "quarantine_events", column: "error_reason" },
];

/**
 * Expected CHECK constraints from Phase 1
 */
const expectedChecks: CheckConstraint[] = [
	{ table: "agent_suggestions", constraint: "accepted_dismissed_check" },
	{ table: "policy_evaluations", constraint: "evaluation_result_check" },
	{ table: "loops", constraint: "iteration_count_positive" },
	{ table: "feedback", constraint: "rating_range" },
];

/**
 * Expected indexes on foreign keys
 */
const expectedIndexes: IndexConstraint[] = [
	{ table: "agent_suggestions", columns: ["user_id", "created_at"] },
	{ table: "agent_suggestions", columns: ["api_key_id", "created_at"] },
	{ table: "post_accept_outcomes", columns: ["user_id", "created_at"] },
	{ table: "post_accept_outcomes", columns: ["api_key_id", "created_at"] },
	{ table: "policy_evaluations", columns: ["user_id", "created_at"] },
	{ table: "policy_evaluations", columns: ["api_key_id", "created_at"] },
	{ table: "loops", columns: ["user_id", "created_at"] },
	{ table: "loops", columns: ["api_key_id", "created_at"] },
	{ table: "feedback", columns: ["user_id", "created_at"] },
	{ table: "feedback", columns: ["api_key_id", "created_at"] },
	{ table: "quarantine_events", columns: ["user_id", "created_at"] },
	{ table: "quarantine_events", columns: ["api_key_id", "created_at"] },
	{ table: "quarantine_events", columns: ["attempted_at"] },
];

/**
 * Validate CASCADE constraints on foreign keys
 */
async function validateCascadeConstraints(): Promise<boolean> {
	console.log("\n🔍 Validating CASCADE constraints...");

	// cspell:disable-next-line
	const query = sql`
    SELECT
      tc.table_name AS table,
      kcu.column_name AS column,
      rc.delete_rule AS on_delete
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `;

	const results = await db.execute(query);
	const actualConstraints = results.rows as Array<{ table: string; column: string; on_delete: string }>;

	let hasErrors = false;

	for (const expected of expectedCascades) {
		const actual = actualConstraints.find((c) => c.table === expected.table && c.column === expected.column);

		if (!actual) {
			console.error(`❌ Missing CASCADE constraint: ${expected.table}.${expected.column}`);
			hasErrors = true;
			continue;
		}

		if (actual.on_delete !== expected.onDelete) {
			console.error(
				`❌ Mismatch: ${expected.table}.${expected.column} has onDelete=${actual.on_delete}, expected=${expected.onDelete}`,
			);
			hasErrors = true;
		} else {
			console.log(`✅ ${expected.table}.${expected.column} → CASCADE`);
		}
	}

	return !hasErrors;
}

/**
 * Validate NOT NULL constraints
 */
async function validateNotNullConstraints(): Promise<boolean> {
	console.log("\n🔍 Validating NOT NULL constraints...");

	const query = sql`
    SELECT
      table_name AS table,
      column_name AS column,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;

	const results = await db.execute(query);
	const actualColumns = results.rows as Array<{ table: string; column: string; is_nullable: string }>;

	let hasErrors = false;

	for (const expected of expectedNotNulls) {
		const actual = actualColumns.find((c) => c.table === expected.table && c.column === expected.column);

		if (!actual) {
			console.error(`❌ Missing column: ${expected.table}.${expected.column}`);
			hasErrors = true;
			continue;
		}

		if (actual.is_nullable === "YES") {
			console.error(`❌ ${expected.table}.${expected.column} is nullable, expected NOT NULL`);
			hasErrors = true;
		} else {
			console.log(`✅ ${expected.table}.${expected.column} → NOT NULL`);
		}
	}

	return !hasErrors;
}

/**
 * Validate CHECK constraints
 */
async function validateCheckConstraints(): Promise<boolean> {
	console.log("\n🔍 Validating CHECK constraints...");

	const query = sql`
    SELECT
      tc.table_name AS table,
      tc.constraint_name AS constraint
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'CHECK'
      AND tc.table_schema = 'public'
  `;

	const results = await db.execute(query);
	const actualChecks = results.rows as Array<{ table: string; constraint: string }>;

	let hasErrors = false;

	for (const expected of expectedChecks) {
		const actual = actualChecks.find((c) => c.table === expected.table && c.constraint === expected.constraint);

		if (!actual) {
			console.error(`❌ Missing CHECK constraint: ${expected.table}.${expected.constraint}`);
			hasErrors = true;
		} else {
			console.log(`✅ ${expected.table}.${expected.constraint} → CHECK`);
		}
	}

	return !hasErrors;
}

/**
 * Validate indexes on foreign keys
 */
async function validateIndexes(): Promise<boolean> {
	console.log("\n🔍 Validating indexes...");

	// cspell:disable-next-line
	const query = sql`
    SELECT
      t.relname AS table,
      i.relname AS index,
      array_agg(a.attname ORDER BY a.attnum) AS columns
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.relname, i.relname
  `;

	const results = await db.execute(query);
	const actualIndexes = results.rows as Array<{ table: string; index: string; columns: string[] }>;

	let hasErrors = false;

	for (const expected of expectedIndexes) {
		const actual = actualIndexes.find(
			(idx) =>
				idx.table === expected.table &&
				idx.columns.length === expected.columns.length &&
				idx.columns.every((col, i) => col === expected.columns[i]),
		);

		if (!actual) {
			console.error(`❌ Missing index: ${expected.table} (${expected.columns.join(", ")})`);
			hasErrors = true;
		} else {
			console.log(`✅ ${expected.table} (${expected.columns.join(", ")}) → ${actual.index}`);
		}
	}

	return !hasErrors;
}

/**
 * Main assertion runner
 */
async function main() {
	console.log("🔧 Database Schema Assertion Tool\n");

	if (!db) {
		console.error("❌ Database connection not available");
		process.exit(1);
	}

	const results = await Promise.all([
		validateCascadeConstraints(),
		validateNotNullConstraints(),
		validateCheckConstraints(),
		validateIndexes(),
	]);

	const allPassed = results.every((result) => result === true);

	if (allPassed) {
		console.log("\n✅ All schema assertions passed!");
		process.exit(0);
	} else {
		console.error("\n❌ Schema assertion failures detected!");
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("💥 Unexpected error:", error);
	process.exit(1);
});
