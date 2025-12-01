import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetrySinkDb } from "../src/db/adapters/TelemetrySinkDb.js";
import { agentSuggestions, quarantineEvents } from "../src/db/schema/snapback/index.js";

describe("AD-QUAR: Adapter quarantine mechanism", () => {
	const testId1 = "ad-quar-001";
	const testId2 = "ad-quar-002";
	const testId3 = "ad-quar-003";

	let mockDb: Partial<NodePgDatabase>;
	let telemetrySink: TelemetrySinkDb;
	let quarantineInsertSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		quarantineInsertSpy = vi.fn().mockResolvedValue({ rowCount: 1 });

		// Create mock DB with select, insert, and quarantine insert
		const selectMock = vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([]), // Return empty array (no existing records)
				}),
			}),
		});

		// Mock insert that throws error to trigger quarantine
		const insertMock = vi.fn((table) => {
			// If inserting to agentSuggestions, throw error to test quarantine
			if (table === agentSuggestions) {
				return {
					values: vi.fn().mockRejectedValue(new Error("Database constraint violation")),
				};
			}
			// For quarantine table, succeed
			if (table === quarantineEvents) {
				return {
					values: quarantineInsertSpy,
				};
			}
			// Default success for other tables
			return {
				values: vi.fn().mockResolvedValue({ rowCount: 1 }),
			};
		});

		mockDb = {
			select: selectMock,
			insert: insertMock as any,
		};
		telemetrySink = new TelemetrySinkDb(mockDb as NodePgDatabase<any>);
	});

	it(`${testId1}: should quarantine event when insert fails`, async () => {
		const event = {
			requestId: "req-001",
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			suggestionId: "sug-001",
			suggestionText: "const apiKey = 'sk-1234567890abcdef';",
			suggestionType: "code",
			accepted: false,
			dismissed: false,
			timestamp: new Date(),
		};

		// Attempt to insert should not throw (failure is caught and quarantined)
		await expect(telemetrySink.insertAgentSuggestion(event)).resolves.not.toThrow();

		// Verify quarantine insert was called
		expect(quarantineInsertSpy).toHaveBeenCalled();

		// Get the quarantined event
		const quarantineCall = quarantineInsertSpy.mock.calls[0][0];

		// Verify original event was stored
		expect(quarantineCall.originalEvent).toMatchObject({
			requestId: event.requestId,
			userId: event.userId,
			apiKeyId: event.apiKeyId,
		});

		// Verify error reason was captured
		expect(quarantineCall.errorReason).toContain("Database constraint violation");
	});

	it(`${testId2}: should include error stack in quarantine event`, async () => {
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

		// Verify error stack was captured
		const quarantineCall = quarantineInsertSpy.mock.calls[0][0];
		expect(quarantineCall.errorStack).toBeDefined();
		expect(typeof quarantineCall.errorStack).toBe("string");
	});

	it(`${testId3}: should set attemptedAt timestamp in quarantine event`, async () => {
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

		const beforeAttempt = new Date();
		await telemetrySink.insertAgentSuggestion(event);
		const afterAttempt = new Date();

		// Verify attemptedAt timestamp is within expected range
		const quarantineCall = quarantineInsertSpy.mock.calls[0][0];
		expect(quarantineCall.attemptedAt).toBeDefined();
		expect(quarantineCall.attemptedAt).toBeInstanceOf(Date);
		expect(quarantineCall.attemptedAt.getTime()).toBeGreaterThanOrEqual(beforeAttempt.getTime());
		expect(quarantineCall.attemptedAt.getTime()).toBeLessThanOrEqual(afterAttempt.getTime());
	});
});
