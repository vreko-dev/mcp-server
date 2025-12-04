import { snapshots } from "@snapback/platform";
import { desc, eq } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

export const getRetentionInfo = protectedProcedure.handler(
	async ({ context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// 1. Fetch snapshot age data
		const userSnapshotsResult = await db
			.select()
			.from(snapshots)
			.where(eq(snapshots.userId, user.id))
			.orderBy(desc(snapshots.createdAt));

		const userSnapshots = userSnapshotsResult || [];

		const oldestSnapshot = userSnapshots.length
			? userSnapshots[userSnapshots.length - 1]
			: null;
		const newestSnapshot = userSnapshots.length ? userSnapshots[0] : null;

		// 2. Calculate telemetry expiration (90 days)
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

		return {
			retentionPolicies: {
				snapshots: {
					metadataRetention: "Indefinite (user-controlled)",
					contentRetention: "Only if cloudBackupEnabled = true",
					deletionPolicy: "Immediate upon user request",
				},
				telemetry: {
					retentionPeriod: "90 days",
					aggregatedData: "Indefinite (anonymized)",
					deletionPolicy: "Automatic after 90 days",
				},
				apiUsage: {
					retentionPeriod: "12 months for billing",
					deletionPolicy: "After subscription ends + 12 months",
				},
			},
			dataAge: {
				snapshots: {
					newest: newestSnapshot?.createdAt || null,
					oldest: oldestSnapshot?.createdAt || null,
					total: userSnapshots.length,
				},
				telemetry: {
					retentionCutoff: ninetyDaysAgo.toISOString(),
					note: "Telemetry events older than 90 days are automatically deleted",
				},
			},
		};
	},
);
