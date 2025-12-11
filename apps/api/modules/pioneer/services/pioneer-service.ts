/**
 * Pioneer Service - Business Logic Consolidation
 *
 * Canonical location for Pioneer program business logic.
 * Eliminates duplication across procedures by centralizing:
 * - Database access patterns
 * - Error handling
 * - Tier calculations
 *
 * Per: always-code-consolidation.md (Canonical Locations)
 */

import { logger } from "@snapback/infrastructure";
import { type DatabaseClient, pioneers } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/services/database";
import type { PioneerProfile } from "../types";

/**
 * Get authenticated user's pioneer profile
 * Consolidates the fetch pattern used in me, submitAction, listActions
 */
export async function getPioneerProfile(userId: string): Promise<PioneerProfile> {
	const db = getDb();
	if (!db) {
		throw new Error("DATABASE_UNAVAILABLE");
	}

	const result = await db.select().from(pioneers).where(eq(pioneers.userId, userId)).limit(1);

	if (!result || result.length === 0) {
		logger.warn("Pioneer profile not found", { userId });
		throw new Error("PIONEER_NOT_FOUND");
	}

	// Convert database Date objects to ISO strings for API type
	return mapDbProfileToApiProfile(result[0]);
}

/**
 * Map database pioneer record (with Date objects) to API PioneerProfile (with string dates)
 */
export function mapDbProfileToApiProfile(dbProfile: any): PioneerProfile {
	return {
		id: dbProfile.id,
		username: dbProfile.username,
		githubId: dbProfile.githubId,
		tier: dbProfile.tier,
		totalPoints: dbProfile.totalPoints,
		joinedAt: dbProfile.joinedAt instanceof Date ? dbProfile.joinedAt.toISOString() : dbProfile.joinedAt,
		referralCode: dbProfile.referralCode,
		githubStarred: dbProfile.githubStarred,
		lastSyncedAt:
			dbProfile.lastSyncedAt instanceof Date
				? dbProfile.lastSyncedAt.toISOString()
				: dbProfile.lastSyncedAt || new Date().toISOString(),
		createdAt: dbProfile.createdAt instanceof Date ? dbProfile.createdAt.toISOString() : dbProfile.createdAt,
		updatedAt: dbProfile.updatedAt instanceof Date ? dbProfile.updatedAt.toISOString() : dbProfile.updatedAt,
	};
}

/**
 * Ensure database is available
 * Consolidates the getDb check pattern used in all procedures
 */
export function ensureDatabase(): NonNullable<DatabaseClient> {
	const db = getDb();
	if (!db) {
		throw new Error("DATABASE_UNAVAILABLE");
	}
	return db;
}
