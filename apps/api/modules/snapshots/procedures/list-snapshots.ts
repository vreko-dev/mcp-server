import { snapshots } from "@snapback/platform";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const listSnapshotsSchema = z.object({
	// Pagination
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),

	// Filters
	projectPath: z.string().optional(),
	workspaceId: z.string().optional(),
	trigger: z
		.enum(["manual", "auto", "pre_command", "risk_detection"])
		.optional(),
});

export const listSnapshots = protectedProcedure
	.input(listSnapshotsSchema)
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

		const { page, pageSize, projectPath, workspaceId, trigger } = input;
		const offset = (page - 1) * pageSize;

		// Build where conditions
		const whereConditions = [eq(snapshots.userId, user.id)];

		if (projectPath) {
			whereConditions.push(eq(snapshots.projectPath, projectPath));
		}

		if (workspaceId) {
			whereConditions.push(eq(snapshots.workspaceId, workspaceId));
		}

		if (trigger) {
			whereConditions.push(eq(snapshots.trigger, trigger));
		}

		// Fetch snapshots (most recent first)
		const userSnapshots = await db
			.select({
				id: snapshots.id,
				name: snapshots.name,
				description: snapshots.description,
				trigger: snapshots.trigger,
				fileCount: snapshots.fileCount,
				totalSizeBytes: snapshots.totalSizeBytes,
				gitBranch: snapshots.gitBranch,
				gitCommit: snapshots.gitCommit,
				gitDirty: snapshots.gitDirty,
				riskScore: snapshots.riskScore,
				projectPath: snapshots.projectPath,
				workspaceId: snapshots.workspaceId,
				cloudBackupEnabled: snapshots.cloudBackupEnabled,
				createdAt: snapshots.createdAt,
			})
			.from(snapshots)
			.where(and(...whereConditions))
			.orderBy(desc(snapshots.createdAt))
			.limit(pageSize)
			.offset(offset);

		// Get total count for pagination
		const totalCountResult = await db
			.select({
				count: snapshots.id,
			})
			.from(snapshots)
			.where(and(...whereConditions));

		const totalCount =
			totalCountResult && totalCountResult.length > 0
				? totalCountResult[0]
				: null;
		const total = Number(totalCount?.count || 0);
		const totalPages = Math.ceil(total / pageSize);

		return {
			snapshots: userSnapshots,
			pagination: {
				page,
				pageSize,
				total,
				totalPages,
				hasMore: page < totalPages,
			},
		};
	});
