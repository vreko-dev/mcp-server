import type { ActionType, Pioneer } from "./actions";
import { ACTIONS } from "./actions";
import type { Tier } from "./tiers";
import { getNextTier } from "./tiers";

// Mock Data
const MOCK_PIONEER: Pioneer = {
	id: "pio_123",
	userId: "user_123",
	githubUsername: "devninja",
	tier: "grower",
	totalPoints: 450,
	referralCode: "ninja450",
	createdAt: new Date().toISOString(),
	lastActivityAt: new Date().toISOString(),
};

const MOCK_COMPLETED_ACTIONS: ActionType[] = ["account_created", "email_verified", "github_starred", "first_snapshot"];

export interface PioneerProgress {
	pioneer: Pioneer;
	progress: {
		currentTier: Tier;
		nextTier: Tier | null;
		pointsToNext: number;
		percentToNext: number;
	};
	completedActions: ActionType[];
	availableActions: typeof ACTIONS;
}

// Simulating API Latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchPioneerProgress(userId?: string): Promise<PioneerProgress | null> {
	await delay(800);

	if (!userId) return null;

	const nextTierInfo = getNextTier(MOCK_PIONEER.totalPoints);

	return {
		pioneer: MOCK_PIONEER,
		progress: {
			currentTier: MOCK_PIONEER.tier,
			nextTier: nextTierInfo.nextTier,
			pointsToNext: nextTierInfo.pointsToNext,
			percentToNext: nextTierInfo.progress,
		},
		completedActions: MOCK_COMPLETED_ACTIONS,
		availableActions: ACTIONS,
	};
}

export interface LeaderboardEntry {
	rank: number;
	username: string;
	avatar?: string;
	tier: Tier;
	points: number;
	isCurrentUser: boolean;
}

export async function fetchLeaderboard(limit = 10): Promise<{ leaderboard: LeaderboardEntry[]; total: number }> {
	await delay(600);

	const entries: LeaderboardEntry[] = [
		{ rank: 1, username: "devninja", tier: "guardian", points: 2450, isCurrentUser: false },
		{ rank: 2, username: "codecrusher", tier: "cultivator", points: 1890, isCurrentUser: false },
		{ rank: 3, username: "shipfast", tier: "grower", points: 820, isCurrentUser: false },
		{ rank: 4, username: "fullstack_sam", tier: "grower", points: 750, isCurrentUser: false },
		{ rank: 5, username: "frontend_fan", tier: "grower", points: 600, isCurrentUser: false },
		{ rank: 847, username: "you", tier: "seedling", points: 175, isCurrentUser: true },
	];

	return {
		leaderboard: entries.slice(0, limit),
		total: 2112,
	};
}

export interface ReferralStats {
	referralCode: string;
	referralUrl: string;
	stats: {
		totalSignups: number;
		activatedSignups: number;
		pointsEarned: number;
	};
	referrals: {
		username: string;
		status: "pending" | "activated";
		signedUpAt: string;
	}[];
}

export async function fetchReferrals(): Promise<ReferralStats> {
	await delay(700);
	return {
		referralCode: "ninja450",
		referralUrl: "https://snapback.dev/join/ninja450",
		stats: {
			totalSignups: 12,
			activatedSignups: 4,
			pointsEarned: 800,
		},
		referrals: [
			{ username: "newbie_coder", status: "activated", signedUpAt: "2024-12-01" },
			{ username: "react_fan", status: "pending", signedUpAt: "2024-12-05" },
			{ username: "fullstack_dev", status: "activated", signedUpAt: "2024-11-20" },
		],
	};
}
