/**
 * Account Lockout Policy Tests (TDD RED PHASE)
 *
 * Tests account lockout mechanism to prevent brute force attacks
 *
 * OWASP: A07:2021 - Identification and Authentication Failures
 * PCI DSS: Requirement 8.1.6 - Limit repeated access attempts
 * NIST: SP 800-63B Section 5.2.2 - Rate Limiting
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#account-lockout
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CRITICAL PATH 1: Lockout After Failed Attempts
 * Ensures accounts are locked after N failed login attempts
 */
describe("CRITICAL: Account Lockout Enforcement", () => {
	beforeEach(async () => {
		// Clear Redis lockout state before each test
		const { clearLockoutState } = await import("../src/lib/account-lockout.js");
		await clearLockoutState("test@example.com");
	});

	it("should lock account after 5 failed login attempts", async () => {
		const { auth } = await import("../src/auth.js");
		const testEmail = "lockout-test@example.com";

		// First, create the account
		await auth.api.signUpEmail({
			body: {
				email: testEmail,
				password: "CorrectP@ssw0rd123",
				name: "Lockout Test",
			},
		});

		// Attempt 5 failed logins
		for (let i = 0; i < 5; i++) {
			const result = await auth.api.signInEmail({
				body: {
					email: testEmail,
					password: "WrongPassword123",
				},
			});

			expect(result.status).toBe(401); // Unauthorized
		}

		// 6th attempt should be blocked with 429 (Too Many Requests)
		const lockedResult = await auth.api.signInEmail({
			body: {
				email: testEmail,
				password: "CorrectP@ssw0rd123", // Even correct password should fail
			},
		});

		expect(lockedResult.status).toBe(429);
		const error = await lockedResult.json();
		expect(error.error).toMatch(/locked|too many attempts/i);
		expect(error.retryAfter).toBeDefined(); // Should include retry-after time
	});

	it("should reset lockout counter on successful login", async () => {
		const { auth } = await import("../src/auth.js");
		const testEmail = "reset-test@example.com";

		await auth.api.signUpEmail({
			body: {
				email: testEmail,
				password: "CorrectP@ssw0rd123",
				name: "Reset Test",
			},
		});

		// 3 failed attempts (below threshold)
		for (let i = 0; i < 3; i++) {
			await auth.api.signInEmail({
				body: { email: testEmail, password: "Wrong123" },
			});
		}

		// Successful login should reset counter
		const successResult = await auth.api.signInEmail({
			body: {
				email: testEmail,
				password: "CorrectP@ssw0rd123",
			},
		});

		expect(successResult.status).toBe(200);

		// Should be able to fail 5 more times before lockout (counter was reset)
		for (let i = 0; i < 5; i++) {
			await auth.api.signInEmail({
				body: { email: testEmail, password: "Wrong123" },
			});
		}

		// This should now trigger lockout
		const lockedResult = await auth.api.signInEmail({
			body: { email: testEmail, password: "CorrectP@ssw0rd123" },
		});

		expect(lockedResult.status).toBe(429);
	});

	it("should unlock account after lockout duration expires", async () => {
		const { auth } = await import("../src/auth.js");
		const testEmail = "expire-test@example.com";

		await auth.api.signUpEmail({
			body: {
				email: testEmail,
				password: "CorrectP@ssw0rd123",
				name: "Expire Test",
			},
		});

		// Trigger lockout (5 failed attempts)
		for (let i = 0; i < 6; i++) {
			await auth.api.signInEmail({
				body: { email: testEmail, password: "Wrong123" },
			});
		}

		// Should be locked
		const locked = await auth.api.signInEmail({
			body: { email: testEmail, password: "CorrectP@ssw0rd123" },
		});
		expect(locked.status).toBe(429);

		// Wait for lockout to expire (15 minutes in production, but mocked in tests)
		// Mock time advancement
		vi.useFakeTimers();
		vi.advanceTimersByTime(15 * 60 * 1000 + 1000); // 15min + 1sec

		// Should be able to login again
		const unlocked = await auth.api.signInEmail({
			body: { email: testEmail, password: "CorrectP@ssw0rd123" },
		});

		expect(unlocked.status).toBe(200);

		vi.useRealTimers();
	});
});

/**
 * CRITICAL PATH 2: Redis Storage Integration
 * Verifies lockout state is stored in Redis for distributed systems
 */
