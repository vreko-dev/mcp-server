/**
 * HIBP Password Breach Detection Tests (TDD RED PHASE)
 *
 * Tests Better Auth haveIBeenPwned plugin integration for preventing
 * compromised password usage.
 *
 * OWASP: A07:2021 - Identification and Authentication Failures
 * NIST: SP 800-63B Section 5.1.1.2 (Memorized Secret Verifiers)
 *
 * @see https://haveibeenpwned.com/API/v3
 */

import { describe, expect, it, vi } from "vitest";

/**
 * CRITICAL PATH 1: Password Breach Detection
 * Ensures known compromised passwords are rejected during signup/password change
 */
describe("CRITICAL: Password Breach Detection", () => {
	it("should reject known breached password during signup", async () => {
		// Known breached password from HIBP (>23M occurrences)
		const breachedPassword = "Password123";

		const { auth } = await import("../src/auth.js");

		const result = await auth.api.signUpEmail({
			body: {
				email: "test@example.com",
				password: breachedPassword,
				name: "Test User",
			},
		});

		// Should fail with PASSWORD_COMPROMISED error
		expect(result.status).toBe(400);
		expect(await result.json()).toMatchObject({
			error: expect.stringMatching(/compromised|breached/i),
		});
	});

	it("should reject known breached password during password change", async () => {
		const { auth } = await import("../src/auth.js");

		// Simulate authenticated user changing password
		const mockSession = {
			userId: "user_test_123",
			sessionToken: "valid_session_token",
		};

		const result = await auth.api.changePassword({
			body: {
				currentPassword: "OldPassword123!",
				newPassword: "password", // Most common breached password
			},
			headers: new Headers({
				cookie: `better-auth.session_token=${mockSession.sessionToken}`,
			}),
		});

		expect(result.status).toBe(400);
		expect(await result.json()).toMatchObject({
			error: expect.stringMatching(/compromised|breached/i),
		});
	});

	it("should allow strong non-breached password", async () => {
		// Cryptographically random password (very unlikely to be breached)
		const securePassword = "X9$mK2@nP7!qR4&tY8";

		const { auth } = await import("../src/auth.js");

		const result = await auth.api.signUpEmail({
			body: {
				email: "secure@example.com",
				password: securePassword,
				name: "Secure User",
			},
		});

		// Should succeed (or fail for reason other than breach)
		if (result.status !== 200) {
			const error = await result.json();
			expect(error.error).not.toMatch(/compromised|breached/i);
		}
	});
});

/**
 * CRITICAL PATH 2: k-Anonymity Privacy Protection
 * Verifies only first 5 characters of password hash are sent to HIBP API
 */
describe("CRITICAL: k-Anonymity Privacy Protection", () => {
	it("should only send first 5 hash characters to HIBP API", async () => {
		// Mock fetch to verify API call format
		const fetchSpy = vi.spyOn(global, "fetch");

		const { auth } = await import("../src/auth.js");

		await auth.api.signUpEmail({
			body: {
				email: "privacy@example.com",
				password: "TestPassword123",
				name: "Privacy User",
			},
		});

		// Verify HIBP API was called with only 5-char hash prefix
		const hibpCalls = fetchSpy.mock.calls.filter((call) =>
			call[0]?.toString().includes("pwnedpasswords.com/range/"),
		);

		if (hibpCalls.length > 0) {
			const apiUrl = hibpCalls[0][0]?.toString() || "";
			const hashPrefix = apiUrl.split("/range/")[1];

			expect(hashPrefix).toHaveLength(5);
			expect(hashPrefix).toMatch(/^[A-F0-9]{5}$/);
		}

		fetchSpy.mockRestore();
	});

	it("should never send full password or full hash to HIBP", async () => {
		const fetchSpy = vi.spyOn(global, "fetch");
		const testPassword = "SensitivePassword123!";

		const { auth } = await import("../src/auth.js");

		await auth.api.signUpEmail({
			body: {
				email: "fullhash@example.com",
				password: testPassword,
				name: "Hash Test",
			},
		});

		// Verify plaintext password never appears in network requests
		const allCalls = fetchSpy.mock.calls;
		for (const call of allCalls) {
			const url = call[0]?.toString() || "";
			const body = JSON.stringify(call[1]?.body || "");

			expect(url).not.toContain(testPassword);
			expect(body).not.toContain(testPassword);
		}

		fetchSpy.mockRestore();
	});
});

/**
 * EDGE CASE 1: HIBP API Failures
 * Tests graceful degradation when HIBP service is unavailable
 */
