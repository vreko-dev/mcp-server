/**
 * @snapback/intelligence
 *
 * Unified intelligence layer for SnapBack.
 * Single source of truth for validation, learning, and context retrieval.
 *
 * Same algorithms, different data sources:
 * - Internal: rootDir='ai_dev_utils' (self-learning pair programmer)
 * - Product: rootDir=workspace (code protection for users)
 *
 * @example
 * ```typescript
 * import { Intelligence } from "@snapback/intelligence";
 *
 * const intel = new Intelligence({
 *   rootDir: "ai_dev_utils",
 *   enableLearningLoop: true,
 * });
 *
 * // Get context before implementing
 * const context = await intel.getContext({
 *   task: "Add authentication to MCP server",
 * });
 *
 * // Validate code before committing
 * const validation = await intel.checkPatterns(code, filePath);
 * ```
 */

export type {
	ArtifactCandidate,
	ArtifactKind,
	ArtifactRef,
	BudgetConfig,
	ComposerConstraints,
	ComposerOptions,
	ComposeTrigger,
	CompositionResult,
	Lane,
	RenderedArtifact,
	SelectionExplanation,
} from "./composer/index.js";
// Composer (context assembly)
export { Composer, createComposer, DEFAULT_BUDGET_CONFIG } from "./composer/index.js";
// Sub-modules
export { ContextEngine, SemanticRetriever } from "./context/index.js";
export type { WorkspaceProfilerConfig } from "./fingerprint/index.js";
// Workspace fingerprinting
export { WorkspaceProfiler } from "./fingerprint/index.js";
// Main facade
export { Intelligence } from "./Intelligence.js";
export type {
	ContextFileConfig,
	DetectedFramework,
	DetectedLanguage,
	DetectedPattern,
	ExistingContext,
	ExistingContextFile,
	ExpectedPattern,
	FrameworkCategory,
	FrameworkConfig,
	FrameworkId,
	FrameworkIndicator,
	OnboardingRecommendation,
	PackageManagerInfo,
	PatternCategory,
	PatternDetection,
	PatternGap,
	PatternLocation,
	ProjectStructure,
	RecommendedAction,
	RecommendedStructure,
	RiskZone,
	WorkspaceProfile,
} from "./knowledge/index.js";
// Knowledge base
export {
	astroConfig,
	detectFrameworks,
	detectPrimaryFramework,
	expressConfig,
	type FrameworkDetectionContext,
	getAllFrameworks,
	getFramework,
	getFrameworksByCategory,
	isValidFramework,
	nestjsConfig,
	nextjsConfig,
	reactViteConfig,
} from "./knowledge/index.js";
export { LearningEngine, ViolationTracker } from "./learning/index.js";
export type {
	AstNode,
	AstVisitor,
	DetectionError,
	DetectionStrategy,
	DetectionStrategyConfig,
	FoundPattern,
	GapAnalysisResult,
	GapAnalysisSummary,
	GapAnalyzerConfig,
	MissingPattern,
	PatternDetectionResult,
	PatternDetectorConfig,
	PatternMatch,
	PatternMatchContext,
	PatternMatcher,
	PatternMatchFunction,
} from "./patterns/index.js";
// Pattern detection
export {
	createBuiltInMatchers,
	errorHandlingMatchers,
	GapAnalyzer,
	PatternDetector,
	performanceMatchers,
	securityMatchers,
	testingMatchers,
} from "./patterns/index.js";
// Policy module (migrated from @snapback/policy-engine)
export {
	type DetectionEvent,
	evaluate,
	loadPolicyConfig,
	type MockDetectionResult,
	MockDetector,
	type MockFinding,
	PhantomDependencyDetector,
	type PhantomDependencyFinding,
	type PhantomDependencyResult,
	type PolicyAction,
	type PolicyConfig,
	type PolicyDecision,
	PolicyEngine,
	type PolicyEngineConfig,
	type PolicyEngineResult,
	type PolicyRule,
	SarifFormatter,
	type SarifLog,
	type SarifResult,
	type SarifRule,
	type SarifRun,
	type SecretDetectionResult,
	SecretDetector,
	type SecretFinding,
} from "./policy/index.js";
export { LoopDetector, SessionManager } from "./session/index.js";
// Storage utilities
export {
	appendJsonl,
	appendJsonlAsync,
	ConfigStore,
	generateId,
	loadJsonl,
	writeJsonl,
} from "./storage/index.js";
// All types
export * from "./types/index.js";
export type {
	PipelineResult,
	ReviewRecommendation,
	ValidationResult,
} from "./validation/index.js";
// Validation layers (for customization)
export {
	ArchitectureLayer,
	CriticalValidationError,
	DependencyLayer,
	PerformanceLayer,
	SecurityLayer,
	SyntaxLayer,
	TestLayer,
	TypeLayer,
	ValidationError,
	ValidationPipeline,
} from "./validation/index.js";
