/**
 * CSRF Protection Implementation
 *
 * Provides cryptographically secure CSRF token generation, validation, and verification.
 * Integrates with Better Auth's CSRF protection and adds custom validation middleware.
 *
 * OWASP Standard: A01:2021 – Broken Access Control
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { logger } from "@snapback/infrastructure";

/**
 * Configuration for CSRF protection
 */
export interface CSRFConfig {
	/** Token length in bytes (256-bit minimum recommended) */
	tokenLength: number;
	/** Token expiration time in milliseconds (default: 24 hours) */
	expirationMs: number;
	/** Trusted origins for CSRF validation */
	trustedOrigins: string[];
	/** Enable CSRF validation (default: true in production) */
	enabled: boolean;
}

/**
 * Default CSRF configuration
 */
export const defaultCSRFConfig: CSRFConfig = {
	tokenLength: 32, // 256 bits
	expirationMs: 24 * 60 * 60 * 1000, // 24 hours
	trustedOrigins: [
		"https://console.snapback.dev",
		"https://api.snapback.dev",
		// Localhost for development
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
	],
	enabled: true,
};

/**
 * CSRF Token Metadata
 */
interface CSRFTokenMetadata {
	/** Token creation timestamp */
	createdAt: number;
	/** Token expiration timestamp */
	expiresAt: number;
	/** Request origin that requested this token */
	requestOrigin?: string;
	/** Session ID this token belongs to */
	sessionId?: string;
}

/**
 * In-memory storage for CSRF tokens (would be replaced with Redis in production)
 */
const csrfTokenStore = new Map<string, CSRFTokenMetadata>();

/**
 * Generate a cryptographically secure CSRF token
 *
 * Requirements:
 * - Uses crypto.getRandomValues() (cryptographically secure RNG)
 * - Minimum 256-bit entropy (32 bytes)
 * - Base64url encoding (URL-safe)
 * - Includes creation timestamp for expiration checking
 *
 * @param config CSRF configuration
 * @returns Base64url-encoded CSRF token
 */
export function generateCSRFToken(config: Partial<CSRFConfig> = {}): string {
	const finalConfig = { ...defaultCSRFConfig, ...config };

	// Generate cryptographically secure random bytes
	const randomBuffer = randomBytes(finalConfig.tokenLength);

	// Convert to base64url (URL-safe: - and _ instead of + and /)
	const base64url = randomBuffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

	// Store metadata for later verification
	const now = Date.now();
	csrfTokenStore.set(base64url, {
		createdAt: now,
		expiresAt: now + finalConfig.expirationMs,
	});

	logger.debug("CSRF token generated", {
		tokenLength: base64url.length,
		expiresAt: new Date(now + finalConfig.expirationMs).toISOString(),
	});

	return base64url;
}

/**
 * Verify CSRF token using constant-time comparison
 *
 * Prevents timing attacks by using crypto.timingSafeEqual()
 * which always takes the same time regardless of match position.
 *
 * @param provided Token provided by client (from POST body or header)
 * @param stored Token stored on server (from session/cookie)
 * @returns true if tokens match, false otherwise
 */