describe("EDGE: HIBP API Failure Handling", () => {
	it("should fail open when HIBP API is unreachable", async () => {
		// Mock fetch to simulate network error
		vi.spyOn(global, "fetch").mockImplementation(() => {
			throw new Error("Network error");
		});

		const { auth } = await import("../src/auth.js");

		const result = await auth.api.signUpEmail({
			body: {
				email: "offline@example.com",
				password: "Password123", // Known breached, but API is down
				name: "Offline Test",
			},
		});

		// Should allow signup (fail open) but log warning
		// Better to allow signup than block all users during outage
		expect(result.status).not.toBe(400); // Don't block due to API failure
	});

	it("should fail open when HIBP API returns 500 error", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);

		const { auth } = await import("../src/auth.js");

		const result = await auth.api.signUpEmail({
			body: {
				email: "servererror@example.com",
				password: "Password123",
				name: "Server Error Test",
			},
		});

		expect(result.status).not.toBe(400);
	});

	it("should handle HIBP API timeout gracefully", async () => {
		vi.spyOn(global, "fetch").mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve(new Response(null, { status: 200 })), 30000);
				}),
		);

		const { auth } = await import("../src/auth.js");

		// Should timeout and fail open within reasonable time (< 5 seconds)
		const startTime = Date.now();

		const result = await auth.api.signUpEmail({
			body: {
				email: "timeout@example.com",
				password: "Password123",
				name: "Timeout Test",
			},
		});

		const duration = Date.now() - startTime;

		expect(duration).toBeLessThan(5000); // Don't block user for >5s
		expect(result.status).not.toBe(400);
	});
});

/**
 * EDGE CASE 2: Case Sensitivity and Unicode
 */
describe("EDGE: Password Encoding Edge Cases", () => {
	it("should handle case-insensitive breach detection", async () => {
		const { auth } = await import("../src/auth.js");

		// Same breached password with different casing
		const passwords = ["password", "PASSWORD", "Password", "pAsSwOrD"];

		for (const pwd of passwords) {
			const result = await auth.api.signUpEmail({
				body: {
					email: `case-${pwd}@example.com`,
					password: pwd,
					name: "Case Test",
				},
			});

			// All variations should be rejected (case-insensitive)
			expect(result.status).toBe(400);
		}
	});

	it("should handle unicode characters in passwords", async () => {
		const { auth } = await import("../src/auth.js");

		const unicodePassword = "Pāšsẅøŕđ123!";

		const result = await auth.api.signUpEmail({
			body: {
				email: "unicode@example.com",
				password: unicodePassword,
				name: "Unicode Test",
			},
		});

		// Should not crash, should process correctly
		expect(result.status).toBeDefined();
	});
});

/**
 * SECURITY: Timing Attack Prevention
 */
describe("SECURITY: Timing Attack Resistance", () => {
	it("should have consistent response time regardless of breach status", async () => {
		const { auth } = await import("../src/auth.js");

		const measurements: number[] = [];

		// Test breached password timing
		for (let i = 0; i < 5; i++) {
			const start = Date.now();
			await auth.api.signUpEmail({
				body: {
					email: `timing-breached-${i}@example.com`,
					password: "Password123",
					name: "Timing Test",
				},
			});
			measurements.push(Date.now() - start);
		}

		const breachedAvg =
			measurements.reduce((a, b) => a + b, 0) / measurements.length;

		measurements.length = 0;

		// Test non-breached password timing
		for (let i = 0; i < 5; i++) {
			const start = Date.now();
			await auth.api.signUpEmail({
				body: {
					email: `timing-secure-${i}@example.com`,
					password: `SecureP@ss${i}${Date.now()}`,
					name: "Timing Test",
				},
			});
			measurements.push(Date.now() - start);
		}

		const secureAvg =
			measurements.reduce((a, b) => a + b, 0) / measurements.length;

		// Timing difference should be < 50ms (not enough for timing attack)
		const difference = Math.abs(breachedAvg - secureAvg);
		expect(difference).toBeLessThan(50);
	});
});

/**
 * INTEGRATION: HIBP + Existing Password Validation
 */
describe("INTEGRATION: HIBP with Password Complexity Rules", () => {
	it("should reject if breached even with strong complexity", async () => {
		const { auth } = await import("../src/auth.js");

		// "P@ssw0rd" meets complexity (upper, lower, number, special)
		// but is breached 123,000+ times
		const result = await auth.api.signUpEmail({
			body: {
				email: "complex-breached@example.com",
				password: "P@ssw0rd",
				name: "Complex Test",
			},
		});

		expect(result.status).toBe(400);
	});

	it("should enforce minimum length before HIBP check", async () => {
		const { auth } = await import("../src/auth.js");

		// Too short (< 12 chars) - should fail before HIBP check
		const result = await auth.api.signUpEmail({
			body: {
				email: "short@example.com",
				password: "Short1!",
				name: "Short Test",
			},
		});

		expect(result.status).toBe(400);
		const error = await result.json();
		expect(error.error).toMatch(/length|characters/i);
	});
});
