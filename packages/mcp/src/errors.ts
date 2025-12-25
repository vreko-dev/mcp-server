/**
 * Error Codes and Structured Logging
 *
 * P1-002: Stable error codes for all handlers
 * P1-003: Structured logging with request IDs
 *
 * @module errors
 */

import { randomUUID } from "node:crypto";

// ============================================================================
// P1-002: Stable Error Codes
// ============================================================================

/**
 * Error codes for MCP tool responses
 * Format: CATEGORY_SPECIFIC_ERROR
 */
export const ErrorCodes = {
	// Validation errors (1xx)
	MISSING_REQUIRED_PARAM: "E101_MISSING_REQUIRED_PARAM",
	INVALID_PARAM_TYPE: "E102_INVALID_PARAM_TYPE",
	INVALID_PARAM_VALUE: "E103_INVALID_PARAM_VALUE",
	VALIDATION_FAILED: "E104_VALIDATION_FAILED",
	PATH_TRAVERSAL_BLOCKED: "E105_PATH_TRAVERSAL_BLOCKED",

	// Resource errors (2xx)
	FILE_NOT_FOUND: "E201_FILE_NOT_FOUND",
	SNAPSHOT_NOT_FOUND: "E202_SNAPSHOT_NOT_FOUND",
	SESSION_NOT_FOUND: "E203_SESSION_NOT_FOUND",
	CONTEXT_NOT_INITIALIZED: "E204_CONTEXT_NOT_INITIALIZED",

	// Permission errors (3xx)
	TIER_GATE_BLOCKED: "E301_TIER_GATE_BLOCKED",
	OPERATION_NOT_ALLOWED: "E302_OPERATION_NOT_ALLOWED",

	// Runtime errors (4xx)
	SNAPSHOT_CREATE_FAILED: "E401_SNAPSHOT_CREATE_FAILED",
	SNAPSHOT_RESTORE_FAILED: "E402_SNAPSHOT_RESTORE_FAILED",
	STORAGE_ERROR: "E403_STORAGE_ERROR",
	CONTEXT_OPERATION_FAILED: "E404_CONTEXT_OPERATION_FAILED",
	SESSION_OPERATION_FAILED: "E405_SESSION_OPERATION_FAILED",

	// Unknown errors (5xx)
	UNKNOWN_TOOL: "E501_UNKNOWN_TOOL",
	HANDLER_ERROR: "E502_HANDLER_ERROR",
	INTERNAL_ERROR: "E503_INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// P1-003: Structured Logging
// ============================================================================

/**
 * Request context for structured logging
 */
export interface RequestContext {
	requestId: string;
	tool: string;
	startTime: number;
	userId?: string;
	tier?: string;
}

/**
 * Create a new request context
 */
export function createRequestContext(tool: string, options?: { userId?: string; tier?: string }): RequestContext {
	return {
		requestId: randomUUID().slice(0, 8), // Short ID for readability
		tool,
		startTime: Date.now(),
		userId: options?.userId,
		tier: options?.tier,
	};
}

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured log entry
 */
export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	requestId: string;
	tool: string;
	message: string;
	duration?: number;
	error?: {
		code: ErrorCode;
		message: string;
		details?: Record<string, unknown>;
	};
	metadata?: Record<string, unknown>;
}

/**
 * Log to stderr with structured format
 */
export function log(level: LogLevel, ctx: RequestContext, message: string, metadata?: Record<string, unknown>): void {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		requestId: ctx.requestId,
		tool: ctx.tool,
		message,
		duration: Date.now() - ctx.startTime,
		metadata,
	};

	// Log as JSON for structured parsing
	console.error(`[SnapBack MCP] ${JSON.stringify(entry)}`);
}

/**
 * Log error with structured format
 */
export function logError(
	ctx: RequestContext,
	code: ErrorCode,
	message: string,
	details?: Record<string, unknown>,
): void {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: "error",
		requestId: ctx.requestId,
		tool: ctx.tool,
		message,
		duration: Date.now() - ctx.startTime,
		error: { code, message, details },
	};

	console.error(`[SnapBack MCP] ${JSON.stringify(entry)}`);
}

/**
 * Log successful completion
 */
export function logSuccess(ctx: RequestContext, message: string, metadata?: Record<string, unknown>): void {
	log("info", ctx, message, { ...metadata, status: "success" });
}

// ============================================================================
// Structured Error Response Builder
// ============================================================================

/**
 * Build a structured error response
 */
export function buildErrorResponse(
	code: ErrorCode,
	message: string,
	details?: Record<string, unknown>,
): {
	error: ErrorCode;
	message: string;
	details?: Record<string, unknown>;
} {
	return {
		error: code,
		message,
		...(details && { details }),
	};
}

/**
 * Common error responses
 */
export const CommonErrors = {
	missingParam: (param: string) =>
		buildErrorResponse(ErrorCodes.MISSING_REQUIRED_PARAM, `Missing required parameter: ${param}`, { param }),

	invalidParam: (param: string, expected: string, received: unknown) =>
		buildErrorResponse(ErrorCodes.INVALID_PARAM_VALUE, `Invalid value for ${param}: expected ${expected}`, {
			param,
			expected,
			received,
		}),

	fileNotFound: (filePath: string) =>
		buildErrorResponse(ErrorCodes.FILE_NOT_FOUND, `File not found: ${filePath}`, { filePath }),

	snapshotNotFound: (snapshotId: string) =>
		buildErrorResponse(ErrorCodes.SNAPSHOT_NOT_FOUND, `Snapshot not found: ${snapshotId}`, { snapshotId }),

	pathTraversalBlocked: (path: string, reason: string) =>
		buildErrorResponse(ErrorCodes.PATH_TRAVERSAL_BLOCKED, reason, { path }),

	tierGateBlocked: (tool: string, requiredTier: string, currentTier: string) =>
		buildErrorResponse(ErrorCodes.TIER_GATE_BLOCKED, `Tool '${tool}' requires ${requiredTier} tier`, {
			tool,
			requiredTier,
			currentTier,
			upgradeUrl: "https://snapback.dev/pricing",
		}),

	handlerError: (tool: string, message: string) => buildErrorResponse(ErrorCodes.HANDLER_ERROR, message, { tool }),
};
