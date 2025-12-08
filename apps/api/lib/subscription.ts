import { subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "../src/services/database";

export async function getSubscription(userId: string) {
	// Check if database is available and capture reference
	const db = getDb();
	if (!db) {
		// Return default free plan if database not available
		return {
			plan: "free",
			status: "active",
			currentPeriodStart: new Date(),
			currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
		};
	}

	const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

	if (!result || result.length === 0) {
		// Return default free plan if no subscription found
		return {
			plan: "free",
			status: "active",
			currentPeriodStart: new Date(),
			currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
		};
	}

	return result[0];
}
