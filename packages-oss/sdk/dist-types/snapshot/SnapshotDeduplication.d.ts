import type { FileInput } from "@snapback-oss/contracts";
import type { StorageAdapter } from "../storage/StorageAdapter";
export declare class SnapshotDeduplication {
	private cacheSize;
	private hashCache;
	constructor(cacheSize?: number);
	/**
	 * Hash file content using SHA-256
	 */
	hashContent(content: string): string;
	/**
	 * Hash multiple files content
	 */
	hashFiles(files: FileInput[]): string;
	/**
	 * Check if content is already stored (deduplication)
	 */
	isDuplicate(
		files: FileInput[],
		storage: StorageAdapter,
	): Promise<{
		isDuplicate: boolean;
		existingId?: string;
	}>;
	/**
	 * Check if storage adapter supports hash-based lookup
	 */
	private supportsHashLookup;
	/**
	 * Get snapshot by content hash (if supported by storage)
	 */
	private getByContentHash;
	/**
	 * Record hash for future deduplication checks
	 */
	recordHash(snapshotId: string, files: FileInput[]): void;
	/**
	 * Clear hash from cache for a deleted snapshot
	 * This prevents the dedup cache from referencing non-existent snapshots
	 */
	clearHash(snapshotId: string): void;
}
//# sourceMappingURL=SnapshotDeduplication.d.ts.map
