/**
 * SessionRecovery - Journal-based crash recovery for session rollbacks
 *
 * Design Principles:
 * - Automatic recovery on startup: Check for pending journals and recover
 * - Per-file backup tracking: Restore from individual .bak-{sessionId} files
 * - Safe cleanup: Only delete backups after successful recovery
 * - Privacy-safe logging: No file paths or content in telemetry
 *
 * Recovery Scenarios:
 * 1. Pending journal with backups → Rollback incomplete transaction
 * 2. Pending journal without backups → Transaction never started, safe to delete
 * 3. Committed journal → Cleanup only (already successful)
 */
/**
 * Journal entry structure (matches SessionRollback)
 */
interface JournalEntry {
	sessionId: string;
	timestamp: number;
	workspaceRoot: string;
	changes: any[];
	backups: Array<{
		original: string;
		backup: string;
	}>;
	status: "pending" | "committed" | "rolled-back";
}
/**
 * Recovery result for a single journal
 */
export interface RecoveryResult {
	sessionId: string;
	status: "recovered" | "cleaned" | "failed";
	filesRestored: number;
	error?: string;
}
/**
 * SessionRecovery - Handles crash recovery for session rollbacks
 */
export declare class SessionRecovery {
	private readonly workspaceRoot;
	private readonly journalDir;
	constructor(workspaceRoot: string, journalDir?: string);
	/**
	 * Recover all pending transactions
	 *
	 * Call this on startup to ensure workspace consistency after crashes
	 */
	recoverAll(): Promise<RecoveryResult[]>;
	/**
	 * Recover a single journal entry
	 */
	private recoverJournal;
	/**
	 * Check if any backup files exist
	 */
	private checkBackupsExist;
	/**
	 * Rollback from per-file backups
	 */
	private rollbackFromBackups;
	/**
	 * Safe file rename with EXDEV fallback (cross-device support for Windows)
	 */
	private safeRename;
	/**
	 * Cleanup old committed journals (older than 7 days)
	 */
	private cleanupOldJournals;
	/**
	 * Emit recovery telemetry (privacy-safe: no file paths)
	 */
	private emitRecoveryTelemetry;
	/**
	 * Manual recovery: Get list of pending journals
	 */
	listPendingJournals(): Promise<JournalEntry[]>;
	/**
	 * Manual recovery: Force recover a specific journal
	 */
	recoverJournalById(sessionId: string): Promise<RecoveryResult>;
	/**
	 * Manual recovery: Delete a specific journal without recovery
	 */
	deleteJournal(sessionId: string): Promise<void>;
	/**
	 * Cleanup all orphaned backup files (.bak-* files)
	 */
	cleanupOrphanedBackups(): Promise<number>;
	/**
	 * Find orphaned backup files (*.bak-* pattern)
	 */
	private findOrphanedBackups;
}
//# sourceMappingURL=SessionRecovery.d.ts.map