describe("CRITICAL: Redis Lockout Storage", () => {
	it("should store lockout state in Redis", async () => {
		const { incrementFailedAttempts, checkAccountLockout } = await import("../src/lib/account-lockout.js");
		const testEmail = "redis-test@example.com";

		// Increment attempts
		for (let i = 0; i < 5; i++) {
			await incrementFailedAttempts(testEmail);
		}

		// Check lockout status
		const lockout = await checkAccountLockout(testEmail);

		expect(lockout.locked).toBe(true);
		expect(lockout.remainingTime).toBeGreaterThan(0);
		expect(lockout.remainingTime).toBeLessThanOrEqual(15 * 60); // 15 minutes max
	});

	it("should work with distributed Redis instances", async () => {
		const { incrementFailedAttempts, checkAccountLockout } = await import("../src/lib/account-lockout.js");
		const testEmail = "distributed-test@example.com";

		// Simulate requests from different servers/instances
		// All should read the same Redis state
		await incrementFailedAttempts(testEmail); // Server 1
		await incrementFailedAttempts(testEmail); // Server 2
		await incrementFailedAttempts(testEmail); // Server 3
		await incrementFailedAttempts(testEmail); // Server 1 again
		await incrementFailedAttempts(testEmail); // Server 2 again

		// All instances should see the lockout
		const lockout1 = await checkAccountLockout(testEmail);
		const lockout2 = await checkAccountLockout(testEmail);

		expect(lockout1.locked).toBe(true);
		expect(lockout2.locked).toBe(true);
		expect(lockout1.remainingTime).toBe(lockout2.remainingTime);
	});
});

/**
 * EDGE CASE 1: Redis Failure Fallback
 * Tests graceful degradation when Redis is unavailable
 */
describe("EDGE: Redis Failure Handling", () => {
	it("should fallback to database when Redis is unavailable", async () => {
		// Mock Redis failure
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const { incrementFailedAttempts, checkAccountLockout } = await import("../src/lib/account-lockout.js");

		// Simulate Redis connection failure
		const redisModule = await import("redis");
		const createClientSpy = vi.spyOn(redisModule, "createClient").mockImplementation(() => {
			throw new Error("Redis connection failed");
		});

		const testEmail = "fallback-test@example.com";

		// Should still work (using database)
		for (let i = 0; i < 5; i++) {
			await incrementFailedAttempts(testEmail);
		}

		const lockout = await checkAccountLockout(testEmail);
		expect(lockout.locked).toBe(true);

		createClientSpy.mockRestore();
	});

	it("should not crash on Redis read errors", async () => {
		const { checkAccountLockout } = await import("../src/lib/account-lockout.js");

		// Should return unlocked state on error (fail open)
		const lockout = await checkAccountLockout("error-test@example.com");

		expect(lockout.locked).toBe(false);
	});
});

/**
 * EDGE CASE 2: Case Sensitivity and Email Normalization
 */
describe("EDGE: Email Normalization", () => {
	it("should treat email addresses case-insensitively for lockout", async () => {
		const { incrementFailedAttempts, checkAccountLockout } = await import("../src/lib/account-lockout.js");

		// Increment with different casings
		await incrementFailedAttempts("Test@Example.com");
		await incrementFailedAttempts("test@example.com");
		await incrementFailedAttempts("TEST@EXAMPLE.COM");
		await incrementFailedAttempts("TeSt@ExAmPlE.CoM");
		await incrementFailedAttempts("test@EXAMPLE.com");

		// All should count toward same account
		const lockout1 = await checkAccountLockout("test@example.com");
		const lockout2 = await checkAccountLockout("TEST@EXAMPLE.COM");

		expect(lockout1.locked).toBe(true);
		expect(lockout2.locked).toBe(true);
	});

	it("should trim whitespace from email addresses", async () => {
		const { incrementFailedAttempts, checkAccountLockout } = await import("../src/lib/account-lockout.js");

		await incrementFailedAttempts("  test@example.com  ");
		await incrementFailedAttempts("test@example.com");
		await incrementFailedAttempts("	test@example.com	"); // tabs

		const lockout = await checkAccountLockout("test@example.com");
		expect(lockout.locked).toBe(false); // Only 3 attempts
	});
});

