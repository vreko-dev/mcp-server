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

import { randomUUID } from "node:crypto";
import { THRESHOLDS } from "../../config/Thresholds.js";
import type { IEventEmitter, ILogger, ISessionStorage, ITimerService } from "./interfaces.js";
import { NodeTimerService, NoOpLogger } from "./interfaces.js";
import type { SessionCandidate, SessionFinalizeReason, SessionId, SessionManifest } from "./types.js";

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
 * Default configuration values
 * Uses centralized THRESHOLDS from SDK config (Phase 15)
 */
const DEFAULT_CONFIG: Required<SessionCoordinatorConfig> = {
	idleTimeout: THRESHOLDS.session.idleTimeout,
	minSessionDuration: THRESHOLDS.session.minSessionDuration,
	maxSessionDuration: THRESHOLDS.session.maxSessionDuration,
	longSessionCheckInterval: 300000, // 5 minutes (not in THRESHOLDS yet)
};

/**
 * SessionCoordinator - Coordinates session-aware snapshot creation
 *
 * This class manages the lifecycle of sessions, tracking file changes
 * and determining when to finalize sessions based on various triggers.
 */
export class SessionCoordinator {
	/** Map of active session candidates by file URI */
	private candidates = new Map<string, SessionCandidate>();

	/** Timeout ID for idle detection */
	private idleTimeoutId: string | null = null;

	/** Interval ID for long session checking */
	private longSessionIntervalId: string | null = null;

	/** Current session start time */
	private sessionStart: number = Date.now();

	/** Storage adapter */
	private storage: ISessionStorage;

	/** Timer service */
	private timers: ITimerService;

	/** Logger */
	private logger: ILogger;

	/** Event emitter (optional) */
	private eventEmitter?: IEventEmitter<SessionManifest>;

	/** Configuration */
	private config: Required<SessionCoordinatorConfig>;

	/**
	 * Creates a new SessionCoordinator
	 *
	 * @param options - Configuration options
	 */
	constructor(options: SessionCoordinatorOptions) {
		this.storage = options.storage;
		this.timers = options.timers || new NodeTimerService();
		this.logger = options.logger || new NoOpLogger();
		this.eventEmitter = options.eventEmitter;
		this.config = { ...DEFAULT_CONFIG, ...options.config };

		this.sessionStart = Date.now();

		// Start idle detection
		this.resetIdleTimer();

		// Start long session monitoring
		this.startLongSessionMonitoring();
	}

	/**
	 * Add or update a file candidate in the current session
	 *
	 * @param uri - URI of the file
	 * @param snapshotId - ID of the snapshot for this file
	 * @param stats - Optional change statistics
	 */
	addCandidate(uri: string, snapshotId: string, stats?: { added: number; deleted: number }): void {
		const candidate: SessionCandidate = {
			uri,
			snapshotId,
			stats,
			updatedAt: Date.now(),
		};

		this.candidates.set(uri, candidate);
		this.resetIdleTimer();

		this.logger.debug("Added session candidate", { uri, snapshotId });
	}

	/**
	 * Finalize the current session with a specific reason
	 *
	 * @param reason - Reason for finalizing the session
	 * @returns Session ID if finalized, null if skipped
	 */
	async finalizeSession(reason: SessionFinalizeReason): Promise<SessionId | null> {
		try {
			const now = Date.now();
			const sessionDuration = now - this.sessionStart;

			// Don't create sessions that are too short
			if (sessionDuration < this.config.minSessionDuration && this.candidates.size === 0) {
				this.logger.debug("Skipping session finalization - session too short or no candidates", {
					duration: sessionDuration,
					candidateCount: this.candidates.size,
				});
				this.resetSession();
				return null;
			}

			// Create session manifest
			const sessionId: SessionId = `session-${randomUUID()}`;

			const manifest: SessionManifest = {
				id: sessionId,
				startedAt: this.sessionStart,
				endedAt: now,
				reason,
				files: Array.from(this.candidates.values()).map((candidate) => ({
					uri: candidate.uri,
					snapshotId: candidate.snapshotId,
					changeStats: candidate.stats,
				})),
				tags: [],
			};

			try {
				// Store the session manifest
				await this.storeSessionManifest(manifest);

				// Emit event if emitter is available
				if (this.eventEmitter) {
					this.eventEmitter.fire(manifest);
				}

				this.logger.info("Session finalized", {
					sessionId,
					reason,
					fileCount: manifest.files.length,
					duration: sessionDuration,
				});

				// Reset for next session
				this.resetSession();

				return sessionId;
			} catch (error) {
				this.logger.error(
					`Failed to finalize session: ${error instanceof Error ? error.message : String(error)}`,
					error instanceof Error ? error : undefined,
					{
						sessionId,
					},
				);
				return null;
			}
		} catch (error) {
			this.logger.error("Unexpected error in finalizeSession", error instanceof Error ? error : undefined);
			return null;
		}
	}

