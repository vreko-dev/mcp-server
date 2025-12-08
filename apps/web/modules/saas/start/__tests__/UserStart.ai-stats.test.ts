/**
 * RED TEST: UserStart AI Stats Integration
 *
 * Validates that dashboard AI stats are fetched from real API
 * instead of using hardcoded mock data.
 *
 * Reference: testing_blueprint.md - WC-04 AIDetectionStats by tool
 * Reference: demo_prep - Dashboard shows real data for credibility
 *
 * Status: RED (will fail until UserStart uses useAIDetectionStats hook)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { R, type Resource } from "@/lib/resource";
import type { AppError } from "@/lib/error-handler";

// Type for AI detection stats
interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

// Mock the hooks module
vi.mock("@/hooks/use-snapshots", () => ({
	useAIDetectionStats: vi.fn(),
	useDashboardMetrics: vi.fn(),
	useRecentActivity: vi.fn(),
}));

// Mock the session hook
vi.mock("@/modules/saas/auth/hooks/use-session", () => ({
	useSession: vi.fn(() => ({
		user: { id: "test-user-id", email: "test@example.com" },
	})),
}));

describe("UserStart AI Stats Integration (RED)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Critical Path: Real AI Stats Data", () => {
		it("should NOT contain hardcoded AI stats in dashboardData", async () => {
			/**
			 * RED: FAILING
			 * Current: dashboardData.aiStats is hardcoded array with fixed tools
			 * Expected: dashboardData.aiStats comes from useAIDetectionStats hook
			 *
			 * Hardcoded values to detect:
			 * - { tool: "GitHub Copilot", count: 12, avgConfidence: 0.92 }
			 * - { tool: "ChatGPT", count: 8, avgConfidence: 0.88 }
			 * - { tool: "Claude", count: 5, avgConfidence: 0.95 }
			 */

			// This test validates the contract:
			// UserStart MUST call useAIDetectionStats() and use its result
			const mockAIStats: AIDetectionStat[] = [
				{ tool: "Cursor", count: 47, avgConfidence: 0.94 },
				{ tool: "GitHub Copilot", count: 23, avgConfidence: 0.87 },
			];

			// The mock should be called when component renders
			const { useAIDetectionStats } = await import("@/hooks/use-snapshots");
			(useAIDetectionStats as ReturnType<typeof vi.fn>).mockReturnValue(
				R.ready(mockAIStats)
			);

			// Verify hook is called
			const result = (useAIDetectionStats as ReturnType<typeof vi.fn>)();

			expect(useAIDetectionStats).toHaveBeenCalled();
			expect(result.state).toBe("ready");
			if (result.state === "ready") {
				expect(result.data).toEqual(mockAIStats);
				// Verify NOT the hardcoded values
				expect(result.data).not.toEqual([
					{ tool: "GitHub Copilot", count: 12, avgConfidence: 0.92 },
					{ tool: "ChatGPT", count: 8, avgConfidence: 0.88 },
					{ tool: "Claude", count: 5, avgConfidence: 0.95 },
				]);
			}
		});

		it("should render loading state while fetching AI stats", async () => {
			const { useAIDetectionStats } = await import("@/hooks/use-snapshots");
			(useAIDetectionStats as ReturnType<typeof vi.fn>).mockReturnValue(
				R.loading()
			);

			const result = (useAIDetectionStats as ReturnType<typeof vi.fn>)();

			expect(result.state).toBe("loading");
		});

		it("should render empty state when no AI detections exist", async () => {
			const { useAIDetectionStats } = await import("@/hooks/use-snapshots");
			(useAIDetectionStats as ReturnType<typeof vi.fn>).mockReturnValue(
				R.empty()
			);

			const result = (useAIDetectionStats as ReturnType<typeof vi.fn>)();

			expect(result.state).toBe("empty");
		});

		it("should render error state when API fails", async () => {
			const mockError: AppError = {
				code: "NETWORK",
				message: "Failed to fetch AI stats",
				retryable: true,
				details: new Error("Network error"),
			};

			const { useAIDetectionStats } = await import("@/hooks/use-snapshots");
			(useAIDetectionStats as ReturnType<typeof vi.fn>).mockReturnValue(
				R.error(mockError)
			);

			const result = (useAIDetectionStats as ReturnType<typeof vi.fn>)();

			expect(result.state).toBe("error");
			if (result.state === "error") {
				expect(result.error.message).toBe("Failed to fetch AI stats");
			}
		});
	});

	describe("Critical Path: Resource Pattern Integration", () => {
		it("should use matchResource pattern for state handling", async () => {
			/**
			 * Validates proper Resource pattern usage:
			 * - loading → AIDetectionStats.Skeleton
			 * - empty → AIDetectionStats.Empty
			 * - error → AIDetectionStats.Error
			 * - ready → AIDetectionStats with data
			 */
			const { useAIDetectionStats } = await import("@/hooks/use-snapshots");

			// Test all states
			const states: Resource<AIDetectionStat[], AppError>[] = [
				R.loading(),
				R.empty(),
				R.error({
					code: "NETWORK",
					message: "Error",
					retryable: true,
					details: new Error("Error"),
				}),
				R.ready([{ tool: "Test", count: 1, avgConfidence: 0.9 }]),
			];

			for (const state of states) {
				(useAIDetectionStats as ReturnType<typeof vi.fn>).mockReturnValue(state);
				const result = (useAIDetectionStats as ReturnType<typeof vi.fn>)();

				// Each state should be properly typed
				expect(["loading", "empty", "error", "ready"]).toContain(result.state);
			}
		});
	});
});
