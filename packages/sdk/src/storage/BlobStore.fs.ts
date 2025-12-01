/**
 * FilesystemBlobStore - Local file system implementation of BlobStore
 *
 * Implements content-addressable storage using:
 * - SHA-256 content hashing
 * - LZ4 compression for space efficiency
 * - Sharded directory structure for performance
 * - SQLite indexing for reference counting
 *
 * Storage layout:
 * ~/.snapback/blobs/sha256/aa/bb/<full-hash>.lz4
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type Database from "better-sqlite3";
import type { BlobStore, BlobStoreError, BlobStoreErrorCode, HashAlgorithm, Result } from "./BlobStore.js";

/**
 * LZ4 compression/decompression (placeholder - requires lz4 package)
 * TODO: Install and import actual lz4 package
 */
const LZ4 = {
	async compress(buf: Uint8Array): Promise<Uint8Array> {
		// Placeholder: In production, use lz4 package
		// import { compress } from 'lz4';
		// return compress(buf);
		return buf; // No-op for now
	},
	async decompress(buf: Uint8Array): Promise<Uint8Array> {
		// Placeholder: In production, use lz4 package
		// import { decompress } from 'lz4';
		// return decompress(buf);
		return buf; // No-op for now
	},
};

/**
 * Helper to create error result
 */
function err(
	code: BlobStoreErrorCode,
	message: string,
	details?: Record<string, unknown>,
): Result<never, BlobStoreError> {
	return {
		ok: false,
		error: { code, message, details },
	};
}

/**
 * Helper to create success result
 */
function ok<T>(value: T): Result<T, BlobStoreError> {
	return { ok: true, value };
}

/**
 * Filesystem implementation of BlobStore
 */
export class FilesystemBlobStore implements BlobStore {
	private initialized = false;
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used in future database integration
	private db?: Database.Database;

	constructor(private readonly basePath: string = path.join(process.env.HOME || "~", ".snapback", "blobs")) {}

	/**
	 * Initialize the blob store
	 */
	async initialize(): Promise<Result<void, BlobStoreError>> {
		try {
			// Create base directory
			await fs.mkdir(this.basePath, { recursive: true });

			// Initialize SQLite database
			// Note: Database connection should be passed from StorageBroker
			// For now, this is a placeholder
			// this.db = new Database(this.dbPath || path.join(process.env.HOME || '~', '.snapback', 'snapback.db'));

			// Run blob table migration (if not exists)
			// this.db.exec(`
			//   CREATE TABLE IF NOT EXISTS blobs (
			//     hash TEXT PRIMARY KEY,
			//     size INTEGER NOT NULL,
			//     compressed_size INTEGER,
			//     algo TEXT DEFAULT 'sha256',
			//     ref_count INTEGER DEFAULT 0,
			//     created_at INTEGER DEFAULT (unixepoch() * 1000)
			//   );
			//   CREATE INDEX IF NOT EXISTS idx_blobs_created ON blobs(created_at);
			// `);

			this.initialized = true;
			return ok(undefined);
		} catch (error) {
			return err(
				"IO_ERROR" as BlobStoreErrorCode,
				`Failed to initialize blob store: ${error instanceof Error ? error.message : String(error)}`,
				{ basePath: this.basePath },
			);
		}
	}

