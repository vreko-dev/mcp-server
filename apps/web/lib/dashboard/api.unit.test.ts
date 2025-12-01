import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	fetchAIDetectionStats,
	fetchRecentActivity,
	fetchSubscriptionData,
	fetchUserMetrics,
} from "./api";

// Mock the orpcClient
vi.mock("@shared/lib/orpc-client", () => ({
	orpcClient: {
		dashboard: {
			getUserMetrics: vi.fn(),
			getAIDetectionStats: vi.fn(),
			getRecentActivity: vi.fn(),
			getSubscriptionData: vi.fn(),
		},
	},
}));

describe("Dashboard API Functions", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore all mocks after each test
		vi.restoreAllMocks();
	});

	describe("fetchUserMetrics", () => {
		it("should return metrics when API call succeeds", async () => {
			const mockMetrics = {
				snapshotCount: 5,
				recoveryCount: 2,
				filesProtected: 10,
				aiDetectionRate: 0.8,
			};

			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getUserMetrics as vi.Mock).mockResolvedValue(
				mockMetrics,
			);

			const result = await fetchUserMetrics();

			expect(result).toEqual(mockMetrics);
			expect(orpcClient.dashboard.getUserMetrics).toHaveBeenCalledTimes(1);
		});

		it("should throw error when API call fails", async () => {
			const mockError = new Error("Network error");
			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getUserMetrics as vi.Mock).mockRejectedValue(
				mockError,
			);

			await expect(fetchUserMetrics()).rejects.toThrow("Network error");
		});
	});

	describe("fetchAIDetectionStats", () => {
		it("should return stats when API call succeeds", async () => {
			const mockStats = [
				{ date: "2023-01-01", detections: 5 },
				{ date: "2023-01-02", detections: 3 },
			];

			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getAIDetectionStats as vi.Mock).mockResolvedValue(
				mockStats,
			);

			const result = await fetchAIDetectionStats();

			expect(result).toEqual(mockStats);
			expect(orpcClient.dashboard.getAIDetectionStats).toHaveBeenCalledTimes(1);
		});

		it("should throw error when API call fails", async () => {
			const mockError = new Error("API error");
			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getAIDetectionStats as vi.Mock).mockRejectedValue(
				mockError,
			);

			await expect(fetchAIDetectionStats()).rejects.toThrow("API error");
		});
	});

	describe("fetchRecentActivity", () => {
		it("should return activity when API call succeeds", async () => {
			const mockActivity = [
				{
					type: "snapshot",
					message: "Created snapshot",
					timestamp: "2023-01-01",
				},
				{
					type: "recovery",
					message: "Restored file",
					timestamp: "2023-01-02",
				},
			];

			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getRecentActivity as vi.Mock).mockResolvedValue(
				mockActivity,
			);

			const result = await fetchRecentActivity();

			expect(result).toEqual(mockActivity);
			expect(orpcClient.dashboard.getRecentActivity).toHaveBeenCalledTimes(1);
		});

		it("should throw error when API call fails", async () => {
			const mockError = new Error("Service unavailable");
			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getRecentActivity as vi.Mock).mockRejectedValue(
				mockError,
			);

			await expect(fetchRecentActivity()).rejects.toThrow(
				"Service unavailable",
			);
		});
	});

	describe("fetchSubscriptionData", () => {
		it("should return subscription data when API call succeeds", async () => {
			const mockSubscription = {
				plan: "pro" as const,
				status: "active" as const,
				snapshotsUsed: 50,
				snapshotsLimit: 1000,
				percentUsed: 5,
				remaining: 950,
			};

			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getSubscriptionData as vi.Mock).mockResolvedValue(
				mockSubscription,
			);

			const result = await fetchSubscriptionData();

			expect(result).toEqual(mockSubscription);
			expect(orpcClient.dashboard.getSubscriptionData).toHaveBeenCalledTimes(1);
		});

		it("should throw error when API call fails", async () => {
			const mockError = new Error("Billing service error");
			const { orpcClient } = await import("@shared/lib/orpc-client");
			(orpcClient.dashboard.getSubscriptionData as vi.Mock).mockRejectedValue(
				mockError,
			);

			await expect(fetchSubscriptionData()).rejects.toThrow(
				"Billing service error",
			);
		});
	});
});
