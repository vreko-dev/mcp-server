import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { StorageAdapter } from "./StorageAdapter.js";

/**
 * In-memory storage implementation
 * Useful for testing and temporary snapshots
 * Data is lost when instance is destroyed
 */
export class MemoryStorage implements StorageAdapter {
	private snapshots: Map<string, Snapshot> = new Map();

	async save(snapshot: Snapshot, _contentHash?: string): Promise<void> {
		// Deep clone to prevent external mutations while preserving types
		// Note: MemoryStorage doesn't persist contentHash since it's transient
		this.snapshots.set(snapshot.id, this.cloneSnapshot(snapshot));
	}

	async get(id: string): Promise<Snapshot | null> {
		const snapshot = this.snapshots.get(id);
		return snapshot ? this.cloneSnapshot(snapshot) : null;
	}

	async list(filters?: SnapshotFilters): Promise<Snapshot[]> {
		let snapshots = Array.from(this.snapshots.values());

		// Apply filters
		if (filters?.filePath) {
			snapshots = snapshots.filter((s) =>
				s.files?.some(
					(f: string) => f === filters.filePath || (filters.filePath && f.includes(filters.filePath)),
				),
			);
		}

		if (filters?.before) {
			const beforeMs = filters.before.getTime();
			snapshots = snapshots.filter((s) => s.timestamp < beforeMs);
		}

		if (filters?.after) {
			const afterMs = filters.after.getTime();
			snapshots = snapshots.filter((s) => s.timestamp >= afterMs);
		}

		if (filters?.protected !== undefined) {
			snapshots = snapshots.filter((s) => (s.meta?.protected ?? false) === filters.protected);
		}

		// Sort by timestamp descending (newest first)
		snapshots.sort((a, b) => b.timestamp - a.timestamp);

		// Apply limit
		if (filters?.limit) {
			snapshots = snapshots.slice(0, filters.limit);
		}

		// Deep clone to prevent external mutations while preserving types
		return snapshots.map((s) => this.cloneSnapshot(s));
	}

	async delete(id: string): Promise<void> {
		this.snapshots.delete(id);
	}

	async close(): Promise<void> {
		this.snapshots.clear();
	}

	/**
	 * Deep clone snapshot while preserving type information
	 */
	private cloneSnapshot(snapshot: Snapshot): Snapshot {
		// Use structuredClone if available (Node 17+), otherwise fallback to JSON approach
		if (typeof structuredClone !== "undefined") {
			return structuredClone(snapshot);
		}

		// Fallback for older Node versions - should not be reached in modern environments
		return structuredClone(snapshot);
	}

	/**
	 * Get total count of snapshots (for testing)
	 */
	get size(): number {
		return this.snapshots.size;
	}
}
