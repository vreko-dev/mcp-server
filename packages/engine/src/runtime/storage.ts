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

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { generateSnapshotId } from "@snapback/contracts/id-generator";
import { sha256 } from "@snapback-oss/sdk";
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
		// Use canonical ID generator from contracts - includes description in ID for readability
		const id = generateSnapshotId(options.description);
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
	 * Note: Use garbageCollectBlobs() after deleting snapshots to reclaim space.
	 */
	deleteSnapshot(snapshotId: string): boolean {
		const manifestPath = join(this.snapshotsDir, `${snapshotId}.json`);

		if (!existsSync(manifestPath)) {
			return false;
		}

		unlinkSync(manifestPath);
		return true;
	}

	/**
	 * Garbage collect orphaned blobs.
	 *
	 * Scans all blobs and removes those not referenced by any snapshot.
	 * Returns statistics about the cleanup operation.
	 *
	 * @param dryRun - If true, only report what would be deleted without actually deleting
	 */
	garbageCollectBlobs(dryRun = true): {
		totalBlobs: number;
		orphanedBlobs: number;
		deletedBlobs: number;
		bytesReclaimed: number;
		orphanedPaths: string[];
	} {
		const snapshots = this.listSnapshots();

		// Collect all referenced blob IDs from active snapshots
		const referencedBlobs = new Set<string>();
		for (const snap of snapshots) {
			for (const file of snap.files) {
				referencedBlobs.add(file.blobId);
			}
		}

		// Scan blobs directory for all blobs
		const allBlobs: Array<{ hash: string; path: string; size: number }> = [];
		if (existsSync(this.blobsDir)) {
			const shards = readdirSync(this.blobsDir).filter((f) => f.length === 2);
			for (const shard of shards) {
				const shardPath = join(this.blobsDir, shard);
				try {
					const blobs = readdirSync(shardPath);
					for (const blobHash of blobs) {
						const blobPath = join(shardPath, blobHash);
						try {
							const stats = statSync(blobPath);
							if (stats.isFile()) {
								allBlobs.push({ hash: blobHash, path: blobPath, size: stats.size });
							}
						} catch {
							// Skip if stat fails
						}
					}
				} catch {
					// Skip if readdir fails
				}
			}
		}

		// Find orphaned blobs (not referenced by any snapshot)
		const orphaned = allBlobs.filter((b) => !referencedBlobs.has(b.hash));
		const orphanedPaths = orphaned.map((b) => b.path);
		let bytesReclaimed = orphaned.reduce((sum, b) => sum + b.size, 0);
		let deletedBlobs = 0;

		// Delete orphaned blobs if not dry run
		if (!dryRun) {
			for (const blob of orphaned) {
				try {
					unlinkSync(blob.path);
					deletedBlobs++;
				} catch {
					// Reduce reclaimed bytes if delete fails
					bytesReclaimed -= blob.size;
				}
			}
		}

		return {
			totalBlobs: allBlobs.length,
			orphanedBlobs: orphaned.length,
			deletedBlobs: dryRun ? 0 : deletedBlobs,
			bytesReclaimed: dryRun ? bytesReclaimed : bytesReclaimed,
			orphanedPaths: dryRun ? orphanedPaths : [],
		};
	}

	/**
	 * Prune old snapshots based on retention policy.
	 *
	 * @param maxAgeDays - Delete snapshots older than this many days
	 * @param keepCount - Always keep at least this many snapshots (regardless of age)
	 * @param dryRun - If true, only report what would be deleted
	 */
	pruneSnapshots(
		maxAgeDays = 30,
		keepCount = 10,
		dryRun = true,
	): {
		totalSnapshots: number;
		staleSnapshots: number;
		deletedSnapshots: number;
		deletedIds: string[];
	} {
		const snapshots = this.listSnapshots(); // Already sorted by createdAt desc
		const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

		// Keep at least keepCount snapshots, then apply age filter
		const candidates = snapshots.slice(keepCount);
		const stale = candidates.filter((s) => s.createdAt < cutoff);
		const deletedIds: string[] = [];

		if (!dryRun) {
			for (const snap of stale) {
				if (this.deleteSnapshot(snap.id)) {
					deletedIds.push(snap.id);
				}
			}
		}

		return {
			totalSnapshots: snapshots.length,
			staleSnapshots: stale.length,
			deletedSnapshots: dryRun ? 0 : deletedIds.length,
			deletedIds: dryRun ? stale.map((s) => s.id) : deletedIds,
		};
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
		// Calculate content hash using consolidated hash utility
		const hash = sha256(content);

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
	 * @deprecated Use @snapback/contracts/id-generator directly
	 */
	private generateSnapshotId(description?: string): string {
		return generateSnapshotId(description);
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
