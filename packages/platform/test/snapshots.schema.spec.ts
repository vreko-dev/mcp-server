import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("DB2: Snapshots schema", () => {
	const testId = "snapdb-001";

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

	it(`${testId}: should have snapshots table with idx_snap_ws_time index`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'snapshots'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that the specific index exists
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'snapshots' 
			AND indexname = 'idx_snap_ws_time'
		`);
		expect(indexResult.length).toBe(1);
		expect(indexResult[0].indexname).toBe("idx_snap_ws_time");
	});
});
