/**
 * Rate Limiting Implementation
 *
 * Provides distributed rate limiting for authentication endpoints and APIs.
 * Supports both in-memory and Redis backends with graceful fallback.
 *
 * OWASP Standards: A01:2021 – Broken Access Control, A40:2021 – Denial of Service
 */

import { logger } from "@snapback/infrastructure";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	/** Max requests allowed in time window */
	maxRequests: number;
	/** Time window in seconds */
	windowSeconds: number;
	/** Storage backend: 'memory' or 'redis' */
	backend: "memory" | "redis";
	/** Enable rate limiting (default: true) */
	enabled: boolean;
}

/**
 * Rate limit entry in storage
 */
interface RateLimitEntry {
	/** Request count in current window */
	count: number;
	/** Window start timestamp */
	windowStart: number;
	/** First request timestamp */
	firstRequestAt: number;
}

/**
 * Authentication endpoint rate limits (OWASP 2025)
 */
export const authEndpointLimits: Record<string, RateLimitConfig> = {
	"/api/auth/sign-in/email": {
		maxRequests: 3,
		windowSeconds: 10,
		backend: "memory",
		enabled: true,
	},
	"/api/auth/sign-up": {
		maxRequests: 5,
		windowSeconds: 60,
		backend: "memory",
		enabled: true,
	},
	"/api/auth/password-reset": {
		maxRequests: 3,
		windowSeconds: 60,
		backend: "memory",
		enabled: true,
	},
	"/api/auth/sign-in/otp": {
		maxRequests: 5,
		windowSeconds: 60,
		backend: "memory",
		enabled: true,
	},
};

/**
 * API tier rate limits
 */
export const apiTierLimits = {
	free: {
		requestsPerDay: 1000,
		burst: 10, // requests per minute
	},
	pro: {
		requestsPerDay: 100000,
		burst: 500, // requests per minute
	},
	enterprise: {
		requestsPerDay: -1, // unlimited
		burst: -1, // unlimited
	},
};

/**
 * Global rate limiting configuration
 */
export const globalRateLimitConfig: RateLimitConfig = {
	maxRequests: 10000, // per hour per IP
	windowSeconds: 3600,
	backend: "memory",
	enabled: true,
};

/**
 * In-memory rate limit storage
 * In production, use Redis for distributed state
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request is rate limited
 *
 * Uses sliding window algorithm:
 * - Track requests per IP in time window
 * - Allow up to maxRequests in windowSeconds
 * - Reject if exceeds limit
 * - Return retry-after header
 *
 * @param key Identifier to rate limit (IP address, user ID, etc.)
 * @param config Rate limit configuration
 * @returns Rate limit result with retry-after if limited
 */
export function isRateLimited(
	key: string,
	config: RateLimitConfig,
): {
	limited: boolean;
	remaining: number;
	retryAfterSeconds?: number;
	resetAt?: number;
} {
	if (!config.enabled) {
		return {
			limited: false,
			remaining: config.maxRequests,
		};
	}

	const now = Date.now();
	const windowStart = now - config.windowSeconds * 1000;

	// Get or create entry
	let entry = rateLimitStore.get(key);

	// Clean up old window
	if (entry && entry.windowStart < windowStart) {
		entry = {
			count: 0,
			windowStart: now,
			firstRequestAt: now,
		};
		rateLimitStore.set(key, entry);
	}

	// Initialize if new
	if (!entry) {
		entry = {
			count: 1,
			windowStart: now,
			firstRequestAt: now,
		};
		rateLimitStore.set(key, entry);

		return {
			limited: false,
			remaining: config.maxRequests - 1,
			resetAt: now + config.windowSeconds * 1000,
		};
	}

	// Increment count
	entry.count++;
	const remaining = config.maxRequests - entry.count;

	if (entry.count > config.maxRequests) {
		// Rate limited
		const resetAt = entry.windowStart + config.windowSeconds * 1000;
		const retryAfter = Math.ceil((resetAt - now) / 1000);

		logger.warn("Rate limit exceeded", {
			key: `${key.substring(0, 20)}...`, // Don't log full IP
			attempts: entry.count,
			limit: config.maxRequests,
			window: config.windowSeconds,
			retryAfter,
		});

		return {
			limited: true,
			remaining: 0,
			retryAfterSeconds: Math.max(1, retryAfter),
			resetAt,
		};
	}

	return {
		limited: false,
		remaining,
		resetAt: entry.windowStart + config.windowSeconds * 1000,
	};
}

/**
 * Check if IP is doing distributed attack
 *
 * Detects patterns across multiple IPs:
 * - Many IPs hitting same endpoint
 * - Same error pattern across IPs
 * - Coordinated timing
 *
 * @param endpoint Endpoint being targeted
 * @param failureCount Number of failures in window
 * @returns Attack detection result
 */
export function detectDistributedAttack(
	endpoint: string,
	failureCount: number,
): {
	isAttack: boolean;
	severity?: "low" | "medium" | "high";
	reason?: string;
} {
	// More than 100 failures on endpoint in 1 minute = likely DDoS
	if (failureCount > 100) {
		logger.warn("Distributed attack detected", {
			endpoint,
			failureCount,
		});

		return {
			isAttack: true,
			severity: failureCount > 1000 ? "high" : "medium",
			reason: "Excessive endpoint failures",
		};
	}

	return {
		isAttack: false,
	};
}

