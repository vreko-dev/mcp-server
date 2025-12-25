/**
 * Pattern Detector
 *
 * Detects coding patterns in a workspace using regex and AST analysis.
 *
 * @module patterns/PatternDetector
 */

import { readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { glob } from "fast-glob";
import { createBuiltInMatchers } from "./matchers/index.js";
import type {
	DetectionError,
	FoundPattern,
	MissingPattern,
	PatternDetectionResult,
	PatternDetectorConfig,
	PatternMatch,
	PatternMatcher,
} from "./types.js";

// =============================================================================
// PATTERN DETECTOR
// =============================================================================

/**
 * Pattern Detector - analyzes codebases for coding patterns
 *
 * Supports both regex-based and AST-based pattern detection.
 *
 * @example
 * ```typescript
 * const detector = new PatternDetector({
 *   workspaceRoot: "/path/to/project",
 *   useAst: true,
 * });
 *
 * const result = await detector.detect();
 * console.log(result.foundPatterns);
 * ```
 */
export class PatternDetector {
	private readonly config: Required<PatternDetectorConfig>;
	private readonly matchers: PatternMatcher[];

	constructor(config: PatternDetectorConfig) {
		this.config = {
			workspaceRoot: config.workspaceRoot,
			include: config.include ?? ["**/*.{ts,tsx,js,jsx}"],
			exclude: config.exclude ?? [
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/.git/**",
				"**/*.min.js",
				"**/*.d.ts",
			],
			maxFiles: config.maxFiles ?? 1000,
			useAst: config.useAst ?? false,
			fileTimeout: config.fileTimeout ?? 5000,
		};

		this.matchers = createBuiltInMatchers();
	}

	/**
	 * Add a custom pattern matcher
	 */
	addMatcher(matcher: PatternMatcher): void {
		this.matchers.push(matcher);
	}

	/**
	 * Detect patterns in the workspace
	 */
	async detect(matcherIds?: string[]): Promise<PatternDetectionResult> {
		const startTime = Date.now();
		const errors: DetectionError[] = [];

		// Get files to scan
		const files = await this.getFilesToScan();

		// Filter matchers if specific IDs provided
		const matchersToRun = matcherIds ? this.matchers.filter((m) => matcherIds.includes(m.id)) : this.matchers;

		// Group files by pattern for efficient matching
		const fileContents = new Map<string, string>();

		// Read all files
		for (const file of files.slice(0, this.config.maxFiles)) {
			try {
				const content = await this.readFileWithTimeout(file);
				fileContents.set(file, content);
			} catch (error) {
				errors.push({
					file: relative(this.config.workspaceRoot, file),
					message: error instanceof Error ? error.message : String(error),
					type: "read",
				});
			}
		}

		// Run matchers
		const foundPatterns: FoundPattern[] = [];
		const checkedPatterns = new Set<string>();

		for (const matcher of matchersToRun) {
			checkedPatterns.add(matcher.id);

			try {
				const matches = await this.runMatcher(matcher, fileContents);

				if (matches.length > 0) {
					foundPatterns.push({
						id: matcher.id,
						name: matcher.name,
						category: matcher.category,
						locations: matches,
						strength: this.calculateStrength(matches, fileContents.size),
						isPositive: matcher.isPositive,
					});
				}
			} catch (error) {
				errors.push({
					file: "N/A",
					message: `Matcher ${matcher.id} failed: ${error instanceof Error ? error.message : String(error)}`,
					type: "unknown",
				});
			}
		}

		// Find missing patterns
		const missingPatterns = this.findMissingPatterns(foundPatterns, matchersToRun);

		return {
			foundPatterns,
			missingPatterns,
			scannedFiles: fileContents.size,
			duration: Date.now() - startTime,
			errors,
		};
	}

	/**
	 * Detect patterns in a single file
	 */
	async detectInFile(filePath: string, matcherIds?: string[]): Promise<PatternDetectionResult> {
		const startTime = Date.now();
		const errors: DetectionError[] = [];

		const matchersToRun = matcherIds ? this.matchers.filter((m) => matcherIds.includes(m.id)) : this.matchers;

		let content: string;
		try {
			content = await readFile(filePath, "utf-8");
		} catch (error) {
			return {
				foundPatterns: [],
				missingPatterns: [],
				scannedFiles: 0,
				duration: Date.now() - startTime,
				errors: [
					{
						file: filePath,
						message: error instanceof Error ? error.message : String(error),
						type: "read",
					},
				],
			};
		}

		const fileContents = new Map([[filePath, content]]);
		const foundPatterns: FoundPattern[] = [];

		for (const matcher of matchersToRun) {
			// Check if this matcher should run on this file
			if (!this.matcherAppliesToFile(matcher, filePath)) {
				continue;
			}

			try {
				const matches = await this.runMatcher(matcher, fileContents);

				if (matches.length > 0) {
					foundPatterns.push({
						id: matcher.id,
						name: matcher.name,
						category: matcher.category,
						locations: matches,
						strength: 1.0, // Single file, so strength is binary
						isPositive: matcher.isPositive,
					});
				}
			} catch (error) {
				errors.push({
					file: filePath,
					message: `Matcher ${matcher.id} failed: ${error instanceof Error ? error.message : String(error)}`,
					type: "unknown",
				});
			}
		}

		const missingPatterns = this.findMissingPatterns(
			foundPatterns,
			matchersToRun.filter((m) => this.matcherAppliesToFile(m, filePath)),
		);

		return {
			foundPatterns,
			missingPatterns,
			scannedFiles: 1,
			duration: Date.now() - startTime,
			errors,
		};
	}

	/**
	 * Get all registered matchers
	 */
	getMatchers(): PatternMatcher[] {
		return [...this.matchers];
	}

	/**
	 * Get matcher by ID
	 */
	getMatcher(id: string): PatternMatcher | undefined {
		return this.matchers.find((m) => m.id === id);
	}

	// =========================================================================
	// PRIVATE METHODS
	// =========================================================================

	private async getFilesToScan(): Promise<string[]> {
		const patterns = this.config.include.map((p) => join(this.config.workspaceRoot, p));

		const files = await glob(patterns, {
			ignore: this.config.exclude,
			absolute: true,
			onlyFiles: true,
		});

		return files;
	}

	private async readFileWithTimeout(filePath: string): Promise<string> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.config.fileTimeout);

		try {
			// Check file size first
			const stats = await stat(filePath);
			if (stats.size > 1024 * 1024) {
				// Skip files > 1MB
				throw new Error("File too large");
			}

			const content = await readFile(filePath, { encoding: "utf-8" });
			return content;
		} finally {
			clearTimeout(timeout);
		}
	}

	private async runMatcher(matcher: PatternMatcher, fileContents: Map<string, string>): Promise<PatternMatch[]> {
		const allMatches: PatternMatch[] = [];

		for (const [filePath, content] of fileContents) {
			// Check if this matcher applies to this file
			if (!this.matcherAppliesToFile(matcher, filePath)) {
				continue;
			}

			// Run the matcher
			const matches = await matcher.match(content, filePath);
			allMatches.push(...matches);
		}

		return allMatches;
	}

	private matcherAppliesToFile(matcher: PatternMatcher, filePath: string): boolean {
		const relativePath = relative(this.config.workspaceRoot, filePath);

		return matcher.files.some((pattern) => {
			const regex = this.globToRegex(pattern);
			return regex.test(relativePath);
		});
	}

	private globToRegex(pattern: string): RegExp {
		const escaped = pattern
			.replace(/\./g, "\\.")
			.replace(/\{([^}]+)\}/g, "($1)")
			.replace(/,/g, "|")
			.replace(/\*\*/g, ".*")
			.replace(/\*/g, "[^/]*");

		return new RegExp(`^${escaped}$`);
	}

	private calculateStrength(matches: PatternMatch[], totalFiles: number): number {
		if (totalFiles === 0) return 0;

		// Unique files with matches
		const uniqueFiles = new Set(matches.map((m) => m.file)).size;

		// Base strength on coverage and confidence
		const coverage = Math.min(uniqueFiles / totalFiles, 1);
		const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;

		// Weighted combination
		return coverage * 0.6 + avgConfidence * 0.4;
	}

	private findMissingPatterns(found: FoundPattern[], matchers: PatternMatcher[]): MissingPattern[] {
		const foundIds = new Set(found.map((f) => f.id));

		return matchers
			.filter((m) => !foundIds.has(m.id) && m.isPositive)
			.map((m) => ({
				id: m.id,
				name: m.name,
				category: m.category,
				importance: m.importance,
				reason: m.description,
			}));
	}
}
