/**
 * Circular Dependency Detector
 *
 * Uses madge (already installed) to detect circular dependencies.
 * Circular deps cause bundle bloat, slow builds, and runtime issues.
 *
 * @module analysis/static/CircularDetector
 */

export interface CircularResult {
	/** Array of circular dependency chains */
	cycles: string[][];
	/** Total files analyzed */
	totalFiles: number;
	/** Whether analysis succeeded */
	success: boolean;
	/** Error message if failed */
	error?: string;
	/** Duration in milliseconds */
	duration: number;
}

export interface CircularOptions {
	/** File extensions to analyze */
	fileExtensions?: string[];
	/** Patterns to exclude */
	excludePatterns?: string[];
	/** TypeScript config path */
	tsConfigPath?: string;
	/** Base directory (defaults to cwd) */
	baseDir?: string;
}

const DEFAULT_OPTIONS: Required<Omit<CircularOptions, "baseDir" | "tsConfigPath">> = {
	fileExtensions: ["ts", "tsx", "js", "jsx"],
	excludePatterns: [
		"node_modules",
		"dist",
		".next",
		"coverage",
		"**/*.test.*",
		"**/*.spec.*",
		"**/__tests__/**",
		"**/__mocks__/**",
	],
};

/**
 * Detect circular dependencies in a directory
 *
 * @param entryPoint - Entry file or directory to analyze
 * @param options - Detection options
 * @returns Detection result with cycle list
 *
 * @example
 * ```typescript
 * const result = await detectCircular("src/", {
 *   fileExtensions: ["ts", "tsx"],
 * });
 *
 * if (result.success && result.cycles.length > 0) {
 *   console.log("Circular deps found:", result.cycles.length);
 *   result.cycles.forEach(cycle => console.log(cycle.join(" -> ")));
 * }
 * ```
 */
export async function detectCircular(entryPoint: string, options: CircularOptions = {}): Promise<CircularResult> {
	const startTime = Date.now();
	const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

	try {
		// Dynamic import madge - it's a dev dependency
		const madgeModule = await import("madge");
		const madge = madgeModule.default || madgeModule;

		const result = await madge(entryPoint, {
			fileExtensions: mergedOptions.fileExtensions,
			excludeRegExp: mergedOptions.excludePatterns.map((p) => {
				// Convert glob patterns to regex
				const regexPattern = p.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\./g, "\\.");
				return new RegExp(regexPattern);
			}),
			tsConfig: mergedOptions.tsConfigPath,
			detectiveOptions: {
				ts: {
					skipTypeImports: true,
				},
			},
		});

		const cycles = result.circular();
		const allFiles = Object.keys(result.obj());

		return {
			cycles,
			totalFiles: allFiles.length,
			success: true,
			duration: Date.now() - startTime,
		};
	} catch (error) {
		return {
			cycles: [],
			totalFiles: 0,
			success: false,
			error: error instanceof Error ? error.message : String(error),
			duration: Date.now() - startTime,
		};
	}
}

/**
 * Detect circular dependencies across all packages in a monorepo
 *
 * @param packageDirs - Array of package directories to analyze
 * @param options - Detection options
 * @returns Aggregated results per package
 */
export async function detectCircularInMonorepo(
	packageDirs: string[],
	options: CircularOptions = {},
): Promise<Map<string, CircularResult>> {
	const results = new Map<string, CircularResult>();

	// Run in parallel for efficiency
	const promises = packageDirs.map(async (dir) => {
		const result = await detectCircular(dir, options);
		return { dir, result };
	});

	const settled = await Promise.allSettled(promises);

	for (const outcome of settled) {
		if (outcome.status === "fulfilled") {
			results.set(outcome.value.dir, outcome.value.result);
		}
	}

	return results;
}

/**
 * Get a summary of circular dependencies across packages
 *
 * @param results - Map of package results from detectCircularInMonorepo
 * @returns Summary with total cycles and affected packages
 */
export function summarizeCircular(results: Map<string, CircularResult>): {
	totalCycles: number;
	affectedPackages: string[];
	allCycles: Array<{ package: string; cycle: string[] }>;
} {
	let totalCycles = 0;
	const affectedPackages: string[] = [];
	const allCycles: Array<{ package: string; cycle: string[] }> = [];

	for (const [pkg, result] of results) {
		if (result.success && result.cycles.length > 0) {
			totalCycles += result.cycles.length;
			affectedPackages.push(pkg);
			for (const cycle of result.cycles) {
				allCycles.push({ package: pkg, cycle });
			}
		}
	}

	return { totalCycles, affectedPackages, allCycles };
}

/**
 * Format circular dependency cycles for human-readable output
 *
 * @param cycles - Array of dependency cycles
 * @returns Formatted string representation
 */
export function formatCycles(cycles: string[][]): string {
	if (cycles.length === 0) {
		return "No circular dependencies found";
	}

	return cycles.map((cycle, i) => `${i + 1}. ${cycle.join(" -> ")} -> ${cycle[0]}`).join("\n");
}
