/**
 * Security validation utilities for MCP server
 * Implements P0 security fixes:
 * - P0-1: Error logging with context
 * - P0-4: API key format validation
 * - P0-7: Workspace path injection prevention
 * - P0-8: CORS origin validation
 * - P1-3: Request body size limits
 *
 * Unified Auth Integration:
 * - Validates API keys against Better Auth
 * - Checks mcp:tools scope permission
 */

// Security constants
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB - P1-3
// ✅ CONSOLIDATED: Use sk_live_/sk_test_ prefix (aligned with Better Auth)
// Better Auth generates 64-char keys, but accept 32+ for backwards compatibility
const API_KEY_PATTERN = /^sk_(live|test)_[a-zA-Z0-9]{32,}$/; // P0-4
const DANGEROUS_CHARS = /[;<>|&$`\\]/; // Command injection protection
const PATH_DANGEROUS_CHARS = /[<>|&;$`\\]/; // Path injection protection

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates API key format and prefix
 * @param apiKey - The API key to validate
 * @returns Validation result
 */
export function validateApiKey(apiKey: string | undefined): ValidationResult {
	if (!apiKey || apiKey.trim() === "") {
		return {
			valid: false,
			error: "Missing API key",
		};
	}

	// Check for valid prefix and format
	if (!API_KEY_PATTERN.test(apiKey)) {
		return {
			valid: false,
			error: "Invalid API key format. Must start with sk_live_ or sk_test_ followed by at least 32 alphanumeric characters",
		};
	}

	// Check for dangerous characters (command injection prevention)
	if (DANGEROUS_CHARS.test(apiKey)) {
		return {
			valid: false,
			error: "Invalid API key format. Contains illegal characters",
		};
	}

	return { valid: true };
}

/**
 * Validates API key against Better Auth
 * Uses Better Auth's verifyApiKey with mcp:tools permission requirement
 *
 * @param apiKey - The raw API key from request
 * @returns Validation result with user ID if valid
 */
export async function validateApiKeyWithDatabase(apiKey: string): Promise<ValidationResult & { userId?: string }> {
	// First check format
	const formatCheck = validateApiKey(apiKey);
	if (!formatCheck.valid) {
		return formatCheck;
	}

	try {
		// Lazy import to avoid circular dependencies and allow testing
		const { auth } = await import("@snapback/auth");

		// Use Better Auth's verifyApiKey with MCP permission check
		const result = await auth.api.verifyApiKey({
			body: {
				key: apiKey,
				permissions: { mcp: ["tools"] }, // Require mcp:tools permission
			},
		});

		if (!result.valid) {
			// Map Better Auth error codes to user-friendly messages
			const errorCode = result.error?.code;
			let errorMessage = "Invalid API key";

			switch (errorCode) {
				case "KEY_REVOKED":
					errorMessage = "API key has been revoked";
					break;
				case "KEY_EXPIRED":
					errorMessage = "API key has expired";
					break;
				case "INSUFFICIENT_PERMISSIONS":
					errorMessage = "API key does not have mcp:tools permission";
					break;
				case "RATE_LIMITED":
					errorMessage = "API key rate limit exceeded";
					break;
				default:
					errorMessage = result.error?.message || "Invalid API key";
			}

			return {
				valid: false,
				error: errorMessage,
			};
		}

		return {
			valid: true,
			userId: result.key?.userId,
		};
	} catch (error) {
		console.error("[MCP Auth] Better Auth validation error:", error);
		// ⚠️ SECURITY: Never allow fallback to format-only validation
		// This would bypass authentication entirely
		return {
			valid: false,
			error: "Authentication service unavailable. Please try again later.",
		};
	}
}

/**
 * Validates workspace path for security
 * @param workspace - The workspace path to validate
 * @returns Validation result
 */
export function validateWorkspace(workspace: string | undefined): ValidationResult {
	if (!workspace || workspace.trim() === "") {
		return {
			valid: false,
			error: "Missing workspace parameter",
		};
	}

	// Check for path traversal attempts
	if (workspace.includes("..")) {
		return {
			valid: false,
			error: "Invalid workspace path. Path traversal detected",
		};
	}

	// Must be absolute path
	if (!workspace.startsWith("/")) {
		return {
			valid: false,
			error: "Invalid workspace path. Must be an absolute path",
		};
	}

	// Check for null bytes (security vulnerability)
	if (workspace.includes("\0")) {
		return {
			valid: false,
			error: "Invalid workspace path. Contains null bytes",
		};
	}

	// Check for suspicious characters (path injection prevention)
	if (PATH_DANGEROUS_CHARS.test(workspace)) {
		return {
			valid: false,
			error: "Invalid workspace path. Contains illegal characters",
		};
	}

	return { valid: true };
}

/**
 * Validates CORS origin configuration
 * @param origin - The CORS origin to validate
 * @param nodeEnv - Current NODE_ENV
 * @returns Validation result
 */
export function validateCorsOrigin(origin: string | undefined, nodeEnv: string): ValidationResult {
	// Wildcard not allowed in production
	if (nodeEnv === "production" && origin === "*") {
		return {
			valid: false,
			error: "Wildcard CORS origin (*) not allowed in production",
		};
	}

	return { valid: true };
}

/**
 * Get allowed CORS origin for request
 * @param requestOrigin - Origin from request header
 * @param allowedOrigins - Configured allowed origins (comma-separated or single)
 * @returns The origin to use in response, or null if not allowed
 */
export function getAllowedCorsOrigin(requestOrigin: string | undefined, allowedOrigins: string): string | null {
	if (allowedOrigins === "*") {
		return "*";
	}

	if (!requestOrigin) {
		return allowedOrigins.split(",")[0] || null;
	}

	const origins = allowedOrigins.split(",").map((o) => o.trim());

	if (origins.includes(requestOrigin)) {
		return requestOrigin;
	}

	return null;
}

/**
 * Get max body size in bytes
 */
export function getMaxBodySize(): number {
	return MAX_BODY_SIZE;
}
