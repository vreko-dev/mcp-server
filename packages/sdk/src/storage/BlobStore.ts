/**
 * BlobStore - Content-Addressable Storage Interface
 *
 * Provides deduplication for file contents across snapshots and sessions.
 * Uses SHA-256 content hashing with LZ4 compression for efficient storage.
 *
 * Design Principles:
 * - Content-addressable: Files identified by content hash, not path
 * - Idempotent: Multiple puts of same content return same hash
 * - Deduplication: Same content stored once, referenced many times
 * - Reference counting: Blobs deleted only when no references remain
 *
 * Storage Layout (Local):
 * ~/.snapback/blobs/sha256/aa/bb/<full-hash>.lz4
 *
 * Where:
 * - aa = first 2 chars of hash (256 shards)
 * - bb = next 2 chars of hash (256 sub-shards per shard)
 * - <full-hash>.lz4 = LZ4-compressed blob
 *
 * Example:
 * Hash: a3f5b9c2...
 * Path: ~/.snapback/blobs/sha256/a3/f5/a3f5b9c2....lz4
 */

/**
 * Result type for error handling
 * Following always-result-type-pattern.md
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * BlobStore error codes
 */
export enum BlobStoreErrorCode {
	HASH_MISMATCH = "HASH_MISMATCH",
	BLOB_NOT_FOUND = "BLOB_NOT_FOUND",
	STORAGE_FULL = "STORAGE_FULL",
	COMPRESSION_FAILED = "COMPRESSION_FAILED",
	DECOMPRESSION_FAILED = "DECOMPRESSION_FAILED",
	IO_ERROR = "IO_ERROR",
}

/**
 * BlobStore error type
 */
export interface BlobStoreError {
	code: BlobStoreErrorCode;
	message: string;
	details?: Record<string, unknown>;
}

/**
 * Hash algorithm type
 */
export type HashAlgorithm = "sha256";

/**
 * BlobStore interface for content-addressable storage
 *
 * All methods return Result<T, BlobStoreError> for explicit error handling.
 */
export interface BlobStore {
	/**
	 * Store blob and return its content hash
	 *
	 * @param buf - File content as byte array
	 * @param algo - Hash algorithm (default: 'sha256')
	 * @returns Result with content hash (hex string) or error
	 *
	 * Implementation notes:
	 * - Compute SHA-256 hash of uncompressed content
	 * - Compress with LZ4 before writing to disk
	 * - Write to sharded path: sha256/aa/bb/<hash>.lz4
	 * - Update SQLite blobs table with metadata
	 * - Skip write if blob already exists (idempotent)
	 *
	 * Error conditions:
	 * - COMPRESSION_FAILED: LZ4 compression error
	 * - IO_ERROR: File system write error
	 * - STORAGE_FULL: Disk space exhausted
	 */
	put(buf: Uint8Array, algo?: HashAlgorithm): Promise<Result<string, BlobStoreError>>;

	/**
	 * Retrieve blob by content hash
	 *
	 * @param hash - SHA-256 hash (hex string)
	 * @returns Result with file content or null if not found
	 *
	 * Implementation notes:
	 * - Resolve sharded path from hash
	 * - Read compressed blob from disk
	 * - Decompress with LZ4
	 * - Verify hash matches (integrity check)
	 *
	 * Error conditions:
	 * - BLOB_NOT_FOUND: Hash not in store
	 * - DECOMPRESSION_FAILED: LZ4 decompression error
	 * - HASH_MISMATCH: Content hash verification failed
	 * - IO_ERROR: File system read error
	 */
	get(hash: string): Promise<Result<Uint8Array | null, BlobStoreError>>;

	/**
	 * Check if blob exists in store
	 *
	 * @param hash - SHA-256 hash (hex string)
	 * @returns True if blob exists, false otherwise
	 *
	 * Implementation notes:
	 * - Fast existence check without reading content
	 * - Check file system or query SQLite index
	 */
	has(hash: string): Promise<boolean>;

	/**
	 * Delete blob by hash
	 *
	 * @param hash - SHA-256 hash (hex string)
	 * @returns Result indicating success or error
	 *
	 * Implementation notes:
	 * - Check reference count in SQLite
	 * - Only delete if refcount = 0 (no sessions/snapshots reference it)
	 * - Remove from file system and SQLite index
	 *
	 * Error conditions:
	 * - BLOB_NOT_FOUND: Hash not in store
	 * - IO_ERROR: File system deletion error
	 *
	 * Safety:
	 * - Reference counting prevents premature deletion
	 * - Called by garbage collector, not directly by users
	 */
	delete(hash: string): Promise<Result<void, BlobStoreError>>;

	/**
	 * Get total storage size in bytes
	 *
	 * @returns Total bytes consumed by all blobs (uncompressed)
	 *
	 * Implementation notes:
	 * - Query SQLite: SELECT SUM(size) FROM blobs
	 * - Returns uncompressed size for quota enforcement
	 */
	size(): Promise<number>;

	/**
	 * Initialize blob store (create directories, connect to DB)
	 *
	 * @returns Result indicating success or error
	 *
	 * Implementation notes:
	 * - Create base directory: ~/.snapback/blobs
	 * - Create SQLite database: ~/.snapback/snapback.db
	 * - Run migrations if needed
	 */
	initialize(): Promise<Result<void, BlobStoreError>>;

	/**
	 * Close blob store (cleanup resources)
	 *
	 * @returns Result indicating success or error
	 */
	close(): Promise<Result<void, BlobStoreError>>;
}

/**
 * Blob metadata stored in SQLite
 */
export interface BlobMetadata {
	hash: string;
	size: number; // Uncompressed size in bytes
	compressedSize?: number; // Compressed size in bytes
	algo: HashAlgorithm;
	refCount: number; // Number of sessions/snapshots referencing this blob
	createdAt: number; // Unix epoch milliseconds
}

/**
 * BlobStore statistics for monitoring
 */
export interface BlobStoreStats {
	totalBlobs: number;
	totalSize: number; // Uncompressed bytes
	totalCompressedSize: number; // Compressed bytes
	compressionRatio: number; // compressionRatio = compressedSize / uncompressedSize
	deduplicationSavings: number; // Bytes saved by deduplication
}
