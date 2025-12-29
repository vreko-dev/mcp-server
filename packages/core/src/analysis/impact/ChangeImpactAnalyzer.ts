/**
 * ChangeImpactAnalyzer
 *
 * Predicts the impact of code changes across the codebase:
 * - Affected tests (which tests might fail)
 * - Breaking changes (API/interface changes)
 * - Performance implications (hot path modifications)
 * - Dependency ripple effects
 *
 * @module analysis/impact/ChangeImpactAnalyzer
 */

import { basename, dirname, relative } from "node:path";
import type { AnalysisContext, AnalysisIssue, Analyzer, AnalyzerResult, Severity } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Change type classification
 */
export type ChangeType =
	| "addition" // New code/file added
	| "modification" // Existing code changed
	| "deletion" // Code/file removed
	| "rename"; // File/symbol renamed

/**
 * Impact severity levels
 */
export type ImpactLevel = "critical" | "high" | "medium" | "low" | "none";

/**
 * Single impacted item
 */
export interface ImpactedItem {
	/** File path or test name */
	path: string;
	/** Why this is impacted */
	reason: string;
	/** How severe the impact is */
	level: ImpactLevel;
	/** Specific lines affected (if known) */
	lines?: number[];
}

/**
 * Breaking change detection result
 */
export interface BreakingChange {
	/** Type of breaking change */
	type: "signature" | "export" | "type" | "behavior" | "deprecation";
	/** What was changed */
	symbol: string;
	/** File containing the change */
	file: string;
	/** Human-readable description */
	description: string;
	/** Severity of the break */
	severity: Severity;
	/** Suggested migration */
	migration?: string;
}

/**
 * Performance impact prediction
 */
export interface PerformanceImpact {
	/** Type of performance concern */
	type: "hotpath" | "memory" | "io" | "computation" | "bundle";
	/** Description of the concern */
	description: string;
	/** Risk level */
	risk: ImpactLevel;
	/** Affected component/function */
	component: string;
	/** Recommendation */
	recommendation?: string;
}

/**
 * Complete impact analysis result
 */
export interface ChangeImpactResult {
	/** Files analyzed */
	filesAnalyzed: number;
	/** Affected tests that should be run */
	affectedTests: ImpactedItem[];
	/** Detected breaking changes */
	breakingChanges: BreakingChange[];
	/** Performance implications */
	performanceImpacts: PerformanceImpact[];
	/** Files that import changed files (ripple effect) */
	dependentFiles: ImpactedItem[];
	/** Overall impact score (0-1) */
	impactScore: number;
	/** Recommended actions */
	recommendations: string[];
	/** Duration of analysis */
	duration: number;
}

// =============================================================================
// Pattern Matchers
// =============================================================================

/**
 * Patterns that indicate exported API
 */
const EXPORT_PATTERNS = [
	/export\s+(const|function|class|interface|type|enum)\s+(\w+)/g,
	/export\s+default\s+(function|class)?\s*(\w+)?/g,
	/export\s+\{([^}]+)\}/g,
];

/**
 * Patterns that indicate function signatures
 */
