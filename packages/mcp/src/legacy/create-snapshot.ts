import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { createSnapshotWithRetry, formatDiagnosis } from "../utils/snapshot-retry-hook";
import { getSnapshotManager, toFileInputs } from "./sdk-adapter";

// Schema for create snapshot tool
export const CreateSnapshotSchema = z.object({
	files: z.array(z.string()).describe("Array of file paths to snapshot (relative to workspace root)"),
	reason: z.string().optional().describe("Optional reason for creating the snapshot"),
	trigger: z.enum(["manual", "mcp", "ai_assist", "session_end"]).optional().describe("What triggered the snapshot"),
	onMissingFile: z
		.enum(["error", "warn", "skip"])
		.optional()
		.default("error")
		.describe("How to handle missing files: error (fail), warn (log + continue), skip (silent continue)"),
	suggestAlternatives: z
		.boolean()
		.optional()
		.default(true)
		.describe("Whether to suggest alternative file paths when file not found"),
});

/**
 * Result of file validation with suggestions
 */
interface FileValidationResult {
	path: string;
	exists: boolean;
	resolvedPath: string;
	size?: number;
	error?: string;
	suggestions?: Array<{
		path: string;
		confidence: number;
		reason: string;
	}>;
}

/**
 * Validate file paths and suggest alternatives if not found
 */
function validateFilePaths(
	paths: string[],
	workspaceRoot: string,
	suggestAlternatives: boolean,
): FileValidationResult[] {
	const results: FileValidationResult[] = [];

	for (const path of paths) {
		// Reject absolute paths
		if (isAbsolute(path)) {
			results.push({
				path,
				exists: false,
				resolvedPath: path,
				error: "Absolute paths not allowed. Use workspace-relative paths.",
			});
			continue;
		}

		// Resolve path relative to workspace root
		const resolvedPath = resolve(workspaceRoot, path);

		// Check if file exists
		if (!existsSync(resolvedPath)) {
			const suggestions: Array<{ path: string; confidence: number; reason: string }> = [];

			if (suggestAlternatives) {
				// Try common variations
				const variations = generatePathVariations(path, workspaceRoot);
				for (const variation of variations) {
					if (existsSync(variation.absolute)) {
						suggestions.push({
							path: variation.relative,
							confidence: variation.confidence,
							reason: variation.reason,
						});
					}
				}
			}

			results.push({
				path,
				exists: false,
				resolvedPath,
				error: "File not found",
				suggestions: suggestions.length > 0 ? suggestions : undefined,
			});
		} else {
			// File exists - get size
			const stats = statSync(resolvedPath);
			results.push({
				path,
				exists: true,
				resolvedPath,
				size: stats.size,
			});
		}
	}

	return results;
}

/**
 * Generate possible path variations for fuzzy matching
 */
function generatePathVariations(
	path: string,
	workspaceRoot: string,
): Array<{ absolute: string; relative: string; confidence: number; reason: string }> {
	const variations: Array<{ absolute: string; relative: string; confidence: number; reason: string }> = [];

	// Try adding 'src/' prefix
	if (!path.startsWith("src/")) {
		const srcPath = join("src", path);
		variations.push({
			absolute: resolve(workspaceRoot, srcPath),
			relative: srcPath,
			confidence: 0.85,
			reason: "Common pattern: files in src/ directory",
		});
	}

	// Try removing leading './' if present
	if (path.startsWith("./")) {
		const cleanPath = path.slice(2);
		variations.push({
			absolute: resolve(workspaceRoot, cleanPath),
			relative: cleanPath,
			confidence: 0.95,
			reason: "Normalized path (removed ./)",
		});
	}

	// Try parent directory
	const parentPath = join(dirname(path), "..", basename(path));
	variations.push({
		absolute: resolve(workspaceRoot, parentPath),
		relative: parentPath,
		confidence: 0.6,
		reason: "Check parent directory",
	});

	// Try with common file extensions if missing
	const ext = path.split(".").pop();
	if (!ext || ext.length > 4) {
		// No extension or unlikely to be extension
		for (const testExt of [".ts", ".tsx", ".js", ".jsx", ".md"]) {
			const withExt = `${path}${testExt}`;
			variations.push({
				absolute: resolve(workspaceRoot, withExt),
				relative: withExt,
				confidence: 0.75,
				reason: `Try with ${testExt} extension`,
			});
		}
	}

	return variations;
}

