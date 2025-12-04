/**
 * Sentry Integration
 *
 * Error tracking and monitoring with PII scrubbing
 */

import * as Sentry from "@sentry/node";
import { logger } from "@snapback/infrastructure";

let sentryInitialized = false;

/**
 * Initialize Sentry (call once on app startup)
 */
export function initSentry(): void {
	if (sentryInitialized) {
		return;
	}

	const dsn = process.env.SENTRY_DSN;
	if (!dsn) {
		console.warn("[Sentry] DSN not configured, error tracking disabled");
		return;
	}

	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || "development",
		release:
			process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,

		// Sample rate for performance monitoring
		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

		// Scrub PII before sending to Sentry
		beforeSend(event) {
			return scrubbedEvent(event);
		},

		// Ignore common non-critical errors
		ignoreErrors: [
			// Browser extensions
			/extensions\//i,
			/^chrome:\/\//i,
			// Network errors
			"NetworkError",
			"Failed to fetch",
			"Load failed",
			// Aborted requests
			"AbortError",
		],
	});

	sentryInitialized = true;
	console.log("[Sentry] Initialized", { environment: process.env.NODE_ENV });
}

/**
 * Scrub PII from Sentry events
 */
function scrubbedEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
	// Redact sensitive data
	if (event.request?.headers) {
		delete event.request.headers.authorization;
		delete event.request.headers.cookie;
		delete event.request.headers["x-api-key"];
	}

	// Redact email addresses
	if (event.user?.email) {
		event.user.email = "[REDACTED]";
	}

	// Redact file paths (keep relative paths only)
	if (event.exception?.values) {
		for (const exception of event.exception.values) {
			if (exception.stacktrace?.frames) {
				for (const frame of exception.stacktrace.frames) {
					if (frame.filename) {
						frame.filename = redactFilePath(frame.filename);
					}
				}
			}
		}
	}

	return event;
}

/**
 * Redact absolute file paths
 */
function redactFilePath(path: string): string {
	return path
		.replace(/\/Users\/[^/]+\//g, "/Users/[user]/")
		.replace(/\/home\/[^/]+\//g, "/home/[user]/")
		.replace(/C:\\Users\\[^\\]+\\/g, "C:\\Users\\[user]\\");
}

/**
 * Capture exception with context
 */
export function captureException(
	error: Error,
	context?: {
		userId?: string;
		requestId?: string;
		endpoint?: string;
		extra?: Record<string, any>;
	},
): void {
	if (!sentryInitialized) {
		logger.error("Exception occurred (Sentry not initialized)", {
			error: error.message,
		});
		return;
	}

	Sentry.withScope((scope) => {
		// Add context
		if (context?.userId) {
			scope.setUser({ id: context.userId });
		}
		if (context?.requestId) {
			scope.setTag("requestId", context.requestId);
		}
		if (context?.endpoint) {
			scope.setTag("endpoint", context.endpoint);
		}
		if (context?.extra) {
			scope.setContext("extra", context.extra);
		}

		// Capture exception
		Sentry.captureException(error);
	});

	// Also log locally
	console.error("[Sentry] Exception captured", {
		error: error.message,
		stack: error.stack,
		...context,
	});
}

/**
 * Capture message (for non-error events)
 */
export function captureMessage(
	message: string,
	level: "info" | "warning" | "error" = "info",
	context?: Record<string, any>,
): void {
	if (!sentryInitialized) {
		return;
	}

	Sentry.withScope((scope) => {
		if (context) {
			scope.setContext("message_context", context);
		}
		Sentry.captureMessage(message, level);
	});
}

/**
 * Add breadcrumb (user action trail)
 */
export function addBreadcrumb(
	message: string,
	category: string,
	data?: Record<string, any>,
): void {
	if (!sentryInitialized) {
		return;
	}

	Sentry.addBreadcrumb({
		message,
		category,
		data,
		level: "info",
		timestamp: Date.now() / 1000,
	});
}

/**
 * Flush pending events (call before process exit)
 */
export async function flushSentry(timeout = 2000): Promise<void> {
	if (!sentryInitialized) {
		return;
	}

	await Sentry.close(timeout);
}
