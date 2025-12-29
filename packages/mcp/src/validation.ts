/**
 * Input Validation & Security Utilities
 *
 * P0-003: Zod-based input validation for all handlers
 * P0-004: Path traversal protection for file operations
 *
 * @module validation
 */

import { isAbsolute, normalize, relative, resolve } from "node:path";
import { atomicWriteFileSync as atomicWriteSyncOSS } from "@snapback-oss/sdk";
import { z } from "zod";

// ============================================================================
// P0-004: Path Traversal Protection
// ============================================================================

/**
 * Validates that a file path is safe and within workspace bounds
 *
 * @param filePath - The file path to validate
 * @param workspaceRoot - The workspace root directory
 * @returns Validation result with sanitized path or error
 */
export function validateFilePath(
	filePath: string,
	workspaceRoot: string,
): { valid: true; sanitizedPath: string } | { valid: false; error: string } {
	// Reject empty paths
	if (!filePath || filePath.trim() === "") {
		return { valid: false, error: "File path cannot be empty" };
	}

	// Reject paths with null bytes (common attack vector)
	if (filePath.includes("\0")) {
		return { valid: false, error: "Invalid characters in file path" };
	}

	// Normalize and resolve the path
	const normalizedPath = normalize(filePath);

	// Check for obvious traversal attempts
	if (normalizedPath.includes("..")) {
		return { valid: false, error: "Path traversal not allowed" };
	}

	// Resolve to absolute path within workspace
	const absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(workspaceRoot, normalizedPath);

	// Ensure the resolved path is within workspace
	const relativePath = relative(workspaceRoot, absolutePath);
	if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
		return { valid: false, error: "Path must be within workspace" };
	}

	return { valid: true, sanitizedPath: absolutePath };
}

/**
 * Validates an array of file paths
 */
export function validateFilePaths(
	filePaths: string[],
	workspaceRoot: string,
): { valid: true; sanitizedPaths: string[] } | { valid: false; error: string; invalidPath: string } {
	const sanitizedPaths: string[] = [];

	for (const filePath of filePaths) {
		const result = validateFilePath(filePath, workspaceRoot);
		if (!result.valid) {
			return { valid: false, error: result.error, invalidPath: filePath };
		}
		sanitizedPaths.push(result.sanitizedPath);
	}

	return { valid: true, sanitizedPaths };
}

// ============================================================================
// P0-002: Atomic Writes (temp file + rename pattern)
// ============================================================================

/** Maximum file size for context.json (10MB - prevents DoS) */
export const MAX_CONTEXT_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Atomically writes a file using temp file + rename pattern.
 * Prevents partial writes on crash and ensures file integrity.
 *
 * @deprecated Use atomicWriteFileSync from "@snapback-oss/sdk" directly.
 * This wrapper will be removed after migration is complete.
 *
 * @param filePath - The target file path
 * @param content - Content to write
 * @param options - Write options
 * @returns Success status and any error
 */
export function atomicWriteFileSync(
	filePath: string,
	content: string,
	options: { encoding?: BufferEncoding; maxSize?: number } = {},
): { success: true } | { success: false; error: string } {
	const { encoding = "utf8", maxSize = MAX_CONTEXT_FILE_SIZE } = options;

	// Re-export from consolidated OSS SDK implementation
	return atomicWriteSyncOSS(filePath, content, { encoding, maxSize });
}

/**
 * Validates a ref path is safe (used in context.json refs field)
 * More restrictive than file paths - only allows relative paths within workspace
 */
export function validateRefPath(
	refPath: string,
	workspaceRoot: string,
): { valid: true; sanitizedPath: string } | { valid: false; error: string } {
	// Reject empty paths
	if (!refPath || refPath.trim() === "") {
		return { valid: false, error: "Reference path cannot be empty" };
	}

	// Reject paths with null bytes
	if (refPath.includes("\0")) {
		return { valid: false, error: "Invalid characters in reference path" };
	}

	// Reject absolute paths in refs (refs should always be relative)
	if (isAbsolute(refPath)) {
		return { valid: false, error: "Reference paths must be relative" };
	}

	// Normalize the path
	const normalizedPath = normalize(refPath);

	// Check for traversal attempts
	if (normalizedPath.startsWith("..") || normalizedPath.includes("/..") || normalizedPath.includes("\\..")) {
		return { valid: false, error: "Path traversal not allowed in references" };
	}

	// Resolve and verify within workspace
	const absolutePath = resolve(workspaceRoot, normalizedPath);
	const relativePath = relative(workspaceRoot, absolutePath);

	if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
		return { valid: false, error: "Reference must be within workspace" };
	}

	return { valid: true, sanitizedPath: normalizedPath };
}

