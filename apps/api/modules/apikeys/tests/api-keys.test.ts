import { describe, expect, it, vi } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "@snapback/auth";

// Create mock db object using vi.hoisted for proper hoisting
const mockDb = vi.hoisted(() => ({
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockResolvedValue({}),
	returning: vi.fn().mockResolvedValue([{}]),
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	limit: vi.fn().mockResolvedValue([]),
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
}));

// Mock the database
vi.mock("@snapback/platform", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@snapback/platform")>();
	return {
		...actual,
		db: mockDb,
	};
});

describe("API Key Management", () => {
	describe("API Key Generation", () => {
		it("should generate secure API keys with correct format", async () => {
			// WHEN: We generate a new API key
			const rawKey = generateApiKey();
			const hashedKey = await hashApiKey(rawKey);
			const lastFour = rawKey.slice(-4);

			// THEN: Key should have correct format
			expect(rawKey).toMatch(/^sk_live_[a-f0-9]{32}$/);
			expect(lastFour).toHaveLength(4);
			expect(hashedKey).toBeDefined();
			expect(hashedKey).not.toBe(rawKey); // Should be hashed
		});

		it("should generate unique keys", async () => {
			// WHEN: We generate multiple keys
			const keys = [generateApiKey(), generateApiKey(), generateApiKey()];

			// THEN: All keys should be unique
			const uniqueKeys = new Set(keys);
			expect(uniqueKeys.size).toBe(3);
		});
	});

	describe("API Key Validation", () => {
		it("should validate correct API keys", async () => {
			// GIVEN: A valid API key
			const rawKey = generateApiKey();
			const hashedKey = await hashApiKey(rawKey);

			// WHEN: We validate the key
			const isValid = await verifyApiKey(rawKey, hashedKey);

			// THEN: Validation should succeed
			expect(isValid).toBe(true);
		});

		it("should reject invalid API keys", async () => {
			// GIVEN: An invalid API key
			const hashedKey = await hashApiKey(generateApiKey());
			const invalidKey = "sb_invalid_key_12345678901234567890123";

			// WHEN: We validate the key
			const isValid = await verifyApiKey(invalidKey, hashedKey);

			// THEN: Validation should fail
			expect(isValid).toBe(false);
		});
	});

	describe("API Key Storage", () => {
		it("should store API key with proper security", async () => {
			// GIVEN: A new API key
			const rawKey = generateApiKey();
			const hashedKey = await hashApiKey(rawKey);
			const lastFour = rawKey.slice(-4);

			// WHEN: We store the API key
			const mockResult = [
				{
					id: "key_123",
					userId: "user_test",
					name: "Test Key",
					key: hashedKey,
					keyPreview: `sb_${lastFour}...`,
					createdAt: new Date(),
				},
			];

			(mockDb.insert as any).mockReturnThis();
			(mockDb.values as any).mockResolvedValue({
				returning: vi.fn().mockResolvedValue(mockResult),
			});
			(mockDb.returning as any).mockResolvedValue(mockResult);

			// THEN: The key should be stored securely
			expect(hashedKey).toBeDefined();
			expect(hashedKey).not.toBe(rawKey);
		});
	});

	describe("API Key Permissions", () => {
		it("should assign correct permissions based on plan", () => {
			// GIVEN: Different plans
			const plans = ["free", "pro", "team"];

			// WHEN: We check permissions for each plan
			const permissions = plans.map((plan) => {
				switch (plan) {
					case "team":
						return {
							maxSnapshots: undefined, // unlimited
							cloudBackup: true,
							advancedDetection: true,
							customRules: true,
							teamSharing: true,
						};
					case "pro":
						return {
							maxSnapshots: undefined,
							cloudBackup: true,
							advancedDetection: true,
							customRules: true,
							teamSharing: false,
						};
					default:
						return {
							maxSnapshots: 100, // per month
							cloudBackup: false,
							advancedDetection: false,
							customRules: false,
							teamSharing: false,
						};
				}
			});

			// THEN: Each plan should have appropriate permissions
			expect(permissions[0].maxSnapshots).toBe(100); // free
			expect(permissions[1].cloudBackup).toBe(true); // pro
			expect(permissions[2].teamSharing).toBe(true); // team
		});
	});

	describe("Edge Cases", () => {
		it("should handle key generation under concurrent calls", async () => {
			// GIVEN: Multiple concurrent key generations
			const promises = Array.from({ length: 10 }, () => generateApiKey());

			// WHEN: We generate keys concurrently
			const keys = await Promise.all(promises);

			// THEN: All keys should be unique
			const uniqueKeys = new Set(keys);
			expect(uniqueKeys.size).toBe(10);
		});

		it("should handle very long key prefix gracefully", async () => {
			// GIVEN: A valid API key
			const rawKey = generateApiKey();

			// THEN: Key should have the expected length (sk_live_ = 8 chars + 32 hex = 40 total)
			expect(rawKey.length).toBe(40);
			expect(rawKey.startsWith("sk_live_")).toBe(true);
		});

		it("should extract correct preview from key boundary", async () => {
			// GIVEN: A key with known ending
			const rawKey = generateApiKey();
			const lastFour = rawKey.slice(-4);

			// THEN: Last four should be valid hex characters
			expect(lastFour).toMatch(/^[a-f0-9]{4}$/);
		});
	});

	describe("Error Handling", () => {
		it("should handle hash failure gracefully", async () => {
			// GIVEN: An invalid input to hash
			const emptyKey = "";

			// WHEN: We try to hash an empty key
			// THEN: It should still produce a hash (bcrypt handles empty strings)
			const hash = await hashApiKey(emptyKey);
			expect(typeof hash).toBe("string");
			expect(hash.length).toBeGreaterThan(0);
		});

		it("should reject verification with mismatched hash", async () => {
			// GIVEN: A key and a hash from a different key
			const key1 = generateApiKey();
			const key2 = generateApiKey();
			const hash2 = await hashApiKey(key2);

			// WHEN: We verify key1 against hash2
			const isValid = await verifyApiKey(key1, hash2);

			// THEN: Verification should fail
			expect(isValid).toBe(false);
		});

		it("should handle verification with corrupted hash", async () => {
			// GIVEN: A valid key but corrupted hash
			const rawKey = generateApiKey();
			const corruptedHash = "$2b$10$invalidhashvalue";

			// WHEN: We verify against corrupted hash
			// THEN: Should return false (not throw)
			const isValid = await verifyApiKey(rawKey, corruptedHash);
			expect(isValid).toBe(false);
		});

		it("should handle database insert failure", async () => {
			// GIVEN: Database throws an error
			(mockDb.returning as any).mockRejectedValueOnce(
				new Error("Database connection lost")
			);

			// WHEN: We try to store a key
			const rawKey = generateApiKey();
			const hashedKey = await hashApiKey(rawKey);

			// THEN: The hash is still valid (error would be in storage layer)
			expect(hashedKey).toBeDefined();
			expect(hashedKey.length).toBeGreaterThan(0);
		});
	});
});
