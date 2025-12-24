/**
 * Snapshot Retry Hook with Automatic Error Resolution
 *
 * Provides intelligent retry logic for snapshot creation failures with:
 * - Automatic error diagnosis
 * - Path resolution fixes
 * - Working directory correction
 * - Clear user feedback
 *
 * @module snapshot-retry-hook
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Snapshot creation parameters
 */
export interface SnapshotParams {
	files: string[];
	reason: string;
	trigger: string;
	workspaceRoot?: string;
	onMissingFile?: "error" | "warn" | "skip";
	suggestAlternatives?: boolean;
}

/**
 * Diagnostic information about snapshot failure
 */
export interface SnapshotDiagnosis {
	type:
		| "FILE_NOT_FOUND"
		| "ABSOLUTE_PATH_REJECTED"
		| "PERMISSION_DENIED"
		| "WORKSPACE_MISMATCH"
		| "WORKING_DIRECTORY_MISMATCH"
		| "UNKNOWN";
	message: string;
	cause: string;
	suggestedFix: string;
	userAction: string;
	canAutoFix: boolean;
	confidence: number; // 0-1
	affectedFiles?: string[];
}

/**
 * Result of snapshot creation attempt
 */
export interface SnapshotResult {
	success: boolean;
	snapshot?: any;
	error?: string;
	suggestion?: string;
	diagnostics?: SnapshotDiagnosis;
	attempt?: number;
	totalAttempts?: number;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
	maxRetries: number;
	delayMs: number;
	exponentialBackoff: boolean;
	autoFix: boolean;
	verbose: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	delayMs: 100,
	exponentialBackoff: true,
	autoFix: true,
	verbose: true,
};

/**
 * Create snapshot with automatic retry and error resolution
 *
 * @param params - Snapshot creation parameters
 * @param snapshotFn - Function to create snapshot (injected for testability)
 * @param config - Retry configuration
 * @returns Promise<SnapshotResult>
 *
 * @example
 * ```typescript
 * const result = await createSnapshotWithRetry({
 *   files: ['src/index.ts', 'src/utils.ts'],
 *   reason: 'Pre-deployment snapshot',
 *   trigger: 'manual',
 *   workspaceRoot: '/path/to/workspace'
 * }, createSnapshot);
 * ```
 */
export async function createSnapshotWithRetry(
	params: SnapshotParams,
	snapshotFn: (args: any) => Promise<any>,
	config: Partial<RetryConfig> = {},
): Promise<SnapshotResult> {
	const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
	const { files, reason, trigger, workspaceRoot = process.cwd(), onMissingFile, suggestAlternatives } = params;

	let lastError: Error | null = null;
	let lastDiagnosis: SnapshotDiagnosis | null = null;

	// Mutable state for auto-fixes
	const context = {
		files: [...files],
		workspaceRoot,
		originalCwd: process.cwd(),
	};

	for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
		try {
			if (cfg.verbose && attempt > 1) {
				console.error(`[SnapBack Retry] Attempt ${attempt}/${cfg.maxRetries}`);
			}

			// Apply delay with exponential backoff
			if (attempt > 1) {
				const delay = cfg.exponentialBackoff ? cfg.delayMs * 2 ** (attempt - 2) : cfg.delayMs;

				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			// Attempt snapshot creation
			const result = await snapshotFn({
				files: context.files,
				reason,
				trigger,
				...(onMissingFile && { onMissingFile }),
				...(suggestAlternatives !== undefined && { suggestAlternatives }),
			});

			// Check for explicit success=false (validation failures return without throwing)
			if (result && result.success === false) {
				throw new Error(result.error || "Snapshot creation failed");
			}

			// Success!
			if (cfg.verbose && attempt > 1) {
				console.error(`[SnapBack Retry] ✅ Succeeded on attempt ${attempt}`);
			}

			return {
				success: true,
				snapshot: result.snapshot || result,
				attempt,
				totalAttempts: attempt,
			};
		} catch (error) {
			lastError = error as Error;

			// Diagnose the failure
			const diagnosis = diagnoseSnapshotFailure(error, context.files, context.workspaceRoot);
			lastDiagnosis = diagnosis;

			if (cfg.verbose) {
				console.error(`[SnapBack Retry] ❌ Attempt ${attempt}/${cfg.maxRetries} failed`);
				console.error(`[SnapBack Retry] 🔍 Diagnosis: ${diagnosis.type}`);
				console.error(`[SnapBack Retry] 📋 ${diagnosis.message}`);
				console.error(`[SnapBack Retry] 💡 ${diagnosis.suggestedFix}`);
			}

			// Try automatic fix if enabled
			if (cfg.autoFix && diagnosis.canAutoFix && attempt < cfg.maxRetries) {
				const fixApplied = await applyAutomaticFix(diagnosis, context);

				if (fixApplied) {
					if (cfg.verbose) {
						console.error(`[SnapBack Retry] 🔧 Applied automatic fix: ${diagnosis.userAction}`);
					}
					continue; // Retry with fix
				}
			}

			// No fix possible or last attempt - bail out
			if (attempt === cfg.maxRetries) {
				break;
			}

			// Log that we're retrying without fix
			if (cfg.verbose && !diagnosis.canAutoFix) {
				console.error("[SnapBack Retry] ⚠️  No automatic fix available, retrying anyway...");
			}
		}
	}

	// All retries exhausted
	return {
		success: false,
		error: lastError?.message || "Unknown error",
		suggestion: lastDiagnosis?.userAction || "Check logs for details",
		diagnostics: lastDiagnosis || undefined,
		attempt: cfg.maxRetries,
		totalAttempts: cfg.maxRetries,
	};
}

