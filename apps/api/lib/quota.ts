import {
	apiKeys,
	apiUsage,
	subscriptions,
	usageLimits,
} from "@snapback/platform";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "../src/services/database";

// Usage quota enforcement
export async function enforceQuotas(
	userId: string,
	type: "snapshot" | "storage" | "api",
) {
	// Check if database is available and capture reference
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const subscriptionResult = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.limit(1);

	if (!subscriptionResult || subscriptionResult.length === 0) {
		throw new Error("Subscription not found");
	}

	const subscription = subscriptionResult[0];

	const limits = {
		free: {
			snapshots: 100,
			storage: 100, // MB
			api: 1000, // requests per hour
		},
		pro: {
			snapshots: null, // unlimited
			storage: 1000, // MB
			api: 10000, // requests per hour
		},
		team: {
			snapshots: null, // unlimited
			storage: 10000, // MB
			api: 100000, // requests per hour
		},
	};

	const plan = subscription?.plan || "free";
	const planLimits = limits[plan as keyof typeof limits] || limits.free;

	// For unlimited plans, no need to check
	if (planLimits[type as keyof typeof planLimits] === null) {
		return true;
	}

	// Get current usage for the month
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	// For API calls, we check the last hour
	const startOfHour = new Date(now.getTime() - 60 * 60 * 1000);

	let currentUsage = 0;

	if (type === "api") {
		// Get API usage in the last hour
		const usage = await db
			.select({ id: apiUsage.id })
			.from(apiUsage)
			.innerJoin(apiKeys, eq(apiKeys.id, apiUsage.apiKeyId))
			.where(
				and(eq(apiKeys.userId, userId), gte(apiUsage.timestamp, startOfHour)),
			);

		currentUsage = usage ? usage.length : 0;
	} else {
		// For other types, check monthly limits
		const limitRecordResult = await db
			.select()
			.from(usageLimits)
			.where(
				and(
					eq(usageLimits.subscriptionId, subscription?.id || ""),
					gte(usageLimits.month, startOfMonth),
					lte(usageLimits.month, endOfMonth),
				),
			)
			.limit(1);

		const limitRecord =
			limitRecordResult.length > 0 ? limitRecordResult[0] : null;

		if (limitRecord) {
			if (type === "snapshot") {
				currentUsage = limitRecord.snapshotsUsed ?? 0;
			} else if (type === "storage") {
				currentUsage = limitRecord.cloudStorageUsedMb ?? 0;
			}
		}
	}

	const limit = planLimits[type as keyof typeof planLimits] as number;

	if (currentUsage >= limit) {
		throw new Error(`${type} quota exceeded. Upgrade to continue.`);
	}

	return true;
}

// Update usage limits after an operation
export async function updateUsageLimits(
	subscriptionId: string,
	type: "snapshot" | "storage",
	amount: number,
) {
	// Check if database is available and capture reference
	const db = getDb();
	if (!db) {
		return;
	}

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	// Check if we have a record for this month
	const limitRecordResult = await db
		.select()
		.from(usageLimits)
		.where(
			and(
				eq(usageLimits.subscriptionId, subscriptionId),
				eq(usageLimits.month, startOfMonth),
			),
		)
		.limit(1);

	const limitRecord =
		limitRecordResult.length > 0 ? limitRecordResult[0] : null;

	if (limitRecord) {
		// Update existing record
		if (type === "snapshot") {
			await db
				.update(usageLimits)
				.set({
					snapshotsUsed: (limitRecord.snapshotsUsed ?? 0) + amount,
				})
				.where(eq(usageLimits.id, limitRecord.id));
		} else if (type === "storage") {
			await db
				.update(usageLimits)
				.set({
					cloudStorageUsedMb: (limitRecord.cloudStorageUsedMb ?? 0) + amount,
				})
				.where(eq(usageLimits.id, limitRecord.id));
		}
	} else {
		// Create new record
		if (type === "snapshot") {
			await db.insert(usageLimits).values({
				subscriptionId,
				month: startOfMonth,
				snapshotsUsed: amount,
			});
		} else if (type === "storage") {
			await db.insert(usageLimits).values({
				subscriptionId,
				month: startOfMonth,
				cloudStorageUsedMb: amount,
			});
		}
	}
}
