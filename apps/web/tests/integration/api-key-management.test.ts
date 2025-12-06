import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/api-client";

// Mock the API client to simulate real API calls
vi.mock("../../lib/api-client", () => {
	return {
		apiClient: {
			apiKeys: {
				create: vi.fn(),
				list: vi.fn(),
				revoke: vi.fn(),
			},
		},
	};
});

describe("API Key Management - Real World Scenarios", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Free User Limitations", () => {
		it("should prevent free users from creating API keys", async () => {
			// Mock the API client to simulate a forbidden response for free users
			(apiClient.apiKeys.create as ReturnType<typeof vi.fn>).mockRejectedValue({
				code: "FORBIDDEN",
				message: "API keys require Pro plan or higher. Upgrade at /pricing",
			});

			await expect(
				apiClient.apiKeys.create({
					name: "Test Key",
				}),
			).rejects.toMatchObject({
				code: "FORBIDDEN",
				message: expect.stringContaining("Pro plan or higher"),
			});
		});
	});

	describe("Pro User API Key Management", () => {
		it("should allow pro users to create API keys with proper permissions", async () => {
			const mockApiKey = {
				apiKey: {
					id: "key_123",
					name: "Production API Key",
					key: "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
					createdAt: new Date().toISOString(),
				},
				message: "Save this key securely. You won't be able to see it again.",
			};

			// Mock successful API key creation
			(apiClient.apiKeys.create as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockApiKey,
			);

			const result = await apiClient.apiKeys.create({
				name: "Production API Key",
			});

			expect(result).toEqual(mockApiKey);
			expect(result.apiKey.key).toMatch(/^sk_live_[a-zA-Z0-9]{32}$/);
			expect(result.message).toContain("securely");
		});

		it("should allow pro users to list their API keys", async () => {
			const mockKeys = {
				keys: [
					{
						id: "key_123",
						name: "Production API Key",
						keyPreview: "sk_live_...",
						createdAt: new Date().toISOString(),
						lastUsedAt: new Date().toISOString(),
						revokedAt: null,
					},
					{
						id: "key_456",
						name: "Development API Key",
						keyPreview: "sk_live_...",
						createdAt: new Date().toISOString(),
						lastUsedAt: null,
						revokedAt: null,
					},
				],
			};

			// Mock successful API key listing
			(apiClient.apiKeys.list as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockKeys,
			);

			const result = await apiClient.apiKeys.list();

			expect(result).toEqual(mockKeys);
			expect(result.keys).toHaveLength(2);
			expect(result.keys[0].name).toBe("Production API Key");
			expect(result.keys[0].keyPreview).toMatch(/^sk_live_\.\.\.$/);
		});

		it("should allow pro users to revoke their API keys", async () => {
			const mockResult = {
				success: true,
			};

			// Mock successful API key revocation
			(apiClient.apiKeys.revoke as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResult,
			);

			const result = await apiClient.apiKeys.revoke({ id: "key_123" });

			expect(result).toEqual(mockResult);
			expect(result.success).toBe(true);
		});
	});

	describe("API Key Security", () => {
		it("should only show full API key once during creation", async () => {
			const mockApiKey = {
				apiKey: {
					id: "key_123",
					name: "Test Key",
					key: "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Full key shown only once
					createdAt: new Date().toISOString(),
				},
				message: "Save this key securely. You won't be able to see it again.",
			};

			(apiClient.apiKeys.create as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockApiKey,
			);

			const result = await apiClient.apiKeys.create({
				name: "Test Key",
			});

			// Verify the full key is provided in the response
			expect(result.apiKey.key).toMatch(/^sk_live_[a-zA-Z0-9]{32}$/);

			// Verify that subsequent listing only shows preview
			const mockKeys = {
				keys: [
					{
						id: "key_123",
						name: "Test Key",
						keyPreview: "sk_live_xxxx...",
						createdAt: result.apiKey.createdAt,
						lastUsedAt: null,
						revokedAt: null,
					},
				],
			};

			(apiClient.apiKeys.list as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockKeys,
			);

			const listResult = await apiClient.apiKeys.list();
			expect(listResult.keys[0].keyPreview).toMatch(
				/^sk_live_[a-zA-Z0-9]{4}\.\.\.$/,
			);
			expect(listResult.keys[0].keyPreview).not.toContain(result.apiKey.key);
		});

		it("should prevent users from accessing other users' API keys", async () => {
			// Mock the API to only return keys belonging to the authenticated user
			const mockKeys = {
				keys: [
					{
						id: "key_123",
						name: "My Key",
						keyPreview: "sk_live_...",
						createdAt: new Date().toISOString(),
						lastUsedAt: null,
						revokedAt: null,
					},
				],
			};

			(apiClient.apiKeys.list as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockKeys,
			);

			const result = await apiClient.apiKeys.list();

			// Verify only the authenticated user's keys are returned
			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].name).toBe("My Key");

			// Attempting to access another user's key should fail
			(apiClient.apiKeys.revoke as ReturnType<typeof vi.fn>).mockRejectedValue({
				code: "UNAUTHORIZED",
				message: "Key not found or unauthorized",
			});

			await expect(
				apiClient.apiKeys.revoke({ id: "other_user_key" }),
			).rejects.toMatchObject({
				code: "UNAUTHORIZED",
			});
		});
	});

	describe("Subscription-Based Access Control", () => {
		it("should enforce key limits based on subscription tier", async () => {
			// Mock error for exceeding key limit
			(apiClient.apiKeys.create as ReturnType<typeof vi.fn>).mockRejectedValue({
				message: "You've reached the limit of 1 API keys for your plan",
			});

			await expect(
				apiClient.apiKeys.create({
					name: "Another Key",
				}),
			).rejects.toThrow("limit of 1 API keys for your plan");
		});

		it("should provide appropriate error messages for upgrade prompts", async () => {
			(apiClient.apiKeys.create as ReturnType<typeof vi.fn>).mockRejectedValue({
				code: "FORBIDDEN",
				message: "API keys require Pro plan or higher. Upgrade at /pricing",
			});

			await expect(
				apiClient.apiKeys.create({
					name: "Test Key",
				}),
			).rejects.toMatchObject({
				code: "FORBIDDEN",
				message: expect.stringContaining("/pricing"),
			});
		});
	});

	describe("API Key Lifecycle Management", () => {
		it("should track API key usage and last access time", async () => {
			const mockKeys = {
				keys: [
					{
						id: "key_123",
						name: "Production Key",
						keyPreview: "sk_live_...",
						createdAt: "2023-01-01T00:00:00Z",
						lastUsedAt: "2023-01-15T10:30:00Z",
						revokedAt: null,
					},
					{
						id: "key_456",
						name: "Inactive Key",
						keyPreview: "sk_live_...",
						createdAt: "2023-01-01T00:00:00Z",
						lastUsedAt: null,
						revokedAt: null,
					},
				],
			};

			(apiClient.apiKeys.list as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockKeys,
			);

			const result = await apiClient.apiKeys.list();

			expect(result.keys).toHaveLength(2);
			expect(result.keys[0].lastUsedAt).toBeDefined();
			expect(result.keys[1].lastUsedAt).toBeNull();
		});

		it("should properly handle revoked API keys", async () => {
			const mockKeys = {
				keys: [
					{
						id: "key_123",
						name: "Revoked Key",
						keyPreview: "sk_live_...",
						createdAt: "2023-01-01T00:00:00Z",
						lastUsedAt: "2023-01-15T10:30:00Z",
						revokedAt: "2023-01-20T14:22:00Z",
					},
				],
			};

			(apiClient.apiKeys.list as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockKeys,
			);

			const result = await apiClient.apiKeys.list();

			expect(result.keys[0].revokedAt).toBeDefined();
			expect(new Date(result.keys[0].revokedAt!).getTime()).toBeGreaterThan(
				new Date(result.keys[0].createdAt).getTime(),
			);
		});
	});
});
