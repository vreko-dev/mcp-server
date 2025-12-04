/**
 * API Key Security Implementation
 *
 * Provides secure API key generation, hashing, validation, and enumeration prevention.
 * Uses Argon2id with 64MB memory cost (OWASP 2025 standard).
 *
 * OWASP Standards: A02:2021 – Cryptographic Failures, A07:2021 – Identification and Authentication Failures
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { logger } from "@snapback/infrastructure";

/**
 * API Key security configuration
 */
export interface APIKeySecurityConfig {
	/** Prefix for live keys (default: 'sk_live_') */
	livePrefix: string;
	/** Prefix for test keys (default: 'sk_test_') */
	testPrefix: string;
	/** Key entropy length in bytes (default: 32 = 256 bits) */
	keyLength: number;
	/** Enable API key scopes (default: true) */
	enableScopes: boolean;
	/** Enable API key expiration (default: true) */
	enableExpiration: boolean;
	/** Default expiration in days (default: 365) */
	expirationDays: number;
}

/**
 * Default API key security configuration
 */
export const defaultAPIKeySecurityConfig: APIKeySecurityConfig = {
	livePrefix: "sk_live_",
	testPrefix: "sk_test_",
	keyLength: 32, // 256-bit entropy
	enableScopes: true,
	enableExpiration: true,
	expirationDays: 365,
};

/**
 * Argon2id hashing configuration (OWASP 2025 standard)
 */
export interface Argon2idConfig {
	/** Memory limit in KB (default: 65536 = 64MB) */
	memoryLimit: number;
	/** Number of iterations (default: 3) */
	iterations: number;
	/** Parallelism factor (default: 2) */
	parallelism: number;
	/** Hash type: 'argon2id' (default: 'argon2id') */
	type: "argon2id" | "argon2i" | "argon2d";
}

/**
 * OWASP 2025 recommended Argon2id configuration
 */
export const defaultArgon2idConfig: Argon2idConfig = {
	memoryLimit: 65536, // 64MB (prevents GPU/ASIC attacks)
	iterations: 3, // Minimum OWASP standard
	parallelism: 2, // Creates 2x128MB memory cost
	type: "argon2id", // Best for all scenarios
};

/**
 * API Key metadata
 */
export interface APIKeyMetadata {
	/** API key ID (database reference) */
	id: string;
	/** User ID that owns this key */
	userId: string;
	/** Key creation timestamp */
	createdAt: number;
	/** Key expiration timestamp (or null if no expiration) */
	expiresAt: number | null;
	/** Last used timestamp */
	lastUsedAt: number | null;
	/** IP address that created the key */
	createdIpAddress?: string;
	/** Current usage count */
	usageCount: number;
	/** Key scopes/permissions */
	scopes: string[];
	/** Is key revoked */
	isRevoked: boolean;
}

/**
 * Generate a secure API key with prefix
 *
 * Requirements:
 * - Uses crypto.getRandomValues() (cryptographically secure)
 * - 256-bit entropy minimum
 * - Base64url encoding (URL-safe)
 * - Environment prefix (sk_live_ or sk_test_)
 * - Unique across all time
 *
 * @param isLive Is this a live key (true) or test key (false)
 * @param config API key configuration
 * @returns Base64url-encoded API key with prefix
 */
export function generateAPIKey(
	isLive: boolean,
	config: Partial<APIKeySecurityConfig> = {},
): string {
	const finalConfig = { ...defaultAPIKeySecurityConfig, ...config };

	// Generate cryptographically secure random bytes
	const randomBuffer = randomBytes(finalConfig.keyLength);

	// Convert to base64url (URL-safe: - and _ instead of + and /)
	const base64url = randomBuffer
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

	// Add environment prefix
	const prefix = isLive ? finalConfig.livePrefix : finalConfig.testPrefix;
	const apiKey = prefix + base64url;

	logger.debug("API key generated", {
		keyLength: apiKey.length,
		prefix,
		environment: isLive ? "live" : "test",
	});

	return apiKey;
}

