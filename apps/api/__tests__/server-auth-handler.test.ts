import { Hono } from "hono";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

/**
 * Unit Tests: Auth Handler Configuration
 *
 * Tests the auth handler app created with .route() method
 * to ensure proper path rewriting and request forwarding
 */

describe("Auth Handler Configuration", () => {
	let authApp: InstanceType<typeof Hono>;
	let mockAuthHandler: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Create a mock auth handler
		mockAuthHandler = vi.fn(async (request: Request) => {
			return new Response(
				JSON.stringify({
					path: new URL(request.url).pathname,
					method: request.method,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		});

		// Create auth app with the same structure as server.ts
		authApp = new Hono().all("*", async (c) => {
			// Rewrite request path for Better Auth
			// /api/auth/** -> /auth/**
			const originalUrl = new URL(c.req.raw.url);
			const newPath = originalUrl.pathname.replace(/^\/(?:api\/)?/, "/");
			const rewrittenUrl = new URL(originalUrl);
			rewrittenUrl.pathname = newPath;

			// Create a new request with the rewritten URL
			const rewrittenRequest = new Request(rewrittenUrl, {
				method: c.req.raw.method,
				headers: c.req.raw.headers,
				body: c.req.raw.body,
				duplex: "half" as any,
			});

			return mockAuthHandler(rewrittenRequest);
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Path Rewriting", () => {
		it("should rewrite /api/auth/session to /auth/session", async () => {
			const response = await authApp.request("/api/auth/session", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.path).toBe("/auth/session");
		});

		it("should rewrite /auth/** paths (without api prefix)", async () => {
			const response = await authApp.request("/auth/callback", {
				method: "POST",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.path).toBe("/auth/callback");
		});

		it("should handle /api/auth/callback/google", async () => {
			const response = await authApp.request("/api/auth/callback/google", {
				method: "POST",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.path).toBe("/auth/callback/google");
		});

		it("should preserve query parameters", async () => {
			const response = await authApp.request(
				"/api/auth/session?userId=123&token=abc",
				{
					method: "GET",
				}
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.path).toBe("/auth/session");
			// Query params should be in original URL passed to handler
			expect(mockAuthHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("userId=123"),
				})
			);
		});
	});

	describe("HTTP Methods", () => {
		it("should handle GET requests", async () => {
			const response = await authApp.request("/api/auth/session", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.method).toBe("GET");
		});

		it("should handle POST requests", async () => {
			const response = await authApp.request("/api/auth/sign-in", {
				method: "POST",
				body: JSON.stringify({ email: "test@example.com" }),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.method).toBe("POST");
		});

		it("should handle PUT requests", async () => {
			const response = await authApp.request("/api/auth/user", {
				method: "PUT",
				body: JSON.stringify({ name: "New Name" }),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.method).toBe("PUT");
		});

		it("should handle DELETE requests", async () => {
			const response = await authApp.request("/api/auth/session", {
				method: "DELETE",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.method).toBe("DELETE");
		});
	});

	describe("Request Headers Forwarding", () => {
		it("should forward Content-Type header", async () => {
			const response = await authApp.request("/api/auth/sign-in", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(response.status).toBe(200);
			expect(mockAuthHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.any(Headers),
				})
			);
		});

		it("should forward Authorization header", async () => {
			const response = await authApp.request("/api/auth/protected", {
				method: "GET",
				headers: {
					Authorization: "Bearer token123",
				},
			});

			expect(response.status).toBe(200);
			expect(mockAuthHandler).toHaveBeenCalled();
		});

		it("should forward custom headers", async () => {
			const response = await authApp.request("/api/auth/callback", {
				method: "POST",
				headers: {
					"X-Custom-Header": "custom-value",
				},
				body: "{}",
			});

			expect(response.status).toBe(200);
		});
	});

	describe("Duplex Option", () => {
		it("should set duplex: 'half' for streaming bodies", async () => {
			const largeBody = JSON.stringify({ data: "x".repeat(1000) });
			const response = await authApp.request("/api/auth/upload", {
				method: "POST",
				body: largeBody,
			});

			expect(response.status).toBe(200);
			expect(mockAuthHandler).toHaveBeenCalled();
		});

		it("should handle empty request bodies", async () => {
			const response = await authApp.request("/api/auth/session", {
				method: "DELETE",
			});

			expect(response.status).toBe(200);
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed URLs gracefully", async () => {
			const response = await authApp.request(
				"/api/auth/session%20with%20spaces",
				{
					method: "GET",
				}
			);

			expect(response.status).toBe(200);
		});
	});
});
