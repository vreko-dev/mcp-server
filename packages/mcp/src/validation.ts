/**
 * Input Validation & Security Utilities
 *
 * P0-003: Zod-based input validation for all handlers
 * P0-004: Path traversal protection for file operations
 *
 * @module validation
 */

import { randomBytes } from "node:crypto";
import { renameSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, normalize, relative, resolve } from "node:path";
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

	// P1: Size limit check
	const contentSize = Buffer.byteLength(content, encoding);
	if (contentSize > maxSize) {
		return {
			success: false,
			error: `Content size (${contentSize} bytes) exceeds maximum allowed (${maxSize} bytes)`,
		};
	}

	// Generate temp file path in same directory (ensures same filesystem for atomic rename)
	const tempSuffix = randomBytes(8).toString("hex");
	const tempPath = `${filePath}.${tempSuffix}.tmp`;

	try {
		// Step 1: Write to temp file
		writeFileSync(tempPath, content, { encoding });

		// Step 2: Atomic rename (same filesystem = atomic on POSIX)
		try {
			renameSync(tempPath, filePath);
		} catch (renameError) {
			// Cleanup temp file on rename failure
			try {
				unlinkSync(tempPath);
			} catch {
				// Ignore cleanup errors
			}
			throw renameError;
		}

		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: `Atomic write failed: ${message}` };
	}
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
// P0-003: Zod Input Schemas
// ============================================================================

/**
 * Schema for analyze tool
 */
export const analyzeSchema = z.object({
	type: z.enum(["risk", "package"]).describe("Analysis type"),
	changes: z.array(z.unknown()).optional().describe("For risk: array of diff changes"),
	filePath: z.string().optional().describe("For risk: path to file being changed"),
	packageName: z.string().optional().describe("For package: name of package"),
	targetVersion: z.string().optional().describe("For package: target version"),
});

/**
 * Schema for prepare_workspace tool
 */
export const prepareWorkspaceSchema = z.object({
	workspaceId: z.string().optional().describe("Workspace path (defaults to current)"),
});

/**
 * Schema for snapshot_create tool
 */
export const snapshotCreateSchema = z.object({
	files: z.array(z.string().min(1)).min(1).describe("Files to include in snapshot"),
	reason: z.string().optional().describe("Why this snapshot was created"),
	trigger: z.enum(["manual", "mcp", "ai_assist", "session_end"]).optional(),
});

/**
 * Schema for snapshot_list tool
 */
export const snapshotListSchema = z.object({
	limit: z.number().int().positive().max(100).default(20).optional(),
	since: z.string().datetime().optional().describe("Only show snapshots after this time"),
});

/**
 * Schema for snapshot_restore tool
 */
export const snapshotRestoreSchema = z.object({
	snapshotId: z.string().min(1).describe("ID of snapshot to restore"),
	files: z.array(z.string()).optional().describe("Specific files to restore"),
	dryRun: z.boolean().default(false).optional().describe("Preview without applying"),
});

/**
 * Schema for validate tool
 */
export const validateSchema = z.object({
	mode: z.enum(["quick", "comprehensive"]).default("quick").optional(),
	code: z.string().min(1).describe("Code to validate"),
	filePath: z.string().min(1).describe("Target file path"),
});

/**
 * Schema for context tool
 */
export const contextSchema = z.object({
	op: z.enum(["init", "build", "validate", "status", "constraint", "check", "blockers"]),
	domain: z.string().optional().describe("For constraint/check: domain name"),
	name: z.string().optional().describe("For constraint/check: constraint name"),
	value: z.number().optional().describe("For check: value to check"),
});

/**
 * Schema for session tool
 */
export const sessionSchema = z.object({
	op: z.enum(["start", "recommendations", "stats", "end"]),
	taskDescription: z.string().optional().describe("For start: what you're working on"),
	files: z.array(z.string()).optional().describe("For start: planned files"),
	acceptLearnings: z.array(z.number()).optional().describe("For end: indices to accept"),
});

/**
 * Schema for learn tool
 */
export const learnSchema = z.object({
	type: z.enum(["pattern", "pitfall", "efficiency", "discovery", "workflow"]),
	trigger: z.string().min(1).describe("What triggers this learning"),
	action: z.string().min(1).describe("What to do when triggered"),
	source: z.string().optional().describe("Where this learning came from"),
});

/**
 * Schema for acknowledge_risk tool
 */
export const acknowledgeRiskSchema = z.object({
	files: z.array(z.string().min(1)).min(1).describe("Files you intend to modify"),
	reason: z.string().min(1).describe("Why you are proceeding despite risk"),
});

/**
 * Schema for meta tool
 */
export const metaSchema = z.object({
	random_string: z.string().optional().describe("Random string for no-parameter mcp tool"),
});

// ============================================================================
// Intelligence Tool Schemas
// ============================================================================

/**
 * Schema for get_context tool
 */
export const getContextSchema = z.object({
	task: z.string().min(1).describe("Brief description of what you're about to do"),
	files: z.array(z.string()).optional().describe("Files you plan to modify"),
	keywords: z.array(z.string()).optional().describe("Keywords for learning retrieval"),
});

/**
 * Schema for check_patterns tool
 */
export const checkPatternsSchema = z.object({
	code: z.string().min(1).describe("Code to validate"),
	filePath: z.string().min(1).describe("Target file path"),
});

/**
 * Schema for report_violation tool
 */
export const reportViolationSchema = z.object({
	type: z.string().min(1).describe("Violation type (e.g., 'layer-boundary-violation')"),
	file: z.string().min(1).describe("File where violation occurred"),
	whatHappened: z.string().min(1).describe("What went wrong"),
	whyItHappened: z.string().min(1).describe("Why this happened (reflection required)"),
	prevention: z.string().min(1).describe("What would have prevented this"),
});

/**
 * Schema for get_learnings tool
 */
export const getLearningsSchema = z.object({
	keywords: z.array(z.string().min(1)).min(1).describe("Keywords to search for in learnings"),
	limit: z.number().int().positive().max(50).default(10).optional().describe("Max results to return"),
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
 * Schema registry for tool name lookup
 */
export const TOOL_SCHEMAS: Record<string, z.ZodType> = {
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
	// Intelligence tools
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
