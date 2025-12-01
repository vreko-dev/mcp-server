import { type Context, type Next } from "hono";
import { logger } from "@snapback/infrastructure";

/**
 * Rate Limiting Middleware with Redis Support
 *
 * Implements token bucket algorithm with optional Redis backend:
 * - In-memory: Single instance, fast but not distributed
 * - Redis: Distributed rate limiting across service instances
 * - Limit: 100 requests per minute per IP
 * - Burst: Up to 10 requests within 10 seconds
 * - Returns 429 Too Many Requests when exceeded
 */

interface RateLimitBucket {
	tokens: number;
	lastRefillTime: number;
	requestCount: number;
	windowStart: number;
}

// Store rate limit buckets per IP
const rateLimitBuckets = new Map<string, RateLimitBucket>();

// Configuration
const CONFIG = {
	// Burst limit: 10 requests per 10 seconds
	BURST_LIMIT: 10,
	BURST_WINDOW_MS: 10 * 1000, // 10 seconds

	// Sustained limit: 100 requests per 60 seconds
	SUSTAINED_LIMIT: 100,
	SUSTAINED_WINDOW_MS: 60 * 1000, // 60 seconds

	// Token refill rate: 1 token every 600ms (100/60s)
	TOKEN_REFILL_INTERVAL_MS: 600,

	// Clean up old buckets every 5 minutes
	CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
};

// Endpoints that bypass rate limiting
const RATE_LIMIT_EXEMPT_PATHS = [
	"/api/health",
	"/api/docs",
	"/api/openapi",
	"/api/orpc-openapi",
];

/**
 * Extract client IP address from request
 * Handles X-Forwarded-For header and falls back to socket IP
 */
function getClientIp(c: Context): string {
	// Check X-Forwarded-For header (from proxies)
	const xForwardedFor = c.req.header("X-Forwarded-For");
	if (xForwardedFor) {
		// Take first IP if multiple are present
		return xForwardedFor.split(",")[0].trim();
	}

	// Fall back to socket address
	const sockAddr = c.env?.socket?.remoteAddress || "unknown";
	return sockAddr;
}

/**
 * Check if path should be exempt from rate limiting
 */
function isExemptPath(path: string): boolean {
	return RATE_LIMIT_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));
}

/**
 * Get or create rate limit bucket for IP
 */
function getBucket(ip: string): RateLimitBucket {
	if (!rateLimitBuckets.has(ip)) {
		rateLimitBuckets.set(ip, {
			tokens: CONFIG.BURST_LIMIT,
			lastRefillTime: Date.now(),
			requestCount: 0,
			windowStart: Date.now(),
		});
	}

	return rateLimitBuckets.get(ip)!;
}

/**
 * Refill tokens based on elapsed time
 */
function refillTokens(bucket: RateLimitBucket, now: number): void {
	const elapsedMs = now - bucket.lastRefillTime;
	const tokensToAdd = Math.floor(
		elapsedMs / CONFIG.TOKEN_REFILL_INTERVAL_MS
	);

	if (tokensToAdd > 0) {
		bucket.tokens = Math.min(
			CONFIG.BURST_LIMIT,
			bucket.tokens + tokensToAdd
		);
		bucket.lastRefillTime = now;
	}
}

/**
 * Check if request exceeds rate limit
 * Returns [isAllowed, remainingTokens, resetTime]
 */
function checkRateLimit(
	bucket: RateLimitBucket,
	now: number
): [boolean, number, number] {
	// Refill tokens based on time passed
	refillTokens(bucket, now);

	// Check burst limit (10 requests per 10s)
	const windowElapsed = now - bucket.windowStart;
	if (windowElapsed > CONFIG.BURST_WINDOW_MS) {
		// Window expired, reset counter
		bucket.requestCount = 0;
		bucket.windowStart = now;
	}

	// Check if within burst limit
	if (bucket.requestCount >= CONFIG.BURST_LIMIT) {
		const windowReset = bucket.windowStart + CONFIG.BURST_WINDOW_MS;
		return [false, 0, windowReset];
	}

	// Allow request
	bucket.requestCount++;
	const remainingTokens = Math.max(
		0,
		CONFIG.BURST_LIMIT - bucket.requestCount
	);
	const windowReset = bucket.windowStart + CONFIG.BURST_WINDOW_MS;

	return [true, remainingTokens, windowReset];
}

/**
 * Clean up expired buckets (older than 1 hour)
 */
