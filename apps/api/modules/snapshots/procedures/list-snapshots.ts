/**
 * List Snapshots Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { listUserSnapshots } from "../services/snapshots-service";

const listSnapshotsSchema = z.object({
	// Pagination
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),

	// Filters
	projectPath: z.string().optional(),
	workspaceId: z.string().optional(),
	trigger: z.enum(["manual", "auto", "pre_command", "risk_detection"]).optional(),
});

export const listSnapshots = protectedProcedure.input(listSnapshotsSchema).handler(async ({ input, context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Delegate to service layer per C-002
	return listUserSnapshots({
		userId: user.id,
		projectPath: input.projectPath,
		workspaceId: input.workspaceId,
		trigger: input.trigger,
		page: input.page,
		pageSize: input.pageSize,
	});
});
