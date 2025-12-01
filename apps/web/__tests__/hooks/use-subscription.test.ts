import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	useCancelSubscription,
	useSubscriptionWithUsage,
	useUpgradeSubscription,
} from "@/hooks/use-subscription";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Create a wrapper component with QueryClientProvider
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	};
};

// Mock the API function
vi.mock("@/lib/dashboard/api", () => ({
	fetchSubscriptionData: vi.fn(),
}));

describe("use-subscription", () => {
	const mockSubscriptionData = {
		subscription: {
			plan: "solo",
			status: "active",
			currentPeriodEnd: "2024-12-31T23:59:59Z",
		},
		usage: {
			snapshotsUsed: 45,
			snapshotsLimit: 100,
			cloudStorageUsedMb: 150,
			cloudStorageLimitMb: 1000,
		},
	};

	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	describe("useSubscriptionWithUsage", () => {
		it("should fetch subscription data and return ready state", async () => {
			const { fetchSubscriptionData } = await import("@/lib/dashboard/api");
			(fetchSubscriptionData as any).mockResolvedValue(mockSubscriptionData);

			const { result } = renderHook(() => useSubscriptionWithUsage(), {
				wrapper: createWrapper(),
			});

			// Should start in loading state
			expect(result.current.state).toBe("loading");

			// Wait for data to load
			await waitFor(() => {
				expect(result.current.state).toBe("ready");
			});

			// Should have the correct data
			if (result.current.state === "ready") {
				expect(result.current.data).toEqual(mockSubscriptionData);
			}
		});

		it("should handle errors gracefully", async () => {
			const { fetchSubscriptionData } = await import("@/lib/dashboard/api");
			(fetchSubscriptionData as any).mockRejectedValue(new Error("API Error"));

			const { result } = renderHook(() => useSubscriptionWithUsage(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.state).toBe("error");
			});

			if (result.current.state === "error") {
				expect(result.current.error.message).toBe("API Error");
			}
		});
	});

	describe("useUpgradeSubscription", () => {
		it("should upgrade subscription successfully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					message: "Subscription upgraded",
				}),
			});

			const { result } = renderHook(() => useUpgradeSubscription(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate({ newTier: "team" });
			});

			// Wait for mutation to start and complete
			await waitFor(() => {
				// Either pending or success state
				expect(result.current.isPending || result.current.isSuccess).toBe(true);
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
		});

		it("should handle upgrade errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: { message: "Payment failed" } }),
			});

			const { result } = renderHook(() => useUpgradeSubscription(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate({ newTier: "team" });
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			// Should have an error
			if (result.current.error) {
				expect(result.current.error.message).toBe("Payment failed");
			}
		});
	});

	describe("useCancelSubscription", () => {
		it("should cancel subscription successfully", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					message: "Subscription canceled",
				}),
			});

			const { result } = renderHook(() => useCancelSubscription(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate();
			});

			// Wait for mutation to start and complete
			await waitFor(() => {
				// Either pending or success state
				expect(result.current.isPending || result.current.isSuccess).toBe(true);
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
		});

		it("should handle cancellation errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					error: { message: "Cannot cancel trial" },
				}),
			});

			const { result } = renderHook(() => useCancelSubscription(), {
				wrapper: createWrapper(),
			});

			// Trigger the mutation
			act(() => {
				result.current.mutate();
			});

			// Wait for mutation to complete
			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			// Should have an error
			if (result.current.error) {
				expect(result.current.error.message).toBe("Cannot cancel trial");
			}
		});
	});
});
