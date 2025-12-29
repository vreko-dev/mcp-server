/**
 * DocFreshnessSensor - Documentation freshness tracking
 *
 * Detects stale documentation by comparing markdown file mtimes
 * against source code mtimes. Prevents reliance on outdated docs.
 *
 * Uses glob (already installed) for file discovery.
 *
 * @performance Budget: <50ms for typical workspace
 */

import { stat } from "node:fs/promises";
import { dirname, relative } from "node:path";

export interface DocFreshnessConfig {
	/** Hours until doc considered stale (default: 72 = 3 days) */
	staleHours: number;
	/** Patterns for documentation files */
	docPatterns: string[];
	/** Patterns for source files to compare against */
	sourcePatterns: string[];
}

export const DEFAULT_DOC_FRESHNESS_CONFIG: DocFreshnessConfig = {
	staleHours: 72,
	docPatterns: ["**/*.md", "**/CLAUDE.md", "**/*-audit.md", "**/*-report.md", "**/*ROADMAP*.md", "**/*ISSUES*.md"],
	sourcePatterns: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
};

export interface StaleDoc {
	/** Path to the stale document */
	path: string;
	/** Last modified timestamp */
	mtime: number;
	/** Hours since last modification */
	hoursStale: number;
	/** Related source files that are newer */
	newerSourceFiles: string[];
	/** Severity based on staleness */
	severity: "warning" | "error";
}

export interface DocFreshnessState {
	/** Overall freshness score 0-100 (100 = all fresh) */
	value: number;
	/** Number of stale documents */
	staleCount: number;
	/** List of stale documents with details */
	staleDocs: StaleDoc[];
	/** Total documents analyzed */
	totalDocs: number;
}

export interface DocFreshnessResult {
	state: DocFreshnessState;
	success: boolean;
	error?: string;
	duration: number;
}

/**
 * DocFreshnessSensor tracks how up-to-date documentation is
 * relative to source code changes.
 *
 * Freshness represents trust in documentation accuracy.
 * Lower freshness = docs may contain outdated information.
 */
export class DocFreshnessSensor {
	private readonly config: DocFreshnessConfig;

	constructor(config: Partial<DocFreshnessConfig> = {}) {
		this.config = { ...DEFAULT_DOC_FRESHNESS_CONFIG, ...config };
	}

	/**
	 * Analyze documentation freshness in a directory
	 *
	 * @param workspaceRoot - Root directory to analyze
	 * @returns Freshness analysis result
	 */
	async analyze(workspaceRoot: string): Promise<DocFreshnessResult> {
		const startTime = Date.now();

		try {
			// Dynamic import glob
			const { glob } = await import("glob");

			// Find all doc files
			const docFiles = await glob(this.config.docPatterns, {
				cwd: workspaceRoot,
				absolute: true,
				ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
			});

			// Find all source files
			const sourceFiles = await glob(this.config.sourcePatterns, {
				cwd: workspaceRoot,
				absolute: true,
				ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
			});

			// Get mtimes for all files
			const docMtimes = await this.getMtimes(docFiles);
			const sourceMtimes = await this.getMtimes(sourceFiles);

			// Analyze staleness
			const now = Date.now();
			const staleThreshold = now - this.config.staleHours * 60 * 60 * 1000;
			const staleDocs: StaleDoc[] = [];

			for (const [docPath, docMtime] of docMtimes) {
				const hoursStale = (now - docMtime) / (60 * 60 * 1000);

				// Find related source files in same or child directories
				const docDir = dirname(docPath);
				const newerSourceFiles: string[] = [];

				for (const [srcPath, srcMtime] of sourceMtimes) {
					// Source file is related if in same directory tree
					if (srcPath.startsWith(docDir) && srcMtime > docMtime) {
						newerSourceFiles.push(relative(workspaceRoot, srcPath));
					}
				}

				// Doc is stale if older than threshold OR has newer source files
				const isStale = docMtime < staleThreshold || newerSourceFiles.length > 0;

				if (isStale) {
					staleDocs.push({
						path: relative(workspaceRoot, docPath),
						mtime: docMtime,
						hoursStale: Math.round(hoursStale),
						newerSourceFiles: newerSourceFiles.slice(0, 5), // Limit for brevity
						severity: hoursStale > this.config.staleHours * 2 ? "error" : "warning",
					});
				}
			}

			// Calculate freshness score
			const freshDocs = docMtimes.size - staleDocs.length;
			const freshnessValue = docMtimes.size > 0 ? Math.round((freshDocs / docMtimes.size) * 100) : 100;

			return {
				state: {
					value: freshnessValue,
					staleCount: staleDocs.length,
					staleDocs: staleDocs.sort((a, b) => b.hoursStale - a.hoursStale),
					totalDocs: docMtimes.size,
				},
				success: true,
				duration: Date.now() - startTime,
			};
		} catch (error) {
			return {
				state: {
					value: 0,
					staleCount: 0,
					staleDocs: [],
					totalDocs: 0,
				},
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration: Date.now() - startTime,
			};
		}
	}

	/**
	 * Quick check for specific documentation files
	 *
	 * @param docPaths - Absolute paths to doc files
	 * @param workspaceRoot - Workspace root for relative source lookup
	 */
	async checkSpecificDocs(
		docPaths: string[],
		_workspaceRoot: string,
	): Promise<Map<string, { stale: boolean; hoursOld: number }>> {
		const results = new Map<string, { stale: boolean; hoursOld: number }>();
		const now = Date.now();
		const staleThreshold = now - this.config.staleHours * 60 * 60 * 1000;

		for (const docPath of docPaths) {
			try {
				const stats = await stat(docPath);
				const hoursOld = Math.round((now - stats.mtimeMs) / (60 * 60 * 1000));
				results.set(docPath, {
					stale: stats.mtimeMs < staleThreshold,
					hoursOld,
				});
			} catch {
				// File doesn't exist or can't be read
				results.set(docPath, { stale: true, hoursOld: -1 });
			}
		}

		return results;
	}

	/**
	 * Get mtimes for a list of files
	 */
	private async getMtimes(files: string[]): Promise<Map<string, number>> {
		const mtimes = new Map<string, number>();

		const results = await Promise.allSettled(
			files.map(async (file) => {
				const stats = await stat(file);
				return { file, mtime: stats.mtimeMs };
			}),
		);

		for (const result of results) {
			if (result.status === "fulfilled") {
				mtimes.set(result.value.file, result.value.mtime);
			}
		}

		return mtimes;
	}
}

/**
 * Format stale docs for human-readable output
 */
export function formatStaleDocs(staleDocs: StaleDoc[]): string {
	if (staleDocs.length === 0) {
		return "All documentation is fresh";
	}

	return staleDocs
		.map((doc) => {
			const icon = doc.severity === "error" ? "!!!" : "!";
			const newerFiles =
				doc.newerSourceFiles.length > 0 ? ` (${doc.newerSourceFiles.length} newer source files)` : "";
			return `${icon} ${doc.path}: ${doc.hoursStale}h stale${newerFiles}`;
		})
		.join("\n");
}
