import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";

/**
 * Storage adapter interface for snapshot persistence
 *
 * All storage implementations (local, cloud, memory) must implement this interface
 * to ensure consistent behavior across different storage backends.
 */
export interface StorageAdapter {
	/**
	 * Save a snapshot to storage
	 * If a snapshot with the same ID exists, it should be overwritten
	 * @param snapshot The snapshot to save
	 * @param contentHash Optional content hash for deduplication indexing
	 */
	save(snapshot: Snapshot, contentHash?: string): Promise<void>;

	/**
	 * Retrieve a snapshot by ID
	 * Returns null if snapshot doesn't exist
	 */
	get(id: string): Promise<Snapshot | null>;

	/**
	 * Retrieve a snapshot by content hash (optional, for deduplication optimization)
	 * Returns null if no snapshot with that content hash exists
	 */
	getByContentHash?(hash: string): Promise<Snapshot | null>;

	/**
	 * List snapshots with optional filters
	 * Results should be sorted by timestamp (descending - newest first)
	 */
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;

	/**
	 * Delete a snapshot by ID
	 * Should not throw if snapshot doesn't exist
	 */
	delete(id: string): Promise<void>;

	/**
	 * Close storage connection and cleanup resources
	 */
	close(): Promise<void>;
}

/**
 * Storage error class for storage-specific errors
 */
export class StorageError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "StorageError";
	}
}
