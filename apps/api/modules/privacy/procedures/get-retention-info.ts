import { protectedProcedure } from "@/orpc/procedures";
import { getSnapshotAgeData, RETENTION_POLICIES } from "../services/privacy-service";

export const getRetentionInfo = protectedProcedure.handler(async ({ context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Fetch snapshot age data via service
	const snapshotAgeData = await getSnapshotAgeData(user.id);

	// Calculate telemetry expiration (90 days)
	const ninetyDaysAgo = new Date();
	ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

	return {
		retentionPolicies: RETENTION_POLICIES,
		dataAge: {
			snapshots: {
				newest: snapshotAgeData.newest,
				oldest: snapshotAgeData.oldest,
				total: snapshotAgeData.total,
			},
			telemetry: {
				retentionCutoff: ninetyDaysAgo.toISOString(),
				note: "Telemetry events older than 90 days are automatically deleted",
			},
		},
	};
});
