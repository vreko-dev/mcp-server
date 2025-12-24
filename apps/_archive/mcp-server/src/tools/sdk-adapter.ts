/**
 * SDK Adapter for MCP Server
 * Provides singleton access to SnapBack SDK components
 */

import path from "node:path";
import type { FileInput } from "@snapback/contracts";
import { LocalStorage, SnapshotManager } from "@snapback/sdk";

// Singleton instances
let snapshotManagerInstance: SnapshotManager | null = null;
let storageInstance: LocalStorage | null = null;

/**
 * Get or create the SnapshotManager instance
 */
export function getSnapshotManager(): SnapshotManager {
	if (!snapshotManagerInstance) {
		const storage = getStorage();
		snapshotManagerInstance = new SnapshotManager(storage, {
			enableDeduplication: true,
			namingStrategy: "semantic",
			autoProtect: false,
		});
	}
	return snapshotManagerInstance;
}

/**
 * Get or create the LocalStorage instance
 */
export function getStorage(): LocalStorage {
	if (!storageInstance) {
		const workspaceDir = process.env.SNAPBACK_WORKSPACE || process.cwd();
		const storePath = path.join(workspaceDir, ".snapback", "snapshots.db");
		storageInstance = new LocalStorage(storePath);
	}
	return storageInstance;
}

/**
 * Reset singleton instances (for testing)
 */
export function resetSingletons(): void {
	snapshotManagerInstance = null;
	storageInstance = null;
}

/**
 * Convert MCP file format to SDK FileInput format
 */
export function toFileInputs(files: Array<{ path: string; content: string }>): FileInput[] {
	return files.map((f) => ({
		path: f.path,
		content: f.content,
		action: "modify" as const,
	}));
}
