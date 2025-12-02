import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

import { TelemetrySinkDb } from "../src/db/adapters/TelemetrySinkDb";
import * as schema from "../src/db/schema/snapback/index";

describe.skipIf(!isDatabaseAvailable)("AD1: TelemetrySinkDb implementation", () => {
	const testId1 = "sink-001";
	const testId2 = "sink-002";

	let client: ReturnType<typeof postgres>;
	let db: any;
	let telemetrySink: TelemetrySinkDb;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe because skipIf ensures DATABASE_URL exists
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client, { schema });
		telemetrySink = new TelemetrySinkDb(db);
	});

	beforeEach(async () => {
		// Clean up test data before each test
		try {
			await db.execute(
				`DELETE FROM agent_suggestions WHERE request_id IN ('test-request-001') OR request_id LIKE 'batch-request-%'`,
			);
		} catch {
			// Table might not exist yet in test environment
		}
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId1}: should handle duplicate request_id as no-op`, async () => {
		const event = {
			requestId: "test-request-001",
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			suggestionId: "suggestion-001",
			suggestionText: "Test suggestion",
			suggestionType: "code",
			accepted: true,
			dismissed: false,
			timestamp: new Date(),
		};

		// Insert the event for the first time
		await telemetrySink.insertAgentSuggestion(event);

		// Try to insert the same event again (should be no-op)
		await telemetrySink.insertAgentSuggestion(event);

		// Verify only one record exists
		const result = await db.execute(`
			SELECT COUNT(*) as count
			FROM agent_suggestions
			WHERE request_id = 'test-request-001'
		`);

		expect(Number.parseInt(result[0].count as string, 10)).toBe(1);
	});

	it(`${testId2}: should handle batch insert stable under load`, async () => {
		const events = Array.from({ length: 100 }, (_, i) => ({
			requestId: `batch-request-${i}`,
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			suggestionId: `suggestion-${i}`,
			suggestionText: `Test suggestion ${i}`,
			suggestionType: "code",
			accepted: i % 2 === 0,
			dismissed: i % 3 === 0,
			timestamp: new Date(),
		}));

		// Measure time for batch insert
		const start = performance.now();
		await telemetrySink.batchInsertAgentSuggestions(events);
		const end = performance.now();
		const duration = end - start;

		// Verify all records were inserted (check by batch size)
		const result = await db.execute(`
			SELECT COUNT(*) as count
			FROM agent_suggestions
			WHERE request_id LIKE 'batch-request-%'
		`);

		const count = Number.parseInt(result[0].count as string, 10);
		// Should have at least 100 records (may have more from previous runs)
		expect(count).toBeGreaterThanOrEqual(100);
		// Batch insert should be reasonably fast (less than 1 second for 100 records)
		expect(duration).toBeLessThan(1000);
	});
});
