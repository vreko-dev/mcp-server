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

describe("Resource Pattern Integration", () => {
	describe("Resource Constructors", () => {
		it("should create loading resource", () => {
			const resource = R.loading<string>();
			expect(resource.state).toBe("loading");
			expect(isLoading(resource)).toBe(true);
		});

		it("should create empty resource", () => {
			const resource = R.empty<string>();
			expect(resource.state).toBe("empty");
			expect(isEmpty(resource)).toBe(true);
		});

		it("should create error resource", () => {
			const error: AppError = {
				code: "INTERNAL",
				message: "Test error",
				retryable: false,
				details: null,
			};
			const resource = R.error<string, AppError>(error);
			expect(resource.state).toBe("error");
			expect(isError(resource)).toBe(true);
			if (isError(resource)) {
				expect(resource.error).toBe(error);
			}
		});

		it("should create ready resource", () => {
			const data = "test data";
			const resource = R.ready(data);
			expect(resource.state).toBe("ready");
			expect(isReady(resource)).toBe(true);
			if (isReady(resource)) {
				expect(resource.data).toBe(data);
			}
		});
	});

	describe("Pattern Matching", () => {
		it("should match loading state", () => {
			const resource = R.loading<string>();
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: () => "error matched",
				ready: () => "ready matched",
			});
			expect(result).toBe("loading matched");
		});

		it("should match empty state", () => {
			const resource = R.empty<string>();
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: () => "error matched",
				ready: () => "ready matched",
			});
			expect(result).toBe("empty matched");
		});

		it("should match error state with AppError", () => {
			const error: AppError = {
				code: "NETWORK",
				message: "Network error",
				retryable: true,
				details: null,
			};
			const resource = R.error<string, AppError>(error);
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: (e) => `error matched: ${e.message}`,
				ready: () => "ready matched",
			});
			expect(result).toBe("error matched: Network error");
		});

		it("should match ready state", () => {
			const data = { id: 1, name: "Test" };
			const resource = R.ready(data);
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: () => "error matched",
				ready: (d) => `ready matched: ${d.name}`,
			});
			expect(result).toBe("ready matched: Test");
		});
	});

	describe("Error Handler", () => {
		it("should convert network errors to AppError", () => {
			const error = new TypeError("Failed to fetch");
			const appError = toAppError(error);
			expect(appError.code).toBe("NETWORK");
			expect(appError.retryable).toBe(true);
		});

		it("should convert unauthorized errors to AppError", () => {
			const error = new Error("unauthorized");
			const appError = toAppError(error);
			expect(appError.code).toBe("UNAUTHORIZED");
			expect(appError.statusCode).toBe(401);
		});

		it("should get user-friendly error messages", () => {
			const error: AppError = {
				code: "RATE_LIMITED",
				message: "Too many requests",
				retryable: true,
				details: null,
			};
			const message = getErrorMessage(error);
			expect(message).toContain("Too many requests");
		});
	});
});
