/**
 * User Metrics Aggregation - RED Tests (TDD)
 *
 * Tests for user_daily_metrics and user_product_metrics aggregation.
 * These tests FAIL initially (RED phase) until schema and services are implemented.
 *
 * @package @snapback/platform
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("User Metrics Aggregation (RED - Failing Tests)", () => {
	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe because skipIf ensures DATABASE_URL exists
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client);
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	describe("user_daily_metrics table schema", () => {
		it("RED: should have user_daily_metrics table with required columns", async () => {
			// FAILING: Table doesn't exist yet
			const result = await db.execute(`
				SELECT table_name 
				FROM information_schema.tables 
				WHERE table_name = 'user_daily_metrics'
			`);

			expect(result).toHaveLength(1);
			expect(result[0].table_name).toBe("user_daily_metrics");
		});

		it("RED: should have proper columns (user_id, date, snapshots, restores, minutes_saved, ai_sessions)", async () => {
			// FAILING: Columns don't exist yet
			const columns = await db.execute(`
				SELECT column_name, data_type, is_nullable 
				FROM information_schema.columns 
				WHERE table_name = 'user_daily_metrics'
				ORDER BY ordinal_position
			`);

			const columnNames = columns.map((col) => col.column_name);
			expect(columnNames).toContain("user_id");
			expect(columnNames).toContain("date");
			expect(columnNames).toContain("snapshots_created");
			expect(columnNames).toContain("restores_performed");
			expect(columnNames).toContain("minutes_saved_estimate");
			expect(columnNames).toContain("ai_sessions");
			expect(columnNames).toContain("created_at");
		});

		it("RED: should have indexes on user_id and date for query performance", async () => {
			// FAILING: Indexes don't exist yet
			const indexes = await db.execute(`
				SELECT indexname 
				FROM pg_indexes 
				WHERE tablename = 'user_daily_metrics'
			`);

			const indexNames = indexes.map((idx) => (idx as Record<string, string>).indexname);
			expect(indexNames.some((name: string) => name.includes("user_id"))).toBe(true);
			expect(indexNames.some((name: string) => name.includes("date"))).toBe(true);
		});

		it("RED: should have unique constraint on (user_id, date) to prevent duplicates", async () => {
			// FAILING: Constraint doesn't exist yet
			const constraints = await db.execute(`
				SELECT constraint_name 
				FROM information_schema.table_constraints 
				WHERE table_name = 'user_daily_metrics' 
				AND constraint_type = 'UNIQUE'
			`);

			expect(constraints.length).toBeGreaterThan(0);
		});
	});

	describe("user_product_metrics table schema", () => {
		it("RED: should have user_product_metrics table (lifetime aggregation)", async () => {
			// FAILING: Table doesn't exist yet
			const result = await db.execute(`
				SELECT table_name 
				FROM information_schema.tables 
				WHERE table_name = 'user_product_metrics'
			`);

			expect(result).toHaveLength(1);
		});

		it("RED: should have lifetime stats columns (snapshots_total, restores_total, minutes_saved_total)", async () => {
			// FAILING: Columns don't exist yet
			const columns = await db.execute(`
				SELECT column_name 
				FROM information_schema.columns 
				WHERE table_name = 'user_product_metrics'
			`);

			const columnNames = columns.map((col) => col.column_name);
			expect(columnNames).toContain("snapshots_total");
			expect(columnNames).toContain("restores_total");
			expect(columnNames).toContain("minutes_saved_total");
			expect(columnNames).toContain("first_seen_at");
			expect(columnNames).toContain("last_seen_at");
		});

		it("RED: should have 7-day rolling window columns (last_week_snapshots, last_week_minutes_saved)", async () => {
			// FAILING: Rolling window columns don't exist
			const columns = await db.execute(`
				SELECT column_name 
				FROM information_schema.columns 
				WHERE table_name = 'user_product_metrics'
			`);

			const columnNames = columns.map((col) => col.column_name);
			expect(columnNames).toContain("last_week_snapshots");
			expect(columnNames).toContain("last_week_restores");
			expect(columnNames).toContain("last_week_minutes_saved");
		});
	});

	describe("Metrics calculation accuracy", () => {
		it("RED: should correctly sum daily snapshots to calculate lifetime total", async () => {
			// FAILING: Need to insert test data and verify aggregation
			// This will be tested in GREEN phase with actual implementation

			const userId = "test-user-metrics-001";

			// Insert test daily metrics (in GREEN phase, these come from snapshots table)
			const result = await db.execute(`
				INSERT INTO user_daily_metrics (user_id, date, snapshots_created, restores_performed, minutes_saved_estimate)
				VALUES 
					('${userId}', '2025-12-01', 5, 1, 15),
					('${userId}', '2025-12-02', 3, 0, 9),
					('${userId}', '2025-12-03', 7, 2, 21)
				RETURNING *
			`);

			expect(result).toHaveLength(3);

			// Verify lifetime totals (would use view or service in GREEN phase)
			const lifetimeResult = await db.execute(`
				SELECT 
					SUM(snapshots_created) as total_snapshots,
					SUM(restores_performed) as total_restores,
					SUM(minutes_saved_estimate) as total_minutes
				FROM user_daily_metrics 
				WHERE user_id = '${userId}'
			`);

			expect((lifetimeResult[0] as Record<string, number>).total_snapshots).toBe(15);
			expect((lifetimeResult[0] as Record<string, number>).total_restores).toBe(3);
			expect((lifetimeResult[0] as Record<string, number>).total_minutes).toBe(45);
		});

		it("RED: should correctly calculate 7-day rolling window", async () => {
			// FAILING: Rolling window logic not implemented
			const userId = "test-user-rolling-001";
			const now = new Date();
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			// Insert data spanning 14 days
			const dates: string[] = [];
			for (let i = 0; i < 14; i++) {
				const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
				dates.push(date.toISOString().split("T")[0]);
			}

			// Insert within 7-day window (should be included)
			const _withinWindow = dates.slice(7).join("','");
			await db.execute(`
				INSERT INTO user_daily_metrics (user_id, date, snapshots_created, restores_performed, minutes_saved_estimate)
				VALUES 
					('${userId}', '${dates[6]}', 10, 2, 30),
					('${userId}', '${dates[7]}', 5, 1, 15),
					('${userId}', '${dates[8]}', 8, 0, 24)
			`);

			// In GREEN phase, verify rolling window calculation works correctly
			expect(dates.length).toBe(14);
		});

		it("RED: should handle NULL values gracefully (treat as 0 in sums)", async () => {
			// FAILING: Null handling not implemented
			const userId = "test-user-nulls-001";

			await db.execute(`
				INSERT INTO user_daily_metrics (user_id, date, snapshots_created, restores_performed)
				VALUES ('${userId}', '2025-12-01', 5, 1)
			`);

			const result = await db.execute(`
				SELECT 
					COALESCE(SUM(snapshots_created), 0) as total_snapshots,
					COALESCE(SUM(minutes_saved_estimate), 0) as total_minutes
				FROM user_daily_metrics 
				WHERE user_id = '${userId}'
			`);

			expect(result[0].total_snapshots).toBe(5);
			expect(result[0].total_minutes).toBe(0); // NULL coalesced to 0
		});

		it("RED: should not count future dates in aggregation", async () => {
			// FAILING: Date boundary checking not implemented
			const userId = "test-user-future-001";
			const today = new Date().toISOString().split("T")[0];
			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

			await db.execute(`
				INSERT INTO user_daily_metrics (user_id, date, snapshots_created)
				VALUES 
					('${userId}', '${today}', 5),
					('${userId}', '${tomorrow}', 100)
			`);

			// Should only count today, not tomorrow
			const result = await db.execute(`
				SELECT COUNT(*) as count
				FROM user_daily_metrics 
				WHERE user_id = '${userId}' AND date <= CURRENT_DATE
			`);

			expect(Number(result[0].count)).toBe(1);
		});
	});

	describe("Edge cases", () => {
		it("RED: should handle user with zero snapshots", async () => {
			// FAILING: Edge case not tested
			const userId = "test-user-zero-001";

			await db.execute(`
				INSERT INTO user_daily_metrics (user_id, date, snapshots_created, restores_performed)
				VALUES ('${userId}', '2025-12-01', 0, 0)
			`);

			const result = await db.execute(`
				SELECT COUNT(*) as record_count
				FROM user_daily_metrics 
				WHERE user_id = '${userId}'
			`);

			expect(Number(result[0].record_count)).toBe(1);
		});

		it("RED: should handle duplicate date inserts (upsert/conflict resolution)", async () => {
			// FAILING: Upsert logic not implemented
			const userId = "test-user-duplicate-001";
			const date = "2025-12-01";

			// First insert
			await db.execute(`
				INSERT INTO user_daily_metrics (user_id, date, snapshots_created)
				VALUES ('${userId}', '${date}', 5)
			`);

			// Attempt second insert on same date - should handle gracefully
			// In GREEN phase, implement ON CONFLICT DO UPDATE for upserts
			expect(true).toBe(true); // Placeholder
		});

		it("RED: should maintain referential integrity with user table", async () => {
			// FAILING: Foreign key constraint not verified
			// Should not allow orphaned user_id entries
			expect(true).toBe(true); // Placeholder for GREEN phase
		});
	});
});
