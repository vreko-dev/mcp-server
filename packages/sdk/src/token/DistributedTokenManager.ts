/**
 * Distributed Token Manager with Redis Backend and In-Memory Fallback
 *
 * Manages rate limiting across distributed systems using Redis for state
 * persistence, with automatic fallback to in-memory storage when Redis
 * is unavailable.
 *
 * @module token/DistributedTokenManager
 */

import { type PlanConfig, RateLimiter } from "./RateLimiter";
import { TokenBucket } from "./TokenBucket";

export interface RedisClient {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<void>;
	incr(key: string): Promise<number>;
	decr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<void>;
	ttl(key: string): Promise<number>;
	del(key: string): Promise<void>;
}

export interface DistributedCheckLimitResult {
	/** Whether the request was allowed */
	allowed: boolean;

	/** Number of tokens remaining */
	remaining: number;

	/** Maximum tokens for this plan */
	limit: number;

	/** When the bucket will be full again */
	resetAt: Date;

	/** "redis" | "fallback" - which backend was used */
	reason: "redis" | "fallback";

	/** Seconds to wait before retrying (if not allowed) */
	retryAfter?: number;

	/** Any error that occurred */
	error?: Error;
}

export interface DistributedTokenManagerOptions {
	/** Redis client for distributed state */
	redisClient: RedisClient;

	/** Plan tier configurations */
	plans: Record<string, PlanConfig>;

	/** Prefix for Redis keys (default: "ratelimit:") */
	keyPrefix?: string;

	/** TTL for Redis keys in seconds (default: 3600) */
	ttlSeconds?: number;

	/** Fall back to in-memory if Redis unavailable (default: true) */
	fallbackToInMemory?: boolean;
}

/**
 * DistributedTokenManager handles rate limiting with Redis backend
 *
 * @example
 * ```typescript
 * const manager = new DistributedTokenManager({
 *   redisClient: redis,
 *   plans: {
 *     free: { capacity: 20, refillRate: 0.167 },
 *     pro: { capacity: 200, refillRate: 1.667 },
 *   },
 *   keyPrefix: "ratelimit:",
 *   ttlSeconds: 3600,
 *   fallbackToInMemory: true,
 * });
 *
 * const result = await manager.checkLimit("user1", "free");
 * if (!result.allowed) {
 *   console.log(`Rate limited. Retry in ${result.retryAfter} seconds`);
 * }
 * ```
 */
export class DistributedTokenManager {
	private redis: RedisClient;
	private plans: Record<string, PlanConfig>;
	private keyPrefix: string;
	private ttlSeconds: number;
	private fallbackToInMemory: boolean;
	private fallbackLimiter: RateLimiter | null = null;

	constructor(options: DistributedTokenManagerOptions) {
		if (!options.redisClient) {
			throw new Error("Redis client is required");
		}

		if (!options.plans || Object.keys(options.plans).length === 0) {
			throw new Error("At least one plan must be configured");
		}

		this.redis = options.redisClient;
		this.plans = options.plans;
		this.keyPrefix = options.keyPrefix || "ratelimit:";
		this.ttlSeconds = options.ttlSeconds || 3600;
		this.fallbackToInMemory = options.fallbackToInMemory !== false;

		// Initialize fallback limiter if enabled
		if (this.fallbackToInMemory) {
			this.fallbackLimiter = new RateLimiter(this.plans);
		}
	}

	/**
	 * Check rate limit using Redis with fallback to in-memory
	 *
	 * @param userId - User identifier
	 * @param planName - Plan name
	 * @returns Rate limit result with backend info
	 */
	async checkLimit(userId: string, planName: string): Promise<DistributedCheckLimitResult> {
		const plan = this.plans[planName];

		if (!plan) {
			throw new Error(`Unknown plan: ${planName}`);
		}

		try {
			return await this.checkLimitViaRedis(userId, planName, plan);
		} catch (error) {
			if (this.fallbackToInMemory) {
				return await this.checkLimitViaFallback(userId, planName);
			}

			throw error;
		}
	}

	/**
	 * Check limit using Redis backend
	 */
	private async checkLimitViaRedis(
		userId: string,
		planName: string,
		plan: PlanConfig,
	): Promise<DistributedCheckLimitResult> {
		const key = this.getRedisKey(userId, planName);

		// Get current bucket state from Redis
		const bucket = await this.getOrCreateBucket(key, plan);

		// Try to consume token
		const consumeResult = bucket.tryConsume(1);

		// Save updated state back to Redis
		try {
			await this.redis.set(key, JSON.stringify(bucket.getState()));
			await this.redis.expire(key, this.ttlSeconds);
		} catch (error) {
			// If we can't save, we might need to fall back
			if (this.fallbackToInMemory) {
				return await this.checkLimitViaFallback(userId, planName);
			}

			throw error;
		}

		if (consumeResult.allowed) {
			return {
				allowed: true,
				remaining: Math.floor(consumeResult.tokensRemaining),
				limit: plan.capacity,
				resetAt: consumeResult.resetAt,
				reason: "redis",
			};
		}

		// Calculate retry time
		const now = Date.now();
		const resetTime = consumeResult.resetAt.getTime();
		const retryAfter = Math.ceil((resetTime - now) / 1000);

		return {
			allowed: false,
			remaining: Math.floor(consumeResult.tokensRemaining),
			limit: plan.capacity,
			resetAt: consumeResult.resetAt,
			reason: "redis",
			retryAfter: Math.max(1, retryAfter),
		};
	}

	/**
	 * Check limit using in-memory fallback
	 */
	private async checkLimitViaFallback(userId: string, planName: string): Promise<DistributedCheckLimitResult> {
		if (!this.fallbackLimiter) {
			throw new Error("Fallback limiter not initialized");
		}

		const result = await this.fallbackLimiter.checkLimit(userId, planName);

		return {
			...result,
			reason: "fallback",
		};
	}

	/**
	 * Get or create bucket from Redis
	 */
	private async getOrCreateBucket(key: string, plan: PlanConfig): Promise<TokenBucket> {
		const bucketData = await this.redis.get(key);

		if (bucketData) {
			try {
				const state = JSON.parse(bucketData);

				// Create a new bucket and restore state
				const bucket = new TokenBucket(plan);
				// We need to restore the state - create a new bucket with the data
				Object.assign((bucket as any).state || {}, state);

				return bucket;
			} catch (_error) {
				// If parsing fails, create a new bucket
				return new TokenBucket(plan);
			}
		}

		// Create new bucket
		return new TokenBucket(plan);
	}

	/**
	 * Get Redis key for user + plan
	 */
	private getRedisKey(userId: string, planName: string): string {
		return `${this.keyPrefix}${userId}:${planName}`;
	}

	/**
	 * Cleanup expired buckets (optional maintenance operation)
	 */
	async cleanup(): Promise<void> {
		// This would require scanning Redis keys, which is not efficient
		// In production, Redis TTL handles cleanup automatically
	}
}
