/**
 * Static Analysis Module
 *
 * Lightweight static analysis tools for AI agent assistance.
 * These tools help agents identify issues upfront, saving exploration tokens.
 *
 * Features:
 * - Skipped test detection (describe.skip, it.skip, test.skip)
 * - Orphaned file detection (dead code candidates)
 *
 * @module analysis/static
 */

// Circular Dependency Detection
export {
	type CircularOptions,
	type CircularResult,
	detectCircular,
	detectCircularInMonorepo,
	formatCycles,
	summarizeCircular,
} from "./CircularDetector.js";
// Orphan Detection
export {
	checkFilesForOrphanStatus,
	detectOrphans,
	filterOrphansToFiles,
	type OrphanOptions,
	type OrphanResult,
} from "./OrphanDetector.js";
// Skipped Test Detection
export {
	analyzeSkippedTests,
	detectSkippedTests,
	getSkippedTestSummary,
	type SkippedTest,
	type SkippedTestResult,
} from "./SkippedTestDetector.js";

/**
 * Combined static analysis result for begin_task
 */
export interface StaticAnalysisResult {
	/** Skipped tests found in target files */
	skippedTests: Array<{
		file: string;
		type: "describe" | "it" | "test";
		name?: string;
		line: number;
	}>;
	/** Files that appear to be orphaned (no dependents) */
	orphanedFiles: string[];
	/** Duration of analysis in milliseconds */
	duration: number;
	/** Whether all analysis completed successfully */
	success: boolean;
	/** Any errors encountered */
	errors: string[];
}

/**
 * Run lightweight static analysis on target files
 *
 * This is designed to be fast enough to run in begin_task
 * without significantly impacting latency.
 *
 * @param files - Files to analyze (map of path to content)
 * @param workspaceRoot - Workspace root for orphan detection
 * @param options - Analysis options
 * @returns Combined analysis result
 */
export async function runStaticAnalysis(
	files: Map<string, string>,
	_workspaceRoot: string,
	options: {
		/** Skip orphan detection (faster but less complete) */
		skipOrphanDetection?: boolean;
		/** Skip skipped test detection */
		skipTestDetection?: boolean;
	} = {},
): Promise<StaticAnalysisResult> {
	const startTime = Date.now();
	const result: StaticAnalysisResult = {
		skippedTests: [],
		orphanedFiles: [],
		duration: 0,
		success: true,
		errors: [],
	};

	// 1. Detect skipped tests (fast - just AST parsing)
	if (!options.skipTestDetection) {
		try {
			const { analyzeSkippedTests } = await import("./SkippedTestDetector.js");
			const testResults = analyzeSkippedTests(files);

			for (const testResult of testResults) {
				if (!testResult.parsed && testResult.error) {
					result.errors.push(`Parse error in ${testResult.file}: ${testResult.error}`);
				}
				for (const skipped of testResult.skipped) {
					result.skippedTests.push({
						file: skipped.file,
						type: skipped.type,
						name: skipped.name,
						line: skipped.line,
					});
				}
			}
		} catch (error) {
			result.errors.push(
				`Skipped test detection failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// 2. Orphan detection is disabled by default in begin_task
	// because it requires analyzing the full dependency graph
	// which can be slow for large codebases (500ms+)
	// Enable with options.skipOrphanDetection = false
	if (!options.skipOrphanDetection) {
		// Orphan detection is expensive - skip by default
		// Will be enabled in a future version with caching
	}

	result.duration = Date.now() - startTime;
	result.success = result.errors.length === 0;

	return result;
}
