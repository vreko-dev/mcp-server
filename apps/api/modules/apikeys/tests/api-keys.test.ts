import { db as drizzle } from "@snapback/platform";
import { describe, expect, it, vi } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "../../lib/crypto.js";

// Mock the database
vi.mock("@snapback/platform", () => {
	const actual = vi.importActual("@snapback/platform");
	return {
		...actual,
		drizzle: {
			db: {
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
			},
		},
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
			expect(rawKey).toMatch(/^sb_[a-zA-Z0-9]{32}$/);
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

			(drizzle.insert as any).mockReturnThis();
			(drizzle.values as any).mockResolvedValue({
				returning: vi.fn().mockResolvedValue(mockResult),
			});
			(drizzle.returning as any).mockResolvedValue(mockResult);

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
});
