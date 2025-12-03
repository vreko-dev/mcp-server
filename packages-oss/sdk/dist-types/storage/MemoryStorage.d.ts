import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { StorageAdapter } from "./StorageAdapter.js";
/**
 * In-memory storage implementation
 * Useful for testing and temporary snapshots
 * Data is lost when instance is destroyed
 */
export declare class MemoryStorage implements StorageAdapter {
	private snapshots;
	save(snapshot: Snapshot, _contentHash?: string): Promise<void>;
	get(id: string): Promise<Snapshot | null>;
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;
	delete(id: string): Promise<void>;
	close(): Promise<void>;
	/**
	 * Deep clone snapshot while preserving type information
	 */
	private cloneSnapshot;
	/**
	 * Get total count of snapshots (for testing)
	 */
	get size(): number;
}
//# sourceMappingURL=MemoryStorage.d.ts.map
