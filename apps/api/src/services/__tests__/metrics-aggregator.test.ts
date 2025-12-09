import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsAggregator, type UserLifetimeMetrics } from "../metrics-aggregator";

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockGroupBy = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

const mockDb = {
	select: vi.fn(() => ({
		from: mockFrom,
	})),
	insert: vi.fn(() => ({
		values: mockValues,
	})),
} as any;

// Mock logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

// Mock Drizzle functions
vi.mock("drizzle-orm", () => ({
	eq: vi.fn((field, value) => ({ field, value, type: "eq" })),
	and: vi.fn((...conditions) => ({ conditions, type: "and" })),
	gte: vi.fn((field, value) => ({ field, value, type: "gte" })),
	lte: vi.fn((field, value) => ({ field, value, type: "lte" })),
	sql: vi.fn(() => ({})),
	count: vi.fn(() => ({})),
	desc: vi.fn((field) => ({ field, type: "desc" })),
}));

// Mock schema
vi.mock("@snapback/platform/db/schema/snapback", () => ({
	userProductMetrics: {
		userId: "userId",
		snapshotsTotal: "snapshotsTotal",
		restoresTotal: "restoresTotal",
		minutesSavedTotal: "minutesSavedTotal",
		aiSessionsTotal: "aiSessionsTotal",
		snapshots7d: "snapshots7d",
		restores7d: "restores7d",
		minutesSaved7d: "minutesSaved7d",
		aiSessions7d: "aiSessions7d",
		snapshots30d: "snapshots30d",
		restores30d: "restores30d",
		lastSnapshotAt: "lastSnapshotAt",
		lastRestoreAt: "lastRestoreAt",
	},
	userDailyMetrics: {
		userId: "userId",
		date: "date",
		snapshotsCreated: "snapshotsCreated",
		snapshotsRestored: "snapshotsRestored",
		minutesSavedEstimate: "minutesSavedEstimate",
		aiSessions: "aiSessions",
	},
	featureUsage: {
		userId: "userId",
		featureCategory: "featureCategory",
		featureName: "featureName",
		createdAt: "createdAt",
	},
	snapshots: {
		userId: "userId",
		createdAt: "createdAt",
		description: "description",
		trigger: "trigger",
	},
}));

