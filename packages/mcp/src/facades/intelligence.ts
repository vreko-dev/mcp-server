/**
 * Intelligence Facade Singleton
 *
 * Provides lazy-initialized Intelligence instances per workspace.
 * Used by MCP handlers to access validation, learning, and context retrieval.
 *
 * @module facades/intelligence
 */

import { Intelligence } from "@snapback/intelligence";

/**
 * Cache of Intelligence instances by workspace root
 * Singleton pattern ensures consistent state across tool calls
 */
const instances = new Map<string, Intelligence>();

/**
 * Get or create an Intelligence instance for a workspace
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Intelligence instance configured for the workspace
 *
 * @example
 * ```typescript
 * const intel = getIntelligence("/path/to/workspace");
 * const context = await intel.getContext({ task: "Add auth" });
 * ```
 */
export function getIntelligence(workspaceRoot: string): Intelligence {
	if (!instances.has(workspaceRoot)) {
		const intel = new Intelligence({
			rootDir: workspaceRoot,
			// Free tier defaults - semantic search disabled
			enableSemanticSearch: false,
			enableLearningLoop: true,
			// Storage paths relative to workspace
			patternsDir: ".snapback/patterns",
			learningsDir: ".snapback/learnings",
			constraintsFile: ".snapback/constraints.json",
		});
		instances.set(workspaceRoot, intel);
	}
	return instances.get(workspaceRoot)!;
}

/**
 * Initialize Intelligence instance for a workspace
 * Call once at server startup for workspaces needing async features
 *
 * @param workspaceRoot - Absolute path to workspace root
 */
export async function initializeIntelligence(workspaceRoot: string): Promise<void> {
	const intel = getIntelligence(workspaceRoot);
	await intel.initialize();
}

/**
 * Dispose of Intelligence instance for a workspace
 * Call when workspace is closed or server is shutting down
 *
 * @param workspaceRoot - Absolute path to workspace root
 */
export async function disposeIntelligence(workspaceRoot: string): Promise<void> {
	const intel = instances.get(workspaceRoot);
	if (intel) {
		await intel.dispose();
		instances.delete(workspaceRoot);
	}
}

/**
 * Dispose all Intelligence instances
 * Call on server shutdown
 */
export async function disposeAllIntelligence(): Promise<void> {
	const disposals = Array.from(instances.entries()).map(async ([root, intel]) => {
		await intel.dispose();
		instances.delete(root);
	});
	await Promise.all(disposals);
}

/**
 * Get count of active Intelligence instances
 * Useful for debugging and monitoring
 */
export function getActiveInstanceCount(): number {
	return instances.size;
}
