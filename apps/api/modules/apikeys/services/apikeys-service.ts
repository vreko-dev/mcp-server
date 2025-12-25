/**
 * API Keys Service - Handles API key management operations
 *
 * Per C-002: All database queries go through service layer
 * Security-critical: Manages API key creation, validation, and revocation
 */

import { apiKeyMetadata, apiKeys, subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface UserSubscriptionInfo {
	plan: string;
	keyLimit: number;
	existingKeyCount: number;
}

export interface ApiKeyCreationInput {
	userId: string;
	name: string;
	hashedKey: string;
	keyPreview: string;
	signingSecret: string;
	permissions: string[]; // Scope-based permissions array (e.g., ["code:analyze", "snapshots:read"])
}

export interface CreatedApiKey {
	id: string;
	name: string;
	createdAt: Date | null;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get user's subscription plan and API key limits
 */
export async function getUserSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo> {
	const db = getDb();
	if (!db) {
		return { plan: "free", keyLimit: 0, existingKeyCount: 0 };
	}

	const [subscriptionResult, existingKeysResult] = await Promise.all([
		db.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
		db.select().from(apiKeys).where(eq(apiKeys.userId, userId)),
	]);

	const plan = subscriptionResult?.[0]?.plan ?? "free";
	const keyLimit = getKeyLimit(plan);
	const existingKeyCount = existingKeysResult?.length ?? 0;

	return { plan, keyLimit, existingKeyCount };
}

/**
 * Get key limit based on subscription plan
 */
export function getKeyLimit(plan: string): number {
	switch (plan) {
		case "team":
		case "pro":
		case "enterprise":
			return Number.POSITIVE_INFINITY;
		default:
			return 0; // Free tier can't create API keys
	}
}

/**
 * Get permissions based on subscription plan
 * Returns a text[] array of permission scopes (matches DB schema)
 */
export function getPermissionsForPlan(plan: string): string[] {
	const basePermissions = ["code:analyze", "code:refactor", "code:search", "snapshots:read", "snapshots:write"];

	switch (plan) {
		case "enterprise":
		case "team":
			return [...basePermissions, "snapshots:cloud", "team:share", "custom:rules"];
		case "pro":
			return [...basePermissions, "snapshots:cloud", "custom:rules"];
		default:
			return basePermissions;
	}
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a new API key with metadata
 */
export async function createApiKeyRecord(input: ApiKeyCreationInput): Promise<CreatedApiKey> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const _subInfo = await getUserSubscriptionInfo(input.userId); // Reserved for future quota checks

	// Insert API key
	const [newKey] = await db
		.insert(apiKeys)
		.values({
			userId: input.userId,
			name: input.name,
			key: input.hashedKey,
			keyPreview: input.keyPreview,
			permissions: input.permissions,
		})
		.returning();

	if (!newKey) {
		throw new Error("Failed to create API key");
	}

	// Create API key metadata with signing secret
	await db.insert(apiKeyMetadata).values({
		apiKeyId: newKey.id,
		userId: input.userId,
		name: input.name,
		environment: "production",
		scopes: ["code:analyze", "code:refactor", "code:search"],
		signingSecret: input.signingSecret,
	});

	return {
		id: newKey.id,
		name: newKey.name,
		createdAt: newKey.createdAt,
	};
}

// ============================================================================
// List & Revoke Functions
// ============================================================================

export interface ApiKeyListItem {
	id: string;
	name: string | null;
	keyPreview: string | null;
	lastUsedAt: Date | null;
	createdAt: Date | null;
	revokedAt: Date | null;
}

/**
 * List all API keys for a user
 */
export async function listApiKeysForUser(userId: string): Promise<ApiKeyListItem[]> {
	const db = getDb();
	if (!db) {
		return [];
	}

	return db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPreview: apiKeys.keyPreview,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt,
			revokedAt: apiKeys.revokedAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, userId))
		.orderBy(apiKeys.createdAt);
}

/**
 * Get API key by ID with ownership verification
 */
export async function getApiKeyWithOwnerCheck(
	keyId: string,
	userId: string,
): Promise<{ id: string; userId: string } | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

	const key = result?.[0];
	if (!key || key.userId !== userId) {
		return null;
	}

	return { id: key.id, userId: key.userId };
}

/**
 * Revoke an API key by setting revokedAt timestamp
 */
export async function revokeApiKeyById(keyId: string): Promise<boolean> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, keyId)).returning();

	return (result?.length ?? 0) > 0;
}
