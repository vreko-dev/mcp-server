/**
 * Knowledge Base Module
 *
 * Framework configurations, pattern expectations, and workspace intelligence.
 *
 * @module knowledge
 */

// Framework configs
export {
	astroConfig,
	expressConfig,
	nestjsConfig,
	nextjsConfig,
	reactViteConfig,
} from "./frameworks/index.js";
// Registry
export {
	detectFrameworks,
	detectPrimaryFramework,
	type FrameworkDetectionContext,
	getAllFrameworks,
	getFramework,
	getFrameworksByCategory,
	isValidFramework,
} from "./registry.js";
// Types
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
} from "./types.js";
