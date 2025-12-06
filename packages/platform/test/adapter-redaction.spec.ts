import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetrySinkDb } from "../src/db/adapters/TelemetrySinkDb";

// Mock the redaction module
vi.mock("@snapback/analytics", () => ({
	redactString: vi.fn((str: string) => `REDACTED_${str}`),
	redactObject: vi.fn((obj: any) => ({ ...obj, redacted: true })),
}));

describe("AD-REDACT: Adapter redaction integration", () => {
	const testId1 = "ad-red-001";
	const testId2 = "ad-red-002";
	const testId3 = "ad-red-003";

	let mockDb: Partial<NodePgDatabase>;
	let telemetrySink: TelemetrySinkDb;

	beforeEach(() => {
		// Create a full mock DB with all necessary methods
		const selectMock = vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([]), // Return empty array (no existing records)
				}),
			}),
		});

		const insertMock = vi.fn().mockReturnValue({
			values: vi.fn().mockResolvedValue({ rowCount: 1 }),
		});

		mockDb = {
			select: selectMock,
			insert: insertMock,
		};
		telemetrySink = new TelemetrySinkDb(mockDb as NodePgDatabase<any>);
	});

	it(`${testId1}: should redact suggestionText in agent suggestions before insert`, async () => {
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

		await telemetrySink.insertAgentSuggestion(event);

		// Verify insert was called
		expect(mockDb.insert).toHaveBeenCalled();

		// Get the values passed to insert
		const insertCall = (mockDb.insert as any).mock.results[0].value;
		const valueCall = insertCall.values.mock.calls[0][0];

		// Verify suggestionText was redacted
		expect(valueCall.suggestionText).toContain("REDACTED_");
		expect(valueCall.suggestionText).not.toBe(event.suggestionText);
	});

	it(`${testId2}: should deep redact violations and remediationSteps in policy evaluations`, async () => {
		const event = {
			requestId: "req-002",
			userId: "user-002",
			apiKeyId: "key-002",
			sessionId: "session-002",
			policyName: "security-check",
			policyVersion: "1.0",
			evaluationResult: "fail",
			violations: [
				{
					rule: "no-secrets",
					message: "Found API key in code",
					location: "/path/to/file.ts:10",
					value: "sk-secret-key-here",
				},
			],
			remediationSteps: [
				{
					step: "Remove the secret",
					code: "const apiKey = process.env.API_KEY",
				},
			],
			timestamp: new Date(),
		};

		await telemetrySink.insertPolicyEvaluation(event);

		// Get the values passed to insert
		const insertCall = (mockDb.insert as any).mock.results[0].value;
		const valueCall = insertCall.values.mock.calls[0][0];

		// Verify deep objects were redacted
		expect(valueCall.violations).toHaveProperty("redacted", true);
		expect(valueCall.remediationSteps).toHaveProperty("redacted", true);
	});

	it(`${testId3}: should redact userFeedback and filePath fields`, async () => {
		const { redactString } = await import("@snapback/analytics");

		const event = {
			requestId: "req-003",
			userId: "user-003",
			apiKeyId: "key-003",
			suggestionId: "sug-003",
			editsMade: [],
			timeToEditMs: 1000,
			timeToSubmitMs: 2000,
			userFeedback: "My email is john@example.com",
			timestamp: new Date(),
		};

		await telemetrySink.insertPostAcceptOutcome(event);

		// Verify redactString was called
		expect(redactString).toHaveBeenCalled();

		// Get the values passed to insert
		const insertCall = (mockDb.insert as any).mock.results[0].value;
		const valueCall = insertCall.values.mock.calls[0][0];

		// Verify userFeedback was redacted
		expect(valueCall.userFeedback).toContain("REDACTED_");
	});
});
