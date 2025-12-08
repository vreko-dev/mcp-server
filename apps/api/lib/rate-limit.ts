import { getRedisClient } from "./redis-client";

interface TokenBucket {
	tokens: number;
	lastRefill: number;
	capacity: number;
	refillRate: number; // tokens per second
}

const BUCKET_CONFIG = {
	free: { capacity: 20, refillRate: 0.167 }, // 10/min
	pro: { capacity: 200, refillRate: 1.667 }, // 100/min
	team: { capacity: 1000, refillRate: 8.333 }, // 500/min
	enterprise: { capacity: 5000, refillRate: 33.333 }, // 2000/min
};

export async function checkRateLimit(userId: string, plan: string, requestCost = 1) {
	const redis = await getRedisClient();
	const config = BUCKET_CONFIG[plan as keyof typeof BUCKET_CONFIG] || BUCKET_CONFIG.free;
	const bucketKey = `bucket:${userId}`;
	const now = Date.now() / 1000; // seconds

	// Get or create bucket
	let bucket: TokenBucket | null = null;
	try {
		const bucketString = await redis.get(bucketKey);
		bucket = bucketString ? JSON.parse(bucketString) : null;
	} catch (_error) {
		// If parsing fails, create a new bucket
		bucket = null;
	}

	if (!bucket) {
		bucket = {
			tokens: config.capacity,
			lastRefill: now,
			capacity: config.capacity,
			refillRate: config.refillRate,
		};
	}

	// Refill tokens based on time elapsed
	const timePassed = now - bucket.lastRefill;
	const tokensToAdd = timePassed * bucket.refillRate;
	bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
	bucket.lastRefill = now;

	// Check if request can be fulfilled
	if (bucket.tokens >= requestCost) {
		bucket.tokens -= requestCost;

		// Save bucket state
		await redis.set(bucketKey, JSON.stringify(bucket), { EX: 3600 }); // 1 hour TTL

		return {
			allowed: true,
			remaining: Math.floor(bucket.tokens),
			limit: config.capacity,
			resetAt: Math.floor(now + (config.capacity - bucket.tokens) / config.refillRate),
		};
	}
	// Calculate retry time
	const tokensNeeded = requestCost - bucket.tokens;
	const retryAfter = Math.ceil(tokensNeeded / config.refillRate);

	return {
		allowed: false,
		remaining: 0,
		limit: config.capacity,
		resetAt: Math.floor(now + retryAfter),
		retryAfter,
		consumed: config.capacity - Math.floor(bucket.tokens),
	};
}
