/**
 * SessionCoordinator - Platform-agnostic session-aware snapshot management
 *
 * This module implements session tracking for SnapBack snapshots, enabling
 * point-in-time rollback of multiple files as a cohesive unit. It tracks
 * file changes over time and automatically groups them into sessions based
 * on activity patterns.
 *
 * Core Responsibilities:
 * - Track file changes as session candidates
 * - Detect session boundaries (idle gaps, window events, etc.)
 * - Finalize sessions and create session manifests
 * - Store session manifests in persistent storage
 *
 * Session Boundary Detection:
 * - Idle gaps (90-120s of inactivity)
 * - Window blur/focus events
 * - Task start/finish events
 * - Git commit events
 * - Maximum session duration exceeded
 *
 * @module SessionCoordinator
 */
import type { IEventEmitter, ILogger, ISessionStorage, ITimerService } from "./interfaces.js";
import type { SessionFinalizeReason, SessionId, SessionManifest } from "./types.js";
/**
 * Configuration for session detection
 */
export interface SessionCoordinatorConfig {
    /** Idle timeout in milliseconds (default: 105 seconds) */
    idleTimeout?: number;
    /** Minimum session duration in milliseconds (default: 5 seconds) */
    minSessionDuration?: number;
    /** Maximum session duration in milliseconds (default: 1 hour) */
    maxSessionDuration?: number;
    /** Interval to check for long sessions in milliseconds (default: 5 minutes) */
    longSessionCheckInterval?: number;
}
/**
 * Constructor options for SessionCoordinator
 */
export interface SessionCoordinatorOptions {
    /** Storage adapter for persisting session manifests (required) */
    storage: ISessionStorage;
    /** Timer service for scheduling timeouts/intervals (optional) */
    timers?: ITimerService;
    /** Logger for debug/info/error messages (optional) */
    logger?: ILogger;
    /** Event emitter for session finalized events (optional) */
    eventEmitter?: IEventEmitter<SessionManifest>;
    /** Configuration overrides (optional) */
    config?: SessionCoordinatorConfig;
}
/**
 * SessionCoordinator - Coordinates session-aware snapshot creation
 *
 * This class manages the lifecycle of sessions, tracking file changes
 * and determining when to finalize sessions based on various triggers.
 */
export declare class SessionCoordinator {
    /** Map of active session candidates by file URI */
    private candidates;
    /** Timeout ID for idle detection */
    private idleTimeoutId;
    /** Interval ID for long session checking */
    private longSessionIntervalId;
    /** Current session start time */
    private sessionStart;
    /** Storage adapter */
    private storage;
    /** Timer service */
    private timers;
    /** Logger */
    private logger;
    /** Event emitter (optional) */
    private eventEmitter?;
    /** Configuration */
    private config;
    /**
     * Creates a new SessionCoordinator
     *
     * @param options - Configuration options
     */
    constructor(options: SessionCoordinatorOptions);
    /**
     * Add or update a file candidate in the current session
     *
     * @param uri - URI of the file
     * @param snapshotId - ID of the snapshot for this file
     * @param stats - Optional change statistics
     */
    addCandidate(uri: string, snapshotId: string, stats?: {
        added: number;
        deleted: number;
    }): void;
    /**
     * Finalize the current session with a specific reason
     *
     * @param reason - Reason for finalizing the session
     * @returns Session ID if finalized, null if skipped
     */
    finalizeSession(reason: SessionFinalizeReason): Promise<SessionId | null>;
    /**
     * Handle window blur event - finalize session due to window focus change
     */
    handleWindowBlur(): void;
    /**
     * Handle git commit event - finalize session due to git commit
     */
    handleGitCommit(): void;
    /**
     * Handle task completion event - finalize session due to task completion
     */
    handleTaskCompletion(): void;
    /**
     * Handle manual session finalization
     */
    handleManualFinalization(): void;
    /**
     * Handle idle timeout - finalize session due to inactivity
     */
    private handleIdleTimeout;
    /**
     * Check for long-running sessions and finalize them if needed
     */
    private checkLongSession;
    /**
     * Reset the idle timer
     */
    private resetIdleTimer;
    /**
     * Start monitoring for long sessions
     */
    private startLongSessionMonitoring;
    /**
     * Reset session state for the next session
     */
    private resetSession;
    /**
     * Store session manifest in persistent storage
     *
     * @param manifest - Session manifest to store
     */
    private storeSessionManifest;
    /**
     * Get the number of active candidates (for testing)
     */
    getCandidateCount(): number;
    /**
     * Get the session start time (for testing)
     */
    getSessionStart(): number;
    /**
     * Dispose of the session coordinator and clean up resources
     */
    dispose(): void;
}
//# sourceMappingURL=SessionCoordinator.d.ts.map