/**
 * Analysis Types
 *
 * Type definitions for the deterministic static analysis layer.
 * These types are used by all analyzers in packages/core.
 *
 * @module analysis/types
 */

// Import for local use
import type { AnalysisIssue, Severity } from "@snapback/contracts";

// Re-export common types and schemas from contracts
export {
	type AnalysisIssue,
	AnalysisIssueSchema,
	type BaseIssue,
	BaseIssueSchema,
	type CircuitBreakerState,
	CircuitBreakerStateEnumSchema,
	CircuitBreakerStateSchema,
	type RiskSeverity,
	RiskSeveritySchema,
	type Severity,
	SeveritySchema,
	toSeverity,
	toValidationSeverity,
	type ValidationIssue,
	ValidationIssueSchema,
	type ValidationResult,
	ValidationResultSchema,
	type ValidationSeverity,
	ValidationSeveritySchema,
} from "@snapback/contracts";

/**
 * Result from a single analyzer
 */
export interface AnalyzerResult {
	/** Analyzer identifier */
	analyzer: string;
	/** Whether analysis completed without errors */
	success: boolean;
	/** Issues found during analysis */
	issues: AnalysisIssue[];
	/** Coverage: 0-1, how much of the input was analyzed */
	coverage: number;
	/** Duration in milliseconds */
	duration: number;
	/** Additional metadata */
	metadata?: {
		filesAnalyzed?: number;
		nodesVisited?: number;
		patternsChecked?: string[];
		parseErrors?: string[];
	};
}

/**
 * Context provided to analyzers
 */
export interface AnalysisContext {
	/** Workspace root directory */
	workspaceRoot: string;
	/** File paths to analyze */
	files: string[];
	/** Map of file path to content */
	contents: Map<string, string>;
	/** Optional configuration overrides */
	config?: AnalysisConfig;
}

/**
 * Configuration for analysis
 */
export interface AnalysisConfig {
	/** Skip certain file patterns */
	exclude?: string[];
	/** Only analyze certain file patterns */
	include?: string[];
	/** Enable debug logging */
	debug?: boolean;
	/** Custom severity overrides by issue type */
	severityOverrides?: Record<string, Severity>;
}

/**
 * Interface for all analyzers
 */
export interface Analyzer {
	/** Unique identifier */
	readonly id: string;
	/** Human-readable name */
	readonly name: string;
	/** File patterns this analyzer handles (glob-style) */
	readonly filePatterns: string[];

	/**
	 * Run analysis on the provided context
	 */
	analyze(context: AnalysisContext): Promise<AnalyzerResult>;

	/**
	 * Check if this analyzer should run for the given context
	 */
	shouldRun(context: AnalysisContext): boolean;
}

/**
 * Coverage information for confidence calculation
 */
export interface CoverageInfo {
	/** Whether AST parsing was successful */
	astParsed: boolean;
	/** Whether security analysis ran */
	securityChecked: boolean;
	/** Whether completeness analysis ran */
	completenessChecked: boolean;
	/** Whether architecture analysis ran */
	architectureChecked: boolean;
	/** Percentage of files successfully analyzed */
	filesCoverage: number;
}

/**
 * Confidence calculation result
 */
export interface ConfidenceResult {
	/** Overall confidence score (0-1) */
	confidence: number;
	/** Breakdown by analyzer */
	breakdown: Record<string, number>;
	/** Human-readable explanation */
	explanation: string;
	/** Maximum possible confidence given coverage */
	maxPossibleConfidence: number;
}

/**
 * Domain-specific pattern bundle
 */
export interface DomainBundle {
	/** Bundle identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Description of what this bundle covers (optional for functional style) */
	description?: string;
	/** Keywords that trigger this bundle (functional style) */
	keywords?: string[];
	/** Patterns to check */
	patterns: DomainPattern[];
	/** Keywords/file patterns that trigger this bundle (declarative style) */
	applicableTo?: string[];
}

/**
 * Detection configuration for a declarative domain pattern
 */
export interface PatternDetection {
	/** AST pattern to look for (conceptual, not a real AST query) */
	astPattern?: string;
	/** Keywords that should be present */
	keywords?: string[];
	/** Regex pattern to match */
	regex?: RegExp;
}

/**
 * Single pattern within a domain bundle.
 * Supports both functional style (with detect function) and declarative style (with detectWith config).
 */
export interface DomainPattern {
	/** Pattern identifier */
	id: string;
	/** Pattern name */
	name: string;
	/** Description of what this pattern checks */
	description?: string;
	/** Whether this pattern is required (violation = critical issue) */
	required?: boolean;
	/** Severity if pattern is violated */
	severity?: Severity;
	/** Detection function (functional style) */
	detect?: (content: string, file: string) => AnalysisIssue[];
	/** How to detect this pattern (declarative style) */
	detectWith?: PatternDetection;
	/** Message shown when pattern is violated */
	failureMessage?: string;
	/** Suggested fix for the violation */
	fixSuggestion?: string;
}

/**
 * Aggregated result from all analyzers
 */
export interface AggregatedAnalysisResult {
	/** All analyzer results */
	results: AnalyzerResult[];
	/** Total issues found */
	totalIssues: number;
	/** Issues grouped by severity */
	issuesBySeverity: Record<Severity, AnalysisIssue[]>;
	/** Coverage information */
	coverage: CoverageInfo;
	/** Confidence calculation */
	confidence: ConfidenceResult;
	/** Total duration in milliseconds */
	duration: number;
}
