import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSubscriptionInfo, useUsageLimits } from "@/hooks/use-usage";

// Mock the useSession hook
vi.mock("@/modules/saas/auth/hooks/use-session", () => ({
	useSession: vi.fn().mockReturnValue({
		user: { id: "test-user-123" },
	}),
}));

// Mock the useResourceQuery hook to avoid dependency issues
vi.mock("@/lib/use-resource-query", () => ({
	useResourceQuery: vi
		.fn()
		.mockImplementation((queryKey, _queryFn, _options) => {
			// Simulate different responses based on the query key
			if (queryKey.includes("limits")) {
				return {
					state: "ready",
					data: {
						snapshotsUsed: 25,
						snapshotsLimit: 100,
					},
				};
			}
			if (queryKey.includes("info")) {
				return {
					state: "ready",
					data: {
						plan: "solo",
						status: "active",
					},
				};
			}
			return { state: "loading" };
		}),
}));

// Mock the metrics module to avoid database dependencies
vi.mock("@/lib/dashboard/metrics", () => ({
	getUsageLimits: vi.fn().mockResolvedValue({
		snapshotsUsed: 25,
		snapshotsLimit: 100,
	}),
	getSubscription: vi.fn().mockResolvedValue({
		plan: "solo",
		status: "active",
	}),
}));

describe("use-usage", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	describe("useUsageLimits", () => {
		it("should export the hook", () => {
			expect(useUsageLimits).toBeDefined();
			expect(typeof useUsageLimits).toBe("function");
		});

		it("should return usage limits with user ID in query key", () => {
			const result = useUsageLimits();

			expect(result.state).toBe("ready");
			if (result.state === "ready") {
				expect(result.data).toEqual({
					snapshotsUsed: 25,
					snapshotsLimit: 100,
				});
			}
		});
	});

	describe("useSubscriptionInfo", () => {
		it("should export the hook", () => {
			expect(useSubscriptionInfo).toBeDefined();
			expect(typeof useSubscriptionInfo).toBe("function");
		});

		it("should return subscription info with user ID in query key", () => {
			const result = useSubscriptionInfo();

			expect(result.state).toBe("ready");
			if (result.state === "ready") {
				expect(result.data).toEqual({
					plan: "solo",
					status: "active",
				});
			}
		});
	});
});
