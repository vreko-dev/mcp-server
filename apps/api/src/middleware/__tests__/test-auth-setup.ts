import { auth } from "@snapback/auth";
import type { betterAuth } from "better-auth";

/**
 * Use the existing production Better Auth instance for testing
 * This avoids dependency resolution issues and tests the real thing
 */
export function createTestAuthInstance() {
	// Return the actual auth instance from @snapback/auth
	// This is configured with all plugins and database already
	return auth as any;
}

/**
 * Create a test user and return user data
 */
export async function createTestUser(
	auth: ReturnType<typeof betterAuth>,
	userData: {
		email: string;
		password: string;
		name?: string;
	} = {
		email: "test@example.com",
		password: "TestPassword123!",
		name: "Test User",
	},
) {
	const response = await auth.api.signUpEmail({
		body: {
			email: userData.email,
			password: userData.password,
			name: userData.name || "Test User",
		},
	});

	if (!response || "error" in response) {
		throw new Error(
			`Failed to create test user: ${(response as any)?.error?.message || "Unknown error"}`,
		);
	}

	return response;
}

/**
 * Sign in and get session token
 */
export async function getTestSessionToken(
	auth: ReturnType<typeof betterAuth>,
	credentials: {
		email: string;
		password: string;
	} = {
		email: "test@example.com",
		password: "TestPassword123!",
	},
): Promise<string> {
	const response = await auth.api.signInEmail({
		body: credentials,
	});

	if (!response || "error" in response) {
		throw new Error(
			`Failed to sign in: ${(response as any)?.error?.message || "Unknown error"}`,
		);
	}

	return response.token;
}

/**
 * Create an expired session for testing expiry handling
 */
export async function createExpiredSession(
	auth: ReturnType<typeof betterAuth>,
	userId: string,
): Promise<string> {
	// Create a session manually with past expiry
	const db = (auth as any).options.database;
	const sessionId = `test-session-${Date.now()}`;
	const token = `test-token-${Date.now()}`;

	await db.insert({
		id: sessionId,
		userId,
		token,
		expiresAt: Date.now() - 1000, // Expired 1 second ago
		createdAt: Date.now(),
		updatedA: Date.now(),
	});

	return token;
}

/**
 * Cleanup helper to reset test database between tests
 */
export async function cleanupTestAuth(auth: ReturnType<typeof betterAuth>) {
	const db = (auth as any).options.database;

	// Clear all tables
	await db.delete().from("session").execute();
	await db.delete().from("account").execute();
	await db.delete().from("user").execute();
	await db.delete().from("verification").execute();
}
