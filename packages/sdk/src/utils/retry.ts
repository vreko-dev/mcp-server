/**
 * Retry utilities for robust operations
 */

export interface RetryOptions {
	maxRetries?: number;
	baseDelay?: number;
	maxDelay?: number;
	jitter?: boolean;
	onRetry?: (attempt: number, error: unknown) => void;
}

export const RetryPresets = {
	FAST: { maxRetries: 3, baseDelay: 100, maxDelay: 1000 },
	MEDIUM: { maxRetries: 5, baseDelay: 500, maxDelay: 5000 },
	EXPONENTIAL: { maxRetries: 5, baseDelay: 100, maxDelay: 10000, jitter: true },
	network: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000, jitter: true },
};

/**
 * Calculate backoff delay
 */
export function calculateBackoff(attempt: number, base = 100, max = 5000, jitter = true): number {
	const delay = Math.min(base * 2 ** attempt, max);
	if (!jitter) {
		return delay;
	}
	// Add jitter (0-20%)
	return delay * (1 + Math.random() * 0.2);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = RetryPresets.MEDIUM): Promise<T> {
	const { maxRetries = 3, baseDelay = 100, maxDelay = 5000, onRetry } = options;
	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt === maxRetries) {
				break;
			}

			if (onRetry) {
				onRetry(attempt + 1, error);
			}

			const delay = calculateBackoff(attempt, baseDelay, maxDelay);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
