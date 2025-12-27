/**
 * ErrorCacheService - Persist and retrieve error state
 *
 * Caches TypeScript, test, and lint errors to reduce token waste
 * when agents re-discover known issues.
 *
 * Storage: .snapback/errors/{source}.jsonl
 * Retention: 7 days or 100 entries per type
 *
 * @module services/error-cache-service
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CachedError } from "../types/context.js";

// =============================================================================
// Constants
// =============================================================================

/** Maximum age for cached errors (7 days in ms) */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum entries per source type */
const MAX_ENTRIES_PER_SOURCE = 100;

/** Valid source types */
const SOURCE_TYPES = ["typescript", "test", "lint", "runtime"] as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format milliseconds into human-readable age string
 */
function formatAge(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d`;
	if (hours > 0) return `${hours}h`;
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
}

/**
 * Create unique key for deduplication
 */
function errorKey(error: CachedError): string {
	return `${error.file}:${error.line}:${error.message}`;
}

/**
 * Ensure directory exists
 */
function ensureDirSync(dir: string): void {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

// =============================================================================
// ErrorCacheService
// =============================================================================

export class ErrorCacheService {
	private workspaceRoot: string;
	private cacheDir: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.cacheDir = join(workspaceRoot, ".snapback", "errors");
	}

	/**
	 * Cache errors after validation operations
	 *
	 * Called by quick_check after TypeScript/test/lint validation.
	 * Errors are grouped by source and appended to JSONL files.
	 */
	cacheErrors(errors: CachedError[]): void {
		if (errors.length === 0) return;

		ensureDirSync(this.cacheDir);

		// Group errors by source
		const grouped = new Map<string, CachedError[]>();
		for (const error of errors) {
			const source = error.source || "general";
			if (!grouped.has(source)) {
				grouped.set(source, []);
			}
			grouped.get(source)!.push(error);
		}

		// Write each group to its JSONL file
		const timestamp = Date.now();
		for (const [source, sourceErrors] of grouped) {
			const filePath = join(this.cacheDir, `${source}.jsonl`);
			const lines = sourceErrors.map((e) => JSON.stringify({ ...e, timestamp })).join("\n") + "\n";
			appendFileSync(filePath, lines, "utf8");
		}
	}

	/**
	 * Get cached errors for specific files
	 *
	 * Called by begin_task to surface known issues for planned files.
	 * Returns errors within retention window, deduplicated.
	 */
	getErrorsForFiles(files: string[]): Array<CachedError & { age: string }> {
		const errors: Array<CachedError & { age: string }> = [];
		const now = Date.now();
		const seen = new Set<string>();

		for (const source of SOURCE_TYPES) {
			const filePath = join(this.cacheDir, `${source}.jsonl`);
			if (!existsSync(filePath)) continue;

			try {
				const content = readFileSync(filePath, "utf8");
				const lines = content.split("\n").filter(Boolean);

				for (const line of lines) {
					try {
						const error = JSON.parse(line) as CachedError;

						// Skip errors older than max age
						if (now - error.timestamp > MAX_AGE_MS) continue;

						// Check if error matches any requested file
						const matchesFile = files.some(
							(f) => error.file.includes(f) || f.includes(error.file) || error.file === f,
						);
						if (!matchesFile) continue;

						// Deduplicate by key
						const key = errorKey(error);
						if (seen.has(key)) continue;
						seen.add(key);

						errors.push({
							...error,
							age: formatAge(now - error.timestamp),
						});
					} catch {
						// Skip invalid JSON lines
					}
				}
			} catch {
				// Skip unreadable files
			}
		}

		return errors;
	}

	/**
	 * Remove stale entries from cache
	 *
	 * Called periodically or on session end.
	 * Removes entries older than 7 days and limits to 100 per source.
	 */
	prune(): { removed: number } {
		let removed = 0;
		const now = Date.now();

		for (const source of SOURCE_TYPES) {
			const filePath = join(this.cacheDir, `${source}.jsonl`);
			if (!existsSync(filePath)) continue;

			try {
				const content = readFileSync(filePath, "utf8");
				const lines = content.split("\n").filter(Boolean);

				// Parse and filter valid entries
				const entries: CachedError[] = [];
				for (const line of lines) {
					try {
						const error = JSON.parse(line) as CachedError;
						if (now - error.timestamp <= MAX_AGE_MS) {
							entries.push(error);
						} else {
							removed++;
						}
					} catch {
						removed++;
					}
				}

				// Sort by timestamp (most recent first) and limit
				entries.sort((a, b) => b.timestamp - a.timestamp);
				const kept = entries.slice(0, MAX_ENTRIES_PER_SOURCE);
				removed += entries.length - kept.length;

				// Rewrite file with kept entries
				if (kept.length > 0) {
					writeFileSync(filePath, kept.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
				} else {
					writeFileSync(filePath, "", "utf8");
				}
			} catch {
				// Skip files that can't be processed
			}
		}

		return { removed };
	}

	/**
	 * Clear all cached errors for a specific file
	 *
	 * Called when a file is successfully validated with no errors.
	 */
	clearForFile(file: string): void {
		for (const source of SOURCE_TYPES) {
			const filePath = join(this.cacheDir, `${source}.jsonl`);
			if (!existsSync(filePath)) continue;

			try {
				const content = readFileSync(filePath, "utf8");
				const lines = content.split("\n").filter(Boolean);

				// Filter out errors for the specified file
				const kept: CachedError[] = [];
				for (const line of lines) {
					try {
						const error = JSON.parse(line) as CachedError;
						if (error.file !== file && !error.file.includes(file) && !file.includes(error.file)) {
							kept.push(error);
						}
					} catch {
						// Skip invalid lines
					}
				}

				// Rewrite file
				writeFileSync(
					filePath,
					kept.map((e) => JSON.stringify(e)).join("\n") + (kept.length > 0 ? "\n" : ""),
					"utf8",
				);
			} catch {
				// Skip files that can't be processed
			}
		}
	}
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an ErrorCacheService instance
 */
export function createErrorCacheService(workspaceRoot: string): ErrorCacheService {
	return new ErrorCacheService(workspaceRoot);
}
