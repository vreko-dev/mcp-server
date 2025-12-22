#!/usr/bin/env tsx
/**
 * Run SQL migrations in order
 * Usage: pnpm tsx scripts/run-migrations.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error("❌ DATABASE_URL environment variable is required");
	process.exit(1);
}

async function runMigrations() {
	console.log("🔌 Connecting to database...");

	const sql = postgres(DATABASE_URL, {
		ssl: "require",
		max: 1,
	});

	try {
		// Test connection
		const result = await sql`SELECT version()`;
		console.log("✅ Connected to PostgreSQL:", result[0].version.split(" ").slice(0, 2).join(" "));

		// Get all migration files in order
		const migrationsDir = join(process.cwd(), "src", "db");
		const files = readdirSync(migrationsDir)
			.filter((f) => f.endsWith(".sql") && f.match(/^\d{4}_/))
			.sort();

		console.log(`\n📦 Found ${files.length} migration files\n`);

		// Run only new migrations (0012-0015)
		const newMigrations = files.filter((f) => {
			const num = Number.parseInt(f.split("_")[0]);
			return num >= 12 && num <= 15;
		});

		if (newMigrations.length === 0) {
			console.log("ℹ️  No new migrations to run (0012-0015)");
			return;
		}

		console.log(`🚀 Running ${newMigrations.length} new migrations:\n`);

		for (const file of newMigrations) {
			const filePath = join(migrationsDir, file);
			const migrationSQL = readFileSync(filePath, "utf-8");

			console.log(`  ▶️  ${file}...`);

			try {
				await sql.unsafe(migrationSQL);
				console.log(`  ✅ ${file} completed\n`);
			} catch (error) {
				const err = error as Error;
				console.error(`  ❌ ${file} failed:`, err.message);
				throw error;
			}
		}

		console.log("✨ All migrations completed successfully!\n");

		// Verify tables created
		console.log("🔍 Verifying new tables...");
		const tables = await sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'pioneers', 'pioneer_actions', 'pioneer_tier_history',
        'mcp_sessions', 'mcp_aggregated_learnings', 'mcp_activity_events',
        'trust_scores', 'predictions'
      )
      ORDER BY tablename
    `;

		console.log(`  Found ${tables.length} new tables:`, tables.map((t) => t.tablename).join(", "));

		if (tables.length === 8) {
			console.log("\n✅ All 8 tables verified successfully!");
		} else {
			console.warn(`\n⚠️  Expected 8 tables, found ${tables.length}`);
		}
	} catch (error) {
		console.error("\n❌ Migration failed:", error);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

runMigrations();
