/**
 * SessionRollback - Per-file atomic session rollback with journal-based crash safety
 *
 * Design Principles:
 * - Per-file atomic swap: Individual .bak-{sessionId} files instead of full workspace backup
 * - Journal-based recovery: .sb_journal tracks all file operations for crash safety
 * - Cross-platform: EXDEV fallback for Windows cross-device moves
 * - Privacy-safe: No file paths or content transmitted in analytics
 *
 * Performance:
 * - Staging validation: <500ms for typical sessions (<100 files)
 * - Per-file swap: Atomic rename operations (milliseconds per file)
 * - Rollback recovery: Journal replay on crash (automatic on next startup)
 */
import type { SessionChange, SessionManifestV1 } from "@snapback-oss/contracts/session";
import type { BlobStore } from "../storage/BlobStore.js";
/**
 * Rollback options
 */
export interface RollbackOptions {
    /** Progress callback (0-100) */
    onProgress?: (percent: number) => void;
    /** Dry run mode: validate without applying changes */
    dryRun?: boolean;
    /** Skip hash verification (faster but less safe) */
    skipVerification?: boolean;
}
/**
 * Rollback result
 */
export interface RollbackResult {
    /** Whether the rollback succeeded */
    success: boolean;
    /** Files successfully reverted */
    filesReverted: string[];
    /** Files skipped due to conflicts or missing blobs */
    filesSkipped: string[];
    /** Errors encountered during rollback */
    errors: Array<{
        path: string;
        error: string;
    }>;
    /** Path to journal file (for manual recovery if needed) */
    journalPath?: string;
}
/**
 * Journal entry for crash recovery
 */
interface JournalEntry {
    sessionId: string;
    timestamp: number;
    workspaceRoot: string;
    changes: SessionChange[];
    backups: Array<{
        original: string;
        backup: string;
    }>;
    status: "pending" | "committed" | "rolled-back";
}
/**
 * SessionRollback - Implements selective session-scoped file restoration
 */
export declare class SessionRollback {
    private readonly workspaceRoot;
    private readonly blobStore;
    private readonly journalDir;
    constructor(workspaceRoot: string, blobStore: BlobStore, journalDir?: string);
    /**
     * Rollback a session to its starting state
     */
    rollback(manifest: SessionManifestV1, options?: RollbackOptions): Promise<RollbackResult>;
    /**
     * Reverse changes to get inverse operations
     */
    private reverseChanges;
    /**
     * Stage a change for rollback
     */
    private stageChange;
    /**
     * Validate staging directory (verify hashes)
     */
    private validateStaging;
    /**
     * Perform per-file atomic swap
     */
    private atomicSwap;
    /**
     * Safe file rename with EXDEV fallback (cross-device support for Windows)
     */
    private safeRename;
    /**
     * Clean up staging directory
     */
    private cleanupStaging;
    /**
     * Get pending journal entries (for recovery)
     */
    getPendingJournals(): Promise<JournalEntry[]>;
}
export {};
//# sourceMappingURL=SessionRollback.d.ts.map