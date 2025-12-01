import { describe, expect, it } from "vitest";
import type { AppError } from "../lib/error-handler.js";
import { getErrorMessage, toAppError } from "../lib/error-handler.js";
import {
	isEmpty,
	isError,
	isLoading,
	isReady,
	matchResource,
	R,
} from "../lib/resource";

describe("Final Verification - Resource Pattern Implementation", () => {
	it("should demonstrate complete resource pattern flow", () => {
		// 1. Create a resource in loading state
		let resource = R.loading<string>();
		expect(isLoading(resource)).toBe(true);

		// 2. Match loading state
		const loadingResult = matchResource(resource, {
			loading: () => "Loading data...",
			empty: () => "No data available",
			error: (e) => `Error: ${e.message}`,
			ready: (data) => `Data: ${data}`,
		});
		expect(loadingResult).toBe("Loading data...");

		// 3. Simulate data fetch success - transition to ready state
		resource = R.ready("Hello World");
		expect(isReady(resource)).toBe(true);

		// 4. Match ready state
		const readyResult = matchResource(resource, {
			loading: () => "Loading data...",
			empty: () => "No data available",
			error: (e) => `Error: ${e.message}`,
			ready: (data) => `Data: ${data}`,
		});
		expect(readyResult).toBe("Data: Hello World");

		// 5. Simulate error - transition to error state with AppError
		const networkError: AppError = {
			code: "NETWORK",
			message: "Failed to connect to server",
			retryable: true,
			details: null,
		};
		resource = R.error<string, AppError>(networkError);
		expect(isError(resource)).toBe(true);

		// 6. Match error state
		const errorResult = matchResource(resource, {
			loading: () => "Loading data...",
			empty: () => "No data available",
			error: (e) => `Error: ${getErrorMessage(e)}`,
			ready: (data) => `Data: ${data}`,
		});
		expect(errorResult).toBe(
			"Error: Network error. Please check your connection and try again.",
		);
	});

	it("should handle all resource states correctly", () => {
		// Test loading state
		const loadingResource = R.loading<string>();
		expect(loadingResource.state).toBe("loading");
		expect(isLoading(loadingResource)).toBe(true);
		expect(isReady(loadingResource)).toBe(false);
		expect(isError(loadingResource)).toBe(false);
		expect(isEmpty(loadingResource)).toBe(false);

		// Test empty state
		const emptyResource = R.empty<string>();
		expect(emptyResource.state).toBe("empty");
		expect(isLoading(emptyResource)).toBe(false);
		expect(isReady(emptyResource)).toBe(false);
		expect(isError(emptyResource)).toBe(false);
		expect(isEmpty(emptyResource)).toBe(true);

		// Test error state
		const errorResource = R.error<string, AppError>({
			code: "INTERNAL",
			message: "Something went wrong",
			retryable: false,
			details: null,
		});
		expect(errorResource.state).toBe("error");
		expect(isLoading(errorResource)).toBe(false);
		expect(isReady(errorResource)).toBe(false);
		expect(isError(errorResource)).toBe(true);
		expect(isEmpty(errorResource)).toBe(false);

		// Test ready state
		const readyResource = R.ready("test data");
		expect(readyResource.state).toBe("ready");
		expect(isLoading(readyResource)).toBe(false);
		expect(isReady(readyResource)).toBe(true);
		expect(isError(readyResource)).toBe(false);
		expect(isEmpty(readyResource)).toBe(false);
	});

	it("should convert various errors to AppError", () => {
		// Network error
		const networkError = new TypeError("Failed to fetch");
		const appNetworkError = toAppError(networkError);
		expect(appNetworkError.code).toBe("NETWORK");
		expect(appNetworkError.retryable).toBe(true);

		// Unauthorized error
		const authError = new Error("unauthorized");
		const appAuthError = toAppError(authError);
		expect(appAuthError.code).toBe("UNAUTHORIZED");
		expect(appAuthError.statusCode).toBe(401);

		// Timeout error
		const timeoutError = new Error("timeout");
		const appTimeoutError = toAppError(timeoutError);
		expect(appTimeoutError.code).toBe("TIMEOUT");
		expect(appTimeoutError.retryable).toBe(true);
	});
});
