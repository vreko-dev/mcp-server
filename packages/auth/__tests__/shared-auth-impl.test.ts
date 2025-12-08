import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BetterAuthAdapter } from "../src/better-auth-adapter";
import { AuthError, InsufficientRoleError, InsufficientScopesError } from "../src/errors";
import { SnapbackAuthImpl } from "../src/shared-auth-impl";

function createMockAdapter(): {
	adapter: BetterAuthAdapter;
	mocks: {
		getSessionFromHeaders: vi.Mock;
		verifyApiKeyOrNull: vi.Mock;
		getOrganization: vi.Mock;
		getOrgMembership: vi.Mock;
		getRichSessionFromHeaders: vi.Mock;
		isEmailVerified: vi.Mock;
		isTwoFactorEnabled: vi.Mock;
		hasPasskey: vi.Mock;
	};
} {
	const getSessionFromHeaders = vi.fn();
	const verifyApiKeyOrNull = vi.fn();
	const getOrganization = vi.fn();
	const getOrgMembership = vi.fn();
	const getRichSessionFromHeaders = vi.fn();
	const isEmailVerified = vi.fn();
	const isTwoFactorEnabled = vi.fn();
	const hasPasskey = vi.fn();

	return {
		adapter: {
			getSessionFromHeaders,
			verifyApiKeyOrNull,
			getOrganization,
			getOrgMembership,
			getRichSessionFromHeaders,
			isEmailVerified,
			isTwoFactorEnabled,
			hasPasskey,
		},
		mocks: {
			getSessionFromHeaders,
			verifyApiKeyOrNull,
			getOrganization,
			getOrgMembership,
			getRichSessionFromHeaders,
			isEmailVerified,
			isTwoFactorEnabled,
			hasPasskey,
		},
	};
}

