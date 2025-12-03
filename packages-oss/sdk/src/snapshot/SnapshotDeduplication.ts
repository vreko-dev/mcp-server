import { createHash } from "node:crypto";
import type { FileInput, Snapshot } from "@snapback-oss/contracts";
import QuickLRU from "quick-lru";
import { THRESHOLDS } from "../config/Thresholds.js";
import type { StorageAdapter } from "../storage/StorageAdapter.js";

export class SnapshotDeduplication {
	private hashCache: QuickLRU<string, string>;

	constructor(private cacheSize = THRESHOLDS.resources.dedupCacheSize) {
		this.hashCache = new QuickLRU({ maxSize: this.cacheSize });
	}

	/**
	 * Hash file content using SHA-256
	 */
	hashContent(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Hash multiple files content
	 */
	hashFiles(files: FileInput[]): string {
		// Sort files for consistent hashing
		const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

		const content = sorted.map((f) => `${f.path}:${f.action}:${f.content}`).join("|");

		return this.hashContent(content);
	}

	/**
	 * Check if content is already stored (deduplication)
	 */
	async isDuplicate(
		files: FileInput[],
		storage: StorageAdapter,
	): Promise<{ isDuplicate: boolean; existingId?: string }> {
		const hash = this.hashFiles(files);

		// Check cache first
		const cachedId = this.hashCache.get(hash);
		if (cachedId) {
			return { isDuplicate: true, existingId: cachedId };
		}

		// If storage supports hash-based lookup, use it for O(1) performance
		// This is a more efficient approach than loading all snapshots
		if (this.supportsHashLookup(storage)) {
			const existing = await this.getByContentHash(storage, hash);
			if (existing) {
				this.hashCache.set(hash, existing.id);
				return { isDuplicate: true, existingId: existing.id };
			}
		} else {
			// Fallback to original approach for storages that don't support hash lookup
			// Check storage (query by content hash if supported)
			// For now, we'll do a simple check by comparing content
			const allSnapshots = await storage.list();

			for (const snapshot of allSnapshots) {
				// Check if this snapshot has the same files and content
				if (snapshot.files?.length === files.length) {
					const isMatch = files.every((file) => snapshot.fileContents?.[file.path] === file.content);

					if (isMatch) {
						this.hashCache.set(hash, snapshot.id);
						return { isDuplicate: true, existingId: snapshot.id };
					}
				}
			}
		}

		return { isDuplicate: false };
	}

	/**
	 * Check if storage adapter supports hash-based lookup
	 */
	private supportsHashLookup(storage: StorageAdapter): boolean {
		// This would be implemented by storage adapters that support hash indexing
		return "getByContentHash" in storage;
	}

	/**
	 * Get snapshot by content hash (if supported by storage)
	 */
	private async getByContentHash(storage: StorageAdapter, hash: string): Promise<Snapshot | null> {
		if (storage.getByContentHash) {
			return await storage.getByContentHash(hash);
		}
		return null;
	}

	/**
	 * Record hash for future deduplication checks
	 */
	recordHash(snapshotId: string, files: FileInput[]): void {
		const hash = this.hashFiles(files);
		this.hashCache.set(hash, snapshotId);
	}

	/**
	 * Clear hash from cache for a deleted snapshot
	 * This prevents the dedup cache from referencing non-existent snapshots
	 */
	clearHash(snapshotId: string): void {
		// Find and remove all cache entries that reference this snapshot ID
		for (const [hash, cachedId] of this.hashCache.entries()) {
			if (cachedId === snapshotId) {
				this.hashCache.delete(hash);
			}
		}
	}
}
