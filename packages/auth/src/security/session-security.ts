/**
 * Session Security Implementation
 *
 * Provides secure session management with httpOnly cookies, secure flags,
 * expiration, refresh, and validation using Better Auth.
 *
 * OWASP Standard: A02:2021 – Cryptographic Failures
 * Better Auth Features: httpOnly, secure, sameSite cookies, expiration, refresh
 */

import { timingSafeEqual } from "node:crypto";
import { logger } from "@snapback/infrastructure";

/**
 * Session security configuration
 */
export interface SessionSecurityConfig {
	/** Session expiration time in seconds (default: 604800 = 7 days) */
	expiresInSeconds: number;
	/** Update age in seconds (default: 86400 = 1 day) - refresh if older */
	updateAgeSeconds: number;
	/** Absolute max lifetime in seconds (default: 1209600 = 14 days) */
	absoluteMaxLifetimeSeconds: number;
	/** Enable httpOnly flag on session cookie */
	httpOnly: boolean;
	/** Enable secure flag (HTTPS only in production) */
	secure: boolean;
	/** SameSite cookie attribute: 'Lax', 'Strict', or 'None' */
	sameSite: "Lax" | "Strict" | "None";
	/** Cookie path (default: /) */
	path: string;
	/** Cookie domain (use undefined for current domain) */
	domain?: string;
	/** Session cookie name */
	cookieName: string;
}

/**
 * Default session security configuration (OWASP 2025 compliant)
 */
export const defaultSessionSecurityConfig: SessionSecurityConfig = {
	// 7 days expiration
	expiresInSeconds: 7 * 24 * 60 * 60,
	// Refresh after 1 day of activity
	updateAgeSeconds: 1 * 24 * 60 * 60,
	// Absolute max 14 days regardless of activity
	absoluteMaxLifetimeSeconds: 14 * 24 * 60 * 60,
	// Prevent JavaScript access (XSS mitigation)
	httpOnly: true,
	// HTTPS only in production
	secure: process.env.NODE_ENV === "production",
	// CSRF protection
	sameSite: "Lax",
	// Root path
	path: "/",
	// Subdomain cookie in production
	domain: process.env.NODE_ENV === "production" ? ".snapback.dev" : undefined,
	// Better Auth session cookie name
	cookieName: "better_auth.session_token",
};

/**
 * Session metadata for validation
 */
export interface SessionMetadata {
	/** Session creation timestamp */
	createdAt: number;
	/** Session expiration timestamp */
	expiresAt: number;
	/** Last update timestamp (for sliding window refresh) */
	lastUpdateAt: number;
	/** Absolute max lifetime (no refresh beyond this) */
	absoluteMaxAt: number;
	/** User ID */
	userId?: string;
	/** IP address that created the session */
	createdIpAddress?: string;
	/** Session is valid for refresh */
	canRefresh: boolean;
}

/**
 * Build secure Set-Cookie header value
 *
 * Implements OWASP security recommendations:
 * - httpOnly: Prevents JavaScript access (XSS mitigation)
 * - Secure: HTTPS only (prevents MITM)
 * - SameSite: Prevents cross-site cookie inclusion (CSRF mitigation)
 * - Max-Age: Expiration (session timeout)
 * - Path: Restricts to specific path
 * - Domain: Restricts to specific domain (optional)
 *
 * @param token Session token value
 * @param config Session security configuration
 * @returns Set-Cookie header value
 */
export function buildSessionCookie(
	token: string,
	config: Partial<SessionSecurityConfig> = {},
): string {
	const finalConfig = { ...defaultSessionSecurityConfig, ...config };

	const expiresAt = new Date(Date.now() + finalConfig.expiresInSeconds * 1000);

	let cookieValue = `${finalConfig.cookieName}=${token}`;

	// Add security flags
	cookieValue += `; Path=${finalConfig.path}`;
	cookieValue += `; Max-Age=${finalConfig.expiresInSeconds}`;
	cookieValue += `; Expires=${expiresAt.toUTCString()}`;
	cookieValue += `; SameSite=${finalConfig.sameSite}`;

	// Add httpOnly flag (prevents JavaScript access)
	if (finalConfig.httpOnly) {
		cookieValue += "; HttpOnly";
	}

	// Add Secure flag in production (HTTPS only)
	if (finalConfig.secure) {
		cookieValue += "; Secure";
	}

	// Add Domain if specified
	if (finalConfig.domain) {
		cookieValue += `; Domain=${finalConfig.domain}`;
	}

	return cookieValue;
}

