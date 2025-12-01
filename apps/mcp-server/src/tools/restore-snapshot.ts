import { getSnapshotManager } from "./sdk-adapter.js";

/**
 * Store snapshot content in cache/storage
 *
 * @param snapshotId - The snapshot ID
 * @param files - Array of files with path and content
 */
export async function storeSnapshotContent(
	snapshotId: string,
	files: Array<{ path: string; content: string }>,
): Promise<void> {
	try {
		// Content is already stored by SnapshotManager.create()
		// This function provides an additional hook for storing
		// file contents in supplementary storage if needed
		console.log(`Storing ${files.length} file contents for snapshot ${snapshotId}`);
		// Additional storage operations could be added here
	} catch (error) {
		console.error(`Failed to store snapshot content for ${snapshotId}:`, error);
	}
}

/**
 * Restore a snapshot by ID
 *
 * @param snapshotId - The ID of the snapshot to restore
 * @param targetPath - Optional target directory path for file system restore
 * @returns The restored snapshot content
 */
export async function restoreSnapshot(snapshotId: string, targetPath?: string) {
	try {
		const manager = getSnapshotManager();

		// Get the snapshot first to verify it exists
		const snapshot = await manager.get(snapshotId);
		if (!snapshot) {
			return {
				success: false,
				error: `Snapshot with ID ${snapshotId} not found`,
			};
		}

		// Restore the snapshot (metadata only if no targetPath, file system if targetPath provided)
		const result = await manager.restore(snapshotId, targetPath);

		if (!result.success) {
			return {
				success: false,
				error: result.errors?.join(", ") || "Restore failed",
			};
		}

		return {
			success: true,
			snapshot: {
				id: snapshot.id,
				timestamp: snapshot.timestamp,
				reason: snapshot.meta?.name || "Snapshot",
				fileCount: (snapshot.files || []).length,
				restoredFiles: result.restoredFiles,
				fileContents: snapshot.fileContents,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
