/**
 * User Subscription Plan Logic
 *
 * Centralized business logic for determining user subscription plans.
 */

import { logger } from "@snapback/infrastructure";
import { db } from "@snapback/platform";
import { subscriptions } from "@snapback/platform/db/schema/postgres";
import { eq } from "drizzle-orm";

export type SubscriptionPlan = "free" | "solo" | "team" | "enterprise";

/**
 * Get user's current subscription plan
 * @returns Plan name, defaults to "free" if no active subscription
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
	if (!db) {
		logger.warn("Database not available for plan lookup");
		return "free";
	}
	try {
		const sub = await db
			.select({ plan: subscriptions.plan, status: subscriptions.status })
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId))
			.limit(1)
			.then((rows) => rows[0] || null);

		if (sub && (sub.status === "active" || sub.status === "trialing")) {
			return sub.plan as SubscriptionPlan;
		}
		return "free";
	} catch (error) {
		logger.error("Failed to get user plan", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return "free";
	}
}
