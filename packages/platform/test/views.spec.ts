import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("DB4: Materialized views and refresh functions", () => {
	const testId1 = "dbv-001";
	const testId2 = "dbv-002";

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

	it(`${testId1}: should have daily_metrics materialized view`, async () => {
		// Check that the materialized view exists
		const viewResult = await db.execute(`
			SELECT matviewname 
			FROM pg_matviews 
			WHERE matviewname = 'daily_metrics'
		`);
		expect(viewResult.length).toBeGreaterThan(0);
		expect(viewResult[0].matviewname).toBe("daily_metrics");

		// Check that the index exists
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'daily_metrics' 
			AND indexname = 'daily_metrics_date_idx'
		`);
		expect(indexResult.length).toBe(1);
	});

	it(`${testId2}: should have refresh_daily_metrics function`, async () => {
		// Check that the function exists
		const functionResult = await db.execute(`
			SELECT proname 
			FROM pg_proc 
			WHERE proname = 'refresh_daily_metrics'
		`);
		expect(functionResult.length).toBeGreaterThan(0);
		expect(functionResult[0].proname).toBe("refresh_daily_metrics");
	});
});
