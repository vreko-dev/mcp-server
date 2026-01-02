/**
 * Security validation utilities for MCP server (Phase 1)
 *
 * Implements security validations:
 * - P0-4: API key format validation (format-only, no database)
 * - P0-7: Workspace path injection prevention
 * - P0-8: CORS origin validation
 * - P1-3: Request body size limits
 *
 * Phase 2 will add:
 * - Database-backed API key verification via Better Auth
 * - mcp:tools scope permission checks
 */

// Security constants
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB - P1-3
// ✅ CONSOLIDATED: Use sk_live_/sk_test_ prefix (aligned with Better Auth)
// Better Auth generates 64-char keys, but accept 32+ for backwards compatibility
const API_KEY_PATTERN = /^sk_(live|test)_[a-zA-Z0-9]{32,}$/; // P0-4
// Workspace ID: ws_ prefix + 32 lowercase hex chars (128 bits entropy)
const WORKSPACE_ID_PATTERN = /^ws_[a-f0-9]{32}$/;
const WORKSPACE_ID_LENGTH = 35; // ws_ (3) + 32 hex chars = 35
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

// NOTE: Database-backed API key validation (validateApiKeyWithDatabase) moved to Phase 2
// Phase 1 uses format-only validation for pre-production

/**
 * Validates workspace ID format (P0-4 equivalent for workspace auth)
 * @param workspaceId - The workspace ID to validate
 * @returns Validation result
 */
export function validateWorkspaceId(workspaceId: string | undefined): ValidationResult {
	if (!workspaceId || workspaceId.trim() === "") {
		return {
			valid: false,
			error: "Missing workspace ID",
		};
	}

	// Check for valid prefix and format (ws_ + 32 lowercase hex chars)
	if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
		return {
			valid: false,
			error: "Invalid workspace ID format. Must be ws_ followed by exactly 32 lowercase hex characters",
		};
	}

	// Length validation (redundant with regex but explicit for security)
	if (workspaceId.length !== WORKSPACE_ID_LENGTH) {
		return {
			valid: false,
			error: "Invalid workspace ID length",
		};
	}

	// Check for dangerous characters (injection prevention)
	if (DANGEROUS_CHARS.test(workspaceId)) {
		return {
			valid: false,
			error: "Invalid workspace ID format. Contains illegal characters",
		};
	}

	return { valid: true };
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
