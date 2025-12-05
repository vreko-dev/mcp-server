/**
 * Distributed Rate Limiting Middleware with Redis
 *
 * Implements token bucket algorithm with plan-based rate limits:
 * - Free: 100 requests/hour
 * - Solo: 5,000 requests/hour
 * - Team: 10,000 requests/hour
 * - Enterprise: 50,000 requests/hour
 *
 * Uses Redis for distributed state across multiple API instances.
 * Falls back to in-memory storage if Redis unavailable.
 */

import { logger } from "@snapback/infrastructure";
import type { Context, Next } from "hono";
import type { AuthContext } from "./auth-unified.js";

// ============================================================================
// Types
// ============================================================================

interface RateLimitConfig {
	requests: number; // Max requests per window
	window: number; // Time window in seconds
}

interface RateLimitState {
	tokens: number;
	refillTime: number;
}

// ============================================================================
// Rate Limit Configurations
// ============================================================================

const RATE_LIMITS: Record<string, RateLimitConfig> = {
	free: { requests: 100, window: 3600 }, // 100/hour
	solo: { requests: 5000, window: 3600 }, // 5,000/hour
	team: { requests: 10000, window: 3600 }, // 10,000/hour
	enterprise: { requests: 50000, window: 3600 }, // 50,000/hour
};

const PUBLIC_LIMIT: RateLimitConfig = {
	requests: 30,
	window: 3600, // 30/hour per IP
};

// ============================================================================
// Redis Connection (with fallback)
// ============================================================================

let redisClient: any = null;
let redisAvailable = false;

async function initializeRedis() {
	if (process.env.SKIP_REDIS === "true") {
		logger.warn("Redis skipped via SKIP_REDIS environment variable");
		return;
	}

	try {
		const redis = (await import("redis")) as any;
		redisClient = redis.createClient({
			url: process.env.REDIS_URL || "redis://localhost:6379",
			socket: {
				connectTimeout: 5000,
				reconnectStrategy: (retries: number) =>
					retries > 3 ? new Error("Redis max retries") : 100 * retries,
			},
		});

		redisClient.on("error", (err: any) => {
			logger.warn("Redis client error", { error: err.message });
			redisAvailable = false;
		});

		redisClient.on("connect", () => {
			logger.info("Redis connected");
			redisAvailable = true;
		});

		await redisClient.connect();
		redisAvailable = true;
		logger.info("Rate limiting initialized with Redis");
	} catch (error) {
		logger.warn(
			"Redis initialization failed, falling back to in-memory rate limiting",
			{
				error: error instanceof Error ? error.message : String(error),
			},
		);
		redisAvailable = false;
	}
}

// Initialize on module load
initializeRedis().catch((err) => {
	logger.error("Failed to initialize Redis for rate limiting", {
		error: err instanceof Error ? err.message : String(err),
	});
});

// ============================================================================
// In-Memory Fallback (for single-instance or Redis unavailable)
// ============================================================================

const inMemoryStore = new Map<string, RateLimitState>();

function getInMemoryState(key: string, limit: RateLimitConfig): RateLimitState {
	const now = Date.now() / 1000;
	const state = inMemoryStore.get(key);

	if (!state) {
		return {
			tokens: limit.requests,
			refillTime: now + limit.window,
		};
	}

	// Refill if window expired
	if (now >= state.refillTime) {
		return {
			tokens: limit.requests,
			refillTime: now + limit.window,
		};
	}

	// Refill based on time elapsed
	const timePassed = now - (state.refillTime - limit.window);
	const tokensToAdd = Math.floor(timePassed * (limit.requests / limit.window));
	const newTokens = Math.min(state.tokens + tokensToAdd, limit.requests);

	return {
		tokens: newTokens,
		refillTime: state.refillTime,
	};
}

function checkAndConsume(key: string, limit: RateLimitConfig): boolean {
	const state = getInMemoryState(key, limit);

	if (state.tokens >= 1) {
		state.tokens -= 1;
		inMemoryStore.set(key, state);
		return true;
	}

	return false;
}

