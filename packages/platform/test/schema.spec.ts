import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("DB1: Core tables migrate with indexes", () => {
	const testId = "db-001";

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

	it(`${testId}: should have agent_suggestions table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'agent_suggestions'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'agent_suggestions' 
			AND indexname IN ('agent_suggestions_user_id_idx', 'agent_suggestions_api_key_id_idx', 'agent_suggestions_request_id_idx', 'agent_suggestions_timestamp_idx')
		`);
		expect(indexResult.length).toBe(4);
	});

	it(`${testId}: should have post_accept_outcomes table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'post_accept_outcomes'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'post_accept_outcomes' 
			AND indexname IN ('post_accept_outcomes_user_id_idx', 'post_accept_outcomes_suggestion_id_idx', 'post_accept_outcomes_timestamp_idx')
		`);
		expect(indexResult.length).toBe(3);
	});

	it(`${testId}: should have policy_evaluations table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'policy_evaluations'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'policy_evaluations' 
			AND indexname IN ('policy_evaluations_user_id_idx', 'policy_evaluations_api_key_id_idx', 'policy_evaluations_request_id_idx', 'policy_evaluations_policy_name_idx', 'policy_evaluations_timestamp_idx')
		`);
		expect(indexResult.length).toBe(5);
	});

	it(`${testId}: should have loops table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'loops'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'loops' 
			AND indexname IN ('loops_user_id_idx', 'loops_api_key_id_idx', 'loops_request_id_idx', 'loops_loop_type_idx', 'loops_timestamp_idx')
		`);
		expect(indexResult.length).toBe(5);
	});

	it(`${testId}: should have feedback table with proper indexes`, async () => {
		// Check that the table exists
		const tableResult = await db.execute(`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_name = 'feedback'
		`);
		expect(tableResult.length).toBeGreaterThan(0);

		// Check that indexes exist
		const indexResult = await db.execute(`
			SELECT indexname 
			FROM pg_indexes 
			WHERE tablename = 'feedback' 
			AND indexname IN ('feedback_user_id_idx', 'feedback_api_key_id_idx', 'feedback_feedback_type_idx', 'feedback_timestamp_idx')
		`);
		expect(indexResult.length).toBe(4);
	});
});
