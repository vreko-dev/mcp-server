/**
 * Snapshot management for the Snapback SDK
 * Provides unified interface for creating, listing, and restoring snapshots
 */
export interface SnapshotMetadata {
    id: string;
    createdAt: string;
    filePath: string;
    reason?: string;
    source: string;
    metadata?: Record<string, any>;
}
export interface CreateSnapshotOptions {
    filePath: string;
    content: string;
    reason?: string;
    source: string;
    metadata?: Record<string, any>;
}
export interface ListSnapshotsOptions {
    filePath?: string;
    limit?: number;
    offset?: number;
}
export interface RestoreSnapshotOptions {
    snapshotId: string;
    targetPath?: string;
}
export interface SnapshotClient {
    /**
     * Create a new snapshot
     * @param options Snapshot creation options
     * @returns Snapshot metadata
     */
    createSnapshot(options: CreateSnapshotOptions): Promise<SnapshotMetadata>;
    /**
     * List snapshots
     * @param options Listing options
     * @returns Array of snapshot metadata
     */
    listSnapshots(options?: ListSnapshotsOptions): Promise<SnapshotMetadata[]>;
    /**
     * Restore a snapshot
     * @param options Restore options
     * @returns Restored content
     */
    restoreSnapshot(options: RestoreSnapshotOptions): Promise<string>;
    /**
     * Get snapshot content
     * @param snapshotId Snapshot ID
     * @returns Snapshot content
     */
    getSnapshotContent(snapshotId: string): Promise<string>;
}
export declare class UnifiedSnapshotClient implements SnapshotClient {
    /**
     * Create a new snapshot
     * @param options Snapshot creation options
     * @returns Snapshot metadata
     */
    createSnapshot(options: CreateSnapshotOptions): Promise<SnapshotMetadata>;
    /**
     * List snapshots
     * @param options Listing options
     * @returns Array of snapshot metadata
     */
    listSnapshots(_options?: ListSnapshotsOptions): Promise<SnapshotMetadata[]>;
    /**
     * Restore a snapshot
     * @param options Restore options
     * @returns Restored content
     */
    restoreSnapshot(_options: RestoreSnapshotOptions): Promise<string>;
    /**
     * Get snapshot content
     * @param snapshotId Snapshot ID
     * @returns Snapshot content
     */
    getSnapshotContent(_snapshotId: string): Promise<string>;
    /**
     * Generate unique ID for snapshots
     */
    private generateId;
}
//# sourceMappingURL=snapshots.d.ts.map