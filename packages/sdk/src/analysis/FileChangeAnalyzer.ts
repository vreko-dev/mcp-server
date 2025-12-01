/**
 * FileChangeAnalyzer - Platform-agnostic file change analysis
 *
 * This module provides utilities for analyzing differences between snapshot
 * and current workspace state, enabling rich diff previews and change summaries.
 *
 * @module FileChangeAnalyzer
 */

/**
 * Interface for file system providers
 *
 * Different platforms implement this interface to provide their
 * specific method of file system operations.
 */
export interface IFileSystemProvider {
	/**
	 * Read a file's contents
	 *
	 * @param filePath - Absolute path to the file
	 * @returns Promise that resolves to file contents as string
	 */
	readFile(filePath: string): Promise<string>;

	/**
	 * Check if a file exists
	 *
	 * @param filePath - Absolute path to the file
	 * @returns Promise that resolves to true if file exists
	 */
	fileExists(filePath: string): Promise<boolean>;

	/**
	 * Get relative path from workspace root
	 *
	 * @param workspaceRoot - Workspace root directory
	 * @param absolutePath - Absolute file path
	 * @returns Relative path from workspace root
	 */
	getRelativePath(workspaceRoot: string, absolutePath: string): string;
}

/**
 * Type of change detected for a file
 */
export type FileChangeType = "modified" | "added" | "deleted" | "unchanged";

/**
 * Represents a file change between snapshot and current state
 */
export interface FileChange {
	/** Absolute file path */
	filePath: string;

	/** Relative file path for display */
	relativePath: string;

	/** File name only */
	fileName: string;

	/** Type of change */
	changeType: FileChangeType;

	/** Number of lines added (for modified files) */
	linesAdded: number;

	/** Number of lines deleted (for modified files) */
	linesDeleted: number;

	/** Content from snapshot */
	snapshotContent: string;

	/** Current content (if file exists) */
	currentContent?: string;

	/** Icon identifier for VS Code */
	icon: string;

	/** Human-readable change summary */
	changeSummary: string;
}

/**
 * FileChangeAnalyzer - Analyzes file changes between snapshots and current state
 *
 * Provides platform-agnostic file change analysis using dependency injection
 * for file system operations.
 *
 * @example
 * ```typescript
 * // Node.js example
 * import { readFile } from 'fs/promises';
 * import { existsSync } from 'fs';
 * import { relative, basename } from 'path';
 *
 * const fsProvider = {
 *   readFile: (path) => readFile(path, 'utf-8'),
 *   fileExists: (path) => Promise.resolve(existsSync(path)),
 *   getRelativePath: (root, path) => relative(root, path)
 * };
 *
 * const analyzer = new FileChangeAnalyzer('/workspace', fsProvider);
 * const changes = await analyzer.analyzeSnapshot(snapshotFiles);
 * ```
 */
export class FileChangeAnalyzer {
	private workspaceRoot: string;
	private fileSystem: IFileSystemProvider;

	/**
	 * Creates a new FileChangeAnalyzer
	 *
	 * @param workspaceRoot - Root directory of the workspace
	 * @param fileSystem - File system provider for platform-specific operations
	 */
	constructor(workspaceRoot: string, fileSystem: IFileSystemProvider) {
		this.workspaceRoot = workspaceRoot;
		this.fileSystem = fileSystem;
	}

	/**
	 * Analyzes all files in a snapshot and compares with current state
	 *
	 * @param snapshotFiles - Map of relative file paths to snapshot content
	 * @returns Promise that resolves to array of file changes with detailed analysis
	 */
	async analyzeSnapshot(snapshotFiles: Record<string, string>): Promise<FileChange[]> {
		const changes: FileChange[] = [];

		for (const [relativePath, snapshotContent] of Object.entries(snapshotFiles)) {
			try {
				// Convert relative path to absolute path for file system operations
				const absolutePath = `${this.workspaceRoot}/${relativePath}`;
				const change = await this.analyzeFile(absolutePath, snapshotContent);
				changes.push(change);
			} catch (_error) {
				// Add entry with error indicator
				changes.push({
					filePath: `${this.workspaceRoot}/${relativePath}`,
					relativePath,
					fileName: this.getFileName(relativePath),
					changeType: "unchanged",
					linesAdded: 0,
					linesDeleted: 0,
					snapshotContent,
					icon: "error",
					changeSummary: "Error analyzing changes",
				});
			}
		}

		// Sort by change type priority: modified > deleted > added > unchanged
		const typePriority: Record<FileChangeType, number> = {
			modified: 0,
			deleted: 1,
			added: 2,
			unchanged: 3,
		};

		return changes.sort((a, b) => {
			const priorityDiff = typePriority[a.changeType] - typePriority[b.changeType];
			if (priorityDiff !== 0) {
				return priorityDiff;
			}

			// Within same type, sort by file name
			return a.fileName.localeCompare(b.fileName);
		});
	}

