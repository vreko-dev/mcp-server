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
import type Database from "better-sqlite3";
import type { BlobStore, BlobStoreError, HashAlgorithm, Result } from "./BlobStore";
/**
 * Filesystem implementation of BlobStore
 */
export declare class FilesystemBlobStore implements BlobStore {
    private readonly basePath;
    private initialized;
    private db?;
    constructor(basePath?: string);
    /**
     * Initialize the blob store
     */
    initialize(): Promise<Result<void, BlobStoreError>>;
    /**
     * Store blob and return content hash
     */
    put(buf: Uint8Array, algo?: HashAlgorithm): Promise<Result<string, BlobStoreError>>;
    /**
     * Retrieve blob by content hash
     */
    get(hash: string): Promise<Result<Uint8Array | null, BlobStoreError>>;
    /**
     * Check if blob exists
     */
    has(hash: string): Promise<boolean>;
    /**
     * Delete blob by hash
     */
    delete(hash: string): Promise<Result<void, BlobStoreError>>;
    /**
     * Get total storage size
     */
    size(): Promise<number>;
    /**
     * Close blob store
     */
    close(): Promise<Result<void, BlobStoreError>>;
    /**
     * Get shard directory path for a hash
     */
    private getShardPath;
    /**
     * Get full file path for a hash
     */
    private getFilePath;
    /**
     * Set database connection (called by StorageBroker)
     */
    setDatabase(db: Database.Database): void;
}
//# sourceMappingURL=BlobStore.fs.d.ts.map