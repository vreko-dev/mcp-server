import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// Simple telemetry interface
interface TelemetryClientInterface {
	track(event: string, properties?: Record<string, any>): void;
}

// No-op telemetry client for now
const noopTelemetryClient: TelemetryClientInterface = {
	track: () => {},
};

/**
 * Custom error class for security violations
 */
export class SecurityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SecurityError";
	}
}

// Telemetry client for tracking security violations
let telemetryClient: TelemetryClientInterface | null = null;

/**
 * Initialize telemetry client for security violation tracking
 * @param proxyUrl The telemetry proxy URL
 */
export function initializeSecurityTelemetry(_proxyUrl: string): void {
	// For now, use a no-op telemetry client
	telemetryClient = noopTelemetryClient;
}

/**
 * Track security violation events
 * @param violationType Type of security violation
 * @param details Additional details about the violation
 */
function trackSecurityViolation(violationType: string, details: Record<string, any>): void {
	if (telemetryClient) {
		telemetryClient.track("security.violation", {
			violationType,
			...details,
		});
	}
}

/**
 * Validate file path is within workspace boundaries
 *
 * Security checks:
 * 1. Resolve symlinks to detect symlink attacks
 * 2. Ensure path is within workspace root
 * 3. Reject path traversal attempts (../)
 *
 * @param filePath Path to validate (absolute or relative)
 * @param workspaceRoot Workspace root directory
 * @returns Validated absolute path
 * @throws SecurityError if path is outside workspace or invalid
 */
export function validateFilePath(filePath: string, workspaceRoot: string): string {
	try {
		// Check for null bytes (classic security issue)
		if (filePath.includes("\0")) {
			const violationDetails = {
				filePath: filePath.substring(0, 100), // Limit length for safety
				reason: "null_bytes",
			};
			trackSecurityViolation("path_validation_failed", violationDetails);
			throw new SecurityError("Null bytes in path not allowed");
		}

		// Check for empty or whitespace-only paths
		if (!filePath || filePath.trim().length === 0) {
			const violationDetails = {
				filePath: filePath?.substring(0, 100) || "",
				reason: "empty_path",
			};
			trackSecurityViolation("path_validation_failed", violationDetails);
			throw new SecurityError("File path cannot be empty");
		}

		// Normalize path (resolve . and ..)
		const normalized = path.normalize(filePath);

		// Convert to absolute if relative
		const absolutePath = path.isAbsolute(normalized) ? normalized : path.join(workspaceRoot, normalized);

		// Check for encoded traversal patterns
		const lowerPath = normalized.toLowerCase();
		const encodedPatterns = ["%2e%2e%2f", "%2e%2e/", "..%2f", "%252e", "%252f", "%2e%2e%5c", "..%5c"];
		if (encodedPatterns.some((pattern) => lowerPath.includes(pattern))) {
			const violationDetails = {
				filePath: normalized.substring(0, 100),
				reason: "encoded_traversal",
				pattern: encodedPatterns.find((pattern) => lowerPath.includes(pattern)),
			};
			trackSecurityViolation("path_validation_failed", violationDetails);
			throw new SecurityError("Encoded path traversal not allowed");
		}

		// Reject paths that traverse upward by checking segments
		// This correctly handles legitimate filenames like "config..json"
		const segments = normalized.split(path.sep);
		if (segments.some((seg) => seg === "..")) {
			const violationDetails = {
				filePath: normalized.substring(0, 100),
				reason: "path_traversal",
			};
			trackSecurityViolation("path_validation_failed", violationDetails);
			throw new SecurityError("Path traversal not allowed");
		}

		// Additional checks for Windows-specific attacks
		if (process.platform === "win32") {
			// Check for Windows UNC paths
			if (normalized.startsWith("\\\\")) {
				const violationDetails = {
					filePath: normalized.substring(0, 100),
					reason: "unc_path",
				};
				trackSecurityViolation("path_validation_failed", violationDetails);
				throw new SecurityError("UNC paths not allowed");
			}

			// Check for Windows drive letters
			if (/^[a-zA-Z]:/.test(normalized)) {
				const violationDetails = {
					filePath: normalized.substring(0, 100),
					reason: "drive_letter",
				};
				trackSecurityViolation("path_validation_failed", violationDetails);
				throw new SecurityError("Windows drive letters not allowed");
			}
		}

		// SECURITY: Resolve symlinks to prevent symlink attacks
		let realPath: string;
		try {
			realPath = fs.realpathSync(absolutePath);
		} catch (_error) {
			// File doesn't exist - validate parent directory instead
			const parentDir = path.dirname(absolutePath);

			if (!fs.existsSync(parentDir)) {
				const violationDetails = {
					filePath: absolutePath.substring(0, 100),
					parentDir: parentDir.substring(0, 100),
					reason: "parent_not_exist",
				};
				trackSecurityViolation("path_validation_failed", violationDetails);
				throw new SecurityError(`Parent directory does not exist: ${parentDir}`);
			}

			try {
				const realParent = fs.realpathSync(parentDir);
				const fileName = path.basename(absolutePath);
				realPath = path.join(realParent, fileName);
			} catch {
				const violationDetails = {
					filePath: absolutePath.substring(0, 100),
					parentDir: parentDir.substring(0, 100),
					reason: "parent_resolution_failed",
				};
				trackSecurityViolation("path_validation_failed", violationDetails);
				throw new SecurityError(`Cannot resolve parent directory: ${parentDir}`);
			}
		}

		// FIXED: Workspace boundary check instead of absolute path rejection
		const workspaceRealPath = fs.realpathSync(workspaceRoot);

		if (!realPath.startsWith(workspaceRealPath + path.sep) && realPath !== workspaceRealPath) {
			const violationDetails = {
				filePath: realPath.substring(0, 100),
				workspacePath: workspaceRealPath.substring(0, 100),
				reason: "outside_workspace",
			};
			trackSecurityViolation("path_validation_failed", violationDetails);
			throw new SecurityError(`Path outside workspace: ${realPath} not in ${workspaceRealPath}`);
		}

		// Additional check: reject null bytes (path injection)
		if (realPath.includes("\0")) {
			const violationDetails = {
				filePath: realPath.substring(0, 100),
				reason: "null_bytes_resolved",
			};
			trackSecurityViolation("path_validation_failed", violationDetails);
			throw new SecurityError("Path contains null bytes");
		}

		return realPath;
	} catch (error) {
		if (error instanceof SecurityError) {
			throw error;
		}
		const violationDetails = {
			filePath: filePath?.substring(0, 100) || "",
			reason: "validation_exception",
			error: error instanceof Error ? error.message : String(error),
		};
		trackSecurityViolation("path_validation_failed", violationDetails);
		throw new SecurityError(`Path validation failed: ${(error as Error).message}`);
	}
}

