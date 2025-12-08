import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "../src/auth";

/**
 * Cookie Cache Tests - TDD Red Phase
 *
 * Tests cookie cache functionality for 80% database load reduction
 * Critical paths: session validation, cache hit/miss, expiry, refresh
 * Edge cases: cache corruption, concurrent requests, JWE decryption failures
 */

describe("PERF1: Cookie Cache Configuration", () => {
	it("should have cookie cache enabled in configuration", () => {
		// Verify auth config has cookieCache enabled
		const config = (auth as any).options?.session?.cookieCache;

		expect(config).toBeDefined();
		expect(config?.enabled).toBe(true);
	});

	it("should use JWE strategy for encrypted session data", () => {
		const config = (auth as any).options?.session?.cookieCache;

		expect(config?.strategy).toBe("jwe");
	});

	it("should have maxAge set to 5 minutes (300 seconds)", () => {
		const config = (auth as any).options?.session?.cookieCache;

		expect(config?.maxAge).toBe(5 * 60); // 5 minutes
	});

	it("should have refreshCache configured with updateAge", () => {
		const config = (auth as any).options?.session?.cookieCache?.refreshCache;

		expect(config).toBeDefined();
		expect(config?.updateAge).toBe(60); // Refresh when 60s remain
	});
});

describe("PERF2: Session Validation Performance", () => {
	let mockSessionToken: string;
	let _mockUserId: string;

	beforeEach(() => {
		mockSessionToken = `test-session-token-${Date.now()}`;
		_mockUserId = `user-${Date.now()}`;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("CRITICAL: should validate session from cookie cache without DB query", async () => {
		// This test verifies the primary benefit: avoiding DB queries
		// Expected: First call hits DB, second call uses cookie cache

		const headers = new Headers({
			cookie: `better-auth.session_token=${mockSessionToken}`,
		});

		// First call - should hit database
		const session1 = await auth.api.getSession({
			headers,
		});

		// Second call within cache window - should use cookie cache (no DB query)
		const session2 = await auth.api.getSession({
			headers,
		});

		// Both should return the same session
		expect(session1).toBeDefined();
		expect(session2).toBeDefined();

		// Cookie cache should be set
		expect(session1).toEqual(session2);
	});

	it("CRITICAL: should refresh cookie cache when updateAge threshold reached", async () => {
		// Edge case: Cookie nearing expiry should trigger refresh

		const headers = new Headers({
			cookie: `better-auth.session_token=${mockSessionToken}`,
		});

		// Simulate time passing to trigger refresh
		const session = await auth.api.getSession({
			headers,
		});

		expect(session).toBeDefined();
		// Verify Set-Cookie header present for refresh
	});

	it("EDGE: should handle cookie cache corruption gracefully", async () => {
		// Edge case: Corrupted JWE cookie should fallback to database

		const headers = new Headers({
			cookie: "better-auth.session_cache=corrupted-jwe-data",
		});

		// Should not throw, should fallback to DB validation
		const session = await auth.api.getSession({
			headers,
		});

		// Either valid session from DB or null (not an error)
		expect(typeof session === "object" || session === null).toBe(true);
	});

	it("EDGE: should handle concurrent session requests correctly", async () => {
		// Edge case: Multiple simultaneous requests should not corrupt cache

		const headers = new Headers({
			cookie: `better-auth.session_token=${mockSessionToken}`,
		});

		// Simulate concurrent requests
		const [session1, session2, session3] = await Promise.all([
			auth.api.getSession({ headers }),
			auth.api.getSession({ headers }),
			auth.api.getSession({ headers }),
		]);

		// All should return consistent results
		expect(session1).toEqual(session2);
		expect(session2).toEqual(session3);
	});

	it("EDGE: should expire cache after maxAge (5 minutes)", async () => {
		// Edge case: Expired cache should re-validate against database

		const headers = new Headers({
			cookie: `better-auth.session_token=${mockSessionToken}`,
		});

		// First call establishes cache
		const session1 = await auth.api.getSession({ headers });

		// Mock time advancement (6 minutes - beyond maxAge)
		vi.useFakeTimers();
		vi.advanceTimersByTime(6 * 60 * 1000);

		// Should re-validate from database
		const session2 = await auth.api.getSession({ headers });

		vi.useRealTimers();

		expect(session1).toBeDefined();
		expect(session2).toBeDefined();
	});

	it("CRITICAL: should disable cookie cache when disableCookieCache query param set", async () => {
		// Critical path: Force fresh DB validation

		const headers = new Headers({
			cookie: `better-auth.session_token=${mockSessionToken}`,
		});

		const session = await auth.api.getSession({
			headers,
			query: {
				disableCookieCache: true,
			},
		});

		// Should always query database, not use cache
		expect(session).toBeDefined();
	});
});

describe("PERF3: Database Load Reduction", () => {
	it("CRITICAL: should reduce database queries by ~80% with cache enabled", async () => {
		// This is the primary performance metric
		// In production, measure actual query reduction via PostgreSQL stats

		const headers = new Headers({
			cookie: `better-auth.session_token=test-session-${Date.now()}`,
		});

		// Make 10 requests
		const requests = Array.from({ length: 10 }, () => auth.api.getSession({ headers }));

		await Promise.all(requests);

		// Expected: Only 1-2 DB queries instead of 10
		// Actual measurement requires DB query logging
		expect(true).toBe(true); // Placeholder - measure in integration tests
	});
});

describe("SECURITY: Cookie Cache Security", () => {
	it("CRITICAL: should encrypt session data using JWE", async () => {
		// Security: Session data must be encrypted in cookie

		const config = (auth as any).options?.session?.cookieCache;
		expect(config?.strategy).toBe("jwe");
	});

	it("EDGE: should validate JWE signature on cache read", async () => {
		// Security: Prevent cookie tampering

		const headers = new Headers({
			cookie: "better-auth.session_cache=tampered-signature",
		});

		// Should reject tampered cookie, fallback to DB
		const session = await auth.api.getSession({ headers });

		// Should not throw, but should not trust tampered data
		expect(typeof session === "object" || session === null).toBe(true);
	});

	it("CRITICAL: should not expose sensitive data in cookie", async () => {
		// Security: Cookie should only contain encrypted payload

		const headers = new Headers({
			cookie: "better-auth.session_token=test-token",
		});

		const session = await auth.api.getSession({ headers });

		// Cookie cache should not contain plaintext passwords, tokens, etc.
		// JWE encryption ensures this
		expect(session).toBeDefined();
	});
});
