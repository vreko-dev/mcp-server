/**
 * Pioneer Program Types
 * Re-exports from canonical service location for backward compatibility
 */

export type {
	LeaderboardEntry,
	LeaderboardVisibility,
	PioneerProfile,
	Tier,
} from "@/src/services/pioneer-service";

export {
	calculateTierFromPoints,
	obfuscateUsername,
	POINT_VALUES,
	TIER_BENEFITS,
	TIER_THRESHOLDS,
} from "@/src/services/pioneer-service";

// Action type - used in procedures but not in service
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
	previousTier: import("@/src/services/pioneer-service").Tier;
	newTier: import("@/src/services/pioneer-service").Tier;
	totalPoints: number;
	createdAt: string;
}
