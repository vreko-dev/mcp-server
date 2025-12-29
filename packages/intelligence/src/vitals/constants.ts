/**
 * @snapback/intelligence/vitals/constants
 *
 * Centralized threshold constants for vitals system.
 * Single source of truth - ALL consumers MUST import from here.
 *
 * UX Principles (from industry best practices):
 * - Visual hierarchy: critical > high > moderate > low
 * - Consistency: same thresholds across UI, MCP, CLI
 * - Frictionless: clear actionable boundaries
 *
 * @module vitals/constants
 */

// =============================================================================
// PRESSURE THRESHOLDS (0-100 scale)
// =============================================================================

/**
 * Pressure thresholds for snapshot recommendations.
 *
 * @example
 * ```typescript
 * import { PRESSURE_THRESHOLDS } from '@snapback/intelligence/vitals';
 *
 * if (pressure > PRESSURE_THRESHOLDS.critical) {
 *   // Immediate snapshot required
 * } else if (pressure > PRESSURE_THRESHOLDS.high) {
 *   // Snapshot strongly recommended
 * }
 * ```
 */
export const PRESSURE_THRESHOLDS = {
	/** Low pressure - no action needed */
	low: 25,
	/** Moderate pressure - consider snapshotting soon */
	moderate: 50,
	/** High pressure - snapshot recommended */
	high: 75,
	/** Critical pressure - immediate snapshot required */
	critical: 80,
} as const;

export type PressureThresholdLevel = keyof typeof PRESSURE_THRESHOLDS;

// =============================================================================
// OXYGEN THRESHOLDS (0-100% coverage)
// =============================================================================

/**
 * Oxygen (snapshot coverage) thresholds.
 * Higher is better - 100% means all modified files have recent snapshots.
 */
export const OXYGEN_THRESHOLDS = {
	/** Critical - very low coverage, high risk */
	critical: 30,
	/** Low - needs attention */
	low: 50,
	/** Moderate - acceptable but could improve */
	moderate: 70,
	/** Good - healthy coverage */
	good: 85,
} as const;

export type OxygenThresholdLevel = keyof typeof OXYGEN_THRESHOLDS;

// =============================================================================
// TEMPERATURE THRESHOLDS (0-100% AI activity)
// =============================================================================

/**
 * Temperature (AI activity) thresholds.
 * Based on percentage of AI-assisted changes in the window.
 */
export const TEMPERATURE_THRESHOLDS = {
	/** Cold - minimal AI activity */
	cold: 0,
	/** Warm - some AI activity detected */
	warm: 20,
	/** Hot - significant AI activity */
	hot: 50,
	/** Burning - heavy AI activity, extra caution needed */
	burning: 80,
} as const;

export type TemperatureThresholdLevel = keyof typeof TEMPERATURE_THRESHOLDS;

// =============================================================================
// PULSE THRESHOLDS (changes per minute)
// =============================================================================

/**
 * Pulse (change velocity) thresholds.
 * Measured in file changes per minute.
 */
export const PULSE_THRESHOLDS = {
	/** Resting - minimal activity */
	resting: 0,
	/** Elevated - moderate activity */
	elevated: 15,
	/** Racing - high activity */
	racing: 30,
	/** Critical - very high activity, potential automation */
	critical: 50,
} as const;

export type PulseThresholdLevel = keyof typeof PULSE_THRESHOLDS;

// =============================================================================
// TRAJECTORY THRESHOLDS (combined metrics)
// =============================================================================

/**
 * Trajectory state thresholds - used for combined analysis.
 * These define when to transition between trajectory states.
 */
export const TRAJECTORY_THRESHOLDS = {
	/** Pressure level that contributes to escalating trajectory */
	escalatingPressure: 60,
	/** Oxygen level below which contributes to escalating trajectory */
	escalatingOxygen: 70,
	/** Pressure level for critical trajectory */
	criticalPressure: 80,
	/** Oxygen level below which contributes to critical trajectory */
	criticalOxygen: 50,
	/** Pressure drop required to enter recovering state */
	recoveringPressureDrop: 10,
	/** Oxygen level required for recovering state */
	recoveringOxygen: 70,
} as const;

// =============================================================================
// URGENCY SCORING
// =============================================================================

/**
 * Urgency score thresholds for snapshot recommendations.
 * Scores are calculated from combined vitals.
 */