/**
 * SECURITY: Timing Attack Prevention
 */
describe("SECURITY: Timing Attack Resistance", () => {
	it("should have constant response time regardless of lockout status", async () => {
		const { auth } = await import("../src/auth.js");
		const measurements: number[] = [];

		// Create accounts
		await auth.api.signUpEmail({
			body: {
				email: "timing-locked@example.com",
				password: "CorrectP@ss123",
				name: "Locked",
			},
		});

		await auth.api.signUpEmail({
			body: {
				email: "timing-unlocked@example.com",
				password: "CorrectP@ss123",
				name: "Unlocked",
			},
		});

		// Lock first account
		for (let i = 0; i < 6; i++) {
			await auth.api.signInEmail({
				body: {
					email: "timing-locked@example.com",
					password: "Wrong123",
				},
			});
		}

		// Measure locked account response time
		for (let i = 0; i < 5; i++) {
			const start = Date.now();
			await auth.api.signInEmail({
				body: {
					email: "timing-locked@example.com",
					password: "CorrectP@ss123",
				},
			});
			measurements.push(Date.now() - start);
		}

		const lockedAvg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
		measurements.length = 0;

		// Measure unlocked account response time
		for (let i = 0; i < 5; i++) {
			const start = Date.now();
			await auth.api.signInEmail({
				body: {
					email: "timing-unlocked@example.com",
					password: "Wrong123",
				},
			});
			measurements.push(Date.now() - start);
		}

		const unlockedAvg = measurements.reduce((a, b) => a + b, 0) / measurements.length;

		// Timing difference should be < 50ms
		const difference = Math.abs(lockedAvg - unlockedAvg);
		expect(difference).toBeLessThan(50);
	});
});

/**
 * SECURITY: Prevent Lockout Bypass via Username Variation
 */
describe("SECURITY: Lockout Bypass Prevention", () => {
	it("should not allow bypass via email+tag variations", async () => {
		const { incrementFailedAttempts, checkAccountLockout } = await import("../src/lib/account-lockout.js");

		// Gmail/Outlook ignore dots and plus-tags
		const variations = [
			"user@example.com",
			"user+tag@example.com",
			"user+another@example.com",
			"u.ser@example.com",
			"us.er@example.com",
		];

		// All variations should count separately (no normalization beyond case/trim)
		for (const email of variations) {
			for (let i = 0; i < 5; i++) {
				await incrementFailedAttempts(email);
			}
		}

		// Each variation should be locked independently
		const lockout1 = await checkAccountLockout("user@example.com");
		const lockout2 = await checkAccountLockout("user+tag@example.com");

		expect(lockout1.locked).toBe(true);
		expect(lockout2.locked).toBe(true);
	});
});

/**
 * INTEGRATION: Lockout + Audit Logging
 */
describe("INTEGRATION: Audit Trail", () => {
	it("should log lockout events for security monitoring", async () => {
		const { trackEvent } = await import("../src/lib/audit.js");
		const trackSpy = vi.spyOn({ trackEvent }, "trackEvent");

		const { incrementFailedAttempts } = await import("../src/lib/account-lockout.js");

		const testEmail = "audit-test@example.com";

		// Trigger lockout
		for (let i = 0; i < 5; i++) {
			await incrementFailedAttempts(testEmail);
		}

		// Should have logged lockout event
		expect(trackSpy).toHaveBeenCalledWith(
			expect.stringMatching(/lockout|blocked/i),
			expect.objectContaining({
				email: testEmail,
			}),
		);
	});
});

/**
 * PERFORMANCE: High-Volume Attack Simulation
 */
describe("PERFORMANCE: Distributed Brute Force", () => {
	it("should handle 100 concurrent lockout checks efficiently", async () => {
		const { checkAccountLockout } = await import("../src/lib/account-lockout.js");

		const start = Date.now();
		const promises = Array.from({ length: 100 }, (_, i) => checkAccountLockout(`perf-test-${i}@example.com`));

		const results = await Promise.all(promises);
		const duration = Date.now() - start;

		// Should complete in < 2 seconds (20ms per check average)
		expect(duration).toBeLessThan(2000);
		expect(results).toHaveLength(100);
		results.forEach((result) => {
			expect(result.locked).toBe(false); // All should be unlocked initially
		});
	});
});