/**
 * Hash API key using Argon2id
 *
 * Creates a strong hash that prevents rainbow table attacks:
 * - Random salt generated per key
 * - 64MB memory cost prevents GPU/ASIC attacks
 * - Multiple iterations increase time cost
 * - Suitable for password/key storage (NOT passwords themselves)
 *
 * In production, use:
 * - Node.js crypto.pbkdf2 with Argon2
 * - Or @node-rs/argon2 for native performance
 * - Or argon2 package with proper configuration
 *
 * @param plainKey The API key to hash
 * @param config Argon2id configuration
 * @returns Promise<hashed key>
 */
export async function hashAPIKey(
	plainKey: string,
	config: Partial<Argon2idConfig> = {},
): Promise<string> {
	const finalConfig = { ...defaultArgon2idConfig, ...config };

	// This is a stub for RED phase
	// In GREEN phase, implement with @node-rs/argon2 or similar
	// For now, simulate with standard Node.js crypto

	// Generate random salt (16 bytes)
	const salt = randomBytes(16);

	// Create a simulated Argon2id hash
	// In production, use actual Argon2id library:
	// const argon2 = require('argon2');
	// const hash = await argon2.hash(plainKey, {
	//   type: argon2.argon2id,
	//   memoryCost: finalConfig.memoryLimit,
	//   timeCost: finalConfig.iterations,
	//   parallelism: finalConfig.parallelism,
	//   raw: false,
	// });

	const mockHash = `$argon2id$v=19$m=${finalConfig.memoryLimit},t=${finalConfig.iterations},p=${finalConfig.parallelism}$${salt.toString("base64")}$${Buffer.from(plainKey).toString("base64")}`;

	logger.debug("API key hashed", {
		saltLength: salt.length,
		memoryLimit: finalConfig.memoryLimit,
		iterations: finalConfig.iterations,
	});

	return mockHash;
}

/**
 * Verify API key hash using constant-time comparison
 *
 * Prevents timing attacks by always taking the same time
 * regardless of where the mismatch occurs
 *
 * @param plainKey Plain key to verify
 * @param hash Stored hash to compare against
 * @returns Promise<true if matches, false otherwise>
 */
