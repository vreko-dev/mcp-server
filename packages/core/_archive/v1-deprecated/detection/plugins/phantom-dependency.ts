import type { Logger } from "@snapback/contracts";
import { createSilentLogger } from "@snapback/contracts";
import type { AnalysisResult } from "../../guardian";
import { FusedScanner } from "../scanner/FusedScanner";
import type { DetectionPlugin } from "../types";
import { findPackageJson, getAllDeclaredDependencies } from "../utils/package-parser";

// Simple Levenshtein distance implementation for near-miss detection
function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) {
		return b.length;
	}
	if (b.length === 0) {
		return a.length;
	}

	const matrix = [];

	// Increment along the first column of each row
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	// Increment each column in the first row
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	// Fill in the rest of the matrix
	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1, // substitution
					matrix[i][j - 1] + 1, // insertion
					matrix[i - 1][j] + 1, // deletion
				);
			}
		}
	}

	return matrix[b.length][a.length];
}

/**
 * Phantom Dependency Plugin
 * Detects when AI coding assistants make potentially problematic changes related to missing dependencies
 */
export class PhantomDependencyPlugin implements DetectionPlugin {
	readonly name = "PhantomDependencyPlugin";

	private scanner = new FusedScanner();
	private logger: Logger;

	/**
	 * Creates a new PhantomDependencyPlugin
	 *
	 * @param logger - Logger for debug/info messages (optional)
	 */
	constructor(logger?: Logger) {
		this.logger = logger || createSilentLogger();
		// Register import patterns
		this.scanner.register({
			id: "es6_import",
			regex: /import\s+.*?\s+from\s+["'](.*?)[?#]?.*?["']/g,
		});
		this.scanner.register({
			id: "side_effect_import",
			regex: /import\s+["'](.*?)[?#]?.*?["']/g,
		});
		this.scanner.register({
			id: "require_call",
			regex: /require\(["'](.*?)[?#]?.*?["']\)/g,
		});
		this.scanner.register({
			id: "dynamic_import",
			regex: /import\(["'](.*?)[?#]?.*?["']\)/g,
		});
	}

	/**
	 * Analyze content for potential phantom dependencies
	 *
	 * @param content - File content to analyze
	 * @param filePath - Optional file path for context
	 * @returns Analysis result with score, factors, and recommendations
	 */
	async analyze(content: string, filePath?: string): Promise<AnalysisResult> {
		// Early exits for safe contexts
		if (!content || content.length === 0) {
			return this.createEmptyResult();
		}

		// Need file path to check package.json
		if (!filePath) {
			return this.createEmptyResult();
		}

		let score = 0;
		const factors: string[] = [];
		const recommendations: string[] = [];
		let severity: "low" | "medium" | "high" | "critical" = "low";

		try {
			// Use FusedScanner to extract imports in a single pass
			const matches = this.scanner.scan(content);
			const allImports: string[] = [];

			// Extract import paths from matches
			for (const match of matches) {
				// Skip type-only imports
				if (match.match.trim().startsWith("import type ")) {
					continue;
				}

				// Extract the import path using a separate regex
				const pathMatch = match.match.match(/["']([^"']*)/);
				if (pathMatch?.[1]) {
					// Remove query parameters and hash fragments
					const cleanPath = pathMatch[1].split(/[?#]/)[0];
					allImports.push(cleanPath);
				}
			}

			// Find package.json
			const packageJson = findPackageJson(filePath);

			// If we can't find package.json, return empty result
			if (!packageJson) {
				return this.createEmptyResult();
			}

			// Get all declared dependencies
			const declaredDeps = getAllDeclaredDependencies(packageJson);

			// Check for phantom dependencies
			const phantomDeps: string[] = [];
			const typosquatDeps: Array<{ importPath: string; suggestion: string }> = [];

			for (const importPath of allImports) {
				// Skip relative imports that don't point to node_modules
				if (importPath.startsWith(".") || importPath.startsWith("/")) {
					// But don't skip imports that point to node_modules
					if (!importPath.includes("node_modules")) {
						continue;
					}
				}

				// Skip Node.js built-ins
				const nodeBuiltIns = new Set([
					"fs",
					"path",
					"http",
					"https",
					"url",
					"util",
					"os",
					"crypto",
					"stream",
					"events",
					"buffer",
					"assert",
					"child_process",
					"cluster",
					"dgram",
					"dns",
					"domain",
					"module",
					"net",
					"process",
					"punycode",
					"querystring",
					"readline",
					"repl",
					"tls",
					"tty",
					"vm",
					"zlib",
					"v8",
					"worker_threads",
				]);

				if (nodeBuiltIns.has(importPath)) {
					continue;
				}

				// Skip monorepo workspace packages
				if (importPath.startsWith("@snapback/")) {
					continue;
				}

				// Skip type-only imports (simplified check)
				if (importPath.startsWith("@types/")) {
					continue;
				}

				// Check if dependency is declared (case-sensitive)
				let found = false;

				// Check if dependency is declared
				for (const declaredDep of declaredDeps) {
					if (declaredDep === importPath) {
						found = true;
						break;
					}
				}

				if (!found) {
					// Also check for subpath imports (e.g., lodash/map)
					const parts = importPath.split("/");
					// Check progressively shorter package names
					for (let i = 1; i <= parts.length; i++) {
						const potentialPackage = parts.slice(0, i).join("/");
						for (const declaredDep of declaredDeps) {
							if (declaredDep === potentialPackage) {
								found = true;
								break;
							}
						}
						if (found) {
							break;
						}
					}

					if (!found) {
						// Check for typosquatting / near-miss dependencies
						let bestMatch = "";
						let minDistance = Number.POSITIVE_INFINITY;

						for (const declaredDep of declaredDeps) {
							const distance = levenshteinDistance(importPath, declaredDep);
							// Only consider matches with reasonable edit distance
							if (distance < minDistance && distance <= 3 && distance > 0) {
								minDistance = distance;
								bestMatch = declaredDep;
							}
						}

						if (bestMatch) {
							typosquatDeps.push({ importPath, suggestion: bestMatch });
							// Higher severity for typosquat dependencies
							score = Math.min(1.0, score + 0.3);
						} else {
							phantomDeps.push(importPath);
						}
					}
				}
			}

			// Calculate score based on phantom dependencies found using moderated scaling
			if (phantomDeps.length > 0 || typosquatDeps.length > 0) {
				// Use moderated scaling to prevent high scores for many dependencies while maintaining reasonable scores
				const scaledCount = this.moderatedScaling(phantomDeps.length + typosquatDeps.length, 1.0);
				score = Math.min(1.0, score + scaledCount * 0.7);

				if (phantomDeps.length > 0) {
					factors.push(`phantom dependencies detected: ${phantomDeps.join(", ")}`);
				}

				if (typosquatDeps.length > 0) {
					const typosquatList = typosquatDeps
						.map((t) => `${t.importPath} (did you mean ${t.suggestion}?)`)
						.join(", ");
					factors.push(`typosquat dependencies detected: ${typosquatList}`);
					// Higher severity for typosquat dependencies
					if (typosquatDeps.length >= 2) {
						severity = "high";
					} else if (typosquatDeps.length >= 1) {
						severity = "critical";
					}
				}

				if (phantomDeps.length + typosquatDeps.length >= 3) {
					severity = "high";
				} else if (phantomDeps.length + typosquatDeps.length >= 1) {
					severity = "medium";
				}

				// Log for debugging
				this.logger.info("Phantom dependency detection found potential issues", {
					filePath,
					score,
					factors,
					severity,
					phantomDeps,
					allImports,
					declaredDeps: Array.from(declaredDeps),
				});
			}

			// Recommendations
			if (score > 0.3) {
				recommendations.push("Add missing dependencies to package.json");
				recommendations.push("Run 'pnpm install' to install missing packages");
				recommendations.push("Verify that all imports are properly declared");
			}

			// Log for debugging
			if (score > 0.3) {
				this.logger.info("Phantom dependency detection found potential issues", {
					filePath,
					score,
					factors,
					severity,
					phantomDeps,
				});
			}
		} catch (error) {
			this.logger.warn("Error in PhantomDependencyPlugin", { error, filePath });
			// Fail gracefully
			return this.createEmptyResult();
		}

		return {
			score,
			factors,
			recommendations,
			severity,
		};
	}

	/**
	 * Create an empty analysis result
	 *
	 * @returns Empty analysis result
	 */
	private createEmptyResult(): AnalysisResult {
		return {
			score: 0,
			factors: [],
			recommendations: [],
		};
	}

	/**
	 * Apply moderated scaling to prevent score explosion while maintaining reasonable scores
	 *
	 * @param count - Number of matches
	 * @param baseWeight - Base weight for the pattern
	 * @returns Scaled weight that increases slowly with count
	 */
	private moderatedScaling(count: number, baseWeight: number): number {
		if (count === 0) {
			return 0;
		}
		if (count === 1) {
			return baseWeight;
		}
		// Use a moderated logarithmic scaling: baseWeight * (1 + 0.3 * log10(count))
		// This allows for slight increases with multiple matches while preventing explosion
		return baseWeight * (1 + 0.3 * Math.log10(count));
	}
}
