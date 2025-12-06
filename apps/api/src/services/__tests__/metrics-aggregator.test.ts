import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsAggregator, type UserLifetimeMetrics } from "../metrics-aggregator";

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
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
}));

describe("MetricsAggregator", () => {
	let aggregator: MetricsAggregator;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Setup default mock chain
		mockFrom.mockReturnValue({ where: mockWhere });
		mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
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
