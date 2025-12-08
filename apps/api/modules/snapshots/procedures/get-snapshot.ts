import { snapshotFiles, snapshots } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

const getSnapshotSchema = z.object({
	id: z.string(),
});

export const getSnapshot = protectedProcedure
	.input(getSnapshotSchema)
	.handler(async ({ input, context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// Fetch snapshot (with ownership check)
		const snapshotResult = await db
			.select()
			.from(snapshots)
			.where(and(eq(snapshots.id, input.id), eq(snapshots.userId, user.id)))
			.limit(1);

		if (!snapshotResult || snapshotResult.length === 0) {
			throw new Error(
				JSON.stringify({
					error: "Snapshot not found or access denied",
					status: 404,
				}),
			);
		}

		const snapshot = snapshotResult[0];

		// Fetch associated files
		const files = await db
			.select({
				id: snapshotFiles.id,
				filePath: snapshotFiles.filePath,
				fileHash: snapshotFiles.fileHash,
				fileSizeBytes: snapshotFiles.fileSizeBytes,
				changeType: snapshotFiles.changeType,
				linesChanged: snapshotFiles.linesChanged,
				containsSecrets: snapshotFiles.containsSecrets,
				riskLevel: snapshotFiles.riskLevel,
				cloudBackupUrl: snapshotFiles.cloudBackupUrl,
				createdAt: snapshotFiles.createdAt,
			})
			.from(snapshotFiles)
			.where(eq(snapshotFiles.snapshotId, snapshot.id));

		return {
			snapshot: {
				id: snapshot.id,
				name: snapshot.name,
				description: snapshot.description,
				trigger: snapshot.trigger,
				fileCount: snapshot.fileCount,
				totalSizeBytes: snapshot.totalSizeBytes,
				fileHashes: snapshot.fileHashes,
				gitBranch: snapshot.gitBranch,
				gitCommit: snapshot.gitCommit,
				gitDirty: snapshot.gitDirty,
				riskScore: snapshot.riskScore,
				riskFactors: snapshot.riskFactors,
				projectPath: snapshot.projectPath,
				workspaceId: snapshot.workspaceId,
				cloudBackupEnabled: snapshot.cloudBackupEnabled,
				cloudBackupUrl: snapshot.cloudBackupUrl,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
				metadata: snapshot.metadata,
			},
			files,
		};
	});
