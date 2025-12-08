import { logger } from "@snapback/infrastructure";

/**
 * Upstash Redis REST API Client
 * Uses REST API instead of TCP connections for better serverless compatibility
 */

interface UpstashConfig {
	url: string;
	token: string;
}

interface UpstashResponse<T = unknown> {
	result: T;
	error?: string;
}

let upstashConfig: UpstashConfig | null = null;

export function initializeUpstashClient(): void {
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;

	if (!url || !token) {
		logger.warn("Upstash Redis not configured - rate limiting and caching will be disabled");
		return;
	}

	upstashConfig = { url, token };
	logger.info("Upstash Redis client initialized successfully");
}

async function executeCommand<T = unknown>(command: string[]): Promise<T> {
	if (!upstashConfig) {
		throw new Error("Upstash Redis not configured - operation cannot proceed");
	}

	// Edge runtime validation
	if (typeof fetch === "undefined") {
		throw new Error("Fetch API not available - edge runtime required");
	}

	try {
		const response = await fetch(`${upstashConfig.url}/${command.join("/")}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${upstashConfig.token}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Upstash request failed: ${response.statusText}`);
		}

		const data = (await response.json()) as UpstashResponse<T>;

		if (data.error) {
			throw new Error(`Upstash error: ${data.error}`);
		}

		return data.result;
	} catch (error) {
		logger.error("Upstash command failed:", { command, error });
		// FAIL CLOSED: Throw error instead of returning null
		throw new Error(`Redis operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

// Cache operations with 10s default TTL (reduced from 60s for better coherency)
export async function cacheGet<T = string>(key: string): Promise<T | null> {
	try {
		return await executeCommand<T>(["GET", key]);
	} catch (error) {
		// Cache miss is acceptable for non-critical operations
		// but log the error for monitoring
		logger.warn("Cache get failed:", { key, error });
		return null;
	}
}

export async function cacheSet(
	key: string,
	value: string,
	ttlSeconds = 10, // Reduced from 60s for better coherency
): Promise<void> {
	try {
		await executeCommand(["SET", key, value, "EX", String(ttlSeconds)]);
	} catch (error) {
		// Cache set failure is non-critical but should be logged
		logger.warn("Cache set failed:", { key, error });
	}
}

export async function cacheDel(key: string): Promise<void> {
	try {
		await executeCommand(["DEL", key]);
	} catch (error) {
		// Cache delete failure is non-critical but should be logged
		logger.warn("Cache delete failed:", { key, error });
	}
}

// Rate limiting with atomic Lua script (FAIL CLOSED)
// Uses sorted set with sliding window for accurate rate limiting
export async function rateLimitCheck(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const now = Date.now();
	const windowMs = windowSeconds * 1000;
	const windowStart = now - windowMs;

	// Atomic Lua script for rate limiting
	// This prevents race conditions by executing all operations atomically
	const luaScript = `
		local key = KEYS[1]
		local now = tonumber(ARGV[1])
		local window_start = tonumber(ARGV[2])
		local limit = tonumber(ARGV[3])
		local window_ms = tonumber(ARGV[4])
		local expire_seconds = tonumber(ARGV[5])

		-- Remove old entries
		redis.call('ZREMRANGEBYSCORE', key, '0', tostring(window_start))

		-- Count current requests
		local current_count = redis.call('ZCARD', key)

		if current_count >= limit then
			-- Get earliest timestamp for reset calculation
			local earliest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
			local reset_at = now + window_ms
			if #earliest > 1 then
				reset_at = tonumber(earliest[2]) + window_ms
			end
			return {0, 0, reset_at}
		end

		-- Add current request and set expiry
		redis.call('ZADD', key, tostring(now), tostring(now))
		redis.call('EXPIRE', key, expire_seconds)

		local remaining = limit - current_count - 1
		local reset_at = now + window_ms
		return {1, remaining, reset_at}
	`;

	try {
		// Execute Lua script atomically
		const result = await executeCommand<[number, number, number]>([
			"EVAL",
			luaScript,
			"1", // Number of keys
			key,
			String(now),
			String(windowStart),
			String(limit),
			String(windowMs),
			String(windowSeconds * 2), // Expire after 2x window
		]);

		const [allowed, remaining, resetAt] = result;

		if (!allowed) {
			logger.warn("Rate limit exceeded", { key, limit, resetAt });
		}

		return {
			allowed: Boolean(allowed),
			remaining,
			resetAt,
		};
	} catch (error) {
		// FAIL CLOSED: On error, reject the request
		logger.error("Rate limit check failed - failing closed", { key, error });
		throw new Error("Rate limiting unavailable - request denied for safety");
	}
}

// Session cache invalidation
export async function invalidateSessionCache(userId: string): Promise<void> {
	await cacheDel(`session:${userId}`);
	await cacheDel(`cfg:${userId}`);
}

// Waitlist position cache (10s TTL for better coherency)
export async function getCachedWaitlistPosition(email: string): Promise<number | null> {
	const cached = await cacheGet<string>(`waitlist:position:${email}`);
	return cached ? Number.parseInt(cached, 10) : null;
}

export async function setCachedWaitlistPosition(email: string, position: number): Promise<void> {
	// Reduced from 60s to 10s for better coherency
	await cacheSet(`waitlist:position:${email}`, String(position), 10);
}

// Health check
export async function upstashHealthCheck(): Promise<boolean> {
	if (!upstashConfig) {
		return false;
	}

	try {
		const result = await executeCommand<string>(["PING"]);
		return result === "PONG";
	} catch {
		return false;
	}
}
