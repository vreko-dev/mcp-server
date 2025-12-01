# SnapBack SDK Storage Layer Architecture

**Document Version**: 1.0
**Date**: 2025-10-21
**Author**: Backend Architecture Analysis

---

## Executive Summary

This document defines the complete storage layer architecture for the @snapback/sdk, supporting multiple storage backends (SQLite, Cloud API, In-Memory) with a unified adapter interface. The design emphasizes:

-   **Reliability**: ACID compliance, transaction support, data integrity
-   **Performance**: Compression, deduplication, efficient querying, batch operations
-   **Flexibility**: Multiple backends for different deployment scenarios
-   **Migration**: Seamless upgrade path from existing VS Code storage

---

## 1. Storage Adapter Interface

### 1.1 Core Interface Definition

```typescript
// packages/sdk/src/storage/StorageAdapter.ts

import type {
	Snapshot,
	SnapshotFilters,
	ProtectedFile,
	ProtectionLevel,
} from "@snapback/contracts";

/**
 * Storage query options for filtering and pagination
 */
export interface QueryOptions {
	filters?: SnapshotFilters;
	orderBy?: "timestamp" | "id";
	order?: "ASC" | "DESC";
	limit?: number;
	offset?: number;
}

/**
 * Transaction isolation levels
 */
export type IsolationLevel =
	| "READ_UNCOMMITTED"
	| "READ_COMMITTED"
	| "REPEATABLE_READ"
	| "SERIALIZABLE";

/**
 * Transaction context for batch operations
 */
export interface Transaction {
	commit(): Promise<void>;
	rollback(): Promise<void>;
	isActive(): boolean;
}

/**
 * Storage statistics for monitoring
 */
export interface StorageStats {
	totalSnapshots: number;
	totalSize: number; // in bytes
	compressedSize: number;
	compressionRatio: number;
	oldestSnapshot: number; // timestamp
	newestSnapshot: number; // timestamp
	storageType: "sqlite" | "cloud" | "memory";
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
	successful: T[];
	failed: Array<{ item: T; error: Error }>;
	totalProcessed: number;
}

/**
 * Universal storage adapter interface
 * All storage backends must implement this interface
 */
export interface StorageAdapter {
	// === Lifecycle Management ===

	/**
	 * Initialize the storage backend
	 * Creates necessary tables/indexes, establishes connections
	 */
	initialize(): Promise<void>;

	/**
	 * Close storage connection and cleanup resources
	 * Ensures all pending operations complete
	 */
	close(): Promise<void>;

	/**
	 * Check if storage is ready for operations
	 */
	isReady(): boolean;

	// === Snapshot CRUD Operations ===

	/**
	 * Save a snapshot to storage
	 * @param snapshot - Complete snapshot data
	 * @returns Promise<void>
	 */
	save(snapshot: Snapshot): Promise<void>;

	/**
	 * Get a snapshot by ID
	 * @param id - Snapshot identifier
	 * @returns Promise<Snapshot | null>
	 */
	get(id: string): Promise<Snapshot | null>;

	/**
	 * List snapshots with optional filters and pagination
	 * @param options - Query options for filtering/sorting
	 * @returns Promise<Snapshot[]>
	 */
	list(options?: QueryOptions): Promise<Snapshot[]>;

	/**
	 * Update snapshot metadata (not file contents)
	 * @param id - Snapshot identifier
	 * @param updates - Partial snapshot updates
	 * @returns Promise<void>
	 */
	update(id: string, updates: Partial<Snapshot>): Promise<void>;

	/**
	 * Delete a snapshot by ID
	 * @param id - Snapshot identifier
	 * @returns Promise<void>
	 */
	delete(id: string): Promise<void>;

	// === Batch Operations ===

	/**
	 * Save multiple snapshots in a single transaction
	 * @param snapshots - Array of snapshots to save
	 * @returns Promise<BatchResult<Snapshot>>
	 */
	saveBatch(snapshots: Snapshot[]): Promise<BatchResult<Snapshot>>;

	/**
	 * Delete multiple snapshots in a single transaction
	 * @param ids - Array of snapshot IDs to delete
	 * @returns Promise<BatchResult<string>>
	 */
	deleteBatch(ids: string[]): Promise<BatchResult<string>>;

	// === Query Operations ===

	/**
	 * Count snapshots matching filters
	 * @param filters - Optional filters
	 * @returns Promise<number>
	 */
	count(filters?: SnapshotFilters): Promise<number>;

	/**
	 * Find snapshots containing a specific file
	 * @param filePath - File path to search for
	 * @returns Promise<Snapshot[]>
	 */
	findByFile(filePath: string): Promise<Snapshot[]>;

	/**
	 * Find snapshots within a time range
	 * @param start - Start timestamp
	 * @param end - End timestamp
	 * @returns Promise<Snapshot[]>
	 */
	findByTimeRange(start: number, end: number): Promise<Snapshot[]>;

	// === Transaction Support ===

	/**
	 * Begin a transaction for atomic operations
	 * @param isolationLevel - Optional isolation level
	 * @returns Promise<Transaction>
	 */
	beginTransaction(isolationLevel?: IsolationLevel): Promise<Transaction>;

	/**
	 * Execute operations within a transaction
	 * @param callback - Operations to execute
	 * @returns Promise<T>
	 */
	withTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;

	// === Protection Management ===

	/**
	 * Save protected file entry
	 * @param file - Protected file metadata
	 * @returns Promise<void>
	 */
	saveProtectedFile(file: ProtectedFile): Promise<void>;

	/**
	 * Get protected file by path
	 * @param path - File path
	 * @returns Promise<ProtectedFile | null>
	 */
	getProtectedFile(path: string): Promise<ProtectedFile | null>;

	/**
	 * List all protected files
	 * @returns Promise<ProtectedFile[]>
	 */
	listProtectedFiles(): Promise<ProtectedFile[]>;

	/**
	 * Delete protected file entry
	 * @param path - File path
	 * @returns Promise<void>
	 */
	deleteProtectedFile(path: string): Promise<void>;

	// === Storage Maintenance ===

	/**
	 * Optimize storage (vacuum, compact, etc.)
	 * @returns Promise<void>
	 */
	optimize(): Promise<void>;

	/**
	 * Get storage statistics for monitoring
	 * @returns Promise<StorageStats>
	 */
	getStats(): Promise<StorageStats>;

	/**
	 * Validate storage integrity
	 * @returns Promise<{ valid: boolean; errors: string[] }>
	 */
	validateIntegrity(): Promise<{ valid: boolean; errors: string[] }>;

	/**
	 * Export all data for backup/migration
	 * @returns Promise<string> - JSON string of all data
	 */
	exportData(): Promise<string>;

	/**
	 * Import data from backup/migration
	 * @param data - JSON string of data
	 * @returns Promise<void>
	 */
	importData(data: string): Promise<void>;
}
```

### 1.2 Error Handling

```typescript
// packages/sdk/src/storage/StorageErrors.ts

/**
 * Base storage error
 */
export class StorageError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly cause?: Error
	) {
		super(message);
		this.name = "StorageError";
	}
}

/**
 * Database connection error
 */
export class DatabaseConnectionError extends StorageError {
	constructor(message: string, options?: { cause?: Error }) {
		super(message, "DB_CONNECTION_ERROR", options?.cause);
		this.name = "DatabaseConnectionError";
	}
}

/**
 * Database query error
 */
export class DatabaseQueryError extends StorageError {
	constructor(
		message: string,
		public readonly query: string,
		public readonly params: unknown[],
		options?: { cause?: Error }
	) {
		super(message, "DB_QUERY_ERROR", options?.cause);
		this.name = "DatabaseQueryError";
	}
}

/**
 * Database transaction error
 */
export class DatabaseTransactionError extends StorageError {
	constructor(
		message: string,
		public readonly operation: string,
		options?: { cause?: Error }
	) {
		super(message, "DB_TRANSACTION_ERROR", options?.cause);
		this.name = "DatabaseTransactionError";
	}
}

/**
 * Snapshot not found error
 */
export class SnapshotNotFoundError extends StorageError {
	constructor(public readonly snapshotId: string) {
		super(`Snapshot not found: ${snapshotId}`, "SNAPSHOT_NOT_FOUND");
		this.name = "SnapshotNotFoundError";
	}
}

/**
 * Storage capacity error
 */
export class StorageCapacityError extends StorageError {
	constructor(
		message: string,
		public readonly currentSize: number,
		public readonly maxSize: number
	) {
		super(message, "STORAGE_CAPACITY_ERROR");
		this.name = "StorageCapacityError";
	}
}

/**
 * Data corruption error
 */
export class DataCorruptionError extends StorageError {
	constructor(message: string, public readonly affectedIds: string[]) {
		super(message, "DATA_CORRUPTION_ERROR");
		this.name = "DataCorruptionError";
	}
}

/**
 * Cloud API error
 */
export class CloudAPIError extends StorageError {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly responseBody?: unknown
	) {
		super(message, "CLOUD_API_ERROR");
		this.name = "CloudAPIError";
	}
}

/**
 * Network timeout error
 */
export class NetworkTimeoutError extends StorageError {
	constructor(message: string, public readonly timeoutMs: number) {
		super(message, "NETWORK_TIMEOUT_ERROR");
		this.name = "NetworkTimeoutError";
	}
}
```

---

## 2. LocalStorage (SQLite) Implementation

### 2.1 Database Schema

