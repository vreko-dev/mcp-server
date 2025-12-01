import type { StorageBrokerAdapter } from "@snapback/sdk/storage/StorageBrokerAdapter.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Context7Service } from "../../../src/context7/Context7Service.js";

// Mock StorageBrokerAdapter
const mockStorage = {
	save: vi.fn(),
	get: vi.fn(),
	list: vi.fn(),
	delete: vi.fn(),
	close: vi.fn(),
	initialize: vi.fn(),
};

// Mock the internal API call methods
const mockCallResolveLibraryAPI = vi.fn();
const mockCallGetLibraryDocsAPI = vi.fn();

// Create a mock class that extends Context7Service to expose the private methods
class TestContext7Service extends Context7Service {
	// Override the private methods with mocks
	callResolveLibraryAPI = mockCallResolveLibraryAPI;
	callGetLibraryDocsAPI = mockCallGetLibraryDocsAPI;
}

describe("Context7Service", () => {
	let context7Service: TestContext7Service;

	beforeEach(() => {
		// Reset environment variables
		delete process.env.CONTEXT7_API_KEY;
		delete process.env.CONTEXT7_API_URL;
		delete process.env.CONTEXT7_CACHE_TTL_SEARCH;
		delete process.env.CONTEXT7_CACHE_TTL_DOCS;

		// Set a test API key to avoid the "API key required" error
		process.env.CONTEXT7_API_KEY = "test-key-12345";

		// Reset all mocks
		vi.clearAllMocks();

		// Create a new instance of Context7Service with mocked storage
		context7Service = new TestContext7Service(mockStorage as unknown as StorageBrokerAdapter);
	});

	afterEach(() => {
		// Clear all mocks
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("should initialize with default configuration", () => {
			expect(context7Service).toBeDefined();
		});

		it("should use environment variables for configuration", () => {
			process.env.CONTEXT7_API_KEY = "test-key";
			process.env.CONTEXT7_API_URL = "https://test.context7.com/api";
			process.env.CONTEXT7_CACHE_TTL_SEARCH = "7200";
			process.env.CONTEXT7_CACHE_TTL_DOCS = "172800";

			const service = new Context7Service(mockStorage as unknown as StorageBrokerAdapter);

			// Note: We can't directly access private properties, but we can test behavior
			// This test is more about ensuring the constructor doesn't throw
			expect(service).toBeDefined();
		});
	});

	describe("resolveLibraryId", () => {
		it("should validate input and reject empty library name", async () => {
			await expect(context7Service.resolveLibraryId("")).rejects.toThrow();
		});

		it("should return formatted results for valid library name", async () => {
			mockStorage.get.mockResolvedValue(null); // No cache hit

			// Mock the API call
			mockCallResolveLibraryAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Mocked API response",
					},
				],
			});

			const result = await context7Service.resolveLibraryId("react");

			expect(result).toBeDefined();
			expect(result.content).toBeDefined();
			expect(Array.isArray(result.content)).toBe(true);
			expect(result.content[0].type).toBe("text");
			expect(typeof result.content[0].text).toBe("string");
			expect(mockCallResolveLibraryAPI).toHaveBeenCalledWith("react");
		});

		it("should use cache when available", async () => {
			const cachedResult = {
				content: [
					{
						type: "text",
						text: "Cached result",
					},
				],
			};

			mockStorage.get.mockResolvedValue({
				id: "ctx7:resolve:react",
				timestamp: Date.now(),
				meta: {
					cacheExpiration: Date.now() + 3600000, // 1 hour from now
					cacheType: "resolve-library-id",
					createdAt: Date.now(),
				},
				files: [],
				fileContents: {
					data: JSON.stringify(cachedResult),
				},
			});

			const result = await context7Service.resolveLibraryId("react");

			expect(result).toEqual(cachedResult);
			expect(mockStorage.get).toHaveBeenCalledWith("ctx7:resolve:react");
		});

		it("should not use expired cache", async () => {
			mockStorage.get.mockResolvedValue({
				id: "ctx7:resolve:react",
				timestamp: Date.now(),
				meta: {
					cacheExpiration: Date.now() - 3600000, // 1 hour ago
					cacheType: "resolve-library-id",
					createdAt: Date.now() - 7200000,
				},
				files: [],
				fileContents: {
					data: JSON.stringify({ content: [{ type: "text", text: "Expired cache" }] }),
				},
			});

			mockStorage.delete.mockResolvedValue(undefined);

			// Mock the API call for when cache is expired
			mockCallResolveLibraryAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Fresh API response",
					},
				],
			});

			const result = await context7Service.resolveLibraryId("react");

			// Should return fresh result, not cached one
			expect(result.content[0].text).toContain("Fresh API response");
			expect(mockStorage.delete).toHaveBeenCalledWith("ctx7:resolve:react");
			expect(mockCallResolveLibraryAPI).toHaveBeenCalledWith("react");
		});
	});

	describe("getLibraryDocs", () => {
		it("should validate input and reject empty library ID", async () => {
			await expect(context7Service.getLibraryDocs("")).rejects.toThrow();
		});

		it("should return documentation for valid library ID", async () => {
			mockStorage.get.mockResolvedValue(null); // No cache hit

			// Mock the API call
			mockCallGetLibraryDocsAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Mocked documentation",
					},
				],
			});

			const result = await context7Service.getLibraryDocs("/vercel/next.js");

			expect(result).toBeDefined();
			expect(result.content).toBeDefined();
			expect(Array.isArray(result.content)).toBe(true);
			expect(result.content[0].type).toBe("text");
			expect(typeof result.content[0].text).toBe("string");
			expect(mockCallGetLibraryDocsAPI).toHaveBeenCalledWith("/vercel/next.js", undefined, undefined);
		});

		it("should handle optional parameters", async () => {
			mockStorage.get.mockResolvedValue(null); // No cache hit

			// Mock the API call
			mockCallGetLibraryDocsAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Mocked documentation with params",
					},
				],
			});

			const result = await context7Service.getLibraryDocs("/vercel/next.js", {
				topic: "routing",
				tokens: 5000,
			});

			expect(result).toBeDefined();
			expect(mockCallGetLibraryDocsAPI).toHaveBeenCalledWith("/vercel/next.js", "routing", 5000);
		});

		it("should use cache when available", async () => {
			const cachedResult = {
				content: [
					{
						type: "text",
						text: "Cached documentation",
					},
				],
			};

			mockStorage.get.mockResolvedValue({
				id: "ctx7:docs:/vercel/next.js:routing:tokens:5000",
				timestamp: Date.now(),
				meta: {
					cacheExpiration: Date.now() + 86400000, // 24 hours from now
					cacheType: "get-library-docs",
					createdAt: Date.now(),
				},
				files: [],
				fileContents: {
					data: JSON.stringify(cachedResult),
				},
			});

			const result = await context7Service.getLibraryDocs("/vercel/next.js", {
				topic: "routing",
				tokens: 5000,
			});

			expect(result).toEqual(cachedResult);
			expect(mockStorage.get).toHaveBeenCalledWith("ctx7:docs:%2Fvercel%2Fnext.js:routing:tokens:5000");
		});
	});

	describe("cache integration", () => {
		it("should save results to cache after API calls", async () => {
			mockStorage.get.mockResolvedValue(null); // No cache hit
			mockStorage.save.mockResolvedValue(undefined);

			// Mock the API call
			mockCallResolveLibraryAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Mocked API response",
					},
				],
			});

			await context7Service.resolveLibraryId("react");

			expect(mockStorage.save).toHaveBeenCalled();
			expect(mockCallResolveLibraryAPI).toHaveBeenCalledWith("react");
		});

		it("should handle cache save errors gracefully", async () => {
			mockStorage.get.mockResolvedValue(null); // No cache hit
			mockStorage.save.mockRejectedValue(new Error("Cache save failed"));

			// Mock the API call
			mockCallResolveLibraryAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Mocked API response",
					},
				],
			});

			// Should not throw even if cache save fails
			await expect(context7Service.resolveLibraryId("react")).resolves.toBeDefined();
			expect(mockCallResolveLibraryAPI).toHaveBeenCalledWith("react");
		});

		it("should handle cache retrieval errors gracefully", async () => {
			mockStorage.get.mockRejectedValue(new Error("Cache read failed"));

			// Mock the API call
			mockCallResolveLibraryAPI.mockResolvedValue({
				content: [
					{
						type: "text",
						text: "Mocked API response",
					},
				],
			});

			// Should not throw even if cache read fails
			await expect(context7Service.resolveLibraryId("react")).resolves.toBeDefined();
			expect(mockCallResolveLibraryAPI).toHaveBeenCalledWith("react");
		});
	});

	describe("error handling", () => {
		it("should handle network errors gracefully", async () => {
			// Mock the internal API call to throw an error
			mockCallResolveLibraryAPI.mockRejectedValue(new Error("Network error"));

			await expect(context7Service.resolveLibraryId("react")).rejects.toThrow("Network error");
		});

		it("should handle API errors gracefully", async () => {
			// Mock the internal API call to throw an error
			mockCallGetLibraryDocsAPI.mockRejectedValue(new Error("API error"));

			await expect(context7Service.getLibraryDocs("/vercel/next.js")).rejects.toThrow("API error");
		});

		it("should handle missing API key", async () => {
			// Create a service without an API key
			const service = new Context7Service(mockStorage as unknown as StorageBrokerAdapter);
			Object.defineProperty(service, "apiKey", { value: undefined });

			await expect(service.resolveLibraryId("react")).rejects.toThrow("CONTEXT7_API_KEY is required");
		});
	});
});
