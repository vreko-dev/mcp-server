/**
 * Resend Email API Mock Handlers
 *
 * Provides mock implementations of Resend email service endpoints
 * for testing email functionality without sending real emails.
 *
 * @example
 * ```typescript
 * import { server } from "@snapback/testing/msw/server";
 * import { resendHandlers } from "@snapback/testing/msw/handlers/resend";
 *
 * // Resend handlers are included by default in the server
 * ```
 */

import { HttpResponse, http } from "msw";

/**
 * Resend API mock handlers
 * Simulates the Resend email API for testing
 */
export const resendHandlers = [
	// POST /emails - Successful send
	http.post("https://api.resend.com/emails", async ({ request }) => {
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

		// Simulate successful email send
		return HttpResponse.json({
			id: `email_${Date.now()}`,
			from: body.from,
			to: body.to,
			created_at: new Date().toISOString(),
		});
	}),
];

/**
 * Resend error scenario handlers
 * Mock various failure scenarios for testing error handling
 */
export const resendErrorHandlers = {
	// Rate limiting
	rateLimit: http.post("https://api.resend.com/emails", async () => {
		return HttpResponse.json(
			{
				statusCode: 429,
				name: "rate_limit_error",
				message: "Rate limit exceeded",
			},
			{
				status: 429,
				headers: {
					"Retry-After": "60",
				},
			},
		);
	}),

	// Invalid API key
	invalidApiKey: http.post("https://api.resend.com/emails", async () => {
		return HttpResponse.json(
			{
				statusCode: 401,
				name: "unauthorized",
				message: "Invalid API key",
			},
			{ status: 401 },
		);
	}),

	// Server error
	serverError: http.post("https://api.resend.com/emails", async () => {
		return new HttpResponse(null, { status: 500 });
	}),
};
