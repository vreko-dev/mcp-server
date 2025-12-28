/**
 * ErrorPatternRegistry - Map common error patterns to likely solutions
 *
 * Provides proactive guidance by matching error messages to known solutions.
 * Used by begin_task and quick_check to surface actionable hints.
 *
 * @module services/error-pattern-registry
 */

// =============================================================================
// Types
// =============================================================================

export interface ErrorPattern {
	/** Unique identifier */
	id: string;
	/** Regex or string pattern to match */
	pattern: RegExp | string;
	/** Category for grouping */
	category: "typescript" | "filesystem" | "module" | "build" | "test" | "lint";
	/** Brief description of the error */
	description: string;
	/** Likely solutions (ordered by probability) */
	solutions: string[];
	/** Auto-fixable via simple action */
	autoFixable: boolean;
	/** Auto-fix action if applicable */
	autoFix?: {
		action: "create_file" | "install_package" | "run_command" | "normalize_path";
		params?: Record<string, string>;
	};
	/** Confidence score (0-1) */
	confidence: number;
}

export interface MatchResult {
	pattern: ErrorPattern;
	match: RegExpMatchArray | null;
	/** Extracted values from pattern groups */
	extracted: Record<string, string>;
}

// =============================================================================
// Registry
// =============================================================================

/**
 * Built-in error patterns
 * Ordered by specificity (more specific patterns first)
 */
const BUILT_IN_PATTERNS: ErrorPattern[] = [
	// TypeScript errors
	{
		id: "ts-property-not-exist",
		pattern: /error TS2339: Property '([^']+)' does not exist on type '([^']+)'/,
		category: "typescript",
		description: "Property access on incompatible type",
		solutions: [
			"Add the property to the type definition",
			"Use type assertion if property exists at runtime",
			"Check for typos in property name",
		],
		autoFixable: false,
		confidence: 0.9,
	},
	{
		id: "ts-type-not-assignable",
		pattern: /error TS2322: Type '([^']+)' is not assignable to type '([^']+)'/,
		category: "typescript",
		description: "Type mismatch in assignment",
		solutions: [
			"Fix the value to match expected type",
			"Update the type definition to accept the value",
			"Use type assertion if intentional",
		],
		autoFixable: false,
		confidence: 0.9,
	},
	{
		id: "ts-argument-not-assignable",
		pattern: /error TS2345: Argument of type '([^']+)' is not assignable to parameter of type '([^']+)'/,
		category: "typescript",
		description: "Function argument type mismatch",
		solutions: [
			"Fix the argument value to match expected type",
			"Update function signature to accept the type",
			"Use type assertion if intentional",
		],
		autoFixable: false,
		confidence: 0.9,
	},
	{
		id: "ts-cannot-find-name",
		pattern: /error TS2304: Cannot find name '([^']+)'/,
		category: "typescript",
		description: "Reference to undefined identifier",
		solutions: ["Import the missing symbol", "Check for typos in the name", "Declare the variable/type"],
		autoFixable: false,
		confidence: 0.85,
	},
	{
		id: "ts-module-not-found",
		pattern: /error TS2307: Cannot find module '([^']+)'/,
		category: "typescript",
		description: "Module resolution failure",
		solutions: [
			"Install the package: npm install <package>",
			"Check package.json for the dependency",
			"Verify tsconfig paths configuration",
		],
		autoFixable: true,
		autoFix: {
			action: "install_package",
		},
		confidence: 0.9,
	},

	// Filesystem errors
	{
		id: "fs-enoent",
		pattern: /ENOENT: no such file or directory(?:, (?:open|stat|read) '([^']+)')?/,
		category: "filesystem",
		description: "File or directory not found",
		solutions: [
			"Create the missing file/directory",
			"Check the path for typos",
			"Normalize path separators for cross-platform",
		],
		autoFixable: true,
		autoFix: {
			action: "create_file",
		},
		confidence: 0.95,
	},
	{
		id: "fs-eacces",
		pattern: /EACCES: permission denied(?:, (?:open|write|read) '([^']+)')?/,
		category: "filesystem",
		description: "Insufficient permissions",
		solutions: ["Check file permissions (chmod)", "Run with appropriate permissions", "Verify the path is correct"],
		autoFixable: false,
		confidence: 0.9,
	},
	{
		id: "fs-enospc",
		pattern: /ENOSPC: no space left on device/,
		category: "filesystem",
		description: "Disk space exhausted",
		solutions: ["Free up disk space", "Clean node_modules and reinstall", "Clear temporary files"],
		autoFixable: false,
		confidence: 0.95,
	},

	// Module resolution
	{
		id: "module-not-found",
		pattern: /Cannot find module '([^']+)'/,
		category: "module",
		description: "Module resolution failure",
		solutions: [
			"Install the package: npm install <package>",
			"Check package.json dependencies",
			"Verify the import path is correct",
		],
		autoFixable: true,
		autoFix: {
			action: "install_package",
		},
		confidence: 0.85,
	},
	{
		id: "module-export-not-found",
		pattern: /Module '"([^"]+)"' has no exported member '([^']+)'/,
		category: "module",
		description: "Named export not found in module",
		solutions: ["Check the correct export name", "Use default import instead", "Update the package version"],
		autoFixable: false,
		confidence: 0.85,
	},

	// Build errors
	{
		id: "build-syntax-error",
		pattern: /SyntaxError: (?:Unexpected token|Missing semicolon)/,
		category: "build",
		description: "JavaScript/TypeScript syntax error",
		solutions: [
			"Check for missing brackets or semicolons",
			"Verify ESM vs CommonJS syntax",
			"Run linter for syntax hints",
		],
		autoFixable: false,
		confidence: 0.8,
	},

	// Test errors
	{
		id: "test-assertion-failed",
		pattern: /AssertionError: expected .+ to (?:equal|be|have)/,
		category: "test",
		description: "Test assertion failure",
		solutions: [
			"Check the expected vs actual values",
			"Update the test or fix the implementation",
			"Verify test data is correct",
		],
		autoFixable: false,
		confidence: 0.8,
	},
	{
		id: "test-timeout",
		pattern: /Timeout of \d+ms exceeded/,
		category: "test",
		description: "Test exceeded timeout",
		solutions: [
			"Increase test timeout",
			"Check for async operations not awaited",
			"Verify mock responses are resolving",
		],
		autoFixable: false,
		confidence: 0.85,
	},

	// Lint errors
	{
		id: "lint-unused-var",
		pattern: /'([^']+)' is (?:defined but never used|assigned .+ but never used)/,
		category: "lint",
		description: "Unused variable/import",
		solutions: [
			"Remove the unused variable/import",
			"Prefix with underscore if intentional: _var",
			"Use the variable in code",
		],
		autoFixable: true,
		autoFix: {
			action: "run_command",
			params: { command: "npx biome check --apply" },
		},
		confidence: 0.9,
	},
];

