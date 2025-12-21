/**
 * Get Snapshot Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getSnapshotById, getSnapshotFiles } from "../services/snapshots-service";

const getSnapshotSchema = z.object({
	id: z.string(),
});

export const getSnapshot = protectedProcedure.input(getSnapshotSchema).handler(async ({ input, context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Fetch snapshot via service layer per C-002
	const snapshot = await getSnapshotById(input.id, user.id);

	if (!snapshot) {
		throw new Error(
			JSON.stringify({
				error: "Snapshot not found or access denied",
				status: 404,
			}),
		);
	}

	// Fetch associated files via service layer per C-002
	const files = await getSnapshotFiles(snapshot.id);

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
