/**
 * TestCoverageService - Cached test coverage analysis for token efficiency
 *
 * Parses vitest coverage output and builds test→source mapping.
 * Answers "is there a test for X?" without grepping.
 *
 * Token savings: 1-2K tokens per coverage question
 *
 * @see CONTEXT_ENHANCEMENT_PLAN.md Feature 4
 * @module services/test-coverage-service
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * Coverage summary from vitest/istanbul output
 */
interface CoverageSummary {
	total: { lines: { pct: number }; functions: { pct: number }; branches: { pct: number } };
	[file: string]: { lines: { pct: number }; functions: { pct: number }; branches: { pct: number } };
}

/**
 * Test coverage context for files (exposed to begin_task)
 */
export interface TestCoverageContext {
	files: Record<
		string,
		{
			hasTests: boolean;
			testFiles: string[]; // Test files covering this source
			coverage?: {
				lines: number; // % of lines covered
				functions: number; // % of functions covered
				branches: number; // % of branches covered
			};
			untestedFunctions?: string[]; // Function names without coverage
		}
	>;
	summary: {
		totalFiles: number;
		filesWithTests: number;
		averageCoverage: number;
	};
}

/**
 * Test run result for cache updates
 */
export interface TestRunResult {
	file: string;
	passed: boolean;
	duration: number;
}

/**
 * Cached test run info
 */
interface CachedTestRun {
	timestamp: number;
	results: TestRunResult[];
}

// =============================================================================
// TestCoverageService
// =============================================================================

