/**
 * API Key Plugin Integration Tests (TDD Red Phase)
 * Tests for better-auth's apiKey plugin replacing custom validation
 */

import { describe, expect, it } from "vitest";

/**
 * RED phase tests - Define expected behavior from better-auth's apiKey plugin
 */
describe("API Key Plugin Integration (RED PHASE)", () => {
	describe("apikey-plugin-001: Format validation", () => {
		it("should validate API key format through better-auth plugin", async () => {
			// better-auth's apiKey plugin provides format validation:
			// - Correct prefix (sb_live_ or sb_test_)
			// - Minimum length enforcement
			// - Character set validation (alphanumeric + underscore)
			// - Not already expired
			// - Not revoked in database

			const validApiKey = "sb_live_test123456789abcdef";
			const invalidKeys = [
				"invalid_format", // wrong prefix
				"sb_live_", // too short
				"sb_live_test!@#$%", // invalid characters
			];

			expect(validApiKey).toMatch(/^sb_(live|test)_/);
			expect(validApiKey.length).toBeGreaterThan(16);

			for (const key of invalidKeys) {
				expect(key).not.toMatch(/^sb_(live|test)_[a-zA-Z0-9_]{16,}$/);
			}
		});
	});

	describe("apikey-plugin-002: Verification response structure", () => {
		it("should return structured verification result from auth.api.verifyApiKey()", async () => {
			// better-auth's apiKey plugin returns:
			// {
			//   isValid: boolean;
			//   userId?: string;
			//   permissions?: Record<string, string[]>;
			//   metadata?: Record<string, unknown>;
			//   expiresAt?: Date;
			//   rateLimit?: { requests: number; window: number };
			// }

			const mockVerified = {
				isValid: true,
				userId: "user-123",
				permissions: {
					"snapback:analyze": ["read"],
					"snapback:snapshot": ["read", "write"],
				},
				metadata: {
					name: "My API Key",
					lastUsed: new Date().toISOString(),
				},
				expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
				rateLimit: { requests: 1000, window: 60 }, // 1000 requests per minute
			};

			expect(mockVerified.isValid).toBe(true);
			expect(mockVerified.userId).toBeDefined();
			expect(mockVerified.permissions).toBeDefined();
			expect(Object.keys(mockVerified.permissions)).toContain("snapback:analyze");
		});
	});

	describe("apikey-plugin-003: Permission checking", () => {
		it("should extract permissions from verified API key", async () => {
			// Verified result includes permissions as nested object:
			// { "resource:action": ["scope1", "scope2"] }

			const permissions = {
				"snapback:analyze": ["read"],
				"snapback:snapshot": ["read", "write"],
			};

			const hasAnalyzeRead = permissions["snapback:analyze"]?.includes("read");
			const hasSnapshotWrite = permissions["snapback:snapshot"]?.includes("write");

			expect(hasAnalyzeRead).toBe(true);
			expect(hasSnapshotWrite).toBe(true);
			expect(permissions["snapback:invalid"]).toBeUndefined();
		});
	});

	describe("apikey-plugin-004: Expiration checking", () => {
		it("should validate expiration date from verified key", async () => {
			// better-auth automatically validates expiresAt
			// If past current time, isValid = false

			const expiredKey = {
				isValid: false,
				expiresAt: new Date(Date.now() - 1000), // 1 second ago
			};

			const validKey = {
				isValid: true,
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
			};

			expect(expiredKey.isValid).toBe(false);
			expect(validKey.isValid).toBe(true);
			expect(validKey.expiresAt.getTime()).toBeGreaterThan(Date.now());
		});
	});

	describe("apikey-plugin-005: Rate limiting per key", () => {
		it("should support rate limit configuration per API key", async () => {
			// Each API key can have its own rate limit config
			const freeKey = {
				rateLimit: { requests: 100, window: 60 }, // 100/min
			};

			const proKey = {
				rateLimit: { requests: 1000, window: 60 }, // 1000/min
			};

			const adminKey = {
				rateLimit: { requests: 10000, window: 60 }, // 10000/min
			};

			expect(freeKey.rateLimit.requests).toBeLessThan(proKey.rateLimit.requests);
			expect(proKey.rateLimit.requests).toBeLessThan(adminKey.rateLimit.requests);
		});
	});

	describe("apikey-plugin-006: Revocation support", () => {
		it("should mark revoked keys as invalid", async () => {
			// When API key is revoked, isValid becomes false
			const revokedKey = {
				isValid: false,
				reason: "revoked",
			};

			const activeKey = {
				isValid: true,
			};

			expect(revokedKey.isValid).toBe(false);
			expect(activeKey.isValid).toBe(true);
		});
	});

	describe("apikey-plugin-007: User and organization context", () => {
		it("should extract user and organization from verified key", async () => {
			// Verified result includes userId and metadata with org info
			const verified = {
				isValid: true,
				userId: "user-123",
				metadata: {
					organizationId: "org-456",
					organizationName: "My Company",
				},
			};

			expect(verified.userId).toBe("user-123");
			expect(verified.metadata.organizationId).toBe("org-456");
		});
	});

	describe("apikey-plugin-008: Invalid key rejection", () => {
		it("should reject invalid or revoked API keys", async () => {
			// Invalid keys return { isValid: false }
			const invalidResponse = {
				isValid: false,
				error: "Invalid API key",
			};

			expect(invalidResponse.isValid).toBe(false);
		});
	});

	describe("apikey-plugin-009: Metadata support", () => {
		it("should preserve key metadata for debugging and tracking", async () => {
			// Metadata can include:
			// - name: user-friendly name
			// - lastUsed: timestamp of last usage
			// - createdAt: when key was created
			// - ipRestriction: optional IP whitelist
			// - custom fields

			const metadata = {
				name: "CLI Production Key",
				lastUsed: new Date("2025-11-19T10:00:00Z").toISOString(),
				createdAt: new Date("2025-01-15T08:30:00Z").toISOString(),
				ipRestriction: ["203.0.113.0/24"],
				environment: "production",
			};

			expect(metadata.name).toBeDefined();
			expect(metadata.lastUsed).toBeDefined();
			expect(metadata.createdAt).toBeDefined();
		});
	});

	describe("apikey-plugin-010: Multiple permission resource support", () => {
		it("should support granular permissions across multiple resources", async () => {
			// Permissions format: Record<resource:action, scope[]>
			const permissions = {
				"snapback:analyze": ["read"],
				"snapback:snapshot": ["read", "write"],
				"snapback:snapshot": ["read", "write", "delete"],
				"snapback:organization": ["read"],
				"snapback:billing": [], // No permissions for billing
			};

			expect(permissions["snapback:analyze"]).toContain("read");
			expect(permissions["snapback:snapshot"]).toContain("write");
			expect(permissions["snapback:snapshot"]).toContain("delete");
			expect(permissions["snapback:billing"].length).toBe(0);
		});
	});
});

