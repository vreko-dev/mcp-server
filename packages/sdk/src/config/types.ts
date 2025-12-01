/**
 * Configuration Types for SnapBack
 *
 * Platform-agnostic types for .snapbackrc configuration files.
 */

/**
 * Protection level for files
 */
export type ProtectionLevel = "Watched" | "Warning" | "Protected";

/**
 * Protection rule for file patterns
 */
export interface ProtectionRule {
	/** Glob pattern to match files */
	pattern: string;

	/** Protection level to apply */
	level: ProtectionLevel;

	/** Optional reason for the protection */
	reason?: string;

	/** Patterns to exclude from this rule */
	excludeFrom?: string[];

	/** Whether to auto-snapshot on changes */
	autoSnapshot?: boolean;

	/** Debounce time in milliseconds */
	debounce?: number;

	/** Provenance tracking for config merge (internal use) */
	_provenance?: string;
}

/**
 * SnapBack settings
 */
export interface SnapBackSettings {
	/** Maximum number of snapshots to keep */
	maxSnapshots?: number;

	/** Enable compression for snapshots */
	compressionEnabled?: boolean;

	/** Auto-snapshot interval in milliseconds */
	autoSnapshotInterval?: number;

	/** Notification duration in milliseconds */
	notificationDuration?: number;

	/** Show status bar item */
	showStatusBarItem?: boolean;

	/** Confirm before restore */
	confirmRestore?: boolean;

	/** Default protection level for new files */
	defaultProtectionLevel?: ProtectionLevel;

	/** Protection debounce in milliseconds */
	protectionDebounce?: number;

	/** Snapshot storage location */
	snapshotLocation?: string;

	/** Maximum storage size in bytes */
	maxStorageSize?: number;

	/** Number of parallel operations */
	parallelOperations?: number;

	/** Enable caching */
	enableCaching?: boolean;
}

/**
 * SnapBack policies
 */
export interface SnapBackPolicies {
	/** Require message for snapshots */
	requireSnapshotMessage?: boolean;

	/** Enforce protection levels */
	enforceProtectionLevels?: boolean;

	/** Allow user overrides */
	allowOverrides?: boolean;

	/** Minimum protection level allowed */
	minimumProtectionLevel?: ProtectionLevel;

	/** Prevent accidental commits */
	preventAccidentalCommit?: boolean;

	/** Team configuration URL */
	teamConfigUrl?: string;
}

/**
 * SnapBack hooks
 */
export interface SnapBackHooks {
	/** Script to run before creating snapshot */
	beforeSnapshot?: string;

	/** Script to run after creating snapshot */
	afterSnapshot?: string;

	/** Script to run before restoring */
	beforeRestore?: string;

	/** Script to run after restoring */
	afterRestore?: string;

	/** Script to run when protected file changes */
	onProtectedFileChange?: string;
}

/**
 * Snapshot template
 */
export interface SnapshotTemplate {
	/** Template name */
	name: string;

	/** File patterns to include */
	patterns: string[];

	/** Optional message */
	message?: string;

	/** Optional tags */
	tags?: string[];
}

/**
 * Main .snapbackrc configuration
 */
export interface SnapBackRC {
	/** Protection rules */
	protection?: ProtectionRule[];

	/** Patterns to ignore */
	ignore?: string[];

	/** Settings */
	settings?: SnapBackSettings;

	/** Policies */
	policies?: SnapBackPolicies;

	/** Hooks */
	hooks?: SnapBackHooks;

	/** Templates */
	templates?: SnapshotTemplate[];
}
