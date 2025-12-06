import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { StorageAdapter } from "./StorageAdapter";
export declare class LocalStorage implements StorageAdapter {
	private db;
	private dbPath;
	constructor(dbPath: string);
	private ensureInitialized;
	private initSchema;
	save(snapshot: Snapshot, contentHash?: string): Promise<void>;
	get(id: string): Promise<Snapshot | null>;
	getByContentHash(hash: string): Promise<Snapshot | null>;
	/**
	 * Get the stored content hash for a snapshot (for preserving hash on updates)
	 */
	getStoredContentHash(id: string): Promise<string | null>;
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;
	delete(id: string): Promise<void>;
	close(): Promise<void>;
	private deserializeSnapshot;
}
//# sourceMappingURL=LocalStorage.d.ts.map
