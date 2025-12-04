/**
 * RED TEST: Dashboard Metrics Real API Integration
 *
 * Validates that dashboard metrics are fetched from real API endpoints
 * instead of returning mock data.
 *
 * Reference: feedback.md - Dashboard shows real metrics for credibility
 * Status: RED (will fail until API integration is complete)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchDashboardMetrics, fetchActivityFeed, fetchAIDetectionStats } from "./metrics";

describe("Dashboard Metrics - Real API Integration (RED)", () => {
	beforeEach(() => {
		// Mock fetch for API calls
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("fetchDashboardMetrics", () => {
		it("should fetch metrics from /api/dashboard/metrics endpoint", async () => {
			/**
			 * RED: FAILING
			 * Current: Returns DEFAULT_METRICS (mock data)
			 * Expected: Calls GET /api/dashboard/metrics and returns real data
			 */
			const mockResponse = {
				snapshotCount: 42,
				recoveryCount: 8,
				filesProtected: 156,
				aiDetectionRate: 0.23,
			};

			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const metrics = await fetchDashboardMetrics();

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/dashboard/metrics"),
			);
			expect(metrics).toEqual(mockResponse);
		});

		it("should handle API errors gracefully", async () => {
			/**
			 * RED: FAILING
			 * Should return empty metrics on error instead of throwing
			 */
			vi.mocked(global.fetch).mockRejectedValueOnce(
				new Error("Network error"),
			);

			const metrics = await fetchDashboardMetrics();

			expect(metrics).toBeDefined();
			expect(metrics.snapshotCount).toBeGreaterThanOrEqual(0);
		});

		it("should include user auth context in API request", async () => {
			/**
			 * RED: FAILING
			 * API calls should be authenticated
			 */
			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					snapshotCount: 0,
					recoveryCount: 0,
					filesProtected: 0,
					aiDetectionRate: 0,
				}),
			} as Response);

			await fetchDashboardMetrics();

			const call = vi.mocked(global.fetch).mock.calls[0];
			const fetchOptions = call[1] as RequestInit;

			// Should have Authorization header or similar auth mechanism
			expect(fetchOptions?.headers).toBeDefined();
		});
	});

	describe("fetchActivityFeed", () => {
		it("should fetch activity from real API instead of returning empty", async () => {
			/**
			 * RED: FAILING
			 * Current: Returns empty array
			 * Expected: Calls GET /api/dashboard/activity endpoint
			 */
			const mockActivity = [
				{
					type: "snapshot" as const,
					message: "Snapshot created for file.ts",
					timestamp: new Date().toISOString(),
					metadata: { fileCount: 1 },
				},
			];

			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockActivity,
			} as Response);

			const activity = await fetchActivityFeed();

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/dashboard/activity"),
			);
			expect(activity).toEqual(mockActivity);
		});
	});

	describe("fetchAIDetectionStats", () => {
		it("should fetch AI stats from real API", async () => {
			/**
			 * RED: FAILING
			 * Current: Returns empty array
			 * Expected: Calls GET /api/dashboard/ai-stats endpoint
			 */
			const mockStats = [
				{
					tool: "GitHub Copilot",
					count: 12,
					avgConfidence: 0.85,
				},
			];

			vi.mocked(global.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockStats,
			} as Response);

			const stats = await fetchAIDetectionStats();

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/dashboard/ai-stats"),
			);
			expect(stats).toEqual(mockStats);
		});
	});
});
