/**
 * Analysis Module
 *
 * Exports all deterministic static analyzers from @snapback/core.
 * These analyzers use real AST parsing for accurate code analysis.
 *
 * @module analysis
 */

// AST Analyzers
export { SyntaxAnalyzer } from "./ast/SyntaxAnalyzer.js";
// Completeness Analyzers
export { CompletenessAnalyzer } from "./completeness/CompletenessAnalyzer.js";
// Impact Analysis
export {
	type BreakingChange,
	ChangeImpactAnalyzer,
	type ChangeImpactResult,
	type ChangeType,
	createChangeImpactAnalyzer,
	type ImpactedItem,
	type ImpactLevel,
	type PerformanceImpact,
} from "./impact/index.js";
// Security Analyzers
export { SecurityAnalyzer } from "./security/SecurityAnalyzer.js";
// Static Analysis (for AI agent assistance)
export {
	analyzeSkippedTests,
	checkFilesForOrphanStatus,
	// Orphan detection
	detectOrphans,
	// Skipped test detection
	detectSkippedTests,
	filterOrphansToFiles,
	getSkippedTestSummary,
	type OrphanOptions,
	type OrphanResult,
	// Combined analysis
	runStaticAnalysis,
	type SkippedTest,
	type SkippedTestResult,
	type StaticAnalysisResult,
} from "./static/index.js";
// Types
export type {
	AggregatedAnalysisResult,
	AnalysisConfig,
	AnalysisContext,
	AnalysisIssue,
	Analyzer,
	AnalyzerResult,
	ConfidenceResult,
	CoverageInfo,
	DomainBundle,
	DomainPattern,
	PatternDetection,
	Severity,
} from "./types.js";
