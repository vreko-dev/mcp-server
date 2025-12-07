/**
 * ConfigDetector - Platform-agnostic configuration file detection and validation
 *
 * This module provides utilities for detecting, parsing, and validating common
 * configuration files across different platforms.
 *
 * @module ConfigDetector
 */
/**
 * Interface for file system providers
 *
 * Different platforms implement this interface to provide their
 * specific method of file system operations.
 */
export interface IFileSystemProvider {
    /**
     * Glob for files matching patterns
     *
     * @param patterns - Array of glob patterns to match
     * @param cwd - Current working directory
     * @param options - Glob options including ignore patterns
     * @returns Promise that resolves to array of matched file paths
     */
    glob(patterns: string[], cwd: string, options?: {
        ignore?: string[];
    }): Promise<string[]>;
    /**
     * Read a file's contents
     *
     * @param filePath - Path to the file
     * @returns Promise that resolves to file contents as string
     */
    readFile(filePath: string): Promise<string>;
}
/**
 * Configuration file metadata
 */
export interface ConfigFile {
    /** Type of configuration file */
    type: string;
    /** Full path to the file */
    path: string;
    /** File name */
    name: string;
}
/**
 * Result of parsing a configuration file
 */
export interface ConfigParseResult {
    /** Parsed content */
    content: unknown;
    /** Whether the file was successfully parsed */
    valid: boolean;
    /** Error message if parsing failed */
    error?: string;
    /** Extracted metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Result of validating a configuration file
 */
export interface ConfigValidationResult {
    /** Whether the configuration is valid */
    valid: boolean;
    /** List of validation errors */
    errors: string[];
    /** List of validation warnings */
    warnings: string[];
}
/**
 * Configuration change event
 */
export interface ConfigChange {
    /** Type of change */
    type: "added" | "modified" | "deleted";
    /** Path to the changed file */
    file: string;
    /** Timestamp of the change */
    timestamp: number;
}
/**
 * ConfigDetector options
 */
export interface ConfigDetectorOptions {
    /** Patterns to exclude from detection */
    exclude?: string[];
}
/**
 * ConfigDetector - Platform-agnostic configuration file detection and validation
 *
 * Detects and validates common configuration files like package.json, tsconfig.json,
 * .env files, and various build tool configurations using dependency injection
 * for file system operations.
 *
 * @example
 * ```typescript
 * // Node.js example
 * import { glob } from 'fast-glob';
 * import { readFile } from 'fs/promises';
 *
 * const fsProvider = {
 *   glob: (patterns, cwd, options) => glob(patterns, { cwd, ...options }),
 *   readFile: (path) => readFile(path, 'utf-8')
 * };
 *
 * const detector = new ConfigDetector('/workspace', fsProvider);
 * const files = await detector.detectConfigFiles();
 * ```
 */
export declare class ConfigDetector {
    private workspaceRoot;
    private fileSystem;
    private excludePatterns;
    private configFiles;
    private changeHandlers;
    /**
     * Creates a new ConfigDetector
     *
     * @param workspaceRoot - Root directory to search for configuration files
     * @param fileSystem - File system provider for platform-specific operations
     * @param options - Configuration options
     */
    constructor(workspaceRoot: string, fileSystem: IFileSystemProvider, options?: ConfigDetectorOptions);
    /**
     * Detect all configuration files in the workspace
     *
     * @returns Promise that resolves to array of detected configuration files
     */
    detectConfigFiles(): Promise<ConfigFile[]>;
    /**
     * Determine configuration file type from filename
     *
     * @param fileName - The file name to analyze
     * @returns The configuration type
     */
    private determineConfigType;
    /**
     * Parse a configuration file
     *
     * @param filePath - Path to the configuration file
     * @returns Promise that resolves to parse result
     */
    parseConfigFile(filePath: string): Promise<ConfigParseResult>;
    /**
     * Extract metadata from configuration content
     *
     * @param content - Parsed configuration content
     * @param filePath - Path to the file (used to determine type)
     * @returns Extracted metadata or undefined
     */
    private extractMetadata;
    /**
     * Validate a configuration file
     *
     * @param filePath - Path to the configuration file
     * @returns Promise that resolves to validation result
     */
    validateConfig(filePath: string): Promise<ConfigValidationResult>;
    /**
     * Validate package.json content
     *
     * @param content - Parsed package.json content
     * @param result - Validation result to update
     */
    private validatePackageJson;
    /**
     * Validate tsconfig.json content
     *
     * @param content - Parsed tsconfig.json content
     * @param result - Validation result to update
     */
    private validateTsConfig;
    /**
     * Register a handler for configuration changes
     *
     * @param handler - Function to call when configuration changes
     */
    onConfigChange(handler: (change: ConfigChange) => void): void;
}
//# sourceMappingURL=ConfigDetector.d.ts.map