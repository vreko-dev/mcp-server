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
export declare class FileChangeAnalyzer {
    private workspaceRoot;
    private fileSystem;
    /**
     * Creates a new FileChangeAnalyzer
     *
     * @param workspaceRoot - Root directory of the workspace
     * @param fileSystem - File system provider for platform-specific operations
     */
    constructor(workspaceRoot: string, fileSystem: IFileSystemProvider);
    /**
     * Analyzes all files in a snapshot and compares with current state
     *
     * @param snapshotFiles - Map of relative file paths to snapshot content
     * @returns Promise that resolves to array of file changes with detailed analysis
     */
    analyzeSnapshot(snapshotFiles: Record<string, string>): Promise<FileChange[]>;
    /**
     * Analyzes a single file's changes
     *
     * @param absoluteFilePath - Absolute file path
     * @param snapshotContent - Content from snapshot
     * @returns Promise that resolves to detailed file change information
     */
    analyzeFile(absoluteFilePath: string, snapshotContent: string): Promise<FileChange>;
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
    private calculateDiffStats;
    /**
     * Extract file name from path
     *
     * @param filePath - File path
     * @returns File name only
     */
    private getFileName;
}
/**
 * Creates a summary of changes for display
 *
 * @param changes - Array of file changes
 * @returns Human-readable change summary
 */
export declare function createChangeSummary(changes: FileChange[]): string;
//# sourceMappingURL=FileChangeAnalyzer.d.ts.map