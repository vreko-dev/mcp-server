import { snapshots, subscriptions } from "@snapback/platform";
import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

const subscriptionDataSchema = z.object({
	plan: z.enum(["free", "solo", "team", "enterprise"]),
	status: z.enum(["active", "canceled", "past_due", "trialing", "paused"]),
	currentPeriodEnd: z.date().optional(),
	trialEnd: z.date().optional(),
	snapshotsUsed: z.number(),
	snapshotsLimit: z.number().nullable(), // null for unlimited
	percentUsed: z.number(),
	remaining: z.number(),
	daysRemaining: z.number().optional(),
});

const getSubscriptionDataOutputSchema = subscriptionDataSchema;

export const getSubscriptionData = protectedProcedure
	.output(getSubscriptionDataOutputSchema)
	.handler(async ({ context }) => {
		const userId = context.user.id;

		const db = getDb();
		if (!db) {
			return {
				plan: "free" as const,
				status: "active" as const,
				snapshotsUsed: 0,
				snapshotsLimit: 100,
				percentUsed: 0,
				remaining: 100,
			};
		}

		// Get subscription for current period
		const [subscription] = await getDb()
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId))
			.limit(1);

		if (!subscription) {
			return {
				plan: "free" as const,
				status: "active" as const,
				snapshotsUsed: 0,
				snapshotsLimit: 100,
				percentUsed: 0,
				remaining: 100,
			};
		}

		// Count snapshots in current billing period
		const currentPeriodStart = subscription.currentPeriodStart || new Date(Date.now() - 30 * 86400000); // 30 days ago

		const periodSnapshots = await getDb()
			.select({ count: count() })
			.from(snapshots)
			.where(and(eq(snapshots.userId, userId), gte(snapshots.createdAt, currentPeriodStart)));

		const snapshotsUsed = periodSnapshots[0]?.count || 0;

		// Determine limits based on plan
		let snapshotsLimit: number | null = 100; // Free tier default
		if (subscription.plan !== "free") {
			snapshotsLimit = null; // Unlimited for paid plans
		}

		const remaining = snapshotsLimit !== null ? snapshotsLimit - snapshotsUsed : 0;
		const percentUsed =
			snapshotsLimit !== null && snapshotsLimit > 0
				? Math.min(100, Math.round((snapshotsUsed / snapshotsLimit) * 100))
				: 0;

		// Calculate days remaining if subscription has end date
		let daysRemaining: number | undefined;
		if (subscription.currentPeriodEnd) {
			const now = new Date();
			const diffTime = subscription.currentPeriodEnd.getTime() - now.getTime();
			daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
		}

		return {
			plan: subscription.plan as "free" | "solo" | "team" | "enterprise",
			status: subscription.status as "active" | "canceled" | "past_due" | "trialing" | "paused",
			currentPeriodEnd: subscription.currentPeriodEnd || undefined,
			trialEnd: subscription.trialEnd || undefined,
			snapshotsUsed,
			snapshotsLimit,
			percentUsed,
			remaining,
			daysRemaining,
		};
	});
