/**
 * @snapback/intelligence/vitals
 *
 * Workspace Vitals - Adaptive risk sensing for AI-native development.
 *
 * Four vital signs that drive automatic protection decisions:
 * - Pulse: Change velocity (changes/min)
 * - Temperature: AI activity percentage
 * - Pressure: Risk accumulation (0-100)
 * - Oxygen: Snapshot coverage (0-100%)
 *
 * @example
 * ```typescript
 * import { PulseTracker, PressureGauge } from '@snapback/intelligence/vitals';
 *
 * const pulse = new PulseTracker();
 * pulse.recordChange();
 * console.log(pulse.getLevel()); // { level: 'resting', changesPerMinute: 1 }
 * ```
 */

// Re-export types for convenience
export type {
	AgentGuidance,
	AIDetectionEvent,
	OxygenConfig,
	PressureConfig,
	PulseConfig,
	PulseLevel,
	SnapshotDecision,
	SnapshotEvent,
	TemperatureConfig,
	TempLevel,
	Trajectory,
	Urgency,
	VitalsConfig,
	VitalsFileChangeEvent,
	VitalsSnapshot,
} from "../types/vitals.js";
// Centralized thresholds - SINGLE SOURCE OF TRUTH
export {
	calculateUrgencyScore,
	getOxygenLevel,
	getPressureLevel,
	getUrgencyLevel,
	OXYGEN_THRESHOLDS,
	type OxygenThresholdLevel,
	PRESSURE_THRESHOLDS,
	type PressureThresholdLevel,
	PULSE_THRESHOLDS,
	type PulseThresholdLevel,
	shouldRecommendSnapshot,
	TEMPERATURE_THRESHOLDS,
	type TemperatureThresholdLevel,
	TIME_THRESHOLDS,
	TRAJECTORY_THRESHOLDS,
	URGENCY_THRESHOLDS,
	type UrgencyThresholdLevel,
} from "./constants.js";
// Documentation Freshness Detection
export {
	DEFAULT_DOC_FRESHNESS_CONFIG,
	type DocFreshnessConfig,
	type DocFreshnessResult,
	DocFreshnessSensor,
	type DocFreshnessState,
	formatStaleDocs,
	type StaleDoc,
} from "./DocFreshnessSensor.js";
export type {
	BehaviorStats,
	CalibrationStatus,
	PatternMatch,
	RiskProfile,
	SnapshotObservation,
	SnapshotSuggestion,
	TeamAggregation,
	ThresholdAdjustments,
	TrajectoryForecast,
	UserComparison,
	WorkspaceProfile,
} from "./learning/index.js"; // BehavioralMetadata re-exported below
// Phase 4 exports - Learning & Calibration
export {
	PatternLookup,
	SnapshotSuggester,
	TeamAggregator,
	ThresholdCalibrator,
	TrajectoryPredictor,
	UserBehaviorLearner,
} from "./learning/index.js";
export type { OxygenState } from "./OxygenSensor.js";
export { DEFAULT_OXYGEN_CONFIG, OxygenSensor } from "./OxygenSensor.js";
export type { PressureState } from "./PressureGauge.js";
export { DEFAULT_PRESSURE_CONFIG, PressureGauge } from "./PressureGauge.js";
export type { PulseState } from "./PulseTracker.js";
// Phase 1 exports - Pulse and Pressure
export { DEFAULT_PULSE_CONFIG, PulseTracker } from "./PulseTracker.js";
export type { TemperatureState } from "./TemperatureMonitor.js";
// Phase 2 exports - Temperature, Oxygen, and main WorkspaceVitals
export {
	DEFAULT_TEMPERATURE_CONFIG,
	TemperatureMonitor,
} from "./TemperatureMonitor.js";
export {
	DEFAULT_VITALS_CONFIG,
	WorkspaceVitals,
} from "./WorkspaceVitals.js";
