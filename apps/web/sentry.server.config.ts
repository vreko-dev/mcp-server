/**
 * Sentry Server-Side Configuration
 *
 * Initializes Sentry for Node.js server-side error tracking in Next.js.
 * Imported by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

// Only initialize if DSN is configured
if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || "development",
		release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,

		// Performance monitoring: 10% in production, 100% in development
		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

		// Ignore common non-critical errors
		ignoreErrors: [
			// Network errors
			"NetworkError",
			"Failed to fetch",
			"Load failed",
			// Aborted requests
			"AbortError",
		],

		// PII scrubbing - consistent with apps/api/lib/sentry.ts
		beforeSend(event) {
			// Redact sensitive headers
			if (event.request?.headers) {
				delete event.request.headers.authorization;
				delete event.request.headers.cookie;
				delete event.request.headers["x-api-key"];
			}

			// Redact email addresses in user context
			if (event.user?.email) {
				event.user.email = "[REDACTED]";
			}

			// Redact absolute file paths
			if (event.exception?.values) {
				for (const exception of event.exception.values) {
					if (exception.stacktrace?.frames) {
						for (const frame of exception.stacktrace.frames) {
							if (frame.filename) {
								frame.filename = frame.filename
									.replace(/\/Users\/[^/]+\//g, "/Users/[user]/")
									.replace(/\/home\/[^/]+\//g, "/home/[user]/")
									.replace(/C:\\Users\\[^\\]+\\/g, "C:\\Users\\[user]\\");
							}
						}
					}
				}
			}

			return event;
		},
	});
}
