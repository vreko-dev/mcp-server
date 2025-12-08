import { describe, it, expect, vi, beforeEach } from "vitest";

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

        mockDb.select
            .mockReturnValueOnce(createQb(mockCheckpoints))
            .mockReturnValueOnce(createQb(mockRecoveries))
            .mockReturnValueOnce(createQb(mockFilesProtected))
            .mockReturnValueOnce(createQb(mockAiDetected));

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
                then: vi.fn((resolve) => resolve([{ count: 0 }])),
            };
        };

        mockDb.select.mockReturnValue(createEmptyQb());
        mockDb.selectDistinct.mockReturnValue(createEmptyQb()); // Also mock selectDistinct for consistency

        const result = await getMetricsHandler({ context: mockContext });

        expect(mockDb.select).toHaveBeenCalled();
        expect(result.total_checkpoints).toBe(0);
    });
});

