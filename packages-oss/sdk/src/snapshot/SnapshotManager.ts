import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
	CreateSnapshotOptions,
	FileInput,
	Snapshot,
	SnapshotFilters,
	SnapshotRestoreResult,
} from "@snapback-oss/contracts";
import type { StorageAdapter } from "../storage/StorageAdapter.js";
import { validatePath } from "../utils/security.js";
import { SnapshotDeduplication } from "./SnapshotDeduplication.js";
import { SnapshotNaming } from "./SnapshotNaming.js";

export interface SnapshotManagerOptions {
	enableDeduplication?: boolean;
	namingStrategy?: "git" | "semantic" | "timestamp";
	autoProtect?: boolean;
}

export class SnapshotManager {
	private deduplication: SnapshotDeduplication;
	private naming: SnapshotNaming;

	constructor(
		private storage: StorageAdapter,
		private options: SnapshotManagerOptions = {},
	) {
		this.deduplication = new SnapshotDeduplication();
		this.naming = new SnapshotNaming();
	}

	async create(files: FileInput[], options?: CreateSnapshotOptions): Promise<Snapshot> {
		return this.createSnapshot(files, options);
	}

	/**
	 * Convenience method for creating a snapshot with a single file
	 * @param params - Object containing filePath and content
	 * @param options - Snapshot options
	 * @returns Created snapshot
	 */
	async createTest(
		params: { filePath: string; content: string },
		options?: CreateSnapshotOptions,
	): Promise<Snapshot> {
		const fileInput: FileInput = {
			path: params.filePath,
			content: params.content,
			action: "modify",
		};
		return this.createSnapshot([fileInput], options);
	}

	private async createSnapshot(files: FileInput[], options?: CreateSnapshotOptions): Promise<Snapshot> {
		// Validate all file paths to prevent path traversal attacks
		await Promise.all(files.map((file) => Promise.resolve(validatePath(file.path))));
		// Check for duplicates if deduplication is enabled
		if (this.options.enableDeduplication) {
			const { isDuplicate, existingId } = await this.deduplication.isDuplicate(files, this.storage);

			if (isDuplicate && existingId) {
				throw new Error("Duplicate snapshot detected");
			}
		}

		// Generate name
		const name = options?.description || this.naming.generateName(files, this.options.namingStrategy);

		// Create snapshot
		const snapshot: Snapshot = {
			id: randomUUID(),
			timestamp: Date.now(),
			meta: {
				name,
				protected: options?.protected || this.options.autoProtect || false,
			},
			files: files.map((f) => f.path),
			fileContents: files.reduce(
				(acc, f) => {
					acc[f.path] = f.content;
					return acc;
				},
				{} as Record<string, string>,
			),
		};

		// Compute content hash for deduplication
		const contentHash = this.options.enableDeduplication ? this.deduplication.hashFiles(files) : undefined;

		// Save with content hash for indexed lookups
		await this.storage.save(snapshot, contentHash);

		// Record hash for deduplication cache
		if (this.options.enableDeduplication && contentHash) {
			this.deduplication.recordHash(snapshot.id, files);
		}

		return snapshot;
	}

	async list(filters?: SnapshotFilters): Promise<Snapshot[]> {
		return this.storage.list(filters);
	}

	async get(id: string): Promise<Snapshot | null> {
		return this.storage.get(id);
	}

	async delete(id: string): Promise<void> {
		const snapshot = await this.storage.get(id);
		if (!snapshot) {
			throw new Error(`Snapshot ${id} not found`);
		}

		if (snapshot.meta?.protected) {
			throw new Error(`Cannot delete protected snapshot ${id}`);
		}

		await this.storage.delete(id);

		// Clear dedup cache to prevent referencing deleted snapshot
		if (this.options.enableDeduplication) {
			this.deduplication.clearHash(id);
		}
	}

	/**
	 * Restore snapshot to target directory with atomic guarantees
	 * @param id Snapshot ID to restore
	 * @param targetPath Target directory path (optional, for actual file system restore)
	 * @param options Restore options
	 * @returns Restore result with list of restored files and any errors
	 */
	async restore(
		id: string,
		targetPath?: string,
		options?: { dryRun?: boolean; onProgress?: (progress: number) => void },
	): Promise<SnapshotRestoreResult> {
		const snapshot = await this.storage.get(id);
		if (!snapshot) {
			throw new Error(`Snapshot ${id} not found`);
		}

		// If no target path provided, return snapshot metadata only (metadata restore)
		if (!targetPath) {
			return {
				success: true,
				restoredFiles: snapshot.files || [],
				errors: [],
			};
		}

		// Dry run mode - just validate without writing files
		if (options?.dryRun) {
			const errors: string[] = [];
			const fileContents = snapshot.fileContents || {};

			for (const filePath of snapshot.files || []) {
				if (!fileContents[filePath]) {
					errors.push(`Missing content for file: ${filePath}`);
				}
			}

			return {
				success: errors.length === 0,
				restoredFiles: snapshot.files || [],
				errors,
			};
		}

		// Perform actual atomic file system restore
		return await this.restoreAtomic(snapshot, targetPath, options);
	}

