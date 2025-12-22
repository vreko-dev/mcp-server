/**
 * Next.js Instrumentation
 *
 * Registers Sentry for server-side and edge runtime error tracking.
 * This file is automatically loaded by Next.js 15+ via the instrumentation hook.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./sentry.server.config");
	}

	if (process.env.NEXT_RUNTIME === "edge") {
		await import("./sentry.edge.config");
	}
}

/**
 * Capture unhandled request errors in Server Components and API routes.
 * Next.js 15+ automatically calls this for uncaught errors.
 */
export const onRequestError = Sentry.captureRequestError;
