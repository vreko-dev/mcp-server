/**
 * Newsletter Service - Handles newsletter subscriber database operations
 *
 * Per C-002: All database queries go through service layer
 */

import { newsletterSubscribers } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export interface SubscriptionMetadata {
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	referrer?: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Find subscriber by email
 */
export async function findSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);

	return result && result.length > 0 ? result[0] : null;
}

/**
 * Resubscribe a previously unsubscribed user
 */
export async function resubscribeUser(email: string): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db
		.update(newsletterSubscribers)
		.set({
			unsubscribedAt: null,
			subscribedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(newsletterSubscribers.email, email));
}

/**
 * Create new newsletter subscriber
 */
export async function createSubscriber(email: string, source: string, metadata?: SubscriptionMetadata): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db.insert(newsletterSubscribers).values({
		email,
		source,
		metadata,
		subscribedAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

/**
 * Update subscriber with HubSpot contact ID
 */
export async function updateHubSpotContactId(email: string, hubspotContactId: string): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db
		.update(newsletterSubscribers)
		.set({
			hubspotContactId,
			hubspotSyncedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(newsletterSubscribers.email, email));
}
