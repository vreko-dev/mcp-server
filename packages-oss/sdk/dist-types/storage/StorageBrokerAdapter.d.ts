import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { StorageAdapter } from "./StorageAdapter.js";
/**
 * StorageBrokerAdapter - Adapter that makes StorageBroker compatible with StorageAdapter interface
 *
 * This adapter bridges the StorageBroker (with single-writer discipline) to the StorageAdapter interface
 * used by the rest of the codebase, ensuring all storage operations go through the single-writer broker.
 *
 * Key responsibilities:
 * - Convert StorageAdapter method calls to StorageBroker operations
 * - Maintain compatibility with existing code
 * - Ensure all operations are queued through the broker's single-writer discipline
 */
export declare class StorageBrokerAdapter implements StorageAdapter {
    private broker;
    constructor(dbPath: string);
    initialize(): Promise<void>;
    save(snapshot: Snapshot, contentHash?: string): Promise<void>;
    get(id: string): Promise<Snapshot | null>;
    list(filters?: SnapshotFilters): Promise<Snapshot[]>;
    delete(id: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=StorageBrokerAdapter.d.ts.map