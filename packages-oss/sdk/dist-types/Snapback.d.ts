import type { ProtectionConfig } from "@snapback-oss/contracts";
import { SnapbackAnalyticsClient } from "./client.js";
import { ProtectionManager } from "./protection/ProtectionManager.js";
import { SnapshotManager } from "./snapshot/SnapshotManager.js";
import type { StorageAdapter } from "./storage/StorageAdapter.js";
export interface SnapshotFilters {
    limit?: number;
    offset?: number;
    protected?: boolean;
    before?: Date;
    after?: Date;
}
export interface SnapbackOptions {
    /**
     * Storage configuration
     * Can be a path to SQLite database, StorageAdapter instance, or 'memory' for testing
     */
    storage?: string | StorageAdapter;
    /**
     * Protection configuration
     */
    protection?: ProtectionConfig;
    /**
     * Cloud API configuration (optional)
     * If provided, enables cloud sync functionality
     */
    cloud?: {
        baseUrl: string;
        apiKey: string;
        timeout?: number;
        retries?: number;
    };
    /**
     * Enable deduplication for local snapshots
     */
    enableDeduplication?: boolean;
    /**
     * Auto-protect configuration files
     */
    autoProtectConfigs?: boolean;
}
/**
 * Unified Snapback SDK entry point
 * Combines local snapshot management with optional cloud sync
 *
 * @example
 * ```typescript
 * // Local-only mode
 * const snapback = new Snapback({
 *   storage: './snapshots.db',
 *   protection: {
 *     patterns: [{ pattern: '**\/*.env', level: 'block' }],
 *     defaultLevel: 'watch',
 *     enabled: true
 *   }
 * });
 *
 * // Cloud-enabled mode
 * const snapback = new Snapback({
 *   storage: './snapshots.db',
 *   cloud: {
 *     baseUrl: 'https://api.snapback.dev',
 *     apiKey: 'your-api-key'
 *   }
 * });
 * ```
 */
export declare class Snapback {
    private storage;
    private snapshotManager;
    private protectionManager;
    private cloudClient?;
    private analyticsClient?;
    constructor(options: SnapbackOptions);
    /**
     * Create a snapshot of files
     * @param files - Files to snapshot
     * @param options - Snapshot options
     * @returns Created snapshot
     */
    createSnapshot(files: Array<{
        path: string;
        content: string;
        action?: "add" | "modify" | "delete";
    }>, options?: {
        description?: string;
        protected?: boolean;
    }): Promise<{
        id: string;
        timestamp: number;
        meta?: Record<string, any> | undefined;
        files?: string[] | undefined;
        fileContents?: Record<string, string> | undefined;
    }>;
    /**
     * Save a single file snapshot
     * @param path - File path
     * @param content - File content
     * @param description - Optional description
     * @returns Created snapshot
     */
    save(path: string, content: string, description?: string): Promise<{
        id: string;
        timestamp: number;
        meta?: Record<string, any> | undefined;
        files?: string[] | undefined;
        fileContents?: Record<string, string> | undefined;
    }>;
    /**
     * List snapshots with optional filters
     * @param filters - Filter options
     * @returns Array of snapshots
     */
    listSnapshots(filters?: SnapshotFilters): Promise<{
        id: string;
        timestamp: number;
        meta?: Record<string, any> | undefined;
        files?: string[] | undefined;
        fileContents?: Record<string, string> | undefined;
    }[]>;
    /**
     * Get a specific snapshot by ID
     * @param id - Snapshot ID
     * @returns Snapshot or null if not found
     */
    getSnapshot(id: string): Promise<{
        id: string;
        timestamp: number;
        meta?: Record<string, any> | undefined;
        files?: string[] | undefined;
        fileContents?: Record<string, string> | undefined;
    } | null>;
    /**
     * Delete a snapshot by ID
     * @param id - Snapshot ID
     */
    deleteSnapshot(id: string): Promise<void>;
    /**
     * Restore a snapshot
     * @param id - Snapshot ID
     * @returns Restore result
     */
    restoreSnapshot(id: string): Promise<{
        success: boolean;
        restoredFiles: string[];
        errors?: string[] | undefined;
    }>;
    /**
     * Protect a snapshot
     * @param id - Snapshot ID
     */
    protectSnapshot(id: string): Promise<void>;
    /**
     * Unprotect a snapshot
     * @param id - Snapshot ID
     */
    unprotectSnapshot(id: string): Promise<void>;
    /**
     * Protect a file path
     * @param filePath - File path to protect
     * @param level - Protection level
     * @param reason - Optional reason
     */
    protectFile(filePath: string, level: "watch" | "warn" | "block", reason?: string): void;
    /**
     * Check if a file is protected
     * @param filePath - File path to check
     * @returns Protection level or null if not protected
     */
    getProtectionLevel(filePath: string): "watch" | "warn" | "block" | null;
    /**
     * Close the storage connection
     */
    close(): Promise<void>;
    /**
     * Get the underlying snapshot manager for advanced operations
     */
    get snapshots(): SnapshotManager;
    /**
     * Get the underlying protection manager for advanced operations
     */
    get protection(): ProtectionManager;
    /**
     * Get the cloud client if configured
     */
    get cloud(): SnapbackAnalyticsClient | undefined;
    /**
     * Get the analytics client if configured
     */
    get analytics(): SnapbackAnalyticsClient | undefined;
}
//# sourceMappingURL=Snapback.d.ts.map