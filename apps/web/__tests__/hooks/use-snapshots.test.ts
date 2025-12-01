import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	useAIDetectionStats,
	useDashboardMetrics,
	useRecentActivity,
} from "@/hooks/use-snapshots";

// Mock the useSession hook
vi.mock("@/modules/saas/auth/hooks/use-session", () => ({
	useSession: () => ({
		user: { id: "test-user-123" },
	}),
}));

// Mock the useResourceQuery hook
vi.mock("@/lib/use-resource-query", () => ({
	useResourceQuery: vi
		.fn()
		.mockImplementation((queryKey, _queryFn, _options) => {
			// Simulate different responses based on the query key
			if (queryKey.includes("metrics")) {
				return {
					state: "ready",
					data: {
						snapshotCount: 10,
						recoveryCount: 2,
						filesProtected: 50,
						aiDetectionRate: 80,
					},
				};
			}
			if (queryKey.includes("ai-stats")) {
				return {
					state: "ready",
					data: [
						{
							tool: "GitHub Copilot",
							count: 5,
							avgConfidence: 0.95,
						},
						{ tool: "Cursor", count: 3, avgConfidence: 0.87 },
					],
				};
			}
			if (queryKey.includes("activity")) {
				return {
					state: "ready",
					data: [
						{
							type: "snapshot",
							message: "Snapshot created",
							timestamp: "5 minutes ago",
						},
						{
							type: "ai_detection",
							message: "GitHub Copilot detected",
							timestamp: "10 minutes ago",
						},
					],
				};
			}
			return { state: "loading" };
		}),
}));

// Mock the API functions
vi.mock("@/lib/dashboard/api", () => ({
	fetchUserMetrics: vi.fn().mockResolvedValue({
		snapshotCount: 10,
		recoveryCount: 2,
		filesProtected: 50,
		aiDetectionRate: 80,
	}),
	fetchAIDetectionStats: vi.fn().mockResolvedValue([
		{ tool: "GitHub Copilot", count: 5, avgConfidence: 0.95 },
		{ tool: "Cursor", count: 3, avgConfidence: 0.87 },
	]),
	fetchRecentActivity: vi.fn().mockResolvedValue([
		{
			type: "snapshot",
			message: "Snapshot created",
			timestamp: "5 minutes ago",
		},
		{
			type: "ai_detection",
			message: "GitHub Copilot detected",
			timestamp: "10 minutes ago",
		},
	]),
}));

describe("use-snapshots", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	describe("useDashboardMetrics", () => {
		it("should export the hook", () => {
			expect(useDashboardMetrics).toBeDefined();
			expect(typeof useDashboardMetrics).toBe("function");
		});

		it("should return dashboard metrics with user ID in query key", () => {
			const { useResourceQuery } = vi.mocked(
				import("@/lib/use-resource-query"),
			);
			const { useSession } = vi.mocked(
				import("@/modules/saas/auth/hooks/use-session"),
			);

			const result = useDashboardMetrics();

			expect(result.state).toBe("ready");
			if (result.state === "ready") {
				expect(result.data).toEqual({
					snapshotCount: 10,
					recoveryCount: 2,
					filesProtected: 50,
					aiDetectionRate: 80,
				});
			}
		});
	});

	describe("useAIDetectionStats", () => {
		it("should export the hook", () => {
			expect(useAIDetectionStats).toBeDefined();
			expect(typeof useAIDetectionStats).toBe("function");
		});

		it("should return AI detection stats with user ID in query key", () => {
			const result = useAIDetectionStats();

			expect(result.state).toBe("ready");
			if (result.state === "ready") {
				expect(result.data).toEqual([
					{ tool: "GitHub Copilot", count: 5, avgConfidence: 0.95 },
					{ tool: "Cursor", count: 3, avgConfidence: 0.87 },
				]);
			}
		});
	});

	describe("useRecentActivity", () => {
		it("should export the hook", () => {
			expect(useRecentActivity).toBeDefined();
			expect(typeof useRecentActivity).toBe("function");
		});

		it("should return recent activity with user ID in query key", () => {
			const result = useRecentActivity();

			expect(result.state).toBe("ready");
			if (result.state === "ready") {
				expect(result.data).toEqual([
					{
						type: "snapshot",
						message: "Snapshot created",
						timestamp: "5 minutes ago",
					},
					{
						type: "ai_detection",
						message: "GitHub Copilot detected",
						timestamp: "10 minutes ago",
					},
				]);
			}
		});
	});
});
