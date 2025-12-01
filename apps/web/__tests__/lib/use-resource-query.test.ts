import { describe, expect, it, vi } from "vitest";
import type { AppError } from "@/lib/error-handler";

// Mock the error handler
vi.mock("@/lib/error-handler", async () => {
	const actual = await vi.importActual("@/lib/error-handler");
	return {
		...actual,
		toAppError: vi.fn().mockImplementation((error) => {
			if (
				error &&
				typeof error === "object" &&
				"message" in error &&
				error.message === "NETWORK_ERROR"
			) {
				return {
					code: "NETWORK",
					message: "Network error",
					retryable: true,
					statusCode: 0,
				} as AppError;
			}
			return {
				code: "INTERNAL",
				message: "Internal error",
				retryable: false,
				statusCode: 500,
			} as AppError;
		}),
		logError: vi.fn(),
	};
});

describe("useResourceQuery", () => {
	// Mock TanStack Query
	const mockUseQuery = vi.fn();
	const mockUseMutation = vi.fn();

	vi.mock("@tanstack/react-query", () => ({
		useQuery: mockUseQuery,
		useMutation: mockUseMutation,
	}));

	// Need to import after mocks are set up
	let useResourceQuery: typeof import("@/lib/use-resource-query").useResourceQuery;

	beforeEach(async () => {
		vi.resetModules();
		const module = await import("@/lib/use-resource-query");
		useResourceQuery = module.useResourceQuery;
	});

	it("should export the hook", () => {
		expect(useResourceQuery).toBeDefined();
		expect(typeof useResourceQuery).toBe("function");
	});

	it("returns loading state when query is pending", () => {
		mockUseQuery.mockReturnValue({
			isPending: true,
			isError: false,
			isSuccess: false,
		});

		const result = useResourceQuery(["test"], () => Promise.resolve({}));
		expect(result.state).toBe("loading");
	});

	it("returns error state when query has error", () => {
		const mockError: AppError = {
			code: "INTERNAL",
			message: "Test error",
			retryable: false,
			statusCode: 500,
		};

		mockUseQuery.mockReturnValue({
			isPending: false,
			isError: true,
			isSuccess: false,
			error: mockError,
		});

		const result = useResourceQuery(["test"], () => Promise.resolve({}));
		expect(result.state).toBe("error");
		if (result.state === "error") {
			expect(result.error).toEqual(mockError);
		}
	});

	it("returns ready state with data when query succeeds", () => {
		const mockData = { value: 42 };

		mockUseQuery.mockReturnValue({
			isPending: false,
			isError: false,
			isSuccess: true,
			data: mockData,
		});

		const result = useResourceQuery(["test"], () => Promise.resolve(mockData));
		expect(result.state).toBe("ready");
		if (result.state === "ready") {
			expect(result.data).toEqual(mockData);
		}
	});

	it("returns empty state for null data", () => {
		mockUseQuery.mockReturnValue({
			isPending: false,
			isError: false,
			isSuccess: true,
			data: null,
		});

		const result = useResourceQuery(["test"], () => Promise.resolve(null));
		expect(result.state).toBe("empty");
	});

	it("returns empty state for undefined data", () => {
		mockUseQuery.mockReturnValue({
			isPending: false,
			isError: false,
			isSuccess: true,
			data: undefined,
		});

		const result = useResourceQuery(["test"], () => Promise.resolve(undefined));
		expect(result.state).toBe("empty");
	});
});
