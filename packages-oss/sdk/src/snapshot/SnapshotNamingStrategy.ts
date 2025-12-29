import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type { ILogger } from "../core/session/interfaces";
import { NoOpLogger } from "../core/session/interfaces";

const execAsync = promisify(exec);

/**
 * File change status types matching git diff output
 */
export interface FileChange {
	path: string;
	status: "added" | "modified" | "deleted";
	linesAdded: number;
	linesDeleted: number;
}

/**
 * Snapshot information for name generation
 */
export interface SnapshotInfo {
	files: FileChange[];
	workspaceRoot: string;
	/** Optional user-provided context (e.g., 'bug-fix', 'credentials', or custom text) */
	userContext?: string;
}

/**
 * Options for SnapshotNamingStrategy
 */
export interface SnapshotNamingStrategyOptions {
	/** Logger instance for debug output */
	logger?: ILogger;
	/** Git command timeout in milliseconds (default: 5000) */
	gitTimeoutMs?: number;
	/** Maximum name length (default: 60) */
	maxNameLength?: number;
}

/**
 * Multi-tier intelligent snapshot naming strategy
 *
 * Naming Tiers (fallback chain):
 * 1. Git Analysis: Parse git diff --name-status output
 * 2. File Operations: Detect patterns from extensions/paths
 * 3. Content Analysis: Count import/function/class changes
 * 4. Fallback: Line count summary
 *
 * Performance: < 50ms for name generation
 *
 * @example
 * ```typescript
 * import { SnapshotNamingStrategy } from '@snapback-oss/sdk';
 *
 * const strategy = new SnapshotNamingStrategy('/path/to/workspace', {
 *   logger: myLogger // optional
 * });
 *
 * const name = await strategy.generateName({
 *   files: [{ path: 'src/auth.ts', status: 'modified', linesAdded: 10, linesDeleted: 5 }],
 *   workspaceRoot: '/path/to/workspace'
 * });
 * // Returns: "Modified auth.ts" or "Updated 3 imports" etc.
 * ```
 */
export class SnapshotNamingStrategy {
	private readonly workspaceRoot: string;
	private readonly gitTimeoutMs: number;
	private readonly maxNameLength: number;
	private readonly logger: ILogger;

	constructor(workspaceRoot: string, options: SnapshotNamingStrategyOptions = {}) {
		this.workspaceRoot = workspaceRoot;
		this.logger = options.logger ?? new NoOpLogger();
		this.gitTimeoutMs = options.gitTimeoutMs ?? 5000;
		this.maxNameLength = options.maxNameLength ?? 60;
	}

	/**
	 * Generates a snapshot name using multi-tier fallback strategy
	 *
	 * @param info - Snapshot information containing file changes
	 * @returns Promise resolving to a descriptive snapshot name
	 */
	async generateName(info: SnapshotInfo): Promise<string> {
		// Early exit for empty file list
		if (info.files.length === 0) {
			return "No changes";
		}

		// Generate base name using existing intelligent strategy
		let baseName: string;

		// Tier 1: Git-based naming
		const gitName = await this.tryGitNaming(info);
		if (gitName) {
			baseName = gitName;
		} else {
			// Tier 2: File operation pattern detection
			const fileOpName = this.tryFileOperationNaming(info);
			if (fileOpName) {
				baseName = fileOpName;
			} else {
				// Tier 3: Content analysis
				const contentName = await this.tryContentAnalysisNaming(info);
				if (contentName) {
					baseName = contentName;
				} else {
					// Tier 4: Fallback to line counts
					baseName = this.fallbackNaming(info);
				}
			}
		}

		// If user provided context, prepend it (Conventional Commits style)
		if (info.userContext) {
			const prefix = this.formatUserContext(info.userContext);
			return `${prefix}: ${baseName}`;
		}

		return baseName;
	}

