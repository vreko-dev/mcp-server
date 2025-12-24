import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnapBackAPIClient } from "../../src/client/snapback-api";

// Mock the ky module
vi.mock("ky", async () => {
	const actual = await vi.importActual("ky");

	// Create mock functions
	const mockPost = vi.fn();
	const mockGet = vi.fn();

	// Create a mock ky instance
	const mockKyInstance = {
		post: mockPost,
		get: mockGet,
	};

	// Mock the ky.create function to return our mock instance
	const mockKy = {
		...actual,
		create: vi.fn(() => mockKyInstance),
		post: mockPost,
		get: mockGet,
	};

	return {
		default: mockKy,
		HTTPError: class HTTPError {
			response: any;
			constructor(response: any) {
				this.response = response;
			}
		},
	};
});

describe("SnapBackAPIClient", () => {
	let client: SnapBackAPIClient;
	let mockPost: any;
	let mockGet: any;

	beforeEach(async () => {
		// Clear all mocks
		vi.clearAllMocks();

		// Get the mocked functions
		const kyModule = await import("ky");
		mockPost = kyModule.default.post;
		mockGet = kyModule.default.get;

		client = new SnapBackAPIClient({
			baseUrl: "https://api.snapback.dev",
			apiKey: "test-api-key",
		});
	});

	describe("analyzeFast", () => {
		it("should call the risk/analyze endpoint with correct parameters", async () => {
			const mockResponse = {
				riskLevel: "medium",
				score: 0.75,
				factors: ["large insertion", "complex logic"],
				analysisTimeMs: 45,
				issues: [
					{
						severity: "medium",
						message: "Complex conditional logic detected",
					},
				],
			};

			const mockKyResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue(mockResponse),
				status: 200,
				statusText: "OK",
			};

			mockPost.mockResolvedValue(mockKyResponse);

			const result = await client.analyzeFast({
				code: "function test() { return 'test'; }",
				filePath: "test.js",
				context: {
					projectType: "node",
					language: "javascript",
				},
			});

			expect(result).toEqual(mockResponse);
			// Updated to new endpoint: /api/risk/analyze (ORPC: riskRouter.analyze)
			expect(mockPost).toHaveBeenCalledWith("api/risk/analyze", {
				method: "POST",
				body: JSON.stringify({
					code: "function test() { return 'test'; }",
					filePath: "test.js",
					context: {
						projectType: "node",
						language: "javascript",
					},
				}),
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-api-key",
				},
			});
		});

		it("should throw an error when the API returns an error", async () => {
			// Create a mock HTTPError
			const kyModule = await import("ky");
			const HTTPError = kyModule.HTTPError;
			const mockHTTPError = new HTTPError({
				status: 500,
				statusText: "Internal Server Error",
			});

			mockPost.mockRejectedValue(mockHTTPError);

			await expect(
				client.analyzeFast({
					code: "function test() { return 'test'; }",
					filePath: "test.js",
				}),
			).rejects.toThrow("API error: 500 Internal Server Error");
		});
	});

	describe("getIterationStats", () => {
		it("should return local defaults (backend endpoint not implemented)", async () => {
			// getIterationStats now returns local defaults instead of calling the API
			// Backend endpoint /api/session/iteration-stats is not implemented
			const result = await client.getIterationStats("test.js");

			// Verify it returns sensible defaults
			expect(result).toEqual({
				consecutiveAIEdits: 0,
				riskLevel: "low",
				velocity: 0,
				recommendation: "safe_to_continue",
			});

			// Verify NO API call was made (computed locally)
			expect(mockGet).not.toHaveBeenCalled();
		});
	});

	describe("createSnapshot", () => {
		it("should call the snapshots/create endpoint with correct parameters", async () => {
			const mockResponse = {
				id: "snap-123",
				timestamp: 1234567890,
				meta: {
					reason: "Manual snapshot via MCP",
				},
			};

			const mockKyResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue(mockResponse),
				status: 200,
				statusText: "OK",
			};

			mockPost.mockResolvedValue(mockKyResponse);

			const result = await client.createSnapshot({
				filePath: "test.js",
				reason: "Manual snapshot via MCP",
				source: "mcp",
			});

			expect(result).toEqual(mockResponse);
			expect(mockPost).toHaveBeenCalledWith("api/snapshots/create", {
				method: "POST",
				body: JSON.stringify({
					filePath: "test.js",
					reason: "Manual snapshot via MCP",
					source: "mcp",
				}),
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-api-key",
				},
			});
		});
	});

	describe("getCurrentSession", () => {
		it("should call the session/current endpoint", async () => {
			const mockResponse = {
				consecutiveAIEdits: 2,
				lastEditTimestamp: 1234567890,
				filePath: "test.js",
				riskLevel: "low",
			};

			const mockKyResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue(mockResponse),
				status: 200,
				statusText: "OK",
			};

			mockGet.mockResolvedValue(mockKyResponse);

			const result = await client.getCurrentSession();

			expect(result).toEqual(mockResponse);
			expect(mockGet).toHaveBeenCalledWith("api/session/current");
		});
	});

	describe("getSafetyGuidelines", () => {
		it("should call the guidelines/safety endpoint and return text", async () => {
			const mockResponseText = "Safety guidelines content";

			// For text responses, we need to mock the text() method
			const mockKyResponse = {
				ok: true,
				text: vi.fn().mockResolvedValue(mockResponseText),
				status: 200,
				statusText: "OK",
			};

			mockGet.mockResolvedValue(mockKyResponse);

			const result = await client.getSafetyGuidelines();

			expect(result).toEqual(mockResponseText);
			expect(mockGet).toHaveBeenCalledWith("api/guidelines/safety");
		});
	});
});
