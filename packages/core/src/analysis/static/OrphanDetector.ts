/**
 * Orphan File Detector
 *
 * Uses madge to detect orphaned files (files with no dependents).
 * These are potential dead code that may be safe to delete.
 *
 * Note: madge is a dev dependency, so this module handles the case
 * where it's not available gracefully.
 *
 * @module analysis/static/OrphanDetector
 */

export interface OrphanResult {
	/** Files that have no dependents (potential dead code) */
	orphans: string[];
	/** Files that were analyzed */
	totalFiles: number;
	/** Whether analysis succeeded */
	success: boolean;
	/** Error message if failed */
	error?: string;
	/** Duration in milliseconds */
	duration: number;
}

export interface OrphanOptions {
	/** File extensions to analyze */
	fileExtensions?: string[];
	/** Patterns to exclude */
	excludePatterns?: string[];
	/** Base directory (defaults to workspace root) */
	baseDir?: string;
	/** TypeScript config path */
	tsConfigPath?: string;
}

const DEFAULT_OPTIONS: Required<Omit<OrphanOptions, "baseDir" | "tsConfigPath">> = {
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
 * Detect orphaned files in a directory
 *
 * @param entryPoint - Entry file or directory to analyze
 * @param options - Detection options
 * @returns Detection result with orphan list
 *
 * @example
 * ```typescript
 * const result = await detectOrphans("src/index.ts", {
 *   fileExtensions: ["ts", "tsx"],
 *   excludePatterns: ["node_modules", "dist"]
 * });
 *
 * if (result.success && result.orphans.length > 0) {
 *   console.log("Potential dead code:", result.orphans);
 * }
 * ```
 */
export async function detectOrphans(entryPoint: string, options: OrphanOptions = {}): Promise<OrphanResult> {
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

		const orphans = result.orphans();
		const allFiles = Object.keys(result.obj());

		return {
			orphans,
			totalFiles: allFiles.length,
			success: true,
			duration: Date.now() - startTime,
		};
	} catch (error) {
		return {
			orphans: [],
			totalFiles: 0,
			success: false,
			error: error instanceof Error ? error.message : String(error),
			duration: Date.now() - startTime,
		};
	}
}

/**
 * Filter orphans to only include files from a specific list
 *
 * Useful for focusing on files the AI agent plans to modify.
 *
 * @param orphanResult - Result from detectOrphans
 * @param targetFiles - Files to filter to
 * @returns Filtered orphan list
 */
export function filterOrphansToFiles(orphanResult: OrphanResult, targetFiles: string[]): string[] {
	if (!orphanResult.success) {
		return [];
	}

	const targetSet = new Set(targetFiles.map((f) => f.replace(/\\/g, "/")));

	return orphanResult.orphans.filter((orphan) => {
		const normalizedOrphan = orphan.replace(/\\/g, "/");
		return targetSet.has(normalizedOrphan) || targetFiles.some((t) => normalizedOrphan.endsWith(t));
	});
}

/**
 * Check if specific files are orphans
 *
 * More efficient than full orphan detection when you only care
 * about specific files.
 *
 * @param files - Files to check
 * @param workspaceRoot - Workspace root directory
 * @returns Which of the provided files are orphans
 */
export async function checkFilesForOrphanStatus(
	files: string[],
	workspaceRoot: string,
): Promise<{ orphans: string[]; success: boolean; error?: string }> {
	// For efficiency, we analyze the whole workspace once
	// then filter to the requested files
	const result = await detectOrphans(workspaceRoot, {
		baseDir: workspaceRoot,
	});

	if (!result.success) {
		return { orphans: [], success: false, error: result.error };
	}

	const orphans = filterOrphansToFiles(result, files);
	return { orphans, success: true };
}
