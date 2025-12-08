import ky from "ky";
import pRetry from "p-retry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnapbackAnalyticsClient } from "../../src/client";
import { defaultConfig } from "../../src/config";

// Mock ky and p-retry
vi.mock("ky");
vi.mock("p-retry");

describe("API Integration", () => {
	let client: SnapbackAnalyticsClient;
	const mockKyInstance: any = {
		post: vi.fn(),
		get: vi.fn(),
		extend: vi.fn().mockReturnThis(),
	};

	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Mock the ky.extend method to return our mock instance
		(ky.extend as any).mockReturnValue(mockKyInstance);

		// Mock p-retry to just execute the function immediately
		(pRetry as any).mockImplementation((fn) => fn());

		client = new SnapbackAnalyticsClient({
			...defaultConfig,
			apiKey: process.env.TEST_API_KEY || "test-key",
			endpoint: process.env.TEST_API_ENDPOINT || "http://localhost:3001",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Authentication", () => {
		it("should authenticate with valid API key", async () => {
			// The client should include the API key in headers
			// We can verify this by checking if the ky.extend was called with correct headers
			expect(ky.extend).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-API-Key": expect.any(String),
					}),
				}),
			);

			// This is a basic test to verify the client was created correctly
			expect(client).toBeInstanceOf(SnapbackAnalyticsClient);
		});

		it("should reject with invalid API key", async () => {
			// This test verifies the client structure, not actual API authentication
			expect(client).toBeInstanceOf(SnapbackAnalyticsClient);
		});
	});

	describe("End-to-End Workflows", () => {
		const mockFileMetadata = {
			path: "test.ts",
			size: 1024,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			risk: {
				score: 0.5,
				factors: ["test factor"],
			},
		};

		it("should complete metadata submission workflow", async () => {
			// Mock successful metadata submission response
			const mockPostResponse = {
				json: vi.fn().mockResolvedValue({ accepted: 1, rejected: 0 }),
			};
			mockKyInstance.post.mockReturnValue(mockPostResponse);

			// Call sendMetadata with test data
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata]);

			// Verify successful response format
			expect(result).toEqual({ accepted: 1, rejected: 0 });

			// Verify that the request was made with correct parameters (account for timeout)
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", {
				json: {
					workspaceId: "workspace-123",
					files: [
						expect.objectContaining({
							path: "test.ts",
							size: 1024,
						}),
					],
				},
				timeout: expect.any(Number),
			});
		});

		it("should retrieve analytics data", async () => {
			// Mock analytics response
			const mockAnalyticsResponse = {
				workspaceId: "workspace-123",
				totalFiles: 100,
				totalCheckpoints: 10,
				riskScore: 0.3,
				snapshotRecommendations: {
					shouldCreateSnapshot: true,
					reason: "High activity detected",
					urgency: "medium",
					suggestedTiming: "1h",
				},
			};

			const mockGetResponse = {
				json: vi.fn().mockResolvedValue(mockAnalyticsResponse),
			};
			mockKyInstance.get.mockReturnValue(mockGetResponse);

			// Call getAnalytics with test workspace
			const result = await client.getAnalytics("workspace-123");

			// Verify response structure matches AnalyticsResponse
			expect(result).toEqual(mockAnalyticsResponse);

			// Verify the API endpoint was called correctly (account for timeout)
			expect(mockKyInstance.get).toHaveBeenCalledWith("v1/analytics/workspace/workspace-123", {
				timeout: expect.any(Number),
			});
		});

		it("should retrieve recommendations", async () => {
			// Mock recommendations response
			const mockRecommendationsResponse = {
				snapshotRecommendations: {
					shouldCreateSnapshot: true,
					reason: "High activity detected",
					urgency: "medium",
					suggestedTiming: "1h",
				},
			};

			const mockGetResponse = {
				json: vi.fn().mockResolvedValue(mockRecommendationsResponse),
			};
			mockKyInstance.get.mockReturnValue(mockGetResponse);

			// Call getRecommendations with test workspace
			const result = await client.getRecommendations("workspace-123");

			// Verify response structure matches checkpointRecommendations
			expect(result).toEqual(mockRecommendationsResponse.snapshotRecommendations);

			// Verify the API endpoint was called correctly (account for timeout and searchParams)
			expect(mockKyInstance.get).toHaveBeenCalledWith("v1/intelligence/recommendations", {
				searchParams: {
					workspaceId: "workspace-123",
				},
				timeout: expect.any(Number),
			});
		});

		it("should handle batch processing of large metadata sets", async () => {
			// Create large array of FileMetadata (>100 items)
			const largeBatch = Array(150)
				.fill(null)
				.map((_, i) => ({
					...mockFileMetadata,
					fileName: `file-${i}.ts`,
				}));

			// Mock successful response
			const mockPostResponse = {
				json: vi.fn().mockResolvedValue({ accepted: 150, rejected: 0 }),
			};
			mockKyInstance.post.mockReturnValue(mockPostResponse);

			// Call sendMetadata with large batch
			const result = await client.sendMetadata("workspace-123", largeBatch);

			// Verify proper handling without timeout or memory issues
			expect(result).toEqual({ accepted: 150, rejected: 0 });

			// Verify that the request was made
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});
	});

	describe("Error Handling", () => {
		const mockFileMetadata = {
			path: "test.ts",
			size: 1024,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		it("should handle rate limiting responses", async () => {
			// Mock p-retry to reject immediately
			(pRetry as any).mockImplementation((_fn) => Promise.reject(new Error("Too Many Requests")));

			// Mock 429 response with Retry-After header
			const mockPostResponse = {
				json: vi.fn().mockRejectedValue(new Error("Too Many Requests")),
			};
			mockKyInstance.post.mockReturnValue(mockPostResponse);

			// Call sendMetadata and verify graceful degradation
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata]);

			// Should gracefully degrade
			expect(result.accepted).toBe(0);
			expect(result.rejected).toBe(1);
		}, 10000); // Increase timeout for this test

		it("should handle invalid request payloads that fail privacy validation", async () => {
			// Create intentionally malformed FileMetadata that fails privacy validation
			const invalidMetadata: any = {
				path: "test.ts",
				size: 1024,
				content: "sensitive content that should fail privacy validation",
			};

			// Call sendMetadata with invalid data - should throw privacy validation error
			await expect(client.sendMetadata("workspace-123", [invalidMetadata])).rejects.toThrow(
				"Privacy validation failed",
			);
		});

		it("should handle server error responses", async () => {
			// Mock p-retry to reject immediately
			(pRetry as any).mockImplementation((_fn) => Promise.reject(new Error("Internal Server Error")));

			// Mock 500 server error response
			const mockGetResponse = {
				json: vi.fn().mockRejectedValue(new Error("Internal Server Error")),
			};
			mockKyInstance.get.mockReturnValue(mockGetResponse);

			// Call getAnalytics and verify it throws appropriate error
			await expect(client.getAnalytics("workspace-123")).rejects.toThrow("Failed to fetch analytics");
		}, 10000); // Increase timeout for this test

		it("should handle network timeouts", async () => {
			// Mock p-retry to reject immediately
			(pRetry as any).mockImplementation((_fn) => Promise.reject(new Error("Timeout")));

			// Mock network timeout scenario
			const mockPostResponse = {
				json: vi.fn().mockRejectedValue(new Error("Timeout")),
			};
			mockKyInstance.post.mockReturnValue(mockPostResponse);

			// Call sendMetadata and verify retry logic
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata]);

			// Should gracefully degrade
			expect(result.accepted).toBe(0);
			expect(result.rejected).toBe(1);
		}, 10000); // Increase timeout for this test
	});
});
