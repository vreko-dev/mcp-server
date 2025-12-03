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

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type {
	ChangeOp,
	EOLType,
	SessionChange,
	SessionManifestV1,
	SessionSummary,
	SessionTrigger,
} from "@snapback-oss/contracts/session";
import { minimatch } from "minimatch";
import { AiSessionTracker } from "../ai/AiSessionTracker.js";
import { SimpleChangeTracker } from "../ai/SimpleChangeTracker.js";
import { CursorDetector } from "../core/detection/CursorDetector.js";
import type { BlobStore } from "../storage/BlobStore.js";
import { makeSafeSessionFinalizedEvent, makeSafeSessionStartedEvent } from "./sessionAnalytics.js";

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
	db?: any; // TODO: Type this properly with better-sqlite3

	/** AI detection enabled flag (wired from settings) */
	aiDetectionEnabled?: boolean;
}

/**
 * Factory function to create AI tracker with Cursor detector
 * Initializes tracker with AI detection enabled setting
 */
function createAiTracker(options: SessionManagerOptions): AiSessionTracker {
	// Create Cursor detector with system environment
	const cursorDetector = new CursorDetector({
		getAppName: () => {
			// In VS Code context, app name comes from vscode.env.appName
			// For testing, fall back to environment variable
			return process.env.VSCODE_APP_NAME || process.env.APP_NAME || "unknown";
		},
		getEnvVar: (key: string) => process.env[key],
	});

	// Environment detection function (Cursor detection)
	const detectEnv = () => {
		const cursorResult = cursorDetector.detect();

		// Return in AiEnvDetection format
		return {
			provider: cursorResult.hasCursor ? ("cursor" as const) : ("none" as const),
			hasAI: cursorResult.hasCursor,
			confidence: cursorResult.confidence,
		};
	};

	// Create SimpleChangeTracker internally
	const changeTracker = new SimpleChangeTracker();

	// Create tracker with AI detection enabled setting
	const tracker = new AiSessionTracker(
		detectEnv,
		changeTracker,
		options.aiDetectionEnabled ?? true, // Default: enabled
	);

	return tracker;
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
	db?: any; // TODO: Type this properly with better-sqlite3
}

/**
 * Session state for active session
 */
interface ActiveSessionState {
	sessionId: string;
	startedAt: number;
	triggers: Set<SessionTrigger>;
	changeBuffer: SessionChange[];
}

/**
 * SessionManager - Core session tracking implementation
 */
export class SessionManager {
	private activeSession: ActiveSessionState | null = null;
	private idleTimer: NodeJS.Timeout | null = null;
	private flushTimer: NodeJS.Timeout | null = null;
	private aiTracker: AiSessionTracker;

	private readonly idleMs: number;
	private readonly flushBatchSize: number;
	private readonly flushIntervalMs: number;
	private readonly ignorePatterns: string[];
	private readonly tier: "free" | "solo";
	private readonly consent: boolean;

	constructor(private readonly options: SessionManagerOptions) {
		this.idleMs = options.idleMs ?? 15 * 60_000; // 15 minutes
		this.flushBatchSize = options.flushBatchSize ?? 50;
		this.flushIntervalMs = options.flushIntervalMs ?? 5000; // 5 seconds
		this.tier = options.tier ?? "free";
		this.consent = options.consent ?? false;

		// Initialize AI tracker
		this.aiTracker = createAiTracker(options);

		// Default ignore patterns
		this.ignorePatterns = options.ignorePatterns ?? [
			"node_modules/**",
			".next/**",
			"dist/**",
			"build/**",
			"coverage/**",
			".git/**",
			"*.log",
			"*.tmp",
			"*.swp",
			".DS_Store",
		];

		// Run crash recovery on initialization (async, non-blocking)
		this.runCrashRecovery().catch((err) => {
			console.error("[SessionManager] Crash recovery failed:", err);
		});
	}