```sql
-- snapback.db schema

-- Snapshots table with full metadata
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  metadata TEXT NOT NULL, -- JSON: { trigger, risk, content, files, etc. }
  parent_id TEXT,
  content_hash TEXT, -- SHA256 hash for deduplication
  compressed_size INTEGER,
  original_size INTEGER,
  FOREIGN KEY (parent_id) REFERENCES snapshots(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshot_parent ON snapshots(parent_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_hash ON snapshots(content_hash);
CREATE INDEX IF NOT EXISTS idx_snapshot_metadata ON snapshots(json_extract(metadata, '$.trigger'));

-- File changes with compression and deduplication
CREATE TABLE IF NOT EXISTS file_changes (
  snapshot_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  action TEXT CHECK(action IN ('add', 'modify', 'delete')) NOT NULL,
  content_hash TEXT, -- SHA256 hash for deduplication
  storage_type TEXT CHECK(storage_type IN ('diff', 'full', 'dedup')) DEFAULT 'diff',
  content BLOB, -- Compressed content or diff
  content_size INTEGER, -- Original size before compression
  compressed_size INTEGER, -- Size after compression
  PRIMARY KEY (snapshot_id, file_path),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

-- Indexes for file queries
CREATE INDEX IF NOT EXISTS idx_file_path ON file_changes(file_path);
CREATE INDEX IF NOT EXISTS idx_file_hash ON file_changes(content_hash);
CREATE INDEX IF NOT EXISTS idx_file_snapshot ON file_changes(snapshot_id);

-- Content deduplication table
CREATE TABLE IF NOT EXISTS content_blobs (
  content_hash TEXT PRIMARY KEY,
  content BLOB NOT NULL, -- Compressed content
  original_size INTEGER NOT NULL,
  compressed_size INTEGER NOT NULL,
  ref_count INTEGER NOT NULL DEFAULT 1, -- Reference count for garbage collection
  created_at INTEGER NOT NULL
);

-- Protected files registry
CREATE TABLE IF NOT EXISTS protected_files (
  path TEXT PRIMARY KEY,
  level TEXT CHECK(level IN ('watch', 'warn', 'block')) NOT NULL,
  reason TEXT,
  pattern TEXT, -- If added via pattern match
  added_at INTEGER NOT NULL
);

-- Indexes for protected files
CREATE INDEX IF NOT EXISTS idx_protected_level ON protected_files(level);
CREATE INDEX IF NOT EXISTS idx_protected_added ON protected_files(added_at);

-- Metadata for storage management
CREATE TABLE IF NOT EXISTS storage_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Insert initial metadata
INSERT OR IGNORE INTO storage_metadata (key, value, updated_at)
VALUES
  ('schema_version', '1', strftime('%s', 'now') * 1000),
  ('created_at', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('total_snapshots', '0', strftime('%s', 'now') * 1000),
  ('total_size', '0', strftime('%s', 'now') * 1000);
```

### 2.2 LocalStorage Implementation

