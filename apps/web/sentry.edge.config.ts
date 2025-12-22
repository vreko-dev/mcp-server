/**
 * Sentry Edge Runtime Configuration
 *
 * Initializes Sentry for Edge runtime (middleware, edge API routes).
 * Imported by instrumentation.ts when NEXT_RUNTIME === 'edge'.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

// Only initialize if DSN is configured
if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || "development",

		// Performance monitoring: 10% in production, 100% in development
		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

		// Edge runtime has limited capabilities - keep config minimal
	});
}
