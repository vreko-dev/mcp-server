import { logger } from "@snapback/infrastructure";
import { rateLimitCheck } from "./upstash-client";

/**
 * Rate limiting configuration per tier
 * IP-based: 100 req/min
 * User-based: 1000 req/min
 */

const RATE_LIMITS = {
	ip: {
		limit: 100,
		window: 60, // seconds
	},
	user: {
		limit: 1000,
		window: 60, // seconds
	},
	api: {
		free: { limit: 20, window: 60 },
		pro: { limit: 200, window: 60 },
		team: { limit: 1000, window: 60 },
		enterprise: { limit: 5000, window: 60 },
	},
};

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: number;
	retryAfter?: number;
}

/**
 * Check IP-based rate limit
 */
export async function checkIPRateLimit(ipAddress: string): Promise<RateLimitResult> {
	const key = `ratelimit:ip:${ipAddress}`;
	const result = await rateLimitCheck(key, RATE_LIMITS.ip.limit, RATE_LIMITS.ip.window);

	if (!result.allowed) {
		logger.warn("IP rate limit exceeded", { ipAddress, ...result });
	}

	return {
		...result,
		limit: RATE_LIMITS.ip.limit,
	};
}

/**
 * Check user-based rate limit
 */
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
	const key = `ratelimit:user:${userId}`;
	const result = await rateLimitCheck(key, RATE_LIMITS.user.limit, RATE_LIMITS.user.window);

	if (!result.allowed) {
		logger.warn("User rate limit exceeded", { userId, ...result });
	}

	return {
		...result,
		limit: RATE_LIMITS.user.limit,
	};
}

/**
 * Check API key rate limit based on plan tier
 */
export async function checkAPIKeyRateLimit(
	apiKey: string,
	plan: "free" | "pro" | "team" | "enterprise" = "free",
): Promise<RateLimitResult> {
	const config = RATE_LIMITS.api[plan];
	const key = `ratelimit:apikey:${apiKey}`;
	const result = await rateLimitCheck(key, config.limit, config.window);

	if (!result.allowed) {
		logger.warn("API key rate limit exceeded", { apiKey, plan, ...result });
	}

	return {
		...result,
		limit: config.limit,
	};
}

/**
 * Combined rate limit check (both IP and user)
 * Returns the most restrictive result
 */
export async function checkCombinedRateLimit(ipAddress: string, userId?: string): Promise<RateLimitResult> {
	const ipResult = await checkIPRateLimit(ipAddress);

	if (!ipResult.allowed) {
		return ipResult;
	}

	if (userId) {
		const userResult = await checkUserRateLimit(userId);
		if (!userResult.allowed) {
			return userResult;
		}
	}

	return ipResult;
}
