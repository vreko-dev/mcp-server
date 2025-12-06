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
export declare function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T>;
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
export declare function calculateBackoff(attempt: number, baseMs: number, maxMs: number, jitter: boolean): number;
/**
 * Get recommended retry options for common scenarios
 */
export declare const RetryPresets: {
	/** Fast retries for network requests (max 5s delay) */
	readonly network: RetryOptions;
	/** Medium retries for API calls (max 30s delay) */
	readonly api: RetryOptions;
	/** Aggressive retries for critical operations (max 1min delay) */
	readonly critical: RetryOptions;
	/** Quick retries for fast operations (max 2s delay) */
	readonly fast: RetryOptions;
};
//# sourceMappingURL=retry.d.ts.map