/**
 * Format enhanced error message with context and suggestions
 */
function formatEnhancedError(validation: FileValidationResult, workspaceRoot: string): string {
	const lines: string[] = [];

	lines.push("❌ Failed to create snapshot");
	lines.push("");
	lines.push("Problem: File not found");
	lines.push(`  Path requested: ${validation.path}`);
	lines.push(`  Workspace root: ${workspaceRoot}`);
	lines.push(`  Resolved to: ${validation.resolvedPath}`);

	if (validation.error?.includes("Absolute paths")) {
		lines.push("");
		lines.push("⚠️  Absolute paths are not allowed");
		lines.push(`  Use paths relative to workspace root: ${workspaceRoot}`);
		lines.push("");
		lines.push("Example:");
		lines.push(`  ❌ ${validation.path}`);
		lines.push(`  ✅ ${relative(workspaceRoot, validation.path)}`);
	} else if (validation.suggestions && validation.suggestions.length > 0) {
		lines.push("");
		lines.push("🔍 Did you mean one of these?");
		for (const [index, suggestion] of validation.suggestions.slice(0, 3).entries()) {
			lines.push(`  ${index + 1}. ${suggestion.path} (${Math.round(suggestion.confidence * 100)}% match)`);
			lines.push(`     ${suggestion.reason}`);
		}
	} else {
		lines.push("");
		lines.push("💡 Troubleshooting tips:");
		lines.push("  • Verify the file exists in your workspace");
		lines.push("  • Check for typos in the filename");
		lines.push("  • Ensure path is relative to workspace root");
		lines.push(`  • Try: ls ${validation.path}`);
	}

	return lines.join("\n");
}

/**
 * Create a snapshot with content-addressed ID
 *
 * @param input - The input parameters for creating a snapshot
 * @returns The snapshot ID and metadata
 */
