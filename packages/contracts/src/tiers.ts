/**
 * Tier Definitions - Single Source of Truth for Alpha
 *
 * Alpha Scope: Free and Pro tiers are ACTIVE
 * Team and Enterprise are designed stubs (feature flag gated)
 */

export type Tier = "free" | "pro" | "team" | "enterprise";

/**
 * Active tiers for Alpha release
 * Used by docs PlanSwitcher and feature gating
 */
export const ALPHA_ACTIVE_TIERS: ReadonlyArray<Tier> = ["free", "pro"] as const;

/**
 * Feature flag: Team/Enterprise features disabled in Alpha
 * Hardcoded to false - will be environment variable post-Alpha
 */
export const ENABLE_TEAM_FEATURES = false;

/**
 * Tier capabilities definition
 */
export interface TierCapabilities {
	seats: number; // -1 = unlimited
	cloudBackup: boolean;
	backendMCP: boolean;
	maxSnapshots: number; // -1 = unlimited
	storageMB: number;
	retentionDays: number; // -1 = custom/unlimited
}

/**
 * Tier capabilities matrix (all tiers defined for future use)
 */
export const TIER_CAPABILITIES: Record<Tier, TierCapabilities> = {
	free: {
		seats: 1,
		cloudBackup: false,
		backendMCP: false,
		maxSnapshots: -1, // unlimited local
		storageMB: 0, // local only
		retentionDays: 7, // local retention
	},
	pro: {
		seats: 1,
		cloudBackup: true,
		backendMCP: true,
		maxSnapshots: -1, // unlimited
		storageMB: 5 * 1024, // 5GB
		retentionDays: 30,
	},
	team: {
		seats: -1, // unlimited seats
		cloudBackup: true,
		backendMCP: true,
		maxSnapshots: -1, // unlimited
		storageMB: 25 * 1024, // 25GB per user
		retentionDays: 365, // 1 year
	},
	enterprise: {
		seats: -1, // unlimited
		cloudBackup: true,
		backendMCP: true,
		maxSnapshots: -1, // unlimited
		storageMB: 100 * 1024, // 100GB+
		retentionDays: -1, // custom
	},
} as const;

/**
 * Check if tier is active in Alpha
 */
export function isAlphaActiveTier(tier: Tier): boolean {
	return ALPHA_ACTIVE_TIERS.includes(tier);
}

/**
 * Get tier capabilities with validation
 */
export function getTierCapabilities(tier: Tier): TierCapabilities {
	const capabilities = TIER_CAPABILITIES[tier];
	if (!capabilities) {
		throw new Error(`Invalid tier: ${tier}`);
	}

	// Alpha: Warn if accessing inactive tier
	if (!isAlphaActiveTier(tier)) {
		console.warn(`[Alpha] Accessing inactive tier: ${tier}. This is a stub for future use.`);
	}

	return capabilities;
}

/**
 * Check if tier has specific capability
 */
export function hasTierCapability(
	tier: Tier,
	capability: keyof Pick<TierCapabilities, "cloudBackup" | "backendMCP">,
): boolean {
	const caps = getTierCapabilities(tier);
	return caps[capability];
}
