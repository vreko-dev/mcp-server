/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for authentication endpoints.
 * Uses a sliding window algorithm to track requests.
 *
 * In production, consider using:
 * - Upstash Rate Limit (Redis-based, distributed)
 * - Vercel Edge Config with KV
 * - Better Auth rate-limit plugin (if available)
 *
 * Current implementation:
 * - 10 attempts per 15 minutes per IP
 * - Resets after window expires
 * - In-memory only (single instance)
 */

interface RateLimitEntry {
	attempts: number;
	resetAt: number;
}

// In-memory store (reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @returns Object with allowed status and retry information
 */
export function checkRateLimit(identifier: string): {
	allowed: boolean;
	remaining: number;
	resetAt: number;
} {
	// Perform on-demand cleanup periodically
	maybeCleanup();

	const now = Date.now();
	const entry = rateLimitStore.get(identifier);

	// No entry or expired window - allow and create new entry
	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(identifier, {
			attempts: 1,
			resetAt: now + WINDOW_MS,
		});

		return {
			allowed: true,
			remaining: MAX_ATTEMPTS - 1,
			resetAt: now + WINDOW_MS,
		};
	}

	// Within window - check if under limit
	if (entry.attempts < MAX_ATTEMPTS) {
		entry.attempts++;

		return {
			allowed: true,
			remaining: MAX_ATTEMPTS - entry.attempts,
			resetAt: entry.resetAt,
		};
	}

	// Over limit
	return {
		allowed: false,
		remaining: 0,
		resetAt: entry.resetAt,
	};
}

/**
 * Reset rate limit for an identifier (e.g., on successful login)
 * @param identifier - Unique identifier
 */
export function resetRateLimit(identifier: string): void {
	rateLimitStore.delete(identifier);
}

/**
 * Clean up expired entries (optional maintenance)
 * Called on-demand to prevent memory growth in serverless environments
 * @internal
 */
function cleanupExpiredEntries(): void {
	const now = Date.now();

	for (const [identifier, entry] of rateLimitStore.entries()) {
		if (now > entry.resetAt) {
			rateLimitStore.delete(identifier);
		}
	}
}

// Track cleanup calls for on-demand cleanup
let checkCount = 0;
const CLEANUP_INTERVAL = 100; // Cleanup every 100 checks

/**
 * Perform on-demand cleanup
 * Note: We don't use setInterval because:
 * - Serverless functions (Vercel) spin up/down unpredictably
 * - Multiple instances would create multiple intervals
 * - Could cause memory leaks in long-running processes
 * Instead, we cleanup periodically during normal operation
 * @internal
 */
function maybeCleanup(): void {
	checkCount++;
	if (checkCount >= CLEANUP_INTERVAL) {
		cleanupExpiredEntries();
		checkCount = 0;
	}
}