	/**
	 * Tier 1: Git-based naming
	 * Attempts to use actual git commands to generate names.
	 * Returns null if git is unavailable or no git repo exists.
	 */
	private async tryGitNaming(info: SnapshotInfo): Promise<string | null> {
		try {
			// Check if we're in a git repository
			const isGitRepo = await this.execGit(["rev-parse", "--git-dir"]);
			if (!isGitRepo) {
				return null;
			}

			// Try to get actual git status
			const gitStatus = await this.execGit(["status", "--porcelain"]);
			if (!gitStatus) {
				return null;
			}

			// If we have git info, generate git-style names
			if (info.files.length === 1) {
				const file = info.files[0];
				return this.generateSingleFileGitName(file.status, file.path);
			}

			return this.generateMultiFileGitName(info.files);
		} catch (_error) {
			// Git operation failed, fall through to next tier
			return null;
		}
	}

	/**
	 * Tier 2: File operation pattern detection
	 * Detects test files, configs, dependencies with priority ordering
	 */
	private tryFileOperationNaming(info: SnapshotInfo): string | null {
		const files = info.files;

		// Priority 1: Check for test files (highest priority)
		const testFiles = files.filter((f) => this.isTestFile(f.path));
		if (testFiles.length > 0 && testFiles.length === files.length) {
			return `Updated ${testFiles.length} test${testFiles.length > 1 ? "s" : ""}`;
		}

		// Priority 2: Check for dependency files
		const dependencyFiles = files.filter((f) => this.isDependencyFile(f.path));
		if (dependencyFiles.length > 0) {
			return "Updated dependencies";
		}

		// Priority 3: Check for config files (all files must be configs)
		const configFiles = files.filter((f) => this.isConfigFile(f.path));
		if (configFiles.length > 0 && configFiles.length === files.length) {
			return `Modified ${configFiles.length} config${configFiles.length > 1 ? "s" : ""}`;
		}

		// Priority 4: Mixed types with test files - prioritize test detection
		if (testFiles.length > 0 && testFiles.length < files.length) {
			return `Updated ${testFiles.length} test${testFiles.length > 1 ? "s" : ""}`;
		}

		return null;
	}

	/**
	 * Tier 3: Content analysis
	 * Detects refactoring patterns, structure changes, and import modifications
	 */
	private async tryContentAnalysisNaming(info: SnapshotInfo): Promise<string | null> {
		try {
			// Count both imports and structure changes
			const importCount = await this.countImportChanges(info.files);
			const structureCount = await this.countStructureChanges(info.files);

			// Priority 1: Import changes (simpler, more specific)
			if (importCount > 0 && structureCount === 0) {
				return `Updated ${importCount} import${importCount > 1 ? "s" : ""}`;
			}

			// Priority 2: Refactoring detection - multiple files with significant structure changes
			if (structureCount > 3 && info.files.length > 1) {
				const commonDir = this.findCommonDirectory(info.files);
				const moduleName = this.extractModuleName(commonDir, info.files);
				return `Refactored ${moduleName} module (${info.files.length} files)`;
			}

			// Priority 3: Single file refactoring with many structure changes
			if (structureCount >= 3 && info.files.length === 1) {
				const dir = path.dirname(info.files[0].path);
				const moduleName = this.extractModuleName(dir, info.files);
				return `Refactored ${moduleName} (${structureCount} changes)`;
			}

			// Priority 4: Import changes even with some structure changes
			if (importCount > 0) {
				return `Updated ${importCount} import${importCount > 1 ? "s" : ""}`;
			}

			return null;
		} catch (_error) {
			// Content analysis failed, fall through
			return null;
		}
	}

	/**
	 * Tier 4: Fallback naming
	 * Uses git-style format for code files, line count for unknown/non-code files
	 */
	private fallbackNaming(info: SnapshotInfo): string {
		const totalLines = info.files.reduce((sum, file) => sum + file.linesAdded + file.linesDeleted, 0);
		const fileCount = info.files.length;

		// Check if files are code files (should use git-style format)
		const allCodeFiles = info.files.every((f) => this.isCodeFile(f.path));

		// Single file with unknown extension: use line count format
		if (info.files.length === 1) {
			const file = info.files[0];

			// Use line count format for non-code files
			if (!this.isCodeFile(file.path)) {
				return `Modified 1 file (${totalLines} lines)`;
			}

			// Use git-style format for code files
			return this.generateSingleFileGitName(file.status, file.path);
		}

		// Multiple files: if all non-code files, use line count
		if (!allCodeFiles) {
			return `Modified ${fileCount} files (${totalLines} lines)`;
		}

		// Multiple code files: use git-style format
		const hasAdditions = info.files.some((f) => f.status === "added");
		const hasModifications = info.files.some((f) => f.status === "modified");
		const hasDeletions = info.files.some((f) => f.status === "deleted");

		if (hasAdditions || hasModifications || hasDeletions) {
			return this.generateMultiFileGitName(info.files);
		}

		// Final fallback: line count summary
		return `Modified ${fileCount} files (${totalLines} lines)`;
	}

