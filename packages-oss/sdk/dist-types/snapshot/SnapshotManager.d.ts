import type {
	CreateSnapshotOptions,
	FileInput,
	Snapshot,
	SnapshotFilters,
	SnapshotRestoreResult,
} from "@snapback-oss/contracts";
import type { StorageAdapter } from "../storage/StorageAdapter.js";
export interface SnapshotManagerOptions {
	enableDeduplication?: boolean;
	namingStrategy?: "git" | "semantic" | "timestamp";
	autoProtect?: boolean;
}
export declare class SnapshotManager {
	private storage;
	private options;
	private deduplication;
	private naming;
	constructor(storage: StorageAdapter, options?: SnapshotManagerOptions);
	create(files: FileInput[], options?: CreateSnapshotOptions): Promise<Snapshot>;
	/**
	 * Convenience method for creating a snapshot with a single file
	 * @param params - Object containing filePath and content
	 * @param options - Snapshot options
	 * @returns Created snapshot
	 */
	createTest(
		params: {
			filePath: string;
			content: string;
		},
		options?: CreateSnapshotOptions,
	): Promise<Snapshot>;
	private createSnapshot;
	list(filters?: SnapshotFilters): Promise<Snapshot[]>;
	get(id: string): Promise<Snapshot | null>;
	delete(id: string): Promise<void>;
	/**
	 * Restore snapshot to target directory with atomic guarantees
	 * @param id Snapshot ID to restore
	 * @param targetPath Target directory path (optional, for actual file system restore)
	 * @param options Restore options
	 * @returns Restore result with list of restored files and any errors
	 */
	restore(
		id: string,
		targetPath?: string,
		options?: {
			dryRun?: boolean;
			onProgress?: (progress: number) => void;
		},
	): Promise<SnapshotRestoreResult>;
	/**
	 * Atomic restore implementation with staging and rollback
	 */
	private restoreAtomic;
	protect(id: string): Promise<void>;
	unprotect(id: string): Promise<void>;
	search(criteria: { content?: string; message?: string }): Promise<Snapshot[]>;
	/**
	 * Check if storage adapter supports optimized search
	 */
	private supportsOptimizedSearch;
	/**
	 * Perform optimized search using storage adapter capabilities
	 */
	private optimizedSearch;
}
//# sourceMappingURL=SnapshotManager.d.ts.map
