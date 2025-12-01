import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("DB5: Performance tests for dashboard queries", () => {
	const testId = "dbp-001";
	const queryP95Ms = 150; // Query performance budget from globals

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

	it(`${testId}: dashboard queries should be within p95 budget`, async () => {
		// Test query 1: Get recent analysis events
		const start1 = performance.now();
		const result1 = await db.execute(`
			SELECT id, user_id, request_id, risk_score, timestamp
			FROM analysis_events
			WHERE timestamp >= NOW() - INTERVAL '1 hour'
			ORDER BY timestamp DESC
			LIMIT 100
		`);
		const end1 = performance.now();
		const duration1 = end1 - start1;

		expect(duration1).toBeLessThanOrEqual(queryP95Ms);
		expect(result1).toBeDefined();

		// Test query 2: Get daily metrics
		const start2 = performance.now();
		const result2 = await db.execute(`
			SELECT date, total_events, unique_users, avg_risk_score
			FROM daily_metrics
			ORDER BY date DESC
			LIMIT 30
		`);
		const end2 = performance.now();
		const duration2 = end2 - start2;

		expect(duration2).toBeLessThanOrEqual(queryP95Ms);
		expect(result2).toBeDefined();

		// Test query 3: Get user activity summary
		const start3 = performance.now();
		const result3 = await db.execute(`
			SELECT 
				user_id,
				COUNT(*) as event_count,
				AVG(risk_score) as avg_risk,
				MAX(timestamp) as last_activity
			FROM analysis_events
			WHERE timestamp >= NOW() - INTERVAL '24 hours'
			GROUP BY user_id
			ORDER BY event_count DESC
			LIMIT 50
		`);
		const end3 = performance.now();
		const duration3 = end3 - start3;

		expect(duration3).toBeLessThanOrEqual(queryP95Ms);
		expect(result3).toBeDefined();

		// Test query 4: Get snapshot statistics
		const start4 = performance.now();
		const result4 = await db.execute(`
			SELECT 
				workspace_id,
				COUNT(*) as snapshot_count,
				AVG(file_count) as avg_files,
				AVG(total_size_bytes) as avg_size
			FROM snapshots
			WHERE created_at >= NOW() - INTERVAL '7 days'
			GROUP BY workspace_id
			ORDER BY snapshot_count DESC
			LIMIT 20
		`);
		const end4 = performance.now();
		const duration4 = end4 - start4;

		expect(duration4).toBeLessThanOrEqual(queryP95Ms);
		expect(result4).toBeDefined();

		// Test query 5: Get agent suggestion acceptance rate
		const start5 = performance.now();
		const result5 = await db.execute(`
			SELECT 
				suggestion_type,
				COUNT(*) as total_suggestions,
				SUM(CASE WHEN accepted THEN 1 ELSE 0 END) as accepted_count,
				AVG(CASE WHEN accepted THEN 1.0 ELSE 0.0 END) as acceptance_rate
			FROM agent_suggestions
			WHERE created_at >= NOW() - INTERVAL '7 days'
			GROUP BY suggestion_type
		`);
		const end5 = performance.now();
		const duration5 = end5 - start5;

		expect(duration5).toBeLessThanOrEqual(queryP95Ms);
		expect(result5).toBeDefined();
	});
});