	/**
	 * Store blob and return content hash
	 */
	async put(buf: Uint8Array, algo: HashAlgorithm = "sha256"): Promise<Result<string, BlobStoreError>> {
		if (!this.initialized) {
			return err("IO_ERROR" as BlobStoreErrorCode, "BlobStore not initialized");
		}

		try {
			// Compute SHA-256 hash of uncompressed content
			const hash = createHash(algo).update(buf).digest("hex");

			// Build sharded path: sha256/aa/bb/<hash>.lz4
			const shardPath = this.getShardPath(hash, algo);
			const filePath = this.getFilePath(hash, algo);

			// Check if blob already exists (idempotent)
			if (existsSync(filePath)) {
				return ok(hash);
			}

			// Create shard directory
			await fs.mkdir(shardPath, { recursive: true });

			// Compress content with LZ4
			let compressed: Uint8Array;
			try {
				compressed = await LZ4.compress(buf);
			} catch (error) {
				return err(
					"COMPRESSION_FAILED" as BlobStoreErrorCode,
					`LZ4 compression failed: ${error instanceof Error ? error.message : String(error)}`,
					{ hash },
				);
			}

			// Write compressed blob to disk
			await fs.writeFile(filePath, compressed);

			// Update SQLite index
			// if (this.db) {
			//   this.db.prepare('INSERT OR IGNORE INTO blobs (hash, size, compressed_size, algo) VALUES (?, ?, ?, ?)').run(
			//     hash,
			//     buf.byteLength,
			//     compressed.byteLength,
			//     algo
			//   );
			// }

			return ok(hash);
		} catch (error) {
			return err(
				"IO_ERROR" as BlobStoreErrorCode,
				`Failed to store blob: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Retrieve blob by content hash
	 */
	async get(hash: string): Promise<Result<Uint8Array | null, BlobStoreError>> {
		if (!this.initialized) {
			return err("IO_ERROR" as BlobStoreErrorCode, "BlobStore not initialized");
		}

		try {
			const filePath = this.getFilePath(hash, "sha256");

			// Check if file exists
			if (!existsSync(filePath)) {
				return ok(null);
			}

			// Read compressed blob
			const compressed = await fs.readFile(filePath);

			// Decompress with LZ4
			let decompressed: Uint8Array;
			try {
				decompressed = await LZ4.decompress(compressed);
			} catch (error) {
				return err(
					"DECOMPRESSION_FAILED" as BlobStoreErrorCode,
					`LZ4 decompression failed: ${error instanceof Error ? error.message : String(error)}`,
					{ hash },
				);
			}

			// Verify hash integrity
			const computedHash = createHash("sha256").update(decompressed).digest("hex");
			if (computedHash !== hash) {
				return err(
					"HASH_MISMATCH" as BlobStoreErrorCode,
					`Hash verification failed: expected ${hash}, got ${computedHash}`,
					{ expected: hash, actual: computedHash },
				);
			}

			return ok(decompressed);
		} catch (error) {
			return err(
				"IO_ERROR" as BlobStoreErrorCode,
				`Failed to retrieve blob: ${error instanceof Error ? error.message : String(error)}`,
				{ hash },
			);
		}
	}

	/**
	 * Check if blob exists
	 */
	async has(hash: string): Promise<boolean> {
		const filePath = this.getFilePath(hash, "sha256");
		return existsSync(filePath);
	}

	/**
	 * Delete blob by hash
	 */
	async delete(hash: string): Promise<Result<void, BlobStoreError>> {
		if (!this.initialized) {
			return err("IO_ERROR" as BlobStoreErrorCode, "BlobStore not initialized");
		}

		try {
			const filePath = this.getFilePath(hash, "sha256");

			// Check if blob exists
			if (!existsSync(filePath)) {
				return err("BLOB_NOT_FOUND" as BlobStoreErrorCode, `Blob not found: ${hash}`, { hash });
			}

			// TODO: Check reference count before deletion
			// if (this.db) {
			//   const row = this.db.prepare('SELECT ref_count FROM blobs WHERE hash = ?').get(hash);
			//   if (row && row.ref_count > 0) {
			//     return err('IO_ERROR', `Cannot delete blob with active references (refCount=${row.ref_count})`, { hash });
			//   }
			// }

			// Delete file
			await fs.unlink(filePath);

			// Remove from SQLite index
			// if (this.db) {
			//   this.db.prepare('DELETE FROM blobs WHERE hash = ?').run(hash);
			// }

			return ok(undefined);
		} catch (error) {
			return err(
				"IO_ERROR" as BlobStoreErrorCode,
				`Failed to delete blob: ${error instanceof Error ? error.message : String(error)}`,
				{ hash },
			);
		}
	}

	/**
	 * Get total storage size
	 */
	async size(): Promise<number> {
		// if (this.db) {
		//   const row = this.db.prepare('SELECT SUM(size) as total FROM blobs').get();
		//   return row?.total || 0;
		// }

		// Fallback: Walk directory tree and sum file sizes
		let totalSize = 0;
		try {
			const algoDir = path.join(this.basePath, "sha256");
			if (!existsSync(algoDir)) {
				return 0;
			}

			const shards = await fs.readdir(algoDir);
			for (const shard of shards) {
				const shardPath = path.join(algoDir, shard);
				const subShards = await fs.readdir(shardPath);
				for (const subShard of subShards) {
					const subShardPath = path.join(shardPath, subShard);
					const files = await fs.readdir(subShardPath);
					for (const file of files) {
						const filePath = path.join(subShardPath, file);
						const stats = await fs.stat(filePath);
						totalSize += stats.size;
					}
				}
			}
		} catch {
			// Ignore errors, return 0
		}

		return totalSize;
	}

	/**
	 * Close blob store
	 */
	async close(): Promise<Result<void, BlobStoreError>> {
		try {
			// if (this.db) {
			//   this.db.close();
			//   this.db = null;
			// }
			this.initialized = false;
			return ok(undefined);
		} catch (error) {
			return err(
				"IO_ERROR" as BlobStoreErrorCode,
				`Failed to close blob store: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get shard directory path for a hash
	 */
	private getShardPath(hash: string, algo: HashAlgorithm): string {
		return path.join(this.basePath, algo, hash.slice(0, 2), hash.slice(2, 4));
	}

	/**
	 * Get full file path for a hash
	 */
	private getFilePath(hash: string, algo: HashAlgorithm): string {
		return path.join(this.getShardPath(hash, algo), `${hash}.lz4`);
	}

	/**
	 * Set database connection (called by StorageBroker)
	 */
	setDatabase(db: Database.Database): void {
		this.db = db;
	}
}
