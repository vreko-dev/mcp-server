import {
	apiKeys,
	snapshotFiles,
	snapshots,
	subscriptions,
	usageLimits,
} from "@snapback/platform";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { trackUsage } from "../../../lib/usage";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const createSnapshotSchema = z.object({
	name: z.string().optional(),
	description: z.string().optional(),
	trigger: z.enum(["manual", "auto", "pre_command", "risk_detection"]),
	fileCount: z.number().int().nonnegative(),
	totalSizeBytes: z.number().int().nonnegative(),
	fileHashes: z.array(z.string()),
	gitBranch: z.string().optional(),
	gitCommit: z.string().optional(),
	gitDirty: z.boolean().optional(),
	riskScore: z.number().min(0).max(10).optional(), // 0-10 scale matching risk thresholds
	riskFactors: z
		.array(
			z.object({
				type: z.string(),
				severity: z.enum(["low", "medium", "high"]),
				message: z.string(),
			}),
		)
		.optional(),
	projectPath: z.string().optional(),
	workspaceId: z.string().optional(),
	cloudBackupEnabled: z.boolean().default(false),
	// MVP Note: Server-side KMS encryption fields
	// Post-MVP: Will add client-side E2EE with user-controlled keys
	encryptionKeyId: z.string().optional(), // KMS key identifier
	encryptedDataKey: z.string().optional(), // Data encryption key encrypted with KMS key
	encryptionAlgorithm: z.string().optional().default("AES-256-GCM"), // Encryption algorithm used
	files: z.array(
		z.object({
			filePath: z.string(),
			fileHash: z.string(),
			fileSizeBytes: z.number().int().nonnegative(),
			changeType: z.enum(["added", "modified", "deleted"]).optional(),
			linesChanged: z.number().int().optional(),
			containsSecrets: z.boolean().default(false),
			riskLevel: z.enum(["low", "medium", "high"]).optional(),
		}),
	),
	metadata: z
		.object({
			clientVersion: z.string().optional(),
			ideVersion: z.string().optional(),
			platform: z.string().optional(),
			tags: z.array(z.string()).optional(),
		})
		.optional(),
});

