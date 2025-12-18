/**
 * Pioneer Service - Business Logic for Pioneer Program
 *
 * Canonical location: apps/api/src/services/pioneer-service.ts
 * Per architecture rules: Business logic MUST go in apps/api/src/services/
 *
 * Centralizes:
 * - Database access patterns
 * - Error handling
 * - Tier calculations
 * - Leaderboard logic
 */

import type { PioneerTier } from "@snapback/contracts";
import { logger } from "@snapback/infrastructure";
import { type DatabaseClient, pioneers } from "@snapback/platform";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import { getDb } from "./database";

// --- Types ---
/** @deprecated Use PioneerTier from @snapback/contracts instead */
export type Tier = PioneerTier;
export type LeaderboardVisibility = "public" | "anonymous" | "hidden";

export interface PioneerProfile {
	id: string;
	username: string;
	githubId: string;
	contactEmail: string | null;
	tier: Tier;
	totalPoints: number;
	joinedAt: string;
	referralCode: string;
	githubStarred: boolean;
	leaderboardVisibility: LeaderboardVisibility;
	lastSyncedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface LeaderboardEntry {
	rank: number;
	display: string;
	tier: Tier;
	points: number;
	isCurrentUser: boolean;
}

// --- Tier Thresholds ---
export const TIER_THRESHOLDS: Record<Tier, { min: number; max: number }> = {
	seedling: { min: 0, max: 249 },
	grower: { min: 250, max: 749 },
	cultivator: { min: 750, max: 1499 },
	guardian: { min: 1500, max: Number.POSITIVE_INFINITY },
};

export const POINT_VALUES: Record<string, number> = {
	github_star: 100,
	discord_join: 75,
	referral_direct: 200,
	referral_bonus: 100,
	feedback: 150,
	bug_report: 300,
	tutorial_complete: 50,
	waitlist_early: 50,
};

export const TIER_BENEFITS: Record<Tier, string[]> = {
	seedling: ["Cluster protection (beta)", "50% lifetime Pro discount", "Name in GitHub credits"],
	grower: [
		"Everything in Seedling",
		"Discord Pioneer role",
		"Monthly founder AMA",
		"Beta feature previews",
		"Co-change analysis",
	],
	cultivator: ["Everything in Grower", "Private Slack channel", "Priority support", "Feature request voting"],
	guardian: ["Everything in Cultivator", "Lifetime free Pro", "Advisory board invite", "Custom Pioneer badge"],
};

// --- Utility Functions ---
export function calculateTierFromPoints(points: number): Tier {
	if (points >= TIER_THRESHOLDS.guardian.min) return "guardian";
	if (points >= TIER_THRESHOLDS.cultivator.min) return "cultivator";
	if (points >= TIER_THRESHOLDS.grower.min) return "grower";
	return "seedling";
}

export function obfuscateUsername(username: string): string {
	if (!username || username.length === 0) return "***";
	if (username.length <= 3) return `${username[0]}**`;
	const middleLength = username.length - 2;
	return `${username[0]}${"*".repeat(middleLength)}${username[username.length - 1]}`;
}

// --- Database Access ---
export function ensureDatabase(): NonNullable<DatabaseClient> {
	const db = getDb();
	if (!db) {
		throw new Error("DATABASE_UNAVAILABLE");
	}
	return db;
}

/**
 * Map database pioneer record to API PioneerProfile
 */
export function mapDbProfileToApiProfile(dbProfile: any): PioneerProfile {
	return {
		id: dbProfile.id,
		username: dbProfile.username,
		githubId: dbProfile.githubId,
		contactEmail: dbProfile.contactEmail || null,
		tier: dbProfile.tier,
		totalPoints: dbProfile.totalPoints,
		joinedAt: dbProfile.joinedAt instanceof Date ? dbProfile.joinedAt.toISOString() : dbProfile.joinedAt,
		referralCode: dbProfile.referralCode,
		githubStarred: dbProfile.githubStarred,
		leaderboardVisibility: dbProfile.leaderboardVisibility || "anonymous",
		lastSyncedAt:
			dbProfile.lastSyncedAt instanceof Date
				? dbProfile.lastSyncedAt.toISOString()
				: dbProfile.lastSyncedAt || new Date().toISOString(),
		createdAt: dbProfile.createdAt instanceof Date ? dbProfile.createdAt.toISOString() : dbProfile.createdAt,
		updatedAt: dbProfile.updatedAt instanceof Date ? dbProfile.updatedAt.toISOString() : dbProfile.updatedAt,
	};
}

/**
 * Get authenticated user's pioneer profile
 */
export async function getPioneerProfile(userId: string): Promise<PioneerProfile> {
	const db = ensureDatabase();

	const result = await db.select().from(pioneers).where(eq(pioneers.userId, userId)).limit(1);

	if (!result || result.length === 0) {
		logger.warn("Pioneer profile not found", { userId });
		throw new Error("PIONEER_NOT_FOUND");
	}

	return mapDbProfileToApiProfile(result[0]);
}

/**
 * Get leaderboard with privacy controls
 */
export async function getLeaderboard(
	currentUserId: string | undefined,
	options: { limit: number; offset: number },
): Promise<{ entries: LeaderboardEntry[]; total: number; currentUserRank?: number }> {
	const db = ensureDatabase();
	const { limit, offset } = options;

	// Query for non-hidden pioneers ordered by points
	const allVisible = await db
		.select({
			id: pioneers.id,
			userId: pioneers.userId,
			username: pioneers.username,
			tier: pioneers.tier,
			totalPoints: pioneers.totalPoints,
			leaderboardVisibility: pioneers.leaderboardVisibility,
		})
		.from(pioneers)
		.where(and(ne(pioneers.leaderboardVisibility, "hidden"), gt(pioneers.totalPoints, 0)))
		.orderBy(desc(pioneers.totalPoints));

	const total = allVisible.length;
	const paginatedResults = allVisible.slice(offset, offset + limit);

	const entries: LeaderboardEntry[] = paginatedResults.map((pioneer, index) => {
		const globalRank = offset + index + 1;
		const isCurrentUser = currentUserId ? pioneer.userId === currentUserId : false;

		let display: string;
		if (isCurrentUser) {
			display = "You";
		} else if (pioneer.leaderboardVisibility === "public") {
			display = pioneer.username;
		} else {
			display = obfuscateUsername(pioneer.username);
		}

		return {
			rank: globalRank,
			display,
			tier: pioneer.tier as Tier,
			points: pioneer.totalPoints,
			isCurrentUser,
		};
	});

	// Calculate current user's rank
	let currentUserRank: number | undefined;
	if (currentUserId) {
		const userIndex = allVisible.findIndex((p) => p.userId === currentUserId);
		if (userIndex !== -1) {
			currentUserRank = userIndex + 1;
		}
	}

	return { entries, total, currentUserRank };
}
