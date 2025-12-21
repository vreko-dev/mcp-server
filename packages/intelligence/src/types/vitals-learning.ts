/**
 * @snapback/intelligence - Vitals Learning Types
 *
 * Type definitions for Phase 4: Learning & Calibration
 * - User behavior learning
 * - Per-workspace threshold calibration
 * - Trajectory prediction
 */

import type { Trajectory, Urgency, VitalsSnapshot } from "./vitals.js";

// =============================================================================
// USER BEHAVIOR LEARNING
// =============================================================================

/** Risk tolerance profile inferred from user behavior */
export type RiskProfile = "conservative" | "balanced" | "aggressive";

/** Timing classification for snapshot events */
export type SnapshotTiming = "early" | "aligned" | "late" | "missed";

/** A recorded observation of user snapshot behavior */
export interface SnapshotObservation {
	/** Unique observation ID */
	id: string;
	/** Workspace this observation belongs to */
	workspaceId: string;
	/** Timestamp when observation was recorded */
	timestamp: number;
	/** Vitals snapshot at time of observation */
	vitals: VitalsSnapshot;
	/** Whether user created a snapshot */
	userCreatedSnapshot: boolean;
	/** Whether vitals recommended a snapshot at this moment */
	vitalsRecommended: boolean;
	/** Urgency level when observation was made */
	urgencyAtTime: Urgency;
	/** Timing classification */
	timing: SnapshotTiming;
}

/** User behavior statistics derived from observations */
export interface BehaviorStats {
	/** Total observations recorded */
	totalObservations: number;
	/** Times user created snapshot when recommended */
	alignedSnapshots: number;
	/** Times user created snapshot before recommendation (early) */
	earlySnapshots: number;
	/** Times user created snapshot after recommendation (late) */
	lateSnapshots: number;
	/** Times vitals recommended but user didn't snapshot */
	missedRecommendations: number;
	/** Inferred risk profile */
	riskProfile: RiskProfile;
	/** Average pressure when user snapshots */
	avgPressureAtSnapshot: number;
	/** Average oxygen when user snapshots */
	avgOxygenAtSnapshot: number;
}

// =============================================================================
// THRESHOLD CALIBRATION
// =============================================================================

/** Calibration status */
export type CalibrationStatus = "uncalibrated" | "learning" | "calibrated" | "locked";

/** Per-workspace threshold calibration profile */
export interface WorkspaceProfile {
	/** Workspace identifier */
	workspaceId: string;
	/** Calibration status */
	status: CalibrationStatus;
	/** Number of observations used for calibration */
	observationCount: number;
	/** Learned threshold adjustments (multipliers applied to defaults) */
	thresholdAdjustments: ThresholdAdjustments;
	/** Inferred risk tolerance (0-1 scale, 0=conservative, 1=aggressive) */
	riskTolerance: number;
	/** Typical pulse level for this workspace */
	typicalPulseLevel: number;
	/** Average snapshots per hour */
	snapshotFrequency: number;
	/** Last calibration timestamp */
	lastCalibratedAt: number;
	/** Confidence in calibration (0-1) */
	confidence: number;
}

/** Threshold adjustment multipliers */
export interface ThresholdAdjustments {
	/** Multiplier for pulse thresholds */
	pulseMultiplier: number;
	/** Multiplier for temperature thresholds */
	temperatureMultiplier: number;
	/** Multiplier for pressure warning threshold */
	pressureMultiplier: number;
	/** Multiplier for oxygen warning threshold */
	oxygenMultiplier: number;
}

/** Default (neutral) threshold adjustments */
export const DEFAULT_THRESHOLD_ADJUSTMENTS: ThresholdAdjustments = {
	pulseMultiplier: 1.0,
	temperatureMultiplier: 1.0,
	pressureMultiplier: 1.0,
	oxygenMultiplier: 1.0,
};

/** Calibration thresholds */
export const CALIBRATION_THRESHOLDS = {
	/** Minimum observations before starting calibration */
	MIN_OBSERVATIONS_TO_START: 5,
	/** Observations needed for full calibration */
	OBSERVATIONS_FOR_CALIBRATION: 20,
	/** Observations to lock calibration (stable) */
	OBSERVATIONS_TO_LOCK: 50,
	/** Confidence threshold to apply adjustments */
	CONFIDENCE_THRESHOLD: 0.7,
} as const;

// =============================================================================
// TRAJECTORY PREDICTION
// =============================================================================

/** Predicted trajectory state */
export interface TrajectoryForecast {
	/** Current trajectory */
	current: Trajectory;
	/** Predicted trajectory in 5 minutes */
	in5Minutes: Trajectory;
	/** Predicted trajectory in 10 minutes */
	in10Minutes: Trajectory;
	/** Confidence in predictions (0-1) */
	confidence: number;
	/** Trend direction */
	trend: "improving" | "stable" | "worsening";
	/** Time until next predicted state change (ms), null if stable */
	timeToStateChange: number | null;
}

/** Prediction context used for forecasting */
export interface PredictionContext {
	/** Recent history (last N snapshots) */
	recentHistory: VitalsSnapshot[];
	/** Rate of pressure change (per minute) */
	pressureRate: number;
	/** Rate of oxygen change (per minute) */
	oxygenRate: number;
	/** Temperature trend */
	temperatureTrend: "cooling" | "stable" | "heating";
	/** Pulse trend */
	pulseTrend: "slowing" | "stable" | "accelerating";
}

// =============================================================================
// PROACTIVE SUGGESTIONS
// =============================================================================

/** Urgency level for suggestions */
export type SuggestionUrgency = "info" | "nudge" | "warning" | "urgent";

/** A proactive suggestion for the user */
export interface ProactiveSuggestion {
	/** Unique suggestion ID */
	id: string;
	/** Type of suggestion */
	type: "snapshot" | "pause" | "review" | "acknowledge";
	/** Human-readable message */
	message: string;
	/** Urgency level */
	urgency: SuggestionUrgency;
	/** Predicted time until critical (ms), null if not applicable */
	timeUntilCritical: number | null;
	/** Whether user has dismissed this suggestion */
	dismissed: boolean;
	/** Timestamp when suggestion was generated */
	generatedAt: number;
}

// =============================================================================
// STORAGE TYPES
// =============================================================================

/** Learning store for a workspace */
export interface VitalsLearningStore {
	/** Path to observations JSONL file */
	observationsPath: string;
	/** Path to workspace profile JSON file */
	profilePath: string;
}

// =============================================================================
// EVENTS
// =============================================================================

/** Calibration event emitted when profile is updated */
export interface CalibrationEvent {
	workspaceId: string;
	status: CalibrationStatus;
	profile: WorkspaceProfile;
}

/** Suggestion event emitted when proactive suggestion is generated */
export interface SuggestionEvent {
	suggestion: ProactiveSuggestion;
	forecast: TrajectoryForecast;
}
