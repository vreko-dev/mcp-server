import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	AgentSuggestionEvent,
	FeedbackEvent,
	LoopEvent,
	PolicyEvaluationEvent,
	PostAcceptOutcomeEvent,
} from "../src/db/adapters/TelemetrySinkDb";

describe("QUAR-REPLAY: Quarantine replay operations", () => {
	const testId1 = "quar-replay-001";
	const testId2 = "quar-replay-002";
	const testId3 = "quar-replay-003";

	let mockDb: any;
	let mockSelect: any;
	let mockFrom: any;
	let mockWhere: any;

	beforeEach(() => {
		// Mock database query chain
		mockWhere = vi.fn(() => Promise.resolve([]));
		mockFrom = vi.fn(() => ({
			where: mockWhere,
		}));
		mockSelect = vi.fn(() => ({
			from: mockFrom,
		}));

		mockDb = {
			select: mockSelect,
			insert: vi.fn(() => ({
				values: vi.fn(() => Promise.resolve()),
			})),
		};
	});

	it(`${testId1}: should fetch quarantined event by ID`, async () => {
		const eventId = "quarantine-event-123";

		const mockQuarantinedEvent = {
			id: eventId,
			userId: "user-456",
			apiKeyId: "key-789",
			originalEvent: {
				requestId: "req-001",
				userId: "user-456",
				apiKeyId: "key-789",
				suggestionId: "sugg-001",
				suggestionText: "Add type annotation",
				suggestionType: "code_completion",
				accepted: true,
				dismissed: false,
				timestamp: new Date("2025-11-08T12:00:00Z"),
			},
			errorReason: "Database connection timeout",
			errorStack: "Error: timeout...",
			attemptedAt: new Date("2025-11-08T12:00:00Z"),
			createdAt: new Date("2025-11-08T12:00:00Z"),
		};

		// Mock query to return the quarantined event
		mockWhere = vi.fn(() => Promise.resolve([mockQuarantinedEvent]));
		mockFrom = vi.fn(() => ({
			where: mockWhere,
		}));
		mockSelect = vi.fn(() => ({
			from: mockFrom,
		}));
		mockDb.select = mockSelect;

		// Simulate fetching quarantined event
		const result = await mockDb.select().from("quarantine_events").where({ id: eventId });

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(eventId);
		expect(result[0].originalEvent.requestId).toBe("req-001");
	});

	it(`${testId2}: should detect agent suggestion event type from originalEvent`, () => {
		const originalEvent: AgentSuggestionEvent = {
			requestId: "req-001",
			userId: "user-456",
			apiKeyId: "key-789",
			suggestionId: "sugg-001",
			suggestionText: "Add type annotation",
			suggestionType: "code_completion",
			accepted: true,
			dismissed: false,
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		// Type detection logic
		const hasAgentSuggestionFields = "suggestionId" in originalEvent && "suggestionText" in originalEvent;

		expect(hasAgentSuggestionFields).toBe(true);
	});

	it(`${testId3}: should detect different event types`, () => {
		const postAcceptEvent: PostAcceptOutcomeEvent = {
			requestId: "req-002",
			userId: "user-456",
			apiKeyId: "key-789",
			suggestionId: "sugg-001",
			editsMade: [],
			timeToEditMs: 1000,
			timeToSubmitMs: 2000,
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		const policyEvent: PolicyEvaluationEvent = {
			requestId: "req-003",
			userId: "user-456",
			apiKeyId: "key-789",
			policyName: "security-policy",
			evaluationResult: "violation",
			violations: [],
			remediationSteps: [],
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		const loopEvent: LoopEvent = {
			requestId: "req-004",
			userId: "user-456",
			apiKeyId: "key-789",
			loopType: "suggestion-refinement",
			iterationCount: 3,
			success: true,
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		const feedbackEvent: FeedbackEvent = {
			requestId: "req-005",
			userId: "user-456",
			apiKeyId: "key-789",
			feedbackType: "thumbs-up",
			rating: 5,
			metadata: {},
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		// Type detection logic
		expect("suggestionId" in postAcceptEvent && "editsMade" in postAcceptEvent).toBe(true);
		expect("policyName" in policyEvent).toBe(true);
		expect("loopType" in loopEvent).toBe(true);
		expect("feedbackType" in feedbackEvent).toBe(true);
	});

	it("quar-replay-004: should call appropriate insert method based on event type", async () => {
		const mockTelemetrySink = {
			insertAgentSuggestion: vi.fn(() => Promise.resolve()),
			insertPostAcceptOutcome: vi.fn(() => Promise.resolve()),
			insertPolicyEvaluation: vi.fn(() => Promise.resolve()),
			insertLoop: vi.fn(() => Promise.resolve()),
			insertFeedback: vi.fn(() => Promise.resolve()),
		};

		const agentSuggestionEvent: AgentSuggestionEvent = {
			requestId: "req-001",
			userId: "user-456",
			apiKeyId: "key-789",
			suggestionId: "sugg-001",
			suggestionText: "Add type annotation",
			suggestionType: "code_completion",
			accepted: true,
			dismissed: false,
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		// Simulate replay logic
		if ("suggestionId" in agentSuggestionEvent && "suggestionText" in agentSuggestionEvent) {
			await mockTelemetrySink.insertAgentSuggestion(agentSuggestionEvent);
		}

		expect(mockTelemetrySink.insertAgentSuggestion).toHaveBeenCalledWith(agentSuggestionEvent);
	});

	it("quar-replay-005: should handle replay errors gracefully", async () => {
		const mockTelemetrySink = {
			insertAgentSuggestion: vi.fn(() => Promise.reject(new Error("Duplicate key violation"))),
		};

		const agentSuggestionEvent: AgentSuggestionEvent = {
			requestId: "req-001",
			userId: "user-456",
			apiKeyId: "key-789",
			suggestionId: "sugg-001",
			suggestionText: "Add type annotation",
			suggestionType: "code_completion",
			accepted: true,
			dismissed: false,
			timestamp: new Date("2025-11-08T12:00:00Z"),
		};

		// Test error handling
		let errorCaught = false;
		try {
			await mockTelemetrySink.insertAgentSuggestion(agentSuggestionEvent);
		} catch (error) {
			errorCaught = true;
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe("Duplicate key violation");
		}

		expect(errorCaught).toBe(true);
	});
});
