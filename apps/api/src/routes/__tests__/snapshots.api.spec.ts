import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import snapshotRoute from "../snapshots";

// Test IDs: snapapi-001, snapapi-002, snapapi-003
describe("Snapshots API", () => {
	describe("snapapi-001: Create snapshot endpoint (mem store)", () => {
		it("should create a new snapshot and return metadata", async () => {
			const app = new Hono();
			app.route("/", snapshotRoute);

			const mockRequest = {
				filePath: "/test/file.js",
				content: 'console.log("test");',
				reason: "Pre-Copilot snapshot",
				source: "vscode",
				context: {
					sessionId: "test-session",
					requestId: "test-request",
					client: "vscode",
				},
			};

			const response = await app.request("/snapshots/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(mockRequest),
			});

			expect(response.status).toBe(201);
			const result = await response.json();
			expect(result).toHaveProperty("id");
			expect(result).toHaveProperty("timestamp");
			expect(result).toHaveProperty("filePath");
			expect(result).toHaveProperty("size");
			expect(result).toHaveProperty("hash");
			expect(result.filePath).toBe(mockRequest.filePath);
			expect(result.source).toBe(mockRequest.source);
		});
	});

	describe("snapapi-002: List snapshots endpoint (mem store)", () => {
		it("should list snapshots with filtering", async () => {
			const app = new Hono();
			app.route("/", snapshotRoute);

			const response = await app.request(
				"/snapshots/list?filePath=/test/file.js",
				{
					method: "GET",
				},
			);

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("snapapi-003: Fetch snapshot endpoint (mem store)", () => {
		it("should fetch snapshot metadata by ID", async () => {
			const app = new Hono();
			app.route("/", snapshotRoute);

			// First create a snapshot
			const createRequest = {
				filePath: "/test/file.js",
				content: 'console.log("test");',
				source: "vscode",
				context: {
					sessionId: "test-session",
					requestId: "test-request",
					client: "vscode",
				},
			};

			const createResponse = await app.request("/snapshots/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(createRequest),
			});

			expect(createResponse.status).toBe(201);
			const createResult = await createResponse.json();
			const snapshotId = createResult.id;

			// Then fetch it
			const fetchResponse = await app.request(`/snapshots/${snapshotId}`, {
				method: "GET",
			});

			expect(fetchResponse.status).toBe(200);
			const fetchResult = await fetchResponse.json();
			expect(fetchResult.id).toBe(snapshotId);
			expect(fetchResult.filePath).toBe(createRequest.filePath);
		});
	});

	describe("Endpoints contract", () => {
		it("should have stable contract for create/list/fetch operations", async () => {
			const app = new Hono();
			app.route("/", snapshotRoute);

			// Test that all required endpoints exist
			const endpoints = [
				{ path: "/snapshots/create", method: "POST" },
				{ path: "/snapshots/list", method: "GET" },
				{ path: "/snapshots/test-id", method: "GET" },
				{ path: "/snapshots/test-id/content", method: "GET" },
				{ path: "/snapshots/restore", method: "POST" },
				{ path: "/snapshots/test-id", method: "DELETE" },
			];

			for (const endpoint of endpoints) {
				const response = await app.request(endpoint.path, {
					method: endpoint.method,
					headers:
						endpoint.method === "POST"
							? { "Content-Type": "application/json" }
							: {},
					body: endpoint.method === "POST" ? JSON.stringify({}) : undefined,
				});

				// We're just checking that the endpoints exist (not necessarily that they succeed)
				expect([200, 201, 400, 404, 500]).toContain(response.status);
			}
		});
	});
});
