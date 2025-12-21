/**
 * TrajectoryPredictor - Forecasts trajectory changes
 *
 * Analyzes vitals history to predict future states and time to critical.
 * Uses simple linear regression on pressure/oxygen rates.
 *
 * @performance Budget: <10ms for predict()
 */

import type { Trajectory, VitalsSnapshot } from "../../types/vitals.js";
import type { PredictionContext, TrajectoryForecast } from "../../types/vitals-learning.js";

/** Clamp value to range */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Predicts trajectory changes based on vitals history.
 */
export class TrajectoryPredictor {
	private readonly workspaceId: string;
	private history: VitalsSnapshot[] = [];
	private readonly maxHistory = 100;

	constructor(workspaceId: string) {
		this.workspaceId = workspaceId;
	}

	/**
	 * Record vitals snapshots for prediction.
	 */
	recordSnapshots(snapshots: VitalsSnapshot[]): void {
		this.history.push(...snapshots);

		// Limit history size
		if (this.history.length > this.maxHistory) {
			this.history = this.history.slice(-this.maxHistory);
		}
	}

	/**
	 * Predict trajectory changes.
	 */
	predict(): TrajectoryForecast {
		if (this.history.length === 0) {
			return this.createDefaultForecast();
		}

		const context = this.calculateContext();
		const current = this.getCurrentTrajectory();
		const trend = this.calculateTrend(context);
		const confidence = this.calculateConfidence();

		// Predict future trajectories
		const in5Minutes = this.predictTrajectoryAt(context, 5);
		const in10Minutes = this.predictTrajectoryAt(context, 10);

		// Calculate time to state change
		const timeToStateChange = this.calculateTimeToStateChange(context, current);

		return {
			current,
			in5Minutes,
			in10Minutes,
			confidence,
			trend,
			timeToStateChange,
		};
	}

	/**
	 * Get prediction context.
	 */
	getContext(): PredictionContext {
		return this.calculateContext();
	}

	/**
	 * Reset history.
	 */
	reset(): void {
		this.history = [];
	}

	/**
	 * Create default forecast when no data.
	 */
	private createDefaultForecast(): TrajectoryForecast {
		return {
			current: "stable",
			in5Minutes: "stable",
			in10Minutes: "stable",
			confidence: 0,
			trend: "stable",
			timeToStateChange: null,
		};
	}

	/**
	 * Get current trajectory from most recent snapshot.
	 */
	private getCurrentTrajectory(): Trajectory {
		if (this.history.length === 0) return "stable";
		return this.history[this.history.length - 1].trajectory;
	}

	/**
	 * Calculate prediction context from history.
	 */
	private calculateContext(): PredictionContext {
		const recentHistory = this.history.slice(-10); // Last 10 snapshots

		if (recentHistory.length < 2) {
			return {
				recentHistory,
				pressureRate: 0,
				oxygenRate: 0,
				temperatureTrend: "stable",
				pulseTrend: "stable",
			};
		}

		// Calculate rates (per minute)
		const pressureRate = this.calculateRate(recentHistory, (s) => s.pressure.value);
		const oxygenRate = this.calculateRate(recentHistory, (s) => s.oxygen.value);

		// Calculate trends
		const temperatureTrend = this.calculateTemperatureTrend(recentHistory);
		const pulseTrend = this.calculatePulseTrend(recentHistory);

		return {
			recentHistory,
			pressureRate,
			oxygenRate,
			temperatureTrend,
			pulseTrend,
		};
	}

	/**
	 * Calculate rate of change per minute.
	 */
	private calculateRate(snapshots: VitalsSnapshot[], getValue: (s: VitalsSnapshot) => number): number {
		if (snapshots.length < 2) return 0;

		const first = snapshots[0];
		const last = snapshots[snapshots.length - 1];

		const valueDelta = getValue(last) - getValue(first);
		const timeDeltaMinutes = (last.timestamp - first.timestamp) / 60000;

		if (timeDeltaMinutes === 0) return 0;

		return valueDelta / timeDeltaMinutes;
	}

	/**
	 * Calculate temperature trend.
	 */
	private calculateTemperatureTrend(snapshots: VitalsSnapshot[]): "cooling" | "stable" | "heating" {
		if (snapshots.length < 2) return "stable";

		const first = snapshots[0].temperature.aiPercentage;
		const last = snapshots[snapshots.length - 1].temperature.aiPercentage;
		const delta = last - first;

		if (delta > 5) return "heating";
		if (delta < -5) return "cooling";
		return "stable";
	}

	/**
	 * Calculate pulse trend.
	 */
	private calculatePulseTrend(snapshots: VitalsSnapshot[]): "slowing" | "stable" | "accelerating" {
		if (snapshots.length < 2) return "stable";

		const first = snapshots[0].pulse.changesPerMinute;
		const last = snapshots[snapshots.length - 1].pulse.changesPerMinute;
		const delta = last - first;

		if (delta > 5) return "accelerating";
		if (delta < -5) return "slowing";
		return "stable";
	}

	/**
	 * Calculate overall trend from context.
	 */
	private calculateTrend(context: PredictionContext): "improving" | "stable" | "worsening" {
		// Calculate recent pressure rate (last 3 snapshots) for better plateau detection
		const recent = context.recentHistory.slice(-3);
		const recentRate = this.calculateRate(recent, (s) => s.pressure.value);

		// Check if pressure is stable (rate near zero)
		if (Math.abs(recentRate) < 1) {
			return "stable";
		}

		if (recentRate > 0) return "worsening";
		if (recentRate < 0) return "improving";

		return "stable";
	}

	/**
	 * Calculate confidence in predictions.
	 */
	private calculateConfidence(): number {
		const count = this.history.length;

		if (count === 0) return 0;
		if (count === 1) return 0.2;
		if (count < 3) return 0.4;
		if (count < 5) return 0.6;
		if (count < 10) return 0.75;

		return 0.9;
	}

	/**
	 * Predict trajectory at a future time (in minutes).
	 */
	private predictTrajectoryAt(context: PredictionContext, minutesAhead: number): Trajectory {
		if (this.history.length === 0) return "stable";

		const current = this.history[this.history.length - 1];
		const currentPressure = current.pressure.value;

		// Project pressure based on rate
		const projectedPressure = clamp(currentPressure + context.pressureRate * minutesAhead, 0, 100);

		// Convert to trajectory
		if (projectedPressure > 80) return "critical";
		if (projectedPressure > 60) return "escalating";
		return "stable";
	}

	/**
	 * Calculate time until trajectory state change.
	 * Returns null if stable or already critical.
	 */
	private calculateTimeToStateChange(context: PredictionContext, current: Trajectory): number | null {
		if (current === "critical") return null;
		if (context.pressureRate <= 0) return null; // Improving or stable

		const currentPressure = this.history.length > 0 ? this.history[this.history.length - 1].pressure.value : 0;

		// Calculate time to reach next threshold
		let targetPressure: number;

		if (current === "stable") {
			targetPressure = 60; // Threshold to escalating
		} else {
			targetPressure = 80; // Threshold to critical
		}

		if (currentPressure >= targetPressure) return null;

		const pressureDelta = targetPressure - currentPressure;
		const timeMinutes = pressureDelta / context.pressureRate;

		// Convert to milliseconds
		return Math.round(timeMinutes * 60000);
	}
}
