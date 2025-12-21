/**
 * @snapback/intelligence/vitals/learning
 *
 * Phase 4: Learning & Calibration module for Workspace Vitals
 *
 * Components:
 * - UserBehaviorLearner: Track user snapshot patterns
 * - ThresholdCalibrator: Per-workspace threshold calibration
 * - TrajectoryPredictor: Forecast trajectory changes
 */

// Re-export learning types for convenience
export type {
	BehaviorStats,
	CalibrationEvent,
	CalibrationStatus,
	PredictionContext,
	ProactiveSuggestion,
	RiskProfile,
	SnapshotObservation,
	SnapshotTiming,
	SuggestionEvent,
	SuggestionUrgency,
	ThresholdAdjustments,
	TrajectoryForecast,
	VitalsLearningStore,
	WorkspaceProfile,
} from "../../types/vitals-learning.js";
export {
	CALIBRATION_THRESHOLDS,
	DEFAULT_THRESHOLD_ADJUSTMENTS,
} from "../../types/vitals-learning.js";

// Threshold calibration
export { ThresholdCalibrator } from "./ThresholdCalibrator.js";

// Trajectory prediction
export { TrajectoryPredictor } from "./TrajectoryPredictor.js";
export type { ObservationInput } from "./UserBehaviorLearner.js";
// User behavior learning
export { UserBehaviorLearner } from "./UserBehaviorLearner.js";