export class TestCoverageService {
	private workspaceRoot: string;
	private cacheDir: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.cacheDir = join(workspaceRoot, ".snapback", "coverage");
	}

	/**
	 * Get test coverage context for planned files
	 * Main entry point for begin_task integration
	 */
	getContextForFiles(files: string[]): TestCoverageContext {
		const coverageData = this.loadCoverageData();
		const testMap = this.buildTestMap();

		const filesContext: TestCoverageContext["files"] = {};
		let filesWithTests = 0;
		let totalCoverage = 0;
		let filesWithCoverage = 0;

		for (const file of files) {
			const relPath = this.toRelative(file);
			const testFiles = testMap[relPath] || this.inferTestFiles(file);
			const coverage = coverageData[relPath];

			const hasTests = testFiles.length > 0;
			if (hasTests) filesWithTests++;

			filesContext[file] = {
				hasTests,
				testFiles,
				coverage: coverage
					? {
							lines: coverage.lines.pct,
							functions: coverage.functions.pct,
							branches: coverage.branches.pct,
						}
					: undefined,
			};

			if (coverage) {
				totalCoverage += coverage.lines.pct;
				filesWithCoverage++;
			}
		}

		return {
			files: filesContext,
			summary: {
				totalFiles: files.length,
				filesWithTests,
				averageCoverage: filesWithCoverage > 0 ? totalCoverage / filesWithCoverage : 0,
			},
		};
	}

	/**
	 * Get files with low or no test coverage
	 * Useful for review and refactor intents
	 */
	getLowCoverageFiles(threshold = 50): string[] {
		const coverageData = this.loadCoverageData();
		const lowCoverage: string[] = [];

		for (const [file, coverage] of Object.entries(coverageData)) {
			if (file === "total") continue;
			if (coverage.lines.pct < threshold) {
				lowCoverage.push(file);
			}
		}

		return lowCoverage.sort((a, b) => {
			const aCov = coverageData[a]?.lines.pct ?? 0;
			const bCov = coverageData[b]?.lines.pct ?? 0;
			return aCov - bCov; // Sort by lowest coverage first
		});
	}

	/**
	 * Get overall project coverage summary
	 */
	getProjectCoverage(): { lines: number; functions: number; branches: number } | null {
		const coverageData = this.loadCoverageData();
		if (coverageData.total) {
			return {
				lines: coverageData.total.lines.pct,
				functions: coverageData.total.functions.pct,
				branches: coverageData.total.branches.pct,
			};
		}
		return null;
	}

	/**
	 * Check if a file has tests
	 */
	hasTests(file: string): boolean {
		const testMap = this.buildTestMap();
		const relPath = this.toRelative(file);
		return testMap[relPath]?.length > 0 || this.inferTestFiles(file).length > 0;
	}

	/**
	 * Get test files for a source file
	 */
	getTestFiles(file: string): string[] {
		const testMap = this.buildTestMap();
		const relPath = this.toRelative(file);
		return testMap[relPath] || this.inferTestFiles(file);
	}

	/**
	 * Called after test runs to update cache
	 */
	updateFromTestRun(testResults: TestRunResult[]): void {
		this.ensureCacheDir();
		const cachePath = join(this.cacheDir, "last-run.json");
		const data: CachedTestRun = {
			timestamp: Date.now(),
			results: testResults,
		};
		writeFileSync(cachePath, JSON.stringify(data, null, 2));
	}

	/**
	 * Get last test run info
	 */
	getLastTestRun(): CachedTestRun | null {
		const cachePath = join(this.cacheDir, "last-run.json");
		if (!existsSync(cachePath)) return null;

		try {
			return JSON.parse(readFileSync(cachePath, "utf8"));
		} catch {
			return null;
		}
	}

	/**
	 * Build or update test→source mapping from vitest config
	 * Called periodically or after test file changes
	 */
	updateTestMap(mappings: Record<string, string[]>): void {
		this.ensureCacheDir();
		const cachePath = join(this.cacheDir, "test-map.json");
		writeFileSync(cachePath, JSON.stringify(mappings, null, 2));
	}

	// =========================================================================
	// Private Methods
	// =========================================================================

	/**
	 * Load coverage data from vitest output
	 */
	private loadCoverageData(): CoverageSummary {
		// Try multiple coverage output locations
		const locations = [
			join(this.workspaceRoot, "coverage", "coverage-summary.json"),
			join(this.workspaceRoot, ".vitest", "coverage", "coverage-summary.json"),
			join(this.workspaceRoot, ".nyc_output", "coverage-summary.json"),
		];

		for (const loc of locations) {
			if (existsSync(loc)) {
				try {
					return JSON.parse(readFileSync(loc, "utf8"));
				} catch {
					// Corrupted file, try next
				}
			}
		}

		// Return empty summary if no coverage data found
		return { total: { lines: { pct: 0 }, functions: { pct: 0 }, branches: { pct: 0 } } };
	}

	/**
	 * Build test map from cache or config
	 */
	private buildTestMap(): Record<string, string[]> {
		const cachePath = join(this.cacheDir, "test-map.json");

		if (existsSync(cachePath)) {
			try {
				return JSON.parse(readFileSync(cachePath, "utf8"));
			} catch {
				// Cache corrupted, return empty
			}
		}

		return {};
	}

	/**
	 * Infer test files from naming conventions
	 * Used when no explicit test map exists
	 */
	private inferTestFiles(file: string): string[] {
		const dir = dirname(file);
		const ext = file.endsWith(".tsx") ? ".tsx" : ".ts";
		const base = basename(file, ext);

		// Skip if file is already a test
		if (base.endsWith(".test") || base.endsWith(".spec")) {
			return [];
		}

		const candidates = [
			// Same directory conventions
			join(dir, `${base}.test${ext}`),
			join(dir, `${base}.spec${ext}`),
			// __tests__ directory
			join(dir, "__tests__", `${base}.test${ext}`),
			join(dir, "__tests__", `${base}.spec${ext}`),
			// test directory parallel to src
			dir.replace("/src/", "/test/") + `/${base}.test${ext}`,
			dir.replace("/src/", "/tests/") + `/${base}.test${ext}`,
			// apps/package test directories
			dir.replace(/\/src\//, "/__tests__/") + `/${base}.test${ext}`,
		];

		return candidates.filter((c) => existsSync(c));
	}

	/**
	 * Convert absolute path to relative
	 */
	private toRelative(file: string): string {
		if (file.startsWith(this.workspaceRoot)) {
			return relative(this.workspaceRoot, file);
		}
		return file;
	}

	/**
	 * Ensure cache directory exists
	 */
	private ensureCacheDir(): void {
		if (!existsSync(this.cacheDir)) {
			mkdirSync(this.cacheDir, { recursive: true });
		}
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create TestCoverageService instance
 */
export function createTestCoverageService(workspaceRoot: string): TestCoverageService {
	return new TestCoverageService(workspaceRoot);
}

// =============================================================================
// Singleton per workspace
// =============================================================================

const services = new Map<string, TestCoverageService>();

/**
 * Get or create service for workspace (singleton pattern)
 */
export function getTestCoverageService(workspaceRoot: string): TestCoverageService {
	if (!services.has(workspaceRoot)) {
		services.set(workspaceRoot, new TestCoverageService(workspaceRoot));
	}
	return services.get(workspaceRoot)!;
}
