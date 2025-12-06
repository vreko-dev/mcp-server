/**
 * Token System - Rate Limiting and Token Bucket Management
 *
 * This module provides comprehensive rate limiting capabilities:
 *
 * 1. **TokenBucket**: Single-bucket token bucket algorithm
 *    - Fixed capacity with refillable tokens
 *    - Consumption tracking and state management
 *    - Refill calculations based on elapsed time
 *
 * 2. **RateLimiter**: Multi-user, plan-based rate limiter
 *    - Separate buckets per user per plan tier
 *    - Free, Pro, Team, Enterprise plans
 *    - In-memory state management
 *
 * 3. **DistributedTokenManager**: Redis-backed distributed rate limiter
 *    - Redis persistence across instances
 *    - Automatic fallback to in-memory when Redis unavailable
 *    - TTL-based cleanup
 *
 * @module token
 *
 * @example
 * ```typescript
 * // Basic rate limiting with RateLimiter
 * import { RateLimiter } from '@snapback/sdk/token';
 *
 * const limiter = new RateLimiter({
 *   free: { capacity: 20, refillRate: 0.167 },
 *   pro: { capacity: 200, refillRate: 1.667 },
 * });
 *
 * const result = await limiter.checkLimit('user1', 'free');
 * if (!result.allowed) {
 *   return res.status(429).json({
 *     error: 'Rate limit exceeded',
 *     retryAfter: result.retryAfter,
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Distributed rate limiting with Redis
 * import { DistributedTokenManager } from '@snapback/sdk/token';
 * import { createRedisClient } from '@snapback/infrastructure';
 *
 * const redis = await createRedisClient();
 *
 * const manager = new DistributedTokenManager({
 *   redisClient: redis,
 *   plans: {
 *     free: { capacity: 20, refillRate: 0.167 },
 *     pro: { capacity: 200, refillRate: 1.667 },
 *   },
 *   fallbackToInMemory: true,
 * });
 *
 * const result = await manager.checkLimit('user1', 'free');
 * ```
 */

export {
	type DistributedCheckLimitResult,
	DistributedTokenManager,
	type DistributedTokenManagerOptions,
	type RedisClient,
} from "./DistributedTokenManager";

export {
	isRateLimitAllowed,
	isRateLimitDenied,
	type PlanConfig,
	RateLimiter,
	type RateLimitResult,
} from "./RateLimiter";
export {
	type ConsumptionInfo,
	type ConsumptionResult,
	createTokenBucket,
	isConsumptionAllowed,
	isConsumptionDenied,
	TokenBucket,
	type TokenBucketConfig,
	type TokenBucketState,
} from "./TokenBucket";
