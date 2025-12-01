// ... existing code ...

/**
 * Standardized error codes for client-facing errors
 */
export type AppErrorCode =
	| "NETWORK" // Network/connectivity issues
	| "UNAUTHORIZED" // 401 - needs authentication
	| "FORBIDDEN" // 403 - lacks permission
	| "NOT_FOUND" // 404 - resource doesn't exist
	| "RATE_LIMITED" // 429 - too many requests
	| "VALIDATION" // 400 - invalid input
	| "LIMIT_EXCEEDED" // 402/403 - usage limit hit
	| "INTERNAL" // 500 - server error
	| "CONFLICT" // 409 - resource conflict
	| "TIMEOUT"; // 408 - request timeout

/**
 * Structured application error
 */
export interface AppError {
	code: AppErrorCode;
	message: string;
	details?: unknown;
	retryable: boolean;
	statusCode?: number;
}

/**
 * Convert any error to structured AppError
 */
export function toAppError(
	error: unknown,
	fallbackCode: AppErrorCode = "INTERNAL",
): AppError {
	// Already an AppError
	if (isAppError(error)) {
		return error;
	}

	// Handle Drizzle database errors
	if (isDrizzleError(error)) {
		return handleDrizzleError(error as Error);
	}

	// Handle fetch/network errors
	if (error instanceof TypeError && error.message.includes("fetch")) {
		return {
			code: "NETWORK",
			message: "Network error. Please check your connection.",
			details: error,
			retryable: true,
			statusCode: 0,
		};
	}

	// Handle Response errors (fetch API)
	if (error instanceof Response) {
		// For sync context, create a basic error - in practice this should be handled in async context
		return {
			code: "INTERNAL",
			message: `HTTP Error: ${error.status} ${error.statusText}`,
			details: { status: error.status, statusText: error.statusText },
			retryable: false,
			statusCode: error.status,
		};
	}

	// Handle standard Error objects
	if (error instanceof Error) {
		// Check for specific error patterns
		if (
			error.message.includes("unauthorized") ||
			error.message.includes("401")
		) {
			return {
				code: "UNAUTHORIZED",
				message: "Authentication required. Please sign in.",
				details: error,
				retryable: false,
				statusCode: 401,
			};
		}

		if (error.message.includes("forbidden") || error.message.includes("403")) {
			return {
				code: "FORBIDDEN",
				message: "You don't have permission to access this resource.",
				details: error,
				retryable: false,
				statusCode: 403,
			};
		}

		if (error.message.includes("not found") || error.message.includes("404")) {
			return {
				code: "NOT_FOUND",
				message: "Resource not found.",
				details: error,
				retryable: false,
				statusCode: 404,
			};
		}

		if (error.message.includes("rate limit") || error.message.includes("429")) {
			return {
				code: "RATE_LIMITED",
				message: "Too many requests. Please try again in a moment.",
				details: error,
				retryable: true,
				statusCode: 429,
			};
		}

		if (error.message.includes("timeout")) {
			return {
				code: "TIMEOUT",
				message: "Request timed out. Please try again.",
				details: error,
				retryable: true,
				statusCode: 408,
			};
		}

		// Generic error
		return {
			code: fallbackCode,
			message: error.message || "An error occurred",
			details: error,
			retryable: fallbackCode === "NETWORK" || fallbackCode === "TIMEOUT",
			statusCode: 500,
		};
	}

	// Unknown error type
	console.error("Unknown error type:", error);
	return {
		code: fallbackCode,
		message: "An unexpected error occurred",
		details: error,
		retryable: false,
		statusCode: 500,
	};
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: AppError): string {
	const messages: Record<AppErrorCode, string> = {
		NETWORK: "Network error. Please check your connection and try again.",
		UNAUTHORIZED: "You need to sign in to continue.",
		FORBIDDEN: "You don't have permission to perform this action.",
		NOT_FOUND: "The requested resource was not found.",
		RATE_LIMITED:
			"Too many requests. Please slow down and try again in a moment.",
		VALIDATION: "Invalid input. Please check your data and try again.",
		LIMIT_EXCEEDED:
			"Usage limit exceeded. Please upgrade your plan to continue.",
		INTERNAL: "Something went wrong on our end. Please try again.",
		CONFLICT: "This resource has been modified. Please refresh and try again.",
		TIMEOUT: "Request timed out. Please check your connection and try again.",
	};

	return error.message || messages[error.code] || messages.INTERNAL;
}

/**
 * Type guard for AppError
 */
function isAppError(error: unknown): error is AppError {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"message" in error &&
		"retryable" in error
	);
}

/**
 * Handle Drizzle ORM errors
 */
function isDrizzleError(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.constructor.name.includes("Drizzle") ||
			error.message.includes("postgres") ||
			error.message.includes("database"))
	);
}

function handleDrizzleError(error: Error): AppError {
	// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
	const message = error.message.toLowerCase();

	// Unique constraint violation (23505)
	if (message.includes("unique") || message.includes("23505")) {
		return {
			code: "CONFLICT",
			message: "This resource already exists.",
			details: error,
			retryable: false,
			statusCode: 409,
		};
	}

	// Foreign key violation (23503)
	if (message.includes("foreign key") || message.includes("23503")) {
		return {
			code: "VALIDATION",
			message: "Referenced resource does not exist.",
			details: error,
			retryable: false,
			statusCode: 400,
		};
	}

	// Not null violation (23502)
	if (message.includes("not null") || message.includes("23502")) {
		return {
			code: "VALIDATION",
			message: "Required field is missing.",
			details: error,
			retryable: false,
			statusCode: 400,
		};
	}

	// Generic database error
	console.error("Database error:", error);
	return {
		code: "INTERNAL",
		message: "Database error occurred.",
		details: error,
		retryable: false,
		statusCode: 500,
	};
}

/**
 * Handle Response errors from fetch
 * TODO: Re-enable when response error handling is implemented
 */
// async function _handleResponseError(response: Response): Promise<AppError> {
// 	const statusCode = response.status;
// 	let message = response.statusText;
//
// 	// Try to extract error message from response body
// 	try {
// 		const body = await response.json();
// 		if (body.error) {
// 			message =
// 				typeof body.error === "string" ? body.error : body.error.message;
// 		} else if (body.message) {
// 			message = body.message;
// 		}
// 	} catch {
// 		// Couldn't parse body, use statusText
// 	}
//
// 	const codeMap: Record<number, AppErrorCode> = {
// 		400: "VALIDATION",
// 		401: "UNAUTHORIZED",
// 		403: "FORBIDDEN",
// 		404: "NOT_FOUND",
// 		408: "TIMEOUT",
// 		409: "CONFLICT",
// 		429: "RATE_LIMITED",
// 		500: "INTERNAL",
// 		502: "NETWORK",
// 		503: "NETWORK",
// 		504: "TIMEOUT",
// 	};
//
// 	const code = codeMap[statusCode] || "INTERNAL";
//
// 	return {
// 		code,
// 		message,
// 		details: { statusCode, statusText: response.statusText },
// 		retryable: [408, 429, 500, 502, 503, 504].includes(statusCode),
// 		statusCode,
// 	};
// }

/**
 * Log error with context
 */
export function logError(
	error: AppError,
	context?: Record<string, unknown>,
): void {
	console.error("Application error:", {
		code: error.code,
		message: error.message,
		retryable: error.retryable,
		statusCode: error.statusCode,
		...context,
		details: error.details,
	});
}
