/**
 * Security validation utilities for MCP server
 *
 * Implements security validations:
 * - P0-4: API key format validation (format-only quick check)
 * - P0-7: Workspace path injection prevention
 * - P0-8: CORS origin validation
 * - P1-3: Request body size limits
 * - Database-backed API key verification via Better Auth
 *
 * @see packages/auth/src/auth.ts - Better Auth configuration
 */

import { fetchWithPooling } from "./http-client.js";

// API URL for database-backed verification
const API_URL = process.env.VREKO_API_URL || "https://api.vreko.dev";

// Security constants
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB - P1-3
// ✅ CONSOLIDATED: Use sk_live_/sk_test_ prefix (aligned with Better Auth)
// Better Auth generates 64-char keys, but accept 32+ for backwards compatibility
const API_KEY_PATTERN = /^sk_(live|test)_[a-zA-Z0-9_-]{32,}$/; // P0-4
// Workspace ID: unified 12-char hex format (48 bits entropy)
// Supports both: 12-char hex (new unified format) and ws_ + 32-char hex (legacy)
const WORKSPACE_ID_PATTERN = /^([a-f0-9]{12}|ws_[a-f0-9]{32})$/;
const WORKSPACE_ID_LENGTHS = [12, 35]; // 12 (unified) or 35 (legacy: ws_ + 32)
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
 * Database-backed API key validation via Better Auth
 *
 * Calls the API's verifyApiKey endpoint to:
 * - Verify key against database (Argon2 hash)
 * - Check expiration and revocation status
 * - Apply rate limiting
 * - Return user info and tier
 *
 * @param apiKey - The API key to validate
 * @returns Validation result with user info
 */
export async function validateApiKeyWithDatabase(apiKey: string): Promise<{
	valid: boolean;
	transient?: boolean;
	userId?: string;
	tier?: "free" | "pro" | "enterprise";
	error?: string;
}> {
	// Quick format check before making HTTP call
	const formatResult = validateApiKey(apiKey);
	if (!formatResult.valid) {
		return { valid: false, error: formatResult.error };
	}

	try {
		// Call API's auth.verifyApiKey oRPC endpoint with connection pooling
		const response = await fetchWithPooling(`${API_URL}/orpc/auth.verifyApiKey`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				apiKey,
				// Request MCP tools permission
				requiredPermissions: {
					mcp: ["tools"],
				},
			}),
		});

		if (!response.ok) {
			if (response.status === 401) {
				return { valid: false, error: "Invalid or expired API key" };
			}
			return { valid: false, error: `API verification failed: ${response.status}` };
		}

		const result = (await response.json()) as {
			valid: boolean;
			userId?: string;
			permissions?: Record<string, string[]>;
			rateLimit?: {
				enabled: boolean;
				remaining: number;
				max: number;
				resetAt?: string;
			};
		};

		if (!result.valid) {
			return { valid: false, error: "Invalid API key" };
		}

		// Determine tier based on permissions (pro has more permissions)
		const permissions = result.permissions || {};
		const hasPro = permissions.api?.includes("write") || permissions["vreko:snapshot"]?.includes("write");

		return {
			valid: true,
			userId: result.userId,
			tier: hasPro ? "pro" : "free",
		};
	} catch (_error) {
		return {
			valid: false,
			transient: true,
			error: "auth_service_unavailable",
		};
	}
}

// NOTE: Format-only validation (validateApiKey) is kept for quick pre-checks
// Database-backed validation (validateApiKeyWithDatabase) should be used for full verification

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

	// Check for valid format: 12-char hex (unified) or ws_ + 32-char hex (legacy)
	if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
		return {
			valid: false,
			error: "Invalid workspace ID format. Must be 12 lowercase hex characters (unified) or ws_ followed by 32 lowercase hex characters (legacy)",
		};
	}

	// Length validation (redundant with regex but explicit for security)
	if (!WORKSPACE_ID_LENGTHS.includes(workspaceId.length)) {
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
 * Quick boolean check for workspace ID validity
 * Exported for use in other modules (e.g., packages/platform/src/lib/workspace-id.ts)
 *
 * @param workspaceId - The workspace ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidWorkspaceId(workspaceId: string): boolean {
	return validateWorkspaceId(workspaceId).valid;
}

/**
 * Validates workspace path for security
 *
 * Accepts:
 * - "default" - Zero-config mode (server will use anonymous/default workspace)
 * - Absolute paths - Traditional workspace path (e.g., "/Users/user/project")
 *
 * @param workspace - The workspace path to validate
 * @returns Validation result
 */
export function validateWorkspace(workspace: string | undefined): ValidationResult {
	// Allow "default" for zero-config mode
	if (workspace === "default") {
		return { valid: true };
	}

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

	// Must be absolute path (unless it's "default")
	if (!workspace.startsWith("/")) {
		return {
			valid: false,
			error: "Invalid workspace path. Must be an absolute path or 'default'",
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
