import { gunzipSync, gzipSync } from "node:zlib";
import type { Database } from "better-sqlite3";
import { StorageConnectionError, StorageError, StorageTransactionError } from "./StorageErrors.js";

// Type definitions for better-sqlite3
type DatabaseInstance = Database;
type DatabaseConstructor = new (...args: any[]) => DatabaseInstance;
type DatabaseOptions = ConstructorParameters<DatabaseConstructor>[1];

// Helper functions for compression
function compress(content: string): Buffer {
	return gzipSync(Buffer.from(content, "utf-8"), { level: 9 });
}

// UUID generation function
function generateId(): string {
	// Generate ID with only lowercase letters and numbers
	const timestampPart = Date.now().toString(36);
	const randomPart = Math.random().toString(36).slice(2, 7).toLowerCase();
	return `snapshot_${timestampPart}_${randomPart}`;
}

// Type for queued operations
interface QueuedOperation<T> {
	id: string;
	operationName: string;
	priority: number;
	operation: () => Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: any) => void;
	timestamp: number;
}

// Simple connection pool for read operations
class ConnectionPool {
	private connections: DatabaseInstance[] = [];
	private availableConnections: DatabaseInstance[] = [];
	private maxConnections: number;

	constructor(
		private dbPath: string,
		private dbOptions: DatabaseOptions | undefined,
		size = 4,
	) {
		this.maxConnections = size;
	}

	// Get a connection from the pool
	async getConnection(): Promise<DatabaseInstance> {
		// Try to get an available connection
		if (this.availableConnections.length > 0) {
			const connection = this.availableConnections.pop();
			if (connection) {
				return connection;
			}
		}

		// Create a new connection if we haven't reached the limit
		if (this.connections.length < this.maxConnections) {
			const db = await createDatabaseInstance(this.dbPath, this.dbOptions);
			// Enable WAL mode for the read connection
			db.pragma("journal_mode = WAL");
			this.connections.push(db);
			return db;
		}

		// If we've reached the limit, reuse an existing connection
		// This is a simple round-robin approach
		const db = this.connections.shift();
		if (db) {
			this.connections.push(db);
			return db;
		}

		// Fallback - create a new connection
		return await createDatabaseInstance(this.dbPath, this.dbOptions);
	}

	// Return a connection to the pool
	releaseConnection(_db: DatabaseInstance): void {
		// In this simple implementation, we don't actually release connections
		// but keep them in the pool for reuse
	}

	// Close all connections in the pool
	close(): void {
		for (const db of this.connections) {
			try {
				db.close();
			} catch (_error) {
				// Ignore errors when closing
			}
		}
		this.connections = [];
		this.availableConnections = [];
	}
}

let cachedDatabaseConstructor: DatabaseConstructor | null = null;
let cachedDatabaseError: Error | null = null;

const tryLoadBetterSqlite3 = async (): Promise<DatabaseConstructor | null> => {
	if (cachedDatabaseConstructor) {
		return cachedDatabaseConstructor;
	}

	if (cachedDatabaseError) {
		return null;
	}

	try {
		const requiredModule = await import("better-sqlite3");
		// ESM imports return the default export
		const ctor = requiredModule.default as DatabaseConstructor;

		// Verify the native binding can actually be instantiated (ABI compatibility)
		try {
			const probe = new ctor(":memory:");
			probe.close();
		} catch (instantiationError: unknown) {
			cachedDatabaseError =
				instantiationError instanceof Error ? instantiationError : new Error(String(instantiationError));
			return null;
		}

		cachedDatabaseConstructor = ctor;
		return cachedDatabaseConstructor;
	} catch (error) {
		cachedDatabaseError =
			error instanceof Error
				? error
				: new Error(typeof error === "string" ? error : "Unknown error loading better-sqlite3");
		return null;
	}
};

const isBetterSqlite3Available = async (): Promise<boolean> => (await tryLoadBetterSqlite3()) !== null;

const getBetterSqlite3LoadError = (): Error | null => cachedDatabaseError;

