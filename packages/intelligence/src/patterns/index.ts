/**
 * Pattern Detection Module
 *
 * AST-based pattern detection and gap analysis for workspace intelligence.
 *
 * @module patterns
 */

export type { GapAnalysisResult, GapAnalysisSummary, GapAnalyzerConfig } from "./GapAnalyzer.js";
// Core classes
export { GapAnalyzer } from "./GapAnalyzer.js";
// Matchers
export {
	createBuiltInMatchers,
	errorHandlingMatchers,
	performanceMatchers,
	securityMatchers,
	testingMatchers,
} from "./matchers/index.js";
export { PatternDetector } from "./PatternDetector.js";
// Types
export type {
	AstNode,
	AstVisitor,
	DetectionError,
	DetectionStrategy,
	DetectionStrategyConfig,
	FoundPattern,
	MissingPattern,
	PatternDetectionResult,
	PatternDetectorConfig,
	PatternMatch,
	PatternMatchContext,
	PatternMatcher,
	PatternMatchFunction,
} from "./types.js";