// =============================================================================
// ErrorPatternRegistry
// =============================================================================

export class ErrorPatternRegistry {
	private patterns: ErrorPattern[] = [];

	constructor() {
		// Register built-in patterns
		this.patterns.push(...BUILT_IN_PATTERNS);
	}

	/**
	 * Register a custom pattern
	 */
	register(pattern: ErrorPattern): void {
		this.patterns.push(pattern);
	}

	/**
	 * Match an error message against all patterns
	 * Returns the best match (highest confidence)
	 */
	match(errorMessage: string): MatchResult | null {
		const matches: MatchResult[] = [];

		for (const pattern of this.patterns) {
			const regex = typeof pattern.pattern === "string" ? new RegExp(pattern.pattern) : pattern.pattern;

			const match = errorMessage.match(regex);
			if (match) {
				// Extract named groups or positional groups
				const extracted: Record<string, string> = {};
				if (match.groups) {
					Object.assign(extracted, match.groups);
				} else {
					// Use positional indices
					match.slice(1).forEach((val, idx) => {
						if (val) {
							extracted[`$${idx + 1}`] = val;
						}
					});
				}

				matches.push({ pattern, match, extracted });
			}
		}

		if (matches.length === 0) {
			return null;
		}

		// Return highest confidence match
		return matches.reduce((best, current) =>
			current.pattern.confidence > best.pattern.confidence ? current : best,
		);
	}

	/**
	 * Match multiple error messages
	 * Returns unique patterns with occurrence counts
	 */
	matchMultiple(errors: string[]): Array<MatchResult & { count: number }> {
		const matches = new Map<string, MatchResult & { count: number }>();

		for (const error of errors) {
			const result = this.match(error);
			if (result) {
				const existing = matches.get(result.pattern.id);
				if (existing) {
					existing.count++;
				} else {
					matches.set(result.pattern.id, { ...result, count: 1 });
				}
			}
		}

		return Array.from(matches.values());
	}

	/**
	 * Get patterns by category
	 */
	getByCategory(category: ErrorPattern["category"]): ErrorPattern[] {
		return this.patterns.filter((p) => p.category === category);
	}

	/**
	 * Get all auto-fixable patterns
	 */
	getAutoFixable(): ErrorPattern[] {
		return this.patterns.filter((p) => p.autoFixable);
	}

	/**
	 * Format match result as hint text
	 */
	formatHint(result: MatchResult): string {
		const lines: string[] = [];
		lines.push(`[${result.pattern.category.toUpperCase()}] ${result.pattern.description}`);

		if (result.pattern.solutions.length > 0) {
			lines.push("Solutions:");
			for (const solution of result.pattern.solutions.slice(0, 3)) {
				lines.push(`  - ${solution}`);
			}
		}

		if (result.pattern.autoFixable && result.pattern.autoFix) {
			lines.push(`Auto-fix: ${result.pattern.autoFix.action}`);
		}

		return lines.join("\n");
	}
}

// =============================================================================
// Factory
// =============================================================================

/** Singleton instance */
let instance: ErrorPatternRegistry | null = null;

/**
 * Get the error pattern registry instance
 */
export function getErrorPatternRegistry(): ErrorPatternRegistry {
	if (!instance) {
		instance = new ErrorPatternRegistry();
	}
	return instance;
}

/**
 * Create a fresh registry (for testing)
 */
export function createErrorPatternRegistry(): ErrorPatternRegistry {
	return new ErrorPatternRegistry();
}
