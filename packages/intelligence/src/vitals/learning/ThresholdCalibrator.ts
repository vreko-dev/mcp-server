/**
 * ThresholdCalibrator - Per-workspace threshold calibration
 *
 * Adjusts vitals thresholds based on observed user behavior patterns.
 * Conservative users get stricter thresholds, aggressive users get relaxed thresholds.
 *
 * @lifecycle uncalibrated → learning → calibrated → locked
 * @performance Budget: <10ms for updateFromBehavior(), <5ms for getAdjustedThresholds()
 */

import type { CalibrationStatus, ThresholdAdjustments, WorkspaceProfile } from "../../types/vitals-learning.js";
import { CALIBRATION_THRESHOLDS, DEFAULT_THRESHOLD_ADJUSTMENTS } from "../../types/vitals-learning.js";
import type { UserBehaviorLearner } from "./UserBehaviorLearner.js";

/** Clamp value to range */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Calibrates per-workspace thresholds based on user behavior.
 */
export class ThresholdCalibrator {
	private readonly workspaceId: string;
	private readonly learner: UserBehaviorLearner;

	private profile: WorkspaceProfile;

	constructor(workspaceId: string, learner: UserBehaviorLearner) {
		this.workspaceId = workspaceId;
		this.learner = learner;

		// Initialize with uncalibrated profile
		this.profile = this.createInitialProfile();
	}

	/**
	 * Create initial uncalibrated profile.
	 */
	private createInitialProfile(): WorkspaceProfile {
		return {
			workspaceId: this.workspaceId,
			status: "uncalibrated",
			observationCount: 0,
			thresholdAdjustments: { ...DEFAULT_THRESHOLD_ADJUSTMENTS },
			riskTolerance: 0.5, // Neutral
			typicalPulseLevel: 0,
			snapshotFrequency: 0,
			lastCalibratedAt: 0,
			confidence: 0,
		};
	}

	/**
	 * Update calibration from behavior learner's observations.
	 */
	updateFromBehavior(): void {
		const stats = this.learner.getStats();
		const observations = this.learner.getObservations();

		this.profile.observationCount = stats.totalObservations;

		// Update status based on observation count
		this.profile.status = this.calculateStatus(stats.totalObservations);

		// Calculate risk tolerance (0 = conservative, 1 = aggressive)
		this.profile.riskTolerance = this.calculateRiskTolerance(stats);

		// Calculate confidence
		this.profile.confidence = this.calculateConfidence(stats);

		// Calculate typical pulse level
		this.profile.typicalPulseLevel = this.calculateTypicalPulseLevel(observations);

		// Update threshold adjustments if we have enough data
		if (this.profile.status !== "uncalibrated") {
			this.profile.thresholdAdjustments = this.calculateAdjustments(stats);
			this.profile.lastCalibratedAt = Date.now();
		}
	}

	/**
	 * Calculate calibration status from observation count.
	 */
	private calculateStatus(count: number): CalibrationStatus {
		if (count >= CALIBRATION_THRESHOLDS.OBSERVATIONS_TO_LOCK) {
			return "locked";
		}
		if (count >= CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION) {
			return "calibrated";
		}
		if (count >= CALIBRATION_THRESHOLDS.MIN_OBSERVATIONS_TO_START) {
			return "learning";
		}
		return "uncalibrated";
	}

	/**
	 * Calculate risk tolerance from behavior stats.
	 * 0 = conservative (early snapshots), 0.5 = balanced, 1 = aggressive (missed/late)
	 */
	private calculateRiskTolerance(stats: {
		totalObservations: number;
		earlySnapshots: number;
		lateSnapshots: number;
		missedRecommendations: number;
	}): number {
		if (stats.totalObservations === 0) return 0.5;

		// Early → conservative (0), Late/Missed → aggressive (1)
		const earlyRatio = stats.earlySnapshots / stats.totalObservations;
		const aggressiveRatio = (stats.lateSnapshots + stats.missedRecommendations) / stats.totalObservations;

		// Scale: 0 (all early) → 0.5 (balanced) → 1 (all missed/late)
		if (earlyRatio > aggressiveRatio) {
			// Conservative bias
			return 0.5 - earlyRatio * 0.5;
		}
		if (aggressiveRatio > earlyRatio) {
			// Aggressive bias
			return 0.5 + aggressiveRatio * 0.5;
		}
		return 0.5; // Balanced
	}

	/**
	 * Calculate confidence in calibration.
	 */
	private calculateConfidence(stats: {
		totalObservations: number;
		earlySnapshots: number;
		alignedSnapshots: number;
		lateSnapshots: number;
		missedRecommendations: number;
		riskProfile: string;
	}): number {
		if (stats.totalObservations === 0) return 0;

		const count = stats.totalObservations;

		// Base confidence from observation count
		const countConfidence = Math.min(count / CALIBRATION_THRESHOLDS.OBSERVATIONS_FOR_CALIBRATION, 1.0);

		// Consistency confidence - how dominant is the primary behavior?
		const behaviors = [
			stats.earlySnapshots,
			stats.alignedSnapshots,
			stats.lateSnapshots,
			stats.missedRecommendations,
		];
		const maxBehavior = Math.max(...behaviors);
		const consistency = count > 0 ? maxBehavior / count : 0;

		// Entropy penalty: penalize when multiple behaviors are present
		// A truly consistent user should have >60% in one category
		const entropyPenalty = consistency < 0.6 ? 0.15 : 0;

		// Combined confidence (weight count more initially, consistency more later)
		const confidence = countConfidence * 0.6 + consistency * 0.4 - entropyPenalty;

		return clamp(confidence, 0, 1);
	}

	/**
	 * Calculate typical pulse level from observations.
	 */
	private calculateTypicalPulseLevel(
		observations: Array<{ vitals: { pulse: { changesPerMinute: number } } }>,
	): number {
		if (observations.length === 0) return 0;

		const total = observations.reduce((sum, obs) => sum + obs.vitals.pulse.changesPerMinute, 0);
		return total / observations.length;
	}

	/**
	 * Calculate threshold adjustments based on risk profile.
	 */
	private calculateAdjustments(stats: { riskProfile: string }): ThresholdAdjustments {
		// Base multiplier from risk profile
		let baseMultiplier: number;

		switch (stats.riskProfile) {
			case "conservative":
				// Lower thresholds = more sensitive/protective
				baseMultiplier = 0.7;
				break;
			case "aggressive":
				// Higher thresholds = less nagging
				baseMultiplier = 1.3;
				break;
			default:
				baseMultiplier = 1.0;
		}

		// Clamp to safe range
		const clampedMultiplier = clamp(baseMultiplier, 0.5, 2.0);

		return {
			pulseMultiplier: clampedMultiplier,
			temperatureMultiplier: clampedMultiplier,
			pressureMultiplier: clampedMultiplier,
			oxygenMultiplier: clampedMultiplier,
		};
	}

	/**
	 * Get the current workspace profile.
	 */
	getProfile(): WorkspaceProfile {
		return { ...this.profile };
	}

	/**
	 * Get adjusted thresholds for use in vitals calculations.
	 * Returns defaults if uncalibrated.
	 */
	getAdjustedThresholds(): ThresholdAdjustments {
		if (this.profile.status === "uncalibrated") {
			return { ...DEFAULT_THRESHOLD_ADJUSTMENTS };
		}
		return { ...this.profile.thresholdAdjustments };
	}

	/**
	 * Reset calibration to initial state.
	 */
	reset(): void {
		this.profile = this.createInitialProfile();
		this.learner.reset();
	}
}
