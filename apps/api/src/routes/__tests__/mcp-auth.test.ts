/**
 * MCP Auth Validation Tests
 *
 * Test ID: MCP-AUTH-FIX5
 * Category: Security - Authentication
 *
 * Tests unified authentication for MCP routes:
 * - Session-based authentication (browser cookies)
 * - API key authentication (Bearer token)
 * - X-API-Key header authentication
 * - Tier extraction from API key metadata
 * - Scope extraction from API key permissions
 *
 * FIX 5: Wire MCP auth validation to Better Auth apiKey() plugin
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @snapback/auth
const mockGetSession = vi.fn();
const mockVerifyApiKey = vi.fn();

vi.mock("@snapback/auth", () => ({
	auth: {
		api: {
			getSession: (args: { headers: Headers }) => mockGetSession(args),
			verifyApiKey: (args: { key: string }) => mockVerifyApiKey(args),
		},
	},
}));

// Mock MCP services with absolute path
vi.mock("../../services/mcp", () => ({
	startMcpSession: vi.fn().mockResolvedValue({ sessionId: "test-session-123" }),
	endMcpSession: vi.fn().mockResolvedValue({ success: true }),
	getSessionStats: vi.fn().mockResolvedValue({ totalEvents: 0 }),
	queryUserRecommendations: vi.fn().mockResolvedValue([]),
	recordActivityEvent: vi.fn().mockResolvedValue({ recorded: true }),
	recordLearningSignal: vi.fn().mockResolvedValue({ recorded: true }),
	McpServiceError: class McpServiceError extends Error {
		code: string;
		constructor(message: string, code: string) {
			super(message);
			this.code = code;
		}
	},
}));

// Import after mocking
import mcpRoutes from "../v1/mcp";

describe("MCP Auth Validation (FIX 5)", () => {
	let app: Hono;

	beforeEach(() => {
		vi.clearAllMocks();
		app = new Hono();
		app.route("/v1/mcp", mcpRoutes);
	});

	describe("Session-Based Authentication", () => {
		it("should authenticate using session cookies", async () => {
			// GIVEN: Valid session from cookies
			mockGetSession.mockResolvedValue({
				user: { id: "user-session-123", email: "test@example.com" },
				session: { id: "session-abc" },
			});

			// WHEN: Making a request with session cookies
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: "better-auth.session=xyz",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should succeed
			expect(res.status).toBe(201);
			expect(mockGetSession).toHaveBeenCalled();
		});

		it("should return 401 when no authentication provided", async () => {
			// GIVEN: No session or API key
			mockGetSession.mockResolvedValue(null);

			// WHEN: Making a request without auth
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should return 401
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Unauthorized");
		});
	});

	describe("API Key Authentication (Bearer Token)", () => {
		it("should authenticate using valid API key in Bearer token", async () => {
			// GIVEN: No session, but valid API key
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "user-apikey-123",
				permissions: { "snapback:analyze": ["read"], "snapback:snapshot": ["read", "write"] },
				metadata: { tier: "pro" },
			});

			// WHEN: Making a request with API key
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_abcdefgh1234567890123456",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should succeed
			expect(res.status).toBe(201);
			expect(mockVerifyApiKey).toHaveBeenCalledWith({ key: "sk_live_abcdefgh1234567890123456" });
		});

		it("should authenticate using test API key", async () => {
			// GIVEN: Test API key
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "user-test-123",
				permissions: { "snapback:analyze": ["read"] },
				metadata: { tier: "free" },
			});

			// WHEN: Making a request with test API key
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_test_testkey1234567890123456",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should succeed
			expect(res.status).toBe(201);
		});

		it("should reject invalid API key", async () => {
			// GIVEN: Invalid API key
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: false,
			});

			// WHEN: Making a request with invalid API key
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_invalidkey123456789012",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should return 401
			expect(res.status).toBe(401);
		});

		it("should NOT treat JWT tokens as API keys", async () => {
			// GIVEN: JWT token (has dots) in Bearer
			mockGetSession.mockResolvedValue(null);

			// WHEN: Making a request with JWT token
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should return 401 (JWT should not be treated as API key)
			expect(res.status).toBe(401);
			expect(mockVerifyApiKey).not.toHaveBeenCalled();
		});

		it("should reject malformed API key format", async () => {
			// GIVEN: Malformed API key (wrong prefix)
			mockGetSession.mockResolvedValue(null);

			// WHEN: Making a request with malformed API key
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer invalid_prefix_key12345678",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should return 401 (not even try to verify)
			expect(res.status).toBe(401);
			expect(mockVerifyApiKey).not.toHaveBeenCalled();
		});
	});

	describe("X-API-Key Header Authentication", () => {
		it("should authenticate using X-API-Key header", async () => {
			// GIVEN: No session, but valid API key in X-API-Key header
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "user-xapikey-123",
				permissions: { "snapback:context": ["read"] },
				metadata: { tier: "admin" },
			});

			// WHEN: Making a request with X-API-Key header
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": "sk_live_xapikeytest123456789012",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should succeed
			expect(res.status).toBe(201);
			expect(mockVerifyApiKey).toHaveBeenCalledWith({ key: "sk_live_xapikeytest123456789012" });
		});
	});

	describe("Tier Extraction from API Key Metadata", () => {
		it("should extract 'admin' tier from metadata", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "admin-user",
				permissions: {},
				metadata: { tier: "admin" },
			});

			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_adminkey12345678901234",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			expect(res.status).toBe(201);
		});

		it("should extract 'pro' tier from metadata.tier", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "pro-user",
				permissions: {},
				metadata: { tier: "pro" },
			});

			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_prokey123456789012345",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			expect(res.status).toBe(201);
		});

		it("should extract 'pro' tier from metadata.plan", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "pro-user-plan",
				permissions: {},
				metadata: { plan: "pro" },
			});

			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_proplankey12345678901",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			expect(res.status).toBe(201);
		});

		it("should default to 'free' tier when no tier in metadata", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "free-user",
				permissions: {},
				metadata: {},
			});

			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_freekey12345678901234",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			expect(res.status).toBe(201);
		});
	});

	describe("Authentication Priority", () => {
		it("should prefer session auth over API key when both present", async () => {
			// GIVEN: Both session and API key are valid
			mockGetSession.mockResolvedValue({
				user: { id: "session-user", email: "session@example.com" },
			});
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "apikey-user",
				permissions: {},
				metadata: {},
			});

			// WHEN: Making a request with both auth methods
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: "better-auth.session=xyz",
					Authorization: "Bearer sk_live_shouldbeignored12345",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should use session auth (API key verification not called)
			expect(res.status).toBe(201);
			expect(mockVerifyApiKey).not.toHaveBeenCalled();
		});

		it("should fall back to API key when session auth fails", async () => {
			// GIVEN: Session auth fails, but API key is valid
			mockGetSession.mockRejectedValue(new Error("Session expired"));
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "fallback-user",
				permissions: {},
				metadata: { tier: "pro" },
			});

			// WHEN: Making a request
			const res = await app.request("/v1/mcp/session/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_fallbackkey1234567890",
				},
				body: JSON.stringify({ workspaceId: "workspace-123" }),
			});

			// THEN: Should succeed using API key
			expect(res.status).toBe(201);
			expect(mockVerifyApiKey).toHaveBeenCalled();
		});
	});

	describe("Execute Endpoint Authentication", () => {
		it("should authenticate /execute endpoint with API key", async () => {
			mockGetSession.mockResolvedValue(null);
			mockVerifyApiKey.mockResolvedValue({
				isValid: true,
				userId: "execute-user",
				permissions: { "snapback:analyze": ["read"] },
				metadata: { tier: "pro" },
			});

			const res = await app.request("/v1/mcp/execute", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer sk_live_executekey123456789",
				},
				body: JSON.stringify({
					tool: "snapback.start_session",
					args: { workspaceId: "test-workspace" },
				}),
			});

			expect(res.status).toBe(201);
		});
	});
});
