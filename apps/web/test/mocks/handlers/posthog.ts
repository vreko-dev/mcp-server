/**
 * MSW handlers for PostHog reverse proxy endpoints
 * Mocks /ingest/* endpoints to test analytics without network calls
 *
 * Follows testing_blueprint.md patterns:
 * - Happy path: successful event capture
 * - Sad path: invalid requests
 * - Edge cases: rate limiting, timeout
 * - Error cases: 500, network errors
 */

import { HttpResponse, http } from "msw";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Track events for test assertions
export const capturedEvents: Array<{
	event: string;
	properties?: Record<string, unknown>;
	timestamp: string;
}> = [];

export const resetCapturedEvents = () => {
	capturedEvents.length = 0;
};

/**
 * PostHog proxy handlers
 */
export const posthogHandlers = [
	// Static assets (scripts, etc.)
	http.get(`${BASE_URL}/ingest/static/:path*`, ({ params }) => {
		const { path } = params;

		// Simulate PostHog JS SDK script
		if (typeof path === "string" && path.includes("array.js")) {
			return HttpResponse.text(
				"// PostHog SDK mock\nwindow.posthog =  {init: () => {}, capture: () => {}, identify: () => {}};",
				{
					headers: {
						"Content-Type": "application/javascript",
					},
				},
			);
		}

		return new HttpResponse(null, { status: 200 });
	}),

	// Event capture (main analytics endpoint)
	http.post(`${BASE_URL}/ingest/:path*`, async ({ request, params }) => {
		const { path } = params;

		// Parse event data
		let eventData: any;
		try {
			const contentType = request.headers.get("content-type");
			if (contentType?.includes("application/json")) {
				eventData = await request.json();
			} else {
				eventData = await request.text();
			}
		} catch (_error) {
			return HttpResponse.json({ error: "Invalid request body" }, { status: 400 });
		}

		// Handle batch events
		if (typeof path === "string" && path.includes("batch")) {
			const events = Array.isArray(eventData.batch) ? eventData.batch : [];
			events.forEach((event: any) => {
				capturedEvents.push({
					event: event.event,
					properties: event.properties,
					timestamp: new Date().toISOString(),
				});
			});

			return HttpResponse.json({ status: 1 });
		}

		// Handle single events
		if (eventData?.event) {
			capturedEvents.push({
				event: eventData.event,
				properties: eventData.properties,
				timestamp: new Date().toISOString(),
			});
		}

		return HttpResponse.json({ status: 1 });
	}),

	// Feature flags (decide endpoint)
	http.post(`${BASE_URL}/ingest/decide`, async () => {
		return HttpResponse.json({
			featureFlags: {},
			sessionRecording: false,
		});
	}),

	// Health check
	http.get(`${BASE_URL}/ingest/decide`, async () => {
		return HttpResponse.json({ status: "ok" });
	}),
];

/**
 * Error scenario handlers
 */
export const posthogErrorHandlers = {
	// 500 Internal Server Error
	serverError: http.post(`${BASE_URL}/ingest/:path*`, () => {
		return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
	}),

	// 429 Rate Limit
	rateLimit: http.post(`${BASE_URL}/ingest/:path*`, () => {
		return HttpResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
	}),

	// Network timeout (delay)
	timeout: http.post(`${BASE_URL}/ingest/:path*`, async () => {
		await new Promise((resolve) => setTimeout(resolve, 10000));
		return HttpResponse.json({ status: 1 });
	}),

	// Network error
	networkError: http.post(`${BASE_URL}/ingest/:path*`, () => {
		return HttpResponse.error();
	}),
};
