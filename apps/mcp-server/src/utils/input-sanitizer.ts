/**
 * Input Sanitization Module
 *
 * Provides PII redaction, payload validation, and error sanitization
 * for MCP server inputs/outputs following security best practices.
 *
 * Security Features:
 * - Email address redaction (RFC 5322 compliant)
 * - File path redaction (Unix/Windows paths)
 * - IP address redaction (IPv4 support)
 * - User ID redaction (configurable patterns)
 * - Production error sanitization
 * - Stack trace removal in production
 *
 * @module input-sanitizer
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * PII redaction patterns
 * These regex patterns identify common PII in user inputs
 */
const PII_PATTERNS = {
	// RFC 5322 Email address pattern (simplified)
	email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

	// Unix/Windows file paths with extensions
	filePath: /(?:\/[\w/.-]+\.\w+)|(?:[A-Z]:\\[\w\\\-.]+\.\w+)/gi,

	// IPv4 addresses
	ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

	// User identifiers (user_, auth_token_, api_key_, etc.)
	userId: /\b(?:user|auth_token|api_key|session)_[a-zA-Z0-9]+\b/g,
} as const;

/**
 * Redaction tokens for PII
 */
const REDACTION_TOKENS = {
	email: "[EMAIL]",
	filePath: "[PATH]",
	ipv4: "[IP]",
	userId: "[USER_ID]",
} as const;

/**
 * Sensitive keywords that indicate internal errors
 * Should NOT be exposed in production error messages
 */
const SENSITIVE_ERROR_KEYWORDS = ["PostgreSQL", "password", "authentication", "admin", "secret", "token"] as const;

/**
 * Sanitize input by removing PII
 *
 * Recursively processes object properties to redact sensitive information
 * while preserving data structure.
 *
 * @param input - Input object to sanitize
 * @returns Sanitized copy of input with PII redacted
 *
 * @example
 * ```ts
 * const input = { code: 'email = "user@example.com"' };
 * const sanitized = sanitizeInput(input);
 * // { code: 'email = "[EMAIL]"' }
 * ```
 */
export function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(input)) {
		if (typeof value === "string") {
			sanitized[key] = sanitizeString(value);
		} else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			// Recursively sanitize nested objects
			sanitized[key] = sanitizeInput(value as Record<string, unknown>);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Sanitize a string value by redacting PII patterns
 *
 * Applies all PII redaction patterns sequentially to ensure
 * comprehensive sanitization.
 *
 * @param value - String to sanitize
 * @returns Sanitized string with PII replaced by tokens
 * @internal
 */
function sanitizeString(value: string): string {
	let sanitized = value;

	// Apply all PII redaction patterns
	sanitized = sanitized.replace(PII_PATTERNS.email, REDACTION_TOKENS.email);
	sanitized = sanitized.replace(PII_PATTERNS.filePath, REDACTION_TOKENS.filePath);
	sanitized = sanitized.replace(PII_PATTERNS.ipv4, REDACTION_TOKENS.ipv4);
	sanitized = sanitized.replace(PII_PATTERNS.userId, REDACTION_TOKENS.userId);

	return sanitized;
}

/**
 * Sanitized error response
 *
 * Structured error object safe for client consumption
 */
export interface SanitizedError {
	/** Human-readable error message (sanitized in production) */
	message: string;

	/** Error type classifier (e.g., 'VALIDATION_ERROR', 'SECURITY_ERROR') */
	type: string;

	/** Unique log ID for support correlation */
	logId?: string;

	/** Stack trace (only included in development) */
	stack?: string;
}

/**
 * Sanitize error for client response
 *
 * Removes sensitive information in production environments while
 * preserving debugging context in development.
 *
 * **Security Guarantees:**
 * - Production: Stack traces removed, sensitive keywords redacted
 * - Development: Full error details preserved
 * - All errors: Unique log ID for support correlation
 *
 * @param error - Error to sanitize (Error or ZodError)
 * @returns Sanitized error safe for client transmission
 *
 * @example
 * ```ts
 * try {
 *   await dbQuery();
 * } catch (err) {
 *   const safe = sanitizeError(err);
 *   return res.status(500).json(safe);
 * }
 * ```
 */
export function sanitizeError(error: Error | z.ZodError): SanitizedError {
	const isProduction = process.env.NODE_ENV === "production";

	// Handle Zod validation errors (always safe to expose)
	if (error instanceof z.ZodError) {
		return {
			message: "Validation failed",
			type: "VALIDATION_ERROR",
			logId: randomUUID(),
		};
	}

	// Handle SecurityError (always safe to expose)
	if (error.name === "SecurityError") {
		return {
			message: error.message,
			type: "SECURITY_ERROR",
			logId: randomUUID(),
		};
	}

	// Production: Sanitize sensitive information
	if (isProduction) {
		return sanitizeProductionError(error);
	}

	// Development: Include full context
	return {
		message: error.message,
		type: "ERROR",
		stack: error.stack,
		logId: randomUUID(),
	};
}

/**
 * Sanitize error for production environments
 *
 * Checks for sensitive keywords in error messages/stacks and
 * returns generic messages when detected.
 *
 * @param error - Error to sanitize
 * @returns Sanitized error for production
 * @internal
 */
function sanitizeProductionError(error: Error): SanitizedError {
	const sensitiveMessage = error.message.toLowerCase();
	const sensitiveStack = error.stack?.toLowerCase() || "";

	// Check if error contains sensitive keywords
	const hasSensitiveInfo = SENSITIVE_ERROR_KEYWORDS.some(
		(keyword) => sensitiveMessage.includes(keyword.toLowerCase()) || sensitiveStack.includes(keyword.toLowerCase()),
	);

	if (hasSensitiveInfo) {
		return {
			message: "An unexpected error occurred",
			type: "INTERNAL_ERROR",
			logId: randomUUID(),
		};
	}

	// Safe error - preserve message but remove stack
	return {
		message: error.message,
		type: "ERROR",
		logId: randomUUID(),
	};
}
