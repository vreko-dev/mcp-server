/**
 * Semantic Pattern Validator
 *
 * Detects deprecated code patterns in user code when upgrading packages.
 * Uses migration pattern database to provide specific migration guidance.
 *
 * Example:
 * - Detects ReactDOM.render() when upgrading to React 18
 * - Suggests createRoot() replacement with code example
 *
 * @module SemanticPatternValidator
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "@snapback/infrastructure";

// Load migration patterns at module initialization
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPatterns = JSON.parse(readFileSync(join(__dirname, "migration-patterns.json"), "utf-8"));

export interface DeprecatedPatternMatch {
	pattern: string;
	location: {
		file?: string;
		line?: number;
		code: string;
	};
	deprecated: string;
	replacement: string;
	reason: string;
	severity: "critical" | "high" | "medium" | "low";
	exampleBefore: string;
	exampleAfter: string;
	codemodAvailable: boolean;
}

export interface PatternValidationResult {
	packageName: string;
	fromVersion: string;
	toVersion: string;
	deprecatedPatterns: DeprecatedPatternMatch[];
	newFeatures: string[];
	migrationComplexity: "simple" | "moderate" | "complex";
	estimatedEffort: string;
}

/**
 * Validates user code against known migration patterns
 */
export class SemanticPatternValidator {
	private patterns: typeof migrationPatterns;

	constructor() {
		this.patterns = migrationPatterns;
	}

	/**
	 * Validate code against migration patterns for a package upgrade
	 */
	async validateCodePatterns(
		packageName: string,
		fromVersion: string,
		toVersion: string,
		userCode?: string,
	): Promise<PatternValidationResult> {
		const result: PatternValidationResult = {
			packageName,
			fromVersion,
			toVersion,
			deprecatedPatterns: [],
			newFeatures: [],
			migrationComplexity: "simple",
			estimatedEffort: "< 1 hour",
		};

		try {
			// Find migration pattern for this upgrade
			const migrationKey = this.findMigrationPattern(packageName, fromVersion, toVersion);

			if (!migrationKey) {
				logger.info("No migration patterns found for upgrade", {
					package: packageName,
					from: fromVersion,
					to: toVersion,
				});
				return result;
			}

			const migration = this.getMigrationData(migrationKey);

			if (!migration) {
				return result;
			}

			// Extract new features
			result.newFeatures = (migration.new_features || []).map((f: any) => `${f.name}: ${f.description}`);

			// If user code provided, scan for deprecated patterns
			if (userCode) {
				for (const breakingChange of migration.breaking_changes || []) {
					const matches = this.findPatternInCode(userCode, breakingChange);
					result.deprecatedPatterns.push(...matches);
				}
			} else {
				// No code provided - return all potential breaking changes
				for (const breakingChange of migration.breaking_changes || []) {
					result.deprecatedPatterns.push({
						pattern: breakingChange.pattern,
						location: {
							code: breakingChange.deprecated,
						},
						deprecated: breakingChange.deprecated,
						replacement: breakingChange.replacement,
						reason: breakingChange.reason,
						severity: breakingChange.severity as any,
						exampleBefore: breakingChange.example_before || "",
						exampleAfter: breakingChange.example_after || "",
						codemodAvailable: breakingChange.codemod_available || false,
					});
				}
			}

			// Calculate migration complexity
			result.migrationComplexity = this.assessComplexity(result.deprecatedPatterns);
			result.estimatedEffort = this.estimateEffort(result.deprecatedPatterns);

			return result;
		} catch (error) {
			logger.error("Semantic pattern validation failed", {
				error: error instanceof Error ? error.message : String(error),
				package: packageName,
			});

			return result;
		}
	}

	/**
	 * Find migration pattern key for package upgrade
	 */
	private findMigrationPattern(packageName: string, fromVersion: string, toVersion: string): string | null {
		const patterns = this.patterns.patterns as any;

		if (!patterns[packageName]) {
			return null;
		}

		// Extract major versions
		const fromMajor = this.extractMajorVersion(fromVersion);
		const toMajor = this.extractMajorVersion(toVersion);

		// Look for migration pattern
		const key = `${fromMajor}->${toMajor}`;

		if (patterns[packageName][key]) {
			return `${packageName}.${key}`;
		}

		return null;
	}

	/**
	 * Get migration data for a pattern key
	 */
	private getMigrationData(key: string): any {
		const [packageName, versionRange] = key.split(".");
		const patterns = this.patterns.patterns as any;

		return patterns[packageName]?.[versionRange];
	}

	/**
	 * Extract major version from semver string
	 */
	private extractMajorVersion(version: string): string {
		const cleaned = version.replace(/^[^0-9]*/, "");
		const parts = cleaned.split(".");
		return parts[0] || "0";
	}

