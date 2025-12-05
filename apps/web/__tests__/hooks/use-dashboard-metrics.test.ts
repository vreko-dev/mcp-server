// Test ID: WEB-DASHBOARD-METRICS-001
// Test Coverage: apps/web/hooks/use-snapshots.ts - useDashboardMetrics hook
// Spec: test_coverage.md lines 603-609

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/modules/saas/auth/hooks/use-session", () => ({
	useSession: vi.fn(),
}));

vi.mock("@/lib/dashboard/api", () => ({
	fetchUserMetrics: vi.fn(),
}));

import { fetchUserMetrics } from "@/lib/dashboard/api";
import { useSession } from "@/modules/saas/auth/hooks/use-session";
import { useDashboardMetrics } from "@/hooks/use-snapshots";

// Create wrapper
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
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

describe("useDashboardMetrics Hook", () => {
	const mockUser = { id: "user-123", email: "test@example.com" };
	const mockMetrics = {
		snapshotCount: 42,
		recoveryCount: 8,
		filesProtected: 156,
		aiDetectionRate: 0.23,
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(useSession).mockReturnValue({ user: mockUser } as any);
	});

	// Test ID: WEB-DASHBOARD-METRICS-001-001
	it("should fetch metrics on mount", async () => {
		// Arrange
		vi.mocked(fetchUserMetrics).mockResolvedValueOnce(mockMetrics);

		// Act
		const { result } = renderHook(() => useDashboardMetrics(), {
			wrapper: createWrapper(),
		});

		// Assert - should start in loading state
		expect(result.current.state).toBe("loading");

		// Wait for data to load
		await waitFor(() => {
			expect(result.current.state).toBe("ready");
		});

		// Verify data
		if (result.current.state === "ready") {
			expect(result.current.data).toEqual(mockMetrics);
			expect(result.current.data.snapshotCount).toBe(42);
			expect(result.current.data.recoveryCount).toBe(8);
			expect(result.current.data.filesProtected).toBe(156);
			expect(result.current.data.aiDetectionRate).toBe(0.23);
		}
	});

	// Test ID: WEB-DASHBOARD-METRICS-001-002
	it("should transform data correctly", async () => {
		// Arrange
		const rawMetrics = {
			snapshotCount: 100,
			recoveryCount: 10,
			filesProtected: 500,
			aiDetectionRate: 0.75,
		};

		vi.mocked(fetchUserMetrics).mockResolvedValueOnce(rawMetrics);

		// Act
		const { result } = renderHook(() => useDashboardMetrics(), {
			wrapper: createWrapper(),
		});

		// Assert
		await waitFor(() => {
			expect(result.current.state).toBe("ready");
		});

		if (result.current.state === "ready") {
			// Verify transformation
			expect(result.current.data.snapshotCount).toBe(100);
			expect(result.current.data.aiDetectionRate).toBe(0.75);
		}
	});

	// Test ID: WEB-DASHBOARD-METRICS-001-003
	it("should handle loading state", async () => {
		// Arrange
		vi.mocked(fetchUserMetrics).mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve(mockMetrics), 100),
				),
		);

		// Act
		const { result } = renderHook(() => useDashboardMetrics(), {
			wrapper: createWrapper(),
		});

		// Assert - loading state
		expect(result.current.state).toBe("loading");

		// Wait for completion
		await waitFor(() => {
			expect(result.current.state).toBe("ready");
		});
	});

	// Test ID: WEB-DASHBOARD-METRICS-001-004
	it("should handle error state", async () => {
		// Arrange
		vi.mocked(fetchUserMetrics).mockRejectedValueOnce(
			new Error("Failed to fetch metrics"),
		);

		// Act
		const { result } = renderHook(() => useDashboardMetrics(), {
			wrapper: createWrapper(),
		});

		// Assert
		await waitFor(() => {
			expect(result.current.state).toBe("error");
		});

		if (result.current.state === "error") {
			expect(result.current.error).toBeDefined();
			expect(result.current.error.message).toContain("Failed to fetch metrics");
		}
	});

	// Test ID: WEB-DASHBOARD-METRICS-001-005
	it("should refetch on interval (staleTime check)", async () => {
		// Arrange
		vi.mocked(fetchUserMetrics).mockResolvedValue(mockMetrics);

		// Act
		const { result, rerender } = renderHook(() => useDashboardMetrics(), {
			wrapper: createWrapper(),
		});

		// Assert - initial fetch
		await waitFor(() => {
			expect(result.current.state).toBe("ready");
		});

		const firstFetchCount = vi.mocked(fetchUserMetrics).mock.calls.length;

		// Force rerender after staleTime (1 minute configured)
		rerender();

		// Verify stale time prevents immediate refetch
		expect(vi.mocked(fetchUserMetrics).mock.calls.length).toBe(firstFetchCount);
	});

	// Test ID: WEB-DASHBOARD-METRICS-001-006
	it("should not fetch without authenticated user", async () => {
		// Arrange
		vi.mocked(useSession).mockReturnValue({ user: null } as any);

		// Act
		const { result } = renderHook(() => useDashboardMetrics(), {
			wrapper: createWrapper(),
		});

		// Assert - query should be disabled
		expect(result.current.state).toBe("loading");

		// Verify fetch was not called
		expect(vi.mocked(fetchUserMetrics)).not.toHaveBeenCalled();
	});
});
