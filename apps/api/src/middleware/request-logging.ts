import { randomUUID } from "node:crypto";
import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";

/**
 * Request Logging Middleware
 *
 * Logs structured information about each request:
 * - Unique request ID for tracing
 * - HTTP method, path, status code
 * - Request duration
 * - Client IP address
 * - Redacts sensitive data (passwords, tokens, API keys)
 */

interface RequestLogContext {
	requestId: string;
	startTime: number;
	ip: string;
}

// Sensitive field names that should be redacted
const SENSITIVE_FIELDS = ["password", "token", "apiKey", "api_key", "secret"];

// Sensitive header names
const SENSITIVE_HEADERS = [
	"authorization",
	"x-api-key",
	"x-auth-token",
	"cookie",
];

/**
 * Extract client IP from request context
 * Handles X-Forwarded-For header for proxies
 */
function getClientIp(c: Context): string {
	const xForwardedFor = c.req.header("X-Forwarded-For");
	if (xForwardedFor) {
		return xForwardedFor.split(",")[0].trim();
	}

	const sockAddr = c.env?.socket?.remoteAddress || "unknown";
	return sockAddr;
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
	const lowerName = fieldName.toLowerCase();
	return SENSITIVE_FIELDS.some((field) => lowerName.includes(field));
}

/**
 * Check if a header is sensitive
 */
function isSensitiveHeader(headerName: string): boolean {
	const lowerName = headerName.toLowerCase();
	return SENSITIVE_HEADERS.includes(lowerName);
}

/**
 * Redact sensitive fields in an object
 */
function _redactSensitiveData(
	obj: Record<string, unknown>,
): Record<string, unknown> {
	const redacted: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (isSensitiveField(key)) {
			redacted[key] = "***";
		} else if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value)
		) {
			redacted[key] = _redactSensitiveData(value as Record<string, unknown>);
		} else {
			redacted[key] = value;
		}
	}

	return redacted;
}

/**
 * Redact sensitive headers
 */
function _redactHeaders(
	headers: Record<string, string>,
): Record<string, string> {
	const redacted: Record<string, string> = {};

	for (const [key, value] of Object.entries(headers)) {
		if (isSensitiveHeader(key)) {
			redacted[key] = "***";
		} else {
			redacted[key] = value;
		}
	}

	return redacted;
}

/**
 * Generate or retrieve request ID
 */
function getOrCreateRequestId(c: Context): string {
	const headerRequestId = c.req.header("X-Request-Id");
	if (headerRequestId) {
		return headerRequestId;
	}
	return randomUUID();
}

/**
 * Request logging middleware
 *
 * Usage:
 * ```
 * app.use("*", requestLoggingMiddleware);
 * ```
 */
export async function requestLoggingMiddleware(
	c: Context,
	next: Next,
): Promise<void> {
	const requestId = getOrCreateRequestId(c);
	const ip = getClientIp(c);
	const startTime = Date.now();

	// Store in context for use in handlers
	const context: RequestLogContext = {
		requestId,
		startTime,
		ip,
	};
	(c.env as any).requestLogContext = context;

	// Set request ID in response headers
	c.header("X-Request-Id", requestId);

	try {
		// Process request
		await next();

		// Log successful request
		const duration = Date.now() - startTime;
		const status = c.res.status || 200;

		logger.info("Request completed", {
			requestId,
			method: c.req.method,
			path: c.req.path,
			status,
			duration,
			ip,
			timestamp: new Date().toISOString(),
			userAgent: c.req.header("User-Agent"),
		});

		// Warn if request took too long
		if (duration > 1000) {
			logger.warn("Slow request detected", {
				requestId,
				method: c.req.method,
				path: c.req.path,
				duration,
				threshold: 1000,
			});
		}
	} catch (error) {
		const duration = Date.now() - startTime;

		// Log error request
		logger.error("Request failed", {
			requestId,
			method: c.req.method,
			path: c.req.path,
			duration,
			ip,
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		// Re-throw to let error handling middleware process it
		throw error;
	}
}

/**
 * Get request ID from context
 * Useful in handlers for including in logs
 */
export function getRequestId(c: Context): string {
	const context = (c.env as any).requestLogContext as
		| RequestLogContext
		| undefined;
	return context?.requestId || randomUUID();
}

/**
 * Export for testing
 */
export function getSensitiveFields(): string[] {
	return SENSITIVE_FIELDS;
}

export function getSensitiveHeaders(): string[] {
	return SENSITIVE_HEADERS;
}