// ============================================================================
// Redis Operations
// ============================================================================

async function checkRateLimitRedis(
	key: string,
	limit: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	if (!redisAvailable || !redisClient) {
		// Fallback to in-memory
		const allowed = checkAndConsume(key, limit);
		const current = inMemoryStore.get(key);
		return {
			allowed,
			remaining: Math.max(0, current?.tokens ?? 0),
			resetAt: Math.floor((current?.refillTime ?? 0) * 1000),
		};
	}

	try {
		const now = Math.floor(Date.now() / 1000);
		const resetAt = now + limit.window;
		const resetKey = `${key}:reset`;

		// Get current count and reset time
		const countStr = await redisClient.get(key);
		const resetStr = await redisClient.get(resetKey);

		const count = Number.parseInt(countStr || "0", 10);
		const reset = Number.parseInt(resetStr || String(resetAt), 10);

		// Reset window if expired
		if (now >= reset) {
			await redisClient.set(key, "0", { EX: limit.window });
			await redisClient.set(resetKey, String(resetAt), { EX: limit.window });

			return {
				allowed: true,
				remaining: limit.requests - 1,
				resetAt: resetAt * 1000,
			};
		}

		// Check if under limit
		if (count < limit.requests) {
			const newCount = count + 1;
			const remaining = limit.requests - newCount;

			await redisClient.incr(key);

			return {
				allowed: true,
				remaining,
				resetAt: reset * 1000,
			};
		}

		// Over limit
		return {
			allowed: false,
			remaining: 0,
			resetAt: reset * 1000,
		};
	} catch (error) {
		logger.error("Redis rate limit check failed", {
			error: error instanceof Error ? error.message : String(error),
		});

		// Fallback to in-memory
		const allowed = checkAndConsume(key, limit);
		const current = inMemoryStore.get(key);
		return {
			allowed,
			remaining: Math.max(0, current?.tokens ?? 0),
			resetAt: Math.floor((current?.refillTime ?? 0) * 1000),
		};
	}
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Rate limiting middleware
 * Apply globally to all routes
 */
export async function createRateLimitMiddleware(): Promise<
	(c: Context, next: Next) => Promise<Response | undefined>
> {
	return async (c: Context, next: Next): Promise<Response | undefined> => {
		try {
			const auth = c.get("auth") as AuthContext | undefined;

			let identifier: string;
			let limit: RateLimitConfig;

			if (auth) {
				// Authenticated: use plan-based limit per user
				identifier = `ratelimit:user:${auth.user.id}`;
				limit = RATE_LIMITS[auth.plan] || RATE_LIMITS.free;
			} else {
				// Unauthenticated: use IP-based limit
				const clientIp =
					c.req.header("x-forwarded-for") ||
					c.req.header("x-real-ip") ||
					"unknown";
				identifier = `ratelimit:ip:${clientIp}`;
				limit = PUBLIC_LIMIT;
			}

			const result = await checkRateLimitRedis(identifier, limit);

			// Set rate limit headers
			c.header("X-RateLimit-Limit", String(limit.requests));
			c.header("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
			c.header("X-RateLimit-Reset", String(Math.floor(result.resetAt / 1000)));

			if (!result.allowed) {
				const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);

				logger.warn("Rate limit exceeded", {
					identifier: auth ? `user:${auth.user.id}` : "public",
					plan: auth?.plan || "free",
					limit: limit.requests,
					resetIn,
				});

				return c.json(
					{
						code: "rate_limited",
						message: `Rate limit exceeded. Reset in ${resetIn} seconds`,
						retryAfter: resetIn,
					},
					429,
				);
			}

			await next();
		} catch (error) {
			logger.error("Rate limit middleware error", {
				error: error instanceof Error ? error.message : String(error),
			});

			// On error, allow request through (fail open)
			await next();
		}
	};
}

// ============================================================================
// Exports for testing
// ============================================================================

export { checkRateLimitRedis, inMemoryStore };
