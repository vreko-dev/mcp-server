/**
 * SnapBack Storage Layer
 *
 * MIGRATION NOTES:
 * - Simplifies packages/sdk/src/storage/StorageBroker.ts (903 LOC)
 * - Removes: connection pooling, distributed locking, queue operations
 * - Keeps: snapshot CRUD, compression, content-addressable blobs
 *
 * REFERENCE FILES:
 * - packages/sdk/src/storage/StorageBroker.ts (main source)
 * - packages/sdk/src/storage/BlobStore.ts (blob operations)
 * - packages/sdk/src/storage/LocalStorage.ts (file adapter)
 * - apps/vscode/src/storage/StorageManager.ts (current extension implementation)
 *
 * DESIGN:
 * - Single-writer discipline (no locking needed)
 * - File-based storage with JSON manifests
 * - Content-addressable blobs for deduplication
 *
 * TARGET: ~100 LOC
 * CURRENT: Scaffolding with TODO markers
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { eventBus } from "./events.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Snapshot manifest stored as JSON
 *
 * REFERENCE: packages/sdk/src/storage/types.ts
 */
export interface SnapshotManifest {
	/** Unique snapshot ID */
	id: string;
	/** Creation timestamp */
	createdAt: number;
	/** Files included in this snapshot */
	files: Array<{
		/** Original file path (relative to workspace) */
		path: string;
		/** SHA-256 hash of content (blob ID) */
		blobId: string;
		/** Original file size in bytes */
		size: number;
	}>;
	/** Total size of all files */
	totalSize: number;
	/** Optional description */
	description?: string;
	/** Trigger that caused this snapshot */
	trigger?: "manual" | "auto" | "ai-detection";
}

/**
 * Storage configuration
 */
export interface StorageConfig {
	/** Root directory for storage */
	rootDir: string;
	/** Enable compression for blobs */
	compress: boolean;
}

// =============================================================================
// STORAGE IMPLEMENTATION
// =============================================================================

/**
 * Simplified storage layer for snapshots and blobs.
 *
 * Directory structure:
 * ```
 * .snapback/
 * ├── snapshots/
 * │   ├── snap_1234.json   # Manifest
 * │   └── snap_5678.json
 * └── blobs/
 *     ├── ab/
 *     │   └── cdef1234...  # Content-addressable blob
 *     └── cd/
 *         └── ef5678...
 * ```
 *
 * Usage:
 * ```typescript
 * const storage = new Storage({ rootDir: ".snapback", compress: true });
 *
 * const snapshot = await storage.createSnapshot([
 *   { path: "src/auth.ts", content: "..." },
 *   { path: "src/user.ts", content: "..." },
 * ]);
 *
 * await storage.restore(snapshot.id);
 * ```
 */
export class Storage {
	private config: StorageConfig;
	private snapshotsDir: string;
	private blobsDir: string;

	constructor(config: StorageConfig) {
		this.config = config;
		this.snapshotsDir = join(config.rootDir, "snapshots");
		this.blobsDir = join(config.rootDir, "blobs");

		// Ensure directories exist
		this.ensureDir(this.snapshotsDir);
		this.ensureDir(this.blobsDir);
	}

	/**
	 * Create a snapshot of the given files
	 *
	 * REFERENCE: packages/sdk/src/storage/StorageBroker.ts createSnapshot()
	 *
	 * @param files - Files to snapshot
	 * @param options - Snapshot options
	 * @returns Created snapshot manifest
	 */
	async createSnapshot(
		files: Array<{ path: string; content: string }>,
		options: {
			description?: string;
			trigger?: "manual" | "auto" | "ai-detection";
		} = {},
	): Promise<SnapshotManifest> {
		const id = this.generateSnapshotId();
		const manifestFiles: SnapshotManifest["files"] = [];
		let totalSize = 0;

		// Store each file as a blob
		for (const file of files) {
			const blobId = await this.storeBlob(file.content);
			const size = Buffer.byteLength(file.content, "utf8");

			manifestFiles.push({
				path: file.path,
				blobId,
				size,
			});

			totalSize += size;
		}

		// Create manifest
		const manifest: SnapshotManifest = {
			id,
			createdAt: Date.now(),
			files: manifestFiles,
			totalSize,
			description: options.description,
			trigger: options.trigger,
		};

		// Write manifest
		const manifestPath = join(this.snapshotsDir, `${id}.json`);
		writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

		// Emit event (map ai-detection to risk for event type)
		const triggerType = options.trigger === "ai-detection" ? "risk" : options.trigger || "auto";
		eventBus.emit("snapshot.created", {
			snapshotId: id,
			fileCount: files.length,
			totalBytes: totalSize,
			trigger: triggerType,
			riskScore: 0, // TODO: Pass from caller
		});

		return manifest;
	}

