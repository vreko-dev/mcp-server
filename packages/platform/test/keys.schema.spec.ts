import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("DB3: Auth tables migrate cleanly", () => {
	const testId = "keys-001";

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

	it(`${testId}: should have api_keys table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'api_keys'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'api_keys' 
			AND indexname IN ('api_keys_user_id_idx', 'api_keys_revoked_idx')
		`);
		expect(indexResult.length).toBe(2);
	});

	it(`${testId}: should have api_key_usage table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'api_key_usage'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'api_key_usage' 
			AND indexname IN ('api_key_usage_api_key_id_idx', 'api_key_usage_endpoint_idx', 'api_key_usage_timestamp_idx')
		`);
		expect(indexResult.length).toBe(3);
	});
});
