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
export declare function normalize(path: string): string;
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
export declare function isWithin(childPath: string, parentPath: string): boolean;
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
export declare function getDepth(path: string): number;
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
export declare function areEqual(path1: string, path2: string): boolean;
//# sourceMappingURL=PathNormalizer.d.ts.map