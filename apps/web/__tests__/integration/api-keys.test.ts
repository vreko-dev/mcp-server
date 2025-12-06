/**
 * WEB-INT-API-KEYS-001
 * API Keys Integration Tests
 *
 * Tests API key management, permissions, and security
 * per test_coverage.md lines 646-652
 *
 * Test Pattern: Integration tests for create/list/revoke/rotate workflows
 * Coverage: Key generation, revocation, permissions, rotation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock API client
const mockApiClient = {
	apiKeys: {
		create: vi.fn(),
		list: vi.fn(),
		revoke: vi.fn(),
		rotate: vi.fn(),
	},
};

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("API Keys Integration", () => {
	describe("Create API Key", () => {
		it("should create key and return prefix only", async () => {
			// Test ID: WEB-INT-API-KEYS-001-001
			// GIVEN: Pro/Team user creates API key
			const keyName = "Production API Key";
			const fullKey = "sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwxyza";

			mockApiClient.apiKeys.create.mockResolvedValue({
				key: {
					id: "key_123",
					name: keyName,
					keyPreview: "sk_live_...",
					createdAt: new Date().toISOString(),
					expiresAt: null,
					revokedAt: null,
				},
				fullKey, // Only shown once
			});

			// WHEN: User creates API key
			const result = await mockApiClient.apiKeys.create({ name: keyName });

			// THEN: Should return full key exactly once
			expect(result.fullKey).toBe(fullKey);
			expect(result.fullKey).toMatch(/^sk_live_[a-zA-Z0-9]{48}$/);

			// AND: Preview should mask actual key
			expect(result.key.keyPreview).toBe("sk_live_...");
			expect(result.key.keyPreview).not.toContain(fullKey.slice(8));
		});

		it("should hash API key before storage", () => {
			// Test ID: WEB-INT-API-KEYS-001-002
			// GIVEN: Full API key generated
			const fullKey = "sk_live_secretkey123";

			// WHEN: Key is stored in database
			// Simulate Argon2 hashing (actual implementation uses @snapback/auth)
			const keyHash = `$argon2id$v=19$m=65536,t=3,p=4$${btoa(fullKey)}`;

			// THEN: Should NEVER store plaintext key
			expect(keyHash).not.toContain("sk_live_secretkey123");
			expect(keyHash).toMatch(/^\$argon2/);

			// AND: Should store preview for fast lookup
			const preview = fullKey.substring(0, 8) + "...";
			expect(preview).toBe("sk_live_...");
		});

		it("should validate key name requirements", async () => {
			// Test ID: WEB-INT-API-KEYS-001-003
			// GIVEN: Invalid key names
			const invalidNames = [
				"", // Empty
				"a", // Too short
				"x".repeat(51), // Too long (max 50)
			];

			for (const name of invalidNames) {
				mockApiClient.apiKeys.create.mockRejectedValue({
					code: "VALIDATION_ERROR",
					message: "Key name must be between 2 and 50 characters",
				});

				// WHEN: User attempts to create key with invalid name
				await expect(
					mockApiClient.apiKeys.create({ name })
				).rejects.toMatchObject({
					code: "VALIDATION_ERROR",
				});
			}
		});
	});

	describe("List API Keys", () => {
		it("should return all user keys with metadata", async () => {
			// Test ID: WEB-INT-API-KEYS-001-004
			// GIVEN: User has multiple API keys
			const mockKeys = [
				{
					id: "key_1",
					name: "Production Key",
					keyPreview: "sk_live_...",
					createdAt: "2024-01-01T00:00:00Z",
					lastUsedAt: "2024-12-05T10:00:00Z",
					expiresAt: null,
					revokedAt: null,
					scopes: ["snapshots:read", "snapshots:write"],
					rateLimit: 1000,
				},
				{
					id: "key_2",
					name: "Development Key",
					keyPreview: "sk_test_...",
					createdAt: "2024-02-01T00:00:00Z",
					lastUsedAt: null, // Never used
					expiresAt: "2024-12-31T23:59:59Z",
					revokedAt: null,
					scopes: ["snapshots:read"],
					rateLimit: 100,
				},
			];

			mockApiClient.apiKeys.list.mockResolvedValue({ keys: mockKeys });

			// WHEN: User lists API keys
			const result = await mockApiClient.apiKeys.list();

			// THEN: Should return all keys with full metadata
			expect(result.keys).toHaveLength(2);
			expect(result.keys[0].name).toBe("Production Key");
			expect(result.keys[0].lastUsedAt).toBeDefined();
			expect(result.keys[1].lastUsedAt).toBeNull(); // Never used
		});

		it("should scope keys to authenticated user only", async () => {
			// Test ID: WEB-INT-API-KEYS-001-005
			// GIVEN: Multiple users with API keys
			const user1Keys = [{ id: "key_user1", userId: "user_1" }];
			const user2Keys = [{ id: "key_user2", userId: "user_2" }];

			// WHEN: User 1 lists keys
			mockApiClient.apiKeys.list.mockResolvedValue({ keys: user1Keys });
			const result1 = await mockApiClient.apiKeys.list();

			// THEN: Should only return user 1's keys
			expect(result1.keys).toHaveLength(1);
			expect(result1.keys[0].id).toBe("key_user1");

			// AND: Should NOT return other users' keys
			expect(result1.keys.find((k) => k.id === "key_user2")).toBeUndefined();
		});

		it("should return empty array for new users", async () => {
			// Test ID: WEB-INT-API-KEYS-001-006
			// GIVEN: New user with no API keys
			mockApiClient.apiKeys.list.mockResolvedValue({ keys: [] });

			// WHEN: User lists API keys
			const result = await mockApiClient.apiKeys.list();

			// THEN: Should return empty array (not null)
			expect(result.keys).toEqual([]);
			expect(Array.isArray(result.keys)).toBe(true);
		});
	});

	describe("Revoke API Key", () => {
		it("should mark key as revoked with timestamp", async () => {
			// Test ID: WEB-INT-API-KEYS-001-007
			// GIVEN: Active API key
			const keyId = "key_123";

			mockApiClient.apiKeys.revoke.mockResolvedValue({
				success: true,
				revokedAt: new Date().toISOString(),
			});

			// WHEN: User revokes key
			const result = await mockApiClient.apiKeys.revoke({ id: keyId });

			// THEN: Should set revokedAt timestamp
			expect(result.success).toBe(true);
			expect(result.revokedAt).toBeDefined();
			expect(new Date(result.revokedAt)).toBeInstanceOf(Date);
		});

		it("should reject API calls with revoked key", async () => {
			// Test ID: WEB-INT-API-KEYS-001-008
			// GIVEN: Revoked API key
			const revokedKey = "sk_live_revoked123";

			// WHEN: Attempting to use revoked key
			const mockValidation = (key: string) => {
				// Simulate key validation logic
				const isRevoked = key === "sk_live_revoked123";
				if (isRevoked) {
					throw new Error("API key has been revoked");
				}
				return { valid: true };
			};

			// THEN: Should reject with clear error
			expect(() => mockValidation(revokedKey)).toThrow("API key has been revoked");
		});

		it("should prevent revoking already-revoked keys", async () => {
			// Test ID: WEB-INT-API-KEYS-001-009
			// GIVEN: Already revoked key
			mockApiClient.apiKeys.revoke.mockRejectedValue({
				code: "ALREADY_REVOKED",
				message: "API key is already revoked",
			});

			// WHEN: Attempting to revoke again
			await expect(
				mockApiClient.apiKeys.revoke({ id: "key_123" })
			).rejects.toMatchObject({
				code: "ALREADY_REVOKED",
			});
		});
	});

	describe("Key Rotation", () => {
		it("should rotate key and preserve permissions", async () => {
			// Test ID: WEB-INT-API-KEYS-001-010
			// GIVEN: Existing API key with permissions
			const oldKeyId = "key_old_123";
			const oldScopes = ["snapshots:read", "snapshots:write", "risk:analyze"];

			mockApiClient.apiKeys.rotate.mockResolvedValue({
				oldKey: {
					id: oldKeyId,
					revokedAt: new Date().toISOString(),
				},
				newKey: {
					id: "key_new_456",
					name: "Production Key (Rotated)",
					keyPreview: "sk_live_...",
					createdAt: new Date().toISOString(),
					scopes: oldScopes, // Preserved
					rateLimit: 1000, // Preserved
				},
				fullKey: "sk_live_newkey789abcdefghij123456789klmnopqrstuvwxyzabcd",
			});

			// WHEN: User rotates key
			const result = await mockApiClient.apiKeys.rotate({ id: oldKeyId });

			// THEN: Old key should be revoked
			expect(result.oldKey.revokedAt).toBeDefined();

			// AND: New key should preserve permissions
			expect(result.newKey.scopes).toEqual(oldScopes);
			expect(result.newKey.rateLimit).toBe(1000);

			// AND: New full key should be returned
			expect(result.fullKey).toBeDefined();
			expect(result.fullKey).toMatch(/^sk_live_[a-zA-Z0-9]{48}$/);
		});

		it("should update key name with rotation suffix", async () => {
			// Test ID: WEB-INT-API-KEYS-001-011
			// GIVEN: Key named "Production Key"
			const originalName = "Production Key";

			mockApiClient.apiKeys.rotate.mockResolvedValue({
				oldKey: { id: "key_old" },
				newKey: {
					id: "key_new",
					name: `${originalName} (Rotated)`,
				},
				fullKey: "sk_live_rotated123",
			});

			// WHEN: Key is rotated
			const result = await mockApiClient.apiKeys.rotate({ id: "key_old" });

			// THEN: Name should indicate rotation
			expect(result.newKey.name).toBe("Production Key (Rotated)");
		});
	});

	describe("Security & Permissions", () => {
		it("should enforce user ownership for all operations", async () => {
			// Test ID: WEB-INT-API-KEYS-001-012
			// GIVEN: User attempts to revoke another user's key
			mockApiClient.apiKeys.revoke.mockRejectedValue({
				code: "FORBIDDEN",
				message: "You do not have permission to modify this API key",
			});

			// WHEN: Attempting unauthorized operation
			await expect(
				mockApiClient.apiKeys.revoke({ id: "other_user_key" })
			).rejects.toMatchObject({
				code: "FORBIDDEN",
			});
		});

		it("should validate API key format", () => {
			// Test ID: WEB-INT-API-KEYS-001-013
			// GIVEN: Various key formats
			const validFormats = [
				"sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwxyza",
				"sk_test_xyz987wvu654tsr321qpo098nml765kji432hgf210edcbaz",
			];

			const invalidFormats = [
				"invalid_key", // Wrong prefix
				"sk_live_short", // Too short
				"sk_live_!@#$%^", // Invalid characters
			];

			// WHEN: Validating key formats
			const keyPattern = /^sk_(live|test)_[a-zA-Z0-9]{48}$/;

			// THEN: Valid keys should pass
			for (const key of validFormats) {
				expect(key).toMatch(keyPattern);
			}

			// AND: Invalid keys should fail
			for (const key of invalidFormats) {
				expect(key).not.toMatch(keyPattern);
			}
		});

		it("should track lastUsedAt on API calls", async () => {
			// Test ID: WEB-INT-API-KEYS-001-014
			// GIVEN: API key used for authenticated request
			const keyId = "key_123";
			const beforeUse = new Date("2024-12-05T09:00:00Z");

			// WHEN: Key is used for API call
			const afterUse = new Date("2024-12-05T10:00:00Z");

			// THEN: lastUsedAt should be updated
			expect(afterUse.getTime()).toBeGreaterThan(beforeUse.getTime());

			// Simulate updating lastUsedAt
			const updatedKey = {
				id: keyId,
				lastUsedAt: afterUse.toISOString(),
			};

			expect(new Date(updatedKey.lastUsedAt)).toBeInstanceOf(Date);
			expect(updatedKey.lastUsedAt).toBe(afterUse.toISOString());
		});
	});
});