	/**
	 * Execute git command with error handling
	 */
	private async execGit(args: string[]): Promise<string | null> {
		try {
			const { stdout } = await execAsync(`git ${args.join(" ")}`, {
				cwd: this.workspaceRoot,
				timeout: this.gitTimeoutMs,
			});
			return stdout.trim();
		} catch (_error) {
			return null;
		}
	}

	/**
	 * Generate single-file git-style name
	 */
	private generateSingleFileGitName(status: "added" | "modified" | "deleted", filePath: string): string {
		const basename = path.basename(filePath);
		const sanitizedName = this.sanitizeFilename(basename);
		const truncatedName = this.truncatePath(sanitizedName, this.maxNameLength - 20);

		switch (status) {
			case "added":
				return `Added ${truncatedName}`;
			case "modified":
				return `Modified ${truncatedName}`;
			case "deleted":
				return `Deleted ${truncatedName}`;
		}
	}

	/**
	 * Generate multi-file git-style name (e.g., "3A 2M 1D in src/auth")
	 */
	private generateMultiFileGitName(files: FileChange[]): string {
		const added = files.filter((f) => f.status === "added").length;
		const modified = files.filter((f) => f.status === "modified").length;
		const deleted = files.filter((f) => f.status === "deleted").length;

		const parts: string[] = [];
		if (added > 0) parts.push(`${added}A`);
		if (modified > 0) parts.push(`${modified}M`);
		if (deleted > 0) parts.push(`${deleted}D`);

		const statusSummary = parts.join(" ");
		const commonDir = this.findCommonDirectory(files);
		const dirName = commonDir ? this.getRelativeDirectory(commonDir) : "workspace";

		return `${statusSummary} in ${dirName}`;
	}

	/**
	 * Find common directory path for multiple files
	 */
	private findCommonDirectory(files: FileChange[]): string {
		if (files.length === 0) return "";
		if (files.length === 1) return path.dirname(files[0].path);

		const dirPaths = files.map((f) => path.dirname(f.path));
		const segmentArrays = dirPaths.map((dir) => dir.split(path.sep));
		const firstSegments = segmentArrays[0];
		const commonSegments: string[] = [];

		for (let i = 0; i < firstSegments.length; i++) {
			const segment = firstSegments[i];
			const allMatch = segmentArrays.every((segments) => segments[i] === segment);
			if (allMatch) {
				commonSegments.push(segment);
			} else {
				break;
			}
		}

		return commonSegments.length === 0 ? "" : commonSegments.join(path.sep);
	}

	/**
	 * Get relative directory name from absolute path
	 */
	private getRelativeDirectory(absolutePath: string): string {
		let relative = path.relative(this.workspaceRoot, absolutePath);

		if (relative) {
			relative = relative.split(path.sep).join("/");
			if (relative.startsWith("./")) relative = relative.substring(2);
			if (relative && relative !== "." && !relative.startsWith("..")) return relative;
		}

		return ".";
	}

	/**
	 * Extract meaningful module name from directory path
	 */
	private extractModuleName(dirPath: string, files: FileChange[]): string {
		if (!dirPath) return "module";

		const basename = path.basename(dirPath);

		if (basename.includes("tmp") || basename.includes("test-") || basename.startsWith(".")) {
			if (files.length > 0) {
				const firstFile = files[0].path;
				const parts = firstFile.split(path.sep).filter((p) => p && p !== ".");

				for (let i = parts.length - 2; i >= 0; i--) {
					const part = parts[i];
					if (!part.includes("tmp") && !part.includes("test-") && !part.startsWith(".") && part.length > 2) {
						return part;
					}
				}
			}
			return "module";
		}

		return basename;
	}

