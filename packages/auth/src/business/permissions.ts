/**
 * User Permissions Logic
 *
 * Centralized business logic for generating user permissions based on role and plan.
 */

import type { SubscriptionPlan } from "./plan";

export type UserRole = "admin" | "user" | "viewer" | null;

/**
 * Plan-based feature permissions
 */
const PLAN_PERMISSIONS: Record<SubscriptionPlan, string[]> = {
	free: ["snapshot:create:5/day"],
	solo: ["snapshot:*", "api:webhooks"],
	team: ["snapshot:*", "api:webhooks", "api:advanced-analytics", "team:collaboration"],
	enterprise: [
		"snapshot:*",
		"api:*",
		"team:*",
		"sso:enabled",
		"audit:enabled",
		"compliance:enabled",
		"support:priority",
	],
};

/**
 * Generate permissions array based on user role and subscription plan
 * @param userId - User ID (for future audit/cache purposes)
 * @param role - User's role (admin, user, viewer)
 * @param plan - User's subscription plan
 */
export async function getUserPermissions(_userId: string, role: UserRole, plan: SubscriptionPlan): Promise<string[]> {
	const permissions: string[] = [];

	// Role-based permissions
	if (role === "admin") {
		permissions.push("admin:read", "admin:write", "admin:delete", "org:manage", "user:manage");
	}
	if (role === "user" || role === "admin") {
		permissions.push("snapshot:create", "snapshot:read", "snapshot:update", "snapshot:delete");
	}
	if (role === "viewer" || role === "user" || role === "admin") {
		permissions.push("snapshot:view", "report:view");
	}

	// Plan-based permissions
	permissions.push(...(PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free));

	return permissions;
}

/**
 * Check if permissions include a specific permission (supports wildcards)
 */
export function hasPermission(permissions: string[], requiredPerm: string): boolean {
	// Admin wildcard
	if (permissions.includes("*")) {
		return true;
	}
	// Exact match
	if (permissions.includes(requiredPerm)) {
		return true;
	}
	// Wildcard pattern match (e.g., "snapshot:*" matches "snapshot:create")
	const [resource] = requiredPerm.split(":");
	return permissions.includes(`${resource}:*`);
}
