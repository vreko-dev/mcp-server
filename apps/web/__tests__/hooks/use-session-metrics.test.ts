import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionMetrics } from "@/hooks/use-session-metrics";

// Mock the useSession hook
vi.mock("@/modules/saas/auth/hooks/use-session", () => ({
	useSession: vi.fn(() => ({
		user: { id: "test-user-123" },
	})),
}));

// Mock the useResourceQuery hook
vi.mock("@/lib/use-resource-query", () => ({
	useResourceQuery: vi
		.fn()
		.mockImplementation((queryKey, _queryFn, _options) => {
			// Simulate different responses based on the query key
			if (queryKey.includes("session-metrics")) {
				return {
					state: "ready",
					data: {
						sessionCount: 15,
						aiSessionCount: 8,
						totalBytesSaved: 102400,
						highSeveritySessionCount: 3,
					},
				};
			}
			return { state: "loading" };
		}),
}));

// Mock the API functions
vi.mock("@/lib/dashboard/api", () => ({
	fetchSessionMetrics: vi.fn().mockResolvedValue({
		sessionCount: 15,
		aiSessionCount: 8,
		totalBytesSaved: 102400,
		highSeveritySessionCount: 3,
	}),
}));

describe("use-session-metrics", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	describe("useSessionMetrics", () => {
		it("should export the hook", () => {
			expect(useSessionMetrics).toBeDefined();
			expect(typeof useSessionMetrics).toBe("function");
		});
	});
});
