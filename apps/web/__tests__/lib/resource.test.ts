import { describe, expect, it } from "vitest";
import {
	isEmpty,
	isError,
	isLoading,
	isReady,
	matchResource,
	R,
} from "../../lib/resource";

describe("Resource", () => {
	describe("R.loading", () => {
		it("should create a loading resource", () => {
			const resource = R.loading();
			expect(resource.state).toBe("loading");
		});
	});

	describe("R.empty", () => {
		it("should create an empty resource", () => {
			const resource = R.empty();
			expect(resource.state).toBe("empty");
		});
	});

	describe("R.error", () => {
		it("should create an error resource with message", () => {
			const error = new Error("Test error");
			const resource = R.error(error);
			expect(resource.state).toBe("error");
			if (resource.state === "error") {
				expect(resource.error).toBe(error);
			}
		});
	});

	describe("R.ready", () => {
		it("should create a ready resource with data", () => {
			const data = { id: 1, name: "Test" };
			const resource = R.ready(data);
			expect(resource.state).toBe("ready");
			if (resource.state === "ready") {
				expect(resource.data).toBe(data);
			}
		});
	});

	describe("matchResource", () => {
		it("should match loading state", () => {
			const resource = R.loading();
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: () => "error matched",
				ready: () => "ready matched",
			});
			expect(result).toBe("loading matched");
		});

		it("should match empty state", () => {
			const resource = R.empty();
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: () => "error matched",
				ready: () => "ready matched",
			});
			expect(result).toBe("empty matched");
		});

		it("should match error state", () => {
			const error = new Error("Test error");
			const resource = R.error(error);
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: (e: Error) => `error matched: ${e.message}`,
				ready: () => "ready matched",
			});
			expect(result).toBe("error matched: Test error");
		});

		it("should match ready state", () => {
			const data = { id: 1, name: "Test" };
			const resource = R.ready(data);
			const result = matchResource(resource, {
				loading: () => "loading matched",
				empty: () => "empty matched",
				error: () => "error matched",
				ready: (d: { id: number; name: string }) => `ready matched: ${d.name}`,
			});
			expect(result).toBe("ready matched: Test");
		});
	});

	describe("Utility functions", () => {
		it("should correctly identify loading state", () => {
			const resource = R.loading();
			expect(isLoading(resource)).toBe(true);
			expect(isEmpty(resource)).toBe(false);
			expect(isError(resource)).toBe(false);
			expect(isReady(resource)).toBe(false);
		});

		it("should correctly identify empty state", () => {
			const resource = R.empty();
			expect(isLoading(resource)).toBe(false);
			expect(isEmpty(resource)).toBe(true);
			expect(isError(resource)).toBe(false);
			expect(isReady(resource)).toBe(false);
		});

		it("should correctly identify error state", () => {
			const error = new Error("Test error");
			const resource = R.error(error);
			expect(isLoading(resource)).toBe(false);
			expect(isEmpty(resource)).toBe(false);
			expect(isError(resource)).toBe(true);
			expect(isReady(resource)).toBe(false);
		});

		it("should correctly identify ready state", () => {
			const data = { id: 1, name: "Test" };
			const resource = R.ready(data);
			expect(isLoading(resource)).toBe(false);
			expect(isEmpty(resource)).toBe(false);
			expect(isError(resource)).toBe(false);
			expect(isReady(resource)).toBe(true);
		});
	});
});
