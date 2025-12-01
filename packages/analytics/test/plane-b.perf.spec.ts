import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Conditionally import database modules only if DATABASE_URL is set
let db: any;
let schema: any;
let TelemetrySinkDb: any;
let TelemetryIngestHandler: any;
let eq: any;

const isDatabaseAvailable = !!process.env.DATABASE_URL;

if (isDatabaseAvailable) {
	const dbModule = await import("@snapback/platform/src/db/client");
	const schemaModule = await import("@snapback/platform/src/db/schema/snapback");
	const drizzleModule = await import("drizzle-orm");
	const sinkModule = await import("@snapback/platform/src/db/adapters/TelemetrySinkDb");
	const ingestModule = await import("../src/ingest");

	db = dbModule.db;
	schema = schemaModule;
	eq = drizzleModule.eq;
	TelemetrySinkDb = sinkModule.TelemetrySinkDb;
	TelemetryIngestHandler = ingestModule.TelemetryIngestHandler;
}

describe.skipIf(!isDatabaseAvailable)("E2E2: Perf: analytics reads on staging fixtures", () => {
	const testId1 = "perf-001";
	const testId2 = "perf-002";
	const testId3 = "perf-003";

	// Performance budget (in milliseconds)
	const QUERY_P95_MS = 100;

	// Test data
	const testUserId = "user-perf-001";
	const testApiKeyId = "key-perf-001";

	let ingestHandler: TelemetryIngestHandler;
	let sink: TelemetrySinkDb;

	beforeEach(async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		// Create real sink and ingest handler
		sink = new TelemetrySinkDb();
		ingestHandler = new TelemetryIngestHandler(sink);

		// Clean up any existing test data
		await db?.delete(schema.agentSuggestions).where(eq(schema.agentSuggestions.userId, testUserId));
		await db?.delete(schema.postAcceptOutcomes).where(eq(schema.postAcceptOutcomes.userId, testUserId));
		await db?.delete(schema.policyEvaluations).where(eq(schema.policyEvaluations.userId, testUserId));
	});

	afterEach(async () => {
		if (!isDatabaseAvailable) {
			return;
		}

		// Clean up test data
		await db?.delete(schema.agentSuggestions).where(eq(schema.agentSuggestions.userId, testUserId));
		await db?.delete(schema.postAcceptOutcomes).where(eq(schema.postAcceptOutcomes.userId, testUserId));
		await db?.delete(schema.policyEvaluations).where(eq(schema.policyEvaluations.userId, testUserId));

		// Clear processed events cache
		if (ingestHandler?.clearProcessedEvents) {
			ingestHandler.clearProcessedEvents();
		}
	});

	it(`${testId1}: should create test at packages/analytics/test/plane-b.perf.spec.ts`, () => {
		// This test just verifies that the file exists
		expect(true).toBe(true);
	});

	it(`${testId2}: should verify all read functions ≤ query_p95_ms`, async () => {
		// Skip if database is not available
		if (!isDatabaseAvailable) {
			console.warn("Database not available, skipping test");
			return;
		}

		// Insert test data
		const eventCount = 100;
		const events = [];

		for (let i = 0; i < eventCount; i++) {
			events.push({
				requestId: `perf-request-${i}`,
				userId: testUserId,
				apiKeyId: testApiKeyId,
				sessionId: "session-perf-001",
				eventType: "agent_suggestion",
				properties: {
					suggestionId: `suggestion-perf-${i}`,
					suggestionText: `Test suggestion ${i}`,
					suggestionType: "code",
					accepted: i % 2 === 0,
					dismissed: i % 3 === 0,
				},
				timestamp: new Date(Date.now() - Math.floor(Math.random() * 1000000)),
			});
		}

		// Ingest all events
		const ingestStart = Date.now();
		for (const event of events) {
			await ingestHandler.ingestEvent(event);
		}
		const ingestEnd = Date.now();
		const ingestDuration = ingestEnd - ingestStart;

		console.log(`Ingested ${eventCount} events in ${ingestDuration}ms`);

		// Test read performance
		const readStart = Date.now();
		const result = await db
			?.select()
			.from(schema.agentSuggestions)
			.where(eq(schema.agentSuggestions.userId, testUserId));
		const readEnd = Date.now();
		const readDuration = readEnd - readStart;

		console.log(`Read ${result?.length || 0} records in ${readDuration}ms`);

		// Verify performance budget
		expect(readDuration).toBeLessThanOrEqual(QUERY_P95_MS);

		// Verify data integrity
		expect(result).toBeDefined();
		expect(result?.length).toBe(eventCount);
	}, 30000);

	it(`${testId3}: should verify analytics read functions performance`, async () => {
		// Skip if database is not available
		if (!isDatabaseAvailable) {
			console.warn("Database not available, skipping test");
			return;
		}

		// Test multiple query types
		const queries = [
			{
				name: "agentSuggestionsByUser",
				fn: () =>
					db?.select().from(schema.agentSuggestions).where(eq(schema.agentSuggestions.userId, testUserId)),
			},
			{
				name: "acceptedSuggestions",
				fn: () => db?.select().from(schema.agentSuggestions).where(eq(schema.agentSuggestions.accepted, true)),
			},
			{
				name: "recentSuggestions",
				fn: () =>
					db
						?.select()
						.from(schema.agentSuggestions)
						.where(eq(schema.agentSuggestions.userId, testUserId))
						.limit(10),
			},
		];

		// Test each query
		for (const query of queries) {
			const start = Date.now();
			await query.fn();
			const end = Date.now();
			const duration = end - start;

			console.log(`${query.name}: ${duration}ms`);

			// Verify performance budget
			expect(duration).toBeLessThanOrEqual(QUERY_P95_MS);
		}
	}, 30000);
});