/**
 * Clear session cookie
 *
 * Sets Max-Age=0 to immediately delete the cookie
 *
 * @param config Session security configuration
 * @returns Set-Cookie header value for clearing
 */
export function clearSessionCookie(
	config: Partial<SessionSecurityConfig> = {},
): string {
	const finalConfig = { ...defaultSessionSecurityConfig, ...config };

	let cookieValue = `${finalConfig.cookieName}=`;
	cookieValue += "; Path=/";
	cookieValue += "; Max-Age=0";
	cookieValue += "; Expires=Thu, 01 Jan 1970 00:00:00 UTC";
	cookieValue += `; SameSite=${finalConfig.sameSite}`;

	if (finalConfig.secure) {
		cookieValue += "; Secure";
	}

	return cookieValue;
}

/**
 * Check if session should be refreshed
 *
 * Implements sliding window:
 * - If idle < updateAge: use existing session
 * - If idle >= updateAge: issue new token
 * - If >= absoluteMaxLifetime: require re-authentication
 *
 * @param metadata Session metadata
 * @param config Session security configuration
 * @returns Object with refresh info
 */
export function shouldRefreshSession(
	metadata: SessionMetadata,
	config: Partial<SessionSecurityConfig> = {},
): {
	shouldRefresh: boolean;
	reason?: string;
	isExpired?: boolean;
} {
	const finalConfig = { ...defaultSessionSecurityConfig, ...config };
	const now = Date.now();

	// Check if session has expired
	if (now > metadata.expiresAt) {
		return {
			shouldRefresh: true,
			isExpired: true,
			reason: "Session expired",
		};
	}

	// Check if absolute max lifetime exceeded
	if (now > metadata.absoluteMaxAt) {
		return {
			shouldRefresh: true,
			isExpired: true,
			reason: "Absolute max session lifetime exceeded",
		};
	}

	// Check if time since last update exceeds updateAge
	const timeSinceUpdate = now - metadata.lastUpdateAt;
	const shouldRefresh = timeSinceUpdate > finalConfig.updateAgeSeconds * 1000;

	if (shouldRefresh) {
		return {
			shouldRefresh: true,
			reason: `Time since update (${Math.floor(timeSinceUpdate / 1000)}s) exceeds updateAge (${finalConfig.updateAgeSeconds}s)`,
		};
	}

	return {
		shouldRefresh: false,
	};
}

/**
 * Create session metadata for new session
 *
 * @param userId User ID
 * @param ipAddress Client IP address
 * @param config Session security configuration
 * @returns Session metadata
 */
export function createSessionMetadata(
	userId: string,
	ipAddress?: string,
	config: Partial<SessionSecurityConfig> = {},
): SessionMetadata {
	const finalConfig = { ...defaultSessionSecurityConfig, ...config };
	const now = Date.now();

	return {
		createdAt: now,
		expiresAt: now + finalConfig.expiresInSeconds * 1000,
		lastUpdateAt: now,
		absoluteMaxAt: now + finalConfig.absoluteMaxLifetimeSeconds * 1000,
		userId,
		createdIpAddress: ipAddress,
		canRefresh: true,
	};
}

/**
 * Validate session JWT claims
 *
 * Verifies:
 * - Token structure (header.payload.signature)
 * - Issuer (iss claim)
 * - Audience (aud claim)
 * - Expiration (exp claim)
 * - Subject (sub = user ID)
 *
 * @param token JWT token
 * @param expectedIssuer Expected issuer URL
 * @param expectedAudience Expected audience
 * @returns Validation result with decoded claims if valid
 */