const _SIGNATURE_PATTERNS = [
	// Function with parameters
	/(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
	// Arrow function
	/(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/g,
	// Method in class
	/(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)/g,
];

/**
 * Patterns indicating performance-sensitive code
 */
const PERFORMANCE_PATTERNS = [
	{ pattern: /\.forEach\s*\(/g, type: "computation" as const, risk: "low" as ImpactLevel },
	{ pattern: /for\s*\(\s*let\s+\w+\s*=\s*0/g, type: "computation" as const, risk: "low" as ImpactLevel },
	{ pattern: /while\s*\(/g, type: "computation" as const, risk: "medium" as ImpactLevel },
	{ pattern: /async\s+function|await\s+/g, type: "io" as const, risk: "medium" as ImpactLevel },
	{ pattern: /new\s+(Map|Set|Array)\s*\(/g, type: "memory" as const, risk: "low" as ImpactLevel },
	{ pattern: /JSON\.(parse|stringify)/g, type: "computation" as const, risk: "medium" as ImpactLevel },
	{ pattern: /readFileSync|writeFileSync/g, type: "io" as const, risk: "high" as ImpactLevel },
	{ pattern: /spawn|exec\s*\(/g, type: "io" as const, risk: "high" as ImpactLevel },
	{ pattern: /import\s*\(/g, type: "bundle" as const, risk: "low" as ImpactLevel },
	{ pattern: /require\s*\(/g, type: "bundle" as const, risk: "medium" as ImpactLevel },
];

/**
 * File patterns that indicate test files
 */
const TEST_FILE_PATTERNS = [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /__tests__\//, /test\//, /tests\//];

// =============================================================================
// ChangeImpactAnalyzer
// =============================================================================

export class ChangeImpactAnalyzer implements Analyzer {
	readonly id = "change-impact";
	readonly name = "Change Impact Analyzer";
	readonly filePatterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];

	private workspaceRoot: string;
	private dependencyGraph: Map<string, string[]> = new Map();
	private reverseDependencyGraph: Map<string, string[]> = new Map();

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}

	/**
	 * Check if this analyzer should run
	 */
	shouldRun(context: AnalysisContext): boolean {
		return context.files.some((f) => this.filePatterns.some((p) => new RegExp(p.replace(/\*/g, ".*")).test(f)));
	}

	/**
	 * Run impact analysis
	 */
	async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
		const start = Date.now();
		const issues: AnalysisIssue[] = [];

		try {
			// Build dependency graph from context
			await this.buildDependencyGraph(context);

			// Analyze each file
			for (const file of context.files) {
				const content = context.contents.get(file);
				if (!content) {
					continue;
				}

				// Detect breaking changes
				const breakingChanges = this.detectBreakingChanges(content, file);
				for (const bc of breakingChanges) {
					issues.push({
						id: `impact/breaking/${bc.type}/${file}/${bc.symbol}`,
						severity: bc.severity,
						type: `BREAKING_${bc.type.toUpperCase()}`,
						message: bc.description,
						file,
						fix: bc.migration,
					});
				}

				// Detect performance impacts
				const perfImpacts = this.detectPerformanceImpacts(content, file);
				for (const pi of perfImpacts) {
					if (pi.risk === "high" || pi.risk === "critical") {
						issues.push({
							id: `impact/perf/${pi.type}/${file}/${pi.component}`,
							severity: pi.risk === "critical" ? "critical" : "high",
							type: `PERF_${pi.type.toUpperCase()}`,
							message: pi.description,
							file,
							fix: pi.recommendation,
						});
					}
				}

				// Check for affected tests
				const affectedTests = this.findAffectedTests(file);
				if (affectedTests.length > 5) {
					issues.push({
						id: `impact/tests/${file}`,
						severity: "medium",
						type: "HIGH_TEST_IMPACT",
						message: `Change affects ${affectedTests.length} test files - consider running full test suite`,
						file,
					});
				}
			}

			return {
				analyzer: this.id,
				success: true,
				issues,
				coverage: 1,
				duration: Date.now() - start,
				metadata: {
					filesAnalyzed: context.files.length,
				},
			};
		} catch (error) {
			return {
				analyzer: this.id,
				success: false,
				issues: [
					{
						id: "impact/error",
						severity: "high",
						type: "ANALYSIS_ERROR",
						message: error instanceof Error ? error.message : String(error),
					},
				],
				coverage: 0,
				duration: Date.now() - start,
			};
		}
	}

	/**
	 * Get full impact analysis (more detailed than standard analyze)
	 */
	async getFullImpact(files: string[], contents: Map<string, string>): Promise<ChangeImpactResult> {
		const start = Date.now();

		// Build context
		const context: AnalysisContext = {
			workspaceRoot: this.workspaceRoot,
			files,
			contents,
		};

		await this.buildDependencyGraph(context);

		const affectedTests: ImpactedItem[] = [];
		const breakingChanges: BreakingChange[] = [];
		const performanceImpacts: PerformanceImpact[] = [];
		const dependentFiles: ImpactedItem[] = [];
		const recommendations: string[] = [];

		for (const file of files) {
			const content = contents.get(file) || "";

			// Find affected tests
			const tests = this.findAffectedTests(file);
			affectedTests.push(...tests);

			// Detect breaking changes
			const breaks = this.detectBreakingChanges(content, file);
			breakingChanges.push(...breaks);

			// Detect performance impacts
			const perfs = this.detectPerformanceImpacts(content, file);
			performanceImpacts.push(...perfs);

			// Find dependent files
			const deps = this.findDependentFiles(file);
			dependentFiles.push(...deps);
		}

		// Calculate impact score
		const impactScore = this.calculateImpactScore(
			affectedTests,
			breakingChanges,
			performanceImpacts,
			dependentFiles,
		);

		// Generate recommendations
		if (breakingChanges.length > 0) {
			recommendations.push(`⚠️ ${breakingChanges.length} breaking change(s) detected - update dependent code`);
		}
		if (affectedTests.length > 10) {
			recommendations.push(`🧪 Run full test suite - ${affectedTests.length} tests potentially affected`);
		}
		if (performanceImpacts.some((p) => p.risk === "high" || p.risk === "critical")) {
			recommendations.push("⚡ Performance-sensitive code modified - run benchmarks");
		}
		if (dependentFiles.length > 20) {
			recommendations.push("🔗 High ripple effect - consider incremental rollout");
		}

		return {
			filesAnalyzed: files.length,
			affectedTests: this.dedupeItems(affectedTests),
			breakingChanges,
			performanceImpacts,
			dependentFiles: this.dedupeItems(dependentFiles),
			impactScore,
			recommendations,
			duration: Date.now() - start,
		};
	}

	// =========================================================================
	// Private Methods
	// =========================================================================

	/**
	 * Build dependency graph from file contents
	 */
	private async buildDependencyGraph(context: AnalysisContext): Promise<void> {
		this.dependencyGraph.clear();
		this.reverseDependencyGraph.clear();

		for (const file of context.files) {
			const content = context.contents.get(file);
			if (!content) {
				continue;
			}

			const imports = this.extractImports(content, file);
			this.dependencyGraph.set(file, imports);

			// Build reverse graph
			for (const imp of imports) {
				const existing = this.reverseDependencyGraph.get(imp) || [];
				existing.push(file);
				this.reverseDependencyGraph.set(imp, existing);
			}
		}
	}

	/**
	 * Extract import statements from file content
	 */
	private extractImports(content: string, fromFile: string): string[] {
		const imports: string[] = [];
		const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
		const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;

		let match;
		while ((match = importRegex.exec(content)) !== null) {
			const importPath = this.resolveImportPath(match[1], fromFile);
			if (importPath) {
				imports.push(importPath);
			}
		}
		while ((match = requireRegex.exec(content)) !== null) {
			const importPath = this.resolveImportPath(match[1], fromFile);
			if (importPath) {
				imports.push(importPath);
			}
		}

		return imports;
	}

	/**
	 * Resolve import path to absolute file path
	 */
	private resolveImportPath(importPath: string, fromFile: string): string | null {
		// Skip external packages
		if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
			return null;
		}

		const dir = dirname(fromFile);
		const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];

		for (const ext of extensions) {
			const resolved = `${dir}/${importPath}${ext}`.replace(/\/\.\//g, "/");
			return resolved;
		}

		return null;
	}

	/**
	 * Find test files that might be affected by a change
	 */
	private findAffectedTests(file: string): ImpactedItem[] {
		const tests: ImpactedItem[] = [];
		const relPath = relative(this.workspaceRoot, file);
		const fileName = basename(file).replace(/\.[tj]sx?$/, "");

		// Direct test files for this source
		const directTestPatterns = [
			`${fileName}.test.ts`,
			`${fileName}.test.tsx`,
			`${fileName}.spec.ts`,
			`${fileName}.spec.tsx`,
			`__tests__/${fileName}.test.ts`,
			`__tests__/${fileName}.test.tsx`,
		];

		for (const pattern of directTestPatterns) {
			tests.push({
				path: pattern,
				reason: "Direct test file for changed source",
				level: "high",
			});
		}

		// Files that import this file might have tests
		const importers = this.reverseDependencyGraph.get(file) || [];
		for (const importer of importers) {
			if (this.isTestFile(importer)) {
				tests.push({
					path: relative(this.workspaceRoot, importer),
					reason: "Test file imports changed module",
					level: "medium",
				});
			}
		}

		// Integration tests if this is a core module
		if (relPath.includes("/core/") || relPath.includes("/services/")) {
			tests.push({
				path: "**/*.integration.test.ts",
				reason: "Core module change may affect integration tests",
				level: "low",
			});
		}

		return tests;
	}

	/**
	 * Check if a file is a test file
	 */
	private isTestFile(file: string): boolean {
		return TEST_FILE_PATTERNS.some((p) => p.test(file));
	}

	/**
	 * Detect breaking changes in content
	 */
	private detectBreakingChanges(content: string, file: string): BreakingChange[] {
		const breaks: BreakingChange[] = [];

		// Check for exported symbols
		for (const pattern of EXPORT_PATTERNS) {
			const regex = new RegExp(pattern.source, pattern.flags);
			let match;
			while ((match = regex.exec(content)) !== null) {
				const symbolName = match[2] || match[1];
				if (symbolName) {
					// Check if this is a potential breaking change
					// (In a real implementation, we'd compare with previous version)
					breaks.push({
						type: "export",
						symbol: symbolName,
						file,
						description: `Exported symbol '${symbolName}' may have changed`,
						severity: "medium",
						migration: `Verify consumers of '${symbolName}' are updated`,
					});
				}
			}
		}

		// Check for interface/type changes
		const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*\{([^}]+)\}/g;
		let match;
		while ((match = interfaceRegex.exec(content)) !== null) {
			const interfaceName = match[1];
			const body = match[2];

			// Check for optional vs required changes (simplified)
			if (body.includes("?:") || body.includes(": ")) {
				breaks.push({
					type: "type",
					symbol: interfaceName,
					file,
					description: `Interface '${interfaceName}' definition changed`,
					severity: "medium",
				});
			}
		}

		return breaks;
	}

	/**
	 * Detect performance-sensitive code changes
	 */
	private detectPerformanceImpacts(content: string, file: string): PerformanceImpact[] {
		const impacts: PerformanceImpact[] = [];

		for (const { pattern, type, risk } of PERFORMANCE_PATTERNS) {
			const regex = new RegExp(pattern.source, pattern.flags);
			let match;
			while ((match = regex.exec(content)) !== null) {
				impacts.push({
					type,
					description: `${type} operation detected: ${match[0]}`,
					risk,
					component: basename(file),
					recommendation: this.getPerformanceRecommendation(type),
				});
			}
		}

		return impacts;
	}

	/**
	 * Get recommendation for performance issue type
	 */
	private getPerformanceRecommendation(type: PerformanceImpact["type"]): string {
		switch (type) {
			case "hotpath":
				return "Consider memoization or caching for hot paths";
			case "memory":
				return "Monitor memory usage, consider object pooling";
			case "io":
				return "Use async operations, consider batching";
			case "computation":
				return "Profile for bottlenecks, consider Web Workers";
			case "bundle":
				return "Use dynamic imports for code splitting";
			default:
				return "Profile before optimizing";
		}
	}

	/**
	 * Find files that depend on changed file
	 */
	private findDependentFiles(file: string): ImpactedItem[] {
		const dependents: ImpactedItem[] = [];
		const visited = new Set<string>();

		const traverse = (current: string, depth: number) => {
			if (visited.has(current) || depth > 3) {
				return;
			}
			visited.add(current);

			const importers = this.reverseDependencyGraph.get(current) || [];
			for (const importer of importers) {
				dependents.push({
					path: relative(this.workspaceRoot, importer),
					reason: depth === 0 ? "Directly imports changed file" : `Transitive dependency (depth ${depth})`,
					level: depth === 0 ? "high" : depth === 1 ? "medium" : "low",
				});
				traverse(importer, depth + 1);
			}
		};

		traverse(file, 0);
		return dependents;
	}

	/**
	 * Calculate overall impact score
	 */
	private calculateImpactScore(
		tests: ImpactedItem[],
		breaks: BreakingChange[],
		perfs: PerformanceImpact[],
		deps: ImpactedItem[],
	): number {
		let score = 0;

		// Weight by category
		score += Math.min(tests.length * 0.05, 0.25);
		score += Math.min(breaks.length * 0.15, 0.35);
		score += Math.min(perfs.filter((p) => p.risk === "high").length * 0.1, 0.2);
		score += Math.min(deps.length * 0.02, 0.2);

		return Math.min(score, 1);
	}

	/**
	 * Deduplicate impact items
	 */
	private dedupeItems(items: ImpactedItem[]): ImpactedItem[] {
		const seen = new Set<string>();
		return items.filter((item) => {
			if (seen.has(item.path)) {
				return false;
			}
			seen.add(item.path);
			return true;
		});
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create ChangeImpactAnalyzer instance
 */
export function createChangeImpactAnalyzer(workspaceRoot: string): ChangeImpactAnalyzer {
	return new ChangeImpactAnalyzer(workspaceRoot);
}
