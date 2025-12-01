/**
 * Platform-agnostic path normalization utilities
 *
 * Handles differences between Windows and Unix-style paths,
 * ensuring consistent path comparison across platforms.
 *
 * @module PathNormalizer
 */

/**
 * Normalize path separators to forward slashes
 * Remove trailing slashes (except for Unix root "/")
 *
 * @param path - Path to normalize
 * @returns Normalized path with forward slashes and no trailing slash
 *
 * @example
 * ```typescript
 * normalize('C:\\Users\\test\\') // => 'C:/Users/test'
 * normalize('/home/user/project/') // => '/home/user/project'
 * normalize('/') // => '/'
 * ```
 */
export function normalize(path: string): string {
	// Convert backslashes to forward slashes
	let normalized = path.replace(/\\/g, "/");
	// Collapse multiple consecutive slashes to single slash
	normalized = normalized.replace(/\/+/g, "/");
	// Remove trailing slash (but preserve root "/")
	normalized = normalized.replace(/\/+$/, "");
	// Special case: Don't strip single "/" (Unix root)
	return normalized === "" && path.startsWith("/") ? "/" : normalized;
}

/**
 * Check if childPath is within parentPath
 *
 * @param childPath - Path to check
 * @param parentPath - Parent directory path
 * @returns true if childPath is within parentPath
 *
 * @example
 * ```typescript
 * isWithin('/home/user/project/src/index.ts', '/home/user/project') // => true
 * isWithin('/external/file.ts', '/home/user/project') // => false
 * isWithin('C:\\Users\\test\\file.ts', 'C:\\Users\\test') // => true
 * ```
 */
export function isWithin(childPath: string, parentPath: string): boolean {
	const normalizedChild = normalize(childPath);
	const normalizedParent = normalize(parentPath);

	return normalizedChild.startsWith(`${normalizedParent}/`) || normalizedChild === normalizedParent;
}

/**
 * Get the depth of a path (number of directory levels)
 *
 * @param path - Path to measure
 * @returns Number of directory levels
 *
 * @example
 * ```typescript
 * getDepth('/') // => 1 (Unix root)
 * getDepth('/home') // => 2
 * getDepth('/home/user/project') // => 4
 * getDepth('C:\\Users\\test\\project\\src') // => 5
 * ```
 */
export function getDepth(path: string): number {
	const normalized = normalize(path);

	// Special case: Unix root "/" has depth 1
	if (normalized === "/") {
		return 1;
	}

	// Filter out empty strings from split
	const segments = normalized.split("/").filter((segment) => segment.length > 0);

	// Unix paths start with "/" so add 1 for the root
	// Windows paths start with drive letter (e.g., "C:") which counts as a segment
	const isUnixPath = path.startsWith("/");
	return isUnixPath ? segments.length + 1 : segments.length;
}

/**
 * Compare paths for equality
 * Case-insensitive on Windows, case-sensitive on Unix
 *
 * @param path1 - First path
 * @param path2 - Second path
 * @returns true if paths are equal
 *
 * @example
 * ```typescript
 * // Unix (case-sensitive)
 * areEqual('/home/User/project', '/home/user/project') // => false
 *
 * // Windows (case-insensitive)
 * areEqual('C:\\Users\\Test', 'C:\\Users\\test') // => true
 * ```
 */
export function areEqual(path1: string, path2: string): boolean {
	const norm1 = normalize(path1);
	const norm2 = normalize(path2);

	// Detect platform - Windows paths start with drive letter (e.g., "C:")
	const isWindows = /^[a-zA-Z]:/.test(norm1) || /^[a-zA-Z]:/.test(norm2);

	if (isWindows) {
		return norm1.toLowerCase() === norm2.toLowerCase();
	}
	// Case-sensitive on Unix
	return norm1 === norm2;
}