export async function createSnapshot(input: z.infer<typeof CreateSnapshotSchema>) {
	try {
		const manager = getSnapshotManager();
		const workspaceRoot = process.cwd();

		// Pre-flight validation
		const validationResults = validateFilePaths(input.files, workspaceRoot, input.suggestAlternatives ?? true);

		// Check for validation failures
		const failedFiles = validationResults.filter((r) => !r.exists);
		const validFiles = validationResults.filter((r) => r.exists);

		if (failedFiles.length > 0) {
			const onMissingFile = input.onMissingFile ?? "error";

			if (onMissingFile === "error") {
				// Build detailed error report
				const errorLines: string[] = [];
				errorLines.push("⚠️  Snapshot validation found issues\n");
				errorLines.push("File status:");

				// Show valid files
				for (const file of validFiles) {
					const sizeKB = file.size ? `${(file.size / 1024).toFixed(1)} KB` : "unknown";
					errorLines.push(`  ✅ ${file.path} (${sizeKB})`);
				}

				// Show failed files with details
				for (const file of failedFiles) {
					errorLines.push(`  ❌ ${file.path}`);
				}

				// Show detailed error for first failed file
				if (failedFiles.length > 0) {
					errorLines.push("");
					errorLines.push(formatEnhancedError(failedFiles[0], workspaceRoot));
				}

				return {
					success: false,
					error: errorLines.join("\n"),
					validationResults: {
						total: input.files.length,
						valid: validFiles.length,
						failed: failedFiles.length,
						files: validationResults,
					},
				};
			}

			// For "warn", log warnings but continue with valid files
			if (onMissingFile === "warn") {
				console.warn(
					`[SnapBack MCP] Warning: ${failedFiles.length} file(s) not found, continuing with ${validFiles.length} valid file(s)`,
				);
				for (const file of failedFiles) {
					console.warn(`  - ${file.path}: ${file.error}`);
				}
			}
			// For "skip", silently continue with valid files
		}

		// Read file contents from valid file paths
		const files: Array<{ path: string; content: string }> = [];

		for (const validation of validFiles) {
			try {
				const content = readFileSync(validation.resolvedPath, "utf-8");
				files.push({ path: validation.path, content });
			} catch (error) {
				// Detailed error with sanitization
				const errorMsg = error instanceof Error ? error.message : "Unknown error";
				// Sanitize file paths from error message per memory ba41b9cb
				const sanitized = errorMsg.replace(/\/[^\s]+/g, "/***");
				return {
					success: false,
					error: `Failed to read file ${validation.path}: ${sanitized}`,
				};
			}
		}

		if (files.length === 0) {
			const message =
				validFiles.length === 0
					? "No valid files found. All provided paths failed validation."
					: "All files failed to read despite passing validation.";
			return {
				success: false,
				error: message,
			};
		}

		// Convert to SDK FileInput format
		const fileInputs = toFileInputs(files);

		// Create snapshot using SnapshotManager
		const snapshot = await manager.create(fileInputs, {
			description: input.reason || "MCP snapshot",
			protected: false,
		});

		// Format response for MCP with validation details
		const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
		const response = {
			id: snapshot.id,
			timestamp: snapshot.timestamp,
			reason: input.reason || "MCP snapshot",
			fileCount: (snapshot.files || []).length,
			trigger: input.trigger || "mcp",
			totalBytes: totalSize,
			validation: {
				requested: input.files.length,
				included: files.length,
				skipped: input.files.length - files.length,
			},
		};

		return {
			success: true,
			snapshot: response,
		};
	} catch (error) {
		// Sanitize error per memory ba41b9cb-0130-4baa-a7a4-59a3a4cdd4ee
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		const sanitized = errorMsg
			.replace(/\/[^\s]+/g, "/***") // Remove file paths
			.replace(/[A-Z]:\\[^\s]+/g, "***"); // Remove Windows paths

		return {
			success: false,
			error: `Snapshot creation failed: ${sanitized}`,
			help: "Check file paths are relative to workspace root and files exist.",
		};
	}
}

/**
 * Create snapshot with automatic retry and error resolution
 *
 * This is the recommended entry point for snapshot creation. It wraps the standard
 * createSnapshot function with intelligent retry logic that can automatically fix
 * common errors like:
 * - Working directory mismatches
 * - Absolute vs relative path issues
 * - Missing files (with smart waiting)
 *
 * @param input - Snapshot creation parameters
 * @param options - Optional retry configuration
 * @returns Promise<SnapshotResult> with diagnostic information
 *
 * @example
 * ```typescript
 * const result = await createSnapshotWithRetry({
 *   files: ['src/index.ts'],
 *   reason: 'Pre-deployment snapshot',
 *   trigger: 'manual'
 * });
 *
 * if (!result.success) {
 *   console.error(result.error);
 *   console.error(formatDiagnosis(result.diagnostics!));
 * }
 * ```
 */
export async function createSnapshotWithAutoRetry(
	input: z.infer<typeof CreateSnapshotSchema>,
	options?: {
		maxRetries?: number;
		verbose?: boolean;
		autoFix?: boolean;
	},
) {
	const workspaceRoot = process.cwd();

	// Use the retry hook
	const result = await createSnapshotWithRetry(
		{
			files: input.files,
			reason: input.reason || "MCP snapshot",
			trigger: input.trigger || "mcp",
			workspaceRoot,
			onMissingFile: input.onMissingFile,
			suggestAlternatives: input.suggestAlternatives,
		},
		createSnapshot,
		{
			maxRetries: options?.maxRetries ?? 3,
			verbose: options?.verbose ?? true,
			autoFix: options?.autoFix ?? true,
			delayMs: 100,
			exponentialBackoff: true,
		},
	);

	// If retry failed with diagnostics, include formatted diagnosis
	if (!result.success && result.diagnostics) {
		const formattedDiagnostics = formatDiagnosis(result.diagnostics);

		return {
			...result,
			help: `${result.suggestion}\n\n${formattedDiagnostics}`,
		};
	}

	return result;
}
