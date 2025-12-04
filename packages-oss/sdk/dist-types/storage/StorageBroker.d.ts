import type { Database } from "better-sqlite3";
type DatabaseInstance = Database;
/**
 * StorageBroker - Single-writer coordinator for SQLite storage across processes
 *
 * This broker ensures only one process writes to the SQLite database at a time,
 * preventing corruption and ensuring data consistency across the VS Code extension,
 * MCP server, and CLI components.
 *
 * Key responsibilities:
 * - Queue write operations from multiple processes
 * - Execute writes sequentially with proper locking
 * - Handle contention with retry/backoff mechanisms
 * - Provide WAL mode for concurrent reads
 *
 * @example
 * ```typescript
 * const broker = new StorageBroker('/path/to/database.db');
 * await broker.initialize();
 *
 * // Queue a write operation
 * const result = await broker.createSnapshot({
 *   name: 'test',
 *   files: new Map([['file.ts', 'content']]),
 *   metadata: {}
 * });
 * ```
 */
export declare class StorageBroker {
    private dbPath;
    private db;
    private readConnectionPool;
    private initialized;
    private operationQueue;
    private isProcessingQueue;
    private writerId;
    constructor(dbPath: string);
    /**
     * Initialize the storage broker and database connection
     */
    initialize(): Promise<void>;
    /**
     * Get the database instance
     * @returns The database instance, or null if not initialized
     * @public This is intentionally public to allow direct database access for advanced operations
     */
    getDatabase(): DatabaseInstance | null;
    /**
     * Run database migrations to ensure schema is up to date
     */
    private runMigrations;
    /**
     * Close the storage broker and database connection
     */
    close(): Promise<void>;
    /**
     * Get a read connection from the pool for concurrent read operations
     */
    private getReadConnection;
    /**
     * Check if better-sqlite3 is available
     */
    static isAvailable(): Promise<boolean>;
    /**
     * Get the error that occurred when loading better-sqlite3, if any
     */
    static getLoadError(): Error | null;
    /**
     * Attempt to acquire a distributed lock for writing
     * @param writerId Unique identifier for this writer process
     * @param timeoutMs Maximum time to wait for the lock in milliseconds
     * @returns True if lock was acquired, false otherwise
     */
    private acquireLock;
    /**
     * Release the distributed lock
     * @param writerId Unique identifier for this writer process
     */
    private releaseLock;
    /**
     * Create a snapshot through the queued operation system to ensure single-writer discipline
     * @param name The snapshot name
     * @param files Map of file paths to content
     * @param metadata Optional metadata
     * @param parentId Optional parent snapshot ID
     * @param id Optional snapshot ID (if not provided, one will be generated)
     * @returns Snapshot information
     */
    createSnapshot(name: string, files: Map<string, string>, metadata?: Record<string, unknown>, parentId?: string, id?: string): Promise<{
        id: string;
        name: string;
        fileCount: number;
        timestamp: number;
    }>;
    /**
     * Queue an operation for execution
     * @param operationName Name of the operation for logging
     * @param operation Function to execute
     * @param priority Priority of the operation (lower number = higher priority)
     * @returns Promise that resolves when the operation completes
     */
    queueOperation<T>(operationName: string, operation: () => Promise<T>, priority?: number): Promise<T>;
    /**
     * Process the operation queue with single-writer discipline
     */
    private processQueue;
    /**
     * Get a snapshot by ID
     * @param id The snapshot ID
     * @returns Snapshot information or null if not found
     */
    getSnapshot(id: string): Promise<{
        id: string;
        name: string;
        files: Map<string, string>;
        timestamp: number;
        metadata: string;
    } | null>;
    /**
     * List snapshots with optional filters
     * @param limit Maximum number of snapshots to return
     * @param offset Offset for pagination
     * @param sortBy Field to sort by
     * @param sortOrder Sort order (ASC or DESC)
     * @returns List of snapshots
     */
    listSnapshots(limit?: number, offset?: number, sortBy?: string, sortOrder?: "ASC" | "DESC"): Promise<Array<{
        id: string;
        name: string;
        timestamp: number;
        metadata: string;
    }>>;
    /**
     * Delete a snapshot by ID
     * @param id The snapshot ID
     */
    deleteSnapshot(id: string): Promise<void>;
}
export {};
//# sourceMappingURL=StorageBroker.d.ts.map