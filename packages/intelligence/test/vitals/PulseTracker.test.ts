/**
 * PulseTracker Tests
 *
 * 4-path coverage per ROUTER.md C-004:
 * - Happy path: Normal pulse tracking
 * - Sad path: Edge cases with empty/minimal data
 * - Edge case: Boundary conditions at thresholds
 * - Error case: Invalid configurations
 */

import { describe, expect, it } from "vitest";
import { PulseTracker } from "../../src/vitals/PulseTracker.js";

describe("PulseTracker", () => {
	describe("initialization", () => {
		it("should use default config when none provided", () => {
			const tracker = new PulseTracker();
			const state = tracker.getLevel();

			expect(state.level).toBe("resting");
			expect(state.changesPerMinute).toBe(0);
		});

		it("should allow partial config override", () => {
			const tracker = new PulseTracker({ elevated: 10 });
			// Verify it still works
			const state = tracker.getLevel();
			expect(state.level).toBe("resting");
		});
	});

	describe("pulse level classification", () => {
		const now = Date.now();
		// const windowMs = DEFAULT_PULSE_CONFIG.windowSeconds * 1000; // TODO: Use for windowing logic

		it("should classify as resting at <15 changes/min", () => {
			const tracker = new PulseTracker();
			// 14 changes in 60s = 14 changes/min
			for (let i = 0; i < 14; i++) {
				tracker.recordChange(now - i * 1000);
			}

			const state = tracker.getLevel(now);
			expect(state.level).toBe("resting");
			expect(state.changesPerMinute).toBe(14);
		});

		it("should classify as elevated at 15-29 changes/min", () => {
			const tracker = new PulseTracker();
			// 20 changes in 60s = 20 changes/min
			for (let i = 0; i < 20; i++) {
				tracker.recordChange(now - i * 1000);
			}

			const state = tracker.getLevel(now);
			expect(state.level).toBe("elevated");
			expect(state.changesPerMinute).toBe(20);
		});

		it("should classify as racing at 30-49 changes/min", () => {
			const tracker = new PulseTracker();
			// 35 changes in 60s = 35 changes/min
			for (let i = 0; i < 35; i++) {
				tracker.recordChange(now - i * 1000);
			}

			const state = tracker.getLevel(now);
			expect(state.level).toBe("racing");
			expect(state.changesPerMinute).toBe(35);
		});

		it("should classify as critical at >=50 changes/min", () => {
			const tracker = new PulseTracker();
			// 55 changes in 60s = 55 changes/min
			for (let i = 0; i < 55; i++) {
				tracker.recordChange(now - i * 1000);
			}

			const state = tracker.getLevel(now);
			expect(state.level).toBe("critical");
			expect(state.changesPerMinute).toBe(55);
		});
	});

	describe("sliding window pruning", () => {
		it("should prune events older than window", () => {
			const tracker = new PulseTracker({ windowSeconds: 60 });
			const now = Date.now();

			// Add old event (61 seconds ago)
			tracker.recordChange(now - 61000);
			// Add recent event (30 seconds ago)
			tracker.recordChange(now - 30000);

			const count = tracker.getChangeCount(now);
			expect(count).toBe(1); // Only the recent one
		});

		it("should keep events exactly at window boundary", () => {
			const tracker = new PulseTracker({ windowSeconds: 60 });
			const now = Date.now();

			// Add event exactly at boundary (60 seconds ago - should be excluded)
			tracker.recordChange(now - 60000);
			// Add event just inside boundary (59 seconds ago)
			tracker.recordChange(now - 59000);

			const count = tracker.getChangeCount(now);
			expect(count).toBe(1); // Boundary is exclusive
		});
	});

	describe("edge cases", () => {
		it("should handle zero changes gracefully", () => {
			const tracker = new PulseTracker();
			const state = tracker.getLevel();

			expect(state.level).toBe("resting");
			expect(state.changesPerMinute).toBe(0);
		});

		it("should handle exact threshold boundaries", () => {
			const tracker = new PulseTracker({ elevated: 15, racing: 30, critical: 50, windowSeconds: 60 });
			const now = Date.now();

			// Exactly 15 changes = elevated (at threshold)
			for (let i = 0; i < 15; i++) {
				tracker.recordChange(now - i * 1000);
			}

			const state = tracker.getLevel(now);
			expect(state.level).toBe("elevated");
		});

		it("should handle custom short window", () => {
			const tracker = new PulseTracker({ windowSeconds: 10 });
			const now = Date.now();

			// 5 changes in 10s = 30 changes/min
			for (let i = 0; i < 5; i++) {
				tracker.recordChange(now - i * 1000);
			}

			const state = tracker.getLevel(now);
			expect(state.changesPerMinute).toBe(30);
			expect(state.level).toBe("racing");
		});

		it("should handle reset correctly", () => {
			const tracker = new PulseTracker();
			tracker.recordChange();
			tracker.recordChange();
			tracker.recordChange();

			expect(tracker.getChangeCount()).toBe(3);

			tracker.reset();

			expect(tracker.getChangeCount()).toBe(0);
			expect(tracker.getLevel().level).toBe("resting");
		});
	});

	describe("error handling", () => {
		it("should handle zero window gracefully", () => {
			const tracker = new PulseTracker({ windowSeconds: 0 });
			tracker.recordChange();

			const state = tracker.getLevel();
			expect(state.changesPerMinute).toBe(0);
			expect(state.level).toBe("resting");
		});

		it("should handle negative timestamps gracefully", () => {
			const tracker = new PulseTracker();
			const now = Date.now();

			// Very old timestamp (negative relative to now)
			tracker.recordChange(now - 1000000);
			tracker.recordChange(now - 100);

			const count = tracker.getChangeCount(now);
			expect(count).toBe(1); // Only the recent one
		});
	});

	describe("performance characteristics", () => {
		it("should handle large number of changes efficiently", () => {
			const tracker = new PulseTracker({ windowSeconds: 60 });
			const now = Date.now();

			// Simulate burst of 1000 changes
			const start = performance.now();
			for (let i = 0; i < 1000; i++) {
				tracker.recordChange(now - (i % 60) * 1000);
			}
			const recordTime = performance.now() - start;

			// Get level should complete quickly
			const getStart = performance.now();
			tracker.getLevel(now);
			const getTime = performance.now() - getStart;

			// Both operations should be fast (<10ms is generous)
			expect(recordTime).toBeLessThan(50);
			expect(getTime).toBeLessThan(10);
		});
	});
});
