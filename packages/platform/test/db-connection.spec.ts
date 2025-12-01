import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

import * as schema from "../src/db/schema";

describe.skipIf(!isDatabaseAvailable)("IP0: Supabase connection succeeds; schema reads", () => {
	const testId = "db-001";
	const testId2 = "db-002";

	let client: ReturnType<typeof postgres>;
	let db: ReturnType<typeof drizzle>;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe because skipIf ensures DATABASE_URL exists
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client, { schema });
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId}: should connect to Supabase database`, async () => {
		// Test basic connection by executing a simple query
		const result = await db.execute("SELECT 1 as connected");
		expect(result).toBeDefined();
		expect(result[0]).toHaveProperty("connected", 1);
	});

	it(`${testId2}: should be able to read schema information`, async () => {
		// Test that we can access the schema definitions
		expect(schema).toBeDefined();
		// Check that some expected tables exist in the schema
		expect(Object.keys(schema)).toContain("snapshots");
		expect(Object.keys(schema)).toContain("apiKeys");
	});
});