	/**
	 * Handle window blur event - finalize session due to window focus change
	 */
	handleWindowBlur(): void {
		this.finalizeSession("blur");
	}

	/**
	 * Handle git commit event - finalize session due to git commit
	 */
	handleGitCommit(): void {
		this.finalizeSession("commit");
	}

	/**
	 * Handle task completion event - finalize session due to task completion
	 */
	handleTaskCompletion(): void {
		this.finalizeSession("task");
	}

	/**
	 * Handle manual session finalization
	 */
	handleManualFinalization(): void {
		this.finalizeSession("manual");
	}

	/**
	 * Handle idle timeout - finalize session due to inactivity
	 */
	private handleIdleTimeout(): void {
		if (this.candidates.size > 0) {
			this.finalizeSession("idle-break");
		} else {
			// Just reset the session start time if no candidates
			this.sessionStart = Date.now();
		}
	}

	/**
	 * Check for long-running sessions and finalize them if needed
	 */
	private checkLongSession(): void {
		const now = Date.now();
		const sessionDuration = now - this.sessionStart;

		if (sessionDuration > this.config.maxSessionDuration && this.candidates.size > 0) {
			this.logger.info("Finalizing long-running session", {
				duration: sessionDuration,
				maxDuration: this.config.maxSessionDuration,
				candidateCount: this.candidates.size,
			});
			this.finalizeSession("max-duration");
		}
	}

	/**
	 * Reset the idle timer
	 */
	private resetIdleTimer(): void {
		if (this.idleTimeoutId) {
			this.timers.clearTimeout(this.idleTimeoutId);
		}

		this.idleTimeoutId = this.timers.setTimeout(() => {
			this.handleIdleTimeout();
		}, this.config.idleTimeout);
	}

	/**
	 * Start monitoring for long sessions
	 */
	private startLongSessionMonitoring(): void {
		this.longSessionIntervalId = this.timers.setInterval(() => {
			this.checkLongSession();
		}, this.config.longSessionCheckInterval);
	}

	/**
	 * Reset session state for the next session
	 */
	private resetSession(): void {
		this.candidates.clear();
		this.sessionStart = Date.now();

		if (this.idleTimeoutId) {
			this.timers.clearTimeout(this.idleTimeoutId);
		}
		this.resetIdleTimer();
	}

	/**
	 * Store session manifest in persistent storage
	 *
	 * @param manifest - Session manifest to store
	 */
	private async storeSessionManifest(manifest: SessionManifest): Promise<void> {
		try {
			await this.storage.storeSessionManifest(manifest);
			this.logger.debug("Stored session manifest", {
				sessionId: manifest.id,
				fileCount: manifest.files.length,
			});
		} catch (error) {
			this.logger.error(
				"Failed to store session manifest",
				error instanceof Error ? error : new Error(String(error)),
				{
					sessionId: manifest.id,
				},
			);
			// Re-throw to allow caller to handle
			throw error;
		}
	}

	/**
	 * Get the number of active candidates (for testing)
	 */
	getCandidateCount(): number {
		return this.candidates.size;
	}

	/**
	 * Get the session start time (for testing)
	 */
	getSessionStart(): number {
		return this.sessionStart;
	}

	/**
	 * Dispose of the session coordinator and clean up resources
	 */
	dispose(): void {
		if (this.idleTimeoutId) {
			this.timers.clearTimeout(this.idleTimeoutId);
		}
		if (this.longSessionIntervalId) {
			this.timers.clearInterval(this.longSessionIntervalId);
		}
		if (this.eventEmitter) {
			this.eventEmitter.dispose();
		}
	}
}