/**
 * Zod schema for file path validation
 */
// Store workspace root for validation
let workspaceRoot: string | null = null;

/**
 * Set the workspace root for path validation
 * @param root The workspace root directory
 */
export function setWorkspaceRoot(root: string): void {
	workspaceRoot = root;
}

/**
 * Zod schema for file path validation
 */
export const FilePathSchema = z
	.string()
	.min(1, "File path cannot be empty")
	.max(4096, "File path too long")
	.refine((filePath) => {
		try {
			// If workspace root is set, validate against it
			if (workspaceRoot) {
				validateFilePath(filePath, workspaceRoot);
				return true;
			}
			// If no workspace root is set, use the original validation
			// This maintains backward compatibility
			validateFilePathOriginal(filePath);
			return true;
		} catch {
			return false;
		}
	}, "Invalid file path");

/**
 * Original file path validation (for backward compatibility)
 * @param filePath The file path to validate
 */
function validateFilePathOriginal(filePath: string): void {
	// Check for null bytes (classic security issue)
	if (filePath.includes("\0")) {
		throw new SecurityError("Null bytes in path not allowed");
	}

	// Check for empty or whitespace-only paths
	if (!filePath || filePath.trim().length === 0) {
		throw new SecurityError("File path cannot be empty");
	}

	// Normalize the path
	const normalized = path.normalize(filePath);

	// Reject absolute paths (original behavior)
	if (path.isAbsolute(normalized)) {
		throw new SecurityError("Absolute paths not allowed");
	}

	// Check for encoded traversal patterns
	const lowerPath = normalized.toLowerCase();
	const encodedPatterns = ["%2e%2e%2f", "%2e%2e/", "..%2f", "%252e", "%252f", "%2e%2e%5c", "..%5c"];
	if (encodedPatterns.some((pattern) => lowerPath.includes(pattern))) {
		throw new SecurityError("Encoded path traversal not allowed");
	}

	// Reject paths that traverse upward by checking segments
	// This correctly handles legitimate filenames like "config..json"
	const segments = normalized.split(path.sep);
	if (segments.some((seg) => seg === "..")) {
		throw new SecurityError("Path traversal not allowed");
	}

	// Additional checks for Windows-specific attacks
	if (process.platform === "win32") {
		// Check for Windows UNC paths
		if (normalized.startsWith("\\\\")) {
			throw new SecurityError("UNC paths not allowed");
		}

		// Check for Windows drive letters
		if (/^[a-zA-Z]:/.test(normalized)) {
			throw new SecurityError("Windows drive letters not allowed");
		}
	}
}

/**
 * Zod schema for code content validation
 */
export const CodeSchema = z.string().min(1, "Code cannot be empty").max(1_000_000, "Code too large (max 1MB)");

/**
 * Zod schema for context validation (more flexible to handle different naming conventions)
 */
export const ContextSchema = z
	.object({
		surrounding_code: z.string().max(100_000).optional(),
		surroundingCode: z.string().max(100_000).optional(),
		project_type: z.enum(["node", "browser", "deno"]).optional(),
		projectType: z.enum(["node", "browser", "deno"]).optional(),
		language: z.enum(["javascript", "typescript", "python"]).optional(),
	})
	.strict()
	.optional();

/**
 * Zod schema for analyze_suggestion tool arguments
 */
export const AnalyzeSuggestionSchema = z
	.object({
		code: CodeSchema,
		file_path: FilePathSchema,
		context: ContextSchema,
	})
	.strict();

/**
 * Zod schema for check_iteration_safety tool arguments
 */
export const CheckIterationSafetySchema = z
	.object({
		file_path: FilePathSchema,
	})
	.strict();

/**
 * Zod schema for create_snapshot tool arguments
 */
export const CreateSnapshotSchema = z
	.object({
		file_path: FilePathSchema,
		reason: z.string().max(1000).optional(),
	})
	.strict();
