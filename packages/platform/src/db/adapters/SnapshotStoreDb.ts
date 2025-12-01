import { desc, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { snapshotFiles, snapshots } from "../schema/snapback/index.js";

export interface Snapshot {
	id: string;
	userId: string;
	apiKeyId: string;
	workspaceId?: string;
	name?: string;
	description?: string;
	triggerType: string;
	fileCount: number;
	totalSizeBytes: number;
	riskScore?: number;
	createdAt: Date;
	expiresAt?: Date;
}

export interface SnapshotFile {
	id: string;
	snapshotId: string;
	filePath: string;
	fileHash: string;
	fileSizeBytes: number;
	changeType?: string;
	linesChanged?: number;
	containsSecrets?: boolean;
	riskLevel?: string;
	cloudBackupUrl?: string;
	createdAt: Date;
}

export class SnapshotStoreDb {
	constructor(private db: PgDatabase<any>) {}

	/**
	 * Create a new snapshot
	 */
	async createSnapshot(snapshot: Omit<Snapshot, "id" | "createdAt">): Promise<string> {
		const id = crypto.randomUUID();
		const now = new Date();

		await this.db.insert(snapshots).values({
			id,
			userId: snapshot.userId,
			apiKeyId: snapshot.apiKeyId,
			name: snapshot.name,
			description: snapshot.description,
			trigger: snapshot.triggerType,
			fileCount: snapshot.fileCount,
			totalSizeBytes: snapshot.totalSizeBytes,
			riskScore: snapshot.riskScore,
			createdAt: now,
			expiresAt: snapshot.expiresAt,
			workspaceId: snapshot.workspaceId,
		});

		return id;
	}

	/**
	 * Add files to a snapshot
	 */
	async addFilesToSnapshot(
		snapshotId: string,
		files: Omit<SnapshotFile, "id" | "snapshotId" | "createdAt">[],
	): Promise<void> {
		const values = files.map((file) => ({
			id: crypto.randomUUID(),
			snapshotId,
			filePath: file.filePath,
			fileHash: file.fileHash,
			fileSizeBytes: file.fileSizeBytes,
			changeType: file.changeType,
			linesChanged: file.linesChanged,
			containsSecrets: file.containsSecrets,
			riskLevel: file.riskLevel,
			cloudBackupUrl: file.cloudBackupUrl,
			createdAt: new Date(),
		}));

		if (values.length > 0) {
			await this.db.insert(snapshotFiles).values(values);
		}
	}

	/**
	 * List snapshots for a user
	 */
	async listSnapshots(userId: string, limit = 50) {
		const result = await this.db
			.select()
			.from(snapshots)
			.where(eq(snapshots.userId, userId))
			.orderBy(desc(snapshots.createdAt))
			.limit(limit);

		return result.map((row) => ({
			id: row.id,
			userId: row.userId,
			apiKeyId: row.apiKeyId,
			workspaceId: row.workspaceId || undefined,
			name: row.name || undefined,
			description: row.description || undefined,
			triggerType: row.trigger,
			fileCount: row.fileCount,
			totalSizeBytes: row.totalSizeBytes,
			riskScore: row.riskScore || undefined,
			createdAt: row.createdAt,
			expiresAt: row.expiresAt || undefined,
		}));
	}

	/**
	 * Fetch a snapshot by ID
	 */
	async fetchSnapshot(id: string): Promise<Snapshot | null> {
		const result = await this.db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);

		if (result.length === 0) {
			return null;
		}

		const row = result[0];
		if (!row) {
			return null;
		}

		return {
			id: row.id,
			userId: row.userId,
			apiKeyId: row.apiKeyId,
			workspaceId: row.workspaceId || undefined,
			name: row.name || undefined,
			description: row.description || undefined,
			triggerType: row.trigger,
			fileCount: row.fileCount,
			totalSizeBytes: row.totalSizeBytes,
			riskScore: row.riskScore || undefined,
			createdAt: row.createdAt,
			expiresAt: row.expiresAt || undefined,
		};
	}

	/**
	 * Fetch files for a snapshot
	 */
	async fetchSnapshotFiles(snapshotId: string): Promise<SnapshotFile[]> {
		const result = await this.db.select().from(snapshotFiles).where(eq(snapshotFiles.snapshotId, snapshotId));

		return result.map((row) => ({
			id: row.id,
			snapshotId: row.snapshotId,
			filePath: row.filePath,
			fileHash: row.fileHash,
			fileSizeBytes: row.fileSizeBytes,
			changeType: row.changeType || undefined,
			linesChanged: row.linesChanged || undefined,
			containsSecrets: row.containsSecrets || undefined,
			riskLevel: row.riskLevel || undefined,
			cloudBackupUrl: row.cloudBackupUrl || undefined,
			createdAt: row.createdAt,
		}));
	}
}
