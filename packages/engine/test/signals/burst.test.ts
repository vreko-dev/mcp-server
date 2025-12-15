import { beforeEach, describe, expect, it, vi } from "vitest";
import { BurstDetector } from "../../src/signals/burst";

describe("BurstDetector", () => {
	let detector: BurstDetector;

	beforeEach(() => {
		detector = new BurstDetector();
	});

	describe("burst detection", () => {
		it("should detect rapid typing as burst", () => {
			const now = Date.now();
			// 50 chars in 50ms = 1 char/ms = 100 chars/100ms > 30 threshold
			const result = detector.processChange("test.ts", 50, now);

			expect(result).not.toBeNull();
			expect(result?.filePath).toBe("test.ts");
			expect(result?.charCount).toBe(50);
		});

		it("should not detect slow typing as burst", () => {
			const now = Date.now();
			// 50 chars in 500ms = 0.1 char/ms = 10 chars/100ms < 30 threshold
			detector.processChange("test.ts", 10, now);
			detector.processChange("test.ts", 10, now + 100);
			detector.processChange("test.ts", 10, now + 200);
			detector.processChange("test.ts", 10, now + 300);
			const result = detector.processChange("test.ts", 10, now + 400);

			expect(result).toBeNull();
		});

		it("should detect large paste as burst", () => {
			const now = Date.now();
			// 500 chars instant = huge burst
			const result = detector.processChange("test.ts", 500, now);

			expect(result).not.toBeNull();
			expect(result?.charCount).toBe(500);
		});

		it("should skip empty changes", () => {
			const result = detector.processChange("test.ts", 0);
			expect(result).toBeNull();
		});
	});

	describe("threshold configuration", () => {
		it("should use default threshold of 30 chars/100ms", () => {
			expect(detector.getThreshold()).toBe(30);
		});

		it("should allow custom threshold", () => {
			const customDetector = new BurstDetector({ threshold: 50 });
			expect(customDetector.getThreshold()).toBe(50);
		});

		it("should update threshold dynamically", () => {
			detector.updateThreshold(100);
			expect(detector.getThreshold()).toBe(100);

			// Now need higher velocity to trigger (threshold = 100 chars/100ms = 1 char/ms)
			// 5 chars instant = 5 chars/ms * 100 = 500 chars/100ms > 100 threshold (still triggers)
			// Need < 1 char/ms to not trigger, so < 100 chars instant
			const now = Date.now();
			detector.processChange("test.ts", 10, now);
			detector.processChange("test.ts", 10, now + 200);
			const result = detector.processChange("test.ts", 10, now + 400);
			// 30 chars over 400ms = 0.075 chars/ms * 100 = 7.5 chars/100ms < 100 threshold
			expect(result).toBeNull();
		});

		it("should throw on invalid threshold", () => {
			expect(() => detector.updateThreshold(-1)).toThrow();
			expect(() => detector.updateThreshold(0)).toThrow();
		});
	});

	describe("cooldown behavior", () => {
		it("should respect cooldown period", () => {
			const now = Date.now();

			// First burst
			const first = detector.processChange("test.ts", 50, now);
			expect(first).not.toBeNull();

			// Second burst within cooldown (500ms) should be ignored
			const second = detector.processChange("test.ts", 50, now + 100);
			expect(second).toBeNull();

			// Third burst after cooldown should trigger
			const third = detector.processChange("test.ts", 50, now + 600);
			expect(third).not.toBeNull();
		});

		it("should track cooldown per file", () => {
			const now = Date.now();

			// Burst on file1
			detector.processChange("file1.ts", 50, now);

			// Burst on file2 should still work (different file)
			const result = detector.processChange("file2.ts", 50, now + 100);
			expect(result).not.toBeNull();
		});

		it("should check cooldown status", () => {
			const now = Date.now();

			expect(detector.isInCooldown("test.ts")).toBe(false);

			detector.processChange("test.ts", 50, now);
			expect(detector.isInCooldown("test.ts")).toBe(true);

			// After cooldown
			vi.setSystemTime(now + 600);
			expect(detector.isInCooldown("test.ts")).toBe(false);
			vi.useRealTimers();
		});
	});

	describe("history cleanup", () => {
		it("should remove old events", () => {
			const now = Date.now();

			// Add events
			detector.processChange("test.ts", 10, now - 6000); // Old
			detector.processChange("test.ts", 10, now); // Recent

			detector.cleanup();

			// Only recent event should remain
			// We can verify by checking that velocity calculation uses only recent events
			const velocity = detector["calculateVelocity"]("test.ts", now);
			expect(velocity).toBeGreaterThan(0);
		});

		it("should clean up old cooldowns", () => {
			const now = Date.now();

			detector.processChange("test.ts", 50, now - 2000);
			expect(detector.isInCooldown("test.ts")).toBe(false);

			detector.cleanup();

			// Cooldown should be removed after cleanup
			const cooldowns = detector["cooldowns"];
			expect(cooldowns.has("test.ts")).toBe(false);
		});
	});

	describe("clear state", () => {
		it("should reset all state", () => {
			const now = Date.now();

			// Add some state
			detector.processChange("test.ts", 50, now);

			// Clear
			detector.clear();

			// State should be empty
			expect(detector["changeHistory"].size).toBe(0);
			expect(detector["cooldowns"].size).toBe(0);
		});
	});

	describe("velocity calculation", () => {
		it("should return char count for single instant change", () => {
			const now = Date.now();
			detector["recordChange"]("test.ts", now, 50);

			// Instant change: 50 chars / 1ms = 50 chars/ms
			const velocity = detector["calculateVelocity"]("test.ts", now);
			expect(velocity).toBe(50);
		});

		it("should calculate velocity correctly for multiple changes", () => {
			const now = Date.now();
			detector["recordChange"]("test.ts", now, 10);
			detector["recordChange"]("test.ts", now + 50, 10);
			detector["recordChange"]("test.ts", now + 100, 10);

			// 30 chars over 100ms = 0.3 chars/ms
			const velocity = detector["calculateVelocity"]("test.ts", now + 100);
			expect(velocity).toBeCloseTo(0.3, 1);
		});

		it("should only consider changes in window", () => {
			const now = Date.now();
			detector["recordChange"]("test.ts", now - 200, 100); // Outside window
			detector["recordChange"]("test.ts", now - 50, 10); // Inside window
			detector["recordChange"]("test.ts", now, 10); // Inside window

			// Only 20 chars in 50ms window
			const velocity = detector["calculateVelocity"]("test.ts", now);
			expect(velocity).toBeCloseTo(0.4, 1);
		});
	});
});
