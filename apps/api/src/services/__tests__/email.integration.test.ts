/**
 * Email Service Integration Tests with MSW
 *
 * Tests REAL email sending integration with Resend API using MSW.
 * These are NOT unit tests - they test actual HTTP integration with mocked Resend API.
 *
 * Run with: pnpm test:integration
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
	sendWelcomeEmail,
	sendPaymentReceiptEmail,
	sendPaymentFailedEmail,
	type EmailResult,
} from "../email.js";

// Setup MSW server for Resend API
const server = setupServer(
	// Success case
	http.post("https://api.resend.com/emails", async ({ request }) => {
		const apiKey = request.headers.get("Authorization");

		if (!apiKey || !apiKey.startsWith("Bearer ")) {
			return HttpResponse.json(
				{
					statusCode: 401,
					name: "missing_api_key",
					message: "Missing API key",
				},
				{ status: 401 },
			);
		}

		const body = (await request.json()) as Record<string, unknown>;

		// Validate required fields
		if (!body.from || !body.to || !body.subject) {
			return HttpResponse.json(
				{
					statusCode: 422,
					name: "validation_error",
					message: "Missing required fields",
				},
				{ status: 422 },
			);
		}

		// Success response
		return HttpResponse.json({
			id: `email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			from: body.from,
			to: body.to,
			subject: body.subject,
			created_at: new Date().toISOString(),
		});
	}),
);

beforeAll(() => {
	server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

describe("Email Service Integration with Resend API", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeAll(() => {
		originalEnv = process.env;
		// Set API key for tests
		process.env.RESEND_API_KEY = "test_api_key_123";
		process.env.NEXT_PUBLIC_APP_URL = "https://test.snapback.dev";
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe("Welcome Email Integration", () => {
		it("should send real HTTP request to Resend API", async () => {
			const result = await sendWelcomeEmail(
				"cust_integration_001",
				"solo",
				"test@example.com",
			);

			expect(result.success).toBe(true);
		});

		it("should include all plan features in email body", async () => {
			let requestBody: any;

			// Intercept and capture request
			server.use(
				http.post("https://api.resend.com/emails", async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						id: "captured_email",
						from: requestBody.from,
						to: requestBody.to,
						created_at: new Date().toISOString(),
					});
				}),
			);

			await sendWelcomeEmail("cust_002", "enterprise", "enterprise@example.com");

			expect(requestBody.html).toContain("Unlimited snapshots");
			expect(requestBody.html).toContain("Dedicated account manager");
			expect(requestBody.html).toContain("SLA guarantee");
		});

		it("should handle Resend API errors", async () => {
			// Simulate API error
			server.use(
				http.post("https://api.resend.com/emails", () => {
					return HttpResponse.json(
						{
							statusCode: 500,
							name: "internal_server_error",
							message: "Resend API is down",
						},
						{ status: 500 },
					);
				}),
			);

			const result = await sendWelcomeEmail(
				"cust_error",
				"solo",
				"error@example.com",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("SEND_FAILED");
			}
		});

		it("should handle rate limiting from Resend", async () => {
			// Simulate rate limit
			server.use(
				http.post("https://api.resend.com/emails", () => {
					return HttpResponse.json(
						{
							statusCode: 429,
							name: "rate_limit_error",
							message: "Too many requests",
						},
						{
							status: 429,
							headers: {
								"Retry-After": "60",
							},
						},
					);
				}),
			);

			const result = await sendWelcomeEmail(
				"cust_ratelimit",
				"solo",
				"ratelimit@example.com",
			);

			expect(result.success).toBe(false);
		});

		it("should send correct subject line for each plan", async () => {
			const plans = ["free", "solo", "team", "enterprise"] as const;
			const requests: Record<string, string> = {};

			server.use(
				http.post("https://api.resend.com/emails", async ({ request }) => {
					const body = (await request.json()) as Record<string, unknown>;
					requests[body.to as string] = body.subject as string;

					return HttpResponse.json({
						id: `email_${Date.now()}`,
						from: body.from,
						to: body.to,
						created_at: new Date().toISOString(),
					});
				}),
			);

			for (const plan of plans) {
				await sendWelcomeEmail(`cust_${plan}`, plan, `${plan}@example.com`);
			}

			expect(requests["free@example.com"]).toBe("Welcome to SnapBack Free!");
			expect(requests["solo@example.com"]).toBe("Welcome to SnapBack Solo!");
			expect(requests["team@example.com"]).toBe("Welcome to SnapBack Team!");
			expect(requests["enterprise@example.com"]).toBe(
				"Welcome to SnapBack Enterprise!",
			);
		});
	});

	describe("Payment Receipt Integration", () => {
		it("should send payment receipt with correct amount formatting", async () => {
			let requestBody: any;

			server.use(
				http.post("https://api.resend.com/emails", async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						id: "receipt_email",
						from: requestBody.from,
						to: requestBody.to,
						created_at: new Date().toISOString(),
					});
				}),
			);

			await sendPaymentReceiptEmail("cust_receipt", 4999, "receipt@example.com");

			expect(requestBody.subject).toBe("Payment Receipt - SnapBack");
			expect(requestBody.html).toContain("$49.99");
			expect(requestBody.from).toBe("SnapBack <billing@snapback.dev>");
		});

		it("should handle various amount formats", async () => {
			const testCases = [
				{ amount: 999, expected: "$9.99" },
				{ amount: 10050, expected: "$100.50" },
				{ amount: 5000, expected: "$50.00" },
				{ amount: 100, expected: "$1.00" },
			];

			for (const testCase of testCases) {
				let capturedHtml = "";

				server.use(
					http.post("https://api.resend.com/emails", async ({ request }) => {
						const body = (await request.json()) as Record<string, unknown>;
						capturedHtml = body.html as string;

						return HttpResponse.json({
							id: `email_${testCase.amount}`,
							from: body.from,
							to: body.to,
							created_at: new Date().toISOString(),
						});
					}),
				);

				await sendPaymentReceiptEmail(
					`cust_${testCase.amount}`,
					testCase.amount,
					"amount@example.com",
				);

				expect(capturedHtml).toContain(testCase.expected);
			}
		});
	});

	describe("Payment Failed Integration", () => {
		it("should send different warnings based on attempt count", async () => {
			const attempts = [1, 2, 3, 4];
			const warnings: Record<number, string> = {};

			for (const attempt of attempts) {
				server.use(
					http.post("https://api.resend.com/emails", async ({ request }) => {
						const body = (await request.json()) as Record<string, unknown>;
						warnings[attempt] = body.html as string;

						return HttpResponse.json({
							id: `email_${attempt}`,
							from: body.from,
							to: body.to,
							created_at: new Date().toISOString(),
						});
					}),
				);

				await sendPaymentFailedEmail(
					`cust_attempt_${attempt}`,
					attempt,
					"failed@example.com",
				);
			}

			// First 2 attempts - gentle warning
			expect(warnings[1]).toContain(
				"Please update your payment method to continue your subscription",
			);
			expect(warnings[2]).toContain(
				"Please update your payment method to continue your subscription",
			);

			// 3+ attempts - severe warning
			expect(warnings[3]).toContain(
				"Your account will be suspended if payment is not received",
			);
			expect(warnings[4]).toContain(
				"Your account will be suspended if payment is not received",
			);
		});
	});

	describe("API Key Validation", () => {
		it("should fail when API key not configured", async () => {
			delete process.env.RESEND_API_KEY;

			const result = await sendWelcomeEmail(
				"cust_nokey",
				"solo",
				"nokey@example.com",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("NOT_CONFIGURED");
			}

			// Restore
			process.env.RESEND_API_KEY = "test_api_key_123";
		});

		it("should handle invalid API key from Resend", async () => {
			server.use(
				http.post("https://api.resend.com/emails", () => {
					return HttpResponse.json(
						{
							statusCode: 401,
							name: "missing_api_key",
							message: "Invalid API key",
						},
						{ status: 401 },
					);
				}),
			);

			const result = await sendWelcomeEmail(
				"cust_invalidkey",
				"solo",
				"invalid@example.com",
			);

			expect(result.success).toBe(false);
		});
	});

	describe("Network Resilience", () => {
		it("should handle network timeouts", async () => {
			server.use(
				http.post("https://api.resend.com/emails", async () => {
					// Simulate timeout
					await new Promise((resolve) => setTimeout(resolve, 100));
					throw new Error("Network timeout");
				}),
			);

			const result = await sendWelcomeEmail(
				"cust_timeout",
				"solo",
				"timeout@example.com",
			);

			expect(result.success).toBe(false);
		});

		it("should handle malformed JSON responses", async () => {
			server.use(
				http.post("https://api.resend.com/emails", () => {
					return new HttpResponse("invalid json{", {
						status: 200,
						headers: {
							"Content-Type": "application/json",
						},
					});
				}),
			);

			const result = await sendWelcomeEmail(
				"cust_malformed",
				"solo",
				"malformed@example.com",
			);

			expect(result.success).toBe(false);
		});
	});
});
