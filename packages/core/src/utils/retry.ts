/**
 * Retry utility with exponential backoff
 *
 * Replaces async-retry with a simpler, in-house implementation.
 * Matches the interface used in concurrency.ts and mcp-client.ts.
 */

export interface RetryOptions {
	/** Number of retry attempts (not including initial attempt) */
	retries: number;
	/** Exponential backoff factor (default: 2) */
	factor?: number;
	/** Minimum timeout in ms between retries */
	minTimeout: number;
	/** Maximum timeout in ms between retries */
	maxTimeout: number;
	/** Add random jitter to prevent thundering herd */
	randomize?: boolean;
	/** Callback invoked before each retry attempt */
	onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Calculate exponential backoff delay with optional jitter
 */
function calculateBackoff(
	attempt: number,
	factor: number,
	minTimeout: number,
	maxTimeout: number,
	randomize: boolean,
): number {
	// Exponential backoff: minTimeout * factor^(attempt - 1)
	const exponential = minTimeout * factor ** (attempt - 1);

	// Cap at maximum delay
	const capped = Math.min(exponential, maxTimeout);

	// Add jitter if enabled (random 0-100% of delay)
	if (randomize) {
		const jitterAmount = Math.random() * capped;
		return Math.floor(capped + jitterAmount);
	}

	return Math.floor(capped);
}

/**
 * Execute an async operation with retry logic and exponential backoff
 *
 * Drop-in replacement for async-retry with compatible options.
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws Last error if all retry attempts fail
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
	const { retries, factor = 2, minTimeout, maxTimeout, randomize = false, onRetry } = options;

	let lastError: Error | undefined;

	// Total attempts = 1 (initial) + retries
	for (let attempt = 1; attempt <= retries + 1; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// If this was the last attempt, throw
			if (attempt > retries) {
				throw lastError;
			}

			// Calculate backoff delay
			const delay = calculateBackoff(attempt, factor, minTimeout, maxTimeout, randomize);

			// Invoke callback if provided
			if (onRetry) {
				onRetry(lastError, attempt);
			}

			// Wait before next retry
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// TypeScript exhaustiveness check - should never reach here
	throw lastError ?? new Error("Retry failed - should never reach");
}