export const URGENCY_THRESHOLDS = {
	/** No urgency - healthy state */
	none: 0,
	/** Low urgency - optional action */
	low: 20,
	/** Medium urgency - should act soon */
	medium: 40,
	/** High urgency - should act now */
	high: 60,
	/** Critical urgency - immediate action required */
	critical: 80,
} as const;

export type UrgencyThresholdLevel = keyof typeof URGENCY_THRESHOLDS;

// =============================================================================
// TIME-BASED THRESHOLDS
// =============================================================================

/**
 * Time-based thresholds for staleness and recommendations.
 */
export const TIME_THRESHOLDS = {
	/** Minutes until snapshot considered stale */
	staleSnapshotMinutes: 30,
	/** Minutes of no snapshot before optional recommendation */
	optionalSnapshotMinutes: 60,
	/** Sliding window for pulse calculation (seconds) */
	pulseWindowSeconds: 60,
	/** Sliding window for temperature decay (seconds) */
	temperatureWindowSeconds: 300,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get pressure level name from value.
 */
export function getPressureLevel(value: number): PressureThresholdLevel {
	if (value >= PRESSURE_THRESHOLDS.critical) return "critical";
	if (value >= PRESSURE_THRESHOLDS.high) return "high";
	if (value >= PRESSURE_THRESHOLDS.moderate) return "moderate";
	return "low";
}

/**
 * Get oxygen level name from value.
 */
export function getOxygenLevel(value: number): OxygenThresholdLevel {
	if (value >= OXYGEN_THRESHOLDS.good) return "good";
	if (value >= OXYGEN_THRESHOLDS.moderate) return "moderate";
	if (value >= OXYGEN_THRESHOLDS.low) return "low";
	return "critical";
}

/**
 * Calculate urgency score from vitals.
 * Returns 0-100 score based on combined metrics.
 */
export function calculateUrgencyScore(vitals: {
	pressure: number;
	oxygen: number;
	temperatureLevel: "cold" | "warm" | "hot" | "burning";
}): number {
	let score = 0;

	// Pressure contributes up to 40 points
	score += Math.min((vitals.pressure / 100) * 40, 40);

	// Low oxygen contributes up to 25 points
	if (vitals.oxygen < OXYGEN_THRESHOLDS.low) {
		score += Math.min(((OXYGEN_THRESHOLDS.low - vitals.oxygen) / OXYGEN_THRESHOLDS.low) * 25, 25);
	}

	// Temperature contributes up to 20 points
	const tempScores = { cold: 0, warm: 5, hot: 15, burning: 20 };
	score += tempScores[vitals.temperatureLevel];

	// Cap at 100
	return Math.min(Math.round(score), 100);
}

/**
 * Get urgency level from score.
 */
export function getUrgencyLevel(score: number): UrgencyThresholdLevel {
	if (score >= URGENCY_THRESHOLDS.critical) return "critical";
	if (score >= URGENCY_THRESHOLDS.high) return "high";
	if (score >= URGENCY_THRESHOLDS.medium) return "medium";
	if (score >= URGENCY_THRESHOLDS.low) return "low";
	return "none";
}

/**
 * Check if snapshot should be recommended based on vitals.
 */
export function shouldRecommendSnapshot(vitals: {
	pressure: number;
	oxygen: number;
	trajectory: "stable" | "escalating" | "critical" | "recovering";
}): { should: boolean; urgency: UrgencyThresholdLevel; reason: string } {
	// Critical trajectory always recommends
	if (vitals.trajectory === "critical") {
		return {
			should: true,
			urgency: "critical",
			reason: "Critical workspace state - immediate snapshot required",
		};
	}

	// High pressure recommends
	if (vitals.pressure >= PRESSURE_THRESHOLDS.high) {
		return {
			should: true,
			urgency: "high",
			reason: `High pressure (${vitals.pressure}%) - snapshot recommended`,
		};
	}

	// Escalating with moderate pressure recommends
	if (vitals.trajectory === "escalating" && vitals.pressure >= PRESSURE_THRESHOLDS.moderate) {
		return {
			should: true,
			urgency: "medium",
			reason: "Escalating trajectory - consider creating a snapshot",
		};
	}

	// Low oxygen with moderate pressure recommends
	if (vitals.oxygen < OXYGEN_THRESHOLDS.low && vitals.pressure >= PRESSURE_THRESHOLDS.moderate) {
		return {
			should: true,
			urgency: "medium",
			reason: `Low snapshot coverage (${vitals.oxygen}%) with unsaved changes`,
		};
	}

	return {
		should: false,
		urgency: "none",
		reason: "Workspace healthy - no snapshot needed",
	};
}