export function verifyCSRFToken(provided: string, stored: string): boolean {
	try {
		// Reject empty or missing tokens
		if (!provided || !stored) {
			return false;
		}

		// Reject mismatched lengths (prevents length-based attacks)
		if (provided.length !== stored.length) {
			return false;
		}

		// Use constant-time comparison (always same duration)
		// timingSafeEqual throws if lengths differ, but we already checked
		return timingSafeEqual(Buffer.from(provided), Buffer.from(stored));
	} catch (error) {
		logger.warn("CSRF token verification failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * Check if CSRF token has expired
 *
 * @param token Token to check
 * @returns true if expired, false if still valid
 */
export function isCSRFTokenExpired(token: string): boolean {
	const metadata = csrfTokenStore.get(token);

	if (!metadata) {
		// Token not found in store = expired or never existed
		return true;
	}

	const isExpired = Date.now() > metadata.expiresAt;

	if (isExpired) {
		// Clean up expired token
		csrfTokenStore.delete(token);
	}

	return isExpired;
}

/**
 * Validate CSRF token from request
 *
 * Checks:
 * 1. Token exists (not empty/null)
 * 2. Token is valid (not tampered)
 * 3. Token is not expired
 * 4. Origin matches trusted list
 *
 * @param providedToken Token from request (POST body or header)
 * @param storedToken Token from session/cookie
 * @param origin Request origin header
 * @param config CSRF configuration
 * @returns true if valid, false if invalid
 */
export function validateCSRFToken(
	providedToken: string | null | undefined,
	storedToken: string | null | undefined,
	origin: string | null | undefined,
	config: Partial<CSRFConfig> = {},
): {
	valid: boolean;
	reason?: string;
} {
	const finalConfig = { ...defaultCSRFConfig, ...config };

	// Check if CSRF protection is enabled
	if (!finalConfig.enabled) {
		return { valid: true }; // Disabled, allow request
	}

	// Check if tokens exist
	if (!providedToken || !storedToken) {
		return {
			valid: false,
			reason: "Missing CSRF token",
		};
	}

	// Check if token is expired
	if (isCSRFTokenExpired(storedToken)) {
		return {
			valid: false,
			reason: "CSRF token expired",
		};
	}

	// Verify token match (constant-time comparison)
	if (!verifyCSRFToken(providedToken, storedToken)) {
		logger.warn("CSRF token mismatch detected", {
			// Don't log actual tokens for security
			providedLength: providedToken.length,
			storedLength: storedToken.length,
		});

		return {
			valid: false,
			reason: "Invalid CSRF token",
		};
	}

	// Verify origin if provided
	if (origin) {
		const isOriginTrusted = finalConfig.trustedOrigins.some((trustedOrigin) => origin.startsWith(trustedOrigin));

		if (!isOriginTrusted) {
			logger.warn("CSRF origin validation failed", {
				origin,
				trustedOrigins: finalConfig.trustedOrigins,
			});

			return {
				valid: false,
				reason: "Untrusted origin",
			};
		}
	}

	// All checks passed
	return { valid: true };
}

/**
 * Validate origin header against trusted origins
 *
 * Implements origin validation as per OWASP:
 * - Check Origin header first (modern browsers)
 * - Fall back to Referer header if Origin missing
 * - Reject if neither present on state-changing requests
 *
 * @param origin Origin header value
 * @param referer Referer header value
 * @param method HTTP request method
 * @param config CSRF configuration
 * @returns true if origin is valid, false otherwise
 */
export function validateOrigin(
	origin: string | null | undefined,
	referer: string | null | undefined,
	method: string,
	config: Partial<CSRFConfig> = {},
): {
	valid: boolean;
	reason?: string;
} {
	const finalConfig = { ...defaultCSRFConfig, ...config };

	// GET/HEAD/OPTIONS are safe methods, don't require origin check
	const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method);

	if (isSafeMethod) {
		return { valid: true };
	}

	// Check Origin header (preferred, sent by modern browsers)
	if (origin) {
		const isOriginValid = finalConfig.trustedOrigins.some(
			(trustedOrigin) => origin === trustedOrigin || origin.startsWith(trustedOrigin),
		);

		if (!isOriginValid) {
			logger.warn("Invalid Origin header", { origin });
			return {
				valid: false,
				reason: "Untrusted origin",
			};
		}

		return { valid: true };
	}

	// Fall back to Referer header if Origin not present
	if (referer) {
		try {
			const refererUrl = new URL(referer);
			const refererOrigin = refererUrl.origin;

			const isRefererValid = finalConfig.trustedOrigins.some(
				(trustedOrigin) => refererOrigin === trustedOrigin || refererOrigin.startsWith(trustedOrigin),
			);

			if (!isRefererValid) {
				logger.warn("Invalid Referer header", { referer: refererOrigin });
				return {
					valid: false,
					reason: "Untrusted referer",
				};
			}

			return { valid: true };
		} catch {
			logger.warn("Malformed Referer header", { referer });
			return {
				valid: false,
				reason: "Malformed referer",
			};
		}
	}

	// No Origin and no Referer = reject state-changing requests
	logger.warn("Missing Origin and Referer headers on state-changing request", {
		method,
	});

	return {
		valid: false,
		reason: "Missing origin verification",
	};
}

/**
 * Extract CSRF token from request
 *
 * Looks in multiple locations per OWASP recommendation:
 * 1. POST body parameter (_csrf)
 * 2. Custom header (X-CSRF-Token)
 * 3. Standard header (X-CSRF-Token)
 *
 * @param request Request object with body and headers
 * @returns Token if found, null otherwise
 */
export async function extractCSRFTokenFromRequest(request: {
	headers: Headers;
	body?: BodyInit | null;
	method?: string;
}): Promise<string | null> {
	// Check header first (preferred for AJAX requests)
	const headerToken =
		request.headers.get("X-CSRF-Token") ||
		request.headers.get("x-csrf-token") ||
		request.headers.get("X-Requested-With");

	if (headerToken) {
		return headerToken;
	}

	// For POST requests, check body parameter
	if (request.method === "POST" && request.body) {
		try {
			// Only attempt to parse form/JSON if body is a string or buffer
			if (typeof request.body === "string") {
				// Try JSON first
				try {
					const json = JSON.parse(request.body);
					if (json._csrf) {
						return json._csrf;
					}
				} catch {
					// Not JSON, try URL-encoded
					const params = new URLSearchParams(request.body);
					if (params.has("_csrf")) {
						return params.get("_csrf");
					}
				}
			}
		} catch (error) {
			logger.debug("Could not extract CSRF token from body", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return null;
}

/**
 * Clean up expired CSRF tokens
 *
 * Called periodically to prevent memory leaks
 * (In production, would use Redis TTL instead)
 */
export function cleanupExpiredCSRFTokens(): {
	cleaned: number;
	remaining: number;
} {
	const now = Date.now();
	let cleaned = 0;

	for (const [token, metadata] of csrfTokenStore.entries()) {
		if (now > metadata.expiresAt) {
			csrfTokenStore.delete(token);
			cleaned++;
		}
	}

	logger.debug("CSRF token cleanup", {
		cleaned,
		remaining: csrfTokenStore.size,
	});

	return {
		cleaned,
		remaining: csrfTokenStore.size,
	};
}

// Run cleanup every 30 minutes (in production, use Redis TTL)
if (typeof setInterval !== "undefined") {
	setInterval(
		() => {
			cleanupExpiredCSRFTokens();
		},
		30 * 60 * 1000,
	);
}