// ============================================================================
// Consolidated Tool Schemas (7 tools replacing 24 legacy tools)
// @see stress_test_remediation.md
// ============================================================================

/**
 * Schema for snap tool (unified entry point)
 * Replaces: begin_task, get_context, prepare_workspace, get_learnings
 */
export const snapSchema = z.object({
	m: z.enum(["s", "c", "x"]).describe("Mode: s=start, c=check, x=context"),
	t: z.string().optional().describe("Task description (mode: s)"),
	f: z.array(z.string()).optional().describe("Files to work on (mode: s, c)"),
	k: z.array(z.string()).optional().describe("Keywords for learning retrieval (mode: s, x)"),
	thorough: z.boolean().optional().describe("Enable thorough 7-layer validation (mode: c)"),
	i: z.enum(["implement", "debug", "refactor", "review", "explore"]).optional().describe("Intent"),
	goal: z
		.object({
			metric: z.enum(["bundle", "performance", "coverage"]),
			target: z.number(),
			unit: z.string(),
		})
		.optional()
		.describe("Goal for task completion validation"),
});

/**
 * Schema for snap_end tool (task completion)
 * Replaces: complete_task, review_work, what_changed
 */
export const snapEndSchema = z.object({
	ok: z
		.union([z.literal(0), z.literal(1)])
		.optional()
		.describe("Success: 1=ok, 0=failed"),
	l: z.array(z.string()).optional().describe("Quick learnings as strings"),
	notes: z.string().optional().describe("Completion notes"),
	outcome: z.enum(["completed", "abandoned", "blocked"]).optional().describe("Task outcome"),
	survey: z.record(z.unknown()).optional().describe("Full exit survey"),
});

/**
 * Schema for snap_fix tool (snapshot operations)
 * Replaces: snapshot_list, snapshot_restore, compare_snapshots
 */
export const snapFixSchema = z.object({
	id: z.string().optional().describe("Snapshot ID to restore (omit for list)"),
	dry: z.boolean().optional().describe("Preview only (dry run)"),
	files: z.array(z.string()).optional().describe("Specific files to restore"),
	diff: z.string().optional().describe("Compare with another snapshot"),
});

/**
 * Schema for snap_help tool (help and discovery)
 * Replaces: meta, get_pairing_protocol
 */
export const snapHelpSchema = z.object({
	q: z.enum(["tools", "status", "wire"]).optional().describe("Query mode"),
});

/**
 * Schema for snap_learn tool (mid-session learning capture)
 * Replaces: learn
 */
export const snapLearnSchema = z.object({
	t: z.string().min(1).describe("Trigger text"),
	a: z.string().min(1).describe("Action text"),
	type: z.enum(["pat", "pit", "eff", "disc", "wf"]).optional().describe("Learning type"),
	s: z.string().optional().describe("Source (optional)"),
});

/**
 * Schema for snap_violation tool (violation reporting)
 * Replaces: report_violation
 */
export const snapViolationSchema = z.object({
	type: z.string().min(1).describe("Violation type"),
	file: z.string().min(1).describe("File where violation occurred"),
	what: z.string().min(1).describe("What went wrong"),
	why: z.string().min(1).describe("Why it happened"),
	prevent: z.string().min(1).describe("Prevention measure"),
});

/**
 * Schema for check tool (code validation)
 * Replaces: quick_check, check_patterns, validate
 */
export const checkSchema = z.object({
	m: z
		.enum(["q", "f", "p", "b", "i", "c", "d", "l"])
		.optional()
		.describe("Mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs, l=learnings"),
	f: z
		.union([z.string(), z.array(z.string())])
		.optional()
		.describe("File(s) to check"),
	code: z.string().optional().describe("Code to validate (for patterns/validate mode)"),
	tests: z.boolean().optional().describe("Run tests"),
});

// ============================================================================
// Legacy Schemas (DEPRECATED - kept for backward compatibility only)
// These should not be used in new code. Use consolidated schemas above.
// ============================================================================

/** @deprecated Use snapSchema instead */
export const analyzeSchema = z.object({
	type: z.enum(["risk", "package"]).describe("Analysis type"),
	changes: z.array(z.unknown()).optional(),
	filePath: z.string().optional(),
	packageName: z.string().optional(),
	targetVersion: z.string().optional(),
});

/** @deprecated Use snapSchema instead */
export const prepareWorkspaceSchema = z.object({
	workspaceId: z.string().optional(),
});

/** @deprecated Use snapFixSchema instead */
export const snapshotCreateSchema = z.object({
	files: z.array(z.string().min(1)).min(1),
	reason: z.string().optional(),
	trigger: z.enum(["manual", "mcp", "ai_assist", "session_end"]).optional(),
});

