/**
 * Pioneer Program Type Definitions
 * Shared types between extension and server
 */

export type Tier = "seedling" | "grower" | "cultivator" | "guardian";

export interface PioneerProfile {
	id: string;
	username: string;
	githubId: string;
	tier: Tier;
	totalPoints: number;
	joinedAt: string;
	referralCode: string;
	githubStarred: boolean;
	lastSyncedAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface PioneerAction {
	id: string;
	pioneerId: string;
	actionType: "github_star" | "discord_join" | "referral" | "feedback" | "bug_report" | "tutorial_complete";
	points: number;
	verified: boolean;
	verifiedAt?: string;
	metadata?: Record<string, any>;
	createdAt: string;
}

export interface PioneerTierHistory {
	id: string;
	pioneerId: string;
	previousTier: Tier;
	newTier: Tier;
	totalPoints: number;
	createdAt: string;
}

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

export function calculateTierFromPoints(points: number): Tier {
	if (points >= TIER_THRESHOLDS.guardian.min) return "guardian";
	if (points >= TIER_THRESHOLDS.cultivator.min) return "cultivator";
	if (points >= TIER_THRESHOLDS.grower.min) return "grower";
	return "seedling";
}
