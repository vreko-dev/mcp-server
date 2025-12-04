/**
 * Sentry Middleware for Hono
 * Integrates Sentry error tracking into the API service
 */

import * as Sentry from "@sentry/node";
import { logger } from "@snapback/infrastructure";

/**
 * Initialize Sentry in the API service
 */
export function initSentryAPI(options?: {
	enabled?: boolean;
	dsn?: string;
	environment?: string;
	tracesSampleRate?: number;
}) {
	// Check if explicitly disabled
	if (process.env.DISABLE_SENTRY === "true" || options?.enabled === false) {
		logger.info("Sentry is disabled");
		return;
	}

	const dsn = options?.dsn || process.env.SENTRY_DSN;

	if (!dsn) {
		logger.warn("SENTRY_DSN not configured, Sentry error tracking disabled");
		return;
	}

	try {
		Sentry.init({
			dsn,
			environment:
				options?.environment || process.env.NODE_ENV || "development",
			release: process.env.GIT_SHA || process.env.RELEASE,
			tracesSampleRate:
				options?.tracesSampleRate ??
				(process.env.NODE_ENV === "production" ? 0.1 : 1.0),
			integrations: [Sentry.httpIntegration()],
			beforeSend: (event, _hint) => {
				// Don't capture 404 errors (too noisy)
				if (
					event?.exception?.values?.[0]?.value?.includes?.("404") ||
					event?.request?.url?.includes?.("/favicon.ico")
				) {
					return null;
				}

				// Scrub sensitive headers
				if (event?.request?.headers) {
					delete event.request.headers.authorization;
					delete event.request.headers.cookie;
					delete event.request.headers["x-api-key"];
				}

				return event;
			},
		});

		logger.info("✅ Sentry initialized for API error tracking");
	} catch (error) {
		logger.error("Failed to initialize Sentry", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Hono middleware for Sentry request tracking
 */
export function honoSentryMiddleware() {
	return async (c: any, next: any) => {
		// Create a span for this request
		return await Sentry.startSpan(
			{
				op: "http.server",
				name: `${c.req.method} ${c.req.path}`,
			},
			async () => {
				// Add user context if available
				const userId = c.get("userId");
				const organizationId = c.get("organizationId");

				if (userId) {
					Sentry.setUser({ id: userId });
				}

				if (organizationId) {
					Sentry.setTag("organization_id", organizationId);
				}

				// Set request context
				Sentry.setTag("http.method", c.req.method);
				Sentry.setTag("http.path", c.req.path);
				Sentry.addBreadcrumb({
					category: "http",
					message: `${c.req.method} ${c.req.path}`,
					level: "info",
				});

				try {
					await next();

					// Set response status
					Sentry.setTag("http.status_code", c.res.status);
				} catch (error) {
					// Capture error to Sentry
					Sentry.captureException(error, {
						tags: {
							http_method: c.req.method,
							http_path: c.req.path,
						},
					});

					throw error;
				}
			},
		);
	};
}

/**
 * Flush Sentry before process exit
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
	try {
		return await Sentry.close(timeout);
	} catch (error) {
		logger.error("Error flushing Sentry", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

export { Sentry };
