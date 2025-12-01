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
	glob(patterns: string[], cwd: string, options?: { ignore?: string[] }): Promise<string[]>;

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
 * package.json structure
 */
interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
	[key: string]: unknown;
}

/**
 * tsconfig.json structure
 */
interface TsConfig {
	compilerOptions?: {
		target?: string | number;
		module?: string | number;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

/**
 * Generic config content
 */
type ConfigContent = Record<string, unknown>;

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
export class ConfigDetector {
	private workspaceRoot: string;
	private fileSystem: IFileSystemProvider;
	private excludePatterns: string[];
	private configFiles: Map<string, ConfigFile> = new Map();
	private changeHandlers: Array<(change: ConfigChange) => void> = [];

	/**
	 * Creates a new ConfigDetector
	 *
	 * @param workspaceRoot - Root directory to search for configuration files
	 * @param fileSystem - File system provider for platform-specific operations
	 * @param options - Configuration options
	 */
	constructor(workspaceRoot: string, fileSystem: IFileSystemProvider, options?: ConfigDetectorOptions) {
		this.workspaceRoot = workspaceRoot;
		this.fileSystem = fileSystem;
		this.excludePatterns = options?.exclude || ["node_modules/**", ".git/**", "dist/**", "build/**"];
	}

	/**
	 * Detect all configuration files in the workspace
	 *
	 * @returns Promise that resolves to array of detected configuration files
	 */
	async detectConfigFiles(): Promise<ConfigFile[]> {
		const patterns = [
			"package.json",
			"tsconfig.json",
			".env*",
			".eslintrc*",
			".prettierrc*",
			"jest.config.*",
			"vitest.config.*",
			"webpack.config.*",
			"next.config.*",
			"vite.config.*",
		];

		const globPatterns = patterns.map((pattern) => `**/${pattern}`);

		try {
			const files = await this.fileSystem.glob(globPatterns, this.workspaceRoot, {
				ignore: this.excludePatterns,
			});

			const configFiles: ConfigFile[] = files.map((file) => {
				const fullPath = `${this.workspaceRoot}/${file}`;
				const type = this.determineConfigType(file);
				const name = file.split("/").pop() || file;

				return {
					type,
					path: fullPath,
					name,
				};
			});

			// Update internal cache
			this.configFiles.clear();
			for (const config of configFiles) {
				this.configFiles.set(config.path, config);
			}

			return configFiles;
		} catch (_error) {
			// Log error if logger is available
			return [];
		}
	}

	/**
	 * Determine configuration file type from filename
	 *
	 * @param fileName - The file name to analyze
	 * @returns The configuration type
	 */
	private determineConfigType(fileName: string): string {
		if (fileName.includes(".env")) {
			return "env";
		}
		if (fileName.includes("package.json")) {
			return "package.json";
		}
		if (fileName.includes("tsconfig")) {
			return "tsconfig";
		}
		if (fileName.includes(".eslintrc")) {
			return "eslint";
		}
		if (fileName.includes(".prettierrc")) {
			return "prettier";
		}
		if (fileName.includes("jest.config")) {
			return "jest";
		}
		if (fileName.includes("vitest.config")) {
			return "vitest";
		}
		if (fileName.includes("webpack.config")) {
			return "webpack";
		}
		if (fileName.includes("next.config")) {
			return "next";
		}
		if (fileName.includes("vite.config")) {
			return "vite";
		}
		return "unknown";
	}

	/**
	 * Parse a configuration file
	 *
	 * @param filePath - Path to the configuration file
	 * @returns Promise that resolves to parse result
	 */
	async parseConfigFile(filePath: string): Promise<ConfigParseResult> {
		try {
			const content = await this.fileSystem.readFile(filePath);

			// Try to parse as JSON first
			if (filePath.endsWith(".json") || filePath.includes("package.json") || filePath.includes("tsconfig")) {
				try {
					const parsed = JSON.parse(content);
					return {
						content: parsed,
						valid: true,
						metadata: this.extractMetadata(parsed, filePath),
					};
				} catch (jsonError) {
					return {
						content: null,
						valid: false,
						error: `Invalid JSON: ${(jsonError as Error).message}`,
					};
				}
			}

			// For non-JSON files, return as text
			return {
				content,
				valid: true,
			};
		} catch (error) {
			return {
				content: null,
				valid: false,
				error: `Failed to read file: ${(error as Error).message}`,
			};
		}
	}

	/**
	 * Extract metadata from configuration content
	 *
	 * @param content - Parsed configuration content
	 * @param filePath - Path to the file (used to determine type)
	 * @returns Extracted metadata or undefined
	 */
	private extractMetadata(content: ConfigContent, filePath: string): Record<string, unknown> | undefined {
		if (!content || typeof content !== "object") {
			return undefined;
		}

		const metadata: Record<string, unknown> = {};

		if (filePath.includes("package.json")) {
			const pkg = content as PackageJson;
			if (pkg.dependencies) {
				metadata.dependencies = Object.keys(pkg.dependencies);
			}
			if (pkg.devDependencies) {
				metadata.devDependencies = Object.keys(pkg.devDependencies);
			}
			if (pkg.scripts) {
				metadata.scripts = Object.keys(pkg.scripts);
			}
		}

		return Object.keys(metadata).length > 0 ? metadata : undefined;
	}

	/**
	 * Validate a configuration file
	 *
	 * @param filePath - Path to the configuration file
	 * @returns Promise that resolves to validation result
	 */
	async validateConfig(filePath: string): Promise<ConfigValidationResult> {
		const result: ConfigValidationResult = {
			valid: true,
			errors: [],
			warnings: [],
		};

		try {
			const parseResult = await this.parseConfigFile(filePath);

			if (!parseResult.valid) {
				result.valid = false;
				result.errors.push(parseResult.error || "Failed to parse config file");
				return result;
			}

			// Add specific validation rules based on file type
			if (filePath.includes("package.json")) {
				this.validatePackageJson(parseResult.content as ConfigContent, result);
			} else if (filePath.includes("tsconfig")) {
				this.validateTsConfig(parseResult.content as ConfigContent, result);
			}

			return result;
		} catch (error) {
			result.valid = false;
			result.errors.push(`Validation error: ${(error as Error).message}`);
			return result;
		}
	}

	/**
	 * Validate package.json content
	 *
	 * @param content - Parsed package.json content
	 * @param result - Validation result to update
	 */
	private validatePackageJson(content: ConfigContent, result: ConfigValidationResult): void {
		const pkg = content as PackageJson;

		if (!pkg.name) {
			result.errors.push("Missing required field: name");
			result.valid = false;
		}

		if (!pkg.version) {
			result.errors.push("Missing required field: version");
			result.valid = false;
		}
	}

	/**
	 * Validate tsconfig.json content
	 *
	 * @param content - Parsed tsconfig.json content
	 * @param result - Validation result to update
	 */
	private validateTsConfig(content: ConfigContent, result: ConfigValidationResult): void {
		const tsconfig = content as TsConfig;

		if (tsconfig && typeof tsconfig === "object" && tsconfig.compilerOptions) {
			// Basic validation for tsconfig
			if (tsconfig.compilerOptions.target && typeof tsconfig.compilerOptions.target !== "string") {
				result.warnings.push("compilerOptions.target should be a string");
			}

			if (tsconfig.compilerOptions.module && typeof tsconfig.compilerOptions.module !== "string") {
				result.warnings.push("compilerOptions.module should be a string");
			}
		}
	}

	/**
	 * Register a handler for configuration changes
	 *
	 * @param handler - Function to call when configuration changes
	 */
	onConfigChange(handler: (change: ConfigChange) => void): void {
		this.changeHandlers.push(handler);
	}
}
