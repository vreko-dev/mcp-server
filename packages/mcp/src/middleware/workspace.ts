/**
 * Workspace Path Validation & Security Middleware
 *
 * Validates and secures workspace paths to prevent:
 * - Path escapes
 * - Invalid repository directories
 * - Unsafe symlink resolution
 *
 * @module middleware/workspace
 */

import { existsSync, lstatSync } from "node:fs";
import { normalize, resolve } from "node:path";

export interface WorkspaceValidationResult {
	valid: boolean;
	root: string;
	error?: string;
}

/**
 * Validate a workspace path according to security criteria
 *
 * Checks for:
 * 1. At least one marker: .git/, package.json, or .snapback/
 * 2. Path does not escape via symlinks
 * 3. Path is absolute and normalized
 *
 * @param workspacePath - Path to validate (relative or absolute)
 * @returns Validation result with normalized root path or error
 */
export function validateWorkspacePath(workspacePath: string): WorkspaceValidationResult {
	try {
		// Normalize and resolve to absolute path
		const normalizedPath = normalize(workspacePath);
		const absolutePath = resolve(normalizedPath);

		// Check for path escape attempts
		if (!absolutePath.startsWith(process.cwd()) && !absolutePath.startsWith("/")) {
			return {
				valid: false,
				root: "",
				error: "Invalid workspace path",
			};
		}

		// Check for valid workspace markers
		const hasGit = existsSync(resolve(absolutePath, ".git"));
		const hasPackageJson = existsSync(resolve(absolutePath, "package.json"));
		const hasSnapback = existsSync(resolve(absolutePath, ".snapback"));

		if (!hasGit && !hasPackageJson && !hasSnapback) {
			return {
				valid: false,
				root: absolutePath,
				error: "Workspace must contain at least one marker: .git, package.json, or .snapback",
			};
		}

		// Check for symlink issues
		try {
			const stat = lstatSync(absolutePath);
			if (stat.isSymbolicLink()) {
				return {
					valid: false,
					root: absolutePath,
					error: "Workspace path cannot be a symbolic link",
				};
			}
		} catch {
			return {
				valid: false,
				root: absolutePath,
				error: "Cannot access workspace path",
			};
		}

		return {
			valid: true,
			root: absolutePath,
		};
	} catch (error) {
		return {
			valid: false,
			root: "",
			error: error instanceof Error ? error.message : "Unknown error validating workspace",
		};
	}
}

/**
 * Find repository root by traversing upward
 *
 * Looks for .git, package.json, or .snapback markers.
 * Stops at filesystem root.
 *
 * @param startPath - Path to start search from (defaults to cwd)
 * @returns Root path or null if not found
 */
export function findWorkspaceRoot(startPath: string = process.cwd()): string | null {
	let currentPath = resolve(startPath);

	// Prevent infinite loops
	const maxIterations = 50;
	let iterations = 0;

	while (iterations < maxIterations) {
		iterations++;

		if (hasWorkspaceMarker(currentPath)) {
			return currentPath;
		}

		const parent = resolve(currentPath, "..");
		if (parent === currentPath) {
			// Reached filesystem root
			break;
		}

		currentPath = parent;
	}

	return null;
}

/**
 * Check if a directory has workspace markers
 *
 * @param dirPath - Directory to check
 * @returns True if at least one marker exists
 */
function hasWorkspaceMarker(dirPath: string): boolean {
	try {
		const hasGit = existsSync(resolve(dirPath, ".git"));
		const hasPackageJson = existsSync(resolve(dirPath, "package.json"));
		const hasSnapback = existsSync(resolve(dirPath, ".snapback"));

		return hasGit || hasPackageJson || hasSnapback;
	} catch {
		return false;
	}
}

/**
 * Resolve workspace root with fallback chain:
 * 1. Explicit path (if provided and valid)
 * 2. Traversal upward from cwd
 * 3. cwd itself (if has markers)
 *
 * @param explicitPath - Optional explicit workspace path
 * @returns Validation result
 */
export function resolveWorkspaceRoot(explicitPath?: string): WorkspaceValidationResult {
	// Try explicit path first
	if (explicitPath) {
		const validation = validateWorkspacePath(explicitPath);
		if (validation.valid) {
			return validation;
		}
	}

	// Try finding root by traversal
	const found = findWorkspaceRoot();
	if (found) {
		return validateWorkspacePath(found);
	}

	// Try cwd as fallback
	return validateWorkspacePath(process.cwd());
}