export function validateSessionJWT(
	token: string,
	expectedIssuer?: string,
	expectedAudience?: string,
): {
	valid: boolean;
	claims?: Record<string, unknown>;
	reason?: string;
} {
	try {
		// Split JWT into parts
		const parts = token.split(".");

		if (parts.length !== 3) {
			return {
				valid: false,
				reason: "Invalid JWT format (expected 3 parts)",
			};
		}

		// Decode payload (JWT uses URL-safe base64)
		const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

		// Add padding if necessary
		const padding = "==".substring(0, (4 - (payloadBase64.length % 4)) % 4);
		const payloadJson = Buffer.from(payloadBase64 + padding, "base64").toString(
			"utf8",
		);

		const claims = JSON.parse(payloadJson) as Record<string, unknown>;

		// Validate issuer if provided
		if (expectedIssuer && claims.iss !== expectedIssuer) {
			return {
				valid: false,
				reason: `Invalid issuer: ${claims.iss} (expected ${expectedIssuer})`,
			};
		}

		// Validate audience if provided
		if (expectedAudience && claims.aud !== expectedAudience) {
			return {
				valid: false,
				reason: `Invalid audience: ${claims.aud} (expected ${expectedAudience})`,
			};
		}

		// Check expiration
		if (typeof claims.exp === "number") {
			const expiresAt = claims.exp * 1000; // Convert to milliseconds
			if (Date.now() > expiresAt) {
				return {
					valid: false,
					reason: "JWT has expired",
					claims,
				};
			}
		}

		// Check if subject (user ID) exists
		if (!claims.sub) {
			return {
				valid: false,
				reason: "Missing subject (sub) claim",
			};
		}

		return {
			valid: true,
			claims,
		};
	} catch (error) {
		logger.warn("JWT validation error", {
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			valid: false,
			reason: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Validate session consistency (constant-time)
 *
 * Ensures session ID and user ID match expected values
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param sessionId Session ID from cookie
 * @param userId User ID from claims
 * @param expectedSessionId Expected session ID
 * @param expectedUserId Expected user ID
 * @returns true if values match, false otherwise
 */
export function validateSessionConsistency(
	sessionId: string,
	userId: string,
	expectedSessionId?: string,
	expectedUserId?: string,
): boolean {
	// Check session ID if provided
	if (expectedSessionId) {
		if (!sessionId || sessionId.length !== expectedSessionId.length) {
			return false;
		}

		try {
			timingSafeEqual(Buffer.from(sessionId), Buffer.from(expectedSessionId));
		} catch {
			return false;
		}
	}

	// Check user ID if provided
	if (expectedUserId) {
		if (!userId || userId.length !== expectedUserId.length) {
			return false;
		}

		try {
			timingSafeEqual(Buffer.from(userId), Buffer.from(expectedUserId));
		} catch {
			return false;
		}
	}

	return true;
}

/**
 * Log session event
 *
 * Logs security events for audit trail and monitoring
 *
 * @param event Event type
 * @param details Event details
 */
export function logSessionEvent(
	event: "created" | "destroyed" | "refreshed" | "expired",
	details: {
		userId?: string;
		sessionId?: string;
		reason?: string;
		ipAddress?: string;
		userAgent?: string;
	},
): void {
	const logLevel =
		event === "created" || event === "refreshed" ? "info" : "warn";

	const logData = {
		event: `SESSION_${event.toUpperCase()}`,
		userId: details.userId,
		sessionId: details.sessionId?.substring(0, 8), // Log first 8 chars only
		reason: details.reason,
		ipAddress: details.ipAddress,
		userAgent: details.userAgent?.substring(0, 50), // Log first 50 chars
		timestamp: new Date().toISOString(),
	};

	if (logLevel === "info") {
		logger.info(`Session ${event}`, logData);
	} else {
		logger.warn(`Session ${event}`, logData);
	}
}

/**
 * Check for suspicious session activity
 *
 * Detects anomalies like:
 * - Geographic changes
 * - IP address changes
 * - Device/user agent changes
 *
 * @param currentIp Current IP address
 * @param previousIp Previous IP address
 * @param currentUserAgent Current user agent
 * @param previousUserAgent Previous user agent
 * @returns Object with anomaly detection result
 */
export function detectAnomalousActivity(
	currentIp: string,
	previousIp?: string,
	currentUserAgent?: string,
	previousUserAgent?: string,
): {
	isAnomalous: boolean;
	reason?: string;
	severity?: "low" | "medium" | "high";
} {
	// Check for IP change
	if (previousIp && currentIp !== previousIp) {
		logger.warn("Session IP changed", {
			previous: previousIp,
			current: currentIp,
		});

		return {
			isAnomalous: true,
			reason: "IP address changed",
			severity: "medium",
		};
	}

	// Check for user agent change
	if (previousUserAgent && currentUserAgent !== previousUserAgent) {
		logger.warn("Session user agent changed", {
			previous: previousUserAgent?.substring(0, 30),
			current: currentUserAgent?.substring(0, 30),
		});

		return {
			isAnomalous: true,
			reason: "User agent changed",
			severity: "low",
		};
	}

	return {
		isAnomalous: false,
	};
}
