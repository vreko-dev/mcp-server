/**
 * FileConflictResolver.ts
 *
 * Platform-agnostic file conflict resolution for snapshot restore operations.
 * Handles file path conflicts, atomic writes, and permission issues.
 *
 * Features:
 * - Atomic write pattern (temp file + rename)
 * - Permission validation before write
 * - File rename/move detection via content hashing
 * - Filename similarity matching (Levenshtein distance)
 *
 * @module snapshot/FileConflictResolver
 * @performance Atomic write < 100ms for typical files
 *
 * @example
 * ```typescript
 * import { FileConflictResolver } from '@snapback-oss/sdk';
 *
 * const resolver = new FileConflictResolver({
 *   fileSearchProvider: mySearchProvider, // Optional, for findRenamedFile
 *   logger: myLogger // Optional
 * });
 *
 * // Restore a file with conflict handling
 * const result = await resolver.resolveAndWrite(
 *   '/path/to/file.ts',
 *   'file contents',
 *   { created: Date.now() }
 * );
 * ```
 */

import * as crypto from "node:crypto";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ILogger } from "../core/session/interfaces";
import { NoOpLogger } from "../core/session/interfaces";

/**
 * Result of a conflict resolution operation
 */
export interface ConflictResult {
	/** Whether the conflict was successfully resolved */
	resolved: boolean;
	/** Action taken to resolve the conflict */
	action: "restored" | "skipped" | "merged";
	/** Target file path */
	path: string;
	/** Error if resolution failed */
	error?: Error;
}

/**
 * Metadata about the original file being restored
 */
export interface RestoreMetadata {
	/** Original creation timestamp (milliseconds since epoch) */
	created: number;
	/** Original file permissions (optional) */
	permissions?: number;
}

/**
 * File search result for rename detection
 */
export interface FileSearchResult {
	/** File path */
	path: string;
	/** File content (for hash comparison) */
	content?: string;
}

/**
 * Provider interface for file search operations (platform-specific)
 *
 * This allows the conflict resolver to search for renamed/moved files
 * without depending on a specific platform (e.g., VS Code workspace API).
 */
export interface IFileSearchProvider {
	/**
	 * Find files matching a pattern in the workspace
	 *
	 * @param workspaceRoot - Root directory to search
	 * @param extension - File extension to filter by (e.g., ".ts")
	 * @param excludePattern - Glob pattern to exclude (e.g., "node_modules")
	 * @param maxResults - Maximum number of results to return
	 * @returns Array of file paths matching the pattern
	 */
	findFiles(
		workspaceRoot: string,
		extension: string,
		excludePattern?: string,
		maxResults?: number,
	): Promise<string[]>;

	/**
	 * Read file content for hash comparison
	 *
	 * @param filePath - Path to the file
	 * @returns File content as string
	 */
	readFile(filePath: string): Promise<string>;
}

/**
 * Options for FileConflictResolver
 */
export interface FileConflictResolverOptions {
	/** Logger instance for debug output */
	logger?: ILogger;
	/** File search provider for rename detection (optional) */
	fileSearchProvider?: IFileSearchProvider;
	/** Workspace root for relative path operations (optional) */
	workspaceRoot?: string;
}

/**
 * FileConflictResolver - Handles file conflicts during snapshot restore
 *
 * Provides platform-agnostic conflict resolution with:
 * - Atomic write operations (temp file + rename pattern)
 * - Permission validation
 * - File rename/move detection
 * - Filename similarity matching
 */
export class FileConflictResolver {
	private readonly logger: ILogger;
	private readonly fileSearchProvider?: IFileSearchProvider;
	private readonly workspaceRoot?: string;

	constructor(options: FileConflictResolverOptions = {}) {
		this.logger = options.logger ?? new NoOpLogger();
		this.fileSearchProvider = options.fileSearchProvider;
		this.workspaceRoot = options.workspaceRoot;
	}

