/**
 * Retry utility with exponential backoff
 *
 * Provides a unified implementation for retry logic across the codebase.
 * Consolidates 6+ separate retry implementations into a single, well-tested utility.
 *
 * @module retry
 */

export interface RetryOptions {
	/** Maximum number of retry attempts */
	maxAttempts: number;
	/** Base delay in milliseconds between retries */
	baseDelayMs: number;
	/** Maximum delay cap in milliseconds (default: 30000) */
	maxDelayMs?: number;
	/** Add random jitter to prevent thundering herd (default: false) */
	jitter?: boolean;
	/** Callback invoked before each retry attempt */
	onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute an async operation with retry logic and exponential backoff
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws Last error if all retry attempts fail
 *
 * @example
 * ```typescript
 * // Basic usage with 3 retries
 * const result = await withRetry(
 *   async () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
 * );
 *
 * // With jitter and retry callback
 * const result = await withRetry(
 *   async () => processData(),
 *   {
 *     maxAttempts: 5,
 *     baseDelayMs: 100,
 *     jitter: true,
 *     onRetry: (attempt, error) => {
 *       logger.warn(`Retry attempt ${attempt} after error`, { error });
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: RetryOptions,
): Promise<T> {
	const { maxAttempts, baseDelayMs, maxDelayMs = 30000, jitter = false, onRetry } = options;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			// Re-throw on last attempt
			if (attempt === maxAttempts) {
				throw error;
			}

			// Calculate backoff delay
			const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs, jitter);

			// Invoke callback if provided
			if (onRetry) {
				onRetry(attempt, error instanceof Error ? error : new Error(String(error)));
			}

			// Wait before next retry
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// TypeScript exhaustiveness check
	throw new Error("Retry failed - should never reach");
}

/**
 * Calculate exponential backoff delay with optional jitter
 *
 * Formula: min(baseMs * 2^(attempt - 1), maxMs) [+ jitter]
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseMs - Base delay in milliseconds
 * @param maxMs - Maximum delay cap
 * @param jitter - Whether to add random jitter (0-100% of calculated delay)
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * // Attempt 1: 1000ms
 * // Attempt 2: 2000ms
 * // Attempt 3: 4000ms
 * const delay = calculateBackoff(3, 1000, 30000, false); // 4000
 * ```
 */
export function calculateBackoff(
	attempt: number,
	baseMs: number,
	maxMs: number,
	jitter: boolean,
): number {
	// Exponential backoff: baseMs * 2^(attempt - 1)
	const exponential = baseMs * Math.pow(2, attempt - 1);

	// Cap at maximum delay
	const capped = Math.min(exponential, maxMs);

	// Add jitter if enabled (random 0-100% of delay)
	if (jitter) {
		const jitterAmount = Math.random() * capped;
		return capped + jitterAmount;
	}

	return capped;
}

/**
 * Get recommended retry options for common scenarios
 */
export const RetryPresets = {
	/** Fast retries for network requests (max 5s delay) */
	network: {
		maxAttempts: 3,
		baseDelayMs: 1000,
		maxDelayMs: 5000,
		jitter: true,
	} as RetryOptions,

	/** Medium retries for API calls (max 30s delay) */
	api: {
		maxAttempts: 5,
		baseDelayMs: 2000,
		maxDelayMs: 30000,
		jitter: true,
	} as RetryOptions,

	/** Aggressive retries for critical operations (max 1min delay) */
	critical: {
		maxAttempts: 10,
		baseDelayMs: 1000,
		maxDelayMs: 60000,
		jitter: true,
	} as RetryOptions,

	/** Quick retries for fast operations (max 2s delay) */
	fast: {
		maxAttempts: 3,
		baseDelayMs: 100,
		maxDelayMs: 2000,
		jitter: false,
	} as RetryOptions,
} as const;
