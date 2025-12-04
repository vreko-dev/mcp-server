/**
 * Rate Limiting Middleware
 *
 * Token bucket algorithm for tier-based rate limiting
 * Uses in-memory store (suitable for single-instance deployment)
 * For production multi-instance, consider Redis-backed rate limiting
 */

import type { Tier } from "@snapback/contracts";

interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

// Tier-based rate limits (requests per hour)
const RATE_LIMITS: Record<Tier, Record<string, RateLimitConfig>> = {
	free: {
		"/api/snapshot/create": { maxRequests: 10, windowMs: 3600000 }, // 10/hr
		"/api/policy/evaluate": { maxRequests: 5, windowMs: 3600000 }, // 5/hr
		"/api/analytics/ingest": { maxRequests: 20, windowMs: 3600000 }, // 20/hr
		default: { maxRequests: 50, windowMs: 3600000 }, // 50/hr default
	},
	solo: {
		"/api/snapshot/create": { maxRequests: 100, windowMs: 3600000 }, // 100/hr
		"/api/policy/evaluate": { maxRequests: 50, windowMs: 3600000 }, // 50/hr
		"/api/analytics/ingest": { maxRequests: 200, windowMs: 3600000 }, // 200/hr
		default: { maxRequests: 500, windowMs: 3600000 }, // 500/hr default
	},
	team: {
		"/api/snapshot/create": { maxRequests: 500, windowMs: 3600000 }, // 500/hr
		"/api/policy/evaluate": { maxRequests: 200, windowMs: 3600000 }, // 200/hr
		"/api/analytics/ingest": { maxRequests: 1000, windowMs: 3600000 }, // 1000/hr
		default: { maxRequests: 2000, windowMs: 3600000 }, // 2000/hr default
	},
	enterprise: {
		"/api/snapshot/create": {
			maxRequests: Number.MAX_SAFE_INTEGER,
			windowMs: 3600000,
		},
		"/api/policy/evaluate": {
			maxRequests: Number.MAX_SAFE_INTEGER,
			windowMs: 3600000,
		},
		"/api/analytics/ingest": {
			maxRequests: Number.MAX_SAFE_INTEGER,
			windowMs: 3600000,
		},
		default: { maxRequests: Number.MAX_SAFE_INTEGER, windowMs: 3600000 },
	},
};

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get rate limit config for user and endpoint
 */
function getRateLimitConfig(tier: Tier, endpoint: string): RateLimitConfig {
	const tierLimits = RATE_LIMITS[tier];
	return tierLimits[endpoint] || tierLimits.default;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
	userId: string,
	tier: Tier,
	endpoint: string,
): {
	allowed: boolean;
	limit: number;
	remaining: number;
	reset: number;
} {
	const config = getRateLimitConfig(tier, endpoint);
	const key = `${userId}:${endpoint}`;
	const now = Date.now();

	let entry = rateLimitStore.get(key);

	// Initialize or reset if window expired
	if (!entry || now > entry.resetTime) {
		entry = {
			count: 0,
			resetTime: now + config.windowMs,
		};
		rateLimitStore.set(key, entry);
	}

	// Check if limit exceeded
	if (entry.count >= config.maxRequests) {
		return {
			allowed: false,
			limit: config.maxRequests,
			remaining: 0,
			reset: entry.resetTime,
		};
	}

	// Increment count
	entry.count++;

	return {
		allowed: true,
		limit: config.maxRequests,
		remaining: config.maxRequests - entry.count,
		reset: entry.resetTime,
	};
}

/**
 * Rate limit headers for response
 */
export function getRateLimitHeaders(result: {
	limit: number;
	remaining: number;
	reset: number;
}): Record<string, string> {
	return {
		"X-RateLimit-Limit": result.limit.toString(),
		"X-RateLimit-Remaining": result.remaining.toString(),
		"X-RateLimit-Reset": new Date(result.reset).toISOString(),
	};
}

/**
 * Rate limit error response
 */
export function rateLimitExceededResponse(resetTime: number): Response {
	const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

	return new Response(
		JSON.stringify({
			error: "Rate limit exceeded",
			message: "Too many requests. Please try again later.",
			retryAfter,
			upgradeUrl: "/pricing",
		}),
		{
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Retry-After": retryAfter.toString(),
			},
		},
	);
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupRateLimits(): void {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (now > entry.resetTime) {
			rateLimitStore.delete(key);
		}
	}
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
	setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