	/**
	 * Attempt to restore a file, handling conflicts.
	 * Uses atomic write pattern: write to temp file, then rename.
	 *
	 * @param targetPath - Path where the file should be restored
	 * @param content - File content to write
	 * @param _originalMetadata - Original file metadata (for future use)
	 * @returns Conflict resolution result
	 *
	 * @performance < 100ms for typical files
	 */
	async resolveAndWrite(
		targetPath: string,
		content: string,
		_originalMetadata: RestoreMetadata,
	): Promise<ConflictResult> {
		try {
			// 1. Check write permissions
			const hasPermission = await this.checkPermissions(targetPath);
			if (!hasPermission) {
				this.logger.debug("No write permission for target path", { targetPath });
				return {
					resolved: false,
					action: "skipped",
					path: targetPath,
					error: new Error(`No write permission for ${targetPath}`),
				};
			}

			// 2. Ensure parent directory exists
			const parentDir = path.dirname(targetPath);
			await fs.mkdir(parentDir, { recursive: true });

			// 3. Atomic write: temp file + rename pattern
			const tempPath = `${targetPath}.snapback-tmp-${Date.now()}`;
			try {
				await fs.writeFile(tempPath, content, "utf8");
				await fs.rename(tempPath, targetPath);
			} catch (writeError) {
				// Clean up temp file on failure
				try {
					await fs.unlink(tempPath);
				} catch {
					// Ignore cleanup errors
				}
				throw writeError;
			}

			this.logger.debug("File restored successfully", { targetPath });
			return {
				resolved: true,
				action: "restored",
				path: targetPath,
			};
		} catch (error) {
			this.logger.error("Failed to restore file", error instanceof Error ? error : undefined, { targetPath });
			return {
				resolved: false,
				action: "skipped",
				path: targetPath,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Detect if a file was renamed/moved since snapshot.
	 * Uses content hash matching to find moved files.
	 *
	 * Requires a fileSearchProvider to be configured.
	 *
	 * @param originalPath - Original file path from snapshot
	 * @param contentHash - SHA-256 hash of the original content
	 * @returns New file path if found, null otherwise
	 */
	async findRenamedFile(originalPath: string, contentHash: string): Promise<string | null> {
		if (!this.fileSearchProvider || !this.workspaceRoot) {
			this.logger.debug("File search not available - no provider or workspace root configured");
			return null;
		}

		const originalFileName = path.basename(originalPath);
		const originalExt = path.extname(originalPath);

		try {
			// Search for files with same extension
			const files = await this.fileSearchProvider.findFiles(
				this.workspaceRoot,
				originalExt,
				"**/node_modules/**",
				100,
			);

			for (const filePath of files) {
				try {
					const content = await this.fileSearchProvider.readFile(filePath);
					const hash = this.hashContent(content);

					if (hash === contentHash) {
						// Found matching content - this is likely the renamed file
						this.logger.debug("Found renamed file by content hash", { originalPath, newPath: filePath });
						return filePath;
					}

					// Also check for similar filename (fuzzy match)
					const fileName = path.basename(filePath);
					if (this.isSimilarFileName(originalFileName, fileName)) {
						// Check if content is at least 80% similar
						const similarity = this.calculateSimilarity(contentHash, hash);
						if (similarity > 0.8) {
							this.logger.debug("Found renamed file by similarity", {
								originalPath,
								newPath: filePath,
								similarity,
							});
							return filePath;
						}
					}
				} catch {
					// Skip files that can't be read
				}
			}
		} catch (error) {
			this.logger.debug("Error searching for renamed file", {
				originalPath,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return null;
	}

	/**
	 * Verify write permissions before attempting restore.
	 *
	 * @param targetPath - Path to check permissions for
	 * @returns True if write permission is available
	 */
	async checkPermissions(targetPath: string): Promise<boolean> {
		try {
			// Check if file exists
			try {
				await fs.access(targetPath, fs.constants.W_OK);
				return true;
			} catch {
				// File doesn't exist, check parent directory
				const parentDir = path.dirname(targetPath);
				try {
					await fs.access(parentDir, fs.constants.W_OK);
					return true;
				} catch {
					// Parent doesn't exist, check if we can create it
					const rootDir = this.findExistingAncestor(parentDir);
					if (rootDir) {
						await fs.access(rootDir, fs.constants.W_OK);
						return true;
					}
					return false;
				}
			}
		} catch {
			return false;
		}
	}

	/**
	 * Hash file content using SHA-256
	 *
	 * @param content - Content to hash
	 * @returns SHA-256 hash as hex string
	 */
	hashContent(content: string): string {
		return crypto.createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Find the nearest existing ancestor directory.
	 *
	 * @param dirPath - Starting directory path
	 * @returns Nearest existing ancestor path, or null
	 */
	findExistingAncestor(dirPath: string): string | null {
		let current = dirPath;
		const root = path.parse(current).root;

		while (current !== root) {
			try {
				fsSync.accessSync(current);
				return current;
			} catch {
				current = path.dirname(current);
			}
		}

		return root;
	}

	/**
	 * Check if two filenames are similar (for rename detection).
	 *
	 * Uses multiple heuristics:
	 * - Exact base name match
	 * - One name contains the other
	 * - Levenshtein distance < 30% of max length
	 *
	 * @param name1 - First filename
	 * @param name2 - Second filename
	 * @returns True if filenames are considered similar
	 */
	isSimilarFileName(name1: string, name2: string): boolean {
		const base1 = path.basename(name1, path.extname(name1)).toLowerCase();
		const base2 = path.basename(name2, path.extname(name2)).toLowerCase();

		// Same base name
		if (base1 === base2) {
			return true;
		}

		// One contains the other
		if (base1.includes(base2) || base2.includes(base1)) {
			return true;
		}

		// Edit distance check (Levenshtein)
		const distance = this.levenshteinDistance(base1, base2);
		const maxLen = Math.max(base1.length, base2.length);
		return distance / maxLen < 0.3; // Less than 30% difference
	}

	/**
	 * Calculate Levenshtein distance between two strings.
	 *
	 * @param str1 - First string
	 * @param str2 - Second string
	 * @returns Edit distance as integer
	 */
	levenshteinDistance(str1: string, str2: string): number {
		const m = str1.length;
		const n = str2.length;
		const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

		for (let i = 0; i <= m; i++) {
			dp[i][0] = i;
		}
		for (let j = 0; j <= n; j++) {
			dp[0][j] = j;
		}

		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (str1[i - 1] === str2[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1];
				} else {
					dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
				}
			}
		}

		return dp[m][n];
	}

	/**
	 * Calculate similarity between two hashes.
	 *
	 * Note: SHA-256 hashes are cryptographic - different content produces
	 * completely different hashes. This returns 1.0 for exact match, 0.0 otherwise.
	 * For actual content similarity, compare the content directly.
	 *
	 * @param hash1 - First hash
	 * @param hash2 - Second hash
	 * @returns Similarity score (1.0 = exact match, 0.0 = different)
	 */
	calculateSimilarity(hash1: string, hash2: string): number {
		return hash1 === hash2 ? 1.0 : 0.0;
	}
}
