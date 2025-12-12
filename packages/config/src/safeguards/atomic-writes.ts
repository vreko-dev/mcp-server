/**
 * Safeguard 5: Atomic Writes & File Locks
 *
 * Per TDD_CORE.md: Prevents data corruption during concurrent writes
 * Uses atomic writes (temp file → rename) and file-based locks
 */

import fs from "fs";
import path from "path";

/**
 * Atomic write result
 */
export interface AtomicWriteResult {
	success: boolean;
	path: string;
	duration: number;
	error?: Error;
}

/**
 * Write config atomically to prevent corruption
 * Strategy: Write to temp file, fsync, then atomic rename
 */
export async function atomicWriteConfig(filePath: string, config: any): Promise<AtomicWriteResult> {
	const start = Date.now();
	const tempPath = `${filePath}.tmp`;

	try {
		// Write to temp file
		const content = JSON.stringify(config, null, 2);
		await fs.promises.writeFile(tempPath, content, { encoding: "utf-8" });

		// Sync to disk
		const fd = fs.openSync(tempPath, "r");
		fs.fsyncSync(fd);
		fs.closeSync(fd);

		// Atomic rename
		fs.renameSync(tempPath, filePath);

		return {
			success: true,
			path: filePath,
			duration: Date.now() - start,
		};
	} catch (error) {
		// Cleanup temp file
		try {
			fs.unlinkSync(tempPath);
		} catch {}

		return {
			success: false,
			path: filePath,
			duration: Date.now() - start,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}

/**
 * File-based lock manager
 */
export class FileLock {
	private lockFile: string;
	private lockFileHandle?: number;

	constructor(configPath: string) {
		this.lockFile = `${configPath}.lock`;
	}

	async acquireLock(timeoutMs = 5000): Promise<{ success: boolean; error?: Error }> {
		const start = Date.now();

		while (Date.now() - start < timeoutMs) {
			try {
				this.lockFileHandle = fs.openSync(this.lockFile, "wx");
				return { success: true };
			} catch (error) {
				// Lock file exists, wait and retry
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
		}

		return {
			success: false,
			error: new Error(`Could not acquire lock on ${this.lockFile}`),
		};
	}

	releaseLock(): void {
		try {
			if (this.lockFileHandle !== undefined) {
				fs.closeSync(this.lockFileHandle);
				this.lockFileHandle = undefined;
			}
			fs.unlinkSync(this.lockFile);
		} catch {}
	}
}

/**
 * Backup and recovery manager
 */
export class ConfigBackupManager {
	constructor(private backupDir: string) {}

	async createBackup(_filePath: string, config: any): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupPath = path.join(this.backupDir, `config-${timestamp}.json`);

		await fs.promises.mkdir(this.backupDir, { recursive: true });
		await fs.promises.writeFile(backupPath, JSON.stringify(config, null, 2));

		return backupPath;
	}

	async detectCorruptedConfig(configPath: string): Promise<boolean> {
		try {
			const content = await fs.promises.readFile(configPath, "utf-8");
			JSON.parse(content);
			return false; // Valid JSON
		} catch {
			return true; // Corrupted
		}
	}

	async restoreFromBackup(configPath: string): Promise<{ success: boolean; path?: string; error?: Error }> {
		try {
			const backups = await fs.promises.readdir(this.backupDir);
			const latestBackup = backups.sort().pop();

			if (!latestBackup) {
				return {
					success: false,
					error: new Error("No backup files found"),
				};
			}

			const backupPath = path.join(this.backupDir, latestBackup);
			const content = await fs.promises.readFile(backupPath, "utf-8");
			const restored = JSON.parse(content);

			const result = await atomicWriteConfig(configPath, restored);

			return {
				success: result.success,
				path: result.success ? configPath : undefined,
				error: result.error,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}
}