describe("SnapbackAuth Implementation", () => {
	let auth: SnapbackAuthImpl;
	let mocks: ReturnType<typeof createMockAdapter>["mocks"];

	beforeEach(() => {
		const { adapter, mocks: m } = createMockAdapter();
		auth = new SnapbackAuthImpl(adapter);
		mocks = m;

		// default: everything unauthenticated
		mocks.getSessionFromHeaders.mockResolvedValue(null);
		mocks.verifyApiKeyOrNull.mockResolvedValue(null);
		mocks.getOrganization.mockResolvedValue(null);
		mocks.getOrgMembership.mockResolvedValue(null);
	});

	it("should return null context when no auth is provided", async () => {
		const request = new Request("http://localhost");

		const context = await auth.getContextFromRequest(request);
		expect(context).toBeNull();
	});

	it("should get context from x-auth-context header", async () => {
		const mockContext = {
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			authenticatedVia: "session",
			plan: "free",
		};

		const request = new Request("http://localhost", {
			headers: {
				"x-auth-context": JSON.stringify(mockContext),
			},
		});

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual(mockContext);
	});

	it("should get context from session", async () => {
		const mockSession = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
		};

		const request = new Request("http://localhost");

		mocks.getRichSessionFromHeaders.mockResolvedValue(mockSession);
		mocks.getOrgMembership.mockResolvedValue({
			role: "owner",
		});
		mocks.isEmailVerified.mockResolvedValue(true);
		mocks.isTwoFactorEnabled.mockResolvedValue(true);
		mocks.hasPasskey.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "owner",
			authenticatedVia: "session",
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: true,
			twoFactorEnabled: true,
			passkeyRegistered: true,
		});
	});

	it("should get context from API key", async () => {
		const mockApiKeyResult = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
			apiKey: {
				id: "key-abc",
				scopes: ["read", "write"],
			},
		};

		const request = new Request("http://localhost", {
			headers: {
				authorization: "Bearer sk_live_1234567890abcdef",
			},
		});

		mocks.verifyApiKeyOrNull.mockResolvedValue(mockApiKeyResult);
		mocks.getOrgMembership.mockResolvedValue({
			role: "member",
		});
		mocks.isEmailVerified.mockResolvedValue(true);
		// twoFactorEnabled and passkeyRegistered remain undefined for API keys

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "member",
			authenticatedVia: "apiKey",
			apiKeyId: "key-abc",
			apiKeyScopes: ["read", "write"],
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: true,
		});
	});

	it("should require auth and throw AuthError when no context", async () => {
		const request = new Request("http://localhost");

		await expect(auth.requireAuth(request)).rejects.toThrow(AuthError);
		await expect(auth.requireAuth(request)).rejects.toThrow("Authentication required");
	});

	it("should require auth with role check", async () => {
		const mockContext = {
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			authenticatedVia: "session",
			plan: "free",
		};

		const request = new Request("http://localhost");

		// Mock getContextFromRequest to return the mock context
		vi.spyOn(auth, "getContextFromRequest").mockResolvedValue(mockContext);

		// Should pass when role matches
		await expect(auth.requireAuth(request, { roles: ["user"] })).resolves.toEqual(mockContext);

		// Should throw when role doesn't match
		await expect(auth.requireAuth(request, { roles: ["admin"] })).rejects.toThrow(InsufficientRoleError);
	});

	it("should require auth with scope check", async () => {
		const mockContext = {
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			authenticatedVia: "apiKey",
			apiKeyScopes: ["read", "write"],
			plan: "free",
		};

		const request = new Request("http://localhost");

		// Mock getContextFromRequest to return the mock context
		vi.spyOn(auth, "getContextFromRequest").mockResolvedValue(mockContext);

		// Should pass when all scopes are present
		await expect(auth.requireAuth(request, { scopes: ["read"] })).resolves.toEqual(mockContext);
		await expect(auth.requireAuth(request, { scopes: ["read", "write"] })).resolves.toEqual(mockContext);

		// Should throw when missing scopes
		await expect(
			auth.requireAuth(request, {
				scopes: ["read", "write", "delete"],
			}),
		).rejects.toThrow(InsufficientScopesError);
	});

	// New tests to cover all auth context paths
	it("should get context from expired/invalid session", async () => {
		const request = new Request("http://localhost");

		// All auth methods should return null/undefined
		mocks.getSessionFromHeaders.mockResolvedValue(null);
		mocks.getRichSessionFromHeaders.mockResolvedValue({
			session: null,
			user: null,
		});
		mocks.verifyApiKeyOrNull.mockResolvedValue(null);
		mocks.getOrgMembership.mockResolvedValue(null);

		const context = await auth.getContextFromRequest(request);
		expect(context).toBeNull();
	});

	it("should get context from valid access token via Authorization: Bearer", async () => {
		const mockTokenSession = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
		};

		const request = new Request("http://localhost", {
			headers: {
				authorization: "Bearer valid_token_1234567890",
			},
		});

		// Set up mocks:
		// For this test, we want:
		// 1. First getRichSessionFromHeaders (cookies) returns null
		// 2. First verifyApiKey (Bearer token as API key) returns null
		// 3. Second getRichSessionFromHeaders (Bearer token as session) returns session
		mocks.getRichSessionFromHeaders
			.mockImplementationOnce((_headers) => {
				// First call is for cookies (no Authorization header in our request for cookies)
				return Promise.resolve({ session: null, user: null });
			})
			.mockImplementationOnce((headers) => {
				// Second call is for Bearer token (Authorization header present)
				if (headers.get("Authorization") === "Bearer valid_token_1234567890") {
					return Promise.resolve(mockTokenSession);
				}
				return Promise.resolve({ session: null, user: null });
			});
		mocks.verifyApiKeyOrNull.mockResolvedValue(null);
		mocks.getOrgMembership.mockResolvedValue({
			role: "member",
		});
		mocks.isEmailVerified.mockResolvedValue(true);
		mocks.isTwoFactorEnabled.mockResolvedValue(true);
		mocks.hasPasskey.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "member",
			authenticatedVia: "accessToken",
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: true,
			twoFactorEnabled: true,
			passkeyRegistered: true,
		});
	});

	it("should return null for invalid token/API key", async () => {
		const request = new Request("http://localhost", {
			headers: {
				authorization: "Bearer invalid_token_1234567890",
			},
		});

		// All methods should return null
		mocks.getSessionFromHeaders.mockResolvedValue(null);
		mocks.getRichSessionFromHeaders.mockResolvedValue({
			session: null,
			user: null,
		});
		mocks.verifyApiKeyOrNull.mockResolvedValue(null);
		mocks.getOrgMembership.mockResolvedValue(null);

		const context = await auth.getContextFromRequest(request);
		expect(context).toBeNull();
	});

	it("should ignore invalid x-auth-context and fall back to other methods", async () => {
		const mockSession = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
		};

		const request = new Request("http://localhost", {
			headers: {
				"x-auth-context": "invalid json", // Invalid JSON
			},
		});

		// Set up mocks - x-auth-context parsing fails, so fall back to session
		mocks.getRichSessionFromHeaders.mockResolvedValue(mockSession);
		mocks.getOrgMembership.mockResolvedValue({
			role: "owner",
		});
		mocks.isEmailVerified.mockResolvedValue(true);
		mocks.isTwoFactorEnabled.mockResolvedValue(true);
		mocks.hasPasskey.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "owner",
			authenticatedVia: "session",
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: true,
			twoFactorEnabled: true,
			passkeyRegistered: true,
		});
	});

	it("should handle Better Auth throwing errors", async () => {
		const request = new Request("http://localhost");

		// All methods should return null (as if they caught errors) - this simulates the adapter's error handling
		mocks.getSessionFromHeaders.mockResolvedValue(null);
		mocks.getRichSessionFromHeaders.mockResolvedValue({
			session: null,
			user: null,
		});
		mocks.verifyApiKeyOrNull.mockResolvedValue(null);
		mocks.getOrgMembership.mockResolvedValue(null);

		// Should not throw but return null
		const context = await auth.getContextFromRequest(request);
		expect(context).toBeNull();
	});

	it("should handle user with org correctly", async () => {
		const mockSession = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
		};

		const mockOrganization = {
			id: "org-789",
			name: "Test Organization",
			slug: "test-org",
		};

		const request = new Request("http://localhost");

		// Set up mocks
		mocks.getRichSessionFromHeaders.mockResolvedValue(mockSession);
		mocks.getOrganization.mockResolvedValue(mockOrganization);
		mocks.getOrgMembership.mockResolvedValue({
			role: "admin",
		});
		mocks.isEmailVerified.mockResolvedValue(true);
		mocks.isTwoFactorEnabled.mockResolvedValue(true);
		mocks.hasPasskey.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);

		// Test getOrganizationContext
		const orgContext = await auth.getOrganizationContext(context!);
		expect(orgContext).toEqual({
			id: "org-789",
			name: "Test Organization",
			slug: "test-org",
			role: "admin",
		});
	});

	it("should handle org lookup failure", async () => {
		const mockSession = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
		};

		const request = new Request("http://localhost");

		// Set up mocks
		mocks.getRichSessionFromHeaders.mockResolvedValue(mockSession);
		mocks.getOrganization.mockResolvedValue(null); // Org not found
		mocks.getOrgMembership.mockResolvedValue({
			role: "member",
		});
		mocks.isEmailVerified.mockResolvedValue(true);
		mocks.isTwoFactorEnabled.mockResolvedValue(true);
		mocks.hasPasskey.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);
		expect(context?.orgId).toBe("org-789");

		// Test getOrganizationContext with org lookup failure
		const orgContext = await auth.getOrganizationContext(context!);
		expect(orgContext).toBeNull();
	});

	// Test precedence logic
	it("should prioritize x-auth-context over other methods when valid", async () => {
		const mockContext = {
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			authenticatedVia: "session",
			plan: "free",
		};

		const request = new Request("http://localhost", {
			headers: {
				"x-auth-context": JSON.stringify(mockContext),
			},
		});

		// x-auth-context should be prioritized, so other methods shouldn't be called
		// But we still need to mock the new methods for consistency
		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual(mockContext);
	});

	// Test ORPC integration
	it("should throw AuthError with correct status code in requireAuth", async () => {
		const request = new Request("http://localhost");

		// All methods return null, so requireAuth should throw
		mocks.getSessionFromHeaders.mockResolvedValue(null);
		mocks.getRichSessionFromHeaders.mockResolvedValue({
			session: null,
			user: null,
		});
		mocks.verifyApiKeyOrNull.mockResolvedValue(null);
		mocks.getOrgMembership.mockResolvedValue(null);

		await expect(auth.requireAuth(request)).rejects.toThrow(AuthError);
		await expect(auth.requireAuth(request)).rejects.toThrow("Authentication required");

		try {
			await auth.requireAuth(request);
		} catch (error) {
			expect((error as AuthError).statusCode).toBe(401);
			expect((error as AuthError).code).toBe("UNAUTHENTICATED");
		}
	});

	// Tests for enriched context mapping (Pass 2)
	it("should include enriched fields in session context", async () => {
		const mockRichSession = {
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
		};

		const request = new Request("http://localhost");

		mocks.getSessionFromHeaders.mockResolvedValue(mockRichSession);
		mocks.getOrgMembership.mockResolvedValue({
			role: "owner",
		});

		// Mock the new adapter methods
		mocks.getRichSessionFromHeaders.mockResolvedValue(mockRichSession);
		mocks.isEmailVerified.mockResolvedValue(true);
		mocks.isTwoFactorEnabled.mockResolvedValue(true);
		mocks.hasPasskey.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "owner",
			authenticatedVia: "session",
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: true,
			twoFactorEnabled: true,
			passkeyRegistered: true,
		});
	});

	it("should handle adapter failures gracefully for enriched fields", async () => {
		const mockRichSession = {
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
		};

		const request = new Request("http://localhost");

		mocks.getSessionFromHeaders.mockResolvedValue(mockRichSession);
		mocks.getOrgMembership.mockResolvedValue({
			role: "owner",
		});

		// Mock the new adapter methods to throw errors (fail soft)
		mocks.getRichSessionFromHeaders.mockResolvedValue(mockRichSession);
		mocks.isEmailVerified.mockRejectedValue(new Error("Database error"));
		mocks.isTwoFactorEnabled.mockRejectedValue(new Error("Database error"));
		mocks.hasPasskey.mockRejectedValue(new Error("Database error"));

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "owner",
			authenticatedVia: "session",
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: false, // Should default to false when adapter throws
			twoFactorEnabled: false, // Should default to false when adapter throws
			passkeyRegistered: false, // Should default to false when adapter throws
		});
	});

	it("should include emailVerified for API key contexts", async () => {
		const mockApiKeyResult = {
			user: {
				id: "user-123",
				email: "test@example.com",
				role: "user",
			},
			session: {
				id: "session-456",
				expiresAt: new Date(Date.now() + 3600000),
				organizationId: "org-789",
			},
			apiKey: {
				id: "key-abc",
				scopes: ["read", "write"],
			},
		};

		const request = new Request("http://localhost", {
			headers: {
				authorization: "Bearer sk_live_1234567890abcdef",
			},
		});

		mocks.verifyApiKeyOrNull.mockResolvedValue(mockApiKeyResult);
		mocks.getOrgMembership.mockResolvedValue({
			role: "member",
		});
		mocks.isEmailVerified.mockResolvedValue(true);

		const context = await auth.getContextFromRequest(request);
		expect(context).toEqual({
			userId: "user-123",
			email: "test@example.com",
			role: "user",
			orgId: "org-789",
			orgRole: "member",
			authenticatedVia: "apiKey",
			apiKeyId: "key-abc",
			apiKeyScopes: ["read", "write"],
			sessionId: "session-456",
			expiresAt: expect.any(Date),
			plan: "free",
			emailVerified: true, // Should be included for API key contexts
			// twoFactorEnabled and passkeyRegistered remain undefined for API keys
		});
	});
});
