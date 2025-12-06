import type { PlanId } from "./shared-auth";

export interface PlanPermissions {
	maxSnapshots: number;
	cloudBackup: boolean;
	advancedDetection: boolean;
	customRules: boolean;
	teamSharing: boolean;
}

const PLAN_CONFIG: Record<PlanId, PlanPermissions> = {
	free: {
		maxSnapshots: 100,
		cloudBackup: false,
		advancedDetection: false,
		customRules: false,
		teamSharing: false,
	},
	solo: {
		maxSnapshots: 1000,
		cloudBackup: true,
		advancedDetection: true,
		customRules: false,
		teamSharing: false,
	},
	team: {
		maxSnapshots: 5000,
		cloudBackup: true,
		advancedDetection: true,
		customRules: true,
		teamSharing: true,
	},
	enterprise: {
		maxSnapshots: 999999,
		cloudBackup: true,
		advancedDetection: true,
		customRules: true,
		teamSharing: true,
	},
};

export function getPlanPermissions(plan: PlanId): PlanPermissions {
	return PLAN_CONFIG[plan];
}

/**
 * Single source of truth for where the plan comes from.
 * Reads Better Auth user shape.
 */
export function mapUserToPlan(user: any): PlanId {
	if (user?.subscription?.plan) return user.subscription.plan as PlanId;
	if (user?.metadata?.plan) return user.metadata.plan as PlanId;
	return "free";
}
