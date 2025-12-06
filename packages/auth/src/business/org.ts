/**
 * Organization Membership Logic
 *
 * Centralized business logic for user-organization relationships.
 */

import { logger } from "@snapback/infrastructure";
import { db } from "@snapback/platform";
import { member } from "@snapback/platform/db/schema/postgres";
import { and, eq } from "drizzle-orm";

/**
 * Get all organization IDs for a user
 * Used for Row-Level Security (RLS) enforcement
 */
export async function getUserOrgIds(userId: string): Promise<string[]> {
	if (!db) {
		logger.warn("Database not available for org lookup");
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
 * Check if user is member of a specific organization
 */
export async function checkOrgMembership(userId: string, orgId: string) {
	if (!db) return null;
	try {
		return await db
			.select({
				userId: member.userId,
				organizationId: member.organizationId,
				role: member.role,
			})
			.from(member)
			.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)))
			.limit(1)
			.then((rows) => rows[0] || null);
	} catch (error) {
		logger.error("Failed to check org membership", {
			userId,
			orgId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
