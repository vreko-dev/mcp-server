import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type IngestBatch, type IngestEvent, TelemetryIngestHandler } from "../src/ingest";

// Mock the TelemetrySinkDb to avoid database connection issues
vi.mock("../../platform/src/db/adapters/TelemetrySinkDb.js", () => {
	return {
		TelemetrySinkDb: vi.fn().mockImplementation(() => ({
			insertAgentSuggestion: vi.fn(),
			insertPostAcceptOutcome: vi.fn(),
			insertPolicyEvaluation: vi.fn(),
			insertLoop: vi.fn(),
			insertFeedback: vi.fn(),
			batchInsertAgentSuggestions: vi.fn(),
			batchInsertPolicyEvaluations: vi.fn(),
		})),
	};
});

// Import after mocking
import { TelemetrySinkDb } from "../../platform/src/db/adapters/TelemetrySinkDb";

describe("TEL2: Ingest handler", () => {
	const testId1 = "ing-001";
	const testId2 = "ing-002";

	let mockSink: TelemetrySinkDb;
	let ingestHandler: TelemetryIngestHandler;

	beforeEach(() => {
		// Create mock sink with spy methods
		mockSink = new TelemetrySinkDb(null as any); // Pass null since we're mocking

		ingestHandler = new TelemetryIngestHandler(mockSink);
	});

	afterEach(() => {
		vi.clearAllMocks();
		// Clear processed events cache
		if (ingestHandler.clearProcessedEvents) {
			ingestHandler.clearProcessedEvents();
		}
	});

	it(`${testId1}: should handle duplicate request_id as no-op`, async () => {
		const event: IngestEvent = {
			requestId: "test-request-001",
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			eventType: "agent_suggestion",
			properties: {
				suggestionId: "suggestion-001",
				suggestionText: "Test suggestion",
				suggestionType: "code",
				accepted: true,
				dismissed: false,
			},
			timestamp: new Date(),
		};

		// Ingest the event for the first time
		await ingestHandler.ingestEvent(event);

		// Try to ingest the same event again (should be no-op at ingest handler level)
		await ingestHandler.ingestEvent(event);

		// Verify the sink method was called only once (ingest handler implements idempotency)
		expect(mockSink.insertAgentSuggestion).toHaveBeenCalledTimes(1);
	});

	it(`${testId2}: should handle batch insert with backpressure`, async () => {
		// Create a batch of events
		const events: IngestEvent[] = Array.from({ length: 5 }, (_, i) => ({
			requestId: `batch-request-${i}`,
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			eventType: "agent_suggestion",
			properties: {
				suggestionId: `suggestion-${i}`,
				suggestionText: `Test suggestion ${i}`,
				suggestionType: "code",
				accepted: i % 2 === 0,
				dismissed: i % 3 === 0,
			},
			timestamp: new Date(),
		}));

		const batch: IngestBatch = {
			batchId: "test-batch-001",
			events,
			timestamp: new Date(),
		};

		// Ingest the batch
		await ingestHandler.ingestBatch(batch);

		// Flush to process pending batches
		await ingestHandler.flush();

		// Verify all events were processed
		expect(mockSink.insertAgentSuggestion).toHaveBeenCalledTimes(5);

		// Verify the events were processed with correct properties
		for (let i = 0; i < 5; i++) {
			expect(mockSink.insertAgentSuggestion).toHaveBeenCalledWith(
				expect.objectContaining({
					requestId: `batch-request-${i}`,
					userId: "user-001",
					apiKeyId: "key-001",
					sessionId: "session-001",
					suggestionId: `suggestion-${i}`,
					suggestionText: `Test suggestion ${i}`,
					suggestionType: "code",
					accepted: i % 2 === 0,
					dismissed: i % 3 === 0,
				}),
			);
		}
	});

	it("should handle different event types correctly", async () => {
		const policyEvent: IngestEvent = {
			requestId: "policy-request-001",
			userId: "user-001",
			apiKeyId: "key-001",
			sessionId: "session-001",
			eventType: "policy_evaluation",
			properties: {
				policyName: "test-policy",
				policyVersion: "1.0.0",
				evaluationResult: "pass",
				violations: [],
				remediationSteps: [],
			},
			timestamp: new Date(),
		};

		await ingestHandler.ingestEvent(policyEvent);

		expect(mockSink.insertPolicyEvaluation).toHaveBeenCalledTimes(1);
		expect(mockSink.insertPolicyEvaluation).toHaveBeenCalledWith(
			expect.objectContaining({
				requestId: "policy-request-001",
				policyName: "test-policy",
				evaluationResult: "pass",
			}),
		);
	});
});
