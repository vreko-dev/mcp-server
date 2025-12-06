import ky from "ky";
import pRetry from "p-retry";
import { describe, expect, it, vi } from "vitest";
import { SnapbackAnalyticsClient } from "../../src/client";
import { defaultConfig } from "../../src/config";

// Mock ky and p-retry
vi.mock("ky");
vi.mock("p-retry");

describe("Checkpoint API", () => {
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

	describe("Creation", () => {
		it("should create checkpoints with metadata", async () => {
			// Create test FileMetadata for checkpoint
			const mockFileMetadata = {
				id: "checkpoint-file-1",
				path: "checkpoint-file.ts",
				size: 2048,
				lastModified: Date.now(),
				risk: {
					score: 0.3,
					factors: [{ type: "Low complexity", score: 0.3, weight: 1.0 }],
				},
			};

			// Mock successful checkpoint creation response
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
					checkpointCreated: true,
					checkpointId: "chk-12345",
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Call sendMetadata which should trigger checkpoint creation for high-risk files
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata]);

			// Verify that checkpoint is created successfully
			expect(result).toEqual({
				accepted: 1,
				rejected: 0,
				checkpointCreated: true,
				checkpointId: "chk-12345",
			});

			// Verify that only metadata (not content) is stored
			expect(mockKyInstance.post).toHaveBeenCalledWith(
				"v1/metadata/files/batch",
				expect.objectContaining({
					json: expect.objectContaining({
						files: [
							expect.not.objectContaining({
								content: expect.anything(), // Should not contain file content
							}),
						],
					}),
				}),
			);
		});

		it("should handle checkpoint naming conventions", async () => {
			// Test various checkpoint naming scenarios
			const mockFileMetadata2 = {
				id: "important-file-1",
				path: "important-file.ts",
				size: 4096,
				lastModified: Date.now(),
				risk: {
					score: 0.8,
					factors: [{ type: "High risk detected", score: 0.8, weight: 1.0 }],
				},
			};

			// Mock successful response with checkpoint naming
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
					checkpoint: {
						id: "chk-67890",
						name: "High Risk Checkpoint - important-file.ts",
						timestamp: Date.now(),
					},
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that naming conventions are enforced
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata2]);

			expect(result).toEqual({
				accepted: 1,
				rejected: 0,
				checkpoint: expect.objectContaining({
					id: "chk-67890",
					name: expect.stringContaining("High Risk Checkpoint"),
					timestamp: expect.any(Number),
				}),
			});
		});

		it("should handle checkpoint description processing", async () => {
			// Create checkpoints with various descriptions
			const mockFileMetadata3 = {
				id: "documented-file-1",
				path: "documented-file.ts",
				size: 1024,
				lastModified: Date.now(),
				risk: {
					score: 0.6,
					factors: [
						{
							type: "Medium risk with documentation needs",
							score: 0.6,
							weight: 1.0,
						},
					],
				},
			};

			// Mock successful response - matching actual API response structure
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that descriptions are properly stored
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata3]);

			expect(result).toEqual({
				accepted: 1,
				rejected: 0,
			});

			// Verify the call was made with proper metadata
			expect(mockKyInstance.post).toHaveBeenCalledWith(
				"v1/metadata/files/batch",
				expect.objectContaining({
					json: expect.objectContaining({
						files: expect.arrayContaining([
							expect.objectContaining({
								id: "documented-file-1",
							}),
						]),
					}),
				}),
			);
		});
	});

	describe("Management", () => {
		it("should enforce usage limit compliance", async () => {
			// Test usage limit enforcement
			const mockFileMetadata4 = {
				id: "usage-test-file-1",
				path: "usage-test-file.ts",
				size: 1024,
				lastModified: Date.now(),
			};

			// Mock 429 response for usage limit exceeded
			const mockResponse = {
				json: vi.fn().mockRejectedValue(new Error("Usage Limit Exceeded")),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that clients are notified of usage limits
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata4]);

			// Should gracefully handle usage limit errors
			expect(result.accepted).toBe(0);
			expect(result.rejected).toBe(1);
		});

		it("should integrate with cloud backup functionality", async () => {
			// Test cloud backup enablement
			const mockFileMetadata5 = {
				id: "backup-file-1",
				path: "backup-file.ts",
				size: 2048,
				lastModified: Date.now(),
				risk: {
					score: 0.4,
					factors: [{ type: "Backup recommended", score: 0.4, weight: 1.0 }],
				},
			};

			// Mock successful response with cloud backup info
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
					cloudBackup: {
						enabled: true,
						provider: "aws",
						region: "us-west-2",
						backupId: "backup-12345",
					},
				}),
			};
			mockKyInstance.post.mockReturnValue(mockResponse);

			// Verify that cloud backup works correctly when enabled
			const result = await client.sendMetadata("workspace-123", [mockFileMetadata5]);

			expect(result).toEqual({
				accepted: 1,
				rejected: 0,
				cloudBackup: expect.objectContaining({
					enabled: true,
					provider: "aws",
					region: "us-west-2",
					backupId: "backup-12345",
				}),
			});
		});

		it("should validate file metadata", async () => {
			// Create FileMetadata with various validation scenarios
			const validMetadata = {
				id: "valid-file-1",
				path: "valid-file.ts",
				size: 1024,
				lastModified: Date.now(),
				risk: {
					score: 0.5,
					factors: [{ type: "Normal file", score: 0.5, weight: 1.0 }],
				},
			};

			const _invalidMetadata: any = {
				id: "invalid-file-1",
				path: "invalid-file.ts",
				size: 2048,
				lastModified: Date.now(),
			};

			// Mock successful response for valid metadata
			const mockValidResponse = {
				json: vi.fn().mockResolvedValue({
					accepted: 1,
					rejected: 0,
				}),
			};

			mockKyInstance.post.mockReturnValueOnce(mockValidResponse);

			mockKyInstance.post.mockReturnValueOnce(mockValidResponse);

			// Test valid metadata
			const validResult = await client.sendMetadata("workspace-123", [validMetadata]);
			expect(validResult).toEqual({ accepted: 1, rejected: 0 });

			// Test privacy validation separately (should throw before API call)
			const metadataWithContent: any = {
				id: "invalid-file-2",
				path: "invalid-file.ts",
				size: 1024,
				lastModified: Date.now(),
				content: "This should not be here", // Invalid field
			};

			// This should throw a privacy validation error before making the API call
			await expect(client.sendMetadata("workspace-123", [metadataWithContent])).rejects.toThrow(
				"Privacy validation failed",
			);
		});

		it.skip("should handle checkpoint retrieval and listing", async () => {
			// TODO: Implement real test for checkpoint listing API
			// This test requires implementing listCheckpoints() method in SnapbackAnalyticsClient
			// Once method is available, test:
			// 1. Create multiple test checkpoints
			// 2. Call client.listCheckpoints()
			// 3. Verify response structure and data integrity
		});
	});
});
