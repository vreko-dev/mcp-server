import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/**
 * MSW Server for Integration Tests
 *
 * Mocks external HTTP APIs (Resend, etc.) for robust integration testing.
 * This is NOT a mock of our internal API - it mocks external services.
 */

// Resend API mocks
const resendHandlers = [
	// POST /emails - Successful send
	http.post("https://api.resend.com/emails", async ({ request }) => {
		const body = await request.json() as Record<string, unknown>;

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

	// Rate limiting simulation
	http.post("https://api.resend.com/emails", async ({ request }) => {
		const rateLimit = request.headers.get("X-Test-Rate-Limit");

		if (rateLimit === "true") {
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
		}
	}),
];

// Create MSW server
export const server = setupServer(...resendHandlers);

// Export handlers for custom test scenarios
export { resendHandlers };

// Helper to add custom handlers for specific tests
export function addHandlers(...handlers: Parameters<typeof server.use>) {
	server.use(...handlers);
}

// Helper to reset handlers to defaults
export function resetHandlers() {
	server.resetHandlers();
}
