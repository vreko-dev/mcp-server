/**
 * SnapshotService - Shared snapshot operations for MCP tools
 *
 * Eliminates duplication across:
 * - handlers.ts (snapshot_create)
 * - begin-task.ts (auto-snapshot)
 * - complete-task.ts (final snapshot)
 *
 * @module services/snapshot-service
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createStorage, type SnapshotManifest } from "@snapback/engine";
import { notifySnapshotCreatedViaDaemon } from "../daemon/client-facade.js";
import { validateFilePaths } from "../validation.js";

// =============================================================================
// TYPES
// =============================================================================

export interface SnapshotOptions {
	/** Description for the snapshot */
	description: string;
	/** Trigger type */
	trigger: "manual" | "auto" | "ai-detection";
	/** Skip deduplication check */
	skipDedup?: boolean;
	/** Number of recent snapshots to check for duplicates */
	dedupWindow?: number;
}

export interface SnapshotResult {
	success: boolean;
	snapshot?: {
		id: string;
		fileCount: number;
		totalSize: number;
		createdAt: number;
	};
	/** True if existing snapshot was reused */
	reused?: boolean;
	reusedSnapshotId?: string;
	reusedReason?: string;
	error?: string;
}

export interface FileHashResult {
	path: string;
	hash: string;
	exists: boolean;
}

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Compute SHA-256 hash for file content
 */
function hashContent(content: string): string {
	return createHash("sha256").update(content).digest("hex").substring(0, 16);
}

/**
 * Get hashes for multiple files
 */
export function getFileHashes(files: string[], workspaceRoot: string): FileHashResult[] {
	return files.map((file) => {
		const fullPath = resolve(workspaceRoot, file);
		if (!existsSync(fullPath)) {
			return { path: file, hash: "", exists: false };
		}
		try {
			const content = readFileSync(fullPath, "utf8");
			return { path: file, hash: hashContent(content), exists: true };
		} catch {
			return { path: file, hash: "", exists: false };
		}
	});
}

/**
 * Check if current files match a recent snapshot
 */
export function findMatchingSnapshot(
	currentHashes: FileHashResult[],
	snapshots: SnapshotManifest[],
	windowSize = 5,
): { matched: boolean; snapshotId?: string; createdAt?: number } {
	const recentSnapshots = snapshots.slice(0, windowSize);

	for (const snapshot of recentSnapshots) {
		// Check if all current files match snapshot files by hash (blobId is the hash)
		const snapshotFileHashes = new Map(snapshot.files.map((f) => [f.path, f.blobId]));

		const allMatch = currentHashes.every((current) => {
			if (!current.exists) {
				return false;
			}
			const snapshotHash = snapshotFileHashes.get(current.path);
			return snapshotHash === current.hash;
		});

		if (allMatch && currentHashes.length === snapshot.files.length) {
			return {
				matched: true,
				snapshotId: snapshot.id,
				createdAt: snapshot.createdAt,
			};
		}
	}

	return { matched: false };
}

// =============================================================================
// SNAPSHOT SERVICE
// =============================================================================

export class SnapshotService {
	private storage: ReturnType<typeof createStorage>;
	private workspaceRoot: string;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
		this.storage = createStorage(workspaceRoot);
	}

	/**
	 * Create a snapshot from file paths with optional deduplication
	 *
	 * @example
	 * ```typescript
	 * const service = new SnapshotService(workspaceRoot);
	 * const result = await service.createFromFiles(
	 *   ["src/index.ts", "src/utils.ts"],
	 *   { description: "Pre-refactor", trigger: "ai-detection" }
	 * );
	 * if (result.success) {
	 *   console.log(`Created snapshot: ${result.snapshot.id}`);
	 * }
	 * ```
	 */
	async createFromFiles(files: string[], options: SnapshotOptions): Promise<SnapshotResult> {
		if (!files || files.length === 0) {
			return { success: false, error: "No files provided" };
		}

		// Validate paths
		const pathValidation = validateFilePaths(files, this.workspaceRoot);
		if (!pathValidation.valid) {
			return {
				success: false,
				error: `Invalid path: ${pathValidation.invalidPath} - ${pathValidation.error}`,
			};
		}

		// Check for deduplication
		if (!options.skipDedup) {
			const currentHashes = getFileHashes(files, this.workspaceRoot);
			const existingSnapshots = this.storage.listSnapshots();
			const match = findMatchingSnapshot(currentHashes, existingSnapshots, options.dedupWindow ?? 5);

			if (match.matched && match.snapshotId) {
				const createdAtDate = match.createdAt ? new Date(match.createdAt) : new Date();
				return {
					success: true,
					reused: true,
					reusedSnapshotId: match.snapshotId,
					reusedReason: `Files unchanged since ${createdAtDate.toLocaleString()}`,
				};
			}
		}

		// Read file contents
		try {
			const fileContents = pathValidation.sanitizedPaths
				.filter((fullPath) => existsSync(fullPath))
				.map((fullPath, idx) => ({
					path: files[idx],
					content: readFileSync(fullPath, "utf8"),
				}));

			if (fileContents.length === 0) {
				return { success: false, error: "No readable files found" };
			}

			// Create snapshot
			const snapshot = await this.storage.createSnapshot(fileContents, {
				description: options.description,
				trigger: options.trigger,
			});

			// CRITICAL: Notify daemon so Extension vitals can reset pressure
			// Without this, MCP-created snapshots don't reset the vitals pressure gauge,
			// causing the "snapshot recommended" popup to persist even after snapshots.
			// The daemon forwards this as SNAPSHOT_CREATED event to the EventBus.
			void notifySnapshotCreatedViaDaemon(
				this.workspaceRoot,
				snapshot.id,
				files[0], // Primary file path for vitals
				options.trigger,
			);

			return {
				success: true,
				snapshot: {
					id: snapshot.id,
					fileCount: snapshot.files.length,
					totalSize: snapshot.totalSize,
					createdAt: snapshot.createdAt,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * List recent snapshots
	 */
	listSnapshots(limit = 20): SnapshotManifest[] {
		return this.storage.listSnapshots().slice(0, limit);
	}

	/**
	 * Get a specific snapshot
	 */
	getSnapshot(id: string): SnapshotManifest | null {
		return this.storage.getSnapshot(id);
	}
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a SnapshotService instance
 */
export function createSnapshotService(workspaceRoot: string): SnapshotService {
	return new SnapshotService(workspaceRoot);
}
