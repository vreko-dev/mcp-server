/**
 * Multi-User Rate Limiter with Plan-Based Tiers
 *
 * Manages separate token buckets per user per plan tier:
 * - Free: 20 tokens (~10/min)
 * - Pro: 200 tokens (~100/min)
 * - Team: 1000 tokens (~500/min)
 * - Enterprise: 5000 tokens (~2000/min)
 *
 * Follows SnapBack patterns:
 * - Result<T, E> error handling pattern
 * - Plan-based configuration from THRESHOLDS
 * - Validation on construction
 *
 * @module token/RateLimiter
 */

import { isConsumptionAllowed, TokenBucket } from "./TokenBucket.js";

export interface PlanConfig {
	/** Maximum tokens capacity for this plan */
	capacity: number;

	/** Tokens added per second for this plan */
	refillRate: number;
}

/**
 * Discriminated union for rate limit check results
 * Enforces exhaustive pattern matching on outcomes
 */
export type RateLimitResult =
	| {
			allowed: true;
			remaining: number;
			limit: number;
			resetAt: Date;
	  }
	| {
			allowed: false;
			remaining: number;
			limit: number;
			resetAt: Date;
			retryAfter: number;
	  };

/**
 * Type guard for allowed rate limit results
 */
export function isRateLimitAllowed(
	result: RateLimitResult,
): result is { allowed: true; remaining: number; limit: number; resetAt: Date } {
	return result.allowed === true;
}

/**
 * Type guard for denied rate limit results
 */
export function isRateLimitDenied(result: RateLimitResult): result is {
	allowed: false;
	remaining: number;
	limit: number;
	resetAt: Date;
	retryAfter: number;
} {
	return result.allowed === false;
}

/**
 * RateLimiter manages multiple token buckets (one per user per plan)
 *
 * @example
 * ```typescript
 * const plans = {
 *   free: { capacity: 20, refillRate: 0.167 },
 *   pro: { capacity: 200, refillRate: 1.667 },
 * };
 *
 * const limiter = new RateLimiter(plans);
 *
 * // Check rate limit for user1 on free plan
 * const result = await limiter.checkLimit("user1", "free");
 *
 * if (!result.allowed) {
 *   console.log(`Too many requests. Retry in ${result.retryAfter} seconds`);
 * }
 * ```
 */
export class RateLimiter {
	private plans: Record<string, PlanConfig>;
	private buckets: Map<string, TokenBucket> = new Map();

	constructor(plans: Record<string, PlanConfig>) {
		// Validate plans
		if (!plans || Object.keys(plans).length === 0) {
			throw new Error("At least one plan must be configured");
		}

		for (const [planName, config] of Object.entries(plans)) {
			if (config.capacity <= 0) {
				throw new Error(`Plan "${planName}" has invalid capacity: ${config.capacity}`);
			}

			if (config.refillRate <= 0) {
				throw new Error(`Plan "${planName}" has invalid refill rate: ${config.refillRate}`);
			}
		}

		this.plans = plans;
	}

	/**
	 * Check rate limit for a user and plan tier
	 *
	 * @param userId - Unique user identifier
	 * @param planName - Plan tier name (e.g., "free", "pro")
	 * @returns Rate limit result (discriminated union)
	 *
	 * @throws If plan doesn't exist
	 *
	 * @example
	 * ```typescript
	 * const result = await limiter.checkLimit('user1', 'free');
	 *
	 * if (isRateLimitAllowed(result)) {
	 *   // TypeScript knows result.remaining exists
	 *   console.log(`${result.remaining} requests remaining`);
	 * } else {
	 *   // TypeScript knows result.retryAfter exists
	 *   console.log(`Retry in ${result.retryAfter} seconds`);
	 * }
	 * ```
	 */
	async checkLimit(userId: string, planName: string): Promise<RateLimitResult> {
		const plan = this.plans[planName];

		if (!plan) {
			throw new Error(`Unknown plan: ${planName}`);
		}

		// Get or create bucket for this user+plan combination
		const bucketKey = `${userId}:${planName}`;
		let bucket = this.buckets.get(bucketKey);

		if (!bucket) {
			bucket = new TokenBucket(plan);
			this.buckets.set(bucketKey, bucket);
		}

		// Try to consume one token
		const consumeResult = bucket.tryConsume(1);

		if (isConsumptionAllowed(consumeResult)) {
			return {
				allowed: true as const,
				remaining: Math.floor(consumeResult.tokensRemaining),
				limit: plan.capacity,
				resetAt: consumeResult.resetAt,
			};
		}

		// Calculate retry time
		const now = Date.now();
		const resetTime = consumeResult.resetAt.getTime();
		const retryAfter = Math.ceil((resetTime - now) / 1000);

		return {
			allowed: false as const,
			remaining: Math.floor(consumeResult.tokensRemaining),
			limit: plan.capacity,
			resetAt: consumeResult.resetAt,
			retryAfter: Math.max(1, retryAfter),
		};
	}

	/**
	 * Get current state of a user's bucket for a plan
	 *
	 * @param userId - User identifier
	 * @param planName - Plan name
	 * @returns Current bucket state or undefined if not created yet
	 */
	getBucketState(userId: string, planName: string): Readonly<any> | undefined {
		const bucketKey = `${userId}:${planName}`;
		const bucket = this.buckets.get(bucketKey);
		return bucket?.getState();
	}

	/**
	 * Reset a user's bucket for a plan
	 *
	 * @param userId - User identifier
	 * @param planName - Plan name
	 */
	resetBucket(userId: string, planName: string): void {
		const bucketKey = `${userId}:${planName}`;
		const bucket = this.buckets.get(bucketKey);

		if (bucket) {
			bucket.reset();
		}
	}

	/**
	 * Clear all buckets (use cautiously)
	 */
	clearAll(): void {
		this.buckets.clear();
	}

	/**
	 * Get total number of active buckets
	 */
	getActiveBucketCount(): number {
		return this.buckets.size;
	}
}
