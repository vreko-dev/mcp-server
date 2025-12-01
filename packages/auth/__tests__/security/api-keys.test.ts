import { describe, expect, it } from "vitest";

// Skip if using stub DATABASE_URL (not a real database)
const isDatabaseAvailable =
	!!process.env.DATABASE_URL &&
	!process.env.DATABASE_URL.includes("@localhost") &&
	!process.env.DATABASE_URL.includes("test@");

// biome-ignore lint/suspicious/noExplicitAny: Required for conditional imports
let auth: any;
// biome-ignore lint/suspicious/noExplicitAny: Required for conditional imports
let createApiKey: any;
// biome-ignore lint/suspicious/noExplicitAny: Required for conditional imports
let revokeApiKey: any;
// biome-ignore lint/suspicious/noExplicitAny: Required for conditional imports
let validateApiKey: any;

if (isDatabaseAvailable) {
	const authModule = await import("../../src/auth.js");
	const indexModule = await import("../../src/index.js");
	auth = authModule.auth;
	createApiKey = indexModule.createApiKey;
	revokeApiKey = indexModule.revokeApiKey;
	validateApiKey = indexModule.validateApiKey;
}

describe.skipIf(!isDatabaseAvailable)("API Key Security", () => {
	it("should reject revoked API keys", async () => {
		// Create a test user
		const user = await auth.api.signUpEmail({
			body: {
				email: "test@example.com",
				password: "Test123!@#",
				name: "Test User",
			},
		});

		// Create an API key using our custom implementation
		const key = await createApiKey({
			userId: user.user.id,
			name: "Test Key",
		});

		// Revoke the API key
		await revokeApiKey(key.id, user.user.id);

		// Attempt to use the revoked key
		const result = await validateApiKey(key.fullKey);

		// Should return invalid for revoked keys
		expect(result.valid).toBe(false);
	});

	it("should rate limit API key usage", async () => {
		// Create a test user
		const user = await auth.api.signUpEmail({
			body: {
				email: "test2@example.com",
				password: "Test123!@#",
				name: "Test User 2",
			},
		});

		// Create an API key using our custom implementation
		const key = await createApiKey({
			userId: user.user.id,
			name: "Test Key 2",
		});

		// Make 101 requests (limit is 100/min)
		const requests = Array.from({ length: 101 }, () =>
			fetch("/api/v1/analyze", {
				headers: { Authorization: `Bearer ${key.fullKey}` },
			}),
		);

		const responses = await Promise.all(requests);
		const tooManyRequests = responses.filter((r) => r.status === 429);

		// Should have some rate limited responses
		expect(tooManyRequests.length).toBeGreaterThan(0);
	});

	it("should validate API key scopes", async () => {
		// Create a test user
		const user = await auth.api.signUpEmail({
			body: {
				email: "test3@example.com",
				password: "Test123!@#",
				name: "Test User 3",
			},
		});

		// Create an API key with limited scopes using our custom implementation
		const key = await createApiKey({
			userId: user.user.id,
			name: "Limited Key",
			scopes: ["read:profile"],
		});

		// Attempt to use key for unauthorized scope
		const result = await fetch("/api/v1/admin/users", {
			headers: { Authorization: `Bearer ${key.fullKey}` },
		});

		// Should be forbidden
		expect(result.status).toBe(403);
	});

	it("should handle expired API keys", async () => {
		// Create a test user
		const user = await auth.api.signUpEmail({
			body: {
				email: "test4@example.com",
				password: "Test123!@#",
				name: "Test User 4",
			},
		});

		// Create an expired API key using our custom implementation
		const key = await createApiKey({
			userId: user.user.id,
			name: "Expired Key",
			expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
		});

		// Attempt to use the expired key
		const result = await validateApiKey(key.fullKey);

		// Should return invalid for expired keys
		expect(result.valid).toBe(false);
	});
});
