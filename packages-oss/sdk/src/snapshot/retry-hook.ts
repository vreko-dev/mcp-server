/**
 * Snapshot Retry Hook with Automatic Error Resolution
 *
 * Provides intelligent retry logic for snapshot creation failures with:
 * - Automatic error diagnosis
 * - Path resolution fixes
 * - Working directory correction
 * - Clear user feedback
 *
 * @module snapshot/retry-hook
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Result } from "../utils/result.js";
import { err, ok } from "../utils/result.js";
import { calculateBackoff } from "../utils/retry.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Error types that can be diagnosed and potentially auto-fixed
 */
export type DiagnosisType =
	| "FILE_NOT_FOUND"
	| "ABSOLUTE_PATH_REJECTED"
	| "PERMISSION_DENIED"
	| "WORKSPACE_MISMATCH"
	| "WORKING_DIRECTORY_MISMATCH"
	| "STORAGE_FULL"
	| "UNKNOWN";

/**
 * Diagnostic information about snapshot failure
 */
export interface SnapshotDiagnosis {
	/** Type of error identified */
	type: DiagnosisType;
	/** Human-readable message describing the issue */
	message: string;
	/** Root cause analysis */
	cause: string;
	/** Suggested fix to resolve the issue */
	suggestedFix: string;
	/** Action required from user (or "Automatic" if auto-fixable) */
	userAction: string;
	/** Whether this error can be automatically fixed */
	canAutoFix: boolean;
	/** Confidence level of diagnosis (0-1) */
	confidence: number;
	/** Files affected by this error */
	affectedFiles?: string[];
}

/**
 * Snapshot creation parameters
 */
export interface SnapshotParams {
	/** Files to include in snapshot */
	files: string[];
	/** Reason for creating snapshot */
	reason: string;
	/** What triggered the snapshot */
	trigger: "manual" | "mcp" | "ai_assist" | "session_end" | "pre_commit";
	/** Workspace root directory */
	workspaceRoot?: string;
	/** How to handle missing files */
	onMissingFile?: "error" | "warn" | "skip";
	/** Whether to suggest alternatives for missing files */
	suggestAlternatives?: boolean;
}

/**
 * Result of snapshot creation with retry
 */
export interface SnapshotRetryResult<T> {
	/** Whether snapshot was created successfully */
	success: boolean;
	/** The created snapshot (if successful) */
	snapshot?: T;
	/** Error message (if failed) */
	error?: string;
	/** Suggestion for user action */
	suggestion?: string;
	/** Detailed diagnostics (if failed) */
	diagnostics?: SnapshotDiagnosis;
	/** Which attempt succeeded (1-based) */
	attempt?: number;
	/** Total attempts made */
	totalAttempts?: number;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
	/** Maximum number of retry attempts */
	maxRetries: number;
	/** Base delay in milliseconds */
	delayMs: number;
	/** Use exponential backoff */
	exponentialBackoff: boolean;
	/** Enable automatic fixes */
	autoFix: boolean;
	/** Enable verbose logging */
	verbose: boolean;
}

// =============================================================================
// DIAGNOSIS FUNCTIONS
// =============================================================================

/**
 * Diagnose why a snapshot creation failed
 *
 * @param error - The error that occurred
 * @param files - Files that were being snapshotted
 * @param workspaceRoot - The workspace root directory
 * @returns Diagnosis with suggested fixes
 */
