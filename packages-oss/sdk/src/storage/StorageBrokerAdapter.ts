import type { Snapshot, SnapshotFilters } from "@snapback-oss/contracts";
import type { StorageAdapter } from "./StorageAdapter.js";
import { StorageBroker } from "./StorageBroker.js";

/**
 * StorageBrokerAdapter - Adapter that makes StorageBroker compatible with StorageAdapter interface
 *
 * This adapter bridges the StorageBroker (with single-writer discipline) to the StorageAdapter interface
 * used by the rest of the codebase, ensuring all storage operations go through the single-writer broker.
 *
 * Key responsibilities:
 * - Convert StorageAdapter method calls to StorageBroker operations
 * - Maintain compatibility with existing code
 * - Ensure all operations are queued through the broker's single-writer discipline
 */
export class StorageBrokerAdapter implements StorageAdapter {
	private broker: StorageBroker;

	constructor(dbPath: string) {
		this.broker = new StorageBroker(dbPath);
	}

	async initialize(): Promise<void> {
		await this.broker.initialize();
	}

	async save(snapshot: Snapshot, contentHash?: string): Promise<void> {
		// Convert the save operation to a createSnapshot operation
		// We need to convert the Snapshot format to what createSnapshot expects
		const filesMap = new Map<string, string>();
		if (snapshot.fileContents) {
			for (const [filePath, content] of Object.entries(snapshot.fileContents)) {
				filesMap.set(filePath, content);
			}
		}

		// Extract name from metadata or use a default
		const name = snapshot.meta?.name || snapshot.meta?.trigger || "snapshot";

		// Include contentHash in metadata
		const metadata = {
			...snapshot.meta,
			contentHash,
		};

		// Call createSnapshot directly since it already handles queuing internally
		// Pass the snapshot ID to ensure it's used
		await this.broker.createSnapshot(name, filesMap, metadata, undefined, snapshot.id);
	}

	async get(id: string): Promise<Snapshot | null> {
		try {
			// For get operations, we can use the broker's getSnapshot method
			const result = await this.broker.getSnapshot(id);

			if (!result) {
				return null;
			}

			// Convert the result to the Snapshot format
			let metadata = {};
			try {
				metadata = JSON.parse(result.metadata);
			} catch (_error) {
				// Ignore parsing errors and use empty metadata
			}

			// Convert Map back to Record format for compatibility
			const fileContents: Record<string, string> = {};
			for (const [filePath, content] of result.files) {
				fileContents[filePath] = content;
			}

			return {
				id: result.id,
				timestamp: result.timestamp,
				meta: metadata,
				files: Array.from(result.files.keys()),
				fileContents,
			};
		} catch (error) {
			// Log the error but don't throw - return null to indicate not found
			console.error(`Error retrieving snapshot ${id}:`, error);
			return null;
		}
	}

	async list(filters?: SnapshotFilters): Promise<Snapshot[]> {
		try {
			// Convert filters to parameters for listSnapshots
			const limit = filters?.limit || 50;
			const offset = filters?.offset || 0;

			// For now, we'll sort by timestamp DESC as that's the most common use case
			const snapshots = await this.broker.listSnapshots(limit, offset, "timestamp", "DESC");

			// Convert the results to the Snapshot format
			const result: Snapshot[] = [];
			for (const snapshot of snapshots) {
				let metadata = {};
				try {
					metadata = JSON.parse(snapshot.metadata);
				} catch (_error) {
					// Ignore parsing errors and use empty metadata
				}

				result.push({
					id: snapshot.id,
					timestamp: snapshot.timestamp,
					meta: metadata,
					files: [], // We don't load files in list view for performance
					fileContents: {},
				});
			}

			return result;
		} catch (error) {
			// Log the error but don't throw - return empty array
			console.error("Error listing snapshots:", error);
			return [];
		}
	}

	async delete(id: string): Promise<void> {
		try {
			await this.broker.deleteSnapshot(id);
		} catch (error) {
			// Log the error but don't throw - delete should be idempotent
			console.error(`Error deleting snapshot ${id}:`, error);
		}
	}

	async close(): Promise<void> {
		try {
			await this.broker.close();
		} catch (error) {
			// Log the error but don't throw - we're closing anyway
			console.error("Error closing storage:", error);
		}
	}
}
