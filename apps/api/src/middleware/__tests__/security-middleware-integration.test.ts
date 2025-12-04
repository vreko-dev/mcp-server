/**
 * Security Middleware Integration Tests (RED Phase - TDD)
 *
 * Tests the complete security middleware stack in proper order:
 * Rate Limiting → CSRF Protection → API Key Scope → Handler → Error Handler
 *
 * These tests verify:
 * 1. Middleware ordering prevents bypass attacks
 * 2. Each layer validates correctly
 * 3. Errors propagate to centralized error handler
 * 4. Context passes safely between middleware
 * 5. Security policies are enforced end-to-end
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { rateLimitingMiddleware } from "../security-rate-limit";
import { csrfProtectionMiddleware } from "../security-csrf";
import { apiKeyScopeMiddleware } from "../security-api-key-scope";

// Type variables with context
type AppType = Hono<{
	Variables: {
		apiKeyContext?: { keyId: string; scopes: string[] };
	};
}>;

describe("Security Middleware Integration (RED Phase)", () => {
	let app: AppType;

	beforeEach(() => {
		// Create fresh app for each test
		app = new Hono<{
			Variables: {
				apiKeyContext?: { keyId: string; scopes: string[] };
			};
		}>();

		// Register middleware in correct order (from rule: always-middleware-architecture.md)
		// 1. Rate Limiting (reject abusers early before expensive operations)
		app.use("/api/*", rateLimitingMiddleware());

		// 2. CSRF Protection (validate state-changing requests)
		app.use("/api/*", csrfProtectionMiddleware());

		// 3. API Key Scope (validate permissions)
		app.use("/api/*", apiKeyScopeMiddleware());

		// 4. Test route handler (business logic)
		app.post("/api/test", (c) => {
			return c.json({ success: true, path: c.req.path });
		});

		app.get("/api/test", (c) => {
			return c.json({ success: true, path: c.req.path });
		});

		// 5. Centralized error handler
		app.onError((err, c) => {
			if (err instanceof HTTPException) {
				return err.getResponse();
			}
			return c.json({ error: "Internal Server Error" }, 500);
		});
	});

	describe("Middleware Ordering & Bypass Prevention", () => {
		it("SPEC: Rate limiting should trigger before CSRF validation", async () => {
			// Spec: Rate limits must reject abusers early to prevent resource exhaustion
			const responses: number[] = [];

			// Make 5 rapid requests
			for (let i = 0; i < 5; i++) {
				const res = await app.request(
					new Request("http://localhost/api/test", {
						method: "POST",
						headers: {
							Origin: "http://localhost",
							"X-CSRF-Token": "valid-token",
						},
					}),
				);
				responses.push(res.status);
			}

			// Expect: First requests pass rate limit, later ones return 429
			expect(responses.some((s) => s === 429)).toBe(true);
		});

		it("SPEC: CSRF validation must occur before API key scope check", async () => {
			// Spec: Invalid CSRF should be rejected (403) before scope validation (401)
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						// Missing CSRF token
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			expect(res.status).toBe(403);
			const body = (await res.json()) as Record<string, unknown>;
			expect(body.message || body.error).toMatch(/CSRF/i);
		});

		it("SPEC: Safe methods (GET, HEAD, OPTIONS) should skip CSRF validation", async () => {
			// Spec: GET requests don't modify state, so CSRF validation is unnecessary
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "GET",
					headers: {
						Origin: "http://localhost",
						// No CSRF token needed for GET
					},
				}),
			);

			// Should NOT fail with 403 (CSRF error)
			expect(res.status).not.toBe(403);
		});
	});

	describe("Rate Limiting Enforcement", () => {
		it("SPEC: Rate limiting must set X-RateLimit headers on all responses", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "valid-token",
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			expect(res.headers.has("X-RateLimit-Limit")).toBe(true);
			expect(res.headers.has("X-RateLimit-Remaining")).toBe(true);
		});

		it("SPEC: Rate limited responses must include Retry-After header", async () => {
			// Trigger rate limit by making multiple requests
			for (let i = 0; i < 5; i++) {
				await app.request(
					new Request("http://localhost/api/test", {
						method: "POST",
						headers: {
							Origin: "http://localhost",
							"X-CSRF-Token": "valid-token",
							Authorization: "Bearer sk_test_1234567890123456",
						},
					}),
				);
			}

			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "valid-token",
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			if (res.status === 429) {
				expect(res.headers.has("Retry-After")).toBe(true);
			}
		});
	});

	describe("CSRF Token Validation", () => {
		it("SPEC: POST without CSRF token must return 403", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						// Missing X-CSRF-Token
					},
				}),
			);

			expect(res.status).toBe(403);
		});

		it("SPEC: POST with invalid CSRF token must return 403", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "invalid-token-not-in-session",
					},
				}),
			);

			expect(res.status).toBe(403);
		});

		it("SPEC: Requests with malicious origin must be rejected", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://malicious.com",
						"X-CSRF-Token": "valid-token",
					},
				}),
			);

			// Should fail origin validation
			expect(res.status).toBe(403);
		});

		it("SPEC: DELETE requests must undergo CSRF validation like POST", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "DELETE",
					headers: {
						Origin: "http://localhost",
						// Missing CSRF token
					},
				}),
			);

			// Should fail CSRF validation
			expect(res.status).toBe(403);
		});
	});

	describe("API Key Scope Validation", () => {
		it("SPEC: Requests with invalid API key format must return 401", async () => {
			// Create app with required scopes
			const scopedApp = new Hono<{
				Variables: {
					apiKeyContext?: { keyId: string; scopes: string[] };
				};
			}>();
			scopedApp.use("/api/*", apiKeyScopeMiddleware(["snapshots:read"]));
			scopedApp.post("/api/test", (c) => c.json({ ok: true }));
			scopedApp.onError((err, c) => {
				if (err instanceof HTTPException) {
					return err.getResponse();
				}
				return c.json({ error: "Internal" }, 500);
			});

			const res = await scopedApp.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Authorization: "Bearer short", // Too short
					},
				}),
			);

			expect(res.status).toBe(401);
		});

		it("SPEC: API key context must be available to handlers", async () => {
			// Create app that reads context
			const contextApp = new Hono<{
				Variables: {
					apiKeyContext?: { keyId: string; scopes: string[] };
				};
			}>();
			contextApp.use("/api/*", apiKeyScopeMiddleware(["snapshots:read"]));
			contextApp.post("/api/test", (c) => {
				const context = c.get("apiKeyContext");
				return c.json({
					hasContext: !!context,
					keyId: context?.keyId || null,
				});
			});
			contextApp.onError((err, c) => {
				if (err instanceof HTTPException) {
					return err.getResponse();
				}
				return c.json({ error: "Internal" }, 500);
			});

			const res = await contextApp.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			const body = (await res.json()) as Record<string, unknown>;
			expect(body.hasContext).toBe(true);
			expect(typeof body.keyId).toBe("string");
		});
	});

	describe("Centralized Error Handling", () => {
		it("SPEC: HTTPException errors must be caught by app.onError()", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "invalid",
					},
				}),
			);

			// Should be caught and returned properly
			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body).toBeDefined();
		});

		it("SPEC: Error responses must not expose internal details", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "invalid",
					},
				}),
			);

			const body = (await res.json()) as Record<string, unknown>;
			// Should not contain stack traces or sensitive info
			expect(body.stack).toBeUndefined();
		});
	});

	describe("Full Request Lifecycle", () => {
		it("SPEC: Valid request must pass through all middleware layers", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "valid-token",
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			// Should reach handler successfully
			expect(res.status).toBeLessThan(400);
			const body = (await res.json()) as Record<string, unknown>;
			expect(body.success).toBe(true);
		});

		it("SPEC: Request path must be preserved through middleware chain", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						"X-CSRF-Token": "valid-token",
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			const body = (await res.json()) as Record<string, unknown>;
			expect(body.path).toBe("/api/test");
		});

		it("SPEC: Failing any middleware layer must prevent handler execution", async () => {
			// Valid except for missing CSRF
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "POST",
					headers: {
						Origin: "http://localhost",
						// Missing CSRF
						Authorization: "Bearer sk_test_1234567890123456",
					},
				}),
			);

			// Handler should not be called
			expect(res.status).toBeGreaterThanOrEqual(400);
			const body = (await res.json()) as Record<string, unknown>;
			expect(body.success).toBeUndefined();
		});
	});

	describe("Edge Cases & HTTP Methods", () => {
		it("SPEC: OPTIONS requests (preflight) must bypass CSRF", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "OPTIONS",
					headers: {
						Origin: "http://localhost",
					},
				}),
			);

			// Should not fail with 403 (CSRF error)
			expect(res.status).not.toBe(403);
		});

		it("SPEC: HEAD requests must bypass CSRF validation", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "HEAD",
					headers: {
						Origin: "http://localhost",
					},
				}),
			);

			// Should not fail with 403
			expect(res.status).not.toBe(403);
		});

		it("SPEC: PUT requests must require CSRF token", async () => {
			const res = await app.request(
				new Request("http://localhost/api/test", {
					method: "PUT",
					headers: {
						Origin: "http://localhost",
						// Missing CSRF
					},
				}),
			);

			expect(res.status).toBe(403);
		});
	});
});