const requireDatabaseConstructor = async (): Promise<DatabaseConstructor> => {
	const betterSqlite3 = await tryLoadBetterSqlite3();
	if (betterSqlite3) {
		return betterSqlite3;
	}

	// better-sqlite3 is not available - build detailed error message
	const errorMessage = cachedDatabaseError
		? `better-sqlite3: ${cachedDatabaseError.message}`
		: "better-sqlite3: not installed or not compatible";

	const detailedMessage = `No SQLite implementation available. ${errorMessage}`;
	const error = new StorageConnectionError(detailedMessage);

	// Attach detailed error info for better debugging
	(error as any).details = {
		betterSqlite3Error: cachedDatabaseError?.message,
	};

	throw error;
};

const createDatabaseInstance = async (pathToDatabase: string, options?: DatabaseOptions): Promise<DatabaseInstance> => {
	const DatabaseCtor = await requireDatabaseConstructor();
	return new DatabaseCtor(pathToDatabase, options);
};

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
export class StorageBroker {
	private db: DatabaseInstance | null = null;
	private readConnectionPool: ConnectionPool | null = null;
	private initialized = false;
	private operationQueue: QueuedOperation<any>[] = [];
	private isProcessingQueue = false;
	private writerId: string;

	constructor(private dbPath: string) {
		// Generate a unique writer ID for this process
		this.writerId = `writer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Initialize the storage broker and database connection
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Create database connection
			this.db = await createDatabaseInstance(this.dbPath);

			// Enable WAL mode for better performance and concurrency
			if (this.db && typeof (this.db as any).pragma === "function") {
				(this.db as any).pragma("journal_mode = WAL");
			}

			// Create read connection pool for concurrent reads
			this.readConnectionPool = new ConnectionPool(this.dbPath, undefined, 4);

			// Run migrations to ensure schema is up to date
			this.runMigrations();

			this.initialized = true;
		} catch (error) {
			if (error instanceof StorageConnectionError) {
				// Re-throw database connectivity errors with full details
				throw error;
			}

			if (error instanceof Error) {
				// Determine which part of initialization failed for better DX
				const message = error.message;
				let specificError = "Failed to initialize storage broker";

				if (message.includes("sqlite")) {
					specificError = `Database initialization failed: ${message}`;
				}

				throw new StorageError(specificError, "STORAGE_BROKER_INIT_ERROR", {
					cause: error,
				});
			}

			throw new StorageError("Failed to initialize storage broker", "STORAGE_BROKER_INIT_ERROR", {
				cause: error,
			});
		}
	}

	/**
	 * Get the database instance
	 * @returns The database instance, or null if not initialized
	 * @public This is intentionally public to allow direct database access for advanced operations
	 */
	getDatabase(): DatabaseInstance | null {
		return this.db;
	}

	/**
	 * Run database migrations to ensure schema is up to date
	 */
	private runMigrations(): void {
		if (!this.db) {
			throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
		}

		this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        parent_id TEXT,
        metadata TEXT,
        FOREIGN KEY (parent_id) REFERENCES snapshots(id)
      );

      CREATE TABLE IF NOT EXISTS file_changes (
        snapshot_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        action TEXT CHECK(action IN ('add','modify','delete')),
        diff BLOB,
        storage_type TEXT DEFAULT 'diff',
        content_size INTEGER,
        PRIMARY KEY (snapshot_id, file_path),
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
      );

      -- Add sessions table for session-aware snapshots
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        ended_at INTEGER NOT NULL,
        reason TEXT NOT NULL,
        summary TEXT,
        tags TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS session_files (
        session_id TEXT NOT NULL,
        snapshot_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        added_count INTEGER DEFAULT 0,
        deleted_count INTEGER DEFAULT 0,
        PRIMARY KEY (session_id, file_path),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
      );

      -- Add queue persistence table for operation queuing
      CREATE TABLE IF NOT EXISTS queued_operations (
        id TEXT PRIMARY KEY,
        operation_name TEXT NOT NULL,
        priority INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        data BLOB,
        status TEXT CHECK(status IN ('pending','processing','completed','failed')) DEFAULT 'pending'
      );

      -- Single-column indexes
      CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_snapshot_parent ON snapshots(parent_id);
      CREATE INDEX IF NOT EXISTS idx_file_path ON file_changes(file_path);
      CREATE INDEX IF NOT EXISTS idx_session_started_at ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_session_ended_at ON sessions(ended_at);
      CREATE INDEX IF NOT EXISTS idx_session_reason ON sessions(reason);
      CREATE INDEX IF NOT EXISTS idx_queued_operations_priority ON queued_operations(priority);
      CREATE INDEX IF NOT EXISTS idx_queued_operations_status ON queued_operations(status);
      CREATE INDEX IF NOT EXISTS idx_queued_operations_created_at ON queued_operations(created_at);

      -- Covering indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_snapshots_list
        ON snapshots(timestamp DESC, id, name);

      CREATE INDEX IF NOT EXISTS idx_file_changes_snapshot
        ON file_changes(snapshot_id, file_path, action);

      CREATE INDEX IF NOT EXISTS idx_file_changes_file_covering
        ON file_changes(file_path, snapshot_id)
        WHERE action != 'delete';

      -- Covering indexes for session queries
      CREATE INDEX IF NOT EXISTS idx_sessions_list
        ON sessions(ended_at DESC, id, reason);

      CREATE INDEX IF NOT EXISTS idx_session_files_session
        ON session_files(session_id, file_path);

      -- Covering index for queued operations
      CREATE INDEX IF NOT EXISTS idx_queued_operations_list
        ON queued_operations(priority ASC, created_at ASC, id, status)
        WHERE status = 'pending';

      -- Add writers_lock table for single-writer discipline across processes
      CREATE TABLE IF NOT EXISTS writers_lock (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        writer_id TEXT,
        acquired_at INTEGER,
        expires_at INTEGER
      );

      -- Initialize the lock row if it doesn't exist
      INSERT OR IGNORE INTO writers_lock (id, writer_id, acquired_at, expires_at)
      VALUES (1, NULL, 0, 0);
    `);
	}

	/**
	 * Close the storage broker and database connection
	 */
	async close(): Promise<void> {
		try {
			// Process any remaining operations in the queue before closing
			await this.processQueue();

			if (this.db) {
				this.db.close();
				this.db = null;
			}

			if (this.readConnectionPool) {
				this.readConnectionPool.close();
				this.readConnectionPool = null;
			}

			this.initialized = false;
		} catch (error) {
			throw new StorageError("Failed to close storage broker", "STORAGE_BROKER_CLOSE_ERROR", { cause: error });
		}
	}

	/**
	 * Get a read connection from the pool for concurrent read operations
	 */
	private async getReadConnection(): Promise<DatabaseInstance> {
		if (!this.readConnectionPool) {
			throw new StorageError("Read connection pool not initialized", "STORAGE_NOT_INITIALIZED");
		}
		return await this.readConnectionPool.getConnection();
	}

	/**
	 * Check if better-sqlite3 is available
	 */
	static async isAvailable(): Promise<boolean> {
		return await isBetterSqlite3Available();
	}

	/**
	 * Get the error that occurred when loading better-sqlite3, if any
	 */
	static getLoadError(): Error | null {
		return getBetterSqlite3LoadError();
	}

	/**
	 * Attempt to acquire a distributed lock for writing
	 * @param writerId Unique identifier for this writer process
	 * @param timeoutMs Maximum time to wait for the lock in milliseconds
	 * @returns True if lock was acquired, false otherwise
	 */
	private async acquireLock(writerId: string, timeoutMs = 5000): Promise<boolean> {
		if (!this.db) {
			throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
		}

		const startTime = Date.now();
		const maxWaitTime = timeoutMs;
		let waitTime = 10; // Start with 10ms

		while (Date.now() - startTime < maxWaitTime) {
			try {
				// Try to acquire the lock using an atomic update
				const result = this.db
					.prepare(`
					UPDATE writers_lock
					SET writer_id = ?, acquired_at = ?, expires_at = ?
					WHERE (writer_id IS NULL OR expires_at < ?) AND id = 1
				`)
					.run(writerId, Date.now(), Date.now() + 30000, Date.now());

				// If we updated exactly one row, we got the lock
				if (result.changes === 1) {
					return true;
				}

				// If we didn't get the lock, wait and try again with exponential backoff
				await new Promise((resolve) =>
					setTimeout(resolve, Math.min(waitTime, maxWaitTime - (Date.now() - startTime))),
				);
				waitTime = Math.min(waitTime * 2, 1000); // Max 1 second wait
			} catch (error) {
				// Log error but continue trying
				console.warn("Failed to acquire lock:", error);
				await new Promise((resolve) =>
					setTimeout(resolve, Math.min(waitTime, maxWaitTime - (Date.now() - startTime))),
				);
				waitTime = Math.min(waitTime * 2, 1000);
			}
		}

		// Timeout reached
		return false;
	}

	/**
	 * Release the distributed lock
	 * @param writerId Unique identifier for this writer process
	 */
	private async releaseLock(writerId: string): Promise<void> {
		if (!this.db) {
			throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
		}

		try {
			// Only release if we're the current holder
			this.db
				.prepare(`
				UPDATE writers_lock
				SET writer_id = NULL, acquired_at = 0, expires_at = 0
				WHERE writer_id = ? AND id = 1
			`)
				.run(writerId);
		} catch (error) {
			// Log error but don't throw - we don't want to fail the operation if we can't release the lock
			console.warn("Failed to release lock:", error);
		}
	}

	/**
	 * Create a snapshot through the queued operation system to ensure single-writer discipline
	 * @param name The snapshot name
	 * @param files Map of file paths to content
	 * @param metadata Optional metadata
	 * @param parentId Optional parent snapshot ID
	 * @param id Optional snapshot ID (if not provided, one will be generated)
	 * @returns Snapshot information
	 */
	async createSnapshot(
		name: string,
		files: Map<string, string>,
		metadata?: Record<string, unknown>,
		parentId?: string,
		id?: string,
	): Promise<{
		id: string;
		name: string;
		fileCount: number;
		timestamp: number;
	}> {
		// Use the queue system to ensure single-writer discipline
		return this.queueOperation("createSnapshot", async () => {
			if (!this.db) {
				throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
			}

			// Use provided ID or generate a new one
			const snapshotId = id || generateId();
			const timestamp = Date.now();

			// Pre-compress all file content outside the transaction
			const preCompressedFiles = new Map<
				string,
				{ compressed: Buffer; storageType: string; contentSize: number }
			>();

			// Process each file for pre-compression
			Array.from(files.entries()).forEach(([filePath, content]) => {
				const contentSize = Buffer.byteLength(content, "utf-8");
				// For simplicity, we'll store full content for all files
				const compressed = compress(content);
				preCompressedFiles.set(filePath, {
					compressed,
					storageType: "full",
					contentSize,
				});
			});

			try {
				// Begin transaction for atomic operation
				const insert = this.db.transaction(() => {
					try {
						// Insert snapshot record with timestamp and full metadata
						if (this.db) {
							this.db
								.prepare(
									`
					INSERT INTO snapshots (id, name, timestamp, parent_id, metadata)
					VALUES (?, ?, ?, ?, ?)
				`,
								)
								.run(
									snapshotId,
									name,
									timestamp,
									parentId || null,
									JSON.stringify({
										fileCount: files.size,
										createdBy: "snapback",
										...metadata,
									}),
								);

							// Insert file changes
							if (this.db) {
								const stmt = this.db.prepare(`
					INSERT INTO file_changes (snapshot_id, file_path, action, diff, storage_type, content_size)
					VALUES (?, ?, ?, ?, ?, ?)
				`);

								// Process each pre-compressed file
								preCompressedFiles.forEach((preCompressed, filePath) => {
									const { compressed, storageType, contentSize } = preCompressed;
									const action = "add"; // For simplicity, all files are "add" in this implementation
									stmt.run(snapshotId, filePath, action, compressed, storageType, contentSize);
								});
							}
						}
					} catch (queryError: unknown) {
						const message = queryError instanceof Error ? queryError.message : String(queryError);
						throw new StorageError(`Failed to create snapshot: ${message}`, "STORAGE_QUERY_ERROR", {
							cause: queryError,
						});
					}
				});

				insert();

				return { id: snapshotId, name, fileCount: files.size, timestamp };
			} catch (error) {
				if (error instanceof StorageError || error instanceof StorageTransactionError) {
					throw error;
				}
				const message = error instanceof Error ? error.message : String(error);
				throw new StorageError(`Failed to create snapshot: ${message}`, "STORAGE_CREATE_SNAPSHOT_ERROR", {
					cause: error,
				});
			}
		});
	}

	/**
	 * Queue an operation for execution
	 * @param operationName Name of the operation for logging
	 * @param operation Function to execute
	 * @param priority Priority of the operation (lower number = higher priority)
	 * @returns Promise that resolves when the operation completes
	 */
	async queueOperation<T>(operationName: string, operation: () => Promise<T>, priority = 0): Promise<T> {
		if (!this.db) {
			throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
		}

		return new Promise<T>((resolve, reject) => {
			const id = generateId();
			const timestamp = Date.now();

			const queuedOp: QueuedOperation<T> = {
				id,
				operationName,
				priority,
				operation, // Simplified - no lock management here
				resolve,
				reject,
				timestamp,
			};

			// Persist the operation to the database
			try {
				if (this.db) {
					const stmt = this.db.prepare(`
            INSERT INTO queued_operations (id, operation_name, priority, created_at, status)
            VALUES (?, ?, ?, ?, ?)
          `);

					stmt.run(id, operationName, priority, timestamp, "pending");
				}

				// Add to in-memory queue and sort by priority
				this.operationQueue.push(queuedOp);
				this.operationQueue.sort((a, b) => {
					// First sort by priority (lower number = higher priority)
					if (a.priority !== b.priority) {
						return a.priority - b.priority;
					}
					// Then sort by timestamp (FIFO for same priority)
					return a.timestamp - b.timestamp;
				});

				// Start processing if not already processing
				if (!this.isProcessingQueue) {
					this.processQueue();
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Process the operation queue with single-writer discipline
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue) {
			return;
		}

		this.isProcessingQueue = true;

		try {
			// Check if there are operations in the queue
			if (this.operationQueue.length > 0) {
				// Acquire lock before processing the next operation
				const lockAcquired = await this.acquireLock(this.writerId, 10000); // 10 second timeout
				if (!lockAcquired) {
					// If we can't acquire the lock, reschedule processing
					setTimeout(() => {
						this.isProcessingQueue = false;
						if (this.operationQueue.length > 0) {
							this.processQueue();
						}
					}, 100); // Try again in 100ms
					return;
				}

				try {
					// Sort queue before processing to ensure priority order
					this.operationQueue.sort((a, b) => {
						// First sort by priority (lower number = higher priority)
						if (a.priority !== b.priority) {
							return a.priority - b.priority;
						}
						// Then sort by timestamp (FIFO for same priority)
						return a.timestamp - b.timestamp;
					});

					// Process only ONE operation per lock acquisition to ensure fair sharing
					if (this.operationQueue.length > 0) {
						const queuedOp = this.operationQueue.shift();
						if (queuedOp) {
							try {
								const result = await queuedOp.operation();
								queuedOp.resolve(result);
							} catch (error) {
								queuedOp.reject(error);
							}
						}
					}
				} finally {
					// Always release the lock after processing one operation
					await this.releaseLock(this.writerId);
				}

				// Small delay to allow other brokers to acquire the lock
				await new Promise((resolve) => setTimeout(resolve, 1));
			}
		} catch (error) {
			console.error("Error processing queue:", error);
		} finally {
			this.isProcessingQueue = false;
			// If there are more operations, schedule processing of the next one
			if (this.operationQueue.length > 0) {
				setTimeout(() => {
					this.processQueue();
				}, 1); // Schedule next processing on next tick
			}
		}
	}

	/**
	 * Get a snapshot by ID
	 * @param id The snapshot ID
	 * @returns Snapshot information or null if not found
	 */
	async getSnapshot(id: string): Promise<{
		id: string;
		name: string;
		files: Map<string, string>;
		timestamp: number;
		metadata: string;
	} | null> {
		if (!this.db) {
			throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
		}

		// Use read connection for better performance
		const db = await this.getReadConnection();

		try {
			const row = db
				.prepare(`
				SELECT id, name, timestamp, metadata
				FROM snapshots
				WHERE id = ?
			`)
				.get(id);

			if (!row) {
				return null;
			}

			// Get file changes
			const fileRows = db
				.prepare(`
				SELECT file_path, diff, storage_type
				FROM file_changes
				WHERE snapshot_id = ?
			`)
				.all(id);

			const files = new Map<string, string>();
			for (const fileRow of fileRows) {
				try {
					const typedFileRow = fileRow as { file_path: string; diff: Buffer };
					const decompressed = gunzipSync(typedFileRow.diff);
					const content = decompressed.toString("utf-8");
					files.set(typedFileRow.file_path, content);
				} catch (error) {
					const typedFileRow = fileRow as { file_path: string };
					console.warn(`Failed to decompress file ${typedFileRow.file_path}:`, error);
				}
			}

			return {
				id: (row as { id: string }).id,
				name: (row as { name: string }).name,
				files,
				timestamp: (row as { timestamp: number }).timestamp,
				metadata: (row as { metadata: string }).metadata,
			};
		} catch (error) {
			throw new StorageError(
				`Failed to get snapshot: ${error instanceof Error ? error.message : String(error)}`,
				"STORAGE_GET_SNAPSHOT_ERROR",
				{ cause: error },
			);
		}
	}

	/**
	 * List snapshots with optional filters
	 * @param limit Maximum number of snapshots to return
	 * @param offset Offset for pagination
	 * @param sortBy Field to sort by
	 * @param sortOrder Sort order (ASC or DESC)
	 * @returns List of snapshots
	 */
	async listSnapshots(
		limit = 50,
		offset = 0,
		sortBy = "timestamp",
		sortOrder: "ASC" | "DESC" = "DESC",
	): Promise<
		Array<{
			id: string;
			name: string;
			timestamp: number;
			metadata: string;
		}>
	> {
		if (!this.db) {
			throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
		}

		// Use read connection for better performance
		const db = await this.getReadConnection();

		// Create local variables to avoid mutating parameters
		let validatedSortBy = sortBy;
		let validatedSortOrder = sortOrder;

		try {
			// Validate sortBy parameter
			const validSortColumns = ["timestamp", "name", "id"];
			if (!validSortColumns.includes(validatedSortBy)) {
				validatedSortBy = "timestamp";
			}

			// Validate sortOrder parameter
			if (validatedSortOrder !== "ASC" && validatedSortOrder !== "DESC") {
				validatedSortOrder = "DESC";
			}

			const rows = db
				.prepare(`
				SELECT id, name, timestamp, metadata
				FROM snapshots
				ORDER BY ${validatedSortBy} ${validatedSortOrder}
				LIMIT ? OFFSET ?
			`)
				.all(limit, offset);

			return rows.map((row) => ({
				id: (row as { id: string }).id,
				name: (row as { name: string }).name,
				timestamp: (row as { timestamp: number }).timestamp,
				metadata: (row as { metadata: string }).metadata,
			}));
		} catch (error) {
			throw new StorageError(
				`Failed to list snapshots: ${error instanceof Error ? error.message : String(error)}`,
				"STORAGE_LIST_SNAPSHOTS_ERROR",
				{ cause: error },
			);
		}
	}

	/**
	 * Delete a snapshot by ID
	 * @param id The snapshot ID
	 */
	async deleteSnapshot(id: string): Promise<void> {
		return this.queueOperation(`deleteSnapshot-${id}`, async () => {
			if (!this.db) {
				throw new StorageError("Database not initialized", "STORAGE_NOT_INITIALIZED");
			}

			try {
				// This will cascade delete file_changes due to foreign key constraint
				this.db
					.prepare(`
					DELETE FROM snapshots
					WHERE id = ?
				`)
					.run(id);
			} catch (error) {
				throw new StorageError(
					`Failed to delete snapshot: ${error instanceof Error ? error.message : String(error)}`,
					"STORAGE_DELETE_SNAPSHOT_ERROR",
					{ cause: error },
				);
			}
		});
	}
}