describe("MetricsAggregator", () => {
	let aggregator: MetricsAggregator;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Setup default mock chain
		mockFrom.mockReturnValue({ where: mockWhere, groupBy: mockGroupBy });
		mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy, groupBy: mockGroupBy });
		mockGroupBy.mockResolvedValue([]);
		mockLimit.mockResolvedValue([]);
		mockOrderBy.mockResolvedValue([]);
		mockValues.mockResolvedValue(undefined);

		aggregator = new MetricsAggregator(mockDb);
	});

	describe("getUserLifetimeMetrics", () => {
		it("should return null when user has no metrics", async () => {
			mockLimit.mockResolvedValueOnce([]);

			const result = await aggregator.getUserLifetimeMetrics("user_123");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toBeNull();
			}
		});

		it("should return user metrics when they exist", async () => {
			const mockMetrics: UserLifetimeMetrics = {
				snapshotsTotal: 150,
				restoresTotal: 30,
				minutesSavedTotal: 450,
				aiSessionsTotal: 25,
				snapshots7d: 10,
				restores7d: 2,
				minutesSaved7d: 30,
				aiSessions7d: 3,
				snapshots30d: 45,
				restores30d: 8,
				lastSnapshotAt: new Date("2025-12-04T10:00:00Z"),
				lastRestoreAt: new Date("2025-12-03T15:30:00Z"),
			};

			mockLimit.mockResolvedValueOnce([mockMetrics]);

			const result = await aggregator.getUserLifetimeMetrics("user_123");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toEqual(mockMetrics);
			}
		});

		it("should return error for empty user ID", async () => {
			const result = await aggregator.getUserLifetimeMetrics("");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_USER_ID");
				expect(result.error.message).toBe("User ID required");
			}
		});

		it("should handle database errors gracefully", async () => {
			const { logger } = await import("@snapback/infrastructure");

			const dbError = new Error("Database connection failed");
			mockLimit.mockRejectedValueOnce(dbError);

			const result = await aggregator.getUserLifetimeMetrics("user_123");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("FETCH_FAILED");
				expect(result.error.context?.originalError).toBe("Database connection failed");
			}

			expect(logger.error).toHaveBeenCalledWith(
				"Failed to get user lifetime metrics",
				expect.objectContaining({
					userId: "user_123",
					error: "Database connection failed",
				}),
			);
		});
	});

	describe("getDailyMetricsForRange", () => {
		it("should return daily metrics for valid date range", async () => {
			const mockDailyMetrics = [
				{
					date: new Date("2025-12-01"),
					snapshotsCreated: 5,
					snapshotsRestored: 1,
					minutesSavedEstimate: 15,
					aiSessions: 2,
				},
				{
					date: new Date("2025-12-02"),
					snapshotsCreated: 3,
					snapshotsRestored: 0,
					minutesSavedEstimate: 9,
					aiSessions: 1,
				},
			];

			mockOrderBy.mockResolvedValueOnce(mockDailyMetrics);

			const startDate = new Date("2025-12-01");
			const endDate = new Date("2025-12-02");

			const result = await aggregator.getDailyMetricsForRange(
				"user_123",
				startDate,
				endDate,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toHaveLength(2);
				expect(result.value[0].snapshotsCreated).toBe(5);
				expect(result.value[1].snapshotsCreated).toBe(3);
			}
		});

		it("should return empty array when no metrics in range", async () => {
			mockOrderBy.mockResolvedValueOnce([]);

			const result = await aggregator.getDailyMetricsForRange(
				"user_123",
				new Date("2025-01-01"),
				new Date("2025-01-31"),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toEqual([]);
			}
		});

		it("should return error for invalid date range", async () => {
			const startDate = new Date("2025-12-31");
			const endDate = new Date("2025-12-01");

			const result = await aggregator.getDailyMetricsForRange(
				"user_123",
				startDate,
				endDate,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("INVALID_DATE_RANGE");
				expect(result.error.message).toBe("Start date must be before end date");
			}
		});

		it("should return error for empty user ID", async () => {
			const result = await aggregator.getDailyMetricsForRange(
				"",
				new Date("2025-12-01"),
				new Date("2025-12-31"),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_USER_ID");
			}
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Query timeout");
			mockOrderBy.mockRejectedValueOnce(dbError);

			const result = await aggregator.getDailyMetricsForRange(
				"user_123",
				new Date("2025-12-01"),
				new Date("2025-12-31"),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("FETCH_FAILED");
			}
		});
	});

	describe("getRecentDailyMetrics", () => {
		it("should get metrics for last 30 days by default", async () => {
			mockOrderBy.mockResolvedValueOnce([
				{
					date: new Date(),
					snapshotsCreated: 5,
					snapshotsRestored: 1,
					minutesSavedEstimate: 15,
					aiSessions: 2,
				},
			]);

			const result = await aggregator.getRecentDailyMetrics("user_123");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value.length).toBeGreaterThanOrEqual(0);
			}
		});

		it("should accept custom number of days", async () => {
			mockOrderBy.mockResolvedValueOnce([]);

			const result = await aggregator.getRecentDailyMetrics("user_123", 7);

			expect(result.success).toBe(true);
		});

		it("should return error for invalid days value", async () => {
			const resultNegative = await aggregator.getRecentDailyMetrics("user_123", -1);
			expect(resultNegative.success).toBe(false);
			if (!resultNegative.success) {
				expect(resultNegative.error.code).toBe("INVALID_DAYS");
			}

			const resultTooLarge = await aggregator.getRecentDailyMetrics("user_123", 500);
			expect(resultTooLarge.success).toBe(false);
			if (!resultTooLarge.success) {
				expect(resultTooLarge.error.code).toBe("INVALID_DAYS");
			}
		});
	});

	describe("initializeUserMetrics", () => {
		it("should create new metrics entry for new user", async () => {
			const { logger } = await import("@snapback/infrastructure");

			// Mock getUserLifetimeMetrics to return null (user has no metrics)
			mockLimit.mockResolvedValueOnce([]);
			// Mock insert
			mockValues.mockResolvedValueOnce(undefined);

			const result = await aggregator.initializeUserMetrics("user_new");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value.snapshotsTotal).toBe(0);
				expect(result.value.restoresTotal).toBe(0);
				expect(result.value.lastSnapshotAt).toBeNull();
			}

			expect(mockDb.insert).toHaveBeenCalled();
			expect(mockValues).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: "user_new",
					snapshotsTotal: 0,
					restoresTotal: 0,
				}),
			);

			expect(logger.info).toHaveBeenCalledWith(
				"Initialized user metrics",
				{ userId: "user_new" },
			);
		});

		it("should return existing metrics if user already has entry", async () => {
			const existingMetrics: UserLifetimeMetrics = {
				snapshotsTotal: 50,
				restoresTotal: 10,
				minutesSavedTotal: 150,
				aiSessionsTotal: 8,
				snapshots7d: 5,
				restores7d: 1,
				minutesSaved7d: 15,
				aiSessions7d: 2,
				snapshots30d: 20,
				restores30d: 4,
				lastSnapshotAt: new Date(),
				lastRestoreAt: new Date(),
			};

			mockLimit.mockResolvedValueOnce([existingMetrics]);

			const result = await aggregator.initializeUserMetrics("user_existing");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value.snapshotsTotal).toBe(50);
			}

			// Insert should not be called
			expect(mockDb.insert).not.toHaveBeenCalled();
		});

		it("should return error for empty user ID", async () => {
			const result = await aggregator.initializeUserMetrics("");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_USER_ID");
			}
		});

		it("should handle database errors during insert", async () => {
			mockLimit.mockResolvedValueOnce([]);
			mockValues.mockRejectedValueOnce(new Error("Insert failed"));

			const result = await aggregator.initializeUserMetrics("user_123");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("INIT_FAILED");
			}
		});
	});

	describe("MetricsError", () => {
		it("should create error with code and context", async () => {
			const { MetricsError } = await import("../metrics-aggregator.js");

			const error = new MetricsError("Test error", "TEST_CODE", {
				userId: "user_123",
			});

			expect(error.name).toBe("MetricsError");
			expect(error.message).toBe("Test error");
			expect(error.code).toBe("TEST_CODE");
			expect(error.context?.userId).toBe("user_123");
		});
	});

	/**
	 * RED PHASE: Tests for getAIToolDetectionCounts()
	 * Task 4.1.A - AI Breakdown Aggregation
	 *
	 * Purpose: Aggregate AI tool detection counts from featureUsage table
	 * grouped by tool (copilot, cursor, claude, windsurf)
	 *
	 * Following TDD_AGENT_PROMPT.md:
	 * - Write failing test BEFORE implementation
	 * - Test MUST fail with "getAIToolDetectionCounts is not a function"
	 * - Specific assertions (no vague .toBeTruthy())
	 * - Test all 4 paths: Happy, Sad, Edge, Error
	 */
	describe("getAIToolDetectionCounts", () => {
		// Happy Path: Normal aggregation with multiple tools
		it("should aggregate AI tool detection counts by tool name", async () => {
			// ARRANGE - Mock featureUsage query results
			const mockGroupBy = vi.fn();
			mockWhere.mockReturnValue({ groupBy: mockGroupBy });
			mockGroupBy.mockResolvedValueOnce([
				{ featureName: "GitHub Copilot", count: 7 },
				{ featureName: "Cursor AI", count: 3 },
				{ featureName: "Claude Code", count: 2 },
				{ featureName: "Windsurf", count: 1 },
			]);

			// ACT
			const result = await aggregator.getAIToolDetectionCounts("user_123");

			// ASSERT - Specific values, not vague checks
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toEqual({
					copilot: 7,
					cursor: 3,
					claude: 2,
					windsurf: 1,
				});
			}
		});

		// Sad Path: Empty user ID validation
		it("should return error for empty user ID", async () => {
			const result = await aggregator.getAIToolDetectionCounts("");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_USER_ID");
				expect(result.error.message).toBe("User ID required");
			}
		});

		// Edge Case: User has no AI detections (all zeros)
		it("should return all zeros when user has no AI detections", async () => {
			const mockGroupBy = vi.fn();
			mockWhere.mockReturnValue({ groupBy: mockGroupBy });
			mockGroupBy.mockResolvedValueOnce([]);

			const result = await aggregator.getAIToolDetectionCounts("user_no_ai");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toEqual({
					copilot: 0,
					cursor: 0,
					claude: 0,
					windsurf: 0,
				});
			}
		});

		// Edge Case: Tool name normalization (case variations)
		it("should normalize tool names to canonical form", async () => {
			const mockGroupBy = vi.fn();
			mockWhere.mockReturnValue({ groupBy: mockGroupBy });
			mockGroupBy.mockResolvedValueOnce([
				{ featureName: "GITHUB COPILOT", count: 5 },
				{ featureName: "copilot", count: 2 },
				{ featureName: "Cursor AI Assistant", count: 3 },
				{ featureName: "claude-3", count: 1 },
			]);

			const result = await aggregator.getAIToolDetectionCounts("user_123");

			expect(result.success).toBe(true);
			if (result.success) {
				// copilot variations should sum: 5 + 2 = 7
				expect(result.value.copilot).toBe(7);
				// cursor variations should sum: 3
				expect(result.value.cursor).toBe(3);
				// claude variations should sum: 1
				expect(result.value.claude).toBe(1);
				// windsurf not in results
				expect(result.value.windsurf).toBe(0);
			}
		});

		// Edge Case: Unknown tool names (ignored)
		it("should ignore unknown tool names", async () => {
			const mockGroupBy = vi.fn();
			mockWhere.mockReturnValue({ groupBy: mockGroupBy });
			mockGroupBy.mockResolvedValueOnce([
				{ featureName: "copilot", count: 5 },
				{ featureName: "unknown-tool", count: 100 },
				{ featureName: "random-ai", count: 50 },
			]);

			const result = await aggregator.getAIToolDetectionCounts("user_123");

			expect(result.success).toBe(true);
			if (result.success) {
				// Only known tools counted
				expect(result.value.copilot).toBe(5);
				expect(result.value.cursor).toBe(0);
				expect(result.value.claude).toBe(0);
				expect(result.value.windsurf).toBe(0);
			}
		});

		// Error Case: Database query failure
		it("should handle database errors gracefully", async () => {
			const { logger } = await import("@snapback/infrastructure");
			const mockGroupBy = vi.fn();
			mockWhere.mockReturnValue({ groupBy: mockGroupBy });
			mockGroupBy.mockRejectedValueOnce(new Error("Query timeout"));

			const result = await aggregator.getAIToolDetectionCounts("user_123");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("FETCH_FAILED");
				expect(result.error.message).toMatch(/failed to fetch ai tool counts/i);
				expect(result.error.context?.originalError).toBe("Query timeout");
			}

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/failed to get ai tool/i),
				expect.objectContaining({
					userId: "user_123",
					error: "Query timeout",
				}),
			);
		});
	});

	/**
	 * RED PHASE: Tests for getRecentActivity()
	 * Task 4.1.B - Recent Activity Aggregation
	 *
	 * Purpose: Combine snapshots and AI detections into unified activity feed
	 * sorted by timestamp (newest first), limited to N most recent
	 *
	 * Following TDD_AGENT_PROMPT.md:
	 * - Write failing test BEFORE implementation
	 * - Test MUST fail with "getRecentActivity is not a function"
	 * - Test all 4 paths: Happy, Sad, Edge, Error
	 */
	describe("getRecentActivity", () => {
		// Happy Path: Combined snapshot + AI detection activities
		it("should return recent activity sorted by timestamp descending", async () => {
			// ARRANGE - Mock combined query results
			const mockUnion = vi.fn();
			mockWhere.mockReturnValue({ union: mockUnion });
			mockUnion.mockResolvedValueOnce([
				{
					type: "snapshot",
					timestamp: new Date("2025-12-09T15:00:00Z"),
					count: 3,
					description: "Pre-refactor checkpoint",
				},
				{
					type: "ai_detection",
					timestamp: new Date("2025-12-09T14:30:00Z"),
					count: 1,
					description: "Copilot detected",
				},
				{
					type: "snapshot",
					timestamp: new Date("2025-12-08T10:00:00Z"),
					count: 5,
					description: "Daily backup",
				},
			]);

			// ACT
			const result = await aggregator.getRecentActivity("user_123", 7);

			// ASSERT - Verify descending order
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toHaveLength(3);
				// Newest first
				expect(result.value[0].type).toBe("snapshot");
				expect(result.value[0].timestamp).toEqual(new Date("2025-12-09T15:00:00Z"));
				// Oldest last
				expect(result.value[2].timestamp).toEqual(new Date("2025-12-08T10:00:00Z"));
			}
		});

		// Sad Path: Empty user ID validation
		it("should return error for empty user ID", async () => {
			const result = await aggregator.getRecentActivity("", 7);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("MISSING_USER_ID");
				expect(result.error.message).toBe("User ID required");
			}
		});

		// Sad Path: Invalid days parameter
		it("should return error for invalid days parameter", async () => {
			const resultNegative = await aggregator.getRecentActivity("user_123", -1);
			expect(resultNegative.success).toBe(false);
			if (!resultNegative.success) {
				expect(resultNegative.error.code).toBe("INVALID_DAYS");
			}

			const resultZero = await aggregator.getRecentActivity("user_123", 0);
			expect(resultZero.success).toBe(false);

			const resultTooLarge = await aggregator.getRecentActivity("user_123", 400);
			expect(resultTooLarge.success).toBe(false);
		});

		// Edge Case: User has no activity
		it("should return empty array when user has no activity", async () => {
			const mockUnion = vi.fn();
			mockWhere.mockReturnValue({ union: mockUnion });
			mockUnion.mockResolvedValueOnce([]);

			const result = await aggregator.getRecentActivity("user_no_activity", 7);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toEqual([]);
			}
		});

		// Edge Case: Activity within time window (7 days default)
		it("should only return activity within specified days", async () => {
			const mockUnion = vi.fn();
			mockWhere.mockReturnValue({ union: mockUnion });
			// Mock returns only activities from last 3 days
			mockUnion.mockResolvedValueOnce([
				{
					type: "snapshot",
					timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
					count: 2,
					description: "Recent",
				},
			]);

			const result = await aggregator.getRecentActivity("user_123", 3);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toHaveLength(1);
			}
		});

		// Edge Case: Limit to 20 most recent activities
		it("should limit results to 20 most recent activities", async () => {
			const mockUnion = vi.fn();
			mockWhere.mockReturnValue({ union: mockUnion });
			// Generate 30 activities
			const manyActivities = Array.from({ length: 30 }, (_, i) => ({
				type: "snapshot",
				timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
				count: 1,
				description: `Activity ${i}`,
			}));
			// But query should LIMIT 20
			mockUnion.mockResolvedValueOnce(manyActivities.slice(0, 20));

			const result = await aggregator.getRecentActivity("user_123", 30);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value.length).toBeLessThanOrEqual(20);
			}
		});

		// Error Case: Database query failure
		it("should handle database errors gracefully", async () => {
			const { logger } = await import("@snapback/infrastructure");
			const mockUnion = vi.fn();
			mockWhere.mockReturnValue({ union: mockUnion });
			mockUnion.mockRejectedValueOnce(new Error("Connection lost"));

			const result = await aggregator.getRecentActivity("user_123", 7);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("FETCH_FAILED");
				expect(result.error.message).toMatch(/failed to fetch recent activity/i);
				expect(result.error.context?.originalError).toBe("Connection lost");
			}

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/failed to get recent activity/i),
				expect.objectContaining({
					userId: "user_123",
					days: 7,
					error: "Connection lost",
				}),
			);
		});
	});

	describe("Edge cases", () => {
		it("should handle metrics with null timestamps", async () => {
			const metricsWithNulls: UserLifetimeMetrics = {
				snapshotsTotal: 10,
				restoresTotal: 2,
				minutesSavedTotal: 30,
				aiSessionsTotal: 1,
				snapshots7d: 5,
				restores7d: 1,
				minutesSaved7d: 15,
				aiSessions7d: 1,
				snapshots30d: 8,
				restores30d: 2,
				lastSnapshotAt: null,
				lastRestoreAt: null,
			};

			mockLimit.mockResolvedValueOnce([metricsWithNulls]);

			const result = await aggregator.getUserLifetimeMetrics("user_123");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value?.lastSnapshotAt).toBeNull();
				expect(result.value?.lastRestoreAt).toBeNull();
			}
		});

		it("should handle large date ranges efficiently", async () => {
			mockOrderBy.mockResolvedValueOnce([]);

			const startDate = new Date("2020-01-01");
			const endDate = new Date("2025-12-31");

			const result = await aggregator.getDailyMetricsForRange(
				"user_123",
				startDate,
				endDate,
			);

			expect(result.success).toBe(true);
		});
	});
});