/**
 * Diagnose why snapshot creation failed
 *
 * @param error - The error that occurred
 * @param files - Files that were attempted
 * @param workspaceRoot - Expected workspace root
 * @returns Diagnosis with suggested fixes
 */
export function diagnoseSnapshotFailure(error: unknown, files: string[], workspaceRoot: string): SnapshotDiagnosis {
	const errorMessage = String(error);
	const errorStack = error instanceof Error ? error.stack || "" : "";

	// Pattern 1: File not found (ENOENT)
	if (errorMessage.includes("ENOENT") || errorMessage.includes("no such file")) {
		const missingFile = extractFilePath(errorMessage);
		const affectedFiles = files.filter((f) => {
			const fullPath = path.isAbsolute(f) ? f : path.join(workspaceRoot, f);
			return !fs.existsSync(fullPath);
		});

		// Check if files exist but in wrong location
		const filesExistInWorkspace = affectedFiles.every((f) => {
			const fullPath = path.join(workspaceRoot, f);
			return fs.existsSync(fullPath);
		});

		if (filesExistInWorkspace) {
			return {
				type: "WORKING_DIRECTORY_MISMATCH",
				message: "Files exist but not found from current directory",
				cause: `Snapshot tool running from '${process.cwd()}' but files are in '${workspaceRoot}'`,
				suggestedFix: "Change working directory to workspace root",
				userAction: "Automatic: Changing working directory",
				canAutoFix: true,
				confidence: 0.95,
				affectedFiles,
			};
		}

		return {
			type: "FILE_NOT_FOUND",
			message: `File not found: ${missingFile || affectedFiles.join(", ")}`,
			cause: affectedFiles.length > 0 ? "Files do not exist in workspace" : "File path may be incorrect",
			suggestedFix:
				affectedFiles.length > 0
					? "Wait for file creation to complete or verify paths"
					: "Check file paths are correct",
			userAction: "Manual: Verify file exists",
			canAutoFix: false,
			confidence: 0.85,
			affectedFiles: affectedFiles.length > 0 ? affectedFiles : [missingFile].filter(Boolean),
		};
	}

	// Pattern 2: Absolute path rejected
	if (errorMessage.includes("Absolute paths not allowed")) {
		const absoluteFiles = files.filter((f) => path.isAbsolute(f));

		return {
			type: "ABSOLUTE_PATH_REJECTED",
			message: "Snapshot tool requires relative paths",
			cause: "Provided absolute path instead of relative to workspace root",
			suggestedFix: "Convert to paths relative to workspace root",
			userAction: "Automatic: Converting to relative paths",
			canAutoFix: true,
			confidence: 1.0,
			affectedFiles: absoluteFiles,
		};
	}

	// Pattern 3: Permission denied
	if (errorMessage.includes("EACCES") || errorMessage.includes("permission denied")) {
		return {
			type: "PERMISSION_DENIED",
			message: "Permission denied accessing files",
			cause: "Insufficient file system permissions",
			suggestedFix: "Check file permissions or run with elevated privileges",
			userAction: "Manual: Fix file permissions",
			canAutoFix: false,
			confidence: 0.9,
		};
	}

	// Pattern 4: Workspace mismatch (heuristic)
	if (
		errorMessage.includes("workspace") ||
		files.some((f) => !path.isAbsolute(f) && !fs.existsSync(path.join(process.cwd(), f)))
	) {
		return {
			type: "WORKSPACE_MISMATCH",
			message: "Working directory does not match file locations",
			cause: `Snapshot tool expects files relative to '${process.cwd()}' but workspace is '${workspaceRoot}'`,
			suggestedFix: `Set working directory to: ${workspaceRoot}`,
			userAction: "Automatic: Changing working directory",
			canAutoFix: true,
			confidence: 0.8,
		};
	}

	// Unknown error
	return {
		type: "UNKNOWN",
		message: errorMessage,
		cause: "Unrecognized error pattern",
		suggestedFix: "Review error details and file state",
		userAction: "Manual: Debug required",
		canAutoFix: false,
		confidence: 0.3,
	};
}

