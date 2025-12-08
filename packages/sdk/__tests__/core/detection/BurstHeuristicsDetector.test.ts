/**
 * @fileoverview Tests for BurstHeuristicsDetector
 *
 * TDD Phase: RED → Tests written first, expecting implementation to follow
 *
 * Test Coverage:
 * 1. Configuration & Thresholds (5 tests)
 * 2. Detection Algorithm (6 tests)
 * 3. Temporal Patterns (5 tests)
 * 4. Clear Functionality (2 tests)
 * 5. Result Structure (3 tests)
 *
 * Total: 21 comprehensive tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BurstHeuristicsDetector } from "@snapback-sdk/core/detection/BurstHeuristicsDetector";
import { expectNormalizedScore } from "../../helpers/assertions";

describe("BurstHeuristicsDetector", () => {
	let detector: BurstHeuristicsDetector;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		detector = new BurstHeuristicsDetector();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ============================================================================
	// 1. Configuration & Thresholds (5 tests)
	// ============================================================================

	describe("Configuration", () => {
		it("should use default config when none provided", () => {
			const detector = new BurstHeuristicsDetector();
			// Verify default thresholds by testing boundary conditions
			detector.recordChange(99, 0, 3); // Just below minCharsInserted (100)
			vi.advanceTimersByTime(50);
			detector.recordChange(1, 0, 1);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true); // Should detect at exactly 100 chars
		});

		it("should accept custom timeWindow", () => {
			const customDetector = new BurstHeuristicsDetector({ timeWindow: 10000 });
			customDetector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(100); // Fast enough for timing threshold
			customDetector.recordChange(60, 0, 3);

			const result = customDetector.analyzeBurst();
			expect(result.isBurst).toBe(true);

			// Now test that changes within 10s window are maintained
			vi.advanceTimersByTime(8000); // Total 8.1s elapsed
			customDetector.recordChange(50, 0, 2);

			const result2 = customDetector.analyzeBurst();
			// All 3 changes still in window (custom 10s), but timing threshold fails
			expect(result2.isBurst).toBe(false); // Avg interval too large
		});

		it("should accept custom minCharsInserted threshold", () => {
			const customDetector = new BurstHeuristicsDetector({ minCharsInserted: 200 });
			customDetector.recordChange(150, 0, 5);
			vi.advanceTimersByTime(50);
			customDetector.recordChange(40, 0, 3);

			const result = customDetector.analyzeBurst();
			expect(result.isBurst).toBe(false); // 190 < 200 threshold
		});

		it("should accept custom maxKeystrokeInterval", () => {
			const customDetector = new BurstHeuristicsDetector({ maxKeystrokeInterval: 500 });
			customDetector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(400); // Within custom 500ms threshold
			customDetector.recordChange(60, 0, 3);

			const result = customDetector.analyzeBurst();
			expect(result.isBurst).toBe(true);
		});

		it("should accept custom minInsertDeleteRatio", () => {
			const customDetector = new BurstHeuristicsDetector({ minInsertDeleteRatio: 10 });
			customDetector.recordChange(100, 15, 3); // Ratio: 6.67
			vi.advanceTimersByTime(50);
			customDetector.recordChange(100, 15, 3);

			const result = customDetector.analyzeBurst();
			expect(result.isBurst).toBe(false); // 6.67 < 10 ratio threshold
		});
	});

	// ============================================================================
	// 2. Detection Algorithm (6 tests)
	// ============================================================================

	describe("Burst Detection Algorithm", () => {
		it("should detect burst with rapid large insertions", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(60, 0, 3);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
			expectNormalizedScore(result.confidence);
			expect(result.confidence).toBeGreaterThan(0.5);
		});

		it("should not detect burst with insufficient characters", () => {
			detector.recordChange(30, 0, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(30, 0, 3); // Total: 60 < 100 threshold

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
			expect(result.confidence).toBe(0);
		});

		it("should not detect burst with insufficient lines", () => {
			detector.recordChange(60, 0, 1);
			vi.advanceTimersByTime(50);
			detector.recordChange(60, 0, 1); // Total: 2 lines < 3 threshold

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
		});

		it("should not detect burst with low insert/delete ratio", () => {
			detector.recordChange(100, 40, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(100, 40, 3); // Ratio: 2.5 < 3 threshold

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
		});

		it("should not detect burst with slow timing", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(300); // > 200ms threshold
			detector.recordChange(60, 0, 3);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
		});

		it("should require at least 2 changes to detect burst", () => {
			detector.recordChange(150, 0, 5);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
			expect(result.confidence).toBe(0);
		});
	});

	// ============================================================================
	// 3. Temporal Patterns (5 tests)
	// ============================================================================

	describe("Temporal Analysis", () => {
		it("should trim changes outside time window", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(6000); // Beyond 5s window
			detector.recordChange(60, 0, 3);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false); // Only 1 change in window
		});

		it("should maintain multiple changes within time window", () => {
			detector.recordChange(40, 0, 2);
			vi.advanceTimersByTime(100);
			detector.recordChange(40, 0, 2);
			vi.advanceTimersByTime(100);
			detector.recordChange(40, 0, 2); // 3 changes, total 120 chars, 6 lines

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
			if (result.details) {
				expect(result.details.changeCount).toBe(3);
			}
		});

		it("should calculate correct duration for burst", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(150);
			detector.recordChange(60, 0, 3);

			const result = detector.analyzeBurst();
			expect(result.details?.duration).toBe(150);
		});

		it("should handle rapid successive changes", () => {
			for (let i = 0; i < 5; i++) {
				detector.recordChange(25, 0, 1);
				vi.advanceTimersByTime(30); // Very rapid
			}

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
			expect(result.details?.changeCount).toBe(5);
		});

		it("should reset detection after time window expires", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(60, 0, 3);

			let result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);

			// Wait beyond window
			vi.advanceTimersByTime(6000);

			result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
		});
	});

	// ============================================================================
	// 4. Clear Functionality (2 tests)
	// ============================================================================

	describe("Clear Functionality", () => {
		it("should clear all recorded changes", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(60, 0, 3);

			detector.clear();

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
			expect(result.confidence).toBe(0);
		});

		it("should allow new burst detection after clear", () => {
			detector.recordChange(60, 0, 3);
			detector.clear();

			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(60, 0, 3);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
		});
	});

	// ============================================================================
	// 5. Result Structure (3 tests)
	// ============================================================================

	describe("Result Structure", () => {
		it("should return correct details for detected burst", () => {
			detector.recordChange(70, 10, 4);
			vi.advanceTimersByTime(100);
			detector.recordChange(50, 5, 3);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
			expect(result.details).toBeDefined();

			if (result.details) {
				expect(result.details.totalInserted).toBe(120);
				expect(result.details.totalDeleted).toBe(15);
				expect(result.details.ratio).toBeCloseTo(8.0, 1);
				expect(result.details.changeCount).toBe(2);
				expect(result.details.duration).toBe(100);
			}
		});

		it("should not include details when burst not detected", () => {
			detector.recordChange(30, 0, 1);
			vi.advanceTimersByTime(50);
			detector.recordChange(30, 0, 1);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(false);
			expect(result.details).toBeUndefined();
		});

		it("should calculate confidence based on threshold exceedance", () => {
			// Exceed all thresholds significantly
			detector.recordChange(150, 0, 6); // 3x char threshold, 2x line threshold
			vi.advanceTimersByTime(50); // Well under timing threshold
			detector.recordChange(150, 0, 6);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
			expectNormalizedScore(result.confidence);
			expect(result.confidence).toBeGreaterThan(0.7); // High confidence
		});
	});

	// ============================================================================
	// Edge Cases & Boundary Conditions
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle zero deletions correctly", () => {
			detector.recordChange(60, 0, 3);
			vi.advanceTimersByTime(50);
			detector.recordChange(60, 0, 3);

			const result = detector.analyzeBurst();
			expect(result.isBurst).toBe(true);
			if (result.details) {
				expect(result.details.ratio).toBe(120); // totalInserted when no deletions
			}
		});

		it("should handle exact threshold values", () => {
			// Exactly at thresholds: 100 chars, 3 lines, 3:1 ratio, 200ms interval
			detector.recordChange(75, 25, 2); // Ratio: 3:1 (75/25)
			vi.advanceTimersByTime(200); // Exactly at timing threshold
			detector.recordChange(25, 0, 1); // Total: 100 chars, 3 lines

			const result = detector.analyzeBurst();
			// With only one 200ms interval, avgInterval = 200ms, which meets threshold (<=200)
			expect(result.isBurst).toBe(true); // All thresholds met exactly
		});

		it("should handle multiple changes with mixed patterns", () => {
			detector.recordChange(40, 0, 2);
			vi.advanceTimersByTime(50);
			detector.recordChange(30, 10, 1); // Mixed pattern
			vi.advanceTimersByTime(50);
			detector.recordChange(50, 5, 2);

			const result = detector.analyzeBurst();
			if (result.isBurst) {
				expect(result.details?.totalInserted).toBe(120);
				expect(result.details?.totalDeleted).toBe(15);
			}
		});
	});
});
