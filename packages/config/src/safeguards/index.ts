/**
 * Safeguards Index
 *
 * Central location for all 8 production safeguards
 * Ordered by implementation sequence and dependency
 */

export * from "./atomic-writes";
export * from "./checksums";
export * from "./feature-flags";
export * from "./file-watcher";
export * from "./performance";
export * from "./rollback";

// Types
export type SafeguardName =
	| "migration-checksums"
	| "file-watcher"
	| "performance-monitoring"
	| "feature-flags"
	| "atomic-writes"
	| "rollback";

export interface SafeguardStatus {
	name: SafeguardName;
	enabled: boolean;
	lastCheck: Date;
	healthStatus: "healthy" | "degraded" | "critical";
}
