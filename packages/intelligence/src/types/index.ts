/**
 * @snapback/intelligence - Types
 *
 * Consolidated type definitions for the intelligence package.
 */

// Advisory types
export type {
	AdvisoryConfig,
	AdvisoryContext,
	AdvisoryRule,
	AdvisoryTriggerContext,
	AdvisoryWarning,
	FileHistory,
	ProactiveSuggestion,
	RelatedFile,
	WarningSeverity,
} from "./advisory.js";
export { DEFAULT_ADVISORY_CONFIG } from "./advisory.js";
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
// Fragility types
export type {
	CoChangePattern,
	FileFragilityProfile,
	FragilityAnalysis,
	FragilityConfig,
	FragilityLevel,
	FragilityRecord,
	RollbackEvent,
} from "./fragility.js";
export { DEFAULT_FRAGILITY_CONFIG } from "./fragility.js";
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
// Session types
export type {
	CircuitBreaker,
	FileModification,
	LoopDetectionResult,
	LoopDetectionState,
	SessionAnalytics,
	SessionLimits,
	SessionRiskLevel,
	SessionState,
	ToolCall,
} from "./session.js";
export { DEFAULT_SESSION_LIMITS } from "./session.js";
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
