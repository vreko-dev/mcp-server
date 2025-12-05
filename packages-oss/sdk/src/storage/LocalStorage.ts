import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import { logger } from "@snapback-oss/infrastructure";
import type Database from "better-sqlite3";
import { sanitizeForJSON } from "../utils/security.js";
import type { StorageAdapter } from "./StorageAdapter.js";
import {
	CorruptedDataError,
	StorageConnectionError,
	StorageError,
	StorageFullError,
	StorageLockError,
} from "./StorageErrors.js";

// Lazy-loaded better-sqlite3 instance
let DatabaseConstructor: typeof Database | null = null;
let loadError: Error | null = null;

async function loadBetterSqlite3(): Promise<typeof Database> {
	if (DatabaseConstructor) {
		return DatabaseConstructor;
	}

	if (loadError) {
		throw loadError;
	}

	try {
		const module = await import("better-sqlite3");
		DatabaseConstructor = module.default;
		return DatabaseConstructor;
	} catch (error) {
		loadError = error instanceof Error ? error : new Error(String(error));
		throw new StorageConnectionError("Failed to load better-sqlite3", {
			cause: loadError,
		});
	}
}

export class LocalStorage implements StorageAdapter {
	private db: Database.Database | null = null;
	private dbPath: string;

	constructor(dbPath: string) {
		this.dbPath = dbPath;
	}

	private async ensureInitialized(): Promise<void> {
		if (this.db) {
			return;
		}

		const DB = await loadBetterSqlite3();
		this.db = new DB(this.dbPath);
		this.initSchema();
	}

