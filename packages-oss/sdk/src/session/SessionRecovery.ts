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

import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Journal entry structure (matches SessionRollback)
 */
interface JournalEntry {
	sessionId: string;
	timestamp: number;
	workspaceRoot: string;
	changes: any[];
	backups: Array<{ original: string; backup: string }>;
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
export class SessionRecovery {
	constructor(
		private readonly workspaceRoot: string,
		private readonly journalDir: string = path.join(workspaceRoot, ".sb_journal"),
	) {}

	/**
	 * Recover all pending transactions
	 *
	 * Call this on startup to ensure workspace consistency after crashes
	 */
	async recoverAll(): Promise<RecoveryResult[]> {
		const results: RecoveryResult[] = [];

		try {
			const pendingDir = path.join(this.journalDir, "pending");

			// Check if journal directory exists
			if (!existsSync(pendingDir)) {
				return results;
			}

			// Read all pending journal files
			const files = await fs.readdir(pendingDir);

			for (const file of files) {
				if (!file.endsWith(".json")) {
					continue;
				}

				const filePath = path.join(pendingDir, file);

				try {
					const content = await fs.readFile(filePath, "utf-8");
					const journal = JSON.parse(content) as JournalEntry;

					const result = await this.recoverJournal(journal, filePath);
					results.push(result);
				} catch (error) {
					results.push({
						sessionId: path.basename(file, ".json"),
						status: "failed",
						filesRestored: 0,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Cleanup old committed journals (older than 7 days)
			await this.cleanupOldJournals();

			return results;
		} catch (error) {
			console.error("[SessionRecovery] Failed to recover transactions:", error);
			return results;
		}
	}

	/**
	 * Recover a single journal entry
	 */
	private async recoverJournal(journal: JournalEntry, journalPath: string): Promise<RecoveryResult> {
		const result: RecoveryResult = {
			sessionId: journal.sessionId,
			status: "cleaned",
			filesRestored: 0,
		};

		try {
			// Check if any backups exist
			const backupExists = await this.checkBackupsExist(journal.backups);

			if (!backupExists) {
				// No backups = transaction never started or already completed
				// Safe to delete journal
				await fs.unlink(journalPath);
				result.status = "cleaned";
				return result;
			}

			// Rollback incomplete transaction by restoring from backups
			const restoredCount = await this.rollbackFromBackups(journal.backups);

			result.filesRestored = restoredCount;
			result.status = "recovered";

			// Delete journal after successful recovery
			await fs.unlink(journalPath);

			// Emit telemetry (privacy-safe: no file paths)
			this.emitRecoveryTelemetry(journal.sessionId, restoredCount);

			return result;
		} catch (error) {
			result.status = "failed";
			result.error = error instanceof Error ? error.message : String(error);

			// Keep journal for manual recovery
			console.error(`[SessionRecovery] Failed to recover ${journal.sessionId}:`, error);

			return result;
		}
	}

	/**
	 * Check if any backup files exist
	 */
	private async checkBackupsExist(backups: Array<{ original: string; backup: string }>): Promise<boolean> {
		for (const backup of backups) {
			if (existsSync(backup.backup)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Rollback from per-file backups
	 */
	private async rollbackFromBackups(backups: Array<{ original: string; backup: string }>): Promise<number> {
		let restoredCount = 0;

		for (const { original, backup } of backups) {
			try {
				// Only restore if backup exists
				if (!existsSync(backup)) {
					continue;
				}

				// Restore from backup
				await this.safeRename(backup, original);
				restoredCount++;

				// Delete backup file
				if (existsSync(backup)) {
					await fs.unlink(backup);
				}
			} catch (error) {
				console.error(`[SessionRecovery] Failed to restore ${original}:`, error);
				// Continue with other files
			}
		}

		return restoredCount;
	}

	/**
	 * Safe file rename with EXDEV fallback (cross-device support for Windows)
	 */
	private async safeRename(src: string, dst: string): Promise<void> {
		try {
			await fs.rename(src, dst);
		} catch (error: any) {
			// EXDEV: Cross-device link error (Windows different drives)
			if (error.code === "EXDEV") {
				await fs.copyFile(src, dst);
				await fs.unlink(src);
			} else {
				throw error;
			}
		}
	}

	/**
	 * Cleanup old committed journals (older than 7 days)
	 */
	private async cleanupOldJournals(): Promise<void> {
		try {
			const committedDir = path.join(this.journalDir, "committed");

			if (!existsSync(committedDir)) {
				return;
			}

			const files = await fs.readdir(committedDir);
			const now = Date.now();
			const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

			for (const file of files) {
				if (!file.endsWith(".json")) {
					continue;
				}

				const filePath = path.join(committedDir, file);

				try {
					const content = await fs.readFile(filePath, "utf-8");
					const journal = JSON.parse(content) as JournalEntry;

					// Delete if older than 7 days
					if (now - journal.timestamp > sevenDaysMs) {
						await fs.unlink(filePath);
					}
				} catch {
					// Ignore errors for individual files
				}
			}
		} catch {
			// Ignore cleanup errors
		}
	}

	/**
	 * Emit recovery telemetry (privacy-safe: no file paths)
	 */
	private emitRecoveryTelemetry(_sessionId: string, _filesRestored: number): void {
		// TODO: Emit to analytics client
		// {
		//   event: 'SESSION_RECOVERY',
		//   sessionId: '[redacted]',
		//   filesRestored,
		//   timestamp: Date.now(),
		// }
	}

	/**
	 * Manual recovery: Get list of pending journals
	 */
	async listPendingJournals(): Promise<JournalEntry[]> {
		const pendingDir = path.join(this.journalDir, "pending");

		try {
			if (!existsSync(pendingDir)) {
				return [];
			}

			const files = await fs.readdir(pendingDir);
			const journals: JournalEntry[] = [];

			for (const file of files) {
				if (!file.endsWith(".json")) {
					continue;
				}

				const filePath = path.join(pendingDir, file);
				const content = await fs.readFile(filePath, "utf-8");
				const journal = JSON.parse(content) as JournalEntry;
				journals.push(journal);
			}

			return journals;
		} catch {
			return [];
		}
	}

	/**
	 * Manual recovery: Force recover a specific journal
	 */
	async recoverJournalById(sessionId: string): Promise<RecoveryResult> {
		const journalPath = path.join(this.journalDir, "pending", `${sessionId}.json`);

		if (!existsSync(journalPath)) {
			return {
				sessionId,
				status: "failed",
				filesRestored: 0,
				error: "Journal not found",
			};
		}

		const content = await fs.readFile(journalPath, "utf-8");
		const journal = JSON.parse(content) as JournalEntry;

		return this.recoverJournal(journal, journalPath);
	}

	/**
	 * Manual recovery: Delete a specific journal without recovery
	 */
	async deleteJournal(sessionId: string): Promise<void> {
		const pendingPath = path.join(this.journalDir, "pending", `${sessionId}.json`);
		const committedPath = path.join(this.journalDir, "committed", `${sessionId}.json`);

		if (existsSync(pendingPath)) {
			await fs.unlink(pendingPath);
		}

		if (existsSync(committedPath)) {
			await fs.unlink(committedPath);
		}
	}

	/**
	 * Cleanup all orphaned backup files (.bak-* files)
	 */
	async cleanupOrphanedBackups(): Promise<number> {
		let cleanedCount = 0;

		try {
			// Walk workspace directory tree
			const orphanedBackups = await this.findOrphanedBackups(this.workspaceRoot);

			for (const backupPath of orphanedBackups) {
				try {
					await fs.unlink(backupPath);
					cleanedCount++;
				} catch {
					// Ignore errors for individual files
				}
			}

			return cleanedCount;
		} catch {
			return cleanedCount;
		}
	}

	/**
	 * Find orphaned backup files (*.bak-* pattern)
	 */
	private async findOrphanedBackups(dir: string): Promise<string[]> {
		const backups: string[] = [];

		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				// Skip .git, node_modules, etc.
				if (entry.isDirectory()) {
					if (
						entry.name === ".git" ||
						entry.name === "node_modules" ||
						entry.name === ".next" ||
						entry.name === "dist" ||
						entry.name === "build"
					) {
						continue;
					}

					// Recurse into subdirectories
					const subBackups = await this.findOrphanedBackups(fullPath);
					backups.push(...subBackups);
				} else if (entry.name.includes(".bak-")) {
					// Found a backup file
					backups.push(fullPath);
				}
			}
		} catch {
			// Ignore errors for individual directories
		}

		return backups;
	}
}
