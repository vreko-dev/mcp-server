import type { ProtectedFile, ProtectionLevel } from "../domain/types";
import { db } from "./db";

/**
 * Repository for managing protected files in IndexedDB
 */
type ProtectedFileInput =
	| ProtectedFile
	| (Omit<ProtectedFile, "id"> & { id?: string });

const generateId = () =>
	crypto?.randomUUID
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2, 11);

export class ProtectionRepo {
	/**
	 * Creates or updates a protected file
	 */
	async save(protectedFile: ProtectedFileInput): Promise<ProtectedFile> {
		const record: ProtectedFile = {
			id: protectedFile.id ?? generateId(),
			path: protectedFile.path,
			protectionLevel: protectedFile.protectionLevel,
			...(protectedFile.lastSnapshotId !== undefined && {
				lastSnapshotId: protectedFile.lastSnapshotId,
			}),
		};

		await db.protectedFiles.put(record);
		return record;
	}

	/**
	 * Creates or updates multiple protected files in a batch
	 */
	async saveMany(
		protectedFiles: ProtectedFileInput[],
	): Promise<ProtectedFile[]> {
		const records: ProtectedFile[] = protectedFiles.map((file) => ({
			id: file.id ?? generateId(),
			path: file.path,
			protectionLevel: file.protectionLevel,
			...(file.lastSnapshotId !== undefined && {
				lastSnapshotId: file.lastSnapshotId,
			}),
		}));

		await db.protectedFiles.bulkPut(records);
		return records;
	}

	/**
	 * Gets a protected file by path
	 */
	async getByPath(path: string): Promise<ProtectedFile | undefined> {
		return db.protectedFiles.where("path").equals(path).first();
	}

	/**
	 * Gets all protected files
	 */
	async getAll(): Promise<ProtectedFile[]> {
		return db.protectedFiles.toArray();
	}

	/**
	 * Updates protection level for a file
	 */
	async updateProtectionLevel(
		path: string,
		protectionLevel: string,
	): Promise<void> {
		const existing = await this.getByPath(path);
		const record: ProtectedFile = existing
			? {
					...existing,
					protectionLevel: protectionLevel as ProtectionLevel,
				}
			: {
					id: generateId(),
					path,
					protectionLevel: protectionLevel as ProtectionLevel,
				};

		await db.protectedFiles.put(record);
	}

	/**
	 * Removes protection from a file
	 */
	async removeProtection(path: string): Promise<void> {
		const existing = await this.getByPath(path);
		if (existing) {
			await db.protectedFiles.delete(existing.id);
		}
	}

	/**
	 * Deletes a protected file by ID
	 */
	async delete(id: string): Promise<void> {
		await db.protectedFiles.delete(id);
	}
}
