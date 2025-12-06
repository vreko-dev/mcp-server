import type { Snapshot } from "../domain/types";
import { db } from "./db";

type SnapshotInput = Snapshot | (Omit<Snapshot, "id"> & { id?: string });

const generateId = () =>
	crypto?.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2, 11);

/**
 * Repository for managing snapshots in IndexedDB
 */
export class SnapshotRepo {
	/**
	 * Creates a new snapshot
	 */
	async create(snapshot: SnapshotInput): Promise<Snapshot> {
		const record: Snapshot = snapshot.id
			? (snapshot as Snapshot)
			: { ...(snapshot as Omit<Snapshot, "id">), id: generateId() };

		try {
			await db.snapshots.put(record);
		} catch (error) {
			if (error instanceof DOMException && error.name === "ConstraintError") {
				await db.snapshots.update(record.id, record);
			} else {
				throw error;
			}
		}
		return record;
	}

	/**
	 * Gets all snapshots for a specific file
	 */
	async getByFileId(fileId: string): Promise<Snapshot[]> {
		return db.snapshots
			.where("fileId")
			.equals(fileId)
			.sortBy("timestamp")
			.then((snapshots: Snapshot[]) => snapshots.reverse()); // Newest first
	}

	/**
	 * Gets a specific snapshot by ID
	 */
	async getById(id: string): Promise<Snapshot | undefined> {
		return db.snapshots.get(id);
	}

	/**
	 * Updates a snapshot
	 */
	async update(id: string, updates: Partial<Snapshot>): Promise<void> {
		await db.snapshots.update(id, updates);
	}

	/**
	 * Deletes a snapshot
	 */
	async delete(id: string): Promise<void> {
		await db.snapshots.delete(id);
	}

	/**
	 * Deletes all snapshots for a specific file
	 */
	async deleteByFileId(fileId: string): Promise<void> {
		await db.snapshots.where("fileId").equals(fileId).delete();
	}

	/**
	 * Gets all snapshots
	 */
	async getAll(): Promise<Snapshot[]> {
		return db.snapshots.orderBy("timestamp").reverse().toArray();
	}

	/**
	 * Cleans up old snapshots based on retention policy
	 * Keeps last N snapshots per file and removes snapshots older than TTL
	 */
	async cleanupSnapshots(
		maxSnapshotsPerFile = 10,
		ttlDays = 30,
	): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - ttlDays);

		// Get all snapshots
		const allSnapshots = await this.getAll();

		// Group by file ID
		const snapshotsByFile: Record<string, Snapshot[]> = {};
		for (const snapshot of allSnapshots) {
			if (!snapshotsByFile[snapshot.fileId]) {
				snapshotsByFile[snapshot.fileId] = [];
			}
			const fileSnapshots = snapshotsByFile[snapshot.fileId];
			if (fileSnapshots) {
				fileSnapshots.push(snapshot);
			}
		}

		// For each file, keep only the most recent maxSnapshotsPerFile snapshots
		// and remove snapshots older than cutoffDate
		const snapshotsToDelete: string[] = [];

		for (const fileId in snapshotsByFile) {
			const fileSnapshots = snapshotsByFile[fileId];
			if (!fileSnapshots) continue;
			const snapshots = fileSnapshots.sort(
				(a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
			);

			// Remove snapshots older than TTL
			for (const snapshot of snapshots) {
				if (snapshot.timestamp < cutoffDate) {
					snapshotsToDelete.push(snapshot.id);
				}
			}

			// Keep only the most recent maxSnapshotsPerFile snapshots
			if (snapshots.length > maxSnapshotsPerFile) {
				const oldSnapshots = snapshots.slice(maxSnapshotsPerFile);
				for (const snapshot of oldSnapshots) {
					if (snapshot.timestamp >= cutoffDate) {
						// Only delete if not already marked for TTL deletion
						snapshotsToDelete.push(snapshot.id);
					}
				}
			}
		}

		// Delete marked snapshots
		if (snapshotsToDelete.length > 0) {
			await db.snapshots.bulkDelete(snapshotsToDelete);
		}
	}
}
