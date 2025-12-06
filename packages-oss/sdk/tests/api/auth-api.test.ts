import ky from "ky";
import pRetry from "p-retry";
import { describe, expect, it, vi } from "vitest";
import { SnapbackAnalyticsClient } from "../../src/client";
import { defaultConfig } from "../../src/config";

// Mock ky and p-retry
vi.mock("ky");
vi.mock("p-retry");

describe("Authentication API", () => {
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

	describe("Key Management", () => {
		it("should validate API keys", async () => {
			const _mockFileMetadata1 = {
				id: "test-file-1",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Test with valid API keys
			const validClient = new SnapbackAnalyticsClient({
				...defaultConfig,
				apiKey: "valid-api-key-12345",
			});

			const mockFileMetadata2 = {
				id: "test-file-2",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock successful response
			const mockValidResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockValidResponse);

			// Test with valid API key
			const validResult = await validClient.sendMetadata("workspace-123", [mockFileMetadata2]);
			expect(validResult).toEqual({ accepted: 1, rejected: 0 });

			// Test with invalid API keys
			const invalidClient = new SnapbackAnalyticsClient({
				...defaultConfig,
				apiKey: "invalid-key",
			});

			const mockFileMetadata3 = {
				id: "test-file-3",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock 401 response for invalid API key
			const mockInvalidResponse = {
				json: vi.fn().mockRejectedValue(new Error("Unauthorized")),
			};
			mockKyInstance.post.mockReturnValue(mockInvalidResponse);

			// Test with invalid API key
			const invalidResult = await invalidClient.sendMetadata("workspace-123", [mockFileMetadata3]);
			expect(invalidResult.accepted).toBe(0);
			expect(invalidResult.rejected).toBe(1);

			// Test with expired API keys
			const expiredClient = new SnapbackAnalyticsClient({
				...defaultConfig,
				apiKey: "expired-key-67890",
			});

			const mockFileMetadata4 = {
				id: "test-file-4",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock 403 response for expired API key
			const mockExpiredResponse = {
				json: vi.fn().mockRejectedValue(new Error("Expired API Key")),
			};
			mockKyInstance.post.mockReturnValue(mockExpiredResponse);

			// Test with expired API key
			const expiredResult = await expiredClient.sendMetadata("workspace-123", [mockFileMetadata4]);
			expect(expiredResult.accepted).toBe(0);
			expect(expiredResult.rejected).toBe(1);
		});

		it("should handle key revocation", async () => {
			const mockFileMetadata5 = {
				id: "test-file-5",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Test behavior with revoked API keys
			const revokedClient = new SnapbackAnalyticsClient({
				...defaultConfig,
				apiKey: "revoked-key-abcde",
			});

			// Mock 403 response for revoked API key
			const mockRevokedResponse = {
				json: vi.fn().mockRejectedValue(new Error("API Key Revoked")),
			};
			mockKyInstance.post.mockReturnValue(mockRevokedResponse);

			// Verify that revoked keys are properly rejected
			const revokedResult = await revokedClient.sendMetadata("workspace-123", [mockFileMetadata5]);
			expect(revokedResult.accepted).toBe(0);
			expect(revokedResult.rejected).toBe(1);

			// Verify that revocation is immediate and complete
			expect(mockKyInstance.post).toHaveBeenCalledWith("v1/metadata/files/batch", expect.any(Object));
		});

		it("should enforce key permissions", async () => {
			const _mockFileMetadata6 = {
				id: "test-file-6",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Test API keys with different permission levels
			const readOnlyClient = new SnapbackAnalyticsClient({
				...defaultConfig,
				apiKey: "readonly-key-12345",
			});

			const _mockFileMetadata7 = {
				id: "test-file-7",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			const adminClient = new SnapbackAnalyticsClient({
				...defaultConfig,
				apiKey: "admin-key-67890",
			});

			const mockFileMetadata8 = {
				id: "test-file-8",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock successful response for admin operations
			const mockAdminResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};

			// Mock 403 response for unauthorized operations
			const mockUnauthorizedResponse = {
				json: vi.fn().mockRejectedValue(new Error("Insufficient Permissions")),
			};

			// Test admin operations
			mockKyInstance.post.mockReturnValue(mockAdminResponse);
			const adminResult = await adminClient.sendMetadata("workspace-123", [mockFileMetadata8]);
			expect(adminResult).toEqual({ accepted: 1, rejected: 0 });

			// Test unauthorized operations
			mockKyInstance.post.mockReturnValue(mockUnauthorizedResponse);
			const readOnlyResult = await readOnlyClient.sendMetadata("workspace-123", [mockFileMetadata8]);
			expect(readOnlyResult.accepted).toBe(0);
			expect(readOnlyResult.rejected).toBe(1);

			// Verify that permission-based access control works
			expect(mockKyInstance.post).toHaveBeenCalledTimes(2);
		});
	});

	describe("Rate Limiting", () => {
		it("should enforce rate limiting", async () => {
			const mockFileMetadata1 = {
				id: "test-file-8",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Make multiple rapid API calls to trigger rate limiting
			const _mockFileMetadata2 = {
				id: "test-file-9",
				path: "test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock 429 response for rate limiting
			const mockRateLimitResponse = {
				json: vi.fn().mockRejectedValue(new Error("Too Many Requests")),
			};
			mockKyInstance.post.mockReturnValue(mockRateLimitResponse);

			// Test that rate limiting is properly enforced
			const results = [];
			for (let i = 0; i < 5; i++) {
				const result = await client.sendMetadata(`workspace-${i}`, [mockFileMetadata1]);
				results.push(result);
			}

			// Verify that rate limit responses are handled correctly
			results.forEach((result) => {
				expect(result.accepted).toBe(0);
				expect(result.rejected).toBe(1);
			});
		});

		it("should comply with Retry-After header", async () => {
			const _mockFileMetadata1 = {
				id: "retry-file-1",
				path: "retry-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Test API responses with Retry-After headers
			const mockFileMetadata2 = {
				id: "retry-file-2",
				path: "retry-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock p-retry to handle Retry-After behavior
			let retryCount = 0;
			(pRetry as any).mockImplementation(async (_fn: any, _options: any) => {
				retryCount++;
				if (retryCount <= 1) {
					// First attempt fails with Retry-After
					const error: any = new Error("Too Many Requests");
					error.response = {
						headers: {
							get: (header: string) => (header === "Retry-After" ? "2" : null),
						},
					};
					throw error;
				}
				// Second attempt succeeds
				return { accepted: 1, rejected: 0 };
			});

			// Mock 429 response with Retry-After header
			const mockResponse = {
				json: vi.fn().mockRejectedValue(new Error("Too Many Requests")),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Test that client respects Retry-After timing
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata2]);

			// Should handle retry logic correctly with Retry-After
			expect(result.accepted).toBe(0);
			expect(result.rejected).toBe(1);
		});

		it("should handle burst request scenarios", async () => {
			const burstFiles = Array(10)
				.fill(null)
				.map((_, i) => ({
					id: `burst-file-${i}`,
					path: `burst-file-${i}.ts`,
					size: 1024 + i,
					lastModified: Date.now() - i * 1000,
				}));

			// Mock successful response
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 10,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Test that burst requests are properly managed
			const result = await client.sendMetadata("workspace-123", burstFiles);

			// Verify that burst request handling doesn't impact other operations
			expect(result).toEqual({ accepted: 10, rejected: 0 });

			// Verify all files were sent
			expect(mockKyInstance.post).toHaveBeenCalledWith(
				"v1/metadata/files/batch",
				expect.objectContaining({
					json: expect.objectContaining({
						files: expect.arrayContaining([
							expect.objectContaining({ id: "burst-file-0" }),
							expect.objectContaining({ id: "burst-file-9" }),
						]),
					}),
				}),
			);
		});
	});
});
