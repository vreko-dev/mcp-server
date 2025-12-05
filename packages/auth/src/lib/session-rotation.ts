/**
 * Session Rotation on Privilege Escalation
 *
 * Invalidates all user sessions when privileges change to prevent
 * session fixation and privilege escalation attacks
 *
 * OWASP: A01:2021 - Broken Access Control
 * OWASP: A07:2021 - Session Fixation
 * NIST: SP 800-63B Section 7.1
 *
 * Architecture:
 * - Uses Redis for distributed session invalidation
 * - Falls back to database when Redis unavailable
 * - Integrates with Better Auth organization plugin
 */

import { logger } from "@snapback/infrastructure";
import { trackEvent } from "./audit.js";

/**
 * Rotate all sessions for a user when their role changes
 *
 * This prevents session fixation attacks where an attacker with a valid
 * low-privilege session tries to exploit a privilege escalation.
 *
 * @param userId User ID whose sessions should be invalidated
 * @param oldRole Previous role
 * @param newRole New role
 */
export async function rotateSessionsOnRoleChange(
	userId: string,
	oldRole: string,
	newRole: string,
): Promise<void> {
	// Skip if role hasn't actually changed
	if (oldRole === newRole) {
		logger.debug("Role unchanged, skipping session rotation", {
			userId,
			role: oldRole,
		});
		return;
	}

	logger.info("Rotating sessions due to role change", {
		userId,
		oldRole,
		newRole,
	});

	try {
		// Attempt Redis-based invalidation first
		const count = await invalidateSessionsRedis(userId);

		if (count !== null) {
			// Redis invalidation successful
			await trackEvent("session.rotated" as any, {
				userId,
				oldRole,
				newRole,
				reason: "privilege_change",
				sessionsInvalidated: count,
				method: "redis",
			});

			logger.info("Sessions rotated successfully", {
				userId,
				count,
				method: "redis",
			});
		} else {
			// Fallback to database invalidation
			const dbCount = await invalidateSessionsDatabase(userId);

			await trackEvent("session.rotated" as any, {
				userId,
				oldRole,
				newRole,
				reason: "privilege_change",
				sessionsInvalidated: dbCount,
				method: "database",
			});

			logger.info("Sessions rotated successfully (database fallback)", {
				userId,
				count: dbCount,
				method: "database",
			});
		}
	} catch (error) {
		logger.error("Failed to rotate sessions", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * Rotate sessions for a specific organization context
 * Only invalidates sessions associated with the given organization
 *
 * @param userId User ID
 * @param organizationId Organization ID
 * @param oldRole Previous role in this organization
 * @param newRole New role in this organization
 */
export async function rotateSessionsOnOrgRoleChange(
	userId: string,
	organizationId: string,
	oldRole: string,
	newRole: string,
): Promise<void> {
	if (oldRole === newRole) {
		return;
	}

	logger.info("Rotating organization-scoped sessions", {
		userId,
		organizationId,
		oldRole,
		newRole,
	});

	try {
		// For organization-scoped rotation, we invalidate sessions that have
		// activeOrganizationId === organizationId
		const count = await invalidateOrgSessionsRedis(userId, organizationId);

		if (count !== null) {
			await trackEvent("session.rotated" as any, {
				userId,
				organizationId,
				oldRole,
				newRole,
				reason: "org_privilege_change",
				sessionsInvalidated: count,
			});
		} else {
			// Database fallback
			const dbCount = await invalidateOrgSessionsDatabase(
				userId,
				organizationId,
			);

			await trackEvent("session.rotated" as any, {
				userId,
				organizationId,
				oldRole,
				newRole,
				reason: "org_privilege_change",
				sessionsInvalidated: dbCount,
			});
		}
	} catch (error) {
		logger.error("Failed to rotate organization sessions", {
			userId,
			organizationId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

// =============================================================================
// Redis Implementation
// =============================================================================

/**
 * Invalidate all sessions for a user using Redis
 * Returns null if Redis is unavailable
 */
async function invalidateSessionsRedis(userId: string): Promise<number | null> {
	try {
		const { redisClient, redisAvailable } = await import("../auth.js");

		if (!redisAvailable || !redisClient) {
			logger.debug("Redis not available for session rotation");
			return null;
		}

		// Find all session keys for this user
		// Better Auth stores sessions with pattern: session:{userId}:*
		const pattern = `snapback:session:${userId}:*`;
		const keys = await redisClient.keys(pattern);

		if (keys.length === 0) {
			logger.debug("No Redis sessions found for user", { userId });
			return 0;
		}

		// Delete all session keys
		await redisClient.del(keys);

		logger.debug("Invalidated Redis sessions", {
			userId,
			count: keys.length,
		});

		return keys.length;
	} catch (error) {
		logger.warn("Redis session invalidation failed", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Invalidate organization-scoped sessions using Redis
 */
async function invalidateOrgSessionsRedis(
	userId: string,
	organizationId: string,
): Promise<number | null> {
	try {
		const { redisClient, redisAvailable } = await import("../auth.js");

		if (!redisAvailable || !redisClient) {
			return null;
		}

		// Find sessions with this organization context
		const pattern = `snapback:session:${userId}:org:${organizationId}:*`;
		const keys = await redisClient.keys(pattern);

		if (keys.length > 0) {
			await redisClient.del(keys);
		}

		return keys.length;
	} catch (error) {
		logger.warn("Redis org session invalidation failed", {
			userId,
			organizationId,
			error,
		});
		return null;
	}
}

// =============================================================================
// Database Fallback Implementation
// =============================================================================

/**
 * Invalidate all sessions for a user using database
 */
async function invalidateSessionsDatabase(userId: string): Promise<number> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			logger.warn("Database not available for session invalidation");
			return 0;
		}

		// Delete all sessions for this user
		const result = await db.execute(sql`
			DELETE FROM session 
			WHERE user_id = ${userId}
		`);

		const count = result.rowCount || 0;

		logger.debug("Invalidated database sessions", { userId, count });

		return count;
	} catch (error) {
		logger.error("Database session invalidation failed", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return 0;
	}
}

/**
 * Invalidate organization-scoped sessions using database
 */
async function invalidateOrgSessionsDatabase(
	userId: string,
	organizationId: string,
): Promise<number> {
	try {
		const { db } = await import("@snapback/platform");
		const { sql } = await import("drizzle-orm");

		if (!db) {
			return 0;
		}

		// Delete sessions where activeOrganizationId matches
		const result = await db.execute(sql`
			DELETE FROM session 
			WHERE user_id = ${userId} 
			AND active_organization_id = ${organizationId}
		`);

		return result.rowCount || 0;
	} catch (error) {
		logger.error("Database org session invalidation failed", {
			userId,
			organizationId,
			error,
		});
		return 0;
	}
}