export function diagnoseSnapshotFailure(error: unknown, files: string[], workspaceRoot: string): SnapshotDiagnosis {
	const errorMessage = error instanceof Error ? error.message : String(error);

	// FILE_NOT_FOUND - File doesn't exist
	if (
		errorMessage.includes("ENOENT") ||
		errorMessage.includes("no such file") ||
		errorMessage.toLowerCase().includes("file not found")
	) {
		const missingFiles = files.filter((f) => {
			const fullPath = path.isAbsolute(f) ? f : path.join(workspaceRoot, f);
			return !fs.existsSync(fullPath);
		});

		return {
			type: "FILE_NOT_FOUND",
			message: "One or more files do not exist",
			cause: "The specified file paths could not be found on disk",
			suggestedFix: "Check file paths and ensure files exist",
			userAction:
				missingFiles.length > 0
					? `Create missing files: ${missingFiles.join(", ")}`
					: "Verify file paths are correct",
			canAutoFix: false,
			confidence: 0.95,
			affectedFiles: missingFiles.length > 0 ? missingFiles : undefined,
		};
	}

	// ABSOLUTE_PATH_REJECTED - Absolute paths when relative expected
	if (errorMessage.includes("absolute") || errorMessage.includes("Absolute paths not allowed")) {
		const absolutePaths = files.filter((f) => path.isAbsolute(f));

		return {
			type: "ABSOLUTE_PATH_REJECTED",
			message: "Snapshot tool requires relative paths",
			cause: "Absolute paths were provided instead of relative paths",
			suggestedFix: "Convert absolute paths to relative paths from workspace root",
			userAction: "Automatic: Converting to relative paths",
			canAutoFix: true,
			confidence: 1.0,
			affectedFiles: absolutePaths,
		};
	}

	// PERMISSION_DENIED - No read access
	if (errorMessage.includes("EACCES") || errorMessage.includes("permission denied")) {
		return {
			type: "PERMISSION_DENIED",
			message: "Permission denied when accessing files",
			cause: "The current user does not have read permission for one or more files",
			suggestedFix: "Check file permissions or run with appropriate privileges",
			userAction: "Run: chmod +r <file> or check file ownership",
			canAutoFix: false,
			confidence: 0.9,
		};
	}

	// WORKSPACE_MISMATCH - Wrong workspace root
	if (errorMessage.includes("workspace") || errorMessage.includes("outside workspace")) {
		return {
			type: "WORKSPACE_MISMATCH",
			message: "Files are outside the workspace root",
			cause: "The workspace root does not contain all specified files",
			suggestedFix: "Ensure all files are within the workspace directory",
			userAction: "Automatic: Resolving paths from correct workspace root",
			canAutoFix: true,
			confidence: 0.85,
		};
	}

	// WORKING_DIRECTORY_MISMATCH - Wrong CWD
	if (errorMessage.includes("cwd") || errorMessage.includes("working directory")) {
		return {
			type: "WORKING_DIRECTORY_MISMATCH",
			message: "Current working directory mismatch",
			cause: "The process is not running from the expected workspace root",
			suggestedFix: "Change to the correct working directory",
			userAction: "Automatic: Adjusting paths for current directory",
			canAutoFix: true,
			confidence: 0.8,
		};
	}

	// STORAGE_FULL - No disk space
	if (errorMessage.includes("ENOSPC") || errorMessage.includes("no space")) {
		return {
			type: "STORAGE_FULL",
			message: "Insufficient disk space",
			cause: "The disk does not have enough free space for the snapshot",
			suggestedFix: "Free up disk space and try again",
			userAction: "Clear temporary files or expand disk storage",
			canAutoFix: false,
			confidence: 0.95,
		};
	}

	// UNKNOWN - Catch-all
	return {
		type: "UNKNOWN",
		message: "Unknown error during snapshot creation",
		cause: errorMessage,
		suggestedFix: "Check the error message and logs for details",
		userAction: "Review error details and try again",
		canAutoFix: false,
		confidence: 0.3,
	};
}

/**
 * Apply automatic fix for diagnosed error
 *
 * @param diagnosis - The diagnosis to fix
 * @param context - Mutable context with files and workspace info
 * @returns True if fix was applied
 */
export async function applyAutomaticFix(
	diagnosis: SnapshotDiagnosis,
	context: { files: string[]; workspaceRoot: string },
): Promise<boolean> {
	switch (diagnosis.type) {
		case "ABSOLUTE_PATH_REJECTED": {
			// Convert absolute paths to relative
			context.files = context.files.map((f) => {
				if (path.isAbsolute(f)) {
					return path.relative(context.workspaceRoot, f);
				}
				return f;
			});
			return true;
		}

		case "WORKSPACE_MISMATCH":
		case "WORKING_DIRECTORY_MISMATCH": {
			// Normalize paths relative to workspace
			context.files = context.files.map((f) => {
				if (path.isAbsolute(f)) {
					return path.relative(context.workspaceRoot, f);
				}
				// Check if file exists relative to cwd but not workspace
				const fromCwd = path.resolve(process.cwd(), f);
				if (fs.existsSync(fromCwd)) {
					return path.relative(context.workspaceRoot, fromCwd);
				}
				return f;
			});
			return true;
		}

		default:
			return false;
	}
}

