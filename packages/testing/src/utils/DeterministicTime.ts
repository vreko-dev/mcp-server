/**
 * DeterministicTime - Control Async Timing with Fake Timers
 *
 * Provides deterministic control over time-dependent code in tests,
 * eliminating flaky tests caused by setTimeout, setInterval, Date.now(), etc.
 *
 * Uses Vitest's fake timers to control the passage of time.
 * Following 2025 best practices for preventing flaky tests.
 *
 * @example
 * ```typescript
 * import { DeterministicTime } from "@snapback/testing/utils/DeterministicTime";
 * import { vi } from "vitest";
 *
 * it("should reset rate limit after window expires", async () => {
 *   const time = new DeterministicTime();
 *
 *   // Use up limit
 *   await rateLimiter.checkLimit("user_123", 2, 60000);
 *   await rateLimiter.checkLimit("user_123", 2, 60000);
 *
 *   // Should be blocked
 *   let result = await rateLimiter.checkLimit("user_123", 2, 60000);
 *   expect(result.allowed).toBe(false);
 *
 *   // Advance time deterministically (no actual waiting!)
 *   time.advanceBy(60000);
 *
 *   // Should be allowed again
 *   result = await rateLimiter.checkLimit("user_123", 2, 60000);
 *   expect(result.allowed).toBe(true);
 *
 *   time.restore();
 * });
 * ```
 */
export class DeterministicTime {
	private isActive = false;

	/**
	 * Create a new DeterministicTime instance and activate fake timers
	 *
	 * @param now - Optional starting timestamp (defaults to current time)
	 *
	 * @example
	 * ```typescript
	 * const time = new DeterministicTime();
	 * // OR
	 * const time = new DeterministicTime(Date.parse("2025-01-01"));
	 * ```
	 */
	constructor(now?: number) {
		// Dynamically import vi to avoid issues when used outside Vitest
		const { vi } = require("vitest");

		if (now !== undefined) {
			vi.setSystemTime(now);
		}
		vi.useFakeTimers();
		this.isActive = true;
	}

	/**
	 * Advance time by specified milliseconds
	 *
	 * Triggers all timers that should fire during this period.
	 * This is instant - no actual waiting occurs.
	 *
	 * @param ms - Milliseconds to advance
	 *
	 * @example
	 * ```typescript
	 * // Advance 1 second
	 * time.advanceBy(1000);
	 *
	 * // Advance 5 minutes
	 * time.advanceBy(5 * 60 * 1000);
	 * ```
	 */
	advanceBy(ms: number): void {
		this.ensureActive();
		const { vi } = require("vitest");
		vi.advanceTimersByTime(ms);
	}

	/**
	 * Set the current system time to a specific timestamp
	 *
	 * @param timestamp - Unix timestamp in milliseconds
	 *
	 * @example
	 * ```typescript
	 * // Set to specific date
	 * time.advanceTo(Date.parse("2025-12-31"));
	 *
	 * // Set to specific time
	 * const futureTime = Date.now() + (24 * 60 * 60 * 1000); // Tomorrow
	 * time.advanceTo(futureTime);
	 * ```
	 */
	advanceTo(timestamp: number): void {
		this.ensureActive();
		const { vi } = require("vitest");
		vi.setSystemTime(timestamp);
	}

	/**
	 * Run all pending timers immediately
	 *
	 * Useful when you want to fast-forward through all scheduled work
	 * without caring about exact time advancement.
	 *
	 * @example
	 * ```typescript
	 * // Schedule multiple delayed operations
	 * setTimeout(() => doWork(), 1000);
	 * setTimeout(() => doMoreWork(), 5000);
	 *
	 * // Run them all immediately
	 * time.runAllTimers();
	 * ```
	 */
	runAllTimers(): void {
		this.ensureActive();
		const { vi } = require("vitest");
		vi.runAllTimers();
	}

	/**
	 * Run only the next pending timer
	 *
	 * Useful for step-by-step debugging of timer-based code.
	 *
	 * @example
	 * ```typescript
	 * setTimeout(() => step1(), 100);
	 * setTimeout(() => step2(), 200);
	 *
	 * time.runNextTimer(); // Runs step1
	 * time.runNextTimer(); // Runs step2
	 * ```
	 */
	runNextTimer(): void {
		this.ensureActive();
		const { vi } = require("vitest");
		vi.runOnlyPendingTimers();
	}

	/**
	 * Get the current fake time timestamp
	 *
	 * @returns Current time in milliseconds (Unix timestamp)
	 *
	 * @example
	 * ```typescript
	 * const time = new DeterministicTime(Date.parse("2025-01-01"));
	 * console.log(time.now()); // 1735689600000
	 * ```
	 */
	now(): number {
		const { vi } = require("vitest");
		return vi.getMockedSystemTime()?.getTime() ?? Date.now();
	}

	/**
	 * Restore real timers
	 *
	 * IMPORTANT: Always call this in cleanup (afterEach) to avoid
	 * affecting other tests.
	 *
	 * @example
	 * ```typescript
	 * afterEach(() => {
	 *   time.restore();
	 * });
	 *
	 * // OR use TestCleanupManager
	 * beforeEach(() => {
	 *   time = new DeterministicTime();
	 *   cleanup.register(() => time.restore());
	 * });
	 * ```
	 */
	restore(): void {
		if (this.isActive) {
			const { vi } = require("vitest");
			vi.useRealTimers();
			this.isActive = false;
		}
	}

	/**
	 * Clear all pending timers without running them
	 *
	 * Useful for resetting state between test cases.
	 *
	 * @example
	 * ```typescript
	 * time.clearAllTimers();
	 * ```
	 */
	clearAllTimers(): void {
		this.ensureActive();
		const { vi } = require("vitest");
		vi.clearAllTimers();
	}

	/**
	 * Check if fake timers are currently active
	 *
	 * @returns True if fake timers are active
	 *
	 * @example
	 * ```typescript
	 * if (time.isActive) {
	 *   time.restore();
	 * }
	 * ```
	 */
	get active(): boolean {
		return this.isActive;
	}

	private ensureActive(): void {
		if (!this.isActive) {
			throw new Error("DeterministicTime has been restored. Create a new instance to use fake timers again.");
		}
	}
}

/**
 * Helper to create a timestamp from a date string
 *
 * @param dateString - ISO date string or parseable date
 * @returns Unix timestamp in milliseconds
 *
 * @example
 * ```typescript
 * const time = new DeterministicTime(toTimestamp("2025-01-01"));
 * ```
 */
export function toTimestamp(dateString: string): number {
	return Date.parse(dateString);
}

/**
 * Helper to add time to a timestamp
 *
 * @param timestamp - Base timestamp
 * @param duration - Duration object
 * @returns New timestamp
 *
 * @example
 * ```typescript
 * const tomorrow = addTime(Date.now(), { days: 1 });
 * const nextWeek = addTime(Date.now(), { weeks: 1 });
 * const inFiveMinutes = addTime(Date.now(), { minutes: 5 });
 * ```
 */
export function addTime(
	timestamp: number,
	duration: {
		ms?: number;
		seconds?: number;
		minutes?: number;
		hours?: number;
		days?: number;
		weeks?: number;
	},
): number {
	const ms =
		(duration.ms ?? 0) +
		(duration.seconds ?? 0) * 1000 +
		(duration.minutes ?? 0) * 60 * 1000 +
		(duration.hours ?? 0) * 60 * 60 * 1000 +
		(duration.days ?? 0) * 24 * 60 * 60 * 1000 +
		(duration.weeks ?? 0) * 7 * 24 * 60 * 60 * 1000;

	return timestamp + ms;
}
