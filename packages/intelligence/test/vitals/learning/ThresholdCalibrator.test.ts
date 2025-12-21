/**
 * ThresholdCalibrator - TDD Tests
 *
 * Tests for per-workspace threshold calibration based on user behavior.
 * Follows C-004: 4-path coverage (happy, sad, edge, error)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VitalsSnapshot } from "../../../src/types/vitals.js";
import { CALIBRATION_THRESHOLDS, DEFAULT_THRESHOLD_ADJUSTMENTS } from "../../../src/types/vitals-learning.js";
import { ThresholdCalibrator } from "../../../src/vitals/learning/ThresholdCalibrator.js";
import { UserBehaviorLearner } from "../../../src/vitals/learning/UserBehaviorLearner.js";

// Helper to create mock vitals
function createMockVitals(overrides: Partial<VitalsSnapshot> = {}): VitalsSnapshot {
	return {
		timestamp: Date.now(),
		pulse: { level: "resting", changesPerMinute: 10 },
		temperature: { level: "cold", aiPercentage: 10 },
		pressure: { value: 30, unsnapshotedChanges: 5, timeSinceLastSnapshot: 10, criticalFilesTouched: [] },
		oxygen: { value: 80, coveragePercentage: 80, staleSnapshots: 0 },
		trajectory: "stable",
		...overrides,
	};
}

describe("ThresholdCalibrator", () => {
	let calibrator: ThresholdCalibrator;
	let learner: UserBehaviorLearner;

	beforeEach(() => {
		learner = new UserBehaviorLearner("test-workspace");
		calibrator = new ThresholdCalibrator("test-workspace", learner);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// HAPPY PATH: Normal calibration flow
	// =========================================================================
	describe("happy path - calibration lifecycle", () => {
		it("should start with uncalibrated status", () => {
			const profile = calibrator.getProfile();

			expect(profile.status).toBe("uncalibrated");
			expect(profile.observationCount).toBe(0);
			expect(profile.confidence).toBe(0);
		});

		it("should transition to learning status after minimum observations", () => {
			// Record minimum observations to start learning
			for (let i = 0; i < CALIBRATION_THRESHOLDS.MIN_OBSERVATIONS_TO_START; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 50,
							unsnapshotedChanges: 10,
							timeSinceLastSnapshot: 15,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: true,
				});
			}

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			expect(profile.status).toBe("learning");
			expect(profile.observationCount).toBe(CALIBRATION_THRESHOLDS.MIN_OBSERVATIONS_TO_START);
		});

		it("should transition to calibrated status after enough observations", () => {
			// Record enough observations for calibration
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 50,
							unsnapshotedChanges: 10,
							timeSinceLastSnapshot: 15,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: true,
				});
			}

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			expect(profile.status).toBe("calibrated");
			expect(profile.confidence).toBeGreaterThan(0);
		});

		it("should return adjusted thresholds based on risk profile", () => {
			// Conservative user (early snapshots) should have lower thresholds
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 20,
							unsnapshotedChanges: 3,
							timeSinceLastSnapshot: 5,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: false, // Early snapshot
				});
			}

			calibrator.updateFromBehavior();
			const adjustments = calibrator.getAdjustedThresholds();

			// Conservative users get lower multipliers (more protective)
			expect(adjustments.pressureMultiplier).toBeLessThan(1.0);
		});
	});

	// =========================================================================
	// SAD PATH: Insufficient data
	// =========================================================================
	describe("sad path - insufficient data", () => {
		it("should return default thresholds when uncalibrated", () => {
			const adjustments = calibrator.getAdjustedThresholds();

			expect(adjustments).toEqual(DEFAULT_THRESHOLD_ADJUSTMENTS);
		});

		it("should not transition to calibrated with too few observations", () => {
			// Only 2 observations (less than minimum)
			learner.recordObservation({
				vitals: createMockVitals(),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});
			learner.recordObservation({
				vitals: createMockVitals(),
				userCreatedSnapshot: true,
				vitalsRecommended: true,
			});

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			expect(profile.status).toBe("uncalibrated");
		});

		it("should maintain low confidence when behavior is inconsistent", () => {
			// Mix of all timings - no clear pattern
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				const timing = i % 4;
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 20 + timing * 20,
							unsnapshotedChanges: 5,
							timeSinceLastSnapshot: 10,
							criticalFilesTouched: [],
						},
						trajectory: timing === 3 ? "critical" : "stable",
					}),
					userCreatedSnapshot: timing !== 3, // Sometimes missed
					vitalsRecommended: timing >= 2,
				});
			}

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			// Inconsistent behavior = lower confidence
			expect(profile.confidence).toBeLessThan(0.8);
		});
	});

	// =========================================================================
	// EDGE CASE: Boundary conditions
	// =========================================================================
	describe("edge case - boundary conditions", () => {
		it("should lock calibration after threshold observations", () => {
			// Record enough for locking
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_TO_LOCK; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 50,
							unsnapshotedChanges: 10,
							timeSinceLastSnapshot: 15,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: true,
				});
			}

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			expect(profile.status).toBe("locked");
			expect(profile.confidence).toBeGreaterThanOrEqual(CALIBRATION_THRESHOLDS.CONFIDENCE_THRESHOLD);
		});

		it("should adjust pressure thresholds for aggressive users", () => {
			// Aggressive user (ignores recommendations)
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 75,
							unsnapshotedChanges: 20,
							timeSinceLastSnapshot: 40,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: false,
					vitalsRecommended: true, // Missed recommendation
				});
			}

			calibrator.updateFromBehavior();
			const adjustments = calibrator.getAdjustedThresholds();

			// Aggressive users get higher multipliers (less nagging)
			expect(adjustments.pressureMultiplier).toBeGreaterThan(1.0);
		});

		it("should calculate risk tolerance score correctly", () => {
			// Balanced user
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 55,
							unsnapshotedChanges: 10,
							timeSinceLastSnapshot: 15,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: true,
				});
			}

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			// Balanced = 0.5 risk tolerance
			expect(profile.riskTolerance).toBeGreaterThanOrEqual(0.4);
			expect(profile.riskTolerance).toBeLessThanOrEqual(0.6);
		});

		it("should track typical pulse level from observations", () => {
			// Record observations with specific pulse levels
			for (let i = 0; i < 10; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pulse: { level: "elevated", changesPerMinute: 25 },
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: false,
				});
			}

			calibrator.updateFromBehavior();
			const profile = calibrator.getProfile();

			// Typical pulse should reflect observations
			expect(profile.typicalPulseLevel).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// ERROR CASE: Edge cases and reset
	// =========================================================================
	describe("error case - reset and recovery", () => {
		it("should reset profile to uncalibrated state", () => {
			// Build up some calibration
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				learner.recordObservation({
					vitals: createMockVitals(),
					userCreatedSnapshot: true,
					vitalsRecommended: true,
				});
			}
			calibrator.updateFromBehavior();

			// Reset
			calibrator.reset();
			const profile = calibrator.getProfile();

			expect(profile.status).toBe("uncalibrated");
			expect(profile.observationCount).toBe(0);
		});

		it("should handle empty behavior stats gracefully", () => {
			// No observations recorded
			calibrator.updateFromBehavior();
			const adjustments = calibrator.getAdjustedThresholds();

			expect(adjustments).toEqual(DEFAULT_THRESHOLD_ADJUSTMENTS);
		});

		it("should clamp adjustment multipliers to safe range", () => {
			// Extreme conservative behavior
			for (let i = 0; i < CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION; i++) {
				learner.recordObservation({
					vitals: createMockVitals({
						pressure: {
							value: 5,
							unsnapshotedChanges: 1,
							timeSinceLastSnapshot: 1,
							criticalFilesTouched: [],
						},
					}),
					userCreatedSnapshot: true,
					vitalsRecommended: false,
				});
			}

			calibrator.updateFromBehavior();
			const adjustments = calibrator.getAdjustedThresholds();

			// Should be clamped to reasonable range (0.5 - 2.0)
			expect(adjustments.pressureMultiplier).toBeGreaterThanOrEqual(0.5);
			expect(adjustments.pressureMultiplier).toBeLessThanOrEqual(2.0);
		});
	});
});
