/**
 * Account Enumeration Protection Tests (TDD RED PHASE)
 *
 * Tests disablePaths configuration to prevent username/email discovery attacks
 *
 * OWASP: ASVS 2.2.1 - Account Enumeration Prevention
 * CWE-204: Observable Response Discrepancy
 *
 * @see https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account
 */

import { describe, expect, it } from "vitest";

/**
 * CRITICAL PATH: Username Availability Endpoint Disabled
 */
describe("CRITICAL: Username Enumeration Prevention", () => {
	it("should return 404 for /is-username-available endpoint", async () => {
		const { auth } = await import("../src/auth.js");

		const response = await auth.api.request("/is-username-available", {
			method: "GET",
			query: {
				username: "existinguser",
			},
		});

		// Endpoint should be completely disabled
		expect(response.status).toBe(404);
	});

	it("should not reveal whether username exists via error messages", async () => {
		const { auth } = await import("../src/auth.js");

		// Try to sign up with existing username
		const result1 = await auth.api.signUpEmail({
			body: {
				email: "duplicate@example.com",
				password: "SecureP@ssw0rd123",
				name: "Duplicate Test",
			},
		});

		// Try to sign in with non-existent username
		const result2 = await auth.api.signInEmail({
			body: {
				email: "nonexistent@example.com",
				password: "SomePassword123",
			},
		});

		// Both should have generic error messages
		if (result1.status !== 200) {
			const error1 = await result1.json();
			expect(error1.error).not.toMatch(/already exists|taken|registered/i);
		}

		if (result2.status !== 200) {
			const error2 = await result2.json();
			expect(error2.error).not.toMatch(/not found|doesn't exist|unknown user/i);
		}
	});
});

/**
 * SECURITY: Response Timing Attacks
 */
describe("SECURITY: Timing Attack Resistance", () => {
	it("should have consistent response time for valid and invalid usernames", async () => {
		const { auth } = await import("../src/auth.js");

		const timings: number[] = [];

		// Test existing user
		for (let i = 0; i < 3; i++) {
			const start = Date.now();
			await auth.api.signInEmail({
				body: {
					email: "valid@example.com",
					password: "wrongpassword",
				},
			});
			timings.push(Date.now() - start);
		}

		const validAvg = timings.reduce((a, b) => a + b, 0) / timings.length;
		timings.length = 0;

		// Test non-existent user
		for (let i = 0; i < 3; i++) {
			const start = Date.now();
			await auth.api.signInEmail({
				body: {
					email: `nonexistent${i}@example.com`,
					password: "wrongpassword",
				},
			});
			timings.push(Date.now() - start);
		}

		const invalidAvg = timings.reduce((a, b) => a + b, 0) / timings.length;

		// Timing difference should be < 100ms (not exploitable)
		const difference = Math.abs(validAvg - invalidAvg);
		expect(difference).toBeLessThan(100);
	});
});

/**
 * EDGE CASE: Case Sensitivity
 */
describe("EDGE: Case Sensitivity Handling", () => {
	it("should treat email addresses case-insensitively", async () => {
		const { auth } = await import("../src/auth.js");

		// Sign up with lowercase
		await auth.api.signUpEmail({
			body: {
				email: "test@example.com",
				password: "SecureP@ssw0rd123",
				name: "Test User",
			},
		});

		// Try to sign in with different casing
		const variations = ["TEST@EXAMPLE.COM", "Test@Example.Com", "tEsT@eXaMpLe.CoM"];

		for (const email of variations) {
			const result = await auth.api.signInEmail({
				body: {
					email,
					password: "SecureP@ssw0rd123",
				},
			});

			// Should authenticate successfully (case-insensitive)
			expect(result.status).toBe(200);
		}
	});
});

/**
 * INTEGRATION: Enumeration Protection with Rate Limiting
 */
describe("INTEGRATION: Enumeration + Rate Limiting", () => {
	it("should rate limit enumeration attempts", async () => {
		const { auth } = await import("../src/auth.js");

		// Rapid enumeration attempts
		const attempts = 20;
		const results: number[] = [];

		for (let i = 0; i < attempts; i++) {
			const result = await auth.api.signInEmail({
				body: {
					email: `enumeration${i}@example.com`,
					password: "password",
				},
			});
			results.push(result.status);
		}

		// Should eventually start returning 429 (Too Many Requests)
		const rateLimited = results.filter((status) => status === 429);
		expect(rateLimited.length).toBeGreaterThan(0);
	});
});
