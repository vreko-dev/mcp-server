/**
 * Unified authentication query layer using Drizzle ORM
 * Provides type-safe, performant database operations for auth middleware
 *
 * This module serves as the single source of truth for all authentication-related
 * database queries, ensuring consistency across the API and reducing code duplication.
 */

import { logger } from "@snapback/infrastructure";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "../client.js";
import { apiKeys, member, subscriptions, user } from "../schema/postgres.js";

/**
 * Get user by ID with type safety
 */
export async function getUserById(userId: string) {
	if (!db) {
		logger.error("Database client not initialized");
		return null;
	}
	try {
		return await db
			.select()
			.from(user)
			.where(eq(user.id, userId))
			.limit(1)
			.then((rows) => rows[0] || null);
	} catch (error) {
		logger.error("Failed to get user by ID", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Get user by email address
 */
export async function getUserByEmail(email: string) {
	if (!db) {
		logger.error("Database client not initialized");
		return null;
	}
	try {
		return await db
			.select()
			.from(user)
			.where(eq(user.email, email))
			.limit(1)
			.then((rows) => rows[0] || null);
	} catch (error) {
		logger.error("Failed to get user by email", {
			email,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Get API key record by full key or ID
 * Used for validation and permission checking
 */
export async function getApiKeyById(keyId: string) {
	if (!db) {
		logger.error("Database client not initialized");
		return null;
	}
	try {
		return await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.id, keyId))
			.limit(1)
			.then((rows) => rows[0] || null);
	} catch (error) {
		logger.error("Failed to get API key", {
			keyId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Validate API key by key preview/prefix
 * Returns the full key record only if not revoked and not expired
 */
export async function getApiKeyByPrefix(keyPreview: string) {
	if (!db) {
		logger.error("Database client not initialized");
		return null;
	}
	try {
		return await db
			.select()
			.from(apiKeys)
			.where(
				and(
					eq(apiKeys.keyPreview, keyPreview),
					isNull(apiKeys.revokedAt),
					// Check expiration - column first, then value
					or(isNull(apiKeys.expiresAt), lte(apiKeys.expiresAt, new Date())),
				),
			)
			.limit(1)
			.then((rows) => rows[0] || null);
	} catch (error) {
		logger.error("Failed to get API key by prefix", {
			keyPreview,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Validate that an API key exists and is not revoked
 * Used for permission checking and audit logging
 */
export async function validateApiKeyNotRevoked(keyId: string): Promise<boolean> {
	if (!db) {
		logger.error("Database client not initialized");
		return false;
	}
	try {
		const result = await db
			.select({ id: apiKeys.id })
			.from(apiKeys)
			.where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)))
			.limit(1);

		return result.length > 0;
	} catch (error) {
		logger.error("Failed to validate API key revocation status", {
			keyId,
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * Get user's current subscription plan
 * Defaults to "free" if no active subscription found
 *
 * Returns: "free" | "solo" | "team" | "enterprise"
 */
export async function getUserPlan(userId: string): Promise<string> {
	if (!db) {
		logger.error("Database client not initialized");
		return "free";
	}
	try {
		const sub = await db
			.select({
				plan: subscriptions.plan,
				status: subscriptions.status,
			})
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId))
			.limit(1)
			.then((rows) => rows[0] || null);

		// Return plan if subscription is active, otherwise default to free
		if (sub && (sub.status === "active" || sub.status === "trialing")) {
			return sub.plan;
		}

		return "free";
	} catch (error) {
		logger.error("Failed to get user plan", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return "free"; // Default to free on error
	}
}

/**
 * Generate permissions array based on user role and subscription plan
 * Follows the principle of least privilege - only grant what's explicitly needed
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
	try {
		const userRecord = await getUserById(userId);
		if (!userRecord) {
			return [];
		}

		const plan = await getUserPlan(userId);
		const permissions: string[] = [];

		// Role-based permissions
		if (userRecord.role === "admin") {
			permissions.push("admin:read", "admin:write", "admin:delete", "org:manage", "user:manage");
		}

		if (userRecord.role === "user" || userRecord.role === "admin") {
			permissions.push("snapshot:create", "snapshot:read", "snapshot:update", "snapshot:delete");
		}

		if (userRecord.role === "viewer" || userRecord.role === "user" || userRecord.role === "admin") {
			permissions.push("snapshot:view", "report:view");
		}

		// Plan-based feature access
		const planPermissions: Record<string, string[]> = {
			free: ["snapshot:create:5/day"],
			solo: ["snapshot:*", "api:webhooks"],
			team: ["snapshot:*", "api:webhooks", "api:advanced-analytics", "team:collaboration"],
			enterprise: [
				"snapshot:*",
				"api:*",
				"team:*",
				"sso:enabled",
				"audit:enabled",
				"compliance:enabled",
				"support:priority",
			],
		};

		const planPerms = planPermissions[plan] || planPermissions.free;
		permissions.push(...planPerms);

		return permissions;
	} catch (error) {
		logger.error("Failed to get user permissions", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Get all organization IDs for a user
 * Used for Row-Level Security (RLS) enforcement
 */
export async function getUserOrgIds(userId: string): Promise<string[]> {
	if (!db) {
		logger.error("Database client not initialized");
		return [];
	}
	try {
		const memberships = await db
			.select({ orgId: member.organizationId })
			.from(member)
			.where(eq(member.userId, userId));

		return memberships.map((m) => m.orgId);
	} catch (error) {
		logger.error("Failed to get user org IDs", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/**
 * Check if user is member of an organization
 * Returns organization record if member, null otherwise
 */
export async function checkOrgMembership(userId: string, orgId: string) {
	if (!db) {
		logger.error("Database client not initialized");
		return null;
	}
	try {
		const membership = await db
			.select({
				userId: member.userId,
				organizationId: member.organizationId,
				role: member.role,
			})
			.from(member)
			.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
			.limit(1)
			.then((rows) => rows[0] || null);

		return membership;
	} catch (error) {
		logger.error("Failed to check org membership", {
			userId,
			orgId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Update API key last used timestamp
 * Called after successful API key validation for audit trail
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
	if (!db) {
		logger.warn("Database client not initialized - cannot update API key last used");
		return;
	}
	try {
		await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
	} catch (error) {
		logger.warn("Failed to update API key last used timestamp", {
			keyId,
			error: error instanceof Error ? error.message : String(error),
		});
		// Non-critical operation, continue on error
	}
}

/**
 * Revoke an API key by ID
 * Prevents further use while maintaining audit trail
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
	if (!db) {
		logger.error("Database client not initialized");
		return false;
	}
	try {
		const _result = await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, keyId));

		return true;
	} catch (error) {
		logger.error("Failed to revoke API key", {
			keyId,
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * Helper function - Combine queries for user context
 * Returns complete auth context for a user
 */
export async function getUserAuthContext(userId: string) {
	try {
		const userRecord = await getUserById(userId);
		if (!userRecord) {
			return null;
		}

		const plan = await getUserPlan(userId);
		const permissions = await getUserPermissions(userId);
		const orgIds = await getUserOrgIds(userId);

		return {
			user: userRecord,
			plan,
			permissions,
			orgIds,
		};
	} catch (error) {
		logger.error("Failed to get user auth context", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
