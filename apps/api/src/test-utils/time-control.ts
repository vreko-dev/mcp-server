/**
 * Time Control Utilities for Testing
 * Allows E2E tests to manipulate server-side time for testing time-sensitive features
 *
 * SECURITY: These endpoints are ONLY available when NODE_ENV=test
 */

let timeOffset = 0;

/**
 * Get current time with test offset applied
 * Use this instead of Date.now() in auth/session code during tests
 */
export function getTestableTime(): number {
	return Date.now() + timeOffset;
}

/**
 * Fast-forward time by specified milliseconds
 * Only works in test environment
 */
export function fastForward(ms: number): void {
	if (process.env.NODE_ENV !== "test") {
		throw new Error("Time control is only available in test environment");
	}
	timeOffset += ms;
}

/**
 * Reset time offset to 0
 * Call this between tests to ensure clean state
 */
export function resetTime(): void {
	if (process.env.NODE_ENV !== "test") {
		throw new Error("Time control is only available in test environment");
	}
	timeOffset = 0;
}

/**
 * Get current time offset for debugging
 */
export function getTimeOffset(): number {
	return timeOffset;
}

/**
 * Helper to check if we're in test mode
 */
export function isTestEnvironment(): boolean {
	return process.env.NODE_ENV === "test";
}
