/**
 * PostHog Analytics Mock Handlers
 *
 * Provides mock implementations of PostHog analytics endpoints
 * for testing without sending real analytics events.
 *
 * @example
 * ```typescript
 * import { server } from "@snapback/testing/msw/server";
 * import { posthogHandlers } from "@snapback/testing/msw/handlers/posthog";
 *
 * // PostHog handlers are included by default in the server
 * ```
 */

import { HttpResponse, http } from "msw";

/**
 * PostHog mock handlers
 * Simulates PostHog analytics endpoints for testing
 */
export const posthogHandlers = [
	http.post("https://us.i.posthog.com/batch", () => HttpResponse.json({ status: "ok" })),
	http.post("https://us.i.posthog.com/capture", () => HttpResponse.json({ status: "ok" })),
	http.post("https://us.i.posthog.com/decide", () =>
		HttpResponse.json({
			featureFlags: {},
			sessionRecording: false,
		}),
	),
];
