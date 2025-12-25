/**
 * Atomic File Write Utilities
 *
 * Provides atomic file write operations using write-then-rename pattern
 * to prevent corrupted files if the process crashes mid-write.
 *
 * CONSOLIDATES:
 * - apps/vscode/src/storage/utils/atomicWrite.ts (async, VS Code API)
 * - packages/mcp/src/validation.ts (sync, Node.js fs)
 *
 * @module fs/atomic
 */

import { randomBytes } from "node:crypto";
import { renameSync, unlinkSync, writeFileSync } from "node:fs";
import { rename, unlink, writeFile } from "node:fs/promises";
import type { Result } from "../utils/result";
import { err, ok } from "../utils/result";

/**
 * Options for atomic file write operations
 */
export interface AtomicWriteOptions {
	/** Text encoding (default: 'utf8') */
	encoding?: BufferEncoding;
	/** Maximum file size in bytes (default: 10MB) */
	maxSize?: number;
	/** File permissions mode (Unix-style) */
	mode?: number;
}

/**
 * Default maximum file size: 10MB
 */
export const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Atomically write content to a file (async).
 *
 * Uses write-then-rename pattern:
 * 1. Write content to temporary file in same directory
 * 2. Atomically rename temp file to target (OS guarantees atomicity on same filesystem)
 * 3. Clean up temp file on failure
 *
 * **Use for:**
 * - VS Code extension (non-blocking required for UI responsiveness)
 * - Large file writes (>1MB)
 * - Server-side operations
 * - Async workflows
 *
 * @param path - Target file path
 * @param content - Content to write (string or Buffer)
 * @param options - Write options
 * @returns Result with success or error
 *
 * @example
 * ```typescript
 * const result = await atomicWriteFile(
 *   "/path/to/file.json",
 *   JSON.stringify(data, null, 2)
 * );
 *
 * if (isErr(result)) {
 *   console.error("Write failed:", result.error);
 * }
 * ```
 */
export async function atomicWriteFile(
	path: string,
	content: string | Buffer,
	options: AtomicWriteOptions = {},
): Promise<Result<void, Error>> {
	const { encoding = "utf8", maxSize = DEFAULT_MAX_SIZE, mode } = options;

	try {
		// Convert string to Buffer if needed
		const buffer = typeof content === "string" ? Buffer.from(content, encoding) : content;

		// Size limit check
		if (buffer.length > maxSize) {
			return err(new Error(`Content size (${buffer.length} bytes) exceeds maximum allowed (${maxSize} bytes)`));
		}

		// Generate temp file path in same directory (ensures same filesystem for atomic rename)
		const tempSuffix = randomBytes(8).toString("hex");
		const tempPath = `${path}.${tempSuffix}.tmp`;

		try {
			// Step 1: Write to temp file
			await writeFile(tempPath, buffer, { mode });

			// Step 2: Atomic rename (OS guarantees atomicity on same filesystem)
			await rename(tempPath, path);

			return ok(undefined);
		} catch (error) {
			// Clean up temp file on failure
			try {
				await unlink(tempPath);
			} catch {
				// Ignore cleanup errors
			}
			throw error;
		}
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Atomically write content to a file (sync).
 *
 * Uses write-then-rename pattern for atomic operations.
 *
 * **Use for:**
 * - CLI tools where blocking is acceptable
 * - Configuration file writes during initialization
 * - Small files (<1MB)
 * - Synchronous workflows
 *
 * @param path - Target file path
 * @param content - Content to write
 * @param options - Write options
 * @returns Result with success or error
 *
 * @example
 * ```typescript
 * const result = atomicWriteFileSync(
 *   "/path/to/config.json",
 *   JSON.stringify(config, null, 2)
 * );
 *
 * if (!result.success) {
 *   console.error("Write failed:", result.error);
 * }
 * ```
 */
export function atomicWriteFileSync(
	path: string,
	content: string,
	options: AtomicWriteOptions = {},
): { success: true } | { success: false; error: string } {
	const { encoding = "utf8", maxSize = DEFAULT_MAX_SIZE, mode } = options;

	try {
		// Size limit check
		const contentSize = Buffer.byteLength(content, encoding);
		if (contentSize > maxSize) {
			return {
				success: false,
				error: `Content size (${contentSize} bytes) exceeds maximum allowed (${maxSize} bytes)`,
			};
		}

		// Generate temp file path in same directory (ensures same filesystem for atomic rename)
		const tempSuffix = randomBytes(8).toString("hex");
		const tempPath = `${path}.${tempSuffix}.tmp`;

		try {
			// Step 1: Write to temp file
			writeFileSync(tempPath, content, { encoding, mode });

			// Step 2: Atomic rename (same filesystem = atomic on POSIX)
			renameSync(tempPath, path);

			return { success: true };
		} catch (error) {
			// Clean up temp file on failure
			try {
				unlinkSync(tempPath);
			} catch {
				// Ignore cleanup errors
			}
			throw error;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: `Atomic write failed: ${message}` };
	}
}
