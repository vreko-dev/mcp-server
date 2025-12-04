import { apiKeys, snapshots, subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

export const exportMyData = protectedProcedure.handler(async ({ context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Check if database is available
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	// 1. Fetch all snapshots
	const userSnapshotsResult = await db
		.select()
		.from(snapshots)
		.where(eq(snapshots.userId, user.id));

	const userSnapshots = userSnapshotsResult || [];

	// 2. Fetch API keys (redact actual key values)
	const userApiKeysResult = await db
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.userId, user.id));

	const userApiKeys = userApiKeysResult || [];

	// 3. Fetch subscription
	const userSubscriptionResult = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, user.id))
		.limit(1);

	const userSubscription =
		userSubscriptionResult && userSubscriptionResult.length > 0
			? userSubscriptionResult[0]
			: null;

	// 4. Build comprehensive export
	return {
		exportDate: new Date().toISOString(),
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			createdAt: user.createdAt,
		},
		snapshots: {
			total: userSnapshots.length,
			metadata: userSnapshots.map((cp) => ({
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
			total: userApiKeys.length,
			keys: userApiKeys.map((key) => ({
				id: key.id,
				name: key.name,
				keyPreview: `${key.key.substring(0, 3)}...${key.key.slice(-3)}`, // Redacted
				permissions: key.permissions,
				createdAt: key.createdAt,
				lastUsed: key.lastUsedAt,
				expiresAt: key.expiresAt,
			})),
		},
		subscription: userSubscription
			? {
					plan: userSubscription.plan,
					status: userSubscription.status,
					billingCycleStart: userSubscription.currentPeriodStart,
					billingCycleEnd: userSubscription.currentPeriodEnd,
					startDate: userSubscription.createdAt,
				}
			: null,
		// Data retention info
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
	};
});
