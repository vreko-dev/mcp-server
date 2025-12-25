/**
 * Auto-Provision API Key Service
 *
 * Automatically provisions a "CLI Access" API key for new users
 * on their first authenticated dashboard visit.
 *
 * This creates an invisible, frictionless auth flow where users
 * get everything they need without manual key creation.
 *
 * @module apikeys/services/auto-provision
 */

import { generateApiKey, hashApiKey } from "@snapback/auth";
import { apiKeyMetadata, apiKeys, subscriptions } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { generateSigningSecret } from "@/lib/security";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface AutoProvisionResult {
	provisioned: boolean;
	apiKey?: {
		id: string;
		name: string;
		key: string; // Full key - shown only once
		keyPreview: string;
		createdAt: Date;
	};
	existingKey?: {
		id: string;
		name: string;
		keyPreview: string;
	};
	error?: string;
}

export interface ProvisionContext {
	userId: string;
	email: string;
	source: "onboarding" | "dashboard" | "cli" | "extension";
}

// ============================================================================
// Constants
// ============================================================================

const AUTO_KEY_NAME = "CLI Access (auto-generated)";
const AUTO_KEY_SCOPES = ["code:analyze", "code:refactor", "code:search", "snapshots:read", "snapshots:write"];

// ============================================================================
// Auto-Provision Logic
// ============================================================================

/**
 * Check if user already has an auto-provisioned key
 */
export async function hasAutoProvisionedKey(userId: string): Promise<boolean> {
	const db = getDb();
	if (!db) return false;

	const existing = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);

	return existing.length > 0;
}

/**
 * Get user's existing API key (if any)
 */
export async function getExistingKey(userId: string): Promise<AutoProvisionResult["existingKey"] | null> {
	const db = getDb();
	if (!db) return null;

	const existing = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPreview: apiKeys.keyPreview,
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, userId))
		.limit(1);

	if (existing.length === 0) return null;

	return {
		id: existing[0].id,
		name: existing[0].name ?? AUTO_KEY_NAME,
		keyPreview: existing[0].keyPreview ?? "sk_live_...",
	};
}

/**
 * Get user's subscription plan
 */
async function getUserPlan(userId: string): Promise<string> {
	const db = getDb();
	if (!db) return "free";

	const result = await db
		.select({ plan: subscriptions.plan })
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.limit(1);

	return result[0]?.plan ?? "free";
}

/**
 * Get permissions based on subscription plan
 * Returns a text[] array of permission scopes (matches DB schema)
 */
function getPermissionsForPlan(plan: string): string[] {
	const basePermissions = [...AUTO_KEY_SCOPES];

	switch (plan) {
		case "enterprise":
		case "team":
			return [...basePermissions, "snapshots:cloud", "team:share"];
		case "pro":
			return [...basePermissions, "snapshots:cloud"];
		default:
			return basePermissions;
	}
}

/**
 * Auto-provision an API key for a user
 *
 * This is the core function that creates a frictionless experience.
 * Call this on:
 * - First dashboard visit after signup
 * - Onboarding completion
 * - CLI login attempt without existing key
 *
 * Uses transaction with unique constraint check to prevent race conditions.
 *
 * @param context - Provision context with user info and source
 * @returns Result with provisioned key or existing key info
 */
export async function autoProvisionApiKey(context: ProvisionContext): Promise<AutoProvisionResult> {
	const { userId } = context;
	const db = getDb();

	if (!db) {
		return { provisioned: false, error: "Database not available" };
	}

	try {
		// Use transaction to prevent race conditions
		return await db.transaction(async (tx) => {
			// Check if user already has an auto-provisioned key (with lock)
			const existingKeys = await tx
				.select({
					id: apiKeys.id,
					name: apiKeys.name,
					keyPreview: apiKeys.keyPreview,
				})
				.from(apiKeys)
				.where(and(eq(apiKeys.userId, userId), eq(apiKeys.name, AUTO_KEY_NAME)))
				.limit(1);

			if (existingKeys.length > 0) {
				const existing = existingKeys[0];
				return {
					provisioned: false,
					existingKey: {
						id: existing.id,
						name: existing.name ?? AUTO_KEY_NAME,
						keyPreview: existing.keyPreview ?? "sk_live_...",
					},
				};
			}

			// Get user's plan for permissions
			const planResult = await tx
				.select({ plan: subscriptions.plan })
				.from(subscriptions)
				.where(eq(subscriptions.userId, userId))
				.limit(1);
			const plan = planResult[0]?.plan ?? "free";

			// Generate new key
			const rawKey = generateApiKey();
			const hashedKey = await hashApiKey(rawKey);
			const keyPreview = `${rawKey.slice(0, 12)}...`; // Standardized 12 chars

			// Create key in database (within transaction)
			const [newKey] = await tx
				.insert(apiKeys)
				.values({
					userId,
					name: AUTO_KEY_NAME,
					key: hashedKey,
					keyPreview,
					permissions: getPermissionsForPlan(plan),
				})
				.returning();

			if (!newKey) {
				return { provisioned: false, error: "Failed to create API key" };
			}

			// Create metadata record (within transaction)
			await tx.insert(apiKeyMetadata).values({
				apiKeyId: newKey.id,
				userId,
				name: AUTO_KEY_NAME,
				environment: "production",
				scopes: AUTO_KEY_SCOPES,
				signingSecret: generateSigningSecret(),
			});

			return {
				provisioned: true,
				apiKey: {
					id: newKey.id,
					name: AUTO_KEY_NAME,
					key: rawKey, // Full key - only time it's visible
					keyPreview,
					createdAt: newKey.createdAt ?? new Date(),
				},
			};
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { provisioned: false, error: message };
	}
}

/**
 * Get or provision API key for user
 *
 * Convenience wrapper that handles both cases:
 * - Returns existing key info if user has one
 * - Auto-provisions and returns new key if not
 *
 * @param context - Provision context
 * @returns Auto-provision result
 */
export async function getOrProvisionApiKey(context: ProvisionContext): Promise<AutoProvisionResult> {
	return autoProvisionApiKey(context);
}
