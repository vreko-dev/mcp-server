/**
 * Sentry Client-Side Configuration
 *
 * Initializes Sentry for browser error tracking, performance monitoring,
 * and session replay. Imported by instrumentation-client.ts.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize if DSN is configured
if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || "development",

		// Performance monitoring: 10% in production, 100% in development
		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

		// Session Replay: capture 10% of sessions, 100% on error
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,

		integrations: [
			Sentry.replayIntegration({
				// Privacy: mask all text and block media by default
				maskAllText: true,
				blockAllMedia: true,
			}),
		],

		// Ignore common non-critical errors
		ignoreErrors: [
			// Browser extensions
			/extensions\//i,
			/^chrome:\/\//i,
			// Network errors (handled by app)
			"NetworkError",
			"Failed to fetch",
			"Load failed",
			// User-initiated aborts
			"AbortError",
			// ResizeObserver (common, non-critical)
			"ResizeObserver loop",
		],

		// PII scrubbing - consistent with apps/api/lib/sentry.ts
		beforeSend(event) {
			// Redact sensitive headers
			if (event.request?.headers) {
				delete event.request.headers.authorization;
				delete event.request.headers.cookie;
			}

			// Redact email addresses in user context
			if (event.user?.email) {
				event.user.email = "[REDACTED]";
			}

			return event;
		},
	});
}
