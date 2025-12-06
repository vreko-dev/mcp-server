import type { GitContext, ProtectionLevel, Snapshot } from "./types";

// Use native crypto.randomUUID() instead of uuid package
const generateId = (): string => {
	if (crypto?.randomUUID) {
		return crypto.randomUUID();
	}
	// Fallback for environments without crypto.randomUUID
	return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// In-memory cache for last snapshot timestamps and content hashes
const lastSnapshotTs: Record<string, number> = {};
const lastHash: Record<string, string> = {};

// Default checkpoint interval (5 minutes)
const CHECKPOINT_INTERVAL = 300000;

/**
 * Creates a new snapshot with deduplication and debounce logic
 * @param fileId - The ID of the file
 * @param content - The file content
 * @param currentSnapshots - Existing snapshots for deduplication
 * @param protectionLevel - Current protection level
 * @param gitContext - Optional Git context for naming
 * @param options - Configuration options
 * @param options.checkpointInterval - Minimum time between snapshots (ms)
 * @param options.forceCreate - Bypass debounce for manual snapshots
 * @returns Snapshot object or null if no snapshot needed
 */
export function createSnapshot(
	fileId: string,
	content: string,
	currentSnapshots: Snapshot[],
	protectionLevel: ProtectionLevel,
	gitContext?: GitContext,
	options?: {
		checkpointInterval?: number;
		forceCreate?: boolean;
	},
): Snapshot | null {
	const now = Date.now();
	const interval = options?.checkpointInterval ?? CHECKPOINT_INTERVAL;

	// Check debounce window (unless forceCreate is true)
	if (!options?.forceCreate && lastSnapshotTs[fileId] && now - lastSnapshotTs[fileId] < interval) {
		return null; // Too soon since last snapshot
	}

	// Simple hash for content deduplication
	const hash = simpleHash(content);

	// Check content deduplication
	if (lastHash[fileId] && hash === lastHash[fileId]) {
		return null; // Content unchanged
	}

	// Deduplication: if content unchanged, don't add new snapshot
	const latestSnapshot = currentSnapshots
		.filter((s) => s.fileId === fileId)
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

	if (latestSnapshot && latestSnapshot.content === content) {
		return null; // No change, no need for new snapshot
	}

	// Update cache
	lastHash[fileId] = hash;
	lastSnapshotTs[fileId] = now;

	// Generate semantic name based on git context or timestamp
	const name = generateSnapshotName(gitContext);

	return {
		id: generateId(),
		fileId,
		content,
		timestamp: new Date(),
		name,
		protectionLevel,
	};
}

/**
 * Simple hash function for content deduplication
 */
function simpleHash(content: string): string {
	let hash = 0;
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return hash.toString();
}

/**
 * Generates a semantic snapshot name
 */
export function generateSnapshotName(gitContext?: GitContext): string {
	if (gitContext) {
		// Use git context for naming if available
		return `${gitContext.branch}-${gitContext.commit.substring(0, 7)}-${Date.now()}`;
	}

	// Default to timestamp-based naming
	return `snapshot-${Date.now()}`;
}

/**
 * Restores content from a snapshot
 */
export function restoreSnapshot(snapshot: Snapshot): string {
	return snapshot.content;
}

/**
 * Gets snapshots for a specific file, sorted newest first
 */
export function getSnapshotsForFile(snapshots: Snapshot[], fileId: string): Snapshot[] {
	return snapshots.filter((s) => s.fileId === fileId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