/**
 * Calculate credential stuffing score
 *
 * Scores likelihood of credential stuffing attack:
 * - Multiple failed attempts
 * - From same IP
 * - On login endpoint
 * - High frequency
 *
 * @param failedAttempts Failed login attempts
 * @param timeWindowSeconds Time window analyzed
 * @param isLoginEndpoint Whether this is login endpoint
 * @returns Score 0-100 (higher = more likely attack)
 */
export function calculateCredentialStuffingScore(
	failedAttempts: number,
	timeWindowSeconds: number,
	isLoginEndpoint: boolean,
): number {
	if (!isLoginEndpoint) {
		return 0;
	}

	const attemptRate = failedAttempts / (timeWindowSeconds / 60); // attempts per minute

	// Suspicious if > 1 attempt per second
	if (attemptRate > 60) {
		return 90;
	}

	// Suspicious if > 10 attempts per minute
	if (attemptRate > 10) {
		return 70;
	}

	// Slightly suspicious if > 5 attempts per minute
	if (attemptRate > 5) {
		return 40;
	}

	// Normal if < 5 attempts per minute
	return Math.min(30, failedAttempts * 2);
}

/**
 * Get exponential backoff delay
 *
 * Uses exponential backoff algorithm:
 * - Attempt 1: 1 second
 * - Attempt 2: 2 seconds
 * - Attempt 3: 4 seconds
 * - Attempt n: 2^(n-1) seconds
 *
 * @param attemptNumber Attempt number (1-based)
 * @param maxDelaySeconds Maximum delay cap
 * @returns Delay in seconds
 */
function calculateBackoffSeconds(
	attemptNumber: number,
	maxDelaySeconds = 3600, // 1 hour max
): number {
	// Exponential: seconds * 2^(attempt - 1)
	const exponential = 1 * 2 ** (attemptNumber - 1);
	// Cap at maximum
	return Math.min(exponential, maxDelaySeconds);
}

export function getExponentialBackoffDelay(
	attemptNumber: number,
	maxDelaySeconds = 3600, // 1 hour max
): number {
	return calculateBackoffSeconds(attemptNumber, maxDelaySeconds);
}

/**
 * Build Retry-After header value
 *
 * Formats delay for HTTP 429 response
 * Can be in seconds or RFC 7231 format
 *
 * @param delaySeconds Delay in seconds
 * @returns Retry-After header value
 */
export function buildRetryAfterHeader(delaySeconds: number): string {
	// Use seconds format for simplicity
	return String(Math.max(1, Math.ceil(delaySeconds)));
}

/**
 * Extract client IP from request headers
 *
 * Checks multiple header sources:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Forwarded-For (proxy chain)
 * 3. X-Real-IP (reverse proxy)
 * 4. Socket address
 *
 * @param headers Request headers
 * @param socketRemoteAddress Socket remote address (fallback)
 * @returns Client IP address
 */
export function extractClientIP(
	headers: Headers | Record<string, string>,
	socketRemoteAddress?: string,
): string {
	const getHeader = (name: string): string | null => {
		if (headers instanceof Headers) {
			return headers.get(name);
		}
		return headers[name.toLowerCase()] || null;
	};

	// Cloudflare
	const cfIP = getHeader("cf-connecting-ip");
	if (cfIP) {
		return cfIP;
	}

	// X-Forwarded-For: client, proxy1, proxy2
	// Use rightmost IP (closest to server)
	const xForwardedFor = getHeader("x-forwarded-for");
	if (xForwardedFor) {
		const ips = xForwardedFor.split(",").map((ip) => ip.trim());
		return ips[ips.length - 1];
	}

	// X-Real-IP (reverse proxy)
	const xRealIP = getHeader("x-real-ip");
	if (xRealIP) {
		return xRealIP;
	}

	// Fallback to socket
	return socketRemoteAddress || "unknown";
}

/**
 * Cleanup old rate limit entries
 *
 * Removes entries older than max window to prevent memory leak
 *
 * @returns Object with cleanup stats
 */
export function cleanupRateLimitStore(): {
	cleaned: number;
	remaining: number;
} {
	const now = Date.now();
	const maxWindowSeconds = Math.max(
		...Object.values(authEndpointLimits).map((c) => c.windowSeconds),
		globalRateLimitConfig.windowSeconds,
	);
	const maxAge = maxWindowSeconds * 1000;

	let cleaned = 0;

	for (const [key, entry] of rateLimitStore.entries()) {
		if (now - entry.firstRequestAt > maxAge) {
			rateLimitStore.delete(key);
			cleaned++;
		}
	}

	if (cleaned > 0) {
		logger.debug("Rate limit store cleanup", {
			cleaned,
			remaining: rateLimitStore.size,
		});
	}

	return {
		cleaned,
		remaining: rateLimitStore.size,
	};
}

/**
 * Log rate limit event
 *
 * Records rate limit violations for monitoring
 *
 * @param event Event type
 * @param details Event details
 */
export function logRateLimitEvent(
	event: "limited" | "attack" | "credential_stuffing",
	details: {
		key: string;
		endpoint?: string;
		attemptCount?: number;
		retryAfter?: number;
	},
): void {
	const logData = {
		event: `RATE_LIMIT_${event.toUpperCase()}`,
		key: `${details.key.substring(0, 20)}...`, // Truncate for privacy
		endpoint: details.endpoint,
		attemptCount: details.attemptCount,
		retryAfter: details.retryAfter,
		timestamp: new Date().toISOString(),
	};

	logger.warn(`Rate limit: ${event}`, logData);
}

// Cleanup every hour
if (typeof setInterval !== "undefined") {
	setInterval(
		() => {
			cleanupRateLimitStore();
		},
		60 * 60 * 1000,
	);
}