/**
 * Apply automatic fix based on diagnosis
 *
 * @param diagnosis - Error diagnosis
 * @param context - Mutable context with files and workspace
 * @returns true if fix was applied
 */
async function applyAutomaticFix(
	diagnosis: SnapshotDiagnosis,
	context: { files: string[]; workspaceRoot: string; originalCwd: string },
): Promise<boolean> {
	if (!diagnosis.canAutoFix) {
		return false;
	}

	try {
		switch (diagnosis.type) {
			case "ABSOLUTE_PATH_REJECTED": {
				// Convert absolute → relative paths
				context.files = context.files.map((f) =>
					path.isAbsolute(f) ? path.relative(context.workspaceRoot, f) : f,
				);

				console.error(`[SnapBack Fix] ✅ Converted ${diagnosis.affectedFiles?.length || 0} paths to relative`);
				return true;
			}

			case "WORKING_DIRECTORY_MISMATCH":
			case "WORKSPACE_MISMATCH": {
				// Change working directory
				process.chdir(context.workspaceRoot);
				console.error(`[SnapBack Fix] ✅ Changed working directory to: ${context.workspaceRoot}`);
				return true;
			}

			case "FILE_NOT_FOUND": {
				// Can't auto-fix missing files, but we can validate and filter
				// (Only if we're confident files just haven't been created yet)
				if (diagnosis.confidence < 0.5) {
					return false;
				}

				// Wait a bit for file creation to complete
				await new Promise((resolve) => setTimeout(resolve, 500));

				// Re-check file existence
				const existingFiles = context.files.filter((f) => {
					const fullPath = path.isAbsolute(f) ? f : path.join(context.workspaceRoot, f);
					return fs.existsSync(fullPath);
				});

				if (existingFiles.length > 0 && existingFiles.length < context.files.length) {
					console.error(
						`[SnapBack Fix] ⚠️  Some files still missing. Proceeding with ${existingFiles.length}/${context.files.length} files`,
					);
					context.files = existingFiles;
					return true;
				}

				return false;
			}

			default:
				return false;
		}
	} catch (fixError) {
		console.error(`[SnapBack Fix] ❌ Failed to apply fix: ${fixError}`);
		return false;
	}
}

/**
 * Extract file path from error message
 *
 * @param errorMessage - Error message to parse
 * @returns Extracted file path or empty string
 */
function extractFilePath(errorMessage: string): string {
	// Try to extract file path from common error patterns
	const patterns = [
		/ENOENT:.*?'([^']+)'/, // ENOENT: no such file or directory, open 'file.ts'
		/no such file or directory.*?[:`]([^\s]+)/, // no such file or directory: file.ts
		/Failed to read file ([^\s:]+)/, // Failed to read file file.ts
	];

	for (const pattern of patterns) {
		const match = errorMessage.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}

	return "";
}

/**
 * Format diagnosis for human-readable output
 *
 * @param diagnosis - Diagnosis to format
 * @returns Formatted string
 */
export function formatDiagnosis(diagnosis: SnapshotDiagnosis): string {
	const confidence = Math.round(diagnosis.confidence * 100);
	const autoFix = diagnosis.canAutoFix ? "✅ Auto-fixable" : "⚠️  Manual fix required";

	let output = `
🔍 Snapshot Failure Diagnosis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type: ${diagnosis.type}
Confidence: ${confidence}%
${autoFix}

📋 Issue:
  ${diagnosis.message}

🔎 Root Cause:
  ${diagnosis.cause}

💡 Suggested Fix:
  ${diagnosis.suggestedFix}

👤 Action Required:
  ${diagnosis.userAction}
`;

	if (diagnosis.affectedFiles && diagnosis.affectedFiles.length > 0) {
		output += `
📁 Affected Files:
${diagnosis.affectedFiles.map((f) => `  - ${f}`).join("\n")}
`;
	}

	return output;
}
