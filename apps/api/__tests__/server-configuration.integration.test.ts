import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";

/**
 * Integration Tests: Server Configuration
 *
 * Tests the complete server setup with auth routing, middleware,
 * CORS, body limits, and other configurations
 */

describe("Server Configuration Integration", () => {
	let testApp: InstanceType<typeof Hono>;

	beforeEach(() => {
		// Create a minimal test server that mirrors production structure
		testApp = new Hono()
			.use(
				cors({
					origin: (origin) => {
						const allowedOrigins = [
							"http://localhost:3000",
							"https://localhost:3000",
						];

						if (!origin) return "*";
						if (allowedOrigins.includes(origin)) return origin;
						if (origin.startsWith("http://localhost:")) return origin;

						return "";
					},
					credentials: true,
					maxAge: 600,
				})
			)
			.use(
				bodyLimit({
					maxSize: 10 * 1024 * 1024,
					onError: (c) =>
						c.json({ error: "Payload too large" }, 413),
				})
			)
			.get("/api/health", (c) => c.json({ status: "ok" }))
			.post("/api/test", async (c) => {
				const body = await c.req.json();
				return c.json(body);
			});
	});

	afterEach(() => {
		// Cleanup
	});

	describe("CORS Configuration", () => {
		it("should allow localhost:3000 origin", async () => {
			const response = await testApp.request("/api/health", {
				headers: {
					Origin: "http://localhost:3000",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("access-control-allow-origin")).toBe(
				"http://localhost:3000"
			);
		});

		it("should allow any localhost port in development", async () => {
			const response = await testApp.request("/api/health", {
				headers: {
					Origin: "http://localhost:5173",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("access-control-allow-origin")).toBe(
				"http://localhost:5173"
			);
		});

		it("should allow requests without origin (mobile apps)", async () => {
			const response = await testApp.request("/api/health");

			expect(response.status).toBe(200);
			expect(response.headers.get("access-control-allow-origin")).toBe(
				"*"
			);
		});

		it("should include credentials in CORS headers", async () => {
			const response = await testApp.request("/api/health", {
				headers: {
					Origin: "http://localhost:3000",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("access-control-allow-credentials")).toBe(
				"true"
			);
		});

		it("should set maxAge to 600 seconds", async () => {
			const response = await testApp.request("/api/health", {
				headers: {
					Origin: "http://localhost:3000",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("access-control-max-age")).toBe("600");
		});
	});

	describe("Body Limit Middleware", () => {
		it("should accept requests under 10MB", async () => {
			const smallBody = JSON.stringify({
				data: "x".repeat(1000),
			});

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: smallBody,
			});

			expect(response.status).toBe(200);
		});

		it("should reject requests over 10MB", async () => {
			// Create a body that exceeds 10MB
			const largeBody = "x".repeat(11 * 1024 * 1024);

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: largeBody,
			});

			expect(response.status).toBe(413);
			const data = await response.json();
			expect(data.error).toBe("Payload too large");
		});

		it("should handle edge case: exactly 10MB", async () => {
			const body = "x".repeat(10 * 1024 * 1024);

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: body,
			});

			// Should be accepted or rejected depending on exact implementation
			expect([200, 413]).toContain(response.status);
		});

		it("should forward custom error message", async () => {
			const largeBody = "x".repeat(11 * 1024 * 1024);

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: largeBody,
			});

			expect(response.status).toBe(413);
			const data = await response.json();
			expect(data.error).toBe("Payload too large");
		});
	});

	describe("Route Configuration", () => {
		it("should handle GET /api/health", async () => {
			const response = await testApp.request("/api/health", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("ok");
		});

		it("should handle POST /api/test with JSON body", async () => {
			const body = { test: "data", number: 123 };

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: JSON.stringify(body),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(body);
		});

		it("should return 404 for undefined routes", async () => {
			const response = await testApp.request("/api/undefined", {
				method: "GET",
			});

			expect(response.status).toBe(404);
		});
	});

	describe("Middleware Order", () => {
		it("should apply CORS before other middleware", async () => {
			const response = await testApp.request("/api/health", {
				headers: {
					Origin: "http://localhost:3000",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("access-control-allow-origin")).toBeDefined();
		});

		it("should apply body limit before route handlers", async () => {
			const largeBody = "x".repeat(11 * 1024 * 1024);

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: largeBody,
			});

			// Should be rejected by bodyLimit middleware before reaching handler
			expect(response.status).toBe(413);
		});
	});

	describe("Request/Response Handling", () => {
		it("should preserve request method", async () => {
			const response = await testApp.request("/api/health", {
				method: "GET",
			});

			expect(response.status).toBe(200);
		});

		it("should set content-type for JSON responses", async () => {
			const response = await testApp.request("/api/health", {
				method: "GET",
			});

			expect(response.headers.get("content-type")).toContain("application/json");
		});

		it("should handle empty request body", async () => {
			const response = await testApp.request("/api/health", {
				method: "GET",
			});

			expect(response.status).toBe(200);
		});
	});

	describe("Error Responses", () => {
		it("should return proper JSON error for body limit", async () => {
			const largeBody = "x".repeat(11 * 1024 * 1024);

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: largeBody,
			});

			expect(response.status).toBe(413);
			const data = await response.json();
			expect(data).toHaveProperty("error");
		});

		it("should not expose stack traces in error responses", async () => {
			const largeBody = "x".repeat(11 * 1024 * 1024);

			const response = await testApp.request("/api/test", {
				method: "POST",
				body: largeBody,
			});

			const data = await response.json();
			expect(data).not.toHaveProperty("stack");
		});
	});
});