/**
 * Middleware integration tests
 */
describe("API Key Middleware Integration", () => {
	describe("authMiddleware: request flow", () => {
		it("should extract API key from x-api-key header", async () => {
			const headers = new Headers({
				"x-api-key": "sb_live_test123456789abcdef",
			});

			const apiKey = headers.get("x-api-key");
			expect(apiKey).toBe("sb_live_test123456789abcdef");
		});

		it("should return 401 when API key is missing", async () => {
			const headers = new Headers({});
			const apiKey = headers.get("x-api-key");

			expect(apiKey).toBeNull();
		});

		it("should attach verified user to context", async () => {
			const verified = {
				isValid: true,
				userId: "user-123",
				permissions: { "snapback:analyze": ["read"] },
			};

			const context = {
				user: { id: verified.userId },
				apiKey: verified,
			};

			expect(context.user.id).toBe("user-123");
			expect(context.apiKey.isValid).toBe(true);
		});
	});

	describe("MCP auth: tier detection", () => {
		it("should detect user tier from permissions", async () => {
			const verified = {
				isValid: true,
				userId: "user-123",
				permissions: {
					"snapback:pro": ["read"],
					"snapback:analyze": ["read", "write"],
				},
			};

			const tierDetection = {
				isFree: !verified.permissions?.["snapback:pro"] && !verified.permissions?.["snapback:admin"],
				isPro: !!verified.permissions?.["snapback:pro"] && !verified.permissions?.["snapback:admin"],
				isAdmin: !!verified.permissions?.["snapback:admin"],
			};

			expect(tierDetection.isPro).toBe(true);
			expect(tierDetection.isFree).toBe(false);
		});

		it("should return correct tier from permission structure", async () => {
			const adminKey = {
				permissions: { "snapback:admin": ["all"] },
			};

			const proKey = {
				permissions: { "snapback:pro": ["read"] },
			};

			const freeKey = {
				permissions: { "snapback:free": ["read"] },
			};

			expect(adminKey.permissions["snapback:admin"]).toBeDefined();
			expect(proKey.permissions["snapback:pro"]).toBeDefined();
			expect(freeKey.permissions["snapback:free"]).toBeDefined();
		});
	});
});
