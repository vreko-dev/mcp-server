/**
 * Shared API Key Tier Management Utilities
 * Consolidates tier-related logic used across MCP server, API, and other services
 * Reduces duplication and ensures consistent tier handling
 */

/**
 * Determine user tier from API key metadata
 * Better-auth stores custom metadata during key creation
 * Metadata format: { tier: "pro" | "free" | "admin", organizationId: "..." }
 *
 * @param metadata - API key metadata from better-auth
 * @returns User tier (free | pro | admin)
 */
export function getTierFromMetadata(
	metadata: Record<string, unknown> | undefined,
): "free" | "pro" | "admin" {
	if (!metadata) return "free";

	const tier = metadata.tier as string | undefined;
	if (tier === "pro" || tier === "admin") {
		return tier;
	}
	return "free";
}

/**
 * Check if a user has a specific permission based on tier
 * Useful for MCP server and API endpoints
 *
 * @param tier - User tier
 * @param requiredPermission - The permission to check (e.g., "snapback:analyze")
 * @returns True if user has the permission
 */
export function hasPermissionForTier(
	tier: "free" | "pro" | "admin",
	requiredPermission: string,
): boolean {
	// Define tier-based permissions
	const tierPermissions: Record<string, Set<string>> = {
		free: new Set(["snapback:analyze"]),
		pro: new Set(["snapback:analyze", "snapback:snapshot", "snapback:context"]),
		admin: new Set([
			"snapback:analyze",
			"snapback:snapshot",
			"snapback:context",
		]),
	};

	const permissions = tierPermissions[tier] || tierPermissions.free;
	return permissions.has(requiredPermission);
}

/**
 * Get rate limit configuration for a tier
 * Consistent across all services
 *
 * @param tier - User tier
 * @returns Rate limit config { window: seconds, max: requests }
 */
export function getRateLimitForTier(tier: "free" | "pro" | "admin"): {
	window: number;
	max: number;
} {
	const limits: Record<string, { window: number; max: number }> = {
		free: { window: 3600, max: 100 }, // 100 req/hour
		pro: { window: 3600, max: 1000 }, // 1000 req/hour
		admin: { window: 3600, max: 10000 }, // 10k req/hour
	};

	return limits[tier] || limits.free;
}

/**
 * Get feature availability for a tier
 * Controls which features users can access
 *
 * @param tier - User tier
 * @returns Feature flags for the tier
 */
export function getFeaturesForTier(
	tier: "free" | "pro" | "admin",
): Record<string, boolean> {
	const features: Record<string, Record<string, boolean>> = {
		free: {
			basicAnalysis: true,
			cloudBackup: false,
			advancedDetection: false,
			teamSharing: false,
			prioritySupport: false,
		},
		pro: {
			basicAnalysis: true,
			cloudBackup: true,
			advancedDetection: true,
			teamSharing: true,
			prioritySupport: true,
		},
		admin: {
			basicAnalysis: true,
			cloudBackup: true,
			advancedDetection: true,
			teamSharing: true,
			prioritySupport: true,
		},
	};

	return features[tier] || features.free;
}
