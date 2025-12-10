export type Tier = "seedling" | "grower" | "cultivator" | "guardian";

export interface TierInfo {
	name: string;
	emoji: string;
	range: string;
	minPoints: number;
	color: string; // Tailwinc color name
	benefits: string[];
}

export const TIER_THRESHOLDS = {
	seedling: 0,
	grower: 250,
	cultivator: 750,
	guardian: 1500,
} as const;

export const TIERS: TierInfo[] = [
	{
		name: "Seedling",
		emoji: "🌱",
		range: "0-249",
		minPoints: 0,
		color: "emerald",
		benefits: ["Cluster protection (beta)", "50% lifetime Pro discount", "Name in GitHub credits"],
	},
	{
		name: "Grower",
		emoji: "🌿",
		range: "250-749",
		minPoints: 250,
		color: "green",
		benefits: ["Everything in Seedling", "Discord Pioneer role", "Monthly founder AMA", "Beta feature previews"],
	},
	{
		name: "Cultivator",
		emoji: "🌳",
		range: "750-1499",
		minPoints: 750,
		color: "teal",
		benefits: ["Everything in Grower", "Private Slack channel", "Priority support", "Feature request voting"],
	},
	{
		name: "Guardian",
		emoji: "🌲",
		range: "1500+",
		minPoints: 1500,
		color: "cyan",
		benefits: ["Everything in Cultivator", "Lifetime free Pro", "Advisory board invite", "Custom Pioneer badge"],
	},
];

export function getTierForPoints(points: number): Tier {
	if (points >= TIER_THRESHOLDS.guardian) return "guardian";
	if (points >= TIER_THRESHOLDS.cultivator) return "cultivator";
	if (points >= TIER_THRESHOLDS.grower) return "grower";
	return "seedling";
}

export function getNextTier(currentPoints: number): {
	nextTier: Tier | null;
	pointsToNext: number;
	progress: number;
} {
	const currentTier = getTierForPoints(currentPoints);

	if (currentTier === "guardian") {
		return { nextTier: null, pointsToNext: 0, progress: 100 };
	}

	let nextThreshold = 0;
	let prevThreshold = 0;
	let nextTierName: Tier = "seedling";

	if (currentTier === "seedling") {
		nextThreshold = TIER_THRESHOLDS.grower;
		prevThreshold = TIER_THRESHOLDS.seedling;
		nextTierName = "grower";
	} else if (currentTier === "grower") {
		nextThreshold = TIER_THRESHOLDS.cultivator;
		prevThreshold = TIER_THRESHOLDS.grower;
		nextTierName = "cultivator";
	} else if (currentTier === "cultivator") {
		nextThreshold = TIER_THRESHOLDS.guardian;
		prevThreshold = TIER_THRESHOLDS.cultivator;
		nextTierName = "guardian";
	}

	const range = nextThreshold - prevThreshold;
	const progressInTier = currentPoints - prevThreshold;
	const percent = Math.min(100, Math.max(0, (progressInTier / range) * 100));

	return {
		nextTier: nextTierName,
		pointsToNext: nextThreshold - currentPoints,
		progress: percent,
	};
}
