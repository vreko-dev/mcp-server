/**
 * Clock interface for dependency injection
 * Allows mocking time in tests for deterministic behavior
 */

export interface Clock {
	/**
	 * Get the current date/time
	 */
	now(): Date;
}

/**
 * System clock implementation that uses actual system time
 */
export class SystemClock implements Clock {
	now(): Date {
		return new Date();
	}
}
