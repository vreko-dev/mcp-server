import { createHash } from "node:crypto";

/**
 * Generate a Blake3 hash for content (using SHA-256 as fallback)
 *
 * Note: This is a placeholder implementation. In a production environment,
 * we would use the actual Blake3 algorithm.
 *
 * @param content - The content to hash
 * @returns The hash as a hex string
 */
export function blake3Hash(content: string | Buffer): string {
	// For now, we'll use SHA-256 as a placeholder
	// In a real implementation, we would use the actual Blake3 algorithm
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Generate a Blake3 hash for snapshot state
 *
 * The hash is computed by:
 * 1. Sorting files by path (ensures order-independent comparison)
 * 2. Concatenating path:hash pairs for all files
 * 3. Computing Blake3 hash of the concatenated string
 *
 * @param files - Array of file objects with path and content
 * @returns Blake3 hash of the state as a hex string
 */
export function generateSnapshotHash(files: Array<{ path: string; content: string }>): string {
	// Sort files by path for order-independent hashing
	const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

	// Combine all file path:content pairs
	const combinedData = sortedFiles.map((file) => `${file.path}:${blake3Hash(file.content)}`).join("|");

	// Generate Blake3 hash
	return blake3Hash(combinedData);
}
