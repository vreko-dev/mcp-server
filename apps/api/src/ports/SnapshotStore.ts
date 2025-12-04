/**
 * Snapshot Store Port Interface
 * Defines the contract for snapshot data storage
 */

export interface SnapshotMetadata {
	id: string;
	timestamp: number;
	filePath: string;
	reason?: string;
	source: string;
	size: number;
	hash: string;
}

export interface SnapshotStore {
	/**
	 * Create a new snapshot
	 * @param metadata Snapshot metadata
	 * @param content Snapshot content
	 * @returns Promise that resolves to the snapshot ID
	 */
	createSnapshot(metadata: SnapshotMetadata, content: string): Promise<string>;

	/**
	 * List snapshots
	 * @param filter Filter criteria
	 * @returns Promise that resolves to array of snapshot metadata
	 */
	listSnapshots(filter?: {
		filePath?: string;
		limit?: number;
		offset?: number;
	}): Promise<SnapshotMetadata[]>;

	/**
	 * Get snapshot metadata
	 * @param snapshotId Snapshot ID
	 * @returns Promise that resolves to snapshot metadata
	 */
	getSnapshotMetadata(snapshotId: string): Promise<SnapshotMetadata | null>;

	/**
	 * Get snapshot content
	 * @param snapshotId Snapshot ID
	 * @returns Promise that resolves to snapshot content
	 */
	getSnapshotContent(snapshotId: string): Promise<string | null>;

	/**
	 * Delete a snapshot
	 * @param snapshotId Snapshot ID
	 * @returns Promise that resolves when snapshot is deleted
	 */
	deleteSnapshot(snapshotId: string): Promise<void>;
}
