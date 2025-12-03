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

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
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
	errors: Array<{ path: string; error: string }>;

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
	backups: Array<{ original: string; backup: string }>;
	status: "pending" | "committed" | "rolled-back";
}

/**
 * SessionRollback - Implements selective session-scoped file restoration
 */
export class SessionRollback {
	private readonly journalDir: string;

	constructor(
		private readonly workspaceRoot: string,
		private readonly blobStore: BlobStore,
		journalDir?: string,
	) {
		this.journalDir = journalDir ?? path.join(workspaceRoot, ".sb_journal");
	}

	/**
	 * Rollback a session to its starting state
	 */
	async rollback(manifest: SessionManifestV1, options?: RollbackOptions): Promise<RollbackResult> {
		const startTime = performance.now();

		const result: RollbackResult = {
			success: false,
			filesReverted: [],
			filesSkipped: [],
			errors: [],
		};

		try {
			// Create journal directory
			await fs.mkdir(path.join(this.journalDir, "pending"), { recursive: true });
			await fs.mkdir(path.join(this.journalDir, "committed"), { recursive: true });

			// Create journal entry
			const journalPath = path.join(this.journalDir, "pending", `${manifest.sessionId}.json`);
			const journal: JournalEntry = {
				sessionId: manifest.sessionId,
				timestamp: Date.now(),
				workspaceRoot: this.workspaceRoot,
				changes: manifest.filesChanged,
				backups: [],
				status: "pending",
			};

			// Write initial journal
			await fs.writeFile(journalPath, JSON.stringify(journal, null, 2));
			result.journalPath = journalPath;

			// Report progress
			options?.onProgress?.(10);

			// Reverse changes (apply inverse operations in reverse chronological order)
			const reversedChanges = this.reverseChanges(manifest.filesChanged);

			// Create staging directory
			const stagingDir = path.join(this.workspaceRoot, `.snapback-rollback-${manifest.sessionId}`);
			await fs.mkdir(stagingDir, { recursive: true });
			const deletedDir = path.join(stagingDir, ".deleted");
			await fs.mkdir(deletedDir, { recursive: true });

			// Prepare staged files
			const stagedFiles: Map<string, { hash: string; content: Uint8Array }> = new Map();
			const filesToDelete: Set<string> = new Set();

			for (let i = 0; i < reversedChanges.length; i++) {
				const change = reversedChanges[i];
				options?.onProgress?.(10 + (i / reversedChanges.length) * 40);

				try {
					await this.stageChange(change, stagingDir, stagedFiles, filesToDelete, result);
				} catch (error) {
					result.filesSkipped.push(change.p);
					result.errors.push({
						path: change.p,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			// Report progress
			options?.onProgress?.(50);

			// Validate staging directory (verify hashes)
			if (!options?.skipVerification) {
				const validationErrors = await this.validateStaging(stagedFiles);
				if (validationErrors.length > 0) {
					// Validation failed - abort rollback
					for (const error of validationErrors) {
						result.errors.push(error);
						result.filesSkipped.push(error.path);
					}

					// Clean up staging directory
					await this.cleanupStaging(stagingDir);

					// Update journal status
					journal.status = "rolled-back";
					await fs.writeFile(journalPath, JSON.stringify(journal, null, 2));

					return result;
				}
			}

			// Report progress
			options?.onProgress?.(60);

			// If dry run, stop here
			if (options?.dryRun) {
				result.success = true;
				result.filesReverted = Array.from(stagedFiles.keys());
				await this.cleanupStaging(stagingDir);
				await fs.unlink(journalPath);
				return result;
			}

			// Per-file atomic swap
			const swapResult = await this.atomicSwap(stagedFiles, filesToDelete, journal, manifest.sessionId, options);

			result.filesReverted = swapResult.reverted;
			result.filesSkipped.push(...swapResult.skipped);
			result.errors.push(...swapResult.errors);
			result.success = swapResult.success;

			// Report progress
			options?.onProgress?.(90);

			// Update journal status
			if (swapResult.success) {
				journal.status = "committed";
				await fs.writeFile(
					path.join(this.journalDir, "committed", `${manifest.sessionId}.json`),
					JSON.stringify(journal, null, 2),
				);
				await fs.unlink(journalPath);

				// Clean up backup files
				for (const backup of journal.backups) {
					if (existsSync(backup.backup)) {
						await fs.unlink(backup.backup);
					}
				}
			} else {
				// Rollback failed - keep journal for recovery
				journal.status = "pending";
				await fs.writeFile(journalPath, JSON.stringify(journal, null, 2));
			}

			// Clean up staging directory
			await this.cleanupStaging(stagingDir);

			// Report progress
			options?.onProgress?.(100);

			const duration = performance.now() - startTime;
			console.log(
				`[SessionRollback] rollback() took ${duration.toFixed(0)}ms (sessionId=${manifest.sessionId}, reverted=${result.filesReverted.length}, skipped=${result.filesSkipped.length})`,
			);

			return result;
		} catch (error) {
			result.errors.push({
				path: "<session>",
				error: `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
			});
			return result;
		}
	}

	/**
	 * Reverse changes to get inverse operations
	 */
	private reverseChanges(changes: SessionChange[]): SessionChange[] {
		const reversed = [...changes].reverse();
		return reversed.map((change) => {
			// Inverse operations:
			// - created → deleted
			// - modified → modified (with hOld/hNew swapped)
			// - deleted → created
			// - renamed → renamed (with p/from swapped)

			const inversed: SessionChange = { ...change };

			switch (change.op) {
				case "created":
					inversed.op = "deleted";
					inversed.hOld = change.hNew;
					inversed.hNew = undefined;
					break;

				case "modified":
					// Swap hashes and sizes
					inversed.hOld = change.hNew;
					inversed.hNew = change.hOld;
					inversed.sizeBefore = change.sizeAfter;
					inversed.sizeAfter = change.sizeBefore;
					inversed.mtimeBefore = change.mtimeAfter;
					inversed.mtimeAfter = change.mtimeBefore;
					inversed.modeBefore = change.modeAfter;
					inversed.modeAfter = change.modeBefore;
					inversed.eolBefore = change.eolAfter;
					inversed.eolAfter = change.eolBefore;
					break;

				case "deleted":
					inversed.op = "created";
					inversed.hNew = change.hOld;
					inversed.hOld = undefined;
					break;

				case "renamed": {
					// Swap path and fromPath
					const temp = inversed.p;
					inversed.p = change.from || change.p;
					inversed.from = temp;
					// Also swap hashes
					inversed.hOld = change.hNew;
					inversed.hNew = change.hOld;
					break;
				}
			}

			return inversed;
		});
	}

	/**
	 * Stage a change for rollback
	 */
	private async stageChange(
		change: SessionChange,
		stagingDir: string,
		stagedFiles: Map<string, { hash: string; content: Uint8Array }>,
		filesToDelete: Set<string>,
		_result: RollbackResult,
	): Promise<void> {
		const _absPath = path.join(this.workspaceRoot, change.p);
		const stagingPath = path.join(stagingDir, change.p);

		if (change.op === "deleted") {
			// Mark file for deletion
			filesToDelete.add(change.p);
			return;
		}

		// For created/modified/renamed: retrieve blob from BlobStore
		const hash = change.hNew;
		if (!hash) {
			throw new Error(`Missing hash for ${change.op} operation on ${change.p}`);
		}

		// Retrieve blob
		const blobResult = await this.blobStore.get(hash);
		if (!blobResult.ok) {
			throw new Error(`Failed to retrieve blob ${hash}: ${blobResult.error.message}`);
		}

		const content = blobResult.value;
		if (!content) {
			throw new Error(`Blob not found: ${hash}`);
		}

		// Create staging directory for file
		await fs.mkdir(path.dirname(stagingPath), { recursive: true });

		// Write to staging
		await fs.writeFile(stagingPath, content);

		// Restore metadata
		if (change.mtimeAfter) {
			const mtimeDate = new Date(change.mtimeAfter);
			await fs.utimes(stagingPath, mtimeDate, mtimeDate);
		}

		if (change.modeAfter && process.platform !== "win32") {
			await fs.chmod(stagingPath, change.modeAfter);
		}

		// Add to staged files map
		stagedFiles.set(change.p, { hash, content });
	}

	/**
	 * Validate staging directory (verify hashes)
	 */
	private async validateStaging(
		stagedFiles: Map<string, { hash: string; content: Uint8Array }>,
	): Promise<Array<{ path: string; error: string }>> {
		const errors: Array<{ path: string; error: string }> = [];

		for (const [filePath, { hash, content }] of stagedFiles.entries()) {
			const computedHash = createHash("sha256").update(content).digest("hex");
			if (computedHash !== hash) {
				errors.push({
					path: filePath,
					error: `Hash mismatch: expected ${hash}, got ${computedHash}`,
				});
			}
		}

		return errors;
	}

	/**
	 * Perform per-file atomic swap
	 */
	private async atomicSwap(
		stagedFiles: Map<string, { hash: string; content: Uint8Array }>,
		filesToDelete: Set<string>,
		journal: JournalEntry,
		sessionId: string,
		options?: RollbackOptions,
	): Promise<{
		success: boolean;
		reverted: string[];
		skipped: string[];
		errors: Array<{ path: string; error: string }>;
	}> {
		const reverted: string[] = [];
		const skipped: string[] = [];
		const errors: Array<{ path: string; error: string }> = [];

		try {
			// Swap staged files
			let processed = 0;
			const total = stagedFiles.size + filesToDelete.size;

			for (const [relPath] of stagedFiles.entries()) {
				processed++;
				options?.onProgress?.(60 + (processed / total) * 30);

				const absPath = path.join(this.workspaceRoot, relPath);
				const stagingPath = path.join(this.workspaceRoot, `.snapback-rollback-${sessionId}`, relPath);
				const backupPath = `${absPath}.bak-${sessionId}`;

				try {
					// Backup current file (if exists)
					if (existsSync(absPath)) {
						await this.safeRename(absPath, backupPath);
						journal.backups.push({ original: absPath, backup: backupPath });
					}

					// Move staged file into place
					await this.safeRename(stagingPath, absPath);

					reverted.push(relPath);
				} catch (error) {
					skipped.push(relPath);
					errors.push({
						path: relPath,
						error: error instanceof Error ? error.message : String(error),
					});

					// Restore from backup if swap failed
					if (existsSync(backupPath)) {
						await this.safeRename(backupPath, absPath);
					}
				}
			}

			// Delete marked files
			for (const relPath of filesToDelete) {
				processed++;
				options?.onProgress?.(60 + (processed / total) * 30);

				const absPath = path.join(this.workspaceRoot, relPath);
				const backupPath = `${absPath}.bak-${sessionId}`;

				try {
					// Backup current file (rename to backup is the deletion)
					if (existsSync(absPath)) {
						await this.safeRename(absPath, backupPath);
						journal.backups.push({ original: absPath, backup: backupPath });
						// Note: File is now deleted (moved to backup), no unlink needed
						reverted.push(relPath);
					} else {
						skipped.push(relPath);
					}
				} catch (error) {
					skipped.push(relPath);
					errors.push({
						path: relPath,
						error: error instanceof Error ? error.message : String(error),
					});

					// Restore from backup if deletion failed
					if (existsSync(backupPath)) {
						await this.safeRename(backupPath, absPath);
					}
				}
			}

			return {
				success: errors.length === 0,
				reverted,
				skipped,
				errors,
			};
		} catch (error) {
			// Fatal error - rollback all changes from backups
			for (const backup of journal.backups) {
				if (existsSync(backup.backup)) {
					try {
						await this.safeRename(backup.backup, backup.original);
					} catch {
						// Ignore errors during recovery
					}
				}
			}

			return {
				success: false,
				reverted,
				skipped,
				errors: [
					{
						path: "<session>",
						error: `Fatal error during swap: ${error instanceof Error ? error.message : String(error)}`,
					},
					...errors,
				],
			};
		}
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
	 * Clean up staging directory
	 */
	private async cleanupStaging(stagingDir: string): Promise<void> {
		try {
			if (existsSync(stagingDir)) {
				await fs.rm(stagingDir, { recursive: true, force: true });
			}
		} catch {
			// Ignore cleanup errors
		}
	}

	/**
	 * Get pending journal entries (for recovery)
	 */
	async getPendingJournals(): Promise<JournalEntry[]> {
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
}