	/**
	 * Analyzes a single file's changes
	 *
	 * @param absoluteFilePath - Absolute file path
	 * @param snapshotContent - Content from snapshot
	 * @returns Promise that resolves to detailed file change information
	 */
	async analyzeFile(absoluteFilePath: string, snapshotContent: string): Promise<FileChange> {
		const relativePath = this.fileSystem.getRelativePath(this.workspaceRoot, absoluteFilePath);
		const fileName = this.getFileName(relativePath);

		// Check if file exists in current workspace
		// Let errors propagate to caller for proper error handling
		const fileExists = await this.fileSystem.fileExists(absoluteFilePath);
		let currentContent: string | undefined;

		if (fileExists) {
			currentContent = await this.fileSystem.readFile(absoluteFilePath);
		}

		// Determine change type
		let changeType: FileChangeType;
		let icon: string;
		let changeSummary: string;
		let linesAdded = 0;
		let linesDeleted = 0;

		if (!fileExists) {
			// File was deleted since snapshot
			changeType = "deleted";
			icon = "diff-removed";
			const lineCount = snapshotContent.split("\n").length;
			linesDeleted = lineCount;
			changeSummary = `Deleted (${lineCount} lines)`;
		} else if (currentContent === snapshotContent) {
			// File unchanged
			changeType = "unchanged";
			icon = "circle-outline";
			changeSummary = "No changes";
		} else {
			// File modified - calculate diff stats (currentContent is guaranteed to exist here)
			if (!currentContent) {
				throw new Error("Unexpected: currentContent is undefined for existing file");
			}
			changeType = "modified";
			icon = "diff-modified";

			const stats = this.calculateDiffStats(snapshotContent, currentContent);
			linesAdded = stats.added;
			linesDeleted = stats.deleted;

			if (linesAdded === 0 && linesDeleted === 0) {
				changeSummary = "Modified (whitespace only)";
			} else if (linesAdded > 0 && linesDeleted > 0) {
				changeSummary = `+${linesAdded} -${linesDeleted}`;
			} else if (linesAdded > 0) {
				changeSummary = `+${linesAdded}`;
			} else {
				changeSummary = `-${linesDeleted}`;
			}
		}

		return {
			filePath: absoluteFilePath,
			relativePath,
			fileName,
			changeType,
			linesAdded,
			linesDeleted,
			snapshotContent,
			currentContent,
			icon,
			changeSummary,
		};
	}

	/**
	 * Calculates simple diff statistics between two file contents
	 *
	 * Uses line-based comparison to estimate additions and deletions.
	 * This is a simplified diff algorithm suitable for UI display.
	 *
	 * @param oldContent - Original content (snapshot)
	 * @param newContent - Current content
	 * @returns Object with added and deleted line counts
	 */
	private calculateDiffStats(oldContent: string, newContent: string): { added: number; deleted: number } {
		const oldLines = oldContent.split("\n");
		const newLines = newContent.split("\n");

		// Simple line-based diff using Set for quick lookups
		const oldSet = new Set(oldLines);
		const newSet = new Set(newLines);

		let added = 0;
		let deleted = 0;

		// Count lines only in new (added)
		for (const line of newLines) {
			if (!oldSet.has(line)) {
				added++;
			}
		}

		// Count lines only in old (deleted)
		for (const line of oldLines) {
			if (!newSet.has(line)) {
				deleted++;
			}
		}

		return { added, deleted };
	}

	/**
	 * Extract file name from path
	 *
	 * @param filePath - File path
	 * @returns File name only
	 */
	private getFileName(filePath: string): string {
		const parts = filePath.split("/");
		return parts[parts.length - 1] || filePath;
	}
}

/**
 * Creates a summary of changes for display
 *
 * @param changes - Array of file changes
 * @returns Human-readable change summary
 */
export function createChangeSummary(changes: FileChange[]): string {
	const modifiedCount = changes.filter((c) => c.changeType === "modified").length;
	const addedCount = changes.filter((c) => c.changeType === "added").length;
	const deletedCount = changes.filter((c) => c.changeType === "deleted").length;
	const unchangedCount = changes.filter((c) => c.changeType === "unchanged").length;

	const parts: string[] = [];

	if (modifiedCount > 0) {
		parts.push(`${modifiedCount} modified`);
	}
	if (deletedCount > 0) {
		parts.push(`${deletedCount} deleted`);
	}
	if (addedCount > 0) {
		parts.push(`${addedCount} added`);
	}
	if (unchangedCount > 0 && parts.length === 0) {
		parts.push(`${unchangedCount} unchanged`);
	}

	return parts.join(", ");
}
