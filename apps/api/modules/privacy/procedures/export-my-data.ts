import { protectedProcedure } from "@/orpc/procedures";
import { getUserExportData, RETENTION_POLICIES } from "../services/privacy-service";

export const exportMyData = protectedProcedure.handler(async ({ context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Fetch all user data via service
	const exportData = await getUserExportData(user.id);

	// Build comprehensive export
	return {
		exportDate: new Date().toISOString(),
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			createdAt: user.createdAt,
		},
		snapshots: {
			total: exportData.snapshots.length,
			metadata: exportData.snapshots.map((cp) => ({
				id: cp.id,
				fileCount: cp.fileCount,
				fileHashes: cp.fileHashes,
				cloudBackupEnabled: cp.cloudBackupEnabled,
				riskScore: cp.riskScore,
				createdAt: cp.createdAt,
				hasContent: cp.cloudBackupEnabled, // Privacy-first indicator
			})),
		},
		apiKeys: {
			total: exportData.apiKeys.length,
			keys: exportData.apiKeys.map((key) => ({
				id: key.id,
				name: key.name,
				keyPreview: key.keyPreview,
				permissions: key.permissions,
				createdAt: key.createdAt,
				lastUsed: key.lastUsed,
				expiresAt: key.expiresAt,
			})),
		},
		subscription: exportData.subscription
			? {
					plan: exportData.subscription.plan,
					status: exportData.subscription.status,
					billingCycleStart: exportData.subscription.billingCycleStart,
					billingCycleEnd: exportData.subscription.billingCycleEnd,
					startDate: exportData.subscription.startDate,
				}
			: null,
		// Data retention info
		retentionPolicies: RETENTION_POLICIES,
	};
});