	/**
	 * Find deprecated pattern in user code
	 */
	private findPatternInCode(code: string, breakingChange: any): DeprecatedPatternMatch[] {
		const matches: DeprecatedPatternMatch[] = [];

		// Create regex pattern from deprecated syntax
		const pattern = this.createPatternRegex(breakingChange.pattern);

		if (!pattern) {
			return matches;
		}

		const lines = code.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const match = pattern.exec(line);

			if (match) {
				matches.push({
					pattern: breakingChange.pattern,
					location: {
						line: i + 1,
						code: line.trim(),
					},
					deprecated: breakingChange.deprecated,
					replacement: breakingChange.replacement,
					reason: breakingChange.reason,
					severity: breakingChange.severity,
					exampleBefore: breakingChange.example_before || "",
					exampleAfter: breakingChange.example_after || "",
					codemodAvailable: breakingChange.codemod_available || false,
				});
			}
		}

		return matches;
	}

	/**
	 * Create regex pattern for deprecated syntax detection
	 */
	private createPatternRegex(patternName: string): RegExp | null {
		// Map pattern names to regex
		const regexMap: Record<string, RegExp> = {
			"ReactDOM.render": /ReactDOM\.render\s*\(/,
			"ReactDOM.hydrate": /ReactDOM\.hydrate\s*\(/,
			unmountComponentAtNode: /ReactDOM\.unmountComponentAtNode\s*\(/,
			getServerSideProps: /export\s+async\s+function\s+getServerSideProps/,
			"useQuery signature": /useQuery\s*\(\s*['"`]/,
			"Vue instance creation": /new\s+Vue\s*\(/,
			"v-model on components": /props:\s*\[['"`]value['"`]\]/,
		};

		return regexMap[patternName] || null;
	}

	/**
	 * Assess migration complexity based on deprecated patterns
	 */
	private assessComplexity(patterns: DeprecatedPatternMatch[]): "simple" | "moderate" | "complex" {
		if (patterns.length === 0) return "simple";

		const criticalCount = patterns.filter((p) => p.severity === "critical").length;
		const highCount = patterns.filter((p) => p.severity === "high").length;

		if (criticalCount > 0 || patterns.length > 10) return "complex";
		if (highCount > 2 || patterns.length > 5) return "moderate";

		return "simple";
	}

	/**
	 * Estimate migration effort
	 */
	private estimateEffort(patterns: DeprecatedPatternMatch[]): string {
		if (patterns.length === 0) return "< 1 hour";

		const hasCodemod = patterns.some((p) => p.codemodAvailable);
		const criticalCount = patterns.filter((p) => p.severity === "critical").length;

		if (hasCodemod && patterns.length < 10) {
			return "1-2 hours (codemod available)";
		}

		if (criticalCount > 0 || patterns.length > 10) {
			return "1-2 days (manual migration required)";
		}

		if (patterns.length > 5) {
			return "4-8 hours";
		}

		return "2-4 hours";
	}

	/**
	 * Generate migration checklist
	 */
	generateMigrationChecklist(validation: PatternValidationResult): string[] {
		const checklist: string[] = [];

		checklist.push(
			`# Migration Checklist: ${validation.packageName} ${validation.fromVersion} → ${validation.toVersion}`,
		);
		checklist.push("");

		checklist.push(`**Complexity:** ${validation.migrationComplexity}`);
		checklist.push(`**Estimated Effort:** ${validation.estimatedEffort}`);
		checklist.push("");

		if (validation.deprecatedPatterns.length > 0) {
			checklist.push("## Deprecated Patterns to Update");
			checklist.push("");

			const grouped = this.groupByFile(validation.deprecatedPatterns);

			for (const [file, patterns] of Object.entries(grouped)) {
				if (file !== "unknown") {
					checklist.push(`### ${file}`);
				}

				for (const pattern of patterns) {
					checklist.push(`- [ ] **${pattern.pattern}** (${pattern.severity})`);
					checklist.push(`  - Current: \`${pattern.deprecated}\``);
					checklist.push(`  - Replace with: \`${pattern.replacement}\``);
					checklist.push(`  - Reason: ${pattern.reason}`);

					if (pattern.location.line) {
						checklist.push(`  - Line ${pattern.location.line}: \`${pattern.location.code}\``);
					}

					if (pattern.codemodAvailable) {
						checklist.push("  - ✅ Codemod available");
					}

					checklist.push("");
				}
			}
		}

		if (validation.newFeatures.length > 0) {
			checklist.push("## New Features Available");
			checklist.push("");

			for (const feature of validation.newFeatures) {
				checklist.push(`- ${feature}`);
			}

			checklist.push("");
		}

		checklist.push("## Migration Steps");
		checklist.push("");
		checklist.push("1. Create backup/snapshot before starting");
		checklist.push("2. Update package version in package.json");
		checklist.push("3. Run codemod if available");
		checklist.push("4. Update deprecated patterns manually");
		checklist.push("5. Run tests and fix any issues");
		checklist.push("6. Review new features and adopt where beneficial");

		return checklist;
	}

	/**
	 * Group patterns by file
	 */
	private groupByFile(patterns: DeprecatedPatternMatch[]): Record<string, DeprecatedPatternMatch[]> {
		const grouped: Record<string, DeprecatedPatternMatch[]> = {};

		for (const pattern of patterns) {
			const file = pattern.location.file || "unknown";

			if (!grouped[file]) {
				grouped[file] = [];
			}

			grouped[file].push(pattern);
		}

		return grouped;
	}
}
