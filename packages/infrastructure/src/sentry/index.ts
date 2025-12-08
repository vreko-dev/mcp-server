/**
 * Sentry Error Tracking Integration
 * Provides error aggregation, user impact analysis, and release tracking
 *
 * Usage:
 *   import { initSentry, captureError, captureMessage } from "@snapback/infrastructure/sentry";
 */

// Lazy-load Sentry to avoid native module errors when disabled
let Sentry: typeof import("@sentry/node") | null = null;
let ProfilingIntegration: typeof import("@sentry/profiling-node") | null = null;

async function loadSentry() {
	if (Sentry) {
		return { Sentry, ProfilingIntegration };
	}
	if (process.env.DISABLE_SENTRY === "true") {
		return null;
	}

	try {
		Sentry = await import("@sentry/node");
		ProfilingIntegration = await import("@sentry/profiling-node");
		return { Sentry, ProfilingIntegration };
	} catch (error) {
		console.warn("⚠️  Failed to load Sentry:", error instanceof Error ? error.message : String(error));
		return null;
	}
}

/**
 * Initialize Sentry for error tracking
 *
 * @param options - Sentry configuration options
 */
export async function initSentry(options?: {
	dsn?: string;
	environment?: string;
	release?: string;
	tracesSampleRate?: number;
	profilesSampleRate?: number;
	debug?: boolean;
	enabled?: boolean;
}) {
	// Respect explicit disable flag
	if (process.env.DISABLE_SENTRY === "true" || options?.enabled === false) {
		console.log("ℹ️  Sentry is disabled");
		return;
	}

	const dsn = options?.dsn || process.env.SENTRY_DSN;

	if (!dsn) {
		console.warn("⚠️  SENTRY_DSN not configured. Error tracking disabled.");
		return;
	}

	const modules = await loadSentry();
	if (!modules) {
		return;
	}

	const { Sentry: SentryModule, ProfilingIntegration } = modules;

	SentryModule.init({
		dsn,
		environment: options?.environment || process.env.NODE_ENV || "development",
		release: options?.release || process.env.GIT_SHA || process.env.RELEASE || undefined,
		tracesSampleRate: options?.tracesSampleRate ?? (process.env.NODE_ENV === "production" ? 0.1 : 1.0),
		profilesSampleRate: options?.profilesSampleRate ?? 0.1,
		debug: options?.debug || process.env.DEBUG_SENTRY === "true",
		integrations: [
			new (SentryModule as any).HttpIntegration({
				tracing: true,
				request: true,
			}),
			...(ProfilingIntegration ? [ProfilingIntegration.nodeProfilingIntegration()] : []),
		],
		// Filter out sensitive data
		beforeSend: (event: any) => {
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
			}

			return event;
		},
	});

	console.log("✅ Sentry initialized for error tracking");
}

/**
 * Create Express/Hono middleware for Sentry error handling
 */
export function createSentryMiddleware() {
	if (!Sentry) {
		return {
			requestHandler: (_c: any, next: any) => next(),
			errorHandler: (_c: any, next: any) => next(),
		};
	}
	return {
		requestHandler: (Sentry as any).Handlers?.requestHandler?.() || ((_c: any, next: any) => next()),
		errorHandler: (Sentry as any).Handlers?.errorHandler?.() || ((_c: any, next: any) => next()),
	};
}

/**
 * Capture an error with optional context
 *
 * @param error - The error to capture
 * @param context - Additional context (user, tags, etc.)
 */
export function captureError(
	error: Error | string,
	context?: {
		userId?: string;
		organizationId?: string;
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
	},
) {
	if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
		return;
	}

	Sentry.withScope((scope: any) => {
		if (context) {
			if (context.userId) {
				scope.setUser({ id: context.userId });
			}

			if (context.organizationId) {
				scope.setTag("organization_id", context.organizationId);
			}

			if (context.tags) {
				Object.entries(context.tags).forEach(([key, value]) => {
					scope.setTag(key, value);
				});
			}

			if (context.extra) {
				scope.setContext("extra", context.extra);
			}
		}

		if (Sentry) {
			Sentry.captureException(typeof error === "string" ? new Error(error) : error);
		}
	});
}

/**
 * Capture a message with optional context
 *
 * @param message - The message to capture
 * @param level - Log level (debug, info, warning, error, fatal)
 * @param context - Additional context
 */
export function captureMessage(
	message: string,
	level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
	context?: {
		userId?: string;
		tags?: Record<string, string>;
		extra?: Record<string, unknown>;
	},
) {
	if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
		return;
	}

	Sentry.captureMessage(message, level);

	if (context) {
		Sentry.withScope((scope: any) => {
			if (context.userId) {
				scope.setUser({ id: context.userId });
			}
			if (context.tags) {
				Object.entries(context.tags).forEach(([key, value]) => {
					scope.setTag(key, value);
				});
			}
			if (context.extra) {
				scope.setContext("extra", context.extra);
			}
		});
	}
}

/**
 * Set the current user for error context
 *
 * @param userId - Unique user identifier
 * @param userInfo - Additional user information
 */
export function setSentryUser(
	userId: string,
	userInfo?: {
		email?: string;
		username?: string;
		organizationId?: string;
	},
) {
	if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
		return;
	}

	Sentry.setUser({
		id: userId,
		email: userInfo?.email,
		username: userInfo?.username,
		organization_id: userInfo?.organizationId,
	});
}

/**
 * Clear the current user
 */
export function clearSentryUser() {
	if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
		return;
	}

	Sentry.setUser(null);
}

/**
 * Add breadcrumb for error context
 *
 * @param message - Breadcrumb message
 * @param data - Breadcrumb data
 * @param level - Log level
 */
export function addSentryBreadcrumb(
	message: string,
	data?: Record<string, unknown>,
	level: "debug" | "info" | "warning" | "error" = "info",
) {
	if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
		return;
	}

	Sentry.addBreadcrumb({
		message,
		level,
		data,
		timestamp: Date.now() / 1000,
	});
}

/**
 * Start a transaction for performance monitoring
 *
 * @param name - Transaction name
 * @param op - Operation type (e.g., "http.server", "db.query")
 */
export function startSentryTransaction(name: string, op?: string) {
	if (process.env.DISABLE_SENTRY === "true") {
		return null;
	}

	return (
		(Sentry as any).startTransaction?.({
			name,
			op: op || "operation",
		}) || null
	);
}

/**
 * Flush pending Sentry events
 * Call this before process exit in production
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
	if (process.env.DISABLE_SENTRY === "true" || !Sentry) {
		return true;
	}

	return await Sentry.close(timeout);
}

// Export wrapper functions only (not the full Sentry type to avoid DTS generation issues)
// Applications should use the specific functions exported above
// If direct Sentry access is needed: import * as Sentry from "@sentry/node"
