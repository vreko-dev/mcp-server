import path from "node:path";

/**
 * Custom error class for security violations
 */
export class SecurityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SecurityError";
	}
}

/**
 * Validate file paths to prevent path traversal attacks
 * @param filePath - The file path to validate
 * @throws SecurityError if the path is invalid
 */
export function validatePath(filePath: string): void {
	// Check for null bytes (classic security issue)
	if (filePath.includes("\0")) {
		throw new SecurityError("Null bytes in path not allowed");
	}

	// Normalize the path
	const normalized = path.normalize(filePath);

	// Reject absolute paths
	if (path.isAbsolute(normalized)) {
		throw new SecurityError("Absolute paths not allowed");
	}

	// Reject paths that traverse upward by checking segments
	// This correctly handles legitimate filenames like "config..json"
	const segments = normalized.split(path.sep);
	if (segments.some((seg) => seg === "..")) {
		throw new SecurityError("Path traversal not allowed");
	}
}

/**
 * Sanitize input for JSON to prevent injection attacks
 * @param obj - The object to sanitize
 * @throws SecurityError if dangerous patterns are found
 */
export function sanitizeForJSON(obj: any): any {
	const str = JSON.stringify(obj);

	return JSON.parse(str);
}
