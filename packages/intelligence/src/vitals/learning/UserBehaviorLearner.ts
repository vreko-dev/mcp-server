/**
 * UserBehaviorLearner - Tracks user snapshot patterns
 *
 * Records observations of when users create snapshots relative to vitals recommendations.
 * Infers user's risk tolerance profile and provides statistics for threshold calibration.
 *
 * @performance Budget: <5ms for recordObservation(), <10ms for getStats()
 */

import type { Urgency, VitalsSnapshot } from "../../types/vitals.js";
import type { BehaviorStats, RiskProfile, SnapshotObservation, SnapshotTiming } from "../../types/vitals-learning.js";

/** Input for recording an observation */
export interface ObservationInput {
	vitals: VitalsSnapshot;
	userCreatedSnapshot: boolean;
	vitalsRecommended: boolean;
}

/** Generate unique ID */
function generateId(): string {
	return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Learns from user snapshot behavior to calibrate thresholds.
 */
export class UserBehaviorLearner {
	private readonly workspaceId: string;
	private observations: SnapshotObservation[] = [];
	private readonly maxHistory = 100;

	constructor(workspaceId: string) {
		this.workspaceId = workspaceId;
	}

	/**
	 * Record an observation of user behavior.
	 */
	recordObservation(input: ObservationInput): SnapshotObservation {
		const timing = this.classifyTiming(input);
		const urgency = this.calculateUrgency(input.vitals);

		const observation: SnapshotObservation = {
			id: generateId(),
			workspaceId: this.workspaceId,
			timestamp: Date.now(),
			vitals: input.vitals,
			userCreatedSnapshot: input.userCreatedSnapshot,
			vitalsRecommended: input.vitalsRecommended,
			urgencyAtTime: urgency,
			timing,
		};

		this.observations.push(observation);

		// Bound history
		if (this.observations.length > this.maxHistory) {
			this.observations.shift();
		}

		return observation;
	}

	/**
	 * Classify the timing of the observation.
	 */
	private classifyTiming(input: ObservationInput): SnapshotTiming {
		if (!input.userCreatedSnapshot && input.vitalsRecommended) {
			return "missed";
		}

		if (input.userCreatedSnapshot && !input.vitalsRecommended) {
			return "early";
		}

		if (input.userCreatedSnapshot && input.vitalsRecommended) {
			// Check if user was late (critical trajectory or very high pressure)
			if (input.vitals.trajectory === "critical" || input.vitals.pressure.value > 80) {
				return "late";
			}
			return "aligned";
		}

		// No snapshot, no recommendation = not tracked as significant
		return "aligned";
	}

	/**
	 * Calculate urgency from vitals.
	 */
	private calculateUrgency(vitals: VitalsSnapshot): Urgency {
		if (vitals.trajectory === "critical") return "critical";
		if (vitals.pressure.value > 80) return "high";
		if (vitals.pressure.value > 60 || vitals.trajectory === "escalating") return "medium";
		if (vitals.pressure.value > 40) return "low";
		return "none";
	}

	/**
	 * Get behavior statistics.
	 */
	getStats(): BehaviorStats {
		const total = this.observations.length;

		if (total === 0) {
			return {
				totalObservations: 0,
				alignedSnapshots: 0,
				earlySnapshots: 0,
				lateSnapshots: 0,
				missedRecommendations: 0,
				riskProfile: "balanced",
				avgPressureAtSnapshot: 0,
				avgOxygenAtSnapshot: 0,
			};
		}

		const aligned = this.observations.filter((o) => o.timing === "aligned" && o.userCreatedSnapshot).length;
		const early = this.observations.filter((o) => o.timing === "early").length;
		const late = this.observations.filter((o) => o.timing === "late").length;
		const missed = this.observations.filter((o) => o.timing === "missed").length;

		// Calculate averages for snapshots only
		const snapshotObs = this.observations.filter((o) => o.userCreatedSnapshot);
		const avgPressure =
			snapshotObs.length > 0
				? snapshotObs.reduce((sum, o) => sum + o.vitals.pressure.value, 0) / snapshotObs.length
				: 0;
		const avgOxygen =
			snapshotObs.length > 0
				? snapshotObs.reduce((sum, o) => sum + o.vitals.oxygen.value, 0) / snapshotObs.length
				: 0;

		// Infer risk profile
		const riskProfile = this.inferRiskProfile(early, aligned, late, missed, total);

		return {
			totalObservations: total,
			alignedSnapshots: aligned,
			earlySnapshots: early,
			lateSnapshots: late,
			missedRecommendations: missed,
			riskProfile,
			avgPressureAtSnapshot: Math.round(avgPressure),
			avgOxygenAtSnapshot: Math.round(avgOxygen),
		};
	}

	/**
	 * Infer risk profile from observation patterns.
	 */
	private inferRiskProfile(
		early: number,
		_aligned: number,
		late: number,
		missed: number,
		total: number,
	): RiskProfile {
		if (total < 3) return "balanced"; // Not enough data

		const earlyRatio = early / total;
		const missedRatio = missed / total;
		const lateRatio = late / total;

		// Conservative: Early snapshots dominate (>50%)
		if (earlyRatio > 0.5) return "conservative";

		// Aggressive: Missed + late dominate (>50%)
		if (missedRatio + lateRatio > 0.5) return "aggressive";

		// Balanced: Mixed behavior
		return "balanced";
	}

	/**
	 * Get all observations.
	 */
	getObservations(): SnapshotObservation[] {
		return [...this.observations];
	}

	/**
	 * Reset all observations.
	 */
	reset(): void {
		this.observations = [];
	}
}
