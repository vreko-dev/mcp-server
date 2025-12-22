/**
 * User Context Service - Shared queries for user API keys and subscriptions
 *
 * Per C-002: All database queries go through service layer
 * This service centralizes the common pattern of fetching user context
 * (API key, subscription) that is needed by multiple procedure modules.
 */

import { apiKeys, subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "./database";

// ============================================================================
// Types
// ============================================================================

export type ApiKeyRecord = typeof apiKeys.$inferSelect;
export type SubscriptionRecord = typeof subscriptions.$inferSelect;

export interface UserContext {
	apiKey: ApiKeyRecord;
	subscription: SubscriptionRecord | null;
}

export interface ApiKeyPermissions {
	maxSnapshots?: number;
	cloudBackup?: boolean;
	advancedDetection?: boolean;
	customRules?: boolean;
	teamSharing?: boolean;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get user's API key by user ID
 */
export async function getUserApiKey(userId: string): Promise<ApiKeyRecord | null> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);

	return result && result.length > 0 ? result[0] : null;
}

/**
 * Get user's API key - throws if not found
 */
export async function requireUserApiKey(userId: string): Promise<ApiKeyRecord> {
	const apiKey = await getUserApiKey(userId);
	if (!apiKey) {
		throw new Error("No API key found");
	}
	return apiKey;
}

/**
 * Get user's subscription by user ID
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionRecord | null> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);

	return result && result.length > 0 ? result[0] : null;
}

/**
 * Get full user context (API key + subscription) in a single call
 * Useful when both are needed to avoid multiple round trips
 */
export async function getUserContext(userId: string): Promise<UserContext> {
	const apiKey = await requireUserApiKey(userId);
	const subscription = await getUserSubscription(userId);

	return { apiKey, subscription };
}

/**
 * Get API key permissions with defaults
 */
export function getApiKeyPermissions(apiKey: ApiKeyRecord): ApiKeyPermissions {
	return (apiKey.permissions as ApiKeyPermissions) || {};
}

/**
 * Get user's subscription tier
 */
export function getSubscriptionTier(subscription: SubscriptionRecord | null): string {
	return subscription?.plan || "free";
}