	private initSchema(): void {
		if (!this.db) {
			throw new StorageError("Database not initialized", "DB_NOT_INITIALIZED");
		}
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        name TEXT,
        protected INTEGER DEFAULT 0,
        files TEXT,
        file_contents TEXT,
        metadata TEXT,
        content_hash TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON snapshots(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_protected ON snapshots(protected);
      CREATE INDEX IF NOT EXISTS idx_created_at ON snapshots(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_name ON snapshots(name);
      CREATE INDEX IF NOT EXISTS idx_content_hash ON snapshots(content_hash);
    `);
	}

	async save(snapshot: Snapshot, contentHash?: string): Promise<void> {
		await this.ensureInitialized();
		try {
			// Sanitize inputs to prevent injection attacks
			const sanitizedFiles = sanitizeForJSON(snapshot.files || []);
			const sanitizedFileContents = sanitizeForJSON(snapshot.fileContents || {});
			const sanitizedMeta = sanitizeForJSON(snapshot.meta || {});

			const stmt = this.db?.prepare(`
        INSERT OR REPLACE INTO snapshots (
          id, timestamp, name, protected, files, file_contents, metadata, content_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
			if (!stmt) {
				throw new StorageError("Failed to prepare save statement", "DB_PREPARE_ERROR");
			}

			stmt.run(
				snapshot.id,
				snapshot.timestamp,
				snapshot.meta?.name || null,
				snapshot.meta?.protected ? 1 : 0,
				JSON.stringify(sanitizedFiles),
				JSON.stringify(sanitizedFileContents),
				JSON.stringify(sanitizedMeta),
				contentHash || null,
			);
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			if (error.code === "SQLITE_FULL") {
				throw new StorageFullError("Disk full", {
					retryable: false,
					cause: error,
				});
			}

			if (error.code === "SQLITE_CANTOPEN") {
				throw new StorageConnectionError("Cannot open database", {
					cause: error,
				});
			}

			throw new StorageError("Save failed", error.code, { cause: error });
		}
	}

	async get(id: string): Promise<Snapshot | null> {
		await this.ensureInitialized();
		try {
			const stmt = this.db?.prepare("SELECT * FROM snapshots WHERE id = ?");
			if (!stmt) {
				throw new StorageError("Failed to prepare get statement", "DB_PREPARE_ERROR");
			}
			const row = stmt.get(id) as any;

			if (!row) {
				return null;
			}

			return this.deserializeSnapshot(row);
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			if (error.code === "SQLITE_CANTOPEN") {
				throw new StorageConnectionError("Cannot open database", {
					cause: error,
				});
			}

			throw new StorageError("Get failed", error.code, { cause: error });
		}
	}

	async getByContentHash(hash: string): Promise<Snapshot | null> {
		await this.ensureInitialized();
		try {
			const stmt = this.db?.prepare("SELECT * FROM snapshots WHERE content_hash = ? LIMIT 1");
			if (!stmt) {
				throw new StorageError("Failed to prepare getByContentHash statement", "DB_PREPARE_ERROR");
			}
			const row = stmt.get(hash) as any;

			if (!row) {
				return null;
			}

			return this.deserializeSnapshot(row);
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			if (error.code === "SQLITE_CANTOPEN") {
				throw new StorageConnectionError("Cannot open database", {
					cause: error,
				});
			}

			throw new StorageError("GetByContentHash failed", error.code, {
				cause: error,
			});
		}
	}

	/**
	 * Get the stored content hash for a snapshot (for preserving hash on updates)
	 */
	async getStoredContentHash(id: string): Promise<string | null> {
		await this.ensureInitialized();
		try {
			const stmt = this.db?.prepare("SELECT content_hash FROM snapshots WHERE id = ?");
			if (!stmt) {
				throw new StorageError("Failed to prepare getStoredContentHash statement", "DB_PREPARE_ERROR");
			}
			const row = stmt.get(id) as any;

			return row?.content_hash || null;
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			if (error.code === "SQLITE_CANTOPEN") {
				throw new StorageConnectionError("Cannot open database", {
					cause: error,
				});
			}

			throw new StorageError("GetStoredContentHash failed", error.code, {
				cause: error,
			});
		}
	}

	async list(filters?: SnapshotFilters): Promise<Snapshot[]> {
		await this.ensureInitialized();
		try {
			let query = "SELECT * FROM snapshots WHERE 1=1";
			const params: any[] = [];

			if (filters?.protected !== undefined) {
				query += " AND protected = ?";
				params.push(filters.protected ? 1 : 0);
			}

			if (filters?.after) {
				query += " AND timestamp >= ?";
				params.push(filters.after.getTime());
			}

			if (filters?.before) {
				query += " AND timestamp < ?";
				params.push(filters.before.getTime());
			}

			query += " ORDER BY timestamp DESC";

			// Validate that offset is only used with limit for efficient querying
			if (filters?.offset && !filters?.limit) {
				// Log a warning about inefficient query pattern
				logger.warn(
					"Using OFFSET without LIMIT can lead to inefficient queries. Consider setting a limit for better performance.",
				);
			}

			if (filters?.limit) {
				query += " LIMIT ?";
				params.push(filters.limit);
			}

			if (filters?.offset) {
				query += " OFFSET ?";
				params.push(filters.offset);
			}

			const stmt = this.db?.prepare(query);
			if (!stmt) {
				throw new StorageError("Failed to prepare list statement", "DB_PREPARE_ERROR");
			}
			const rows = stmt.all(...params) as any[];

			let snapshots = rows.map((row) => this.deserializeSnapshot(row));

			// Filter by filePath in memory (since files is stored as JSON array)
			if (filters?.filePath) {
				snapshots = snapshots.filter((snapshot) => snapshot.files?.includes(filters.filePath ?? ""));
			}

			return snapshots;
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			if (error.code === "SQLITE_CANTOPEN") {
				throw new StorageConnectionError("Cannot open database", {
					cause: error,
				});
			}

			throw new StorageError("List failed", error.code, { cause: error });
		}
	}

	async delete(id: string): Promise<void> {
		await this.ensureInitialized();
		try {
			const stmt = this.db?.prepare("DELETE FROM snapshots WHERE id = ?");
			if (!stmt) {
				throw new StorageError("Failed to prepare delete statement", "DB_PREPARE_ERROR");
			}
			stmt.run(id);
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			if (error.code === "SQLITE_CANTOPEN") {
				throw new StorageConnectionError("Cannot open database", {
					cause: error,
				});
			}

			throw new StorageError("Delete failed", error.code, {
				cause: error,
			});
		}
	}

	async close(): Promise<void> {
		if (!this.db) {
			return;
		}
		try {
			this.db.close();
			this.db = null;
		} catch (error: any) {
			if (error.code === "SQLITE_BUSY") {
				throw new StorageLockError("Database locked", {
					retryable: true,
					cause: error,
				});
			}

			throw new StorageError("Close failed", error.code, {
				cause: error,
			});
		}
	}

	private deserializeSnapshot(row: any): Snapshot {
		try {
			return {
				id: row.id,
				timestamp: row.timestamp,
				meta: JSON.parse(row.metadata || "{}"),
				files: JSON.parse(row.files || "[]"),
				fileContents: JSON.parse(row.file_contents || "{}"),
			};
		} catch (error: any) {
			throw new CorruptedDataError(`Failed to deserialize snapshot ${row.id}`, {
				cause: error,
				snapshotId: row.id,
			});
		}
	}
}