	/**
	 * Run crash recovery on startup
	 * Recovers any pending rollback transactions that were interrupted
	 */
	private async runCrashRecovery(): Promise<void> {
		const startTime = performance.now();

		const { SessionRecovery } = await import("./SessionRecovery.js");
		const recovery = new SessionRecovery(this.options.workspaceRoot);

		const results = await recovery.recoverAll();

		const duration = performance.now() - startTime;

		if (results.length > 0) {
			const recovered = results.filter((r) => r.status === "recovered").length;
			const failed = results.filter((r) => r.status === "failed").length;
			const totalFilesRestored = results.reduce((sum, r) => sum + r.filesRestored, 0);

			console.log(
				`[SessionManager] Recovery complete: ${recovered} recovered, ${failed} failed, ${totalFilesRestored} files restored (${duration.toFixed(0)}ms)`,
			);
		}
	}

	/**
	 * Start a new session
	 */
	async start(): Promise<{ sessionId: string }> {
		// If there's already an active session, finalize it first
		if (this.activeSession) {
			await this.finalize();
		}

		// Generate session ID
		const sessionId = createId();
		const startedAt = Date.now();

		// Initialize active session state
		this.activeSession = {
			sessionId,
			startedAt,
			triggers: new Set(["filewatch"]),
			changeBuffer: [],
		};

		// Insert into database (if available)
		if (this.options.db) {
			const triggerBitmask = this.encodeTriggers(this.activeSession.triggers);
			await this.options.db.run(
				`INSERT INTO sessions (session_id, workspace_uri, started_at, triggers, change_count)
         VALUES (?, ?, ?, ?, 0)`,
				[sessionId, this.options.workspaceUri, startedAt, triggerBitmask],
			);
		}

		// Start idle timer
		this.startIdleTimer();

		// Start flush timer
		this.startFlushTimer();

		// Start AI detection session
		this.aiTracker.startSession(sessionId);

		// Emit analytics: SESSION_STARTED
		this.emitSessionStarted();

		return { sessionId };
	}

	/**
	 * Track a file change
	 */
	track(
		absolutePath: string,
		op: ChangeOp,
		meta?: {
			fromPath?: string;
			oldUri?: string;
			newUri?: string;
			size?: number;
			mtime?: number;
			mode?: number;
		},
	): void {
		const startTime = performance.now();

		if (!this.activeSession) {
			// No active session - silently ignore
			return;
		}

		// Convert to relative POSIX path
		const relPath = this.normalizePath(absolutePath);

		// Check ignore patterns
		if (this.shouldIgnore(relPath)) {
			return;
		}

		// Extract fromPath for rename operations
		let fromPath: string | undefined;
		if (op === "renamed" && meta) {
			if (meta.fromPath) {
				fromPath = this.normalizePath(meta.fromPath);
			} else if (meta.oldUri) {
				// TODO: Parse VS Code URI properly
				// For now, assume it's a file:// URI
				const oldAbsPath = meta.oldUri.replace("file://", "");
				fromPath = this.normalizePath(oldAbsPath);
			}
		}

		// Create SessionChange (defer hash computation)
		const change: SessionChange = {
			p: relPath,
			op,
			from: fromPath,
			// Metadata captured immediately
			sizeAfter: meta?.size,
			mtimeAfter: meta?.mtime,
			modeAfter: meta?.mode,
			// Hashes computed during finalize
			// hOld: undefined,
			// hNew: undefined,
		};

		// Add to buffer
		this.activeSession.changeBuffer.push(change);

		// Record change in AI tracker
		this.aiTracker.recordChange({
			chars: change.sizeAfter ?? 0,
			lines: 1, // TODO: Parse actual line count from change
			isInsert: change.op === "created",
			isMultiLine: false, // TODO: Determine from content
		});

		// Reset idle timer (activity detected)
		this.resetIdleTimer();

		// Check if we should flush
		if (this.activeSession.changeBuffer.length >= this.flushBatchSize) {
			this.scheduleFlush();
		}

		const duration = performance.now() - startTime;
		if (duration > 10) {
			console.log(`[SessionManager] track() took ${duration.toFixed(1)}ms (op=${op})`);
		}
	}

