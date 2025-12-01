import { auth } from "@snapback/auth";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as keysService from "../../services/keys";
import keysRoute from "../keys";

// Mock the auth module
vi.mock("@snapback/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

// Mock the keys service
vi.mock("../../services/keys", () => ({
	createApiKey: vi.fn(),
	revokeApiKey: vi.fn(),
	getApiKey: vi.fn(),
}));

describe("AUTH2: API endpoints for rotate/revoke", () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		app.route("/api/v1", keysRoute);

		// Reset mocks
		vi.resetAllMocks();
	});

	it("keysapi-001: should create a new API key and return it once with the full key value", async () => {
		const mockUser = { id: "user-123", email: "test@example.com" };
		const mockApiKey = {
			id: "key-123",
			key: "sb_live_testkey123",
			userId: "user-123",
			createdAt: new Date(),
			permissions: { policyEvaluation: true },
		};

		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({ user: mockUser });

		// Mock createApiKey service
		(keysService.createApiKey as vi.Mock).mockResolvedValue(mockApiKey);

		const res = await app.request("/api/v1/keys", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				permissions: { policyEvaluation: true },
			}),
		});

		expect(res.status).toBe(201);
		const data = await res.json();
		expect(data).toEqual({
			id: "key-123",
			key: "sb_live_testkey123",
			createdAt: mockApiKey.createdAt.toISOString(),
			permissions: { policyEvaluation: true },
		});

		// Verify the service was called with correct parameters
		expect(keysService.createApiKey).toHaveBeenCalledWith("user-123", { policyEvaluation: true }, undefined);
	});

	it("keysapi-002: should revoke an API key and return success message", async () => {
		const mockUser = { id: "user-123", email: "test@example.com" };

		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({ user: mockUser });

		// Mock getApiKey service to verify ownership
		(keysService.getApiKey as vi.Mock).mockResolvedValue({
			id: "key-123",
			userId: "user-123",
			createdAt: new Date(),
			permissions: {},
		});

		// Mock revokeApiKey service
		(keysService.revokeApiKey as vi.Mock).mockResolvedValue(true);

		const res = await app.request("/api/v1/keys/revoke", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: "key-123",
			}),
		});

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ message: "API key revoked successfully" });

		// Verify the service was called with correct parameters
		expect(keysService.revokeApiKey).toHaveBeenCalledWith("key-123");
	});

	it("should return 401 when user is not authenticated", async () => {
		// Mock auth session to return null (unauthenticated)
		(auth.api.getSession as vi.Mock).mockResolvedValue(null);

		const res = await app.request("/api/v1/keys", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				permissions: { policyEvaluation: true },
			}),
		});

		expect(res.status).toBe(401);
		const data = await res.json();
		expect(data).toEqual({ error: "Unauthorized" });
	});

	it("should return 404 when trying to revoke a non-existent key", async () => {
		const mockUser = { id: "user-123", email: "test@example.com" };

		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({ user: mockUser });

		// Mock getApiKey service to return null (key not found)
		(keysService.getApiKey as vi.Mock).mockResolvedValue(null);

		const res = await app.request("/api/v1/keys/revoke", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: "non-existent-key",
			}),
		});

		expect(res.status).toBe(404);
		const data = await res.json();
		expect(data).toEqual({ error: "API key not found" });
	});

	it("should return 403 when trying to revoke another user's key", async () => {
		const mockUser = { id: "user-123", email: "test@example.com" };

		// Mock auth session
		(auth.api.getSession as vi.Mock).mockResolvedValue({ user: mockUser });

		// Mock getApiKey service to return another user's key
		(keysService.getApiKey as vi.Mock).mockResolvedValue({
			id: "key-456",
			userId: "user-456", // Different user ID
			createdAt: new Date(),
			permissions: {},
		});

		const res = await app.request("/api/v1/keys/revoke", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: "key-456",
			}),
		});

		expect(res.status).toBe(403);
		const data = await res.json();
		expect(data).toEqual({ error: "Forbidden" });
	});
});
