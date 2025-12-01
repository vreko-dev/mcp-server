import { snapshots, subscriptions, usageLimits } from "@snapback/platform";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const deleteSnapshotSchema = z.object({
	id: z.string(),
});

export const deleteSnapshot = protectedProcedure.input(deleteSnapshotSchema).handler(async ({ input, context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Check if database is available and capture reference
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	// Check ownership before deletion
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

	const _snapshot = snapshotResult[0];

	// Delete snapshot (cascade will handle files)
	await db.delete(snapshots).where(and(eq(snapshots.id, input.id), eq(snapshots.userId, user.id)));

	// Update usage tracking (decrement)
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	// Get user's subscription first
	const subscriptionResult = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);

	const subscription = subscriptionResult && subscriptionResult.length > 0 ? subscriptionResult[0] : null;

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

		usage = usageResult && usageResult.length > 0 ? usageResult[0] : null;
	}

	if (usage && usage.snapshotsUsed !== null && usage.snapshotsUsed > 0) {
		// Check if database is available and capture reference again
		const db2 = getDb();
		if (!db2) {
			throw new Error("Database not available");
		}

		await db2
			.update(usageLimits)
			.set({
				snapshotsUsed: Math.max(0, usage.snapshotsUsed - 1),
			})
			.where(eq(usageLimits.id, usage.id));
	}

	return {
		success: true,
		message: "Snapshot deleted successfully",
		snapshotId: input.id,
	};
});
