/**
 * Token Bucket Implementation
 *
 * Implements the token bucket algorithm for rate limiting:
 * - Fixed capacity: max tokens the bucket can hold
 * - Refill rate: tokens added per second
 * - Consumption: tokens removed when requests are made
 *
 * Follows SnapBack patterns:
 * - Discriminated unions for consumption results
 * - Type guards for safe state access
 * - Validation on construction
 *
 * @module token/TokenBucket
 */

export interface TokenBucketState {
	/** Current number of tokens available */
	tokens: number;

	/** Maximum tokens the bucket can hold */
	capacity: number;

	/** Tokens added per second */
	refillRate: number;

	/** Timestamp of last refill (milliseconds) */
	lastRefill: number;
}

/**
 * Discriminated union for token consumption results
 * Allows exhaustive pattern matching on consumption outcomes
 */
export type ConsumptionResult =
	| { allowed: true; tokensRemaining: number; resetAt: Date }
	| { allowed: false; tokensRemaining: number; resetAt: Date };

export interface ConsumptionInfo {
	/** Number of tokens consumed */
	consumed: number;

	/** Number of tokens remaining */
	remaining: number;

	/** Percentage of capacity used (0-100) */
	percentageUsed: number;
}

export interface TokenBucketConfig {
	/** Maximum tokens the bucket can hold */
	capacity: number;

	/** Tokens added per second */
	refillRate: number;
}

/**
 * Type guard for checking if consumption was allowed
 */
export function isConsumptionAllowed(
	result: ConsumptionResult,
): result is { allowed: true; tokensRemaining: number; resetAt: Date } {
	return result.allowed === true;
}

/**
 * Type guard for checking if consumption was denied
 */
export function isConsumptionDenied(
	result: ConsumptionResult,
): result is { allowed: false; tokensRemaining: number; resetAt: Date } {
	return result.allowed === false;
}

/**
 * TokenBucket class implements the token bucket algorithm
 *
 * @example
 * ```typescript
 * const bucket = createTokenBucket({ capacity: 100, refillRate: 1 });
 *
 * // Try to consume 10 tokens
 * const result = bucket.tryConsume(10);
 * if (result.allowed) {
 *   console.log(`Request allowed. ${result.tokensRemaining} tokens left.`);
 * } else {
 *   console.log(`Rate limited. Retry at ${result.resetAt}`);
 * }
 * ```
 */
export class TokenBucket {
	private state: TokenBucketState;

	constructor(config: TokenBucketConfig) {
		if (config.capacity <= 0) {
			throw new Error("Capacity must be greater than 0");
		}

		if (config.refillRate <= 0) {
			throw new Error("Refill rate must be greater than 0");
		}

		this.state = {
			tokens: config.capacity,
			capacity: config.capacity,
			refillRate: config.refillRate,
			lastRefill: Date.now(),
		};
	}

	/**
	 * Attempt to consume tokens from the bucket
	 *
	 * @param amount - Number of tokens to consume
	 * @returns Result indicating if consumption was allowed
	 *
	 * @throws If amount is not positive
	 */
	tryConsume(amount: number): ConsumptionResult {
		if (amount <= 0) {
			throw new Error("Token amount must be greater than 0");
		}

		this.refill();

		if (this.state.tokens >= amount) {
			this.state.tokens -= amount;

			return {
				allowed: true,
				tokensRemaining: this.state.tokens,
				resetAt: this.calculateResetTime(),
			};
		}

		return {
			allowed: false,
			tokensRemaining: this.state.tokens,
			resetAt: this.calculateResetTime(),
		};
	}

	/**
	 * Refill tokens based on time elapsed since last refill
	 */
	refill(): void {
		const now = Date.now();
		const timePassed = (now - this.state.lastRefill) / 1000; // Convert to seconds
		const tokensToAdd = timePassed * this.state.refillRate;

		this.state.tokens = Math.min(this.state.capacity, this.state.tokens + tokensToAdd);
		this.state.lastRefill = now;
	}

	/**
	 * Get the current state of the bucket
	 */
	getState(): Readonly<TokenBucketState> {
		this.refill();
		return { ...this.state };
	}

	/**
	 * Reset bucket to full capacity
	 */
	reset(): void {
		this.state.tokens = this.state.capacity;
		this.state.lastRefill = Date.now();
	}

	/**
	 * Get consumption information
	 */
	getConsumptionInfo(): ConsumptionInfo {
		this.refill();

		const consumed = this.state.capacity - this.state.tokens;
		const percentageUsed = (consumed / this.state.capacity) * 100;

		return {
			consumed,
			remaining: this.state.tokens,
			percentageUsed,
		};
	}

	/**
	 * Calculate when the bucket will be full again
	 */
	private calculateResetTime(): Date {
		const tokensNeeded = this.state.capacity - this.state.tokens;
		const secondsToReset = tokensNeeded / this.state.refillRate;
		return new Date(Date.now() + secondsToReset * 1000);
	}
}

/**
 * Factory function to create a new TokenBucket
 *
 * @param config - Bucket configuration
 * @returns New TokenBucket instance
 *
 * @example
 * ```typescript
 * // Free tier: 100 tokens, refill at 1 token/second
 * const freeBucket = createTokenBucket({ capacity: 100, refillRate: 1 });
 *
 * // Pro tier: 1000 tokens, refill at 10 tokens/second
 * const proBucket = createTokenBucket({ capacity: 1000, refillRate: 10 });
 * ```
 */
export function createTokenBucket(config: TokenBucketConfig): TokenBucket {
	return new TokenBucket(config);
}
