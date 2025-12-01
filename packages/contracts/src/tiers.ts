/**
 * Tier Definitions - Single Source of Truth for Alpha
 *
 * Alpha Scope: Free and Solo tiers are ACTIVE
 * Team and Enterprise are designed stubs (feature flag gated)
 */

export type Tier = "free" | "solo" | "team" | "enterprise";

/**
 * Active tiers for Alpha release
 * Used by docs PlanSwitcher and feature gating
 */
export const ALPHA_ACTIVE_TIERS: ReadonlyArray<Tier> = ["free", "solo"] as const;

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
		maxSnapshots: 50,
		storageMB: 0,
		retentionDays: 30,
	},
	solo: {
		seats: 1,
		cloudBackup: true,
		backendMCP: true,
		maxSnapshots: 500,
		storageMB: 5 * 1024, // 5GB
		retentionDays: 90,
	},
	team: {
		seats: 10,
		cloudBackup: true,
		backendMCP: true,
		maxSnapshots: 2000,
		storageMB: 25 * 1024, // 25GB
		retentionDays: 365,
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
