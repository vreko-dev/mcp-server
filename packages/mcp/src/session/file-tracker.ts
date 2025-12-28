/**
 * Session File Tracker
 *
 * Tracks which files have been accessed during a session.
 * Enables scoped review_work to only analyze files touched in the current task.
 *
 * Part of Session Feedback Implementation spec - scoped review.
 *
 * @module session/file-tracker
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Types of file operations tracked
 */
export type FileOperation = "read" | "write" | "create" | "delete";

/**
 * Record of file access during a session
 */
export interface SessionFileRecord {
	/** Absolute file path */
	filepath: string;
	/** When the file was first accessed in this session */
	firstTouched: Date;
	/** When the file was last accessed */
	lastTouched: Date;
	/** Types of operations performed on this file */
	operations: FileOperation[];
	/** Whether the file was AI-attributed (from extension) */
	aiAttributed: boolean;
}

// =============================================================================
// SESSION FILE TRACKER
// =============================================================================

/**
 * Tracks file access per session for scoped analysis.
 *
 * Each session (identified by taskId) maintains its own set of tracked files.
 * This enables review_work to only analyze files touched during the current task.
 */
export class SessionFileTracker {
	/**
	 * Map of session ID to file records
	 */
	private sessions: Map<string, Map<string, SessionFileRecord>> = new Map();

	/**
	 * Record a file access in a session
	 *
	 * @param sessionId - The session/task ID
	 * @param filepath - Absolute path to the file
	 * @param operation - Type of operation performed
	 * @param aiAttributed - Whether this was an AI-attributed change
	 */
	recordFileAccess(sessionId: string, filepath: string, operation: FileOperation, aiAttributed = false): void {
		if (!this.sessions.has(sessionId)) {
			this.sessions.set(sessionId, new Map());
		}

		const sessionFiles = this.sessions.get(sessionId)!;
		const existing = sessionFiles.get(filepath);
		const now = new Date();

		if (existing) {
			existing.lastTouched = now;
			if (!existing.operations.includes(operation)) {
				existing.operations.push(operation);
			}
			// Once AI-attributed, stays attributed
			if (aiAttributed) {
				existing.aiAttributed = true;
			}
		} else {
			sessionFiles.set(filepath, {
				filepath,
				firstTouched: now,
				lastTouched: now,
				operations: [operation],
				aiAttributed,
			});
		}
	}

	/**
	 * Get all file records for a session
	 *
	 * @param sessionId - The session/task ID
	 * @returns Array of file records, sorted by first touch time
	 */
	getSessionFiles(sessionId: string): SessionFileRecord[] {
		const sessionFiles = this.sessions.get(sessionId);
		if (!sessionFiles) return [];

		return Array.from(sessionFiles.values()).sort((a, b) => a.firstTouched.getTime() - b.firstTouched.getTime());
	}

	/**
	 * Get only files that were written/created in a session
	 *
	 * @param sessionId - The session/task ID
	 * @returns Array of file paths that were modified
	 */
	getWrittenFiles(sessionId: string): string[] {
		return this.getSessionFiles(sessionId)
			.filter((f) => f.operations.includes("write") || f.operations.includes("create"))
			.map((f) => f.filepath);
	}

	/**
	 * Get only files that were read (but not written) in a session
	 *
	 * @param sessionId - The session/task ID
	 * @returns Array of file paths that were only read
	 */
	getReadOnlyFiles(sessionId: string): string[] {
		return this.getSessionFiles(sessionId)
			.filter(
				(f) =>
					f.operations.includes("read") &&
					!f.operations.includes("write") &&
					!f.operations.includes("create"),
			)
			.map((f) => f.filepath);
	}

	/**
	 * Get AI-attributed files in a session
	 *
	 * @param sessionId - The session/task ID
	 * @returns Array of file paths with AI-attributed changes
	 */
	getAIAttributedFiles(sessionId: string): string[] {
		return this.getSessionFiles(sessionId)
			.filter((f) => f.aiAttributed)
			.map((f) => f.filepath);
	}

	/**
	 * Check if a file was accessed in a session
	 *
	 * @param sessionId - The session/task ID
	 * @param filepath - Path to check
	 * @returns True if the file was accessed
	 */
	wasFileAccessed(sessionId: string, filepath: string): boolean {
		const sessionFiles = this.sessions.get(sessionId);
		return sessionFiles?.has(filepath) ?? false;
	}

	/**
	 * Get file count for a session
	 *
	 * @param sessionId - The session/task ID
	 * @returns Number of files tracked
	 */
	getFileCount(sessionId: string): number {
		return this.sessions.get(sessionId)?.size ?? 0;
	}

	/**
	 * Clear all tracking for a session
	 *
	 * @param sessionId - The session/task ID
	 */
	clearSession(sessionId: string): void {
		this.sessions.delete(sessionId);
	}

	/**
	 * Get summary statistics for a session
	 *
	 * @param sessionId - The session/task ID
	 * @returns Summary of file operations
	 */
	getSessionSummary(sessionId: string): {
		totalFiles: number;
		filesWritten: number;
		filesRead: number;
		filesCreated: number;
		filesDeleted: number;
		aiAttributedFiles: number;
	} {
		const files = this.getSessionFiles(sessionId);

		return {
			totalFiles: files.length,
			filesWritten: files.filter((f) => f.operations.includes("write")).length,
			filesRead: files.filter((f) => f.operations.includes("read")).length,
			filesCreated: files.filter((f) => f.operations.includes("create")).length,
			filesDeleted: files.filter((f) => f.operations.includes("delete")).length,
			aiAttributedFiles: files.filter((f) => f.aiAttributed).length,
		};
	}

	/**
	 * Merge file tracking from another session (useful for session continuation)
	 *
	 * @param targetSessionId - Session to merge into
	 * @param sourceSessionId - Session to merge from
	 */
	mergeSessions(targetSessionId: string, sourceSessionId: string): void {
		const sourceFiles = this.getSessionFiles(sourceSessionId);

		for (const record of sourceFiles) {
			for (const op of record.operations) {
				this.recordFileAccess(targetSessionId, record.filepath, op, record.aiAttributed);
			}
		}
	}
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton file tracker instance for use across the MCP package
 */
export const fileTracker = new SessionFileTracker();
