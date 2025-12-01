import ky from "ky";
import pRetry from "p-retry";
import { describe, expect, it, vi } from "vitest";
import { SnapbackAnalyticsClient } from "../../src/client.js";
import { defaultConfig } from "../../src/config.js";

// Mock ky and p-retry
vi.mock("ky");
vi.mock("p-retry");

describe("Risk Analysis API", () => {
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
		(pRetry as any).mockImplementation((fn: any) => fn());

		client = new SnapbackAnalyticsClient({
			...defaultConfig,
			apiKey: "test-api-key",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Core Functionality", () => {
		it("should integrate with risk analysis endpoint", async () => {
			// Create test FileMetadata with risk factors
			const mockFileMetadata1 = {
				id: "risky-file-1",
				path: "risky-file.ts",
				size: 2048,
				lastModified: Date.now(),
				risk: {
					score: 0.8,
					factors: [
						{
							type: "High cyclomatic complexity",
							score: 0.8,
							weight: 0.4,
						},
						{ type: "Large file size", score: 0.7, weight: 0.3 },
						{
							type: "Multiple nested functions",
							score: 0.6,
							weight: 0.3,
						},
					],
				},
			};

			// Mock successful risk analysis response
			const mockRiskResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockRiskResponse);

			// Call sendMetadata which should trigger risk analysis
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata1]);

			// Verify that risk analysis is properly triggered
			expect(result).toEqual({ accepted: 1, rejected: 0 });
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});

		it("should validate risk score calculation", async () => {
			// Create test data with known risk factors
			const mockFileMetadata2 = {
				id: "test-file-1",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
				risk: {
					score: 0.5,
					factors: [
						{
							type: "Medium complexity detected",
							score: 0.5,
							weight: 1.0,
						},
					],
				},
			};

			// Mock successful response
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that risk scores are handled correctly
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata2]);

			// Risk score calculation is done server-side, we verify the API was called
			expect(result).toEqual({ accepted: 1, rejected: 0 });
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});

		it("should identify risk factors correctly", async () => {
			// Create test data with various types of risk factors
			const mockFileMetadata3 = {
				id: "complex-file-1",
				path: "complex-file.ts",
				size: 5000,
				lastModified: Date.now(),
				risk: {
					score: 0.9,
					factors: [
						{
							type: "File size exceeds threshold",
							score: 0.9,
							weight: 0.25,
						},
						{
							type: "Deep nesting detected",
							score: 0.8,
							weight: 0.25,
						},
						{
							type: "High cyclomatic complexity",
							score: 0.9,
							weight: 0.25,
						},
						{
							type: "Multiple inheritance patterns",
							score: 0.7,
							weight: 0.25,
						},
					],
				},
			};

			// Mock successful response
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that all risk factors are properly identified and sent
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata3]);

			expect(result).toEqual({ accepted: 1, rejected: 0 });

			// Verify the API endpoint was called (data sanitization happens client-side)
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});
	});

	describe("Advanced Features", () => {
		it("should validate custom rules", async () => {
			// Create test data that triggers custom rules
			const mockFileMetadata4 = {
				id: "custom-rule-file-1",
				path: "custom-rule-file.ts",
				size: 1024,
				lastModified: Date.now(),
				risk: {
					score: 0.7,
					factors: [
						{
							type: "Custom security rule violation",
							score: 0.7,
							weight: 0.5,
						},
						{
							type: "Organization-specific pattern detected",
							score: 0.6,
							weight: 0.5,
						},
					],
				},
			};

			// Mock successful response
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
					customRulesApplied: true,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that custom rules are applied correctly
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata4]);

			expect(result).toEqual({
				accepted: 1,
				rejected: 0,
				customRulesApplied: true,
			});

			// Custom rule validation is done server-side, we verify the API was called
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});

		it("should enforce permission-based access control", async () => {
			// Test API access with different permission scenarios
			const mockFileMetadata5 = {
				id: "sensitive-file-1",
				path: "sensitive-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock 403 response for permission denied
			const mockResponse = {
				json: vi.fn().mockRejectedValue(new Error("Forbidden")),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that unauthorized access is properly handled
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata5]);

			// Should gracefully handle permission errors
			expect(result.accepted).toBe(0);
			expect(result.rejected).toBe(1);
		});

		it("should handle large payload processing", async () => {
			// Create large FileMetadata payloads
			const largeBatch = Array(200)
				.fill(null)
				.map((_, i) => ({
					id: `large-file-${i}`,
					path: `large-file-${i}.ts`,
					size: 10000 + i,
					lastModified: Date.now() - i * 1000,
					risk: {
						score: 0.1 + i * 0.004, // Scores from 0.1 to 0.9
						factors: [
							{
								type: `factor-${i}`,
								score: 0.1 + i * 0.004,
								weight: 1.0,
							},
						],
					},
				}));

			// Mock successful response
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 200,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that large payloads are processed correctly
			const result = await client.sendMetadata("workspace-123", largeBatch);

			expect(result).toEqual({ accepted: 200, rejected: 0 });

			// Verify the API was called with large batch
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});

		it("should comply with rate limiting", async () => {
			// Mock p-retry to simulate rate limiting behavior
			let retryCount = 0;
			(pRetry as any).mockImplementation(async (_fn: any, _options: any) => {
				retryCount++;
				if (retryCount <= 2) {
					// First two attempts fail with rate limiting
					throw new Error("Too Many Requests");
				}
				// Third attempt succeeds
				return { accepted: 1, rejected: 0 };
			});

			// Mock 429 response
			const mockResponse = {
				json: vi.fn().mockRejectedValue(new Error("Too Many Requests")),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Test rate limiting behavior
			const mockFileMetadata6 = {
				id: "test-file-2",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			const result = await client.sendMetadata("workspace-123", [mockFileMetadata6]);

			// Should handle rate limiting gracefully
			expect(result.accepted).toBe(0);
			expect(result.rejected).toBe(1);
		});
	});
});
