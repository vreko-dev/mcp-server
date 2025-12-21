/**
 * Delete Snapshot Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import {
	decrementSnapshotUsage,
	deleteSnapshotAndFiles,
	getMonthlyUsage,
	getUserSubscription,
} from "../services/snapshots-service";

const deleteSnapshotSchema = z.object({
	id: z.string(),
});

export const deleteSnapshot = protectedProcedure.input(deleteSnapshotSchema).handler(async ({ input, context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Delete snapshot via service layer per C-002
	const deleted = await deleteSnapshotAndFiles(input.id, user.id);

	if (!deleted) {
		throw new Error(
			JSON.stringify({
				error: "Snapshot not found or access denied",
				status: 404,
			}),
		);
	}

	// Update usage tracking (decrement) via service layer per C-002
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	const subscription = await getUserSubscription(user.id);

	if (subscription) {
		const usage = await getMonthlyUsage(subscription.id, monthStart, monthEnd);

		if (usage && usage.snapshotsUsed !== null && usage.snapshotsUsed > 0) {
			await decrementSnapshotUsage(usage.id, usage.snapshotsUsed);
		}
	}

	return {
		success: true,
		message: "Snapshot deleted successfully",
		snapshotId: input.id,
	};
});
