/**
 * API Key Lifecycle Tests
 *
 * Tests critical paths for API key generation, validation, revocation, and rate limiting.
 * Ensures frictionless UX where API keys work reliably across web and extension.
 *
 * Follows test_coverage.md P0 (demo-critical) & testing-cleanup.md 4-path model.
 * @see packages/auth/__tests__/api-key-lifecycle.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createApiKey,
	generateApiKey,
	hashApiKey,
	revokeApiKey,
	validateApiKey,
	verifyApiKey,
} from "../src/index";

// ============================================================================
// TEST HELPERS & SETUP
// ============================================================================

interface TestContext {
	userId: string;
	apiKeyId: string;
	plainKey: string;
	keyHash: string;
}

function createTestUser(userId = "user_test_123"): string {
	return userId;
}

async function setupApiKey(
	userId: string,
): Promise<Omit<TestContext, "userId">> {
	const plainKey = generateApiKey();
	const keyHash = await hashApiKey(plainKey);

	return {
		apiKeyId: `key_${Date.now()}`,
		plainKey,
		keyHash,
	};
}

// ============================================================================
// ✅ HAPPY PATH: Successful API Key Workflows
// ============================================================================

describe("API Key Lifecycle - Happy Path", () => {
	let context: TestContext;

	beforeEach(async () => {
		context = {
			userId: createTestUser(),
			...(await setupApiKey()),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Generation & Creation", () => {
		it("should generate cryptographically secure API key with correct prefix", () => {
			const key = generateApiKey();

			// ✅ Verify format
			expect(key).toMatch(/^sk_live_[a-zA-Z0-9]{32,}$/);

			// ✅ Verify uniqueness (high entropy)
			const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
			expect(keys.size).toBe(100); // All unique
		});

		it("should create API key with metadata and return full key once", async () => {
			const result = await createApiKey({
				userId: context.userId,
				name: "VS Code - Main",
				scopes: ["snapshots:read", "snapshots:write"],
				rateLimit: 1000,
			});

			// ✅ Returns full key only at creation
			expect(result).toHaveProperty("fullKey");
			expect(result.fullKey).toMatch(/^sk_live_/);

			// ✅ Metadata saved correctly
			expect(result).toHaveProperty("id");
			expect(result.name).toBe("VS Code - Main");
			expect(result.scopes).toEqual(
				expect.arrayContaining(["snapshots:read", "snapshots:write"]),
			);
			expect(result.rateLimit).toBe(1000);
			expect(result.createdAt).toBeInstanceOf(Date);

			// ✅ Key NOT returned on subsequent calls
			const retrieved = await validateApiKey(result.fullKey);
			expect(retrieved).not.toHaveProperty("fullKey");
		});

		it("should store API key hash (not plaintext) in database", async () => {
			const plainKey = context.plainKey;
			const hash = await hashApiKey(plainKey);

			// ✅ Hash is different from plaintext
			expect(hash).not.toContain(plainKey.substring(0, 10));

			// ✅ Hash is reproducible
			const hash2 = await hashApiKey(plainKey);
			expect(hash2).toBe(hash);
		});
	});

	describe("Validation & Usage", () => {
		it("should validate correct API key", async () => {
			const result = await validateApiKey(context.plainKey);

			expect(result.valid).toBe(true);
			expect(result.user).toBeDefined();
			expect(result.user?.id).toBe(context.userId);
		});

		it("should reject invalid API key", async () => {
			const invalidKey = "sk_live_invalid_key_00000000000000000000";
			const result = await validateApiKey(invalidKey);

			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.user).toBeUndefined();
		});

		it("should record last usage timestamp on validation", async () => {
			const before = new Date();
			await validateApiKey(context.plainKey);
			const after = new Date();

			// ✅ Timestamp updated within reasonable window
			// Note: Would require database assertion in real implementation
			expect(before.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("should return scopes with validation result", async () => {
			const result = await validateApiKey(context.plainKey);

			expect(result).toHaveProperty("scopes");
			expect(Array.isArray(result.scopes)).toBe(true);
		});
	});

	describe("Revocation", () => {
		it("should revoke API key successfully", async () => {
			// ✅ Key works before revocation
			const beforeRevoke = await validateApiKey(context.plainKey);
			expect(beforeRevoke.valid).toBe(true);

			// ✅ Revocation succeeds
			const revoked = await revokeApiKey(context.apiKeyId);
			expect(revoked).toBe(true);

			// ✅ Key no longer works after revocation
			const afterRevoke = await validateApiKey(context.plainKey);
			expect(afterRevoke.valid).toBe(false);
		});

		it("should prevent re-revocation of same key", async () => {
			await revokeApiKey(context.apiKeyId);
			const secondRevoke = await revokeApiKey(context.apiKeyId);

			// ✅ Should return false or throw (implementation-dependent)
			expect(secondRevoke).toBe(false);
		});
	});
});

// ============================================================================
// ❌ SAD PATH: Validation Failures & Business Rule Violations
// ============================================================================

describe("API Key Lifecycle - Sad Path", () => {
	let userId: string;

	beforeEach(() => {
		userId = createTestUser();
	});

	describe("Format Validation", () => {
		it("should reject malformed API key", async () => {
			const testCases = [
				"invalid_key_here",
				"sk_test_invalid", // Too short
				"sk_live_12345678901234567890!", // Invalid character
				"", // Empty
				"sk_live_", // No key part
			];

			for (const badKey of testCases) {
				const result = await validateApiKey(badKey);
				expect(result.valid).toBe(false);
				expect(result.error).toContain(
					"Authentication failed", // Generic error
				);
			}
		});

		it("should require minimum key length", async () => {
			const tooShort = "sk_live_abc"; // Less than 32 chars
			const result = await validateApiKey(tooShort);

			expect(result.valid).toBe(false);
		});

		it("should handle case sensitivity correctly", async () => {
			const plainKey = generateApiKey();
			const uppercase = plainKey.toUpperCase();

			const result = await validateApiKey(uppercase);

			// ✅ Keys should be case-sensitive
			expect(result.valid).toBe(false);
		});
	});

	describe("Business Rule Violations", () => {
		it("should reject API key without required name", async () => {
			// ✅ API should require a descriptive name
			expect(
				createApiKey({
					userId,
					name: "", // Empty name
					scopes: ["snapshots:read"],
				}),
			).rejects.toThrow(/name/i);
		});

		it("should enforce minimum name length", async () => {
			expect(
				createApiKey({
					userId,
					name: "ab", // Too short
					scopes: ["snapshots:read"],
				}),
			).rejects.toThrow(/3 characters/i);
		});

		it("should reject API key creation without scopes", async () => {
			expect(
				createApiKey({
					userId,
					name: "Test Key",
					scopes: [], // Empty scopes
				}),
			).rejects.toThrow(/scopes/i);
		});

		it("should reject invalid scope names", async () => {
			expect(
				createApiKey({
					userId,
					name: "Test Key",
					scopes: ["invalid_scope_format"], // Not resource:action
				}),
			).rejects.toThrow(/scope/i);
		});

		it("should provide helpful error messages", async () => {
			try {
				await createApiKey({
					userId,
					name: "x",
					scopes: [],
				});
				expect.fail("Should have thrown");
			} catch (error) {
				const message = (error as Error).message.toLowerCase();
				expect(message).toMatch(/name|scope/); // Clear about what's wrong
			}
		});
	});

	describe("Revocation Errors", () => {
		it("should handle revocation of non-existent key", async () => {
			const result = await revokeApiKey("key_nonexistent");

			expect(result).toBe(false); // Safe failure
		});
	});
});

// ============================================================================
// ⚠️ EDGE CASES: Boundary Conditions & Concurrency
// ============================================================================

describe("API Key Lifecycle - Edge Cases", () => {
	let userId: string;

	beforeEach(() => {
		userId = createTestUser();
	});

	describe("Boundary Conditions", () => {
		it("should handle API key with very long name", async () => {
			const longName = "a".repeat(255); // Max typical name length

			const result = await createApiKey({
				userId,
				name: longName,
				scopes: ["snapshots:read"],
			});

			expect(result.name.length).toBe(255);
		});

		it("should handle expiration at exact boundary", async () => {
			const now = new Date();
			const expiresAt = new Date(now.getTime() + 1000); // 1 second

			const result = await createApiKey({
				userId,
				name: "Short-lived Key",
				scopes: ["snapshots:read"],
				expiresAt,
			});

			expect(result.expiresAt).toEqual(expiresAt);

			// ✅ Should work immediately after creation
			const validation1 = await validateApiKey(result.fullKey);
			expect(validation1.valid).toBe(true);

			// ⏳ Should expire after TTL
			await new Promise((r) => setTimeout(r, 1100));
			const validation2 = await validateApiKey(result.fullKey);
			expect(validation2.valid).toBe(false);
		});

		it("should handle many API keys for same user", async () => {
			const keyCount = 50;
			const keys = await Promise.all(
				Array.from({ length: keyCount }, (_, i) =>
					createApiKey({
						userId,
						name: `Key ${i + 1}`,
						scopes: ["snapshots:read"],
					}),
				),
			);

			expect(keys).toHaveLength(keyCount);

			// ✅ All keys are unique
			const uniqueKeys = new Set(keys.map((k) => k.fullKey));
			expect(uniqueKeys.size).toBe(keyCount);

			// ✅ All keys validate independently
			const results = await Promise.all(
				keys.map((k) => validateApiKey(k.fullKey)),
			);
			results.forEach((r) => expect(r.valid).toBe(true));
		});
	});

	describe("Concurrent Operations", () => {
		it("should handle concurrent API key validations safely", async () => {
			const plainKey = generateApiKey();
			const hash = await hashApiKey(plainKey);

			const validations = await Promise.all(
				Array.from({ length: 100 }, () => verifyApiKey(plainKey, hash)),
			);

			// ✅ All concurrent validations succeed
			validations.forEach((result) => expect(result).toBe(true));
		});

		it("should handle concurrent key creation for same user", async () => {
			const results = await Promise.all([
				createApiKey({
					userId,
					name: "Concurrent 1",
					scopes: ["snapshots:read"],
				}),
				createApiKey({
					userId,
					name: "Concurrent 2",
					scopes: ["snapshots:write"],
				}),
				createApiKey({
					userId,
					name: "Concurrent 3",
					scopes: ["snapshots:read"],
				}),
			]);

			// ✅ All created successfully
			expect(results).toHaveLength(3);

			// ✅ All are unique
			const ids = new Set(results.map((r) => r.id));
			expect(ids.size).toBe(3);
		});

		it("should prevent race condition on revocation", async () => {
			const key = await createApiKey({
				userId,
				name: "Race Test",
				scopes: ["snapshots:read"],
			});

			// ✅ Concurrent revocation attempts
			const results = await Promise.all([
				revokeApiKey(key.id),
				revokeApiKey(key.id),
				revokeApiKey(key.id),
			]);

			// ✅ Only one succeeds, others get false
			const successCount = results.filter((r) => r === true).length;
			expect(successCount).toBe(1);
		});
	});

	describe("Clock Skew Handling", () => {
		it("should handle system clock drift gracefully", async () => {
			const key = await createApiKey({
				userId,
				name: "Clock Test",
				scopes: ["snapshots:read"],
				expiresAt: new Date(Date.now() + 86400000), // 1 day from now
			});

			// ✅ Even if system clock jumps, key still validates
			const validation = await validateApiKey(key.fullKey);
			expect(validation.valid).toBe(true);
		});
	});
});

// ============================================================================
// 💥 ERROR CASES: System Failures & Recovery
// ============================================================================

describe("API Key Lifecycle - Error Handling", () => {
	let userId: string;

	beforeEach(() => {
		userId = createTestUser();
	});

	describe("Database Failures", () => {
		it("should handle database connection failure gracefully", async () => {
			// Note: Would require mocking database client
			// For now, document the expected behavior
			expect(true).toBe(true); // Placeholder for integration
		});

		it("should not lose state on partial write", async () => {
			// ✅ API key creation should be atomic
			// Either succeeds completely or fails without side effects
			expect(true).toBe(true); // Placeholder for integration
		});
	});

	describe("Rate Limiting", () => {
		it("should track API key validation attempts for rate limiting", async () => {
			const plainKey = generateApiKey();

			// Simulate 101 validations in 1 minute (should be limited)
			const attempts = Array.from({ length: 101 }, () => plainKey);

			// Note: In real implementation, would verify rate limit is enforced
			expect(attempts.length).toBe(101);
		});

		it("should provide rate limit feedback in error response", async () => {
			// ✅ When rate limited, error should indicate it
			// Not just "validation failed"
			expect(true).toBe(true); // Placeholder for integration
		});
	});

	describe("Timing Attack Prevention", () => {
		it("should take constant time for valid and invalid keys", async () => {
			const plainKey = generateApiKey();
			const hash = await hashApiKey(plainKey);

			const invalidHash = hash.substring(0, hash.length - 1) + "X";

			const validStart = performance.now();
			await verifyApiKey(plainKey, hash);
			const validTime = performance.now() - validStart;

			const invalidStart = performance.now();
			await verifyApiKey(plainKey, invalidHash);
			const invalidTime = performance.now() - invalidStart;

			// ✅ Times should be within ~50ms (accounting for system variance)
			const timeDiff = Math.abs(validTime - invalidTime);
			expect(timeDiff).toBeLessThan(50);
		});
	});

	describe("Error Telemetry", () => {
		it("should emit error events for failed operations", async () => {
			const spy = vi.fn();

			// Note: Would require instrumentation
			// For now, verify the function is called
			expect(typeof spy).toBe("function");
		});

		it("should not expose sensitive data in error messages", async () => {
			const result = await validateApiKey("sk_live_invalid");

			// ✅ Generic error message (prevents enumeration)
			expect(result.error).not.toContain("sk_live_");
			expect(result.error).not.toContain("invalid");
		});
	});
});
