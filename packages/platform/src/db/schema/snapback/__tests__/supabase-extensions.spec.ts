import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

import * as schema from "../index";

describe.skipIf(!isDatabaseAvailable)("SCH3: Supabase extensions and functions", () => {
	const testId = "supabase-001";
	const testId2 = "supabase-002";
	const testId3 = "supabase-003";

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

	it(`${testId2}: should be able to access schema information`, async () => {
		// Test that we can access the schema definitions
		expect(schema).toBeDefined();
		// Check that some expected tables exist in the schema
		expect(Object.keys(schema)).toContain("analysisEvents");
		expect(Object.keys(schema)).toContain("ruleViolations");
		expect(Object.keys(schema)).toContain("userSafetyProfiles");
	});

	it(`${testId3}: should have the update_updated_at_column function`, async () => {
		// Test that the update_updated_at_column function exists
		const result = await db.execute(`
      SELECT EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
      )
    `);

		expect(result).toBeDefined();
		expect(result[0]).toHaveProperty("exists", true);
	});
});
