import { logger } from "@snapback/infrastructure";
import { snapshotFiles, snapshots } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { trackUsage } from "../../../lib/usage";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const restoreSnapshotSchema = z.object({
	id: z.string(),
	filesToRestore: z.array(z.string()).optional(), // Optional: restore only specific files
	dryRun: z.boolean().default(false), // Preview what would be restored without actually restoring
});

export const restoreSnapshot = protectedProcedure
	.input(restoreSnapshotSchema)
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
		const filesQuery = db
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

		const allFiles = await filesQuery;

		// Filter files if specific files requested
		const filesToRestore = input.filesToRestore
			? allFiles.filter((f) => input.filesToRestore?.includes(f.filePath))
			: allFiles;

		if (input.filesToRestore && filesToRestore.length === 0) {
			throw new Error(
				JSON.stringify({
					error: "None of the requested files found in snapshot",
					status: 404,
				}),
			);
		}

		// Calculate risk assessment for restore operation
		const highRiskFiles = filesToRestore.filter(
			(f) => f.riskLevel === "high" || f.containsSecrets,
		);
		const mediumRiskFiles = filesToRestore.filter(
			(f) => f.riskLevel === "medium",
		);

		const riskAssessment = {
			totalFiles: filesToRestore.length,
			highRiskCount: highRiskFiles.length,
			mediumRiskCount: mediumRiskFiles.length,
			lowRiskCount:
				filesToRestore.length - highRiskFiles.length - mediumRiskFiles.length,
			containsSecrets: highRiskFiles.some((f) => f.containsSecrets),
			overallRisk:
				highRiskFiles.length > 0
					? "high"
					: mediumRiskFiles.length > 0
						? "medium"
						: "low",
		};

		// If dry run, return preview without tracking
		if (input.dryRun) {
			return {
				preview: true,
				snapshot: {
					id: snapshot.id,
					name: snapshot.name,
					description: snapshot.description,
					createdAt: snapshot.createdAt,
					gitBranch: snapshot.gitBranch,
					gitCommit: snapshot.gitCommit,
				},
				filesToRestore: filesToRestore.map((f) => ({
					filePath: f.filePath,
					fileHash: f.fileHash,
					fileSizeBytes: f.fileSizeBytes,
					changeType: f.changeType,
					riskLevel: f.riskLevel,
					containsSecrets: f.containsSecrets,
					cloudBackupUrl: f.cloudBackupUrl,
				})),
				riskAssessment,
				warnings: [
					...(highRiskFiles.length > 0
						? [
								`${highRiskFiles.length} high-risk files will be restored. Review carefully before proceeding.`,
							]
						: []),
					...(riskAssessment.containsSecrets
						? [
								"Some files may contain secrets. Ensure they are properly secured after restoration.",
							]
						: []),
				],
			};
		}

		// For actual restore, we return the file information to the client
		// The client (VS Code extension) will handle the actual file restoration from local storage
		logger.info("Snapshot restore initiated", {
			userId: user.id,
			snapshotId: snapshot.id,
			fileCount: filesToRestore.length,
			riskLevel: riskAssessment.overallRisk,
		});

		// Track usage for analytics
		trackUsage({
			requestId: crypto.randomUUID(),
			apiKeyId: snapshot.apiKeyId,
			userId: user.id,
			endpoint: "/api/snapshots/restore",
			method: "POST",
			tokensUsed: 0,
			responseTime: 0,
			responseStatus: 200,
			cached: false,
			metadata: {
				snapshotId: snapshot.id,
				filesRestored: filesToRestore.length,
				riskLevel: riskAssessment.overallRisk,
				partialRestore: !!input.filesToRestore,
			},
		}).catch(console.error);

		return {
			success: true,
			snapshot: {
				id: snapshot.id,
				name: snapshot.name,
				description: snapshot.description,
				createdAt: snapshot.createdAt,
				gitBranch: snapshot.gitBranch,
				gitCommit: snapshot.gitCommit,
				riskScore: snapshot.riskScore,
			},
			filesToRestore: filesToRestore.map((f) => ({
				filePath: f.filePath,
				fileHash: f.fileHash,
				fileSizeBytes: f.fileSizeBytes,
				changeType: f.changeType,
				riskLevel: f.riskLevel,
				containsSecrets: f.containsSecrets,
				cloudBackupUrl: f.cloudBackupUrl,
			})),
			riskAssessment,
			instructions: {
				message:
					"File metadata retrieved. Use the VS Code extension or SDK to restore files from local storage or cloud backup.",
				cloudBackupAvailable: snapshot.cloudBackupEnabled,
				nextSteps: [
					"Download file contents from cloudBackupUrl or retrieve from local storage",
					"Verify file integrity using fileHash",
					"Write files to their original locations (filePath)",
					"Review high-risk files before executing any code",
				],
			},
		};
	});
