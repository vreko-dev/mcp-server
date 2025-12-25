/**
 * Unified Hash Utilities
 *
 * Consolidated from:
 * - apps/vscode/src/storage/utils/hash.ts
 * - packages-oss/sdk/src/privacy/hasher.ts
 * - packages/engine/src/runtime/storage.ts (inline usage)
 *
 * Provides SHA-256 hashing for:
 * - Content-addressable blob storage
 * - Privacy-preserving telemetry (file paths, workspace IDs)
 * - Content deduplication
 *
 * @module hash
 */

import crypto from "node:crypto";

/**
 * Core SHA-256 hashing function
 *
 * @param input - String to hash
 * @returns Lowercase hexadecimal SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = sha256("hello world");
 * // Returns: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 * ```
 */
export function sha256(input: string): string {
	return crypto.createHash("sha256").update(input, "utf-8").digest("hex");
}

/**
 * Generate SHA-256 hash of content
 *
 * Alias for sha256() with explicit use case naming.
 * Used for content-addressable blob storage.
 *
 * @param content - Content to hash
 * @returns Lowercase hexadecimal SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = hashContent("const x = 1;");
 * // Use with getBlobPath() for storage
 * const blobPath = getBlobPath(hash);
 * ```
 */
export function hashContent(content: string): string {
	return sha256(content);
}

/**
 * Hash file path for anonymization
 *
 * Used in privacy-preserving telemetry to anonymize file paths
 * while maintaining ability to track unique files.
 *
 * @param filePath - File path to hash
 * @returns Lowercase hexadecimal SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = hashFilePath("/workspace/src/auth.ts");
 * // Returns anonymized hash for telemetry
 * ```
 */
export function hashFilePath(filePath: string): string {
	return sha256(filePath);
}

/**
 * Hash workspace ID for anonymization
 *
 * Used in privacy-preserving telemetry to anonymize workspace identifiers
 * while maintaining ability to track per-workspace usage.
 *
 * @param workspaceId - Workspace identifier to hash
 * @returns Lowercase hexadecimal SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = hashWorkspaceId("/Users/user/projects/myapp");
 * // Returns anonymized hash for telemetry
 * ```
 */
export function hashWorkspaceId(workspaceId: string): string {
	return sha256(workspaceId);
}

/**
 * Get sharded blob path from hash
 *
 * Creates multi-level directory structure to avoid too many files in one directory.
 * Default 2-level sharding: ab/cd/abcd1234...
 *
 * @param hash - SHA-256 hash (lowercase hex string)
 * @param levels - Number of directory levels (default: 2)
 * @returns Sharded path string
 *
 * @example
 * ```typescript
 * // Default 2-level sharding
 * getBlobPath("abcd1234567890");
 * // Returns: "ab/cd/abcd1234567890"
 *
 * // Custom 3-level sharding
 * getBlobPath("abcd1234567890", 3);
 * // Returns: "ab/cd/12/abcd1234567890"
 * ```
 */
export function getBlobPath(hash: string, levels = 2): string {
	const segments: string[] = [];

	for (let i = 0; i < levels; i++) {
		segments.push(hash.slice(i * 2, (i + 1) * 2));
	}

	segments.push(hash);

	return segments.join("/");
}
