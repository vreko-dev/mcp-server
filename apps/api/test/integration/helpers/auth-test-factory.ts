/**
 * Auth Middleware Test Factory & Helpers
 *
 * Provides reusable utilities for testing auth middleware with real Better Auth.
 * Centralizes test setup to reduce boilerplate and improve maintainability.
 *
 * @see apps/api/test/integration/auth-middleware.red.test.ts
 */

import type { Context, Next } from "hono";
import { SignJWT } from "jose";
import { vi } from "vitest";

// ============================================================================
// Constants
// ============================================================================

/**
 * Test secret used for JWT signing in tests
 * Must match BETTER_AUTH_SECRET from environment
 */
export const TEST_SECRET = "dev-secret-minimum-32-characters-for-local-dev";

/**
 * Test user credentials for auth tests
 */
export const TEST_CREDENTIALS = {
	userId: "user_123",
	email: "user@example.com",
	role: "user" as const,
};

/**
 * Alternative test user (admin)
 */
export const TEST_ADMIN_CREDENTIALS = {
	userId: "admin_456",
	email: "admin@example.com",
	role: "admin" as const,
};

// ============================================================================
// JWT Creation Helpers
// ============================================================================

/**
 * Create a valid JWT signed with test secret
 *
 * Used to test real JWT verification in auth.api.getSession()
 *
 * @param payload - JWT payload (sub, email, custom claims)
 * @param secret - Signing secret (defaults to TEST_SECRET)
 * @returns Signed JWT string
 */
export async function createSignedJWT(payload: Record<string, any>, secret: string = TEST_SECRET): Promise<string> {
	const secretKey = new TextEncoder().encode(secret);

	const jwt = await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(secretKey);

	return jwt;
}

/**
 * Create an expired JWT token for testing expiration handling
 *
 * @param payload - JWT payload
 * @param secret - Signing secret
 * @returns Expired JWT string
 */
export async function createExpiredJWT(payload: Record<string, any>, secret: string = TEST_SECRET): Promise<string> {
	const secretKey = new TextEncoder().encode(secret);
	const now = Math.floor(Date.now() / 1000);

	const expiredPayload = {
		...payload,
		iat: now - 7200, // Issued 2 hours ago
		exp: now - 3600, // Expired 1 hour ago
	};

	const jwt = await new SignJWT(expiredPayload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(secretKey);

	return jwt;
}

/**
 * Create an invalid JWT with wrong signature
 *
 * @returns JWT with invalid signature
 */
export function createInvalidSignatureJWT(): string {
	return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.invalid_signature_not_matching_secret";
}

// ============================================================================
// Hono Context Helpers
// ============================================================================

/**
 * Create a mock Hono Context for middleware testing
 *
 * Supports:
 * - Authorization header with JWT token
 * - Context.get() and Context.set() for data storage
 * - Raw headers object for Better Auth integration
 *
 * @param authHeader - Optional authorization header (e.g., "Bearer <token>")
 * @returns Mock Hono Context
 */
export function createMockContext(authHeader?: string): Context {
	const contextData = new Map<string, any>();

	const mockContext = {
		req: {
			header: (name: string) => {
				if (name === "Authorization" && authHeader) return authHeader;
				return undefined;
			},
			raw: {
				headers: new Headers(authHeader ? { authorization: authHeader } : {}),
			},
		},
		set: (key: string, value: any) => {
			contextData.set(key, value);
			return mockContext;
		},
		get: (key: string) => contextData.get(key),
		json: vi.fn((data: any, status?: number) => {
			// Return a mock Response object
			return new Response(JSON.stringify(data), {
				status: status || 200,
				headers: { "Content-Type": "application/json" },
			});
		}),
	} as any;

	return mockContext;
}

/**
 * Create a mock Next function for middleware chaining
 *
 * @returns Mock Next function (returns resolved undefined)
 */
export function createMockNext(): Next {
	return vi.fn().mockResolvedValue(undefined);
}

// ============================================================================
// Test Setup Helpers
// ============================================================================

/**
 * Create default JWT payload for standard user
 * @param overrides - Override default values
 * @returns JWT payload
 */
export function createJWTPayload(overrides: Record<string, any> = {}): Record<string, any> {
	return {
		sub: TEST_CREDENTIALS.userId,
		email: TEST_CREDENTIALS.email,
		...overrides,
	};
}

/**
 * Create default JWT payload for admin user
 * @param overrides - Override default values
 * @returns JWT payload
 */
export function createAdminJWTPayload(overrides: Record<string, any> = {}): Record<string, any> {
	return {
		sub: TEST_ADMIN_CREDENTIALS.userId,
		email: TEST_ADMIN_CREDENTIALS.email,
		role: TEST_ADMIN_CREDENTIALS.role,
		...overrides,
	};
}

/**
 * Quickly create a Bearer token for testing
 *
 * @param payload - JWT payload
 * @param secret - Signing secret
 * @returns "Bearer <token>" authorization header value
 */
export async function createBearerToken(
	payload: Record<string, any> = {},
	secret: string = TEST_SECRET,
): Promise<string> {
	const jwt = await createSignedJWT(payload, secret);
	return `Bearer ${jwt}`;
}

// ============================================================================
// API Key Helpers
// ============================================================================

/**
 * Create a valid API key string for testing
 * Format: sk_live_[32 random chars]
 *
 * @param prefix - Optional prefix (default: "sk_live")
 * @returns API key string
 */
export function createValidApiKey(prefix = "sk_live"): string {
	const randomChars = Array.from({ length: 32 })
		.map(() => Math.random().toString(36).charAt(2))
		.join("")
		.substring(0, 32);
	return `${prefix}_${randomChars}`;
}

/**
 * Create an invalid API key format
 * @returns Malformed API key
 */
export function createInvalidApiKey(): string {
	return "invalid_key_format";
}

// ============================================================================
// Plan & Permission Helpers
// ============================================================================

/**
 * Create JWT payload with specific plan
 *
 * @param plan - Subscription plan
 * @param userId - User ID (default: TEST_CREDENTIALS.userId)
 * @returns JWT payload with plan info
 */
export function createJWTPayloadWithPlan(
	plan: "free" | "pro" | "team" | "enterprise" = "free",
	userId: string = TEST_CREDENTIALS.userId,
): Record<string, any> {
	return {
		sub: userId,
		email: TEST_CREDENTIALS.email,
		plan,
	};
}

/**
 * Create JWT payload with role and permissions
 *
 * @param role - User role
 * @param userId - User ID
 * @returns JWT payload with role
 */
export function createJWTPayloadWithRole(
	role: "admin" | "user" | "viewer" = "user",
	userId: string = TEST_CREDENTIALS.userId,
): Record<string, any> {
	return {
		sub: userId,
		email: TEST_CREDENTIALS.email,
		role,
	};
}

/**
 * Create JWT payload with org IDs
 *
 * @param orgIds - Organization IDs user belongs to
 * @param userId - User ID
 * @returns JWT payload with org membership
 */
export function createJWTPayloadWithOrgs(
	orgIds: string[] = ["org_123"],
	userId: string = TEST_CREDENTIALS.userId,
): Record<string, any> {
	return {
		sub: userId,
		email: TEST_CREDENTIALS.email,
		orgIds,
	};
}