	/**
	 * Finalize the active session
	 */
	async finalize(): Promise<{ sessionId: string; changeCount: number }> {
		const startTime = performance.now();

		if (!this.activeSession) {
			throw new Error("No active session to finalize");
		}

		const { sessionId, startedAt, triggers, changeBuffer } = this.activeSession;
		const changeCount = changeBuffer.length;
		const endedAt = Date.now();
		const durationMs = endedAt - startedAt;

		// Cancel timers
		this.cancelTimers();

		// Add manual trigger if explicitly finalized
		triggers.add("manual");

		// Compute deferred hashes (lazy computation)
		await this.computeDeferredHashes(changeBuffer);

		// Flush changes to database
		if (this.options.db && changeBuffer.length > 0) {
			const stmt = this.options.db.prepare(
				`INSERT INTO session_changes
         (session_id, rel_path, op, from_path, size_after, mtime_after, mode_after, h_old, h_new, eol_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			);

			for (const change of changeBuffer) {
				stmt.run(
					sessionId,
					change.p,
					change.op,
					change.from ?? null,
					change.sizeAfter ?? null,
					change.mtimeAfter ?? null,
					change.modeAfter ?? null,
					change.hOld ?? null,
					change.hNew ?? null,
					change.eolAfter ?? null,
				);
			}
		}

		// Update session in database
		if (this.options.db) {
			const triggerBitmask = this.encodeTriggers(triggers);

			// Finalize AI detection session and get results
			const aiResult = this.aiTracker.finalizeSession();

			// Update session with AI detection results
			await this.options.db.run(
				`UPDATE sessions
         SET ended_at = ?, change_count = ?, triggers = ?,
         ai_assist_level = ?, ai_confidence_score = ?, ai_provider = ?, ai_metadata = ?
         WHERE session_id = ?`,
				[
					endedAt,
					changeCount,
					triggerBitmask,
					aiResult.level,
					aiResult.confidence,
					aiResult.provider,
					JSON.stringify({
						reasoning: aiResult.reasoning,
						metrics: aiResult.metrics,
					}),
					sessionId,
				],
			);

			// Generate offline name
			const name = this.generateOfflineName(changeBuffer);
			await this.options.db.run("UPDATE sessions SET name = ? WHERE session_id = ?", [name, sessionId]);
		}

		// Emit analytics: SESSION_FINALIZED
		this.emitSessionFinalized(changeCount, durationMs, changeBuffer);

		// Clear active session
		this.activeSession = null;

		const totalDuration = performance.now() - startTime;
		console.log(
			`[SessionManager] finalize() took ${totalDuration.toFixed(0)}ms (sessionId=${sessionId}, changes=${changeCount})`,
		);

		return { sessionId, changeCount };
	}

	/**
	 * Get current session status
	 */
	current(): { sessionId: string | null; changeCount: number } {
		if (!this.activeSession) {
			return { sessionId: null, changeCount: 0 };
		}
		return {
			sessionId: this.activeSession.sessionId,
			changeCount: this.activeSession.changeBuffer.length,
		};
	}

	/**
	 * List recent sessions
	 */
	async list(limit = 20): Promise<SessionSummary[]> {
		if (!this.options.db) {
			return [];
		}

		const rows = await this.options.db.all(
			`SELECT session_id, workspace_uri, started_at, ended_at, name, triggers, change_count
       FROM sessions
       WHERE workspace_uri = ?
       ORDER BY started_at DESC
       LIMIT ?`,
			[this.options.workspaceUri, limit],
		);

		return rows.map((row: any) => ({
			sessionId: row.session_id,
			startedAt: new Date(row.started_at).toISOString(),
			endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : undefined,
			name: row.name,
			changeCount: row.change_count,
			triggers: this.decodeTriggers(row.triggers),
		}));
	}

	/**
	 * Get session manifest
	 */
	async getManifest(sessionId: string): Promise<SessionManifestV1> {
		if (!this.options.db) {
			throw new Error("Database not available");
		}

		// Get session metadata
		const session = await this.options.db.get("SELECT * FROM sessions WHERE session_id = ?", [sessionId]);

		if (!session) {
			throw new Error(`Session not found: ${sessionId}`);
		}

		// Get file changes
		const changes = await this.options.db.all("SELECT * FROM session_changes WHERE session_id = ? ORDER BY id", [
			sessionId,
		]);

		// Get linked snapshots
		const snapshots = await this.options.db.all("SELECT snapshot_id FROM session_snapshots WHERE session_id = ?", [
			sessionId,
		]);

		return {
			schema: "sb.session.v1",
			sessionId: session.session_id,
			startedAt: new Date(session.started_at).toISOString(),
			endedAt: session.ended_at ? new Date(session.ended_at).toISOString() : undefined,
			workspaceUri: session.workspace_uri,
			name: session.name,
			triggers: this.decodeTriggers(session.triggers),
			changeCount: session.change_count,
			filesChanged: changes.map((c: any) => this.dbRowToSessionChange(c)),
			snapshots: snapshots.map((s: any) => s.snapshot_id),
		};
	}

	/**
	 * Rollback a session to its starting state
	 *
	 * This is a wrapper that delegates to SessionRollback for the actual rollback logic.
	 * Returns a Result type for safe error handling.
	 */
	async rollback(
		sessionId: string,
		options?: import("./SessionRollback.js").RollbackOptions,
	): Promise<import("./SessionRollback.js").RollbackResult> {
		// Get session manifest
		const manifest = await this.getManifest(sessionId);

		// Import SessionRollback dynamically to avoid circular dependencies
		const { SessionRollback } = await import("./SessionRollback.js");

		// Create rollback instance
		const rollback = new SessionRollback(this.options.workspaceRoot, this.options.blobStore);

		// Execute rollback
		return rollback.rollback(manifest, options);
	}

	// =========================================================================
	// Private Helper Methods
	// =========================================================================

	/**
	 * Normalize path to POSIX-style relative path
	 */
	private normalizePath(absolutePath: string): string {
		const relPath = path.relative(this.options.workspaceRoot, absolutePath);
		// Convert Windows backslashes to forward slashes
		return relPath.split(path.sep).join("/");
	}

	/**
	 * Check if path should be ignored
	 */
	private shouldIgnore(relPath: string): boolean {
		return this.ignorePatterns.some((pattern) => minimatch(relPath, pattern, { dot: true }));
	}

	/**
	 * Compute deferred SHA-256 hashes
	 */
	private async computeDeferredHashes(changes: SessionChange[]): Promise<void> {
		for (const change of changes) {
			const absPath = path.join(this.options.workspaceRoot, change.p);

			try {
				// Compute hNew for created/modified files
				if (change.op !== "deleted") {
					const content = await fs.readFile(absPath);
					const result = await this.options.blobStore.put(content);
					if (result.ok) {
						change.hNew = result.value;
					}
				}

				// TODO: Compute hOld for modified/deleted files
				// This requires reading the old content from BlobStore or file backup
			} catch (error) {
				// File may have been deleted/moved - skip hash computation
				console.warn(`Failed to hash ${change.p}:`, error);
			}
		}
	}

	/**
	 * Generate offline session name from file changes
	 */
	private generateOfflineName(changes: SessionChange[]): string {
		if (changes.length === 0) {
			return "Empty session";
		}

		// Extract unique file stems (without extension)
		const stems = new Set<string>();
		for (const change of changes.slice(0, 10)) {
			const basename = path.basename(change.p, path.extname(change.p));
			stems.add(basename);
		}

		const stemList = Array.from(stems).slice(0, 3);
		if (stemList.length === 0) {
			return `Updated ${changes.length} files`;
		}

		return `Updated ${stemList.join(", ")}`;
	}

	/**
	 * Encode trigger set to bitmask
	 */
	private encodeTriggers(triggers: Set<SessionTrigger>): number {
		let mask = 0;
		for (const trigger of triggers) {
			if (trigger === "filewatch") {
				mask |= 1;
			}
			if (trigger === "pre-commit") {
				mask |= 2;
			}
			if (trigger === "manual") {
				mask |= 4;
			}
			if (trigger === "idle-finalize") {
				mask |= 8;
			}
		}
		return mask;
	}

	/**
	 * Decode bitmask to trigger array
	 */
	private decodeTriggers(mask: number): SessionTrigger[] {
		const triggers: SessionTrigger[] = [];
		if (mask & 1) {
			triggers.push("filewatch");
		}
		if (mask & 2) {
			triggers.push("pre-commit");
		}
		if (mask & 4) {
			triggers.push("manual");
		}
		if (mask & 8) {
			triggers.push("idle-finalize");
		}
		return triggers;
	}

	/**
	 * Convert database row to SessionChange
	 */
	private dbRowToSessionChange(row: any): SessionChange {
		return {
			p: row.rel_path,
			op: row.op as ChangeOp,
			from: row.from_path ?? undefined,
			hOld: row.h_old ?? undefined,
			hNew: row.h_new ?? undefined,
			sizeBefore: row.size_before ?? undefined,
			sizeAfter: row.size_after ?? undefined,
			mtimeBefore: row.mtime_before ?? undefined,
			mtimeAfter: row.mtime_after ?? undefined,
			modeBefore: row.mode_before ?? undefined,
			modeAfter: row.mode_after ?? undefined,
			eolBefore: row.eol_before as EOLType | undefined,
			eolAfter: row.eol_after as EOLType | undefined,
		};
	}

	/**
	 * Start idle timer
	 */
	private startIdleTimer(): void {
		this.idleTimer = setTimeout(() => {
			this.autoFinalize();
		}, this.idleMs);
	}

	/**
	 * Reset idle timer (activity detected)
	 */
	private resetIdleTimer(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
		}
		this.startIdleTimer();
	}

	/**
	 * Start flush timer
	 */
	private startFlushTimer(): void {
		this.flushTimer = setTimeout(() => {
			this.scheduleFlush();
		}, this.flushIntervalMs);
	}

	/**
	 * Schedule a flush operation
	 */
	private scheduleFlush(): void {
		// TODO: Implement periodic flushing to database
		// For now, we flush everything during finalize
	}

	/**
	 * Cancel all timers
	 */
	private cancelTimers(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = null;
		}
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
	}

	/**
	 * Auto-finalize on idle timeout
	 */
	private async autoFinalize(): Promise<void> {
		if (!this.activeSession) {
			return;
		}

		// Add idle-finalize trigger
		this.activeSession.triggers.add("idle-finalize");

		// Finalize session
		await this.finalize();
	}

	/**
	 * Emit SESSION_STARTED analytics event
	 */
	private emitSessionStarted(): void {
		const event = makeSafeSessionStartedEvent(this.tier);
		// TODO: Wire to actual analytics client when available
		console.log("[SessionManager] SESSION_STARTED:", event);
	}

	/**
	 * Emit SESSION_FINALIZED analytics event
	 */
	private emitSessionFinalized(changeCount: number, durationMs: number, changes: SessionChange[]): void {
		const event = makeSafeSessionFinalizedEvent(changeCount, durationMs, this.tier, this.consent, changes);
		// TODO: Wire to actual analytics client when available
		console.log("[SessionManager] SESSION_FINALIZED:", event);
	}
}