	/**
	 * Atomic restore implementation with staging and rollback
	 */
	private async restoreAtomic(
		snapshot: Snapshot,
		targetPath: string,
		options?: { onProgress?: (progress: number) => void },
	): Promise<SnapshotRestoreResult> {
		const errors: string[] = [];
		const restoredFiles: string[] = [];
		const stagingDir = `${targetPath}.staging`;
		const backupDir = `${targetPath}.backup`;
		let targetBackedUp = false;

		try {
			const fileContents = snapshot.fileContents || {};
			const files = snapshot.files || [];
			const totalFiles = files.length;

			// Step 1: Create staging directory
			if (existsSync(stagingDir)) {
				await fs.rm(stagingDir, { recursive: true, force: true });
			}
			await fs.mkdir(stagingDir, { recursive: true });

			// Step 2: Extract all files to staging and validate
			for (let i = 0; i < totalFiles; i++) {
				const filePath = files[i];
				const content = fileContents[filePath];

				if (!content) {
					throw new Error(`Missing content for file: ${filePath}`);
				}

				// Write to staging
				const targetFilePath = path.join(stagingDir, filePath);
				await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
				await fs.writeFile(targetFilePath, content, "utf-8");

				restoredFiles.push(filePath);

				// Report progress
				if (options?.onProgress) {
					const progress = Math.round(((i + 1) / totalFiles) * 90);
					options.onProgress(progress);
				}
			}

			// Step 3: Backup existing target directory
			if (existsSync(targetPath)) {
				if (existsSync(backupDir)) {
					await fs.rm(backupDir, { recursive: true, force: true });
				}
				await fs.rename(targetPath, backupDir);
				targetBackedUp = true;
			}

			if (options?.onProgress) {
				options.onProgress(95);
			}

			// Step 4: Atomic swap - rename staging to target
			await fs.rename(stagingDir, targetPath);

			if (options?.onProgress) {
				options.onProgress(100);
			}

			// Step 5: Clean up backup on success
			if (existsSync(backupDir)) {
				await fs.rm(backupDir, { recursive: true, force: true });
			}

			return {
				success: true,
				restoredFiles,
				errors: [],
			};
		} catch (error) {
			// Rollback: restore from backup if it exists
			if (targetBackedUp && existsSync(backupDir)) {
				try {
					if (existsSync(targetPath)) {
						await fs.rm(targetPath, { recursive: true, force: true });
					}
					await fs.rename(backupDir, targetPath);
				} catch (rollbackError) {
					errors.push(
						`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
					);
				}
			}

			// Clean up staging directory
			if (existsSync(stagingDir)) {
				try {
					await fs.rm(stagingDir, { recursive: true, force: true });
				} catch {
					// Ignore cleanup errors
				}
			}

			const errorMessage = error instanceof Error ? error.message : String(error);
			errors.push(errorMessage);

			return {
				success: false,
				restoredFiles,
				errors,
			};
		}
	}

	async protect(id: string): Promise<void> {
		const snapshot = await this.storage.get(id);
		if (!snapshot) {
			throw new Error(`Snapshot ${id} not found`);
		}

		// Create defensive copy to prevent mutating original object
		const updated: Snapshot = {
			...snapshot,
			meta: {
				...snapshot.meta,
				protected: true,
			},
		};

		// Reuse the exact stored content hash to preserve deduplication
		const contentHash =
			this.options.enableDeduplication && "getStoredContentHash" in this.storage
				? await (this.storage as any).getStoredContentHash(id)
				: undefined;

		await this.storage.save(updated, contentHash);
	}

	async unprotect(id: string): Promise<void> {
		const snapshot = await this.storage.get(id);
		if (!snapshot) {
			throw new Error(`Snapshot ${id} not found`);
		}

		// Create defensive copy to prevent mutating original object
		const updated: Snapshot = {
			...snapshot,
			meta: {
				...snapshot.meta,
				protected: false,
			},
		};

		// Reuse the exact stored content hash to preserve deduplication
		const contentHash =
			this.options.enableDeduplication && "getStoredContentHash" in this.storage
				? await (this.storage as any).getStoredContentHash(id)
				: undefined;

		await this.storage.save(updated, contentHash);
	}

	async search(criteria: { content?: string; message?: string }): Promise<Snapshot[]> {
		// If storage supports optimized search, use it
		if (this.supportsOptimizedSearch(this.storage)) {
			return await this.optimizedSearch(this.storage, criteria);
		}

		// Fallback to loading all snapshots (inefficient but works)
		const all = await this.storage.list();

		return all.filter((snapshot) => {
			if (criteria.content) {
				const hasContent = Object.values(snapshot.fileContents || {}).some(
					(content) => content != null && criteria.content && String(content).includes(criteria.content),
				);
				if (!hasContent) {
					return false;
				}
			}

			if (criteria.message) {
				const _name = snapshot.meta?.name || "";
				if (criteria.message) {
					const name = snapshot.meta?.name || "";
					if (criteria.message && typeof name === "string" && !name.includes(criteria.message)) {
						return false;
					}
				}
			}

			return true;
		});
	}

	/**
	 * Check if storage adapter supports optimized search
	 */
	private supportsOptimizedSearch(storage: StorageAdapter): boolean {
		return "search" in storage && typeof (storage as any).search === "function";
	}

	/**
	 * Perform optimized search using storage adapter capabilities
	 */
	private async optimizedSearch(
		storage: StorageAdapter,
		criteria: { content?: string; message?: string },
	): Promise<Snapshot[]> {
		// This would delegate to storage adapter's optimized search implementation
		// For now, fallback to the original approach
		const all = await storage.list();

		return all.filter((snapshot) => {
			if (criteria.content) {
				const hasContent = Object.values(snapshot.fileContents || {}).some(
					(content) => content != null && String(content).includes(criteria.content ?? ""),
				);
				if (!hasContent) {
					return false;
				}
			}

			if (criteria.message) {
				const name = snapshot.meta?.name || "";
				if (criteria.message && typeof name === "string" && !name.includes(criteria.message)) {
					return false;
				}
			}

			return true;
		});
	}
}
