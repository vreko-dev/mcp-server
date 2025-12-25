/**
 * Pattern Detection Types
 *
 * Type definitions for AST-based pattern detection and analysis.
 *
 * @module patterns/types
 */

import type { PatternCategory } from "../knowledge/types.js";

// =============================================================================
// PATTERN DETECTION
// =============================================================================

/**
 * Configuration for the pattern detector
 */
export interface PatternDetectorConfig {
	/** Workspace root directory */
	workspaceRoot: string;
	/** File patterns to include */
	include?: string[];
	/** File patterns to exclude */
	exclude?: string[];
	/** Maximum files to scan (for performance) */
	maxFiles?: number;
	/** Enable AST parsing (slower but more accurate) */
	useAst?: boolean;
	/** Timeout per file in milliseconds */
	fileTimeout?: number;
}

/**
 * Result from pattern detection
 */
export interface PatternDetectionResult {
	/** Patterns that were found */
	foundPatterns: FoundPattern[];
	/** Patterns that were checked but not found */
	missingPatterns: MissingPattern[];
	/** Files that were scanned */
	scannedFiles: number;
	/** Time taken in milliseconds */
	duration: number;
	/** Any errors encountered */
	errors: DetectionError[];
}

/**
 * A pattern that was found in the codebase
 */
export interface FoundPattern {
	/** Pattern ID */
	id: string;
	/** Pattern name */
	name: string;
	/** Category */
	category: PatternCategory;
	/** Locations where the pattern was found */
	locations: PatternMatch[];
	/** How strongly this pattern is implemented (0-1) */
	strength: number;
	/** Whether this is a good practice or anti-pattern */
	isPositive: boolean;
}

/**
 * A pattern that was expected but not found
 */
export interface MissingPattern {
	/** Pattern ID */
	id: string;
	/** Pattern name */
	name: string;
	/** Category */
	category: PatternCategory;
	/** Importance level */
	importance: "critical" | "recommended" | "optional";
	/** Why this pattern is important */
	reason: string;
	/** Files that should have had this pattern */
	expectedLocations?: string[];
}

/**
 * A specific match of a pattern in the codebase
 */
export interface PatternMatch {
	/** File path */
	file: string;
	/** Line number (1-based) */
	line: number;
	/** Column number (1-based) */
	column?: number;
	/** Code snippet */
	snippet: string;
	/** Match confidence (0-1) */
	confidence: number;
	/** Additional context */
	context?: PatternMatchContext;
}

/**
 * Additional context about a pattern match
 */
export interface PatternMatchContext {
	/** Function or method name if within one */
	functionName?: string;
	/** Class name if within one */
	className?: string;
	/** Export name if exported */
	exportName?: string;
	/** Whether this is a type or value */
	kind?: "type" | "value" | "both";
}

/**
 * Error during pattern detection
 */
export interface DetectionError {
	/** File that caused the error */
	file: string;
	/** Error message */
	message: string;
	/** Error type */
	type: "parse" | "read" | "timeout" | "unknown";
}

// =============================================================================
// PATTERN MATCHERS
// =============================================================================

/**
 * A matcher that detects a specific pattern
 */
export interface PatternMatcher {
	/** Unique ID for this matcher */
	id: string;
	/** Human-readable name */
	name: string;
	/** Category of pattern */
	category: PatternCategory;
	/** File patterns to search */
	files: string[];
	/** The actual matching function */
	match: PatternMatchFunction;
	/** Whether this is a good practice (true) or anti-pattern (false) */
	isPositive: boolean;
	/** Importance level */
	importance: "critical" | "recommended" | "optional";
	/** Description of what this pattern does */
	description: string;
}

/**
 * Function that performs the pattern matching
 */
export type PatternMatchFunction = (
	content: string,
	filePath: string,
	ast?: unknown,
) => PatternMatch[] | Promise<PatternMatch[]>;

// =============================================================================
// AST TYPES (simplified for TypeScript/JavaScript)
// =============================================================================

/**
 * Simplified AST node for pattern matching
 * Compatible with multiple parsers (typescript, oxc, etc.)
 */
export interface AstNode {
	type: string;
	start?: number;
	end?: number;
	loc?: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
	[key: string]: unknown;
}

/**
 * AST visitor function
 */
export type AstVisitor = (node: AstNode, parent?: AstNode) => void | boolean;

// =============================================================================
// DETECTION STRATEGIES
// =============================================================================

/**
 * Different strategies for detecting patterns
 */
export type DetectionStrategy = "regex" | "ast" | "file-exists" | "dependency" | "combined";

/**
 * Configuration for a detection strategy
 */
export interface DetectionStrategyConfig {
	/** Strategy type */
	strategy: DetectionStrategy;
	/** Regex pattern (for regex strategy) */
	regex?: RegExp;
	/** AST node types to look for (for ast strategy) */
	nodeTypes?: string[];
	/** File path pattern (for file-exists strategy) */
	filePath?: string;
	/** Dependency name (for dependency strategy) */
	dependency?: string;
}
