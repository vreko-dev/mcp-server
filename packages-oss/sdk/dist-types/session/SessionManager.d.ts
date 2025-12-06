/**
 * SessionManager - Tracks file changes during logical work sessions
 *
 * Design Principles:
 * - Lazy hash computation: Defer SHA-256 hashing until session finalize (<50ms tracking)
 * - POSIX path normalization: Store paths with / separator (cross-platform)
 * - Privacy-safe analytics: No workspace IDs, file paths, or file names transmitted
 * - Idle boundary detection: Auto-finalize after 15 minutes of inactivity
 * - Batch flushing: Persist changes every 50 changes or 5 seconds
 *
 * Performance Budgets:
 * - track(): <50ms (lazy hashing, in-memory buffering)
 * - finalize(): <500ms (batch hash computation, database flush)
 */
import type { ChangeOp, SessionManifestV1, SessionSummary } from "@snapback-oss/contracts/session";
import type { BlobStore } from "../storage/BlobStore";
/**
 * SessionManager configuration options
 */
export interface SessionManagerOptions {
    /** VS Code workspace folder URI (multi-root safe) */
    workspaceUri: string;
    /** Workspace root path (absolute file system path) */
    workspaceRoot: string;
    /** BlobStore for content-addressable storage */
    blobStore: BlobStore;
    /** Idle timeout in milliseconds (default: 15 minutes) */
    idleMs?: number;
    /** Batch size for flushing changes (default: 50) */
    flushBatchSize?: number;
    /** Flush interval in milliseconds (default: 5 seconds) */
    flushIntervalMs?: number;
    /** Ignore patterns (.snapbackignore) */
    ignorePatterns?: string[];
    /** User tier for analytics */
    tier?: "free" | "solo";
    /** Analytics consent (Solo tier only) */
    consent?: boolean;
    /** Database connection (SQLite) */
    db?: any;
    /** AI detection enabled flag (wired from settings) */
    aiDetectionEnabled?: boolean;
}
/**
 * SessionManager configuration options
 */
export interface SessionManagerOptions {
    /** VS Code workspace folder URI (multi-root safe) */
    workspaceUri: string;
    /** Workspace root path (absolute file system path) */
    workspaceRoot: string;
    /** BlobStore for content-addressable storage */
    blobStore: BlobStore;
    /** Idle timeout in milliseconds (default: 15 minutes) */
    idleMs?: number;
    /** Batch size for flushing changes (default: 50) */
    flushBatchSize?: number;
    /** Flush interval in milliseconds (default: 5 seconds) */
    flushIntervalMs?: number;
    /** Ignore patterns (.snapbackignore) */
    ignorePatterns?: string[];
    /** User tier for analytics */
    tier?: "free" | "solo";
    /** Analytics consent (Solo tier only) */
    consent?: boolean;
    /** Database connection (SQLite) */
    db?: any;
}
/**
 * SessionManager - Core session tracking implementation
 */
export declare class SessionManager {
    private readonly options;
    private activeSession;
    private idleTimer;
    private flushTimer;
    private aiTracker;
    private readonly idleMs;
    private readonly flushBatchSize;
    private readonly flushIntervalMs;
    private readonly ignorePatterns;
    private readonly tier;
    private readonly consent;
    constructor(options: SessionManagerOptions);
    /**
     * Run crash recovery on startup
     * Recovers any pending rollback transactions that were interrupted
     */
    private runCrashRecovery;
    /**
     * Start a new session
     */
    start(): Promise<{
        sessionId: string;
    }>;
    /**
     * Track a file change
     */
    track(absolutePath: string, op: ChangeOp, meta?: {
        fromPath?: string;
        oldUri?: string;
        newUri?: string;
        size?: number;
        mtime?: number;
        mode?: number;
    }): void;
    /**
     * Finalize the active session
     */
    finalize(): Promise<{
        sessionId: string;
        changeCount: number;
    }>;
    /**
     * Get current session status
     */
    current(): {
        sessionId: string | null;
        changeCount: number;
    };
    /**
     * List recent sessions
     */
    list(limit?: number): Promise<SessionSummary[]>;
    /**
     * Get session manifest
     */
    getManifest(sessionId: string): Promise<SessionManifestV1>;
    /**
     * Rollback a session to its starting state
     *
     * This is a wrapper that delegates to SessionRollback for the actual rollback logic.
     * Returns a Result type for safe error handling.
     */
    rollback(sessionId: string, options?: import("./SessionRollback.js").RollbackOptions): Promise<import("./SessionRollback.js").RollbackResult>;
    /**
     * Normalize path to POSIX-style relative path
     */
    private normalizePath;
    /**
     * Check if path should be ignored
     */
    private shouldIgnore;
    /**
     * Compute deferred SHA-256 hashes
     */
    private computeDeferredHashes;
    /**
     * Generate offline session name from file changes
     */
    private generateOfflineName;
    /**
     * Encode trigger set to bitmask
     */
    private encodeTriggers;
    /**
     * Decode bitmask to trigger array
     */
    private decodeTriggers;
    /**
     * Convert database row to SessionChange
     */
    private dbRowToSessionChange;
    /**
     * Start idle timer
     */
    private startIdleTimer;
    /**
     * Reset idle timer (activity detected)
     */
    private resetIdleTimer;
    /**
     * Start flush timer
     */
    private startFlushTimer;
    /**
     * Schedule a flush operation
     */
    private scheduleFlush;
    /**
     * Cancel all timers
     */
    private cancelTimers;
    /**
     * Auto-finalize on idle timeout
     */
    private autoFinalize;
    /**
     * Emit SESSION_STARTED analytics event
     */
    private emitSessionStarted;
    /**
     * Emit SESSION_FINALIZED analytics event
     */
    private emitSessionFinalized;
}
//# sourceMappingURL=SessionManager.d.ts.map