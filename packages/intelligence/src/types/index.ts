/**
 * @snapback/intelligence - Types
 *
 * Consolidated type definitions for the intelligence package.
 */

// Config types
export type {
	CacheableContext,
	Constraint,
	IntelligenceConfig,
	Issue,
	ResolvedConfig,
	ValidationLayer,
} from "./config.js";
export { IntelligenceConfigSchema } from "./config.js";
// Context types
export type {
	ContextInput,
	ContextResult,
	IndexStatus,
	PatternSearchResult,
	ScoredSection,
	SearchResult,
	Section,
} from "./context.js";
// Learning types
export type {
	FeedbackInput,
	GoldenExample,
	HumanFeedback,
	Interaction,
	Learning,
	LearningInput,
	LearningStats,
	LearningType,
	QueryType,
	Violation,
	ViolationInput,
	ViolationStatus,
	ViolationsSummary,
} from "./learning.js";
export { PROMOTION_THRESHOLDS, QUERY_TYPE_KEYWORDS } from "./learning.js";
// Validation types
export type {
	PatternMatch,
	PipelineResult,
	ReviewRecommendation,
	ValidationResult,
} from "./validation.js";
export { CONFIDENCE_THRESHOLDS, ISSUE_THRESHOLDS } from "./validation.js";
// Vitals types
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
} from "./vitals.js";
// Vitals Learning types (Phase 4)
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
} from "./vitals-learning.js";
export {
	CALIBRATION_THRESHOLDS,
	DEFAULT_THRESHOLD_ADJUSTMENTS,
} from "./vitals-learning.js";