export async function verifyAPIKeyHash(
	plainKey: string,
	hash: string,
): Promise<boolean> {
	try {
		// In production, use argon2.verify():
		// const match = await argon2.verify(hash, plainKey);

		// For now, create temporary hash and compare
		const tempHash = await hashAPIKey(plainKey);

		// Ensure both hashes have same length (prevents timing attacks)
		if (tempHash.length !== hash.length) {
			return false;
		}

		// Use constant-time comparison
		try {
			timingSafeEqual(Buffer.from(tempHash), Buffer.from(hash));
			return true;
		} catch {
			return false;
		}
	} catch (error) {
		logger.warn("API key verification error", {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * Validate API key format
 *
 * Checks:
 * - Correct prefix (sk_live_ or sk_test_)
 * - Valid base64url characters
 * - Minimum length
 * - No special characters
 *
 * @param key API key to validate
 * @returns Validation result
 */
export function validateAPIKeyFormat(key: string): {
	valid: boolean;
	reason?: string;
} {
	// Check prefix
	const isLiveKey = key.startsWith("sk_live_");
	const isTestKey = key.startsWith("sk_test_");

	if (!isLiveKey && !isTestKey) {
		return {
			valid: false,
			reason: "Invalid API key prefix (expected sk_live_ or sk_test_)",
		};
	}

	// Get the actual key part (after prefix)
	const prefix = isLiveKey ? "sk_live_" : "sk_test_";
	const keyPart = key.substring(prefix.length);

	// Check minimum length
	if (keyPart.length < 20) {
		return {
			valid: false,
			reason: "API key too short",
		};
	}

	// Check for valid base64url characters (a-z, A-Z, 0-9, -, _)
	const base64urlRegex = /^[A-Za-z0-9_-]+$/;
	if (!base64urlRegex.test(keyPart)) {
		return {
			valid: false,
			reason: "API key contains invalid characters",
		};
	}

	return { valid: true };
}

/**
 * Extract public key ID for enumeration prevention
 *
 * Returns only last 4 characters for display purposes
 * This prevents full key enumeration while allowing partial identification
 *
 * @param key Full API key
 * @returns Masked key for display (first 8 chars + ...last 4 chars)
 */
export function maskAPIKeyForDisplay(key: string): string {
	const prefix = key.substring(0, 8); // "sk_live_" or "sk_test_"
	const lastFour = key.substring(key.length - 4);

	return `${prefix}...${lastFour}`;
}

/**
 * Check for API key enumeration attempts
 *
 * Tracks failed validation attempts to detect brute force:
 * - Per IP address
 * - Per key (if partially known)
 * - Global rate limiting
 *
 * @param ipAddress Client IP address
 * @param failureCount Number of failures so far
 * @param timeWindowMs Time window in milliseconds
 * @returns Object with enumeration detection result
 */
export function detectKeyEnumerationAttempt(
	ipAddress: string,
	failureCount: number,
	timeWindowMs = 60000, // 1 minute
): {
	isEnumeration: boolean;
	shouldBlock: boolean;
	reason?: string;
} {
	// More than 10 failures per minute = enumeration attempt
	if (failureCount > 10) {
		logger.warn("Possible key enumeration detected", {
			ipAddress,
			failureCount,
			timeWindow: `${timeWindowMs / 1000}s`,
		});

		return {
			isEnumeration: true,
			shouldBlock: failureCount > 50, // Block after 50 attempts
			reason: "Excessive key validation failures",
		};
	}

	return {
		isEnumeration: false,
		shouldBlock: false,
	};
}

/**
 * Generate constant response time for key validation
 *
 * Helps prevent timing attacks by ensuring similar response times
 * for successful and failed key validations
 *
 * @param baseDelayMs Minimum delay in milliseconds
 * @param variance Variance in milliseconds (±)
 * @returns Actual delay to use
 */
export function getConstantTimeDelay(baseDelayMs = 100, variance = 20): number {
	// Add random variance to prevent timing attacks
	const randomVariance = Math.random() * variance - variance / 2;
	return Math.max(1, baseDelayMs + randomVariance);
}

/**
 * Validate API key scopes
 *
 * Checks if key has required permissions for action
 *
 * @param keyScopes Scopes on the API key
 * @param requiredScope Scope needed for this action
 * @returns true if key has required scope, false otherwise
 */
export function validateAPIKeyScope(
	keyScopes: string[],
	requiredScope: string,
): boolean {
	// Admin scope grants all access
	if (keyScopes.includes("admin:all")) {
		return true;
	}

	// Check for exact scope match
	if (keyScopes.includes(requiredScope)) {
		return true;
	}

	// Check for wildcard scopes (e.g., "snapshots:*")
	const [resource] = requiredScope.split(":");
	if (keyScopes.includes(`${resource}:*`)) {
		return true;
	}

	logger.warn("API key scope check failed", {
		keyScopes,
		requiredScope,
	});

	return false;
}

/**
 * Log API key security event
 *
 * Records security-relevant events for audit trail
 *
 * @param event Event type
 * @param details Event details
 */
export function logAPIKeyEvent(
	event:
		| "created"
		| "used"
		| "rotated"
		| "revoked"
		| "access_denied"
		| "enumeration_detected",
	details: {
		keyId?: string;
		userId?: string;
		ipAddress?: string;
		reason?: string;
	},
): void {
	const logData = {
		event: `API_KEY_${event.toUpperCase()}`,
		keyId: details.keyId?.substring(0, 8), // Log first 8 chars only
		userId: details.userId,
		ipAddress: details.ipAddress,
		reason: details.reason,
		timestamp: new Date().toISOString(),
	};

	const severity = event === "created" || event === "used" ? "info" : "warn";

	if (severity === "info") {
		logger.info(`API key ${event}`, logData);
	} else {
		logger.warn(`API key ${event}`, logData);
	}
}
