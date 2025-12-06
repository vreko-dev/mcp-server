import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetrySinkDb } from "../src/db/adapters/TelemetrySinkDb";

describe("AD-SLOW: Adapter slow-query logging", () => {
	const testId1 = "ad-slow-001";
	const testId2 = "ad-slow-002";
	const testId3 = "ad-slow-003";

	let mockDb: Partial<NodePgDatabase>;
	let telemetrySink: TelemetrySinkDb;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Spy on console.warn to capture slow query logs
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		// Create mock DB with slow select (>200ms)
		const slowSelectMock = vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockImplementation(async () => {
						// Simulate slow query (250ms)
						await new Promise((resolve) => setTimeout(resolve, 250));
						return [];
					}),
				}),
			}),
		});

		// Fast insert mock
		const insertMock = vi.fn().mockReturnValue({
			values: vi.fn().mockResolvedValue({ rowCount: 1 }),
		});

		mockDb = {
			select: slowSelectMock,
			insert: insertMock as any,
		};
		telemetrySink = new TelemetrySinkDb(mockDb as NodePgDatabase<any>);
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
	});

	it(`${testId1}: should log warning when query exceeds 200ms threshold`, async () => {
		const event = {
			requestId: "req-001",
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			suggestionId: "sug-001",
			suggestionText: "test code",
			suggestionType: "code",
			accepted: false,
			dismissed: false,
			timestamp: new Date(),
		};

		await telemetrySink.insertAgentSuggestion(event);

		// Verify slow query was logged
		expect(consoleWarnSpy).toHaveBeenCalled();
		const warningCall = consoleWarnSpy.mock.calls[0][0];
		expect(warningCall).toContain("Slow query detected");
		expect(warningCall).toContain("ms");
	});

	it(`${testId2}: should include operation name in slow query log`, async () => {
		const event = {
			requestId: "req-002",
			userId: "user-002",
			apiKeyId: "key-002",
			sessionId: "session-002",
			suggestionId: "sug-002",
			suggestionText: "test code",
			suggestionType: "code",
			accepted: false,
			dismissed: false,
			timestamp: new Date(),
		};

		await telemetrySink.insertAgentSuggestion(event);

		// Verify operation name is included
		const warningCall = consoleWarnSpy.mock.calls[0][0];
		expect(warningCall).toContain("insertAgentSuggestion");
	});

	it(`${testId3}: should include actual duration in slow query log`, async () => {
		const event = {
			requestId: "req-003",
			userId: "user-003",
			apiKeyId: "key-003",
			sessionId: "session-003",
			suggestionId: "sug-003",
			suggestionText: "test code",
			suggestionType: "code",
			accepted: false,
			dismissed: false,
			timestamp: new Date(),
		};

		const startTime = Date.now();
		await telemetrySink.insertAgentSuggestion(event);
		const endTime = Date.now();
		const actualDuration = endTime - startTime;

		// Verify actual duration is logged
		const warningCall = consoleWarnSpy.mock.calls[0][0];

		// Extract the logged duration (should be between 200-300ms for our 250ms mock)
		const durationMatch = warningCall.match(/(\d+)ms/);
		expect(durationMatch).toBeTruthy();
		const loggedDuration = Number.parseInt(durationMatch[1], 10);

		// Verify logged duration is reasonable (within ±50ms of actual)
		expect(loggedDuration).toBeGreaterThanOrEqual(200);
		expect(loggedDuration).toBeLessThanOrEqual(actualDuration + 50);
	});
});
