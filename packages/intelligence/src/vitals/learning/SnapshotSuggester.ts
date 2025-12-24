/**
 * SnapshotSuggester - Phase 4 Feature
 * Provides proactive snapshot suggestions based on vitals trajectory analysis.
 */

import type { Trajectory, VitalsSnapshot } from "../../types/vitals.js";
import type { TrajectoryForecast } from "../../types/vitals-learning.js";

export interface SnapshotSuggestion {
	/** Recommendation score (0-100, higher = more urgent) */
	urgency: number;
	/** Reason for the suggestion */
	reason: string;
	/** Recommended action */
	recommendation: "now" | "soon" | "monitor";
	/** Supporting metrics */
	metrics: {
		pressureRate: number;
		aiActivityBurst: boolean;
		criticalFilesTouched: number;
		trajectoryConfidence: number;
	};
}

export class SnapshotSuggester {
	private snapshotHistory: Array<{ timestamp: number; trajectory: Trajectory }> = [];
	private readonly maxHistorySize = 50;

	/**
	 * Analyze current vitals and suggest snapshot
	 */
	suggestSnapshot(snapshot: VitalsSnapshot, forecast: TrajectoryForecast | null): SnapshotSuggestion {
		const metrics = this.buildMetrics(snapshot, forecast);
		const urgency = this.scoreUrgency(metrics);
		const { reason, recommendation } = this.buildRecommendation(urgency, metrics);

		this.recordSnapshot(snapshot);
		return { urgency, reason, recommendation, metrics };
	}

	/**
	 * Build metrics from vitals and forecast
	 */
	private buildMetrics(snapshot: VitalsSnapshot, forecast: TrajectoryForecast | null): SnapshotSuggestion["metrics"] {
		const lastSnapshot = this.snapshotHistory[this.snapshotHistory.length - 1];
		const timeDiffMinutes = lastSnapshot ? (snapshot.timestamp - lastSnapshot.timestamp) / 60000 : 0;

		return {
			pressureRate: timeDiffMinutes > 0 ? snapshot.pressure.value / timeDiffMinutes : 0,
			aiActivityBurst:
				snapshot.temperature.aiPercentage > 70 && (lastSnapshot?.trajectory ?? "stable") === "stable",
			criticalFilesTouched: snapshot.pressure.criticalFilesTouched.length,
			trajectoryConfidence: forecast?.confidence ?? this.calculateConsistency(),
		};
	}

	/**
	 * Calculate urgency score (0-100)
	 */
	private scoreUrgency(m: SnapshotSuggestion["metrics"]): number {
		return Math.min(
			Math.min(m.pressureRate * 5, 40) +
				(m.aiActivityBurst ? 20 : 0) +
				Math.min(m.criticalFilesTouched * 5, 25) +
				(1 - m.trajectoryConfidence) * 15,
			100,
		);
	}

	/**
	 * Build recommendation from urgency and metrics
	 */
	private buildRecommendation(
		urgency: number,
		m: SnapshotSuggestion["metrics"],
	): { reason: string; recommendation: "now" | "soon" | "monitor" } {
		const reasons = {
			now: [
				m.aiActivityBurst && "AI activity spike detected",
				m.criticalFilesTouched > 0 && "critical files modified",
				m.pressureRate > 10 && "rapid risk escalation",
			].filter(Boolean),
			soon: [
				m.pressureRate > 5 && "moderate pressure increase",
				m.trajectoryConfidence < 0.6 && "uncertain trajectory",
			].filter(Boolean),
		};

		if (urgency >= 75) {
			return {
				recommendation: "now",
				reason: `Create snapshot immediately: ${reasons.now.join(", ")}`,
			};
		}
		if (urgency >= 50) {
			return {
				recommendation: "soon",
				reason: `Create snapshot soon: ${reasons.soon.join(", ")}`,
			};
		}
		return {
			recommendation: "monitor",
			reason: "Current state is stable. Continue monitoring.",
		};
	}

	/**
	 * Calculate trajectory consistency from history
	 */
	private calculateConsistency(): number {
		if (this.snapshotHistory.length < 2) return 0.5;
		const recent = this.snapshotHistory.slice(-5);
		return recent.filter((s) => s.trajectory === "stable").length / recent.length;
	}

	/**
	 * Record snapshot in history
	 */
	private recordSnapshot(snapshot: VitalsSnapshot): void {
		this.snapshotHistory.push({
			timestamp: snapshot.timestamp,
			trajectory: snapshot.trajectory,
		});
		if (this.snapshotHistory.length > this.maxHistorySize) {
			this.snapshotHistory.shift();
		}
	}

	reset(): void {
		this.snapshotHistory = [];
	}
}
