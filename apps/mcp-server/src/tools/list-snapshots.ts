import { getSnapshotManager } from "./sdk-adapter.js";

/**
 * Add a snapshot to storage (store metadata)
 *
 * @param snapshot - The snapshot to add
 */
export function addSnapshot(snapshot: any): void {
	// Snapshots are automatically stored by the SnapshotManager
	// This function serves as a placeholder for any additional
	// metadata operations we might need to perform
	console.log("Snapshot added to storage:", snapshot.id);
}

/**
 * List all snapshots
 *
 * @returns Array of snapshots sorted by timestamp (newest first)
 */
export async function listSnapshots() {
	try {
		const manager = getSnapshotManager();
		const snapshots = await manager.list();

		// Format snapshots for MCP response
		const formatted = snapshots.map((snapshot) => ({
			id: snapshot.id,
			timestamp: snapshot.timestamp,
			reason: snapshot.meta?.name || "Snapshot",
			fileCount: (snapshot.files || []).length,
		}));

		// Sort by timestamp (newest first) - already sorted by storage but ensure it
		const sorted = formatted.sort((a, b) => b.timestamp - a.timestamp);

		return {
			success: true,
			snapshots: sorted,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
