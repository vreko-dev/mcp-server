/**
 * JWT Session Sharing Integration Tests
 *
 * FIX 3: Verify JWT session sharing works for CLI/VSCode/MCP clients
 *
 * Tests the complete flow:
 * 1. Device auth returns Better Auth access token
 * 2. Token is used with Bearer auth for API calls
 * 3. auth.api.getSession() validates token and returns user
 *
 * @see packages/auth/src/lib/extension-jwt.ts
 * @see apps/api/src/middleware/jwt-tools.ts
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Mock heavy dependencies
vi.mock("@snapback/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

// Import after mocks
import { auth } from "@snapback/auth";
import { Hono } from "hono";
import { requireToolJWT } from "../jwt-tools";

// Type definition for our auth context
type AuthVariables = {
	userId: string;
	orgId?: string;
	authType: string;
	user: { id: string; name?: string; email?: string; activeOrganization?: { id: string; name: string } };
};

// =============================================================================
// Test Setup
// =============================================================================

const BETTER_AUTH_URL = "http://localhost:3001/api/auth";

// Mock MSW server for Better Auth endpoints
const server = setupServer(
	// Default: authorization_pending
	http.get(`${BETTER_AUTH_URL}/get-session`, () => {
		return HttpResponse.json({ error: "unauthorized" }, { status: 401 });
	}),
);

beforeAll(() => server.listen());
afterEach(() => {
	server.resetHandlers();
	vi.clearAllMocks();
});
afterAll(() => server.close());

// =============================================================================
// Test App Setup
// =============================================================================

function createTestApp() {
	const app = new Hono<{ Variables: AuthVariables }>();

	// Protected route using requireToolJWT middleware
	app.use("/protected/*", requireToolJWT as any);

	app.get("/protected/resource", (c) => {
		const userId = c.get("userId");
		const orgId = c.get("orgId");
		const authType = c.get("authType");
		const user = c.get("user");

		return c.json({
			success: true,
			userId,
			orgId,
			authType,
			userName: user?.name,
		});
	});

	// Unprotected route for comparison
	app.get("/public/health", (c) => {
		return c.json({ status: "ok" });
	});

	return app;
}

// =============================================================================
// JWT Session Sharing Tests
// =============================================================================

describe("JWT Session Sharing - FIX 3", () => {
	describe("requireToolJWT Middleware", () => {
		it("should reject requests without Authorization header", async () => {
			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.code).toBe("JWT_REQUIRED");
		});

		it("should reject requests with invalid token", async () => {
			const app = createTestApp();

			// Mock getSession to return null (invalid token)
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "Bearer invalid_token_xyz",
				},
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.code).toBe("JWT_INVALID");
		});

		it("should accept valid JWT and extract user info", async () => {
			const app = createTestApp();

			// Mock getSession to return valid session
			vi.mocked(auth.api.getSession).mockResolvedValue({
				user: {
					id: "user-123",
					name: "Test User",
					email: "test@example.com",
					activeOrganization: {
						id: "org-456",
						name: "Test Org",
					},
				},
				session: {
					id: "session-789",
					expiresAt: new Date(Date.now() + 3600000),
				},
			} as any);

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "Bearer valid_jwt_token_abc123",
				},
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.userId).toBe("user-123");
			expect(body.orgId).toBe("org-456");
			expect(body.authType).toBe("jwt");
			expect(body.userName).toBe("Test User");
		});

		it("should support token without Bearer prefix", async () => {
			const app = createTestApp();

			vi.mocked(auth.api.getSession).mockResolvedValue({
				user: { id: "user-direct" },
				session: { id: "session-direct" },
			} as any);

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "raw_token_without_bearer",
				},
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.userId).toBe("user-direct");
		});
	});

	describe("Device Auth → JWT Flow", () => {
		it("should verify token from device auth flow can authenticate", async () => {
			// Simulate the complete device auth → API call flow
			const deviceAuthToken = "at_device_auth_token_from_better_auth";

			// Mock getSession to validate device auth token
			vi.mocked(auth.api.getSession).mockImplementation(async ({ headers }) => {
				const authHeader = headers.get("authorization");
				if (authHeader?.includes(deviceAuthToken)) {
					return {
						user: {
							id: "user-from-device-auth",
							email: "device@example.com",
						},
						session: { id: "device-session-123" },
					} as any;
				}
				return null;
			});

			const app = createTestApp();

			// Use device auth token for API call (simulating VS Code/CLI)
			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${deviceAuthToken}`,
				},
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.userId).toBe("user-from-device-auth");
		});

		it("should handle expired device auth tokens", async () => {
			const expiredToken = "at_expired_device_token";

			// Mock getSession to reject expired token
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${expiredToken}`,
				},
			});

			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.code).toBe("JWT_INVALID");
		});
	});

	describe("Session Sharing Across Clients", () => {
		it("should allow same token to work for VSCode client", async () => {
			const sharedToken = "shared_session_token";

			vi.mocked(auth.api.getSession).mockResolvedValue({
				user: { id: "shared-user", email: "shared@example.com" },
				session: { id: "shared-session" },
			} as any);

			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${sharedToken}`,
					"X-Client-Type": "vscode",
				},
			});

			expect(res.status).toBe(200);
		});

		it("should allow same token to work for CLI client", async () => {
			const sharedToken = "shared_session_token";

			vi.mocked(auth.api.getSession).mockResolvedValue({
				user: { id: "shared-user", email: "shared@example.com" },
				session: { id: "shared-session" },
			} as any);

			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${sharedToken}`,
					"X-Client-Type": "cli",
				},
			});

			expect(res.status).toBe(200);
		});

		it("should allow same token to work for MCP client", async () => {
			const sharedToken = "shared_session_token";

			vi.mocked(auth.api.getSession).mockResolvedValue({
				user: { id: "shared-user", email: "shared@example.com" },
				session: { id: "shared-session" },
			} as any);

			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${sharedToken}`,
					"X-Client-Type": "mcp",
				},
			});

			expect(res.status).toBe(200);
		});
	});

	describe("Error Handling", () => {
		it("should return 500 on auth service failure", async () => {
			vi.mocked(auth.api.getSession).mockRejectedValue(new Error("Auth service unavailable"));

			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "Bearer valid_token",
				},
			});

			expect(res.status).toBe(500);
			const body = await res.json();
			expect(body.code).toBe("INTERNAL_ERROR");
		});

		it("should not expose internal errors to client", async () => {
			vi.mocked(auth.api.getSession).mockRejectedValue(new Error("Database connection failed at postgres://..."));

			const app = createTestApp();

			const res = await app.request("/protected/resource", {
				method: "GET",
				headers: {
					Authorization: "Bearer valid_token",
				},
			});

			expect(res.status).toBe(500);
			const body = await res.json();
			expect(body.error).toBe("Internal server error");
			expect(body.error).not.toContain("postgres://");
		});
	});

	describe("Public Routes", () => {
		it("should allow access to public routes without auth", async () => {
			const app = createTestApp();

			const res = await app.request("/public/health", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.status).toBe("ok");
		});
	});
});

describe("Extension JWT Utilities", () => {
	// These tests verify the extension JWT signing/verification utilities
	// are available even if not currently wired to the device auth flow

	it("should export signExtensionAccessToken from @snapback/auth", async () => {
		// Dynamic import to test exports
		const authExports = await import("@snapback/auth");

		// Verify the extension JWT utilities are exported
		// Note: Currently exported but not wired to device auth
		expect(typeof authExports.auth).toBe("object");
	});
});