/** @deprecated Use snapFixSchema instead */
export const snapshotListSchema = z.object({
	limit: z.number().int().positive().max(100).default(20).optional(),
	since: z.string().datetime().optional(),
});

/** @deprecated Use snapFixSchema instead */
export const snapshotRestoreSchema = z.object({
	snapshotId: z.string().min(1),
	files: z.array(z.string()).optional(),
	dryRun: z.boolean().default(false).optional(),
});

/** @deprecated Use checkSchema instead */
export const validateSchema = z.object({
	mode: z.enum(["quick", "comprehensive"]).default("quick").optional(),
	code: z.string().min(1),
	filePath: z.string().min(1),
});

/** @deprecated Use snapSchema instead */
export const contextSchema = z.object({
	op: z.enum(["init", "build", "validate", "status", "constraint", "check", "blockers"]),
	domain: z.string().optional(),
	name: z.string().optional(),
	value: z.number().optional(),
});

/** @deprecated Use snapEndSchema instead */
export const sessionSchema = z.object({
	op: z.enum(["start", "recommendations", "stats", "end"]),
	taskDescription: z.string().optional(),
	files: z.array(z.string()).optional(),
	acceptLearnings: z.array(z.number()).optional(),
});

/** @deprecated Use snapLearnSchema instead */
export const learnSchema = z.object({
	type: z.enum(["pattern", "pitfall", "efficiency", "discovery", "workflow"]),
	trigger: z.string().min(1),
	action: z.string().min(1),
	source: z.string().optional(),
});

/** @deprecated Use snapSchema instead */
export const acknowledgeRiskSchema = z.object({
	files: z.array(z.string().min(1)).min(1),
	reason: z.string().min(1),
});

/** @deprecated Use snapHelpSchema instead */
export const metaSchema = z.object({
	random_string: z.string().optional(),
});

/** @deprecated Use snapSchema instead */
export const getContextSchema = z.object({
	task: z.string().min(1),
	files: z.array(z.string()).optional(),
	keywords: z.array(z.string()).optional(),
});

/** @deprecated Use checkSchema instead */
export const checkPatternsSchema = z.object({
	code: z.string().min(1),
	filePath: z.string().min(1),
});

/** @deprecated Use snapViolationSchema instead */
export const reportViolationSchema = z.object({
	type: z.string().min(1),
	file: z.string().min(1),
	whatHappened: z.string().min(1),
	whyItHappened: z.string().min(1),
	prevention: z.string().min(1),
});

/** @deprecated Use snapSchema instead */
export const getLearningsSchema = z.object({
	keywords: z.array(z.string().min(1)).min(1),
	limit: z.number().int().positive().max(50).default(10).optional(),
});

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validate input against a schema and return structured result
 */
export function validateInput<T extends z.ZodType>(
	schema: T,
	input: unknown,
): { valid: true; data: z.infer<T> } | { valid: false; error: string; issues: z.ZodIssue[] } {
	const result = schema.safeParse(input);

	if (result.success) {
		return { valid: true, data: result.data };
	}

	const errorMessages = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");

	return {
		valid: false,
		error: errorMessages,
		issues: result.error.issues,
	};
}

/**
 * Schema registry for consolidated tools (7 tools)
 * @see stress_test_remediation.md
 */
export const TOOL_SCHEMAS: Record<string, z.ZodType> = {
	snap: snapSchema,
	snap_end: snapEndSchema,
	snap_fix: snapFixSchema,
	snap_help: snapHelpSchema,
	snap_learn: snapLearnSchema,
	snap_violation: snapViolationSchema,
	check: checkSchema,
};

/**
 * Legacy schema registry for backward compatibility
 * @deprecated Use TOOL_SCHEMAS (consolidated) instead
 */
export const LEGACY_TOOL_SCHEMAS: Record<string, z.ZodType> = {
	analyze: analyzeSchema,
	prepare_workspace: prepareWorkspaceSchema,
	snapshot_create: snapshotCreateSchema,
	snapshot_list: snapshotListSchema,
	snapshot_restore: snapshotRestoreSchema,
	validate: validateSchema,
	context: contextSchema,
	session: sessionSchema,
	learn: learnSchema,
	acknowledge_risk: acknowledgeRiskSchema,
	meta: metaSchema,
	get_context: getContextSchema,
	check_patterns: checkPatternsSchema,
	report_violation: reportViolationSchema,
	get_learnings: getLearningsSchema,
};

/**
 * Get schema for a tool by name
 */
export function getToolSchema(toolName: string): z.ZodType | undefined {
	return TOOL_SCHEMAS[toolName];
}