	/**
	 * Detect if file is a code file (has known code extension)
	 */
	private isCodeFile(filePath: string): boolean {
		const basename = path.basename(filePath);
		const ext = path.extname(filePath).toLowerCase();

		const knownCodeFiles = ["Dockerfile", "Makefile", "README.md", ".gitignore"];
		if (knownCodeFiles.some((known) => basename === known || basename.endsWith(known))) {
			return true;
		}

		if (ext && !this.isKnownCodeExtension(ext)) {
			return false;
		}

		return true;
	}

	/**
	 * Check if extension is a known code file extension
	 */
	private isKnownCodeExtension(ext: string): boolean {
		const codeExtensions = [
			".ts", ".js", ".tsx", ".jsx", ".py", ".java", ".c", ".cpp", ".h", ".hpp",
			".go", ".rs", ".rb", ".php", ".cs", ".swift", ".kt", ".scala",
			".html", ".css", ".scss", ".sass", ".less",
			".json", ".xml", ".yaml", ".yml", ".md", ".config",
		];
		return codeExtensions.includes(ext);
	}

	/**
	 * Detect if file is a test file
	 */
	private isTestFile(filePath: string): boolean {
		const basename = path.basename(filePath);
		const dirname = path.dirname(filePath);

		if (basename.endsWith(".test.ts") || basename.endsWith(".test.js")) return true;
		if (basename.endsWith(".spec.ts") || basename.endsWith(".spec.js")) return true;
		if (dirname.includes("__tests__")) return true;

		return false;
	}

	/**
	 * Detect if file is package.json or dependency-related
	 */
	private isDependencyFile(filePath: string): boolean {
		const basename = path.basename(filePath);
		return (
			basename === "package.json" ||
			basename === "package-lock.json" ||
			basename === "pnpm-lock.yaml" ||
			basename === "yarn.lock"
		);
	}

	/**
	 * Detect if file is configuration
	 */
	private isConfigFile(filePath: string): boolean {
		const basename = path.basename(filePath);

		if (basename.includes(".config.")) return true;
		if (basename.includes("rc")) return true;
		if (basename.startsWith(".env")) return true;

		const configFiles = ["tsconfig.json", "jsconfig.json"];
		return configFiles.includes(basename);
	}

	/**
	 * Count import changes via regex
	 */
	private async countImportChanges(files: FileChange[]): Promise<number> {
		let importCount = 0;
		const importRegex = /import\s+.*from|require\(/g;

		for (const file of files) {
			try {
				const content = await fs.readFile(file.path, "utf-8");
				const matches = content.match(importRegex);
				if (matches) importCount += matches.length;
			} catch (error) {
				this.logger.debug("Failed to read file for import analysis", {
					path: file.path,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return importCount;
	}

	/**
	 * Count function/class changes via regex
	 */
	private async countStructureChanges(files: FileChange[]): Promise<number> {
		let structureCount = 0;
		const structureRegex = /function\s+\w+|class\s+\w+|const\s+\w+\s*=\s*\(/g;

		for (const file of files) {
			try {
				const content = await fs.readFile(file.path, "utf-8");
				const matches = content.match(structureRegex);
				if (matches) structureCount += matches.length;
			} catch (error) {
				this.logger.debug("Failed to read file for structure analysis", {
					path: file.path,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return structureCount;
	}

	/**
	 * Truncate long file paths for display
	 */
	private truncatePath(filePath: string, maxLength: number): string {
		if (filePath.length <= maxLength) return filePath;
		const ellipsis = "...";
		return filePath.substring(0, maxLength - ellipsis.length) + ellipsis;
	}

	/**
	 * Sanitize filenames with special characters
	 */
	private sanitizeFilename(filename: string): string {
		return filename.replace(/[@#$]+/g, " ").replace(/\s+/g, " ").trim();
	}

	/**
	 * Format user-provided context into a snapshot name prefix
	 */
	private formatUserContext(context: string): string {
		const presetMap: Record<string, string> = {
			"bug-fix": "fix",
			credentials: "chore",
			refactor: "refactor",
			testing: "test",
		};

		if (presetMap[context]) return presetMap[context];

		const cleaned = context
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.trim();

		const maxLength = 20;
		if (cleaned.length > maxLength) return cleaned.substring(0, maxLength);

		return cleaned || "update";
	}
}