```typescript
// packages/sdk/src/storage/LocalStorage.ts

import type {
	Snapshot,
	SnapshotFilters,
	ProtectedFile,
} from "@snapback/contracts";
import type {
	StorageAdapter,
	QueryOptions,
	Transaction,
	StorageStats,
	BatchResult,
} from "./StorageAdapter";
import Database from "better-sqlite3";
import { createHash } from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { createPatch, applyPatch } from "diff";
import {
	DatabaseConnectionError,
	DatabaseQueryError,
	DatabaseTransactionError,
	SnapshotNotFoundError,
	DataCorruptionError,
} from "./StorageErrors";

/**
 * SQLite-based local storage adapter
 * Optimized for VS Code extension, CLI, and other local environments
 */
export class LocalStorage implements StorageAdapter {
	private db: Database.Database | null = null;
	private ready = false;
	private preparedStatements: Map<string, Database.Statement> = new Map();

	constructor(private dbPath: string) {}

	// === Lifecycle Management ===

	async initialize(): Promise<void> {
		try {
			this.db = new Database(this.dbPath);

			// Enable performance optimizations
			this.db.pragma("journal_mode = WAL"); // Write-Ahead Logging
			this.db.pragma("synchronous = NORMAL"); // Balance safety/performance
			this.db.pragma("cache_size = -64000"); // 64MB cache
			this.db.pragma("temp_store = MEMORY"); // Use memory for temp tables
			this.db.pragma("mmap_size = 30000000000"); // 30GB memory-mapped I/O

			// Create schema
			this.createSchema();

			// Prepare commonly used statements
			this.prepareStatements();

			this.ready = true;
		} catch (error) {
			throw new DatabaseConnectionError(
				`Failed to initialize database: ${
					error instanceof Error ? error.message : String(error)
				}`,
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async close(): Promise<void> {
		if (!this.db) return;

		try {
			// Finalize all prepared statements
			for (const stmt of this.preparedStatements.values()) {
				stmt.finalize();
			}
			this.preparedStatements.clear();

			// Optimize database before closing
			this.db.pragma("optimize");

			// Close connection
			this.db.close();
			this.db = null;
			this.ready = false;
		} catch (error) {
			throw new DatabaseConnectionError(
				`Failed to close database: ${
					error instanceof Error ? error.message : String(error)
				}`,
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	isReady(): boolean {
		return this.ready && this.db !== null;
	}

	// === Snapshot CRUD Operations ===

	async save(snapshot: Snapshot): Promise<void> {
		this.ensureReady();

		const tx = this.db!.transaction(() => {
			try {
				// Calculate content hash for deduplication
				const contentHash = this.calculateSnapshotHash(snapshot);

				// Serialize metadata
				const metadata = JSON.stringify({
					trigger: snapshot.meta?.trigger,
					risk: snapshot.meta?.risk,
					content: snapshot.meta?.content,
					files: snapshot.files,
					...snapshot.meta,
				});

				// Calculate sizes
				const originalSize = this.calculateOriginalSize(snapshot);
				const compressedSize = this.calculateCompressedSize(snapshot);

				// Insert snapshot record
				this.preparedStatements.get("insertSnapshot")!.run(
					snapshot.id,
					snapshot.timestamp,
					metadata,
					null, // parent_id
					contentHash,
					compressedSize,
					originalSize
				);

				// Process file changes with deduplication
				if (snapshot.fileContents) {
					for (const [filePath, content] of Object.entries(
						snapshot.fileContents
					)) {
						this.saveFileChange(
							snapshot.id,
							filePath,
							content,
							"add"
						);
					}
				}

				// Update storage metadata
				this.updateStorageMetadata();
			} catch (error) {
				throw new DatabaseQueryError(
					`Failed to save snapshot: ${
						error instanceof Error ? error.message : String(error)
					}`,
					"INSERT INTO snapshots",
					[snapshot.id],
					{ cause: error instanceof Error ? error : undefined }
				);
			}
		});

		tx();
	}

	async get(id: string): Promise<Snapshot | null> {
		this.ensureReady();

		try {
			// Get snapshot record
			const record = this.preparedStatements
				.get("getSnapshot")!
				.get(id) as any;

			if (!record) {
				return null;
			}

			// Parse metadata
			const metadata = JSON.parse(record.metadata);

			// Get file contents
			const fileRecords = this.preparedStatements
				.get("getFileChanges")!
				.all(id) as any[];
			const fileContents: Record<string, string> = {};
			const files: string[] = [];

			for (const fileRecord of fileRecords) {
				files.push(fileRecord.file_path);

				if (fileRecord.action !== "delete") {
					const content = this.retrieveFileContent(fileRecord);
					fileContents[fileRecord.file_path] = content;
				}
			}

			return {
				id: record.id,
				timestamp: record.timestamp,
				meta: metadata,
				files,
				fileContents,
			};
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to get snapshot: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"SELECT FROM snapshots",
				[id],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async list(options?: QueryOptions): Promise<Snapshot[]> {
		this.ensureReady();

		try {
			// Build query dynamically based on options
			let query = "SELECT id, timestamp, metadata FROM snapshots";
			const params: any[] = [];

			// Apply filters
			if (options?.filters) {
				const whereClauses: string[] = [];

				if (options.filters.filePath) {
					whereClauses.push(
						"id IN (SELECT snapshot_id FROM file_changes WHERE file_path = ?)"
					);
					params.push(options.filters.filePath);
				}

				if (options.filters.before) {
					whereClauses.push("timestamp < ?");
					params.push(options.filters.before.getTime());
				}

				if (options.filters.after) {
					whereClauses.push("timestamp > ?");
					params.push(options.filters.after.getTime());
				}

				if (whereClauses.length > 0) {
					query += " WHERE " + whereClauses.join(" AND ");
				}
			}

			// Apply ordering
			const orderBy = options?.orderBy || "timestamp";
			const order = options?.order || "DESC";
			query += ` ORDER BY ${orderBy} ${order}`;

			// Apply pagination
			if (options?.limit) {
				query += " LIMIT ?";
				params.push(options.limit);

				if (options?.offset) {
					query += " OFFSET ?";
					params.push(options.offset);
				}
			}

			const records = this.db!.prepare(query).all(...params) as any[];

			// Convert to Snapshot objects (without file contents for performance)
			const snapshots: Snapshot[] = [];
			for (const record of records) {
				const metadata = JSON.parse(record.metadata);
				snapshots.push({
					id: record.id,
					timestamp: record.timestamp,
					meta: metadata,
					files: metadata.files || [],
					fileContents: {}, // Empty for list operations
				});
			}

			return snapshots;
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to list snapshots: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"SELECT FROM snapshots",
				[],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async update(id: string, updates: Partial<Snapshot>): Promise<void> {
		this.ensureReady();

		try {
			// Get existing snapshot
			const existing = await this.get(id);
			if (!existing) {
				throw new SnapshotNotFoundError(id);
			}

			// Merge metadata
			const newMetadata = JSON.stringify({
				...JSON.parse(
					(
						this.db!.prepare(
							"SELECT metadata FROM snapshots WHERE id = ?"
						).get(id) as any
					).metadata
				),
				...updates.meta,
			});

			// Update record
			this.preparedStatements.get("updateSnapshot")!.run(newMetadata, id);
		} catch (error) {
			if (error instanceof SnapshotNotFoundError) throw error;

			throw new DatabaseQueryError(
				`Failed to update snapshot: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"UPDATE snapshots",
				[id],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async delete(id: string): Promise<void> {
		this.ensureReady();

		const tx = this.db!.transaction(() => {
			try {
				// Get file changes to decrement ref counts
				const fileRecords = this.preparedStatements
					.get("getFileChanges")!
					.all(id) as any[];

				for (const record of fileRecords) {
					if (
						record.content_hash &&
						record.storage_type === "dedup"
					) {
						this.decrementBlobRefCount(record.content_hash);
					}
				}

				// Delete snapshot (cascades to file_changes)
				this.preparedStatements.get("deleteSnapshot")!.run(id);

				// Update storage metadata
				this.updateStorageMetadata();
			} catch (error) {
				throw new DatabaseQueryError(
					`Failed to delete snapshot: ${
						error instanceof Error ? error.message : String(error)
					}`,
					"DELETE FROM snapshots",
					[id],
					{ cause: error instanceof Error ? error : undefined }
				);
			}
		});

		tx();
	}

	// === Batch Operations ===

	async saveBatch(snapshots: Snapshot[]): Promise<BatchResult<Snapshot>> {
		this.ensureReady();

		const result: BatchResult<Snapshot> = {
			successful: [],
			failed: [],
			totalProcessed: snapshots.length,
		};

		const tx = this.db!.transaction(() => {
			for (const snapshot of snapshots) {
				try {
					this.saveSnapshotSync(snapshot);
					result.successful.push(snapshot);
				} catch (error) {
					result.failed.push({
						item: snapshot,
						error:
							error instanceof Error
								? error
								: new Error(String(error)),
					});
				}
			}
		});

		tx();

		return result;
	}

	async deleteBatch(ids: string[]): Promise<BatchResult<string>> {
		this.ensureReady();

		const result: BatchResult<string> = {
			successful: [],
			failed: [],
			totalProcessed: ids.length,
		};

		const tx = this.db!.transaction(() => {
			for (const id of ids) {
				try {
					this.deleteSnapshotSync(id);
					result.successful.push(id);
				} catch (error) {
					result.failed.push({
						item: id,
						error:
							error instanceof Error
								? error
								: new Error(String(error)),
					});
				}
			}
		});

		tx();

		return result;
	}

	// === Query Operations ===

	async count(filters?: SnapshotFilters): Promise<number> {
		this.ensureReady();

		try {
			let query = "SELECT COUNT(*) as count FROM snapshots";
			const params: any[] = [];

			if (filters) {
				const whereClauses: string[] = [];

				if (filters.filePath) {
					whereClauses.push(
						"id IN (SELECT snapshot_id FROM file_changes WHERE file_path = ?)"
					);
					params.push(filters.filePath);
				}

				if (filters.before) {
					whereClauses.push("timestamp < ?");
					params.push(filters.before.getTime());
				}

				if (filters.after) {
					whereClauses.push("timestamp > ?");
					params.push(filters.after.getTime());
				}

				if (whereClauses.length > 0) {
					query += " WHERE " + whereClauses.join(" AND ");
				}
			}

			const result = this.db!.prepare(query).get(...params) as any;
			return result.count;
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to count snapshots: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"SELECT COUNT FROM snapshots",
				[],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async findByFile(filePath: string): Promise<Snapshot[]> {
		return this.list({ filters: { filePath } });
	}

	async findByTimeRange(start: number, end: number): Promise<Snapshot[]> {
		return this.list({
			filters: {
				after: new Date(start),
				before: new Date(end),
			},
		});
	}

	// === Transaction Support ===

	async beginTransaction(): Promise<Transaction> {
		this.ensureReady();

		// SQLite transactions are handled differently
		// This is a placeholder for API compatibility
		throw new Error("Use withTransaction() for SQLite transactions");
	}

	async withTransaction<T>(
		callback: (tx: Transaction) => Promise<T>
	): Promise<T> {
		this.ensureReady();

		const tx = this.db!.transaction(async () => {
			const mockTx: Transaction = {
				commit: async () => {}, // Auto-committed by better-sqlite3
				rollback: async () => {
					throw new Error("Transaction rollback");
				},
				isActive: () => true,
			};

			return await callback(mockTx);
		});

		try {
			return tx();
		} catch (error) {
			throw new DatabaseTransactionError(
				`Transaction failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"withTransaction",
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	// === Protection Management ===

	async saveProtectedFile(file: ProtectedFile): Promise<void> {
		this.ensureReady();

		try {
			this.preparedStatements
				.get("insertProtectedFile")!
				.run(
					file.path,
					file.level,
					file.reason || null,
					file.pattern || null,
					file.addedAt.getTime()
				);
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to save protected file: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"INSERT INTO protected_files",
				[file.path],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async getProtectedFile(path: string): Promise<ProtectedFile | null> {
		this.ensureReady();

		try {
			const record = this.preparedStatements
				.get("getProtectedFile")!
				.get(path) as any;

			if (!record) {
				return null;
			}

			return {
				path: record.path,
				level: record.level,
				reason: record.reason,
				pattern: record.pattern,
				addedAt: new Date(record.added_at),
			};
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to get protected file: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"SELECT FROM protected_files",
				[path],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async listProtectedFiles(): Promise<ProtectedFile[]> {
		this.ensureReady();

		try {
			const records = this.preparedStatements
				.get("listProtectedFiles")!
				.all() as any[];

			return records.map((record) => ({
				path: record.path,
				level: record.level,
				reason: record.reason,
				pattern: record.pattern,
				addedAt: new Date(record.added_at),
			}));
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to list protected files: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"SELECT FROM protected_files",
				[],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async deleteProtectedFile(path: string): Promise<void> {
		this.ensureReady();

		try {
			this.preparedStatements.get("deleteProtectedFile")!.run(path);
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to delete protected file: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"DELETE FROM protected_files",
				[path],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	// === Storage Maintenance ===

	async optimize(): Promise<void> {
		this.ensureReady();

		try {
			// Vacuum to reclaim space
			this.db!.exec("VACUUM");

			// Analyze to update statistics
			this.db!.exec("ANALYZE");

			// Garbage collect unreferenced blobs
			this.db!.exec("DELETE FROM content_blobs WHERE ref_count = 0");
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to optimize storage: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"VACUUM/ANALYZE",
				[],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async getStats(): Promise<StorageStats> {
		this.ensureReady();

		try {
			const statsQuery = `
        SELECT
          COUNT(*) as total_snapshots,
          SUM(original_size) as total_size,
          SUM(compressed_size) as compressed_size,
          MIN(timestamp) as oldest,
          MAX(timestamp) as newest
        FROM snapshots
      `;

			const stats = this.db!.prepare(statsQuery).get() as any;

			return {
				totalSnapshots: stats.total_snapshots || 0,
				totalSize: stats.total_size || 0,
				compressedSize: stats.compressed_size || 0,
				compressionRatio:
					stats.total_size > 0
						? stats.compressed_size / stats.total_size
						: 0,
				oldestSnapshot: stats.oldest || 0,
				newestSnapshot: stats.newest || 0,
				storageType: "sqlite",
			};
		} catch (error) {
			throw new DatabaseQueryError(
				`Failed to get storage stats: ${
					error instanceof Error ? error.message : String(error)
				}`,
				"SELECT stats FROM snapshots",
				[],
				{ cause: error instanceof Error ? error : undefined }
			);
		}
	}

	async validateIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
		this.ensureReady();

		const errors: string[] = [];

		try {
			// Check database integrity
			const integrityCheck = this.db!.pragma("integrity_check") as any[];

			if (
				integrityCheck.length > 0 &&
				integrityCheck[0].integrity_check !== "ok"
			) {
				errors.push("Database integrity check failed");
			}

			// Check for orphaned file changes
			const orphanedFiles = this.db!.prepare(
				`
        SELECT COUNT(*) as count
        FROM file_changes
        WHERE snapshot_id NOT IN (SELECT id FROM snapshots)
      `
			).get() as any;

			if (orphanedFiles.count > 0) {
				errors.push(
					`Found ${orphanedFiles.count} orphaned file changes`
				);
			}

			// Check for missing content blobs
			const missingBlobs = this.db!.prepare(
				`
        SELECT COUNT(*) as count
        FROM file_changes
        WHERE storage_type = 'dedup'
          AND content_hash NOT IN (SELECT content_hash FROM content_blobs)
      `
			).get() as any;

			if (missingBlobs.count > 0) {
				errors.push(
					`Found ${missingBlobs.count} missing content blobs`
				);
			}
		} catch (error) {
			errors.push(
				`Integrity check failed: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	async exportData(): Promise<string> {
		this.ensureReady();

		try {
			const snapshots = await this.list();
			const protectedFiles = await this.listProtectedFiles();

			return JSON.stringify(
				{
					version: 1,
					exported: Date.now(),
					snapshots,
					protectedFiles,
				},
				null,
				2
			);
		} catch (error) {
			throw new Error(
				`Failed to export data: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	async importData(data: string): Promise<void> {
		this.ensureReady();

		try {
			const imported = JSON.parse(data);

			if (imported.version !== 1) {
				throw new Error("Unsupported export version");
			}

			const tx = this.db!.transaction(() => {
				// Import snapshots
				for (const snapshot of imported.snapshots) {
					this.saveSnapshotSync(snapshot);
				}

				// Import protected files
				for (const file of imported.protectedFiles) {
					this.saveProtectedFileSync(file);
				}
			});

			tx();
		} catch (error) {
			throw new Error(
				`Failed to import data: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	// === Private Helper Methods ===

	private ensureReady(): void {
		if (!this.ready || !this.db) {
			throw new DatabaseConnectionError("Database not initialized");
		}
	}

	private createSchema(): void {
		// SQL schema from section 2.1
		this.db!.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        metadata TEXT NOT NULL,
        parent_id TEXT,
        content_hash TEXT,
        compressed_size INTEGER,
        original_size INTEGER,
        FOREIGN KEY (parent_id) REFERENCES snapshots(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_snapshot_parent ON snapshots(parent_id);
      CREATE INDEX IF NOT EXISTS idx_snapshot_hash ON snapshots(content_hash);

      CREATE TABLE IF NOT EXISTS file_changes (
        snapshot_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        action TEXT CHECK(action IN ('add', 'modify', 'delete')) NOT NULL,
        content_hash TEXT,
        storage_type TEXT CHECK(storage_type IN ('diff', 'full', 'dedup')) DEFAULT 'diff',
        content BLOB,
        content_size INTEGER,
        compressed_size INTEGER,
        PRIMARY KEY (snapshot_id, file_path),
        FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_file_path ON file_changes(file_path);
      CREATE INDEX IF NOT EXISTS idx_file_hash ON file_changes(content_hash);
      CREATE INDEX IF NOT EXISTS idx_file_snapshot ON file_changes(snapshot_id);

      CREATE TABLE IF NOT EXISTS content_blobs (
        content_hash TEXT PRIMARY KEY,
        content BLOB NOT NULL,
        original_size INTEGER NOT NULL,
        compressed_size INTEGER NOT NULL,
        ref_count INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS protected_files (
        path TEXT PRIMARY KEY,
        level TEXT CHECK(level IN ('watch', 'warn', 'block')) NOT NULL,
        reason TEXT,
        pattern TEXT,
        added_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_protected_level ON protected_files(level);
      CREATE INDEX IF NOT EXISTS idx_protected_added ON protected_files(added_at);

      CREATE TABLE IF NOT EXISTS storage_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      INSERT OR IGNORE INTO storage_metadata (key, value, updated_at)
      VALUES
        ('schema_version', '1', strftime('%s', 'now') * 1000),
        ('created_at', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
    `);
	}

	private prepareStatements(): void {
		// Snapshot operations
		this.preparedStatements.set(
			"insertSnapshot",
			this.db!.prepare(`
        INSERT INTO snapshots (id, timestamp, metadata, parent_id, content_hash, compressed_size, original_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
		);

		this.preparedStatements.set(
			"getSnapshot",
			this.db!.prepare("SELECT * FROM snapshots WHERE id = ?")
		);

		this.preparedStatements.set(
			"updateSnapshot",
			this.db!.prepare("UPDATE snapshots SET metadata = ? WHERE id = ?")
		);

		this.preparedStatements.set(
			"deleteSnapshot",
			this.db!.prepare("DELETE FROM snapshots WHERE id = ?")
		);

		// File operations
		this.preparedStatements.set(
			"getFileChanges",
			this.db!.prepare("SELECT * FROM file_changes WHERE snapshot_id = ?")
		);

		this.preparedStatements.set(
			"insertFileChange",
			this.db!.prepare(`
        INSERT INTO file_changes (snapshot_id, file_path, action, content_hash, storage_type, content, content_size, compressed_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
		);

		// Protected files
		this.preparedStatements.set(
			"insertProtectedFile",
			this.db!.prepare(
				"INSERT OR REPLACE INTO protected_files (path, level, reason, pattern, added_at) VALUES (?, ?, ?, ?, ?)"
			)
		);

		this.preparedStatements.set(
			"getProtectedFile",
			this.db!.prepare("SELECT * FROM protected_files WHERE path = ?")
		);

		this.preparedStatements.set(
			"listProtectedFiles",
			this.db!.prepare(
				"SELECT * FROM protected_files ORDER BY added_at DESC"
			)
		);

		this.preparedStatements.set(
			"deleteProtectedFile",
			this.db!.prepare("DELETE FROM protected_files WHERE path = ?")
		);
	}

	private calculateSnapshotHash(snapshot: Snapshot): string {
		const contentString = JSON.stringify({
			files: snapshot.files,
			fileContents: snapshot.fileContents,
		});
		return createHash("sha256").update(contentString).digest("hex");
	}

	private calculateOriginalSize(snapshot: Snapshot): number {
		if (!snapshot.fileContents) return 0;

		return Object.values(snapshot.fileContents).reduce(
			(total, content) => total + Buffer.byteLength(content, "utf-8"),
			0
		);
	}

	private calculateCompressedSize(snapshot: Snapshot): number {
		if (!snapshot.fileContents) return 0;

		return Object.values(snapshot.fileContents).reduce(
			(total, content) => total + gzipSync(content).length,
			0
		);
	}

	private saveFileChange(
		snapshotId: string,
		filePath: string,
		content: string,
		action: "add" | "modify" | "delete"
	): void {
		const contentHash = createHash("sha256").update(content).digest("hex");

		// Check if content already exists (deduplication)
		const existingBlob = this.db!.prepare(
			"SELECT * FROM content_blobs WHERE content_hash = ?"
		).get(contentHash) as any;

		if (existingBlob) {
			// Reference existing blob
			this.db!.prepare(
				"UPDATE content_blobs SET ref_count = ref_count + 1 WHERE content_hash = ?"
			).run(contentHash);

			this.preparedStatements.get("insertFileChange")!.run(
				snapshotId,
				filePath,
				action,
				contentHash,
				"dedup",
				null, // No content stored
				Buffer.byteLength(content, "utf-8"),
				existingBlob.compressed_size
			);
		} else {
			// Compress and store new content
			const compressed = gzipSync(content);

			// Store in content_blobs
			this.db!.prepare(
				`
        INSERT INTO content_blobs (content_hash, content, original_size, compressed_size, ref_count, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `
			).run(
				contentHash,
				compressed,
				Buffer.byteLength(content, "utf-8"),
				compressed.length,
				Date.now()
			);

			// Reference in file_changes
			this.preparedStatements
				.get("insertFileChange")!
				.run(
					snapshotId,
					filePath,
					action,
					contentHash,
					"dedup",
					null,
					Buffer.byteLength(content, "utf-8"),
					compressed.length
				);
		}
	}

	private retrieveFileContent(fileRecord: any): string {
		if (fileRecord.storage_type === "dedup") {
			// Retrieve from content_blobs
			const blob = this.db!.prepare(
				"SELECT content FROM content_blobs WHERE content_hash = ?"
			).get(fileRecord.content_hash) as any;
			return gunzipSync(blob.content).toString("utf-8");
		} else {
			// Decompress inline content
			return gunzipSync(fileRecord.content).toString("utf-8");
		}
	}

	private decrementBlobRefCount(contentHash: string): void {
		this.db!.prepare(
			"UPDATE content_blobs SET ref_count = ref_count - 1 WHERE content_hash = ?"
		).run(contentHash);
	}

	private updateStorageMetadata(): void {
		const now = Date.now();

		const stats = this.db!.prepare(
			`
      SELECT COUNT(*) as count, SUM(original_size) as total_size
      FROM snapshots
    `
		).get() as any;

		this.db!.prepare(
			"UPDATE storage_metadata SET value = ?, updated_at = ? WHERE key = ?"
		).run(String(stats.count), now, "total_snapshots");

		this.db!.prepare(
			"UPDATE storage_metadata SET value = ?, updated_at = ? WHERE key = ?"
		).run(String(stats.total_size), now, "total_size");
	}

	// Synchronous versions for transaction use
	private saveSnapshotSync(snapshot: Snapshot): void {
		// Implementation similar to save() but synchronous
		const contentHash = this.calculateSnapshotHash(snapshot);
		const metadata = JSON.stringify({
			...snapshot.meta,
			files: snapshot.files,
		});
		const originalSize = this.calculateOriginalSize(snapshot);
		const compressedSize = this.calculateCompressedSize(snapshot);

		this.preparedStatements
			.get("insertSnapshot")!
			.run(
				snapshot.id,
				snapshot.timestamp,
				metadata,
				null,
				contentHash,
				compressedSize,
				originalSize
			);

		if (snapshot.fileContents) {
			for (const [filePath, content] of Object.entries(
				snapshot.fileContents
			)) {
				this.saveFileChange(snapshot.id, filePath, content, "add");
			}
		}
	}

	private deleteSnapshotSync(id: string): void {
		const fileRecords = this.preparedStatements
			.get("getFileChanges")!
			.all(id) as any[];

		for (const record of fileRecords) {
			if (record.content_hash && record.storage_type === "dedup") {
				this.decrementBlobRefCount(record.content_hash);
			}
		}

		this.preparedStatements.get("deleteSnapshot")!.run(id);
	}

	private saveProtectedFileSync(file: ProtectedFile): void {
		this.preparedStatements
			.get("insertProtectedFile")!
			.run(
				file.path,
				file.level,
				file.reason || null,
				file.pattern || null,
				file.addedAt.getTime()
			);
	}
}
```

---

## 3. CloudStorage (API) Implementation

### 3.1 API Client Structure

```typescript
// packages/sdk/src/storage/CloudStorage.ts

import type {
	Snapshot,
	SnapshotFilters,
	ProtectedFile,
} from "@snapback/contracts";
import type {
	StorageAdapter,
	QueryOptions,
	Transaction,
	StorageStats,
	BatchResult,
} from "./StorageAdapter";
import type { KyInstance } from "ky";
import type QuickLRU from "quick-lru";
import {
	CloudAPIError,
	NetworkTimeoutError,
	SnapshotNotFoundError,
} from "./StorageErrors";

/**
 * Cloud API-based storage adapter
 * Optimized for web dashboard and multi-user scenarios
 */
export class CloudStorage implements StorageAdapter {
	private cache: QuickLRU<string, Snapshot>;
	private ready = false;

	constructor(
		private http: KyInstance,
		cacheOptions?: { maxSize?: number; maxAge?: number }
	) {
		this.cache = new QuickLRU({
			maxSize: cacheOptions?.maxSize || 1000,
			maxAge: cacheOptions?.maxAge || 5 * 60 * 1000, // 5 minutes
		});
	}

	// === Lifecycle Management ===

	async initialize(): Promise<void> {
		try {
			// Health check to verify API connectivity
			const response = await this.http
				.get("health")
				.json<{ status: string }>();

			if (response.status !== "ok") {
				throw new Error("API health check failed");
			}

			this.ready = true;
		} catch (error) {
			throw new CloudAPIError(
				`Failed to initialize cloud storage: ${
					error instanceof Error ? error.message : String(error)
				}`,
				0
			);
		}
	}

	async close(): Promise<void> {
		this.cache.clear();
		this.ready = false;
	}

	isReady(): boolean {
		return this.ready;
	}

	// === Snapshot CRUD Operations ===

	async save(snapshot: Snapshot): Promise<void> {
		this.ensureReady();

		try {
			await this.http
				.post("snapshots", {
					json: snapshot,
					timeout: 30000,
				})
				.json();

			// Invalidate cache
			this.cache.delete(snapshot.id);
			this.cache.delete("list:all");
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to save snapshot: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async get(id: string): Promise<Snapshot | null> {
		this.ensureReady();

		// Check cache first
		const cached = this.cache.get(id);
		if (cached) {
			return cached;
		}

		try {
			const snapshot = await this.http
				.get(`snapshots/${id}`)
				.json<Snapshot>();

			// Cache result
			this.cache.set(id, snapshot);

			return snapshot;
		} catch (error: any) {
			if (error.response?.status === 404) {
				return null;
			}

			if (error.response) {
				throw new CloudAPIError(
					`Failed to get snapshot: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async list(options?: QueryOptions): Promise<Snapshot[]> {
		this.ensureReady();

		// Build cache key from options
		const cacheKey = `list:${JSON.stringify(options || {})}`;
		const cached = this.cache.get(cacheKey) as Snapshot[] | undefined;
		if (cached) {
			return cached;
		}

		try {
			// Build query params
			const searchParams = new URLSearchParams();

			if (options?.filters?.filePath) {
				searchParams.set("filePath", options.filters.filePath);
			}

			if (options?.filters?.before) {
				searchParams.set(
					"before",
					options.filters.before.toISOString()
				);
			}

			if (options?.filters?.after) {
				searchParams.set("after", options.filters.after.toISOString());
			}

			if (options?.filters?.protected !== undefined) {
				searchParams.set(
					"protected",
					String(options.filters.protected)
				);
			}

			if (options?.limit) {
				searchParams.set("limit", String(options.limit));
			}

			if (options?.offset) {
				searchParams.set("offset", String(options.offset));
			}

			if (options?.orderBy) {
				searchParams.set("orderBy", options.orderBy);
			}

			if (options?.order) {
				searchParams.set("order", options.order);
			}

			const snapshots = await this.http
				.get("snapshots", { searchParams })
				.json<Snapshot[]>();

			// Cache result
			this.cache.set(cacheKey, snapshots);

			return snapshots;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to list snapshots: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async update(id: string, updates: Partial<Snapshot>): Promise<void> {
		this.ensureReady();

		try {
			await this.http
				.patch(`snapshots/${id}`, {
					json: updates,
					timeout: 30000,
				})
				.json();

			// Invalidate cache
			this.cache.delete(id);
			this.cache.delete("list:all");
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new SnapshotNotFoundError(id);
			}

			if (error.response) {
				throw new CloudAPIError(
					`Failed to update snapshot: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async delete(id: string): Promise<void> {
		this.ensureReady();

		try {
			await this.http.delete(`snapshots/${id}`, {
				timeout: 30000,
			});

			// Invalidate cache
			this.cache.delete(id);
			this.cache.delete("list:all");
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new SnapshotNotFoundError(id);
			}

			if (error.response) {
				throw new CloudAPIError(
					`Failed to delete snapshot: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	// === Batch Operations ===

	async saveBatch(snapshots: Snapshot[]): Promise<BatchResult<Snapshot>> {
		this.ensureReady();

		try {
			const response = await this.http
				.post("snapshots/batch", {
					json: { snapshots },
					timeout: 60000,
				})
				.json<BatchResult<Snapshot>>();

			// Invalidate cache
			this.cache.clear();

			return response;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to save batch: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 60000);
		}
	}

	async deleteBatch(ids: string[]): Promise<BatchResult<string>> {
		this.ensureReady();

		try {
			const response = await this.http
				.delete("snapshots/batch", {
					json: { ids },
					timeout: 60000,
				})
				.json<BatchResult<string>>();

			// Invalidate cache
			this.cache.clear();

			return response;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to delete batch: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 60000);
		}
	}

	// === Query Operations ===

	async count(filters?: SnapshotFilters): Promise<number> {
		this.ensureReady();

		try {
			const searchParams = new URLSearchParams();

			if (filters?.filePath)
				searchParams.set("filePath", filters.filePath);
			if (filters?.before)
				searchParams.set("before", filters.before.toISOString());
			if (filters?.after)
				searchParams.set("after", filters.after.toISOString());
			if (filters?.protected !== undefined)
				searchParams.set("protected", String(filters.protected));

			const response = await this.http
				.get("snapshots/count", { searchParams })
				.json<{ count: number }>();

			return response.count;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to count snapshots: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async findByFile(filePath: string): Promise<Snapshot[]> {
		return this.list({ filters: { filePath } });
	}

	async findByTimeRange(start: number, end: number): Promise<Snapshot[]> {
		return this.list({
			filters: {
				after: new Date(start),
				before: new Date(end),
			},
		});
	}

	// === Transaction Support ===

	async beginTransaction(): Promise<Transaction> {
		// Transactions not supported in cloud API
		throw new Error("Transactions not supported in CloudStorage");
	}

	async withTransaction<T>(
		callback: (tx: Transaction) => Promise<T>
	): Promise<T> {
		// Execute without transaction
		const mockTx: Transaction = {
			commit: async () => {},
			rollback: async () => {},
			isActive: () => false,
		};

		return await callback(mockTx);
	}

	// === Protection Management ===

	async saveProtectedFile(file: ProtectedFile): Promise<void> {
		this.ensureReady();

		try {
			await this.http
				.post("protected-files", {
					json: file,
					timeout: 30000,
				})
				.json();
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to save protected file: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async getProtectedFile(path: string): Promise<ProtectedFile | null> {
		this.ensureReady();

		try {
			const file = await this.http
				.get(`protected-files/${encodeURIComponent(path)}`)
				.json<ProtectedFile>();
			return file;
		} catch (error: any) {
			if (error.response?.status === 404) {
				return null;
			}

			if (error.response) {
				throw new CloudAPIError(
					`Failed to get protected file: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async listProtectedFiles(): Promise<ProtectedFile[]> {
		this.ensureReady();

		try {
			const files = await this.http
				.get("protected-files")
				.json<ProtectedFile[]>();
			return files;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to list protected files: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async deleteProtectedFile(path: string): Promise<void> {
		this.ensureReady();

		try {
			await this.http.delete(
				`protected-files/${encodeURIComponent(path)}`,
				{
					timeout: 30000,
				}
			);
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to delete protected file: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	// === Storage Maintenance ===

	async optimize(): Promise<void> {
		// Cloud optimization handled server-side
		return;
	}

	async getStats(): Promise<StorageStats> {
		this.ensureReady();

		try {
			const stats = await this.http
				.get("storage/stats")
				.json<StorageStats>();
			return stats;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to get storage stats: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async validateIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
		this.ensureReady();

		try {
			const result = await this.http
				.get("storage/validate")
				.json<{ valid: boolean; errors: string[] }>();
			return result;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to validate integrity: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 30000);
		}
	}

	async exportData(): Promise<string> {
		this.ensureReady();

		try {
			const data = await this.http.get("storage/export").text();
			return data;
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to export data: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 60000);
		}
	}

	async importData(data: string): Promise<void> {
		this.ensureReady();

		try {
			await this.http.post("storage/import", {
				body: data,
				timeout: 120000,
			});

			// Clear cache after import
			this.cache.clear();
		} catch (error: any) {
			if (error.response) {
				throw new CloudAPIError(
					`Failed to import data: ${error.message}`,
					error.response.status,
					await error.response.json().catch(() => null)
				);
			}
			throw new NetworkTimeoutError("Request timeout", 120000);
		}
	}

	// === Private Helper Methods ===

	private ensureReady(): void {
		if (!this.ready) {
			throw new CloudAPIError("Cloud storage not initialized", 0);
		}
	}
}
```

---

## 4. MemoryStorage (Testing) Implementation

```typescript
// packages/sdk/src/storage/MemoryStorage.ts

import type {
	Snapshot,
	SnapshotFilters,
	ProtectedFile,
} from "@snapback/contracts";
import type {
	StorageAdapter,
	QueryOptions,
	Transaction,
	StorageStats,
	BatchResult,
} from "./StorageAdapter";
import { SnapshotNotFoundError } from "./StorageErrors";

/**
 * In-memory storage adapter for testing
 * Fast, synchronous, no persistence
 */
export class MemoryStorage implements StorageAdapter {
	private snapshots: Map<string, Snapshot> = new Map();
	private protectedFiles: Map<string, ProtectedFile> = new Map();
	private ready = false;

	// === Lifecycle Management ===

	async initialize(): Promise<void> {
		this.ready = true;
	}

	async close(): Promise<void> {
		this.clear();
		this.ready = false;
	}

	isReady(): boolean {
		return this.ready;
	}

	/**
	 * Clear all data (test utility)
	 */
	clear(): void {
		this.snapshots.clear();
		this.protectedFiles.clear();
	}

	/**
	 * Seed data for testing
	 */
	seed(snapshots: Snapshot[], protectedFiles?: ProtectedFile[]): void {
		for (const snapshot of snapshots) {
			this.snapshots.set(snapshot.id, snapshot);
		}

		if (protectedFiles) {
			for (const file of protectedFiles) {
				this.protectedFiles.set(file.path, file);
			}
		}
	}

	// === Snapshot CRUD Operations ===

	async save(snapshot: Snapshot): Promise<void> {
		this.snapshots.set(snapshot.id, snapshot);
	}

	async get(id: string): Promise<Snapshot | null> {
		return this.snapshots.get(id) || null;
	}

	async list(options?: QueryOptions): Promise<Snapshot[]> {
		let snapshots = Array.from(this.snapshots.values());

		// Apply filters
		if (options?.filters) {
			if (options.filters.filePath) {
				snapshots = snapshots.filter((s) =>
					s.files?.includes(options.filters!.filePath!)
				);
			}

			if (options.filters.before) {
				snapshots = snapshots.filter(
					(s) => s.timestamp < options.filters!.before!.getTime()
				);
			}

			if (options.filters.after) {
				snapshots = snapshots.filter(
					(s) => s.timestamp > options.filters!.after!.getTime()
				);
			}

			if (options.filters.protected !== undefined) {
				snapshots = snapshots.filter(
					(s) => s.meta?.protected === options.filters!.protected
				);
			}
		}

		// Apply sorting
		const orderBy = options?.orderBy || "timestamp";
		const order = options?.order || "DESC";

		snapshots.sort((a, b) => {
			const aVal = a[orderBy as keyof Snapshot] as number | string;
			const bVal = b[orderBy as keyof Snapshot] as number | string;

			if (order === "ASC") {
				return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
			} else {
				return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
			}
		});

		// Apply pagination
		if (options?.limit) {
			const offset = options.offset || 0;
			snapshots = snapshots.slice(offset, offset + options.limit);
		}

		return snapshots;
	}

	async update(id: string, updates: Partial<Snapshot>): Promise<void> {
		const existing = this.snapshots.get(id);

		if (!existing) {
			throw new SnapshotNotFoundError(id);
		}

		this.snapshots.set(id, {
			...existing,
			...updates,
			meta: {
				...existing.meta,
				...updates.meta,
			},
		});
	}

	async delete(id: string): Promise<void> {
		if (!this.snapshots.has(id)) {
			throw new SnapshotNotFoundError(id);
		}

		this.snapshots.delete(id);
	}

	// === Batch Operations ===

	async saveBatch(snapshots: Snapshot[]): Promise<BatchResult<Snapshot>> {
		const result: BatchResult<Snapshot> = {
			successful: [],
			failed: [],
			totalProcessed: snapshots.length,
		};

		for (const snapshot of snapshots) {
			try {
				await this.save(snapshot);
				result.successful.push(snapshot);
			} catch (error) {
				result.failed.push({
					item: snapshot,
					error:
						error instanceof Error
							? error
							: new Error(String(error)),
				});
			}
		}

		return result;
	}

	async deleteBatch(ids: string[]): Promise<BatchResult<string>> {
		const result: BatchResult<string> = {
			successful: [],
			failed: [],
			totalProcessed: ids.length,
		};

		for (const id of ids) {
			try {
				await this.delete(id);
				result.successful.push(id);
			} catch (error) {
				result.failed.push({
					item: id,
					error:
						error instanceof Error
							? error
							: new Error(String(error)),
				});
			}
		}

		return result;
	}

	// === Query Operations ===

	async count(filters?: SnapshotFilters): Promise<number> {
		const snapshots = await this.list({ filters });
		return snapshots.length;
	}

	async findByFile(filePath: string): Promise<Snapshot[]> {
		return this.list({ filters: { filePath } });
	}

	async findByTimeRange(start: number, end: number): Promise<Snapshot[]> {
		return this.list({
			filters: {
				after: new Date(start),
				before: new Date(end),
			},
		});
	}

	// === Transaction Support ===

	async beginTransaction(): Promise<Transaction> {
		// Mock transaction for testing
		return {
			commit: async () => {},
			rollback: async () => {},
			isActive: () => true,
		};
	}

	async withTransaction<T>(
		callback: (tx: Transaction) => Promise<T>
	): Promise<T> {
		const tx = await this.beginTransaction();
		return await callback(tx);
	}

	// === Protection Management ===

	async saveProtectedFile(file: ProtectedFile): Promise<void> {
		this.protectedFiles.set(file.path, file);
	}

	async getProtectedFile(path: string): Promise<ProtectedFile | null> {
		return this.protectedFiles.get(path) || null;
	}

	async listProtectedFiles(): Promise<ProtectedFile[]> {
		return Array.from(this.protectedFiles.values());
	}

	async deleteProtectedFile(path: string): Promise<void> {
		this.protectedFiles.delete(path);
	}

	// === Storage Maintenance ===

	async optimize(): Promise<void> {
		// No optimization needed for in-memory storage
	}

	async getStats(): Promise<StorageStats> {
		const snapshots = Array.from(this.snapshots.values());

		const totalSize = snapshots.reduce((total, s) => {
			if (!s.fileContents) return total;
			return (
				total +
				Object.values(s.fileContents).reduce(
					(sum, content) => sum + Buffer.byteLength(content, "utf-8"),
					0
				)
			);
		}, 0);

		const timestamps = snapshots.map((s) => s.timestamp);

		return {
			totalSnapshots: snapshots.length,
			totalSize,
			compressedSize: totalSize, // No compression in memory
			compressionRatio: 1,
			oldestSnapshot: timestamps.length > 0 ? Math.min(...timestamps) : 0,
			newestSnapshot: timestamps.length > 0 ? Math.max(...timestamps) : 0,
			storageType: "memory",
		};
	}

	async validateIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
		const errors: string[] = [];

		// Check for invalid data
		for (const [id, snapshot] of this.snapshots) {
			if (!snapshot.id || !snapshot.timestamp) {
				errors.push(`Invalid snapshot: ${id}`);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	async exportData(): Promise<string> {
		return JSON.stringify(
			{
				version: 1,
				exported: Date.now(),
				snapshots: Array.from(this.snapshots.values()),
				protectedFiles: Array.from(this.protectedFiles.values()),
			},
			null,
			2
		);
	}

	async importData(data: string): Promise<void> {
		const imported = JSON.parse(data);

		if (imported.version !== 1) {
			throw new Error("Unsupported export version");
		}

		this.clear();

		for (const snapshot of imported.snapshots) {
			this.snapshots.set(snapshot.id, snapshot);
		}

		for (const file of imported.protectedFiles) {
			this.protectedFiles.set(file.path, file);
		}
	}
}
```

---

## 5. Performance Optimization Strategies

### 5.1 Compression Strategy

```typescript
// packages/sdk/src/storage/compression.ts

import { gzipSync, gunzipSync, createGzip, createGunzip } from "zlib";
import { Readable, Writable, pipeline } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(pipeline);

/**
 * Compression utility with automatic strategy selection
 */
export class CompressionUtil {
	private static readonly STREAMING_THRESHOLD = 1024 * 1024; // 1MB
	private static readonly COMPRESSION_LEVEL = 9; // Maximum compression

	/**
	 * Compress content synchronously
	 * For small files (<1MB)
	 */
	static compressSync(content: string): Buffer {
		return gzipSync(Buffer.from(content, "utf-8"), {
			level: this.COMPRESSION_LEVEL,
		});
	}

	/**
	 * Decompress content synchronously
	 * For small files (<1MB)
	 */
	static decompressSync(compressed: Buffer): string {
		return gunzipSync(compressed).toString("utf-8");
	}

	/**
	 * Compress content with streaming
	 * For large files (>=1MB)
	 */
	static async compressStream(content: string): Promise<Buffer> {
		const chunks: Buffer[] = [];

		const readable = Readable.from([Buffer.from(content, "utf-8")]);
		const gzip = createGzip({ level: this.COMPRESSION_LEVEL });
		const writable = new Writable({
			write(chunk, encoding, callback) {
				chunks.push(chunk);
				callback();
			},
		});

		await pipelineAsync(readable, gzip, writable);

		return Buffer.concat(chunks);
	}

	/**
	 * Decompress content with streaming
	 * For large files (>=1MB)
	 */
	static async decompressStream(compressed: Buffer): Promise<string> {
		const chunks: Buffer[] = [];

		const readable = Readable.from([compressed]);
		const gunzip = createGunzip();
		const writable = new Writable({
			write(chunk, encoding, callback) {
				chunks.push(chunk);
				callback();
			},
		});

		await pipelineAsync(readable, gunzip, writable);

		return Buffer.concat(chunks).toString("utf-8");
	}

	/**
	 * Auto-select compression method based on content size
	 */
	static async compress(content: string): Promise<Buffer> {
		const size = Buffer.byteLength(content, "utf-8");

		if (size >= this.STREAMING_THRESHOLD) {
			return this.compressStream(content);
		}

		return this.compressSync(content);
	}

	/**
	 * Auto-select decompression method based on compressed size
	 */
	static async decompress(compressed: Buffer): Promise<string> {
		if (compressed.length >= this.STREAMING_THRESHOLD) {
			return this.decompressStream(compressed);
		}

		return this.decompressSync(compressed);
	}
}
```

### 5.2 Content Hashing and Deduplication

```typescript
// packages/sdk/src/storage/deduplication.ts

import { createHash } from "crypto";

/**
 * Content deduplication utility
 */
export class DeduplicationUtil {
	/**
	 * Calculate SHA256 hash of content
	 */
	static hashContent(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Calculate hash of file contents map
	 */
	static hashFileContents(fileContents: Record<string, string>): string {
		const sortedEntries = Object.entries(fileContents).sort(([a], [b]) =>
			a.localeCompare(b)
		);
		const combined = sortedEntries
			.map(([path, content]) => `${path}:${content}`)
			.join("|");

		return createHash("sha256").update(combined).digest("hex");
	}

	/**
	 * Find duplicate content in snapshot
	 * Returns map of content hash to file paths
	 */
	static findDuplicates(
		fileContents: Record<string, string>
	): Map<string, string[]> {
		const duplicates = new Map<string, string[]>();

		for (const [filePath, content] of Object.entries(fileContents)) {
			const hash = this.hashContent(content);

			if (!duplicates.has(hash)) {
				duplicates.set(hash, []);
			}

			duplicates.get(hash)!.push(filePath);
		}

		// Filter to only actual duplicates
		for (const [hash, paths] of duplicates) {
			if (paths.length < 2) {
				duplicates.delete(hash);
			}
		}

		return duplicates;
	}

	/**
	 * Calculate deduplication savings
	 */
	static calculateSavings(fileContents: Record<string, string>): {
		originalSize: number;
		dedupedSize: number;
		savedBytes: number;
		savedPercentage: number;
	} {
		const duplicates = this.findDuplicates(fileContents);

		let originalSize = 0;
		let savedBytes = 0;

		for (const [filePath, content] of Object.entries(fileContents)) {
			const size = Buffer.byteLength(content, "utf-8");
			originalSize += size;

			const hash = this.hashContent(content);
			const dupPaths = duplicates.get(hash);

			if (dupPaths && dupPaths.length > 1) {
				// Count savings (all but one copy)
				savedBytes += size * (dupPaths.length - 1);
			}
		}

		return {
			originalSize,
			dedupedSize: originalSize - savedBytes,
			savedBytes,
			savedPercentage:
				originalSize > 0 ? (savedBytes / originalSize) * 100 : 0,
		};
	}
}
```

### 5.3 Query Performance

**Efficient Query Patterns:**

```typescript
// Good: Use indexes
await storage.list({
	filters: { filePath: "src/main.ts" }, // Uses idx_file_path
	orderBy: "timestamp", // Uses idx_snapshot_timestamp
	limit: 50,
});

// Good: Count with filters
const count = await storage.count({
	after: new Date("2025-01-01"),
	before: new Date("2025-12-31"),
});

// Good: Batch operations
await storage.saveBatch(snapshots); // Single transaction

// Bad: Loading all file contents when listing
const all = await storage.list(); // Returns minimal data
for (const snapshot of all) {
	await storage.get(snapshot.id); // N+1 queries
}

// Good: Pagination
let offset = 0;
const pageSize = 100;
while (true) {
	const page = await storage.list({ limit: pageSize, offset });
	if (page.length === 0) break;

	// Process page
	offset += pageSize;
}
```

---

## 6. Migration Strategy

### 6.1 Migration from VS Code Storage

```typescript
// packages/sdk/src/storage/migration.ts

import type { StorageAdapter } from "./StorageAdapter";
import type { Snapshot } from "@snapback/contracts";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Migration utility for VS Code storage to SDK storage
 */
export class StorageMigration {
	constructor(
		private oldStorageDir: string,
		private newStorage: StorageAdapter
	) {}

	/**
	 * Migrate all checkpoints from old format
	 */
	async migrate(): Promise<{
		total: number;
		successful: number;
		failed: number;
		errors: Array<{ id: string; error: string }>;
	}> {
		const result = {
			total: 0,
			successful: 0,
			failed: 0,
			errors: [] as Array<{ id: string; error: string }>,
		};

		try {
			// Find all checkpoint JSON files
			const files = await fs.readdir(this.oldStorageDir);
			const jsonFiles = files.filter(
				(f) => f.endsWith(".json") && f.startsWith("cp_")
			);

			result.total = jsonFiles.length;

			for (const jsonFile of jsonFiles) {
				const jsonPath = path.join(this.oldStorageDir, jsonFile);

				try {
					// Read old checkpoint metadata
					const metadata = JSON.parse(
						await fs.readFile(jsonPath, "utf-8")
					);

					// Read checkpoint files
					const checkpointDir = path.join(
						this.oldStorageDir,
						"checkpoints",
						metadata.id
					);
					const fileContents: Record<string, string> = {};

					if (await this.directoryExists(checkpointDir)) {
						const files = await this.readDirRecursive(
							checkpointDir
						);

						for (const filePath of files) {
							try {
								const content = await fs.readFile(
									path.join(checkpointDir, filePath),
									"utf-8"
								);
								fileContents[filePath] = content;
							} catch (error) {
								// Skip unreadable files
								console.warn(
									`Failed to read file ${filePath}:`,
									error
								);
							}
						}
					}

					// Convert to new format
					const snapshot: Snapshot = {
						id: metadata.id,
						timestamp: metadata.timestamp || Date.now(),
						meta: {
							trigger: metadata.trigger || "migration",
							risk: metadata.risk,
							content: metadata.content,
							files: Object.keys(fileContents),
							...metadata,
						},
						files: Object.keys(fileContents),
						fileContents,
					};

					// Save to new storage
					await this.newStorage.save(snapshot);

					result.successful++;
				} catch (error) {
					result.failed++;
					result.errors.push({
						id: jsonFile,
						error:
							error instanceof Error
								? error.message
								: String(error),
					});
				}
			}

			// Clean up old format if migration was successful
			if (result.failed === 0) {
				await this.cleanup();
			}
		} catch (error) {
			throw new Error(
				`Migration failed: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}

		return result;
	}

	/**
	 * Clean up old storage format
	 */
	private async cleanup(): Promise<void> {
		try {
			const checkpointsDir = path.join(this.oldStorageDir, "checkpoints");

			if (await this.directoryExists(checkpointsDir)) {
				await fs.rm(checkpointsDir, { recursive: true, force: true });
			}

			// Remove JSON files
			const files = await fs.readdir(this.oldStorageDir);
			const jsonFiles = files.filter(
				(f) => f.endsWith(".json") && f.startsWith("cp_")
			);

			for (const jsonFile of jsonFiles) {
				await fs.unlink(path.join(this.oldStorageDir, jsonFile));
			}
		} catch (error) {
			// Ignore cleanup errors
			console.warn("Cleanup failed:", error);
		}
	}

	/**
	 * Check if directory exists
	 */
	private async directoryExists(dir: string): Promise<boolean> {
		try {
			const stats = await fs.stat(dir);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	/**
	 * Recursively read directory
	 */
	private async readDirRecursive(dir: string): Promise<string[]> {
		const files: string[] = [];

		const walk = async (
			currentDir: string,
			relativeTo: string
		): Promise<void> => {
			const items = await fs.readdir(currentDir);

			for (const item of items) {
				const fullPath = path.join(currentDir, item);
				const stats = await fs.stat(fullPath);

				if (stats.isDirectory()) {
					await walk(fullPath, relativeTo);
				} else {
					const relativePath = path.relative(relativeTo, fullPath);
					files.push(relativePath);
				}
			}
		};

		await walk(dir, dir);

		return files;
	}
}
```

### 6.2 Migration Usage Example

```typescript
// Migration script for VS Code extension

import { LocalStorage } from "@snapback/sdk/storage";
import { StorageMigration } from "@snapback/sdk/storage/migration";

async function migrateVSCodeStorage(workspaceRoot: string) {
	const oldStorageDir = path.join(workspaceRoot, ".snapback");
	const newDbPath = path.join(oldStorageDir, "snapback.db");

	// Initialize new storage
	const storage = new LocalStorage(newDbPath);
	await storage.initialize();

	// Run migration
	const migration = new StorageMigration(oldStorageDir, storage);
	const result = await migration.migrate();

	console.log(`Migration complete:
    Total: ${result.total}
    Successful: ${result.successful}
    Failed: ${result.failed}
  `);

	if (result.errors.length > 0) {
		console.error("Errors:", result.errors);
	}

	await storage.close();
}
```

---

## 7. Performance Benchmarks

### 7.1 Benchmark Scenarios

```typescript
// packages/sdk/src/storage/benchmarks.ts

import type { StorageAdapter } from "./StorageAdapter";
import type { Snapshot } from "@snapback/contracts";

export interface BenchmarkResult {
	operation: string;
	iterations: number;
	totalTime: number;
	avgTime: number;
	opsPerSecond: number;
}

export class StorageBenchmark {
	constructor(private storage: StorageAdapter) {}

	/**
	 * Benchmark save operations
	 */
	async benchmarkSave(iterations: number): Promise<BenchmarkResult> {
		const start = Date.now();

		for (let i = 0; i < iterations; i++) {
			const snapshot: Snapshot = {
				id: `bench_${i}`,
				timestamp: Date.now(),
				meta: { trigger: "benchmark" },
				files: ["test.ts"],
				fileContents: {
					"test.ts": 'console.log("test");'.repeat(100),
				},
			};

			await this.storage.save(snapshot);
		}

		const totalTime = Date.now() - start;

		return {
			operation: "save",
			iterations,
			totalTime,
			avgTime: totalTime / iterations,
			opsPerSecond: (iterations / totalTime) * 1000,
		};
	}

	/**
	 * Benchmark batch save operations
	 */
	async benchmarkBatchSave(
		batchSize: number,
		batches: number
	): Promise<BenchmarkResult> {
		const start = Date.now();

		for (let b = 0; b < batches; b++) {
			const snapshots: Snapshot[] = [];

			for (let i = 0; i < batchSize; i++) {
				snapshots.push({
					id: `batch_${b}_${i}`,
					timestamp: Date.now(),
					meta: { trigger: "benchmark" },
					files: ["test.ts"],
					fileContents: {
						"test.ts": 'console.log("test");'.repeat(100),
					},
				});
			}

			await this.storage.saveBatch(snapshots);
		}

		const totalTime = Date.now() - start;
		const totalOps = batchSize * batches;

		return {
			operation: "batchSave",
			iterations: totalOps,
			totalTime,
			avgTime: totalTime / totalOps,
			opsPerSecond: (totalOps / totalTime) * 1000,
		};
	}

	/**
	 * Benchmark get operations
	 */
	async benchmarkGet(iterations: number): Promise<BenchmarkResult> {
		// First create test data
		const ids: string[] = [];
		for (let i = 0; i < iterations; i++) {
			const id = `get_bench_${i}`;
			ids.push(id);

			await this.storage.save({
				id,
				timestamp: Date.now(),
				meta: { trigger: "benchmark" },
				files: ["test.ts"],
				fileContents: {
					"test.ts": 'console.log("test");'.repeat(100),
				},
			});
		}

		// Benchmark retrieval
		const start = Date.now();

		for (const id of ids) {
			await this.storage.get(id);
		}

		const totalTime = Date.now() - start;

		return {
			operation: "get",
			iterations,
			totalTime,
			avgTime: totalTime / iterations,
			opsPerSecond: (iterations / totalTime) * 1000,
		};
	}

	/**
	 * Benchmark list operations
	 */
	async benchmarkList(
		dataSize: number,
		queryIterations: number
	): Promise<BenchmarkResult> {
		// Create test data
		for (let i = 0; i < dataSize; i++) {
			await this.storage.save({
				id: `list_bench_${i}`,
				timestamp: Date.now() + i,
				meta: { trigger: "benchmark" },
				files: ["test.ts"],
				fileContents: {
					"test.ts": 'console.log("test");'.repeat(100),
				},
			});
		}

		// Benchmark queries
		const start = Date.now();

		for (let i = 0; i < queryIterations; i++) {
			await this.storage.list({ limit: 50 });
		}

		const totalTime = Date.now() - start;

		return {
			operation: "list",
			iterations: queryIterations,
			totalTime,
			avgTime: totalTime / queryIterations,
			opsPerSecond: (queryIterations / totalTime) * 1000,
		};
	}

	/**
	 * Run all benchmarks
	 */
	async runAll(): Promise<BenchmarkResult[]> {
		const results: BenchmarkResult[] = [];

		results.push(await this.benchmarkSave(100));
		results.push(await this.benchmarkBatchSave(50, 10));
		results.push(await this.benchmarkGet(100));
		results.push(await this.benchmarkList(500, 100));

		return results;
	}
}
```

### 7.2 Expected Performance Targets

**LocalStorage (SQLite)**:

-   Save: 500-1000 ops/sec (small files)
-   Batch Save (50x): 2000-5000 ops/sec
-   Get: 1000-2000 ops/sec
-   List (paginated): 500-1000 queries/sec
-   Compression Ratio: 60-80% (text files)

**CloudStorage (API)**:

-   Save: 50-100 ops/sec (network bound)
-   Batch Save (50x): 200-500 ops/sec
-   Get (cached): 1000+ ops/sec
-   Get (uncached): 50-100 ops/sec
-   List: 50-100 queries/sec

**MemoryStorage (Testing)**:

-   Save: 10000+ ops/sec
-   Batch Save: 50000+ ops/sec
-   Get: 10000+ ops/sec
-   List: 5000+ queries/sec

---

## 8. Storage Selection Guide

```typescript
// packages/sdk/src/storage/factory.ts

import type { StorageAdapter } from "./StorageAdapter";
import { LocalStorage } from "./LocalStorage";
import { CloudStorage } from "./CloudStorage";
import { MemoryStorage } from "./MemoryStorage";
import ky from "ky";

export type StorageType = "local" | "cloud" | "memory";

export interface StorageConfig {
	type: StorageType;

	// LocalStorage options
	dbPath?: string;

	// CloudStorage options
	apiUrl?: string;
	apiKey?: string;
	timeout?: number;
	retries?: number;
	cacheEnabled?: boolean;

	// MemoryStorage options
	seedData?: {
		snapshots?: any[];
		protectedFiles?: any[];
	};
}

/**
 * Factory for creating storage adapters
 */
export class StorageFactory {
	static create(config: StorageConfig): StorageAdapter {
		switch (config.type) {
			case "local":
				if (!config.dbPath) {
					throw new Error("dbPath required for LocalStorage");
				}
				return new LocalStorage(config.dbPath);

			case "cloud":
				if (!config.apiUrl) {
					throw new Error("apiUrl required for CloudStorage");
				}

				const httpClient = ky.create({
					prefixUrl: config.apiUrl,
					timeout: config.timeout || 30000,
					headers: config.apiKey
						? {
								Authorization: `Bearer ${config.apiKey}`,
						  }
						: {},
					retry: {
						limit: config.retries || 3,
						methods: ["get", "post", "put", "delete", "patch"],
						statusCodes: [408, 413, 429, 500, 502, 503, 504],
					},
				});

				return new CloudStorage(httpClient, {
					maxSize: config.cacheEnabled === false ? 0 : 1000,
				});

			case "memory":
				const storage = new MemoryStorage();

				if (config.seedData) {
					storage.seed(
						config.seedData.snapshots || [],
						config.seedData.protectedFiles || []
					);
				}

				return storage;

			default:
				throw new Error(`Unknown storage type: ${config.type}`);
		}
	}

	/**
	 * Create storage adapter based on environment
	 */
	static createForEnvironment(
		env: "vscode" | "cli" | "web" | "test"
	): StorageAdapter {
		switch (env) {
			case "vscode":
			case "cli":
				// Use local SQLite storage
				return this.create({
					type: "local",
					dbPath: process.env.SNAPBACK_DB_PATH || "./snapback.db",
				});

			case "web":
				// Use cloud API storage
				return this.create({
					type: "cloud",
					apiUrl:
						process.env.SNAPBACK_API_URL ||
						"https://api.snapback.dev",
					apiKey: process.env.SNAPBACK_API_KEY,
					cacheEnabled: true,
				});

			case "test":
				// Use in-memory storage
				return this.create({
					type: "memory",
				});

			default:
				throw new Error(`Unknown environment: ${env}`);
		}
	}
}
```

---

## 9. Summary

This storage layer architecture provides:

1. **Unified Interface**: Single `StorageAdapter` interface for all backends
2. **Multiple Backends**: SQLite (local), Cloud API, In-Memory (testing)
3. **Performance**: Compression, deduplication, efficient indexing, batch operations
4. **Reliability**: ACID transactions, error handling, data validation
5. **Migration**: Seamless upgrade from VS Code storage
6. **Testing**: Complete MemoryStorage for fast unit tests

**Key Files**:

-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/StorageAdapter.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/LocalStorage.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/CloudStorage.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/MemoryStorage.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/StorageErrors.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/factory.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/migration.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/compression.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/deduplication.ts`
-   `/Users/user1/WebstormProjects/SnapBack-Site/packages/sdk/src/storage/benchmarks.ts`

**SQLite Schema**: Complete with indexes, foreign keys, check constraints
**Query Patterns**: Optimized for common operations (list, filter, count)
**Performance Targets**: Defined for each storage backend
**Migration Path**: Automated migration from VS Code storage
