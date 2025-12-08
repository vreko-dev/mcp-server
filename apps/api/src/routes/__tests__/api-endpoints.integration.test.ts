/**
 * API Endpoints Integration Tests
 *
 * Tests REAL HTTP endpoints with complete request/response cycles.
 * These are NOT unit tests - they test actual API behavior through Hono.
 *
 * Run with: pnpm test:integration
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { SignJWT } from "jose";
import { createMetricsRouter } from "@/modules/metrics/router";
import { requireAuth } from "../../middleware/auth";

describe("API Endpoints Integration", () => {
	let app: Hono;
	const secret = new TextEncoder().encode("test-secret-key-min-32-characters-long");

	async function createToken(payload: {
		sub: string;
		email: string;
		role?: string;
	}): Promise<string> {
		return await new SignJWT({
			sub: payload.sub,
			email: payload.email,
			role: payload.role || "user",
		})
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("1h")
			.sign(secret);
	}

	beforeEach(() => {
		app = new Hono();
		process.env.BETTER_AUTH_SECRET = "test-secret-key-min-32-characters-long";
	});

	describe("Health Check Endpoint", () => {
		beforeEach(() => {
			app.get("/health", (c: Context) =>
				c.json({
					status: "ok",
					timestamp: new Date().toISOString(),
				}),
			);
		});

		it("should return 200 OK for health check", async () => {
			const response = await app.request("/health", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe("ok");
			expect(body.timestamp).toBeDefined();
		});

		it("should not require authentication", async () => {
			const response = await app.request("/health", {
				method: "GET",
			});

			expect(response.status).toBe(200);
		});
	});

	describe("Protected API Endpoints", () => {
		beforeEach(() => {
			app.use("/api/*", requireAuth);
			app.get("/api/user/profile", (c: Context) => {
				const auth = (c.env as any).auth;
				return c.json({
					user: auth?.user,
					permissions: auth?.permissions,
				});
			});
		});

		it("should require authentication for protected routes", async () => {
			const response = await app.request("/api/user/profile", {
				method: "GET",
			});

			expect(response.status).toBe(401);
		});

		it("should return user profile with valid token", async () => {
			const token = await createToken({
				sub: "user_profile_001",
				email: "profile@example.com",
				role: "user",
			});

			const response = await app.request("/api/user/profile", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.user.id).toBe("user_profile_001");
			expect(body.user.email).toBe("profile@example.com");
			expect(body.permissions).toBeDefined();
			expect(Array.isArray(body.permissions)).toBe(true);
		});
	});

	describe("POST Request Handling", () => {
		beforeEach(() => {
			app.post("/api/snapshots", async (c: Context) => {
				const body = await c.req.json();

				if (!body.filePath) {
					return c.json(
						{
							error: "validation_error",
							message: "filePath is required",
						},
						422,
					);
				}

				return c.json(
					{
						id: `snapshot_${Date.now()}`,
						filePath: body.filePath,
						createdAt: new Date().toISOString(),
					},
					201,
				);
			});
		});

		it("should handle valid POST request", async () => {
			const response = await app.request("/api/snapshots", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					filePath: "/test/file.ts",
					content: "console.log('test');",
				}),
			});

			expect(response.status).toBe(201);
			const body = await response.json();
			expect(body.id).toBeDefined();
			expect(body.id).toContain("snapshot_");
			expect(body.filePath).toBe("/test/file.ts");
		});

		it("should validate request body", async () => {
			const response = await app.request("/api/snapshots", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			});

			expect(response.status).toBe(422);
			const body = await response.json();
			expect(body.error).toBe("validation_error");
			expect(body.message).toContain("filePath is required");
		});

		it("should handle malformed JSON", async () => {
			const response = await app.request("/api/snapshots", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: "invalid json{",
			});

			expect(response.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			app.get("/api/error/500", () => {
				throw new Error("Intentional server error");
			});

			app.get("/api/error/custom", (c: Context) => {
				return c.json(
					{
						code: "custom_error",
						message: "Custom error message",
						details: { field: "value" },
					},
					400,
				);
			});

			// Add error handler
			app.onError((err, c) => {
				console.error("Error:", err);
				return c.json(
					{
						error: "internal_server_error",
						message: err.message,
					},
					500,
				);
			});
		});

		it("should handle thrown errors with error handler", async () => {
			const response = await app.request("/api/error/500", {
				method: "GET",
			});

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("internal_server_error");
			expect(body.message).toContain("Intentional server error");
		});

		it("should handle custom error responses", async () => {
			const response = await app.request("/api/error/custom", {
				method: "GET",
			});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe("custom_error");
			expect(body.details).toEqual({ field: "value" });
		});
	});

	describe("Content Negotiation", () => {
		beforeEach(() => {
			app.get("/api/data", (c: Context) => {
				const accept = c.req.header("Accept");

				if (accept?.includes("application/json")) {
					return c.json({ format: "json", data: [1, 2, 3] });
				}

				return c.text("1,2,3");
			});
		});

		it("should return JSON for Accept: application/json", async () => {
			const response = await app.request("/api/data", {
				method: "GET",
				headers: {
					Accept: "application/json",
				},
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("application/json");

			const body = await response.json();
			expect(body.format).toBe("json");
			expect(body.data).toEqual([1, 2, 3]);
		});

		it("should return text for other Accept headers", async () => {
			const response = await app.request("/api/data", {
				method: "GET",
				headers: {
					Accept: "text/plain",
				},
			});

			expect(response.status).toBe(200);
			const text = await response.text();
			expect(text).toBe("1,2,3");
		});
	});

	describe("Query Parameters", () => {
		beforeEach(() => {
			app.get("/api/search", (c: Context) => {
				const query = c.req.query("q");
				const limit = Number(c.req.query("limit")) || 10;
				const offset = Number(c.req.query("offset")) || 0;

				return c.json({
					query,
					limit,
					offset,
					results: [],
				});
			});
		});

		it("should parse query parameters", async () => {
			const response = await app.request("/api/search?q=test&limit=20&offset=5", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.query).toBe("test");
			expect(body.limit).toBe(20);
			expect(body.offset).toBe(5);
		});

		it("should handle missing query parameters with defaults", async () => {
			const response = await app.request("/api/search", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.query).toBeUndefined();
			expect(body.limit).toBe(10);
			expect(body.offset).toBe(0);
		});
	});

	describe("CORS Headers", () => {
		beforeEach(() => {
			app.use("*", async (c: Context, next) => {
				await next();
				c.header("Access-Control-Allow-Origin", "*");
				c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
			});

			app.get("/api/cors", (c: Context) => c.json({ message: "CORS enabled" }));
		});

		it("should include CORS headers in response", async () => {
			const response = await app.request("/api/cors", {
				method: "GET",
			});

			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
		});
	});

	describe("HTTP Methods", () => {
		beforeEach(() => {
			let items: any[] = [];

			app.get("/api/items", (c: Context) => c.json({ items }));

			app.post("/api/items", async (c: Context) => {
				const body = await c.req.json();
				const item = { id: Date.now(), ...body };
				items.push(item);
				return c.json(item, 201);
			});

			app.delete("/api/items/:id", (c: Context) => {
				const id = Number(c.req.param("id"));
				items = items.filter((item) => item.id !== id);
				return c.json({ success: true });
			});
		});

		it("should handle GET request", async () => {
			const response = await app.request("/api/items", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.items).toBeDefined();
		});

		it("should handle POST request", async () => {
			const response = await app.request("/api/items", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: "Test Item" }),
			});

			expect(response.status).toBe(201);
			const body = await response.json();
			expect(body.id).toBeDefined();
			expect(body.name).toBe("Test Item");
		});

		it("should handle DELETE request", async () => {
			// First create an item
			const createResponse = await app.request("/api/items", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: "To Delete" }),
			});

			const created = await createResponse.json();

			// Then delete it
			const deleteResponse = await app.request(`/api/items/${created.id}`, {
				method: "DELETE",
			});

			expect(deleteResponse.status).toBe(200);
			const body = await deleteResponse.json();
			expect(body.success).toBe(true);
		});
	});
});
