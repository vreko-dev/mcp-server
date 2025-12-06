/**
 * API Key Lifecycle & Extension Flow - Comprehensive MSW Integration Tests
 *
 * Tests all critical paths for API key generation, validation, scoping, and extension usage.
 * Uses Mock Service Worker (MSW) to simulate:
 * - Web API (create/revoke/list keys, permissions)
 * - Better Auth (session, key verification)
 * - Rate limiting (429 responses)
 * - Error scenarios (500, 503, timeouts)
 *
 * Covers 4-path model: Happy Path | Sad Path | Edge Cases | Error Cases
 *
 * @see testing-cleanup.md (4-path testing framework)
 * @see packages/testing/src/msw (MSW handlers)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// ============================================================================
// MSW SERVER SETUP
// ============================================================================

const BASE_URL = "http://localhost:3000";
const API_BASE = `${BASE_URL}/api`;
const AUTH_BASE = `${BASE_URL}/auth`;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================================================
// TEST FIXTURES & TYPES
// ============================================================================

interface ApiKey {
	id: string;
	fullKey?: string; // Only on creation
	preview: string;
	name: string;
	scopes: string[];
	rateLimit: number;
	createdAt: string;
	expiresAt?: string;
	lastUsed?: string;
}

interface Session {
	user: {
		id: string;
		email: string;
		name: string;
	};
	accessToken: string;
	expiresAt: number;
}

// Mock key generator for tests
function generateTestKey(prefix = "sk_live_"): string {
	return prefix + Array.from({ length: 32 }, () => 
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
			Math.floor(Math.random() * 62)
		)
	).join("");
}

function generateKeyPreview(fullKey: string): string {
	return fullKey.slice(0, 8) + "..." + fullKey.slice(-4);
}

// ============================================================================
// ✅ HAPPY PATH: Complete Workflows
// ============================================================================

describe("API Key Flow - Happy Path", () => {
	const userId = "user_12345";
	const userEmail = "user@example.com";
	const sessionToken = "session_token_123";

	beforeEach(() => {
		vi.clearAllMocks();

		// ✅ Session endpoint
		server.use(
			http.get(`${AUTH_BASE}/session`, () => {
				return HttpResponse.json({
					user: { id: userId, email: userEmail, name: "Test User" },
					accessToken: sessionToken,
					expiresAt: Date.now() + 3600000,
				} as Session);
			})
		);

		// ✅ Create API key
		server.use(
			http.post(`${API_BASE}/api-keys`, async ({ request }) => {
				const body = (await request.json()) as {
					name: string;
					scopes: string[];
					rateLimit: number;
				};
				const fullKey = generateTestKey();
				return HttpResponse.json({
					id: `key_${Date.now()}`,
					fullKey,
					preview: generateKeyPreview(fullKey),
					name: body.name,
					scopes: body.scopes,
					rateLimit: body.rateLimit,
					createdAt: new Date().toISOString(),
				} as ApiKey);
			})
		);

		// ✅ List API keys
		server.use(
			http.get(`${API_BASE}/api-keys`, () => {
				const key1 = generateTestKey();
				const key2 = generateTestKey();
				return HttpResponse.json([
					{
						id: "key_1",
						preview: generateKeyPreview(key1),
						name: "VS Code - Primary",
						scopes: ["snapshots:read", "snapshots:write"],
						rateLimit: 1000,
						createdAt: new Date().toISOString(),
						lastUsed: new Date().toISOString(),
					},
					{
						id: "key_2",
						preview: generateKeyPreview(key2),
						name: "CLI - Development",
						scopes: ["snapshots:read"],
						rateLimit: 500,
						createdAt: new Date(Date.now() - 86400000).toISOString(),
						lastUsed: new Date(Date.now() - 3600000).toISOString(),
					},
				] as ApiKey[]);
			})
		);

		// ✅ Verify API key
		server.use(
			http.post(`${API_BASE}/api-keys/verify`, async ({ request }) => {
				const body = (await request.json()) as { key: string };
				return HttpResponse.json({
					valid: true,
					user: { id: userId, email: userEmail },
					scopes: ["snapshots:read", "snapshots:write"],
					rateLimit: 1000,
					lastUsed: new Date().toISOString(),
				});
			})
		);

		// ✅ Revoke API key
		server.use(
			http.delete(`${API_BASE}/api-keys/:keyId`, () => {
				return HttpResponse.json({ success: true });
			})
		);
	});

	describe("Session & Authentication", () => {
		it("should get authenticated session", async () => {
			const res = await fetch(`${AUTH_BASE}/session`);
			const data = (await res.json()) as Session;

			expect(res.status).toBe(200);
			expect(data.user.id).toBe(userId);
			expect(data.user.email).toBe(userEmail);
			expect(data.accessToken).toBeDefined();
		});

		it("should return session with non-expired token", async () => {
			const res = await fetch(`${AUTH_BASE}/session`);
			const data = (await res.json()) as Session;

			expect(data.expiresAt).toBeGreaterThan(Date.now());
		});
	});

	describe("API Key Creation", () => {
		it("should create API key with required name and scopes", async () => {
			const res = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "VS Code - Main",
					scopes: ["snapshots:read", "snapshots:write"],
					rateLimit: 1000,
				}),
			});

			const key = (await res.json()) as ApiKey;

			expect(res.status).toBe(200);
			expect(key.fullKey).toMatch(/^sk_live_[a-zA-Z0-9]{32}$/);
			expect(key.preview).toMatch(/^sk_live_.*\.\.\..*$/);
			expect(key.name).toBe("VS Code - Main");
			expect(key.scopes).toEqual(["snapshots:read", "snapshots:write"]);
		});

		it("should return full key only once", async () => {
			const res = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "CLI Key",
					scopes: ["snapshots:read"],
					rateLimit: 500,
				}),
			});

			const key = (await res.json()) as ApiKey;
			expect(key.fullKey).toBeDefined();
			expect(key.fullKey?.length).toBeGreaterThan(40);

			// Subsequent list call should NOT include full key
			const listRes = await fetch(`${API_BASE}/api-keys`);
			const keys = (await listRes.json()) as ApiKey[];

			keys.forEach((k) => {
				expect(k.fullKey).toBeUndefined();
				expect(k.preview).toBeDefined();
			});
		});

		it("should create keys with different scope combinations", async () => {
			const scopes = [
				["snapshots:read"],
				["snapshots:write"],
				["snapshots:read", "snapshots:write"],
				["snapshots:*"],
			];

			for (const scope of scopes) {
				const res = await fetch(`${API_BASE}/api-keys`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: `Key - ${scope.join("+")}`,
						scopes: scope,
						rateLimit: 1000,
					}),
				});

				const key = (await res.json()) as ApiKey;
				expect(key.scopes).toEqual(scope);
			}
		});

		it("should allow custom rate limits", async () => {
			const rateLimits = [100, 500, 1000, 10000];

			for (const limit of rateLimits) {
				const res = await fetch(`${API_BASE}/api-keys`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: `Key - ${limit} req/min`,
						scopes: ["snapshots:read"],
						rateLimit: limit,
					}),
				});

				const key = (await res.json()) as ApiKey;
				expect(key.rateLimit).toBe(limit);
			}
		});
	});

	describe("API Key Verification", () => {
		it("should verify valid API key", async () => {
			const res = await fetch(`${API_BASE}/api-keys/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: generateTestKey() }),
			});

			const result = (await res.json()) as {
				valid: boolean;
				user: { id: string; email: string };
				scopes: string[];
			};

			expect(res.status).toBe(200);
			expect(result.valid).toBe(true);
			expect(result.user.id).toBe(userId);
			expect(result.scopes).toContain("snapshots:read");
		});

		it("should include scope information on verification", async () => {
			const res = await fetch(`${API_BASE}/api-keys/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: generateTestKey() }),
			});

			const result = (await res.json()) as {
				scopes: string[];
				rateLimit: number;
				lastUsed: string;
			};

			expect(Array.isArray(result.scopes)).toBe(true);
			expect(typeof result.rateLimit).toBe("number");
			expect(result.lastUsed).toBeDefined();
		});
	});

	describe("API Key Management", () => {
		it("should list all API keys with metadata", async () => {
			const res = await fetch(`${API_BASE}/api-keys`);
			const keys = (await res.json()) as ApiKey[];

			expect(res.status).toBe(200);
			expect(Array.isArray(keys)).toBe(true);
			expect(keys.length).toBeGreaterThan(0);

			keys.forEach((key) => {
				expect(key.id).toBeDefined();
				expect(key.preview).toBeDefined();
				expect(key.name).toBeDefined();
				expect(key.scopes).toBeDefined();
				expect(key.createdAt).toBeDefined();
				expect(key.fullKey).toBeUndefined(); // Never returned in list
			});
		});

		it("should revoke API key", async () => {
			const res = await fetch(`${API_BASE}/api-keys/key_123`, {
				method: "DELETE",
			});

			const result = (await res.json()) as { success: boolean };
			expect(res.status).toBe(200);
			expect(result.success).toBe(true);
		});
	});

	describe("Extension Integration", () => {
		it("should complete user journey: create key → store → verify", async () => {
			// Step 1: Get session
			const sessionRes = await fetch(`${AUTH_BASE}/session`);
			const session = (await sessionRes.json()) as Session;
			expect(session.user.id).toBe(userId);

			// Step 2: Create key
			const createRes = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "VS Code Extension",
					scopes: ["snapshots:read", "snapshots:write"],
					rateLimit: 1000,
				}),
			});

			const createdKey = (await createRes.json()) as ApiKey;
			expect(createdKey.fullKey).toBeDefined();

			// Step 3: Store in extension (simulate)
			const storedKey = createdKey.fullKey!;
			expect(storedKey).toMatch(/^sk_live_/);

			// Step 4: Verify key works
			const verifyRes = await fetch(`${API_BASE}/api-keys/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: storedKey }),
			});

			const verification = (await verifyRes.json()) as {
				valid: boolean;
				user: { id: string };
				scopes: string[];
			};

			expect(verification.valid).toBe(true);
			expect(verification.scopes).toContain("snapshots:write");
		});

		it("should support multiple keys per user", async () => {
			const keys = [];

			// Create 3 keys with different purposes
			for (let i = 0; i < 3; i++) {
				const res = await fetch(`${API_BASE}/api-keys`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: `Key ${i + 1}`,
						scopes: ["snapshots:read"],
						rateLimit: 100 * (i + 1),
					}),
				});

				const key = (await res.json()) as ApiKey;
				keys.push(key);
			}

			expect(keys).toHaveLength(3);
			expect(new Set(keys.map((k) => k.id)).size).toBe(3); // All unique
		});
	});
});

// ============================================================================
// ❌ SAD PATH: Validation Failures & Business Rule Violations
// ============================================================================

describe("API Key Flow - Sad Path", () => {
	const userId = "user_12345";

	beforeEach(() => {
		// ❌ Invalid key format
		server.use(
			http.post(`${API_BASE}/api-keys/verify`, async ({ request }) => {
				const body = (await request.json()) as { key: string };

				if (!body.key.match(/^sk_live_[a-zA-Z0-9]{32,}$/)) {
					return HttpResponse.json(
						{ error: "Invalid key format" },
						{ status: 400 }
					);
				}

				return HttpResponse.json({
					valid: true,
					user: { id: userId, email: "user@example.com" },
					scopes: ["snapshots:read"],
				});
			})
		);

		// ❌ Missing required fields
		server.use(
			http.post(`${API_BASE}/api-keys`, async ({ request }) => {
				const body = (await request.json()) as {
					name?: string;
					scopes?: string[];
				};

				if (!body.name) {
					return HttpResponse.json(
						{ error: "Missing required field: name" },
						{ status: 400 }
					);
				}

				if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
					return HttpResponse.json(
						{ error: "Scopes array required and must not be empty" },
						{ status: 400 }
					);
				}

				return HttpResponse.json({ id: "key_123", fullKey: generateTestKey() });
			})
		);

		// ❌ Invalid scope names
		server.use(
			http.post(`${API_BASE}/api-keys`, async ({ request }) => {
				const body = (await request.json()) as { scopes?: string[] };
				const validScopes = ["snapshots:read", "snapshots:write", "snapshots:*"];

				if (body.scopes) {
					const invalid = body.scopes.filter((s) => !validScopes.includes(s));
					if (invalid.length > 0) {
						return HttpResponse.json(
							{ error: `Invalid scopes: ${invalid.join(", ")}` },
							{ status: 400 }
						);
					}
				}

				return HttpResponse.json({ id: "key_123", fullKey: generateTestKey() });
			})
		);
	});

	describe("Format Validation", () => {
		it("should reject malformed API keys", async () => {
			const invalidKeys = [
				"invalid_key",
				"sk_test_short",
				"sk_live_with!invalid",
				"",
			];

			for (const key of invalidKeys) {
				const res = await fetch(`${API_BASE}/api-keys/verify`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ key }),
				});

				expect(res.status).toBe(400);
				const error = (await res.json()) as { error: string };
				expect(error.error).toContain("Invalid");
			}
		});
	});

	describe("Required Fields", () => {
		it("should require name for API key creation", async () => {
			const res = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					scopes: ["snapshots:read"],
					rateLimit: 1000,
				}),
			});

			expect(res.status).toBe(400);
			const error = (await res.json()) as { error: string };
			expect(error.error).toContain("name");
		});

		it("should require non-empty scopes array", async () => {
			const invalidScopesArray = [[], undefined];

			for (const scopes of invalidScopesArray) {
				const res = await fetch(`${API_BASE}/api-keys`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "Test Key",
						scopes,
						rateLimit: 1000,
					}),
				});

				expect(res.status).toBe(400);
			}
		});
	});

	describe("Scope Validation", () => {
		it("should reject invalid scope names", async () => {
			const res = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Bad Key",
					scopes: ["invalid:scope", "snapshots:delete"],
					rateLimit: 1000,
				}),
			});

			expect(res.status).toBe(400);
		});
	});
});

// ============================================================================
// ⚠️ EDGE CASES: Boundaries, Concurrency, Performance
// ============================================================================

describe("API Key Flow - Edge Cases", () => {
	beforeEach(() => {
		// Test with many keys
		server.use(
			http.get(`${API_BASE}/api-keys`, () => {
				const keys: ApiKey[] = Array.from({ length: 50 }, (_, i) => ({
					id: `key_${i}`,
					preview: `sk_live_${String(i).padStart(4, "0")}...${String(i + 1000).padStart(4, "0")}`,
					name: `Key ${i + 1}`,
					scopes: ["snapshots:read"],
					rateLimit: 1000,
					createdAt: new Date(Date.now() - i * 86400000).toISOString(),
				}));
				return HttpResponse.json(keys);
			})
		);

		// Test boundary values
		server.use(
			http.post(`${API_BASE}/api-keys`, async ({ request }) => {
				const body = (await request.json()) as {
					name: string;
					rateLimit?: number;
				};

				return HttpResponse.json({
					id: `key_${Date.now()}`,
					fullKey: generateTestKey(),
					preview: "sk_live_...xxxx",
					name: body.name,
					scopes: ["snapshots:read"],
					rateLimit: body.rateLimit || 1000,
					createdAt: new Date().toISOString(),
				});
			})
		);
	});

	describe("High Volume", () => {
		it("should handle listing 50+ API keys", async () => {
			const res = await fetch(`${API_BASE}/api-keys`);
			const keys = (await res.json()) as ApiKey[];

			expect(res.status).toBe(200);
			expect(keys.length).toBeGreaterThanOrEqual(50);
			expect(keys[0]?.createdAt).toBeDefined();
		});

		it("should sort keys by creation date descending", async () => {
			const res = await fetch(`${API_BASE}/api-keys`);
			const keys = (await res.json()) as ApiKey[];

			for (let i = 0; i < keys.length - 1; i++) {
				const current = new Date(keys[i]!.createdAt).getTime();
				const next = new Date(keys[i + 1]!.createdAt).getTime();
				expect(current).toBeGreaterThanOrEqual(next);
			}
		});
	});

	describe("Boundary Values", () => {
		it("should accept very long key names", async () => {
			const longName = "A".repeat(255);
			const res = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: longName,
					scopes: ["snapshots:read"],
					rateLimit: 1000,
				}),
			});

			const key = (await res.json()) as ApiKey;
			expect(key.name).toBe(longName);
		});

		it("should accept edge-case rate limits", async () => {
			const limits = [1, 10, 100000, 1000000];

			for (const limit of limits) {
				const res = await fetch(`${API_BASE}/api-keys`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: `Limit ${limit}`,
						scopes: ["snapshots:read"],
						rateLimit: limit,
					}),
				});

				const key = (await res.json()) as ApiKey;
				expect(key.rateLimit).toBe(limit);
			}
		});
	});
});

// ============================================================================
// 💥 ERROR CASES: System Failures & Recovery
// ============================================================================

describe("API Key Flow - Error Cases", () => {
	describe("Rate Limiting", () => {
		beforeEach(() => {
			let requestCount = 0;

			server.use(
				http.post(`${API_BASE}/api-keys/verify`, () => {
					requestCount++;
					if (requestCount > 100) {
						return HttpResponse.json(
							{ error: "Too many requests" },
							{ status: 429, headers: { "Retry-After": "60" } }
						);
					}

					return HttpResponse.json({
						valid: true,
						user: { id: "user_123", email: "user@example.com" },
						scopes: ["snapshots:read"],
					});
				})
			);
		});

		it("should return 429 when rate limit exceeded", async () => {
			// Simulate exceeding rate limit
			server.use(
				http.post(`${API_BASE}/api-keys/verify`, () => {
					return HttpResponse.json(
						{ error: "Rate limited" },
						{ status: 429, headers: { "Retry-After": "60" } }
					);
				})
			);

			const res = await fetch(`${API_BASE}/api-keys/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: generateTestKey() }),
			});

			expect(res.status).toBe(429);
			expect(res.headers.get("Retry-After")).toBe("60");
		});

		it("should include retry information", async () => {
			server.use(
				http.post(`${API_BASE}/api-keys/verify`, () => {
					return HttpResponse.json(
						{ error: "Rate limited", retryAfter: 60 },
						{ status: 429 }
					);
				})
			);

			const res = await fetch(`${API_BASE}/api-keys/verify`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: generateTestKey() }),
			});

			const error = (await res.json()) as { retryAfter: number };
			expect(error.retryAfter).toBe(60);
		});
	});

	describe("Server Errors", () => {
		it("should handle 500 Internal Server Error", async () => {
			server.use(
				http.post(`${API_BASE}/api-keys`, () => {
					return HttpResponse.json(
						{ error: "Internal server error" },
						{ status: 500 }
					);
				})
			);

			const res = await fetch(`${API_BASE}/api-keys`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Test",
					scopes: ["snapshots:read"],
					rateLimit: 1000,
				}),
			});

			expect(res.status).toBe(500);
		});

		it("should handle 503 Service Unavailable", async () => {
			server.use(
				http.get(`${API_BASE}/api-keys`, () => {
					return HttpResponse.json(
						{ error: "Service temporarily unavailable" },
						{ status: 503 }
					);
				})
			);

			const res = await fetch(`${API_BASE}/api-keys`);

			expect(res.status).toBe(503);
		});

		it("should handle network timeout gracefully", async () => {
			server.use(
				http.post(`${API_BASE}/api-keys/verify`, async () => {
					await new Promise((resolve) => setTimeout(resolve, 10000));
					return HttpResponse.json({ valid: true });
				})
			);

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 100);

			try {
				await fetch(`${API_BASE}/api-keys/verify`, {
					method: "POST",
					signal: controller.signal,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ key: generateTestKey() }),
				});
			} catch (error) {
				expect((error as Error).name).toBe("AbortError");
			}

			clearTimeout(timeoutId);
		});
	});

	describe("Data Consistency", () => {
		it("should not lose key on concurrent creation", async () => {
			server.use(
				http.post(`${API_BASE}/api-keys`, async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					return HttpResponse.json({
						id: `key_${Date.now()}`,
						fullKey: generateTestKey(),
						preview: "sk_live_...xxxx",
						name: "Concurrent Key",
						scopes: ["snapshots:read"],
						rateLimit: 1000,
						createdAt: new Date().toISOString(),
					});
				})
			);

			const promises = Array.from({ length: 5 }, () =>
				fetch(`${API_BASE}/api-keys`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "Concurrent Key",
						scopes: ["snapshots:read"],
						rateLimit: 1000,
					}),
				}).then((res) => res.json())
			);

			const results = (await Promise.all(promises)) as ApiKey[];

			// All keys should have unique IDs
			const ids = new Set(results.map((k) => k.id));
			expect(ids.size).toBe(5);
		});

		it("should maintain key integrity after failed revocation", async () => {
			let revokeAttempts = 0;

			server.use(
				http.delete(`${API_BASE}/api-keys/key_123`, () => {
					revokeAttempts++;
					if (revokeAttempts === 1) {
						return HttpResponse.json(
							{ error: "Database error" },
							{ status: 500 }
						);
					}
					return HttpResponse.json({ success: true });
				})
			);

			// First attempt fails
			const res1 = await fetch(`${API_BASE}/api-keys/key_123`, {
				method: "DELETE",
			});
			expect(res1.status).toBe(500);

			// Second attempt succeeds
			const res2 = await fetch(`${API_BASE}/api-keys/key_123`, {
				method: "DELETE",
			});
			expect(res2.status).toBe(200);
		});
	});
});