	/**
	 * Restore files from a snapshot
	 *
	 * REFERENCE: packages/sdk/src/storage/StorageBroker.ts restore()
	 *
	 * @param snapshotId - Snapshot ID to restore
	 * @returns Restored file contents
	 */
	async restore(snapshotId: string): Promise<Array<{ path: string; content: string }>> {
		const manifest = this.getSnapshot(snapshotId);
		if (!manifest) {
			throw new Error(`Snapshot not found: ${snapshotId}`);
		}

		const files: Array<{ path: string; content: string }> = [];

		for (const file of manifest.files) {
			const content = await this.getBlob(file.blobId);
			if (content !== null) {
				files.push({ path: file.path, content });
			}
		}

		// Emit event
		eventBus.emit("snapshot.restored", {
			snapshotId,
			filesRestored: files.length,
			duration: 0, // TODO: Track duration
		});

		return files;
	}

	/**
	 * Get a snapshot manifest by ID
	 */
	getSnapshot(snapshotId: string): SnapshotManifest | null {
		const manifestPath = join(this.snapshotsDir, `${snapshotId}.json`);

		if (!existsSync(manifestPath)) {
			return null;
		}

		const content = readFileSync(manifestPath, "utf8");
		return JSON.parse(content) as SnapshotManifest;
	}

	/**
	 * List all snapshots
	 */
	listSnapshots(): SnapshotManifest[] {
		if (!existsSync(this.snapshotsDir)) {
			return [];
		}

		const files = readdirSync(this.snapshotsDir).filter((f) => f.endsWith(".json"));

		return files
			.map((f) => {
				try {
					const content = readFileSync(join(this.snapshotsDir, f), "utf8");
					return JSON.parse(content) as SnapshotManifest;
				} catch {
					return null;
				}
			})
			.filter((m): m is SnapshotManifest => m !== null)
			.sort((a, b) => b.createdAt - a.createdAt);
	}

	/**
	 * Delete a snapshot (manifest only, blobs are orphaned)
	 *
	 * TODO: Implement blob garbage collection
	 */
	deleteSnapshot(snapshotId: string): boolean {
		const manifestPath = join(this.snapshotsDir, `${snapshotId}.json`);

		if (!existsSync(manifestPath)) {
			return false;
		}

		unlinkSync(manifestPath);
		return true;
	}

	// ===========================================================================
	// PRIVATE HELPERS
	// ===========================================================================

	/**
	 * Store content as a blob, returns blob ID (SHA-256)
	 *
	 * REFERENCE: packages/sdk/src/storage/BlobStore.ts
	 */
	private async storeBlob(content: string): Promise<string> {
		// Calculate content hash
		const hash = createHash("sha256").update(content).digest("hex");

		// Determine blob path (sharded by first 2 chars)
		const blobDir = join(this.blobsDir, hash.slice(0, 2));
		const blobPath = join(blobDir, hash);

		// Skip if already exists (content-addressable dedup)
		if (existsSync(blobPath)) {
			return hash;
		}

		// Ensure directory exists
		this.ensureDir(blobDir);

		// Optionally compress
		const data = this.config.compress ? gzipSync(Buffer.from(content, "utf8")) : Buffer.from(content, "utf8");

		// Write blob
		writeFileSync(blobPath, data);

		return hash;
	}

	/**
	 * Retrieve blob content by ID
	 */
	private async getBlob(blobId: string): Promise<string | null> {
		const blobPath = join(this.blobsDir, blobId.slice(0, 2), blobId);

		if (!existsSync(blobPath)) {
			return null;
		}

		const data = readFileSync(blobPath);

		// Decompress if needed
		try {
			const decompressed = gunzipSync(data);
			return decompressed.toString("utf8");
		} catch {
			// Not compressed, return as-is
			return data.toString("utf8");
		}
	}

	/**
	 * Generate unique snapshot ID
	 *
	 * REFERENCE: packages/contracts/src/snapshot.ts generateSnapshotId()
	 */
	private generateSnapshotId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).slice(2, 8);
		return `snap_${timestamp}_${random}`;
	}

	/**
	 * Ensure directory exists
	 */
	private ensureDir(dir: string): void {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	}
}

// =============================================================================
// FACTORY FUNCTION (Replaces module-level singleton)
// =============================================================================

/**
 * Create a storage instance with the given workspace root.
 *
 * NOTE: We don't export a default singleton because:
 * 1. It would execute mkdirSync at import time (side effect)
 * 2. The path must be absolute to avoid CWD issues in VS Code extension host
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Optional configuration overrides
 */
export function createStorage(workspaceRoot: string, options: Partial<StorageConfig> = {}): Storage {
	const config: StorageConfig = {
		rootDir: `${workspaceRoot}/.snapback`,
		compress: options.compress ?? true,
	};
	return new Storage(config);
}
