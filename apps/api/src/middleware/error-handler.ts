import { type Context } from "hono";
import { logger } from "@snapback/infrastructure";

/**
 * Error Handling Middleware
 *
 * Unified error handling following Result<T, E> pattern:
 * - Catches all unhandled errors
 * - Returns consistent error response format
 * - Sanitizes errors (no internal details)
 * - Logs errors with full context
 * - Supports custom error types with status codes
 * - Distinguishes between user errors (4xx) and server errors (5xx)
 */

/**
 * Standard error response format
 */
export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		statusCode: number;
		requestId?: string;
	};
}

/**
 * Error categorization
 */
type ErrorCategory =
	| "validation_error"
	| "not_found_error"
	| "unauthorized_error"
	| "forbidden_error"
	| "conflict_error"
	| "server_error";

/**
 * Map error messages to error codes and status codes
 */
function categorizeError(error: unknown): {
	code: ErrorCategory;
	statusCode: number;
	message: string;
} {
	if (!(error instanceof Error)) {
		return {
			code: "server_error",
			statusCode: 500,
			message: "An unexpected error occurred",
		};
	}

	// Check for custom error properties
	const customError = error as any;
	if (customError.statusCode) {
		const message = sanitizeErrorMessage(error.message);
		const code = mapStatusToCode(customError.statusCode);
		return {
			code,
			statusCode: customError.statusCode,
			message,
		};
	}

	// Map error messages to codes
	const lowerMessage = error.message.toLowerCase();

	if (
		lowerMessage.includes("validation") ||
		lowerMessage.includes("invalid") ||
		lowerMessage.includes("zod")
	) {
		return {
			code: "validation_error",
			statusCode: 400,
			message: sanitizeErrorMessage(error.message),
		};
	}

	if (
		lowerMessage.includes("not found") ||
		lowerMessage.includes("not exist")
	) {
		return {
			code: "not_found_error",
			statusCode: 404,
			message: "Resource not found",
		};
	}

	if (
		lowerMessage.includes("unauthorized") ||
		lowerMessage.includes("authentication")
	) {
		return {
			code: "unauthorized_error",
			statusCode: 401,
			message: "Authentication required",
		};
	}

	if (
		lowerMessage.includes("forbidden") ||
		lowerMessage.includes("permission")
	) {
		return {
			code: "forbidden_error",
			statusCode: 403,
			message: "Access denied",
		};
	}

	if (lowerMessage.includes("conflict") || lowerMessage.includes("duplicate")) {
		return {
			code: "conflict_error",
			statusCode: 409,
			message: "Resource conflict",
		};
	}

	// Default to server error
	return {
		code: "server_error",
		statusCode: 500,
		message: process.env.NODE_ENV === "production"
			? "Internal server error"
			: sanitizeErrorMessage(error.message),
	};
}

/**
 * Map HTTP status code to error code
 */
function mapStatusToCode(
	statusCode: number
): ErrorCategory {
	switch (statusCode) {
		case 400:
			return "validation_error";
		case 401:
			return "unauthorized_error";
		case 403:
			return "forbidden_error";
		case 404:
			return "not_found_error";
		case 409:
			return "conflict_error";
		default:
			return "server_error";
	}
}

/**
 * Sanitize error message to remove sensitive information
 */
function sanitizeErrorMessage(message: string): string {
	// Remove connection strings
	let sanitized = message.replace(/postgres:\/\/[^\s]+/g, "[DATABASE_URL]");
	sanitized = sanitized.replace(/mongodb:\/\/[^\s]+/g, "[MONGODB_URL]");
	sanitized = sanitized.replace(/redis:\/\/[^\s]+/g, "[REDIS_URL]");

	// Remove API keys
	sanitized = sanitized.replace(/sk_[a-z0-9]+/gi, "[API_KEY]");
	sanitized = sanitized.replace(/pk_[a-z0-9]+/gi, "[API_KEY]");

	// Remove file paths (reduce info leakage)
	sanitized = sanitized.replace(/\/[a-zA-Z0-9/._-]+\/[a-zA-Z0-9._-]+/g, "[FILE_PATH]");

	return sanitized;
}

/**
 * Get request ID from context
 */
function getRequestId(c: Context): string | undefined {
	return c.req.header("X-Request-Id");
}

/**
 * Global error handler for Hono
 */
export function createErrorHandler() {
	return async (err: unknown, c: Context) => {
		const start = Date.now();
		const { code, statusCode, message } = categorizeError(err);
		const requestId = getRequestId(c);
		const duration = Date.now() - start;

		// Log error with context
		logger.error(`Request failed with ${code}`, {
			code,
			statusCode,
			path: c.req.path,
			method: c.req.method,
			duration,
			requestId,
			ip: c.req.header("X-Forwarded-For") || "unknown",
			userAgent: c.req.header("User-Agent"),
			// Only log full error message in development
			fullMessage: process.env.NODE_ENV === "development"
				? err instanceof Error
					? err.message
					: String(err)
				: undefined,
			// Log stack trace in development
			stack: process.env.NODE_ENV === "development"
				? err instanceof Error
					? err.stack
					: undefined
				: undefined,
		});

		// Build error response
		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				code,
				message,
				statusCode,
				requestId,
			},
		};

		// Return JSON error response
		return c.json(errorResponse, statusCode as any);
	};
}

/**
 * Type-safe error throwing with custom status code
 */
export class APIError extends Error {
	constructor(
		message: string,
		readonly statusCode: number = 500
	) {
		super(message);
		this.name = "APIError";
	}
}

/**
 * Validation error
 */
export class ValidationError extends APIError {
	constructor(message: string) {
		super(message, 400);
		this.name = "ValidationError";
	}
}

/**
 * Not found error
 */
export class NotFoundError extends APIError {
	constructor(resource: string) {
		super(`${resource} not found`, 404);
		this.name = "NotFoundError";
	}
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends APIError {
	constructor(message = "Authentication required") {
		super(message, 401);
		this.name = "UnauthorizedError";
	}
}

/**
 * Forbidden error
 */
export class ForbiddenError extends APIError {
	constructor(message = "Access denied") {
		super(message, 403);
		this.name = "ForbiddenError";
	}
}

/**
 * Conflict error
 */
export class ConflictError extends APIError {
	constructor(message: string) {
		super(message, 409);
		this.name = "ConflictError";
	}
}
