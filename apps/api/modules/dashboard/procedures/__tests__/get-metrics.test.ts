import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DashboardMetrics } from "@snapback/contracts";

// Set dummy DATABASE_URL to satisfy platform client init if mocks are bypassed
process.env.DATABASE_URL = "postgres://dummy:5432/dummy";

// Mock Sentry to prevent binary loading issues
vi.mock("@sentry/profiling-node", () => ({}));
vi.mock("@sentry/node", () => ({}));
vi.mock("@snapback/infrastructure", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn((msg, meta) => console.error("Logged Error:", msg, meta)),
    }
}));

// Mock platform into existence with required properties
vi.mock("@snapback/platform", () => ({
    db: {},
    snapshots: { trigger: 'trigger_field' },
    snapshotFiles: { filePath: 'file_path_field' },
    telemetryEvents: { eventType: 'event_type_field' },
    analysisEvents: {},
    featureUsage: { userId: 'user_id_field', featureName: 'feature_name_field', featureCategory: 'feature_category_field' },
}));



import { getMetricsHandler } from "../get-metrics";
import { getDb } from "@/src/services/database";

// Mock the database service
vi.mock("../../../../src/services/database", () => ({
	getDb: vi.fn(),
}));

describe("getMetrics", () => {
	const mockContext = {
		user: { id: "user-123" },
	};

	const mockDb = {
		select: vi.fn(),
		selectDistinct: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
		(getDb as any).mockReturnValue(mockDb);
	});

	it("should return aggregated metrics from database", async () => {
		// Mock query responses in order of execution
		// This assumes specific query order - which we will implement next
		// 1. Total checkpoints (snapshots)
		const mockCheckpoints = [{ count: 5 }];

		// 2. Total recoveries (telemetry events)
		const mockRecoveries = [{ count: 2 }];
		const mockFilesProtected = [{ count: 10 }];
		const mockAiDetected = [{ count: 3 }];

        // Helper to create a chainable query builder mock with specific result
        const createQb = (result: any) => {
            const qb: any = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                innerJoin: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve(result)), // vital: behave like a promise
            };
            return qb;
        };

        // Order of execution in Promise.all is determined by the array order in source code.
        // However, db.select() is called synchronously in order.
        // 1. snapshots (checkpoints)
        // 2. recoveries
        // 3. files protected
        // 4. ai detected
        // 5. static promise (ignored by mockDb)
        // 6. ai breakdown (Task 4.1.A - added)

        mockDb.select
            .mockReturnValueOnce(createQb(mockCheckpoints))
            .mockReturnValueOnce(createQb(mockRecoveries))
            .mockReturnValueOnce(createQb(mockFilesProtected))
            .mockReturnValueOnce(createQb(mockAiDetected))
            .mockReturnValueOnce(createQb([])); // ai breakdown - empty for this test

        mockDb.selectDistinct.mockReturnValue(createQb([])); // fallback

        const result = await getMetricsHandler({ context: mockContext });

		expect(result).toEqual({
			protection_status: "active",
			total_checkpoints: 5,
			total_recoveries: 2,
			files_protected: 10,
			ai_detection_rate: 60,
			recent_activity: expect.any(Array),
			ai_breakdown: expect.any(Object),
		});
	});

    it("should return zeros when no data exists", async () => {
        // Mock empty results for all queries
        const createEmptyQb = () => {
             return {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve([{ count: 0 }])),
            };
        };

        mockDb.select.mockReturnValue(createEmptyQb());
        mockDb.selectDistinct.mockReturnValue(createEmptyQb()); // Also mock selectDistinct for consistency

        // Need 6 queries now (including ai_breakdown)
        // Queries 1-4 return count:0, query 5-6 return empty arrays
        const createCountZeroQb = () => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve([{ count: 0 }])),
        });

        const createEmptyArrayQb = () => ({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve([])),
        });

        mockDb.select
            .mockReturnValueOnce(createCountZeroQb())  // checkpoints
            .mockReturnValueOnce(createCountZeroQb())  // recoveries
            .mockReturnValueOnce(createCountZeroQb())  // files protected
            .mockReturnValueOnce(createCountZeroQb())  // ai detected
            .mockReturnValueOnce(createEmptyArrayQb()); // ai breakdown - empty array, no featureName

        const result = await getMetricsHandler({ context: mockContext });

        expect(mockDb.select).toHaveBeenCalled();
        if ("error" in result) {
            throw new Error(`Expected success response, got error: ${result.message}`);
        }
        const metrics = result as DashboardMetrics;
        expect(metrics.total_checkpoints).toBe(0);
    });

    // 🔴 RED PHASE TEST: Task 4.1.A - AI Breakdown from featureUsage table
    describe("ai_breakdown (Task 4.1.A)", () => {
        it("should return real AI tool detection counts from featureUsage table", async () => {
            // ARRANGE: Mock database responses
            const mockCheckpoints = [{ count: 10 }];
            const mockRecoveries = [{ count: 2 }];
            const mockFilesProtected = [{ count: 5 }];
            const mockAiDetected = [{ count: 8 }];

            // Mock featureUsage query results (AI tool breakdown)
            const mockAiBreakdown = [
                { featureName: "copilot", count: 12 },
                { featureName: "cursor", count: 8 },
                { featureName: "claude", count: 5 },
                { featureName: "windsurf", count: 3 },
            ];

            const createQb = (result: any) => ({
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve(result)),
            });

            // Mock queries in order: checkpoints, recoveries, files, aiDetected, recentActivity, aiBreakdown
            mockDb.select
                .mockReturnValueOnce(createQb(mockCheckpoints))
                .mockReturnValueOnce(createQb(mockRecoveries))
                .mockReturnValueOnce(createQb(mockFilesProtected))
                .mockReturnValueOnce(createQb(mockAiDetected))
                .mockReturnValueOnce(createQb(mockAiBreakdown)); // NEW: AI breakdown query

            // ACT
            const result = await getMetricsHandler({ context: mockContext });

            // Type guard: Ensure success response
            if ("error" in result) {
                throw new Error(`Expected success response, got error: ${result.message}`);
            }
            const metrics = result as DashboardMetrics;

            // ASSERT - Specific values, no vague assertions
            expect(metrics).toHaveProperty("ai_breakdown");
            expect(metrics.ai_breakdown).toEqual({
                copilot: 12,  // Real data from featureUsage, NOT hardcoded 0
                cursor: 8,
                claude: 5,
                windsurf: 3,
            });

            // Verify ai_breakdown is NOT hardcoded zeros
            expect(metrics.ai_breakdown.copilot).not.toBe(0);
            expect(metrics.ai_breakdown.cursor).not.toBe(0);
        });

        it("should return zeros for AI tools with no usage data", async () => {
            // ARRANGE: User has no AI tool usage
            const mockCheckpoints = [{ count: 5 }];
            const mockRecoveries = [{ count: 1 }];
            const mockFilesProtected = [{ count: 3 }];
            const mockAiDetected = [{ count: 0 }];
            const mockAiBreakdown = []; // Empty result

            const createQb = (result: any) => ({
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve(result)),
            });

            mockDb.select
                .mockReturnValueOnce(createQb(mockCheckpoints))
                .mockReturnValueOnce(createQb(mockRecoveries))
                .mockReturnValueOnce(createQb(mockFilesProtected))
                .mockReturnValueOnce(createQb(mockAiDetected))
                .mockReturnValueOnce(createQb(mockAiBreakdown));

            // ACT
            const result = await getMetricsHandler({ context: mockContext });

            // Type guard
            if ("error" in result) {
                throw new Error(`Expected success response, got error: ${result.message}`);
            }
            const metrics = result as DashboardMetrics;

            // ASSERT - Should have structure but with zeros
            expect(metrics.ai_breakdown).toEqual({
                copilot: 0,
                cursor: 0,
                claude: 0,
                windsurf: 0,
            });
        });

        it("should handle partial AI tool usage (only some tools used)", async () => {
            // ARRANGE: User only used copilot and cursor
            const mockCheckpoints = [{ count: 5 }];
            const mockRecoveries = [{ count: 1 }];
            const mockFilesProtected = [{ count: 3 }];
            const mockAiDetected = [{ count: 15 }];
            const mockAiBreakdown = [
                { featureName: "copilot", count: 10 },
                { featureName: "cursor", count: 5 },
                // claude and windsurf not in results
            ];

            const createQb = (result: any) => ({
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve(result)),
            });

            mockDb.select
                .mockReturnValueOnce(createQb(mockCheckpoints))
                .mockReturnValueOnce(createQb(mockRecoveries))
                .mockReturnValueOnce(createQb(mockFilesProtected))
                .mockReturnValueOnce(createQb(mockAiDetected))
                .mockReturnValueOnce(createQb(mockAiBreakdown));

            // ACT
            const result = await getMetricsHandler({ context: mockContext });

            // Type guard
            if ("error" in result) {
                throw new Error(`Expected success response, got error: ${result.message}`);
            }
            const metrics = result as DashboardMetrics;

            // ASSERT - Should fill in missing tools with 0
            expect(metrics.ai_breakdown).toEqual({
                copilot: 10,
                cursor: 5,
                claude: 0,  // Not in DB results, should default to 0
                windsurf: 0,
            });
        });

        it("should handle case-insensitive tool name matching", async () => {
            // ARRANGE: featureUsage has mixed case tool names
            const mockCheckpoints = [{ count: 5 }];
            const mockRecoveries = [{ count: 1 }];
            const mockFilesProtected = [{ count: 3 }];
            const mockAiDetected = [{ count: 10 }];
            const mockAiBreakdown = [
                { featureName: "GitHub Copilot", count: 7 },  // Mixed case
                { featureName: "CURSOR", count: 3 },  // Uppercase
            ];

            const createQb = (result: any) => ({
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve(result)),
            });

            mockDb.select
                .mockReturnValueOnce(createQb(mockCheckpoints))
                .mockReturnValueOnce(createQb(mockRecoveries))
                .mockReturnValueOnce(createQb(mockFilesProtected))
                .mockReturnValueOnce(createQb(mockAiDetected))
                .mockReturnValueOnce(createQb(mockAiBreakdown));

            // ACT
            const result = await getMetricsHandler({ context: mockContext });

            // Type guard
            if ("error" in result) {
                throw new Error(`Expected success response, got error: ${result.message}`);
            }
            const metrics = result as DashboardMetrics;

            // ASSERT - Should normalize to lowercase keys
            expect(metrics.ai_breakdown.copilot).toBe(7);
            expect(metrics.ai_breakdown.cursor).toBe(3);
        });
    });
});