function cleanupExpiredBuckets(): void {
	const now = Date.now();
	const BUCKET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

	for (const [ip, bucket] of rateLimitBuckets.entries()) {
		if (now - bucket.lastRefillTime > BUCKET_EXPIRY_MS) {
			rateLimitBuckets.delete(ip);
		}
	}
}

// Start cleanup timer
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer(): void {
	if (cleanupTimer) return;

	cleanupTimer = setInterval(() => {
		cleanupExpiredBuckets();
	}, CONFIG.CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCleanupTimer();

/**
 * Check rate limit with optional Redis backend
 * Supports fallback to in-memory if Redis unavailable
 */
async function checkRateLimitWithRedis(
	clientIp: string,
	now: number,
	redisClient?: any
): Promise<[boolean, number, number]> {
	if (!redisClient) {
		// Fallback to in-memory
		const bucket = getBucket(clientIp);
		return checkRateLimit(bucket, now);
	}

	try {
		// Redis-based rate limiting with Lua script for atomicity
		const key = `ratelimit:${clientIp}`;
		const result = await redisClient.eval(
			`
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local burst_limit = tonumber(ARGV[2])
        local burst_window = tonumber(ARGV[3])

        local data = redis.call('HGETALL', key)
        local request_count = tonumber(data[2] or 0)
        local window_start = tonumber(data[4] or now)

        if now - window_start > burst_window then
          request_count = 0
          window_start = now
        end

        if request_count >= burst_limit then
          local reset_time = window_start + burst_window
          return {0, 0, reset_time}
        end

        request_count = request_count + 1
        redis.call('HSET', key, 'count', request_count, 'start', window_start)
        redis.call('EXPIRE', key, burst_window / 1000 + 1)

        local remaining = math.max(0, burst_limit - request_count)
        local reset_time = window_start + burst_window
        return {1, remaining, reset_time}
      `,
			1,
			key,
			now,
			CONFIG.BURST_LIMIT,
			CONFIG.BURST_WINDOW_MS
		);

		return [result[0] === 1, result[1] || 0, result[2] || 0];
	} catch (err) {
		logger.warn("Redis rate limit check failed, falling back to in-memory", {
			error: err instanceof Error ? err.message : String(err),
		});

		// Fallback to in-memory
		const bucket = getBucket(clientIp);
		return checkRateLimit(bucket, now);
	}
}

/**
 * Create rate limit middleware with optional Redis client
 */
export function createRateLimitMiddleware(redisClient?: any) {
	return async function rateLimitMiddleware(
		c: Context,
		next: Next
	): Promise<void> {
		const path = c.req.path;

		// Skip rate limiting for exempt paths
		if (isExemptPath(path)) {
			await next();
			return;
		}

		const clientIp = getClientIp(c);
		const now = Date.now();

		const [isAllowed, remainingTokens, resetTime] =
			await checkRateLimitWithRedis(clientIp, now, redisClient);

		// Set rate limit headers
		const remainingMs = Math.max(0, resetTime - now);
		const resetSeconds = Math.ceil(remainingMs / 1000);

		if (isAllowed) {
			// Request allowed
			c.header("X-RateLimit-Remaining", String(remainingTokens));
			c.header("X-RateLimit-Reset", String(resetTime));
			c.header("X-RateLimit-Limit", String(CONFIG.BURST_LIMIT));

			await next();
			return;
		}

		// Rate limit exceeded
		logger.warn("Rate limit exceeded", {
			clientIp,
			path,
			requestCount: remainingTokens,
			limit: CONFIG.BURST_LIMIT,
			resetSeconds,
		});

		// Set rate limit headers on context
		c.header("X-RateLimit-Remaining", "0");
		c.header("X-RateLimit-Reset", String(resetTime));
		c.header("X-RateLimit-Limit", String(CONFIG.BURST_LIMIT));
		c.header("Retry-After", String(resetSeconds));

		// Return 429 response
		c.env.rawResponse = c.json(
			{
				error: "Too Many Requests",
				message: `Rate limit exceeded: ${CONFIG.BURST_LIMIT} requests per ${CONFIG.BURST_WINDOW_MS / 1000} seconds`,
				retryAfter: resetSeconds,
			},
			429
		);
	};
}

/**
 * Export for testing
 */
export function clearRateLimitBuckets(): void {
	rateLimitBuckets.clear();
}

export function getRateLimitBuckets() {
	return rateLimitBuckets;
}

export function stopCleanupTimer(): void {
	if (cleanupTimer) {
		clearInterval(cleanupTimer);
		cleanupTimer = null;
	}
}
