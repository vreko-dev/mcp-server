/**
 * Context Enhancement Types
 *
 * Interfaces for enriched context data in begin_task and related tools.
 * Implements CONTEXT_ENHANCEMENT_PLAN.md specifications.
 *
 * @module types/context
 */

// =============================================================================
// Error Context Types (P0)
// =============================================================================

/**
 * Cached error from build/test/lint operations
 */
export interface CachedError {
	/** Relative file path */
	file: string;
	/** Line number (1-indexed) */
	line: number;
	/** Column number (optional) */
	column?: number;
	/** Error code (e.g., "TS2339") */
	code?: string;
	/** Error message */
	message: string;
	/** Severity level */
	severity: "error" | "warning";
	/** When this error was recorded */
	timestamp: number;
	/** Error source type */
	source: "typescript" | "test" | "lint" | "runtime";
}

/**
 * Error context returned to agents
 */
export interface ErrorContext {
	/** TypeScript compilation errors */
	typescript: Array<
		CachedError & {
			/** Human-readable age (e.g., "2h", "1d") */
			age: string;
		}
	>;
	/** Test failures */
	tests: Array<
		CachedError & {
			/** Test name that failed */
			testName?: string;
			/** Stack trace (truncated) */
			stackTrace?: string;
			age: string;
		}
	>;
	/** Lint errors */
	lintErrors: Array<
		CachedError & {
			/** ESLint/Biome rule name */
			rule?: string;
			/** Whether auto-fixable */
			fixable?: boolean;
			age: string;
		}
	>;
}

// =============================================================================
// Git Context Types (P0)
// =============================================================================

/**
 * Git branch information
 */
export interface GitBranch {
	/** Current branch name */
	current: string;
	/** Upstream tracking branch (if any) */
	upstream?: string;
	/** Commits ahead of upstream */
	ahead: number;
	/** Commits behind upstream */
	behind: number;
}

/**
 * Uncommitted file change
 */
export interface UncommittedChange {
	/** Relative file path */
	file: string;
	/** Git status code */
	status: "A" | "M" | "D" | "?" | "R" | "C" | "U";
	/** Lines added (if available) */
	linesAdded?: number;
	/** Lines removed (if available) */
	linesRemoved?: number;
}

/**
 * Staged file change
 */
export interface StagedChange {
	/** Relative file path */
	file: string;
	/** Git status code */
	status: "A" | "M" | "D" | "R";
}

/**
 * Recent commit information
 */
export interface RecentCommit {
	/** Short commit hash */
	hash: string;
	/** Commit message (first line) */
	message: string;
	/** Author name */
	author: string;
	/** Relative date (e.g., "2 hours ago") */
	date: string;
	/** Number of files changed */
	filesChanged: number;
	/** Whether this commit touches planned files */
	affectsPlannedFiles: boolean;
}

/**
 * File history information
 */
export interface FileHistory {
	/** Relative last modified time (e.g., "15 min ago") */
	lastModified: string;
	/** Short hash of last commit touching this file */
	lastCommit: string;
	/** Whether file has uncommitted changes */
	modifiedByUser: boolean;
}

/**
 * Complete git context
 */
export interface GitContext {
	/** Branch information */
	branch: GitBranch;
	/** Uncommitted changes in working tree */
	uncommittedChanges: UncommittedChange[];
	/** Staged changes (ready to commit) */
	stagedChanges: StagedChange[];
	/** Recent commits (last 5) */
	recentCommits: RecentCommit[];
	/** History for planned files */
	fileHistory: Record<string, FileHistory>;
}

// =============================================================================
// Dependency Context Types (P1)
// =============================================================================

/**
 * Import reference with location
 */
export interface ImportRef {
	/** File that imports */
	file: string;
	/** Line number of import */
	line: number;
}

/**
 * Dependency information for a single file
 */
export interface FileDependencies {
	/** Files this file imports */
	imports: string[];
	/** Files that import this file */
	importedBy: ImportRef[];
	/** Max depth in import tree */
	depth: number;
	/** True if no dependents (potential dead code) */
	isOrphan: boolean;
}

/**
 * Circular dependency information
 */
export interface CircularDependency {
	/** Files in the cycle */
	cycle: string[];
	/** Severity level */
	severity: "warning" | "error";
}

/**
 * Dependency context for planned files
 */
export interface DependencyContext {
	/** Dependency info for each planned file */
	planned: Record<string, FileDependencies>;
	/** Detected circular dependencies */
	circular: CircularDependency[];
	/** Suggested additional files to consider */
	suggestions: string[];
}

// =============================================================================
// Test Coverage Context Types (P1)
// =============================================================================

/**
 * Coverage metrics for a file
 */
export interface CoverageMetrics {
	/** Line coverage percentage */
	lines: number;
	/** Function coverage percentage */
	functions: number;
	/** Branch coverage percentage */
	branches: number;
}

/**
 * Test coverage information for a single file
 */
export interface FileCoverage {
	/** Whether file has associated tests */
	hasTests: boolean;
	/** Test files that cover this source file */
	testFiles: string[];
	/** Coverage metrics (if available) */
	coverage?: CoverageMetrics;
	/** Function names without test coverage */
	untestedFunctions?: string[];
}

/**
 * Coverage summary
 */
export interface CoverageSummary {
	/** Total files analyzed */
	totalFiles: number;
	/** Files with at least one test */
	filesWithTests: number;
	/** Average line coverage percentage */
	averageCoverage: number;
}

/**
 * Test coverage context
 */
export interface TestCoverageContext {
	/** Coverage info per file */
	files: Record<string, FileCoverage>;
	/** Overall summary */
	summary: CoverageSummary;
}

// =============================================================================
// Export Index Types (P2)
// =============================================================================

/**
 * Exported symbol from a file
 */
export interface ExportedSymbol {
	/** Symbol name */
	name: string;
	/** Kind of export */
	kind: "function" | "class" | "type" | "interface" | "const" | "enum" | "variable";
	/** Type signature (optional) */
	signature?: string;
	/** Whether this is the default export */
	isDefault: boolean;
	/** Line number of export */
	line: number;
}

/**
 * Export summary stats
 */
export interface ExportSummary {
	/** Total exports across all files */
	totalExports: number;
	/** Count by export kind */
	byKind: Record<string, number>;
}

/**
 * Export index for planned files
 */
export interface ExportIndex {
	/** Exports per file */
	files: Record<string, ExportedSymbol[]>;
	/** Summary statistics */
	summary: ExportSummary;
}

// =============================================================================
// Combined Enhanced Context
// =============================================================================

/**
 * Enhanced context returned by begin_task
 * Extends the base BeginTaskOutput with new context fields
 */
export interface EnhancedContext {
	/** Last known errors for planned files (P0) */
	lastKnownErrors?: ErrorContext;
	/** Git change context (P0) */
	gitContext?: GitContext;
	/** Dependency information (P1) */
	dependencyContext?: DependencyContext;
	/** Test coverage information (P1) */
	testCoverage?: TestCoverageContext;
	/** Export index (P2, optional) */
	exports?: ExportIndex;
}
