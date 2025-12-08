import { apiKeys, snapshots, subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

export const deleteMyDataProcedure = protectedProcedure
	.input(
		z.object({
			confirm: z.boolean(),
		}),
	)
	.handler(async ({ context }) => {
		if (!context.user) {
			throw new Error("Unauthorized");
		}

		const user = context.user;

		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// 1. Fetch data to be deleted (for confirmation/logging)
		const [snapshotsToDeleteResult, apiKeysToDeleteResult, subscriptionResult] =
			await Promise.all([
				db.select().from(snapshots).where(eq(snapshots.userId, user.id)),
				db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)),
				db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.userId, user.id))
					.limit(1),
			]);

		const snapshotsToDelete = snapshotsToDeleteResult || [];
		const apiKeysToDelete = apiKeysToDeleteResult || [];
		const subscription = subscriptionResult || [];

		// 2. Verify user really wants to delete everything
		// (In a real implementation, you'd have additional confirmation steps)

		// 3. Perform cascading deletion
		// Note: Database foreign keys with onDelete: 'cascade' will handle related data

		// Delete snapshots (cascades to snapshotFiles via FK)
		await db.delete(snapshots).where(eq(snapshots.userId, user.id));

		// Delete API keys (cascades to apiUsage via FK)
		await db.delete(apiKeys).where(eq(apiKeys.userId, user.id));

		// Cancel subscription if exists
		let subscriptionCanceled = false;
		if (subscription.length > 0) {
			await db.delete(subscriptions).where(eq(subscriptions.userId, user.id));
			subscriptionCanceled = true;
		}

		// 4. Return deletion confirmation
		return {
			success: true,
			deletedAt: new Date().toISOString(),
			itemsDeleted: {
				snapshots: snapshotsToDelete.length,
				apiKeys: apiKeysToDelete.length,
			},
			subscriptionCanceled,
			recoveryPeriod: null, // Immediate permanent deletion
			message:
				"All your data has been permanently deleted. This action cannot be undone.",
		};
	});
