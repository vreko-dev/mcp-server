/**
 * MCP Service Tests
 *
 * TDD Tests following 4-path coverage:
 * - Happy: Valid inputs → expected outputs
 * - Sad: Invalid inputs → graceful error with message
 * - Edge: Empty, null, boundary values
 * - Error: Dependency failures
 *
 * Privacy: All tests verify metadata-only (C-006)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the platform schema exports - must be before imports
vi.mock("@snapback/platform", () => ({
	mcpSessions: {
		id: { name: "id" },
		userId: { name: "user_id" },
		workspaceId: { name: "workspace_id" },
		taskDescription: { name: "task_description" },
		detectedStack: { name: "detected_stack" },
		snapshotCount: { name: "snapshot_count" },
		riskAnalysisCount: { name: "risk_analysis_count" },
		learningsRecorded: { name: "learnings_recorded" },
		startedAt: { name: "started_at" },
		endedAt: { name: "ended_at" },
	},
	mcpAggregatedLearnings: {
		id: { name: "id" },
		userId: { name: "user_id" },
		patternKey: { name: "pattern_key" },
		patternType: { name: "pattern_type" },
		confidence: { name: "confidence" },
		workspaceCount: { name: "workspace_count" },
		workspaceIds: { name: "workspace_ids" },
		totalOccurrences: { name: "total_occurrences" },
		lastSeenAt: { name: "last_seen_at" },
		updatedAt: { name: "updated_at" },
	},
	mcpActivityEvents: {
		id: { name: "id" },
		sessionId: { name: "session_id" },
		userId: { name: "user_id" },
		eventType: { name: "event_type" },
		fileCount: { name: "file_count" },
		totalBytes: { name: "total_bytes" },
		riskLevel: { name: "risk_level" },
	},
}));

// Mock the database module - using factory function for hoisting
vi.mock("../database", () => {
	const mockInsert = vi.fn();
	const mockValues = vi.fn();
	const mockReturning = vi.fn();
	const mockSelect = vi.fn();
	const mockFrom = vi.fn();
	const mockWhere = vi.fn();
	const mockOrderBy = vi.fn();
	const mockLimit = vi.fn();
	const mockUpdate = vi.fn();
	const mockSet = vi.fn();
	const mockExecute = vi.fn();

	// Chain methods - where can lead to orderBy OR limit directly
	mockInsert.mockReturnValue({ values: mockValues });
	mockValues.mockReturnValue({ returning: mockReturning });
	mockSelect.mockReturnValue({ from: mockFrom });
	mockFrom.mockReturnValue({ where: mockWhere });
	mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
	mockOrderBy.mockReturnValue({ limit: mockLimit });
	mockUpdate.mockReturnValue({ set: mockSet });
	mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) });

	return {
		db: {
			insert: mockInsert,
			select: mockSelect,
			update: mockUpdate,
			execute: mockExecute,
			// Store references for test access
			__mocks: {
				insert: mockInsert,
				values: mockValues,
				returning: mockReturning,
				select: mockSelect,
				from: mockFrom,
				where: mockWhere,
				orderBy: mockOrderBy,
				limit: mockLimit,
				update: mockUpdate,
				set: mockSet,
				execute: mockExecute,
			},
		},
	};
});

import {
	endMcpSession,
	getSessionStats,
	McpServiceError,
	queryUserRecommendations,
	recordActivityEvent,
	recordLearningSignal,
	startMcpSession,
} from "../mcp";
import { db } from "../database";

// Get mock references
const getMocks = () => (db as any).__mocks;

describe("MCP Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset chain methods after each test
		const mocks = getMocks();
		mocks.insert.mockReturnValue({ values: mocks.values });
		mocks.values.mockReturnValue({ returning: mocks.returning });
		mocks.select.mockReturnValue({ from: mocks.from });
		mocks.from.mockReturnValue({ where: mocks.where });
		mocks.where.mockReturnValue({ orderBy: mocks.orderBy, limit: mocks.limit });
		mocks.orderBy.mockReturnValue({ limit: mocks.limit });
		mocks.update.mockReturnValue({ set: mocks.set });
		mocks.set.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mocks.returning }) });
	});

	describe("startMcpSession", () => {
		// HAPPY PATH
		it("should start a session and return session ID with recommendations", async () => {
			const mocks = getMocks();
			// Mock successful insert
			mocks.returning.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440000" }]);
			// Mock recommendations query - empty for new user
			mocks.limit.mockResolvedValueOnce([]);

			const result = await startMcpSession("user_123", "ws_abc", "Adding authentication");

			expect(result).toEqual({
				sessionId: expect.stringMatching(/^sess_[a-f0-9]+$/),
				guidance: {
					recommendations: expect.arrayContaining([
						expect.objectContaining({
							type: expect.any(String),
							title: expect.any(String),
							description: expect.any(String),
							confidence: expect.any(Number),
						}),
					]),
				},
			});
		});

		it("should accept optional detectedStack metadata", async () => {
			const mocks = getMocks();
			mocks.returning.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440001" }]);
			mocks.limit.mockResolvedValueOnce([]);

			const detectedStack = { frameworks: ["nextjs"], languages: ["typescript"] };
			const result = await startMcpSession("user_123", "ws_abc", "Task", detectedStack);

			expect(result.sessionId).toMatch(/^sess_[a-f0-9]+$/);
		});

		// SAD PATH
		it("should throw McpServiceError for empty userId", async () => {
			await expect(startMcpSession("", "ws_abc")).rejects.toThrow(McpServiceError);
			await expect(startMcpSession("", "ws_abc")).rejects.toMatchObject({
				code: "INVALID_INPUT",
				message: expect.stringContaining("userId"),
			});
		});

		it("should throw McpServiceError for empty workspaceId", async () => {
			await expect(startMcpSession("user_123", "")).rejects.toThrow(McpServiceError);
			await expect(startMcpSession("user_123", "")).rejects.toMatchObject({
				code: "INVALID_INPUT",
				message: expect.stringContaining("workspaceId"),
			});
		});

		// EDGE PATH
		it("should handle undefined taskDescription", async () => {
			const mocks = getMocks();
			mocks.returning.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440002" }]);
			mocks.limit.mockResolvedValueOnce([]);

			const result = await startMcpSession("user_123", "ws_abc", undefined);
			expect(result.sessionId).toMatch(/^sess_[a-f0-9]+$/);
		});

		it("should handle empty detectedStack", async () => {
			const mocks = getMocks();
			mocks.returning.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440003" }]);
			mocks.limit.mockResolvedValueOnce([]);

			const result = await startMcpSession("user_123", "ws_abc", "Task", {});
			expect(result.sessionId).toMatch(/^sess_[a-f0-9]+$/);
		});

		// ERROR PATH (DB failures)
		it("should propagate database errors", async () => {
			const mocks = getMocks();
			mocks.returning.mockRejectedValueOnce(new Error("Database connection failed"));

			await expect(startMcpSession("user_123", "ws_abc")).rejects.toThrow("Database connection failed");
		});
	});

	describe("recordActivityEvent", () => {
		// HAPPY PATH
		it("should record activity and return event ID", async () => {
			const mocks = getMocks();
			// First call: session lookup returns the session UUID
			mocks.limit.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440000" }]);
			// Second call: insert returns the event
			mocks.returning.mockResolvedValueOnce([{ id: "660e8400-e29b-41d4-a716-446655440000" }]);
			mocks.execute.mockResolvedValueOnce({ rowCount: 1 });

			const result = await recordActivityEvent("sess_123", "user_123", "snapshot_created", {
				fileCount: 5,
				totalBytes: 12500,
			});

			expect(result).toEqual({
				eventId: expect.stringMatching(/^evt_[a-f0-9]+$/),
			});
		});

		it("should accept riskLevel metadata", async () => {
			const mocks = getMocks();
			// First call: session lookup returns the session UUID
			mocks.limit.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440001" }]);
			// Second call: insert returns the event
			mocks.returning.mockResolvedValueOnce([{ id: "660e8400-e29b-41d4-a716-446655440001" }]);
			mocks.execute.mockResolvedValueOnce({ rowCount: 1 });

			const result = await recordActivityEvent("sess_123", "user_123", "risk_analyzed", {
				riskLevel: "medium",
			});

			expect(result.eventId).toMatch(/^evt_[a-f0-9]+$/);
		});

		// SAD PATH
		it("should throw for missing sessionId", async () => {
			await expect(recordActivityEvent("", "user_123", "snapshot_created", {})).rejects.toThrow(McpServiceError);
			await expect(recordActivityEvent("", "user_123", "snapshot_created", {})).rejects.toMatchObject({
				code: "INVALID_INPUT",
			});
		});

		it("should throw for missing eventType", async () => {
			await expect(recordActivityEvent("sess_123", "user_123", "", {})).rejects.toThrow(McpServiceError);
		});

		// EDGE PATH - Privacy enforcement (C-006)
		it("should reject disallowed metadata keys (privacy violation)", async () => {
			const badMetadata = { fileCount: 5, filePaths: ["/src/index.ts"] } as any;

			await expect(recordActivityEvent("sess_123", "user_123", "snapshot_created", badMetadata)).rejects.toThrow(
				McpServiceError,
			);
			await expect(recordActivityEvent("sess_123", "user_123", "snapshot_created", badMetadata)).rejects.toMatchObject({
				code: "PRIVACY_VIOLATION",
			});
		});

		it("should reject code content in metadata", async () => {
			const badMetadata = { fileCount: 5, codeSnippet: "const x = 1" } as any;

			await expect(recordActivityEvent("sess_123", "user_123", "snapshot_created", badMetadata)).rejects.toMatchObject({
				code: "PRIVACY_VIOLATION",
			});
		});

		// ERROR PATH
		it("should only allow specific metadata keys", async () => {
			const mocks = getMocks();
			// First call: session lookup returns the session UUID
			mocks.limit.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440002" }]);
			// Second call: insert returns the event
			mocks.returning.mockResolvedValueOnce([{ id: "660e8400-e29b-41d4-a716-446655440002" }]);
			mocks.execute.mockResolvedValueOnce({ rowCount: 1 });

			// Valid keys: fileCount, totalBytes, riskLevel
			const validResult = await recordActivityEvent("sess_123", "user_123", "snapshot_created", {
				fileCount: 10,
				totalBytes: 50000,
				riskLevel: "low",
			});
			expect(validResult.eventId).toBeDefined();
		});
	});

	describe("recordLearningSignal", () => {
		// HAPPY PATH
		it("should record learning signal and return aggregation status", async () => {
			const mocks = getMocks();
			// Mock no existing pattern
			mocks.limit.mockResolvedValueOnce([]);

			const result = await recordLearningSignal("user_123", "ws_abc", "typescript", "stack", 0.9);

			expect(result).toEqual({
				aggregated: true,
				workspaceCount: expect.any(Number),
			});
		});

		it("should aggregate existing pattern and increase workspace count", async () => {
			const mocks = getMocks();
			// Mock existing pattern - returns from the limit() call in query
			// workspaceIds contains a different workspace, so this is a NEW workspace
			mocks.limit.mockResolvedValueOnce([
				{
					id: "existing-id",
					workspaceCount: 1,
					workspaceIds: ["ws_different"], // Different from "ws_abc" we're calling with
					totalOccurrences: 3,
					confidence: 0.8,
				},
			]);

			const result = await recordLearningSignal("user_123", "ws_abc", "typescript", "stack", 0.9);

			expect(result.aggregated).toBe(true);
			expect(result.workspaceCount).toBe(2);
		});

		// SAD PATH
		it("should throw for missing patternKey", async () => {
			await expect(recordLearningSignal("user_123", "ws_abc", "", "stack", 0.9)).rejects.toThrow(McpServiceError);
		});

		it("should throw for invalid confidence (negative)", async () => {
			await expect(recordLearningSignal("user_123", "ws_abc", "typescript", "stack", -0.5)).rejects.toThrow(
				McpServiceError,
			);
			await expect(recordLearningSignal("user_123", "ws_abc", "typescript", "stack", -0.5)).rejects.toMatchObject({
				code: "INVALID_INPUT",
				message: expect.stringContaining("Confidence"),
			});
		});

		it("should throw for invalid confidence (> 1)", async () => {
			await expect(recordLearningSignal("user_123", "ws_abc", "typescript", "stack", 1.5)).rejects.toThrow(
				McpServiceError,
			);
		});

		// EDGE PATH
		it("should accept confidence at boundaries (0 and 1)", async () => {
			const mocks = getMocks();
			// First call - confidence 0
			mocks.limit.mockResolvedValueOnce([]);

			// Second call - confidence 1
			mocks.limit.mockResolvedValueOnce([]);

			const result0 = await recordLearningSignal("user_123", "ws_abc", "typescript", "stack", 0);
			const result1 = await recordLearningSignal("user_123", "ws_abc", "typescript", "stack", 1);

			expect(result0.aggregated).toBe(true);
			expect(result1.aggregated).toBe(true);
		});
	});

	describe("getSessionStats", () => {
		// HAPPY PATH
		it("should return session statistics", async () => {
			const mocks = getMocks();
			const startedAt = new Date(Date.now() - 3600000); // 1 hour ago
			mocks.limit.mockResolvedValueOnce([
				{
					snapshotCount: 5,
					riskAnalysisCount: 3,
					learningsRecorded: 2,
					startedAt,
					endedAt: null,
				},
			]);

			const result = await getSessionStats("sess_123", "user_123");

			expect(result).toEqual({
				snapshotCount: expect.any(Number),
				riskAnalysisCount: expect.any(Number),
				learningsRecorded: expect.any(Number),
				duration: expect.any(Number),
			});
		});

		// SAD PATH
		it("should throw for missing sessionId", async () => {
			await expect(getSessionStats("", "user_123")).rejects.toThrow(McpServiceError);
		});

		it("should throw for missing userId", async () => {
			await expect(getSessionStats("sess_123", "")).rejects.toThrow(McpServiceError);
		});

		// EDGE PATH
		it("should return empty stats for non-existent session", async () => {
			const mocks = getMocks();
			mocks.limit.mockResolvedValueOnce([]);

			const result = await getSessionStats("sess_nonexistent", "user_123");

			expect(result).toEqual({
				snapshotCount: 0,
				riskAnalysisCount: 0,
				learningsRecorded: 0,
				duration: 0,
			});
		});
	});

	describe("endMcpSession", () => {
		// HAPPY PATH
		it("should end session successfully", async () => {
			const mocks = getMocks();
			mocks.returning.mockResolvedValueOnce([{ id: "sess_123" }]);

			const result = await endMcpSession("sess_123", "user_123");

			expect(result).toEqual({
				success: true,
			});
		});

		// SAD PATH
		it("should throw for missing sessionId", async () => {
			await expect(endMcpSession("", "user_123")).rejects.toThrow(McpServiceError);
		});

		// EDGE PATH
		it("should return false for non-existent session", async () => {
			const mocks = getMocks();
			mocks.returning.mockResolvedValueOnce([]);

			const result = await endMcpSession("sess_nonexistent", "user_123");

			expect(result.success).toBe(false);
		});
	});

	describe("queryUserRecommendations", () => {
		// HAPPY PATH
		it("should return recommendations array", async () => {
			const mocks = getMocks();
			mocks.limit.mockResolvedValueOnce([
				{
					patternKey: "typescript",
					patternType: "stack",
					confidence: 0.9,
					workspaceCount: 3,
				},
			]);

			const result = await queryUserRecommendations("user_123", "ws_abc");

			expect(result).toBeInstanceOf(Array);
			expect(result[0]).toMatchObject({
				type: expect.any(String),
				title: expect.any(String),
				description: expect.any(String),
				confidence: expect.any(Number),
			});
		});

		// EDGE PATH
		it("should return empty array for invalid userId", async () => {
			const result = await queryUserRecommendations("", "ws_abc");
			expect(result).toEqual([]);
		});

		it("should return default recommendation for new user", async () => {
			const mocks = getMocks();
			mocks.limit.mockResolvedValueOnce([]);

			const result = await queryUserRecommendations("new_user", "ws_abc");

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe("Session Started");
		});
	});
});
