/**
 * Session Types - Data structures for session-aware snapshots
 *
 * This module defines the core data structures for implementing session-aware
 * snapshots that enable multi-file, point-in-time rollback functionality.
 *
 * Design Principles:
 * - Immutable data structures for consistency
 * - TypeScript-first design with strict typing
 * - Minimal data footprint for performance
 * - Extensible for future enhancements
 */

/**
 * Unique identifier for a session
 */
export type SessionId = string;

/**
 * Reason why a session was finalized
 */
export type SessionFinalizeReason =
	| "idle-break" // Session ended due to inactivity
	| "blur" // Session ended due to window blur/focus
	| "commit" // Session ended due to git commit
	| "task" // Session ended due to task completion
	| "manual" // Session manually finalized
	| "max-duration"; // Session ended due to exceeding maximum duration

/**
 * Information about a file in a session
 */
export interface SessionFileEntry {
	/** URI of the file */
	uri: string;

	/** ID of the snapshot for this file */
	snapshotId: string;

	/** Optional change statistics */
	changeStats?: {
		/** Number of lines added */
		added: number;

		/** Number of lines deleted */
		deleted: number;
	};
}

/**
 * Session manifest representing a point-in-time collection of file snapshots
 */
export interface SessionManifest {
	/** Unique identifier for the session */
	id: SessionId;

	/** Timestamp when the session started (epoch ms) */
	startedAt: number;

	/** Timestamp when the session ended (epoch ms) */
	endedAt: number;

	/** Reason why the session was finalized */
	reason: SessionFinalizeReason;

	/** Files included in this session */
	files: SessionFileEntry[];

	/** Optional human-readable summary */
	summary?: string;

	/** Optional tags for categorization */
	tags?: string[];
}

/**
 * Candidate entry for a file that may be included in a session
 */
export interface SessionCandidate {
	/** URI of the file */
	uri: string;

	/** ID of the snapshot for this file */
	snapshotId: string;

	/** Change statistics */
	stats?: {
		/** Number of lines added */
		added: number;

		/** Number of lines deleted */
		deleted: number;
	};

	/** Timestamp when this entry was last updated */
	updatedAt: number;
}