export const createSnapshot = protectedProcedure
	.input(createSnapshotSchema)
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

		// 1. Get user's API key to check permissions
		const apiKeyResult = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.userId, user.id))
			.limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			throw new Error("No API key found");
		}

		const apiKey = apiKeyResult[0];

		// 2. Check if this is the user's first snapshot
		const existingSnapshotsCount = await db
			.select({ count: sql<number>`count(*)` })
			.from(snapshots)
			.where(eq(snapshots.userId, user.id))
			.then((result) => result[0]?.count || 0);

		const _isFirstSnapshot = existingSnapshotsCount === 0;

		// 3. Check usage limits for current month
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		// Get user's subscription first
		const subscriptionResult = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, user.id))
			.limit(1);

		let subscription = null;
		if (subscriptionResult && subscriptionResult.length > 0) {
			subscription = subscriptionResult[0];
		}

		let usage = null;
		if (subscription) {
			const usageResult = await db
				.select()
				.from(usageLimits)
				.where(
					and(
						eq(usageLimits.subscriptionId, subscription.id),
						gte(usageLimits.month, monthStart),
						lte(usageLimits.month, monthEnd),
					),
				)
				.limit(1);

			if (usageResult && usageResult.length > 0) {
				usage = usageResult[0];
			}
		}

		// Check snapshot limit
		const permissions = apiKey.permissions as {
			maxSnapshots?: number;
			cloudBackup?: boolean;
			advancedDetection?: boolean;
			customRules?: boolean;
			teamSharing?: boolean;
		};

		const snapshotsUsed = usage?.snapshotsUsed || 0;
		const snapshotsLimit = permissions.maxSnapshots;

		if (snapshotsLimit !== undefined && snapshotsUsed >= snapshotsLimit) {
			throw new Error(
				JSON.stringify({
					error: "Monthly snapshot limit exceeded",
					used: snapshotsUsed,
					limit: snapshotsLimit,
					upgradeUrl: "/pricing",
					suggestedPlan: snapshotsLimit === 100 ? "solo" : "team",
				}),
			);
		}

		// 4. Validate cloud backup permission
		if (input.cloudBackupEnabled && !permissions.cloudBackup) {
			throw new Error(
				"Cloud backup not available on your plan. Upgrade to Solo or Team.",
			);
		}

		// 5. Create snapshot (metadata only)
		const newSnapshotResult = await db
			.insert(snapshots)
			.values({
				userId: user.id,
				apiKeyId: apiKey.id,
				name: input.name,
				description: input.description,
				trigger: input.trigger,
				fileCount: input.fileCount,
				totalSizeBytes: input.totalSizeBytes,
				fileHashes: input.fileHashes,
				gitBranch: input.gitBranch,
				gitCommit: input.gitCommit,
				gitDirty: input.gitDirty,
				riskScore: input.riskScore,
				riskFactors: input.riskFactors,
				projectPath: input.projectPath,
				workspaceId: input.workspaceId,
				cloudBackupEnabled: input.cloudBackupEnabled,
				// MVP Note: Server-side KMS encryption fields
				// Post-MVP: Will add client-side E2EE with user-controlled keys
				encryptionKeyId: input.encryptionKeyId,
				encryptedDataKey: input.encryptedDataKey,
				encryptionAlgorithm: input.encryptionAlgorithm,
				// cloudBackupUrl would be set by separate upload process if enabled
				metadata: input.metadata,
			})
			.returning();

		if (!newSnapshotResult || newSnapshotResult.length === 0) {
			throw new Error("Failed to create snapshot");
		}

		const newSnapshot = newSnapshotResult[0];

		// 6. Insert file metadata
		if (input.files.length > 0) {
			const db2 = getDb();
			if (!db2) {
				throw new Error("Database not available");
			}

			await db2.insert(snapshotFiles).values(
				input.files.map((file) => ({
					snapshotId: newSnapshot.id,
					filePath: file.filePath,
					fileHash: file.fileHash,
					fileSizeBytes: file.fileSizeBytes,
					changeType: file.changeType,
					linesChanged: file.linesChanged,
					containsSecrets: file.containsSecrets,
					riskLevel: file.riskLevel,
					// cloudBackupUrl would be set if cloud backup enabled
				})),
			);
		}

		// 7. Update usage tracking
		if (usage) {
			if (!db) {
				throw new Error("Database not available");
			}

			await db
				.update(usageLimits)
				.set({
					snapshotsUsed: snapshotsUsed + 1,
				})
				.where(eq(usageLimits.id, usage.id));
		} else if (subscription) {
			// Create initial usage record
			if (!db) {
				throw new Error("Database not available");
			}

			await db.insert(usageLimits).values({
				subscriptionId: subscription.id,
				month: monthStart,
				snapshotsUsed: 1,
				snapshotsLimit: permissions.maxSnapshots,
			});
		}

		// 8. Track usage for analytics (async)
		trackUsage({
			requestId: crypto.randomUUID(),
			apiKeyId: apiKey.id,
			userId: user.id,
			endpoint: "/api/snapshots/create",
			method: "POST",
			tokensUsed: 0, // No AI tokens for snapshot creation
			responseTime: 0,
			responseStatus: 201,
			cached: false,
			clientVersion: input.metadata?.clientVersion,
			metadata: {
				snapshotId: newSnapshot.id,
				filesProtected: input.fileCount,
				trigger: input.trigger,
				riskScore: input.riskScore,
			},
		}).catch(console.error);

		// 		// 9. Track first snapshot creation event if this is the user's first snapshot
		// 		if (isFirstSnapshot) {
		// 			try {
		// 				// Import the proxy event procedure dynamically to avoid circular dependencies
		// 				const { proxyEvent } = await import(
		// 					"../../telemetry/procedures/proxy-event"
		// 				);
		//
		// 				// Track the first snapshot created event
		// 				await proxyEvent.handler({
		// 					input: {
		// 						event: "first_snapshot_created",
		// 						properties: {
		// 							snapshot_method: input.trigger,
		// 							files_count: input.fileCount,
		// 							time_to_first_snapshot_minutes: 0, // This would need to be calculated based on user signup time
		// 							user_id: user.id,
		// 							api_key_id: apiKey.id,
		// 						},
		// 						userId: user.id,
		// 						orgId: undefined,
		// 						version: input.metadata?.clientVersion,
		// 					},
		// 				});
		// 			} catch (error) {
		// 				console.error("Failed to track first snapshot created event", error);
		// 			}
		// 		}

		return {
			snapshot: {
				id: newSnapshot.id,
				name: newSnapshot.name,
				description: newSnapshot.description,
				trigger: newSnapshot.trigger,
				fileCount: newSnapshot.fileCount,
				totalSizeBytes: newSnapshot.totalSizeBytes,
				riskScore: newSnapshot.riskScore,
				cloudBackupEnabled: newSnapshot.cloudBackupEnabled,
				createdAt: newSnapshot.createdAt,
			},
			usage: {
				snapshotsUsed: snapshotsUsed + 1,
				snapshotsLimit: snapshotsLimit,
				remaining:
					snapshotsLimit !== undefined
						? snapshotsLimit - (snapshotsUsed + 1)
						: null,
			},
		};
	});