// =============================================================================
// RETRY HOOK
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	delayMs: 100,
	exponentialBackoff: true,
	autoFix: true,
	verbose: false,
};

/**
 * Create snapshot with automatic retry and error resolution
 *
 * @param params - Snapshot creation parameters
 * @param snapshotFn - Function to create snapshot (injected for testability)
 * @param config - Retry configuration
 * @returns Result with snapshot or error diagnostics
 *
 * @example
 * ```typescript
 * const result = await createSnapshotWithRetry(
 *   {
 *     files: ['src/index.ts', 'src/utils.ts'],
 *     reason: 'Pre-deployment snapshot',
 *     trigger: 'manual',
 *     workspaceRoot: '/path/to/workspace'
 *   },
 *   async (params) => snapshotManager.create(params.files, { description: params.reason })
 * );
 *
 * if (!result.success) {
 *   console.error(result.error);
 *   console.log('Suggestion:', result.suggestion);
 * }
 * ```
 */
export async function createSnapshotWithRetry<T>(
	params: SnapshotParams,
	snapshotFn: (params: SnapshotParams) => Promise<T>,
	config: Partial<RetryConfig> = {},
): Promise<SnapshotRetryResult<T>> {
	const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
	const { workspaceRoot = process.cwd() } = params;

	let lastError: Error | null = null;
	let lastDiagnosis: SnapshotDiagnosis | null = null;

	// Mutable context for auto-fixes
	const context = {
		files: [...params.files],
		workspaceRoot,
	};

	for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
		try {
			if (cfg.verbose && attempt > 1) {
				console.error(`[SnapBack Retry] Attempt ${attempt}/${cfg.maxRetries}`);
			}

			// Apply delay with exponential backoff
			if (attempt > 1) {
				const delay = cfg.exponentialBackoff
					? calculateBackoff(attempt - 1, cfg.delayMs, 30000, false)
					: cfg.delayMs;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			// Attempt snapshot creation with current context
			const snapshot = await snapshotFn({
				...params,
				files: context.files,
			});

			// Success!
			if (cfg.verbose && attempt > 1) {
				console.error(`[SnapBack Retry] ✅ Succeeded on attempt ${attempt}`);
			}

			return {
				success: true,
				snapshot,
				attempt,
				totalAttempts: attempt,
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

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
 * Result-based version of createSnapshotWithRetry
 *
 * @param params - Snapshot creation parameters
 * @param snapshotFn - Function to create snapshot
 * @param config - Retry configuration
 * @returns Result<T, SnapshotDiagnosis>
 */
export async function createSnapshotWithRetrySafe<T>(
	params: SnapshotParams,
	snapshotFn: (params: SnapshotParams) => Promise<T>,
	config: Partial<RetryConfig> = {},
): Promise<Result<T, SnapshotDiagnosis>> {
	const result = await createSnapshotWithRetry(params, snapshotFn, config);

	if (result.success && result.snapshot) {
		return ok(result.snapshot);
	}

	return err(
		result.diagnostics || {
			type: "UNKNOWN",
			message: result.error || "Unknown error",
			cause: "Snapshot creation failed after all retries",
			suggestedFix: result.suggestion || "Check logs for details",
			userAction: "Review error and try again",
			canAutoFix: false,
			confidence: 0.1,
		},
	);
}

/**
 * Format diagnosis for user-friendly output
 */
export function formatDiagnosis(diagnosis: SnapshotDiagnosis): string {
	const confidencePercent = Math.round(diagnosis.confidence * 100);
	const autoFixBadge = diagnosis.canAutoFix ? "✅ Auto-fixable" : "❌ Manual fix required";

	return `
🔍 Snapshot Failure Diagnosis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type: ${diagnosis.type}
Confidence: ${confidencePercent}%
${autoFixBadge}

📋 Issue:
  ${diagnosis.message}

🔎 Root Cause:
  ${diagnosis.cause}

💡 Suggested Fix:
  ${diagnosis.suggestedFix}

👤 Action Required:
  ${diagnosis.userAction}
${diagnosis.affectedFiles ? `\n📁 Affected Files:\n${diagnosis.affectedFiles.map((f) => `  - ${f}`).join("\n")}` : ""}
`.trim();
}
