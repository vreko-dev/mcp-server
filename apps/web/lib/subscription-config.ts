export const PLAN_PERMISSIONS = {
	free: {
		cloudBackup: false,
		maxSnapshots: 50,
		cloudStorageQuotaMb: 0,
		teamMembers: 1,
		advancedAnalytics: false,
		apiAccess: false,
	},
	pro: {
		cloudBackup: true,
		maxSnapshots: -1, // unlimited
		cloudStorageQuotaMb: 5120, // 5GB
		teamMembers: 1,
		advancedAnalytics: true,
		apiAccess: true,
	},
	team: {
		cloudBackup: true,
		maxSnapshots: 2000,
		cloudStorageQuotaMb: 25600, // 25GB
		teamMembers: 10,
		advancedAnalytics: true,
		apiAccess: true,
		teamSharing: true,
	},
	enterprise: {
		cloudBackup: true,
		maxSnapshots: -1, // unlimited
		cloudStorageQuotaMb: 102400, // 100GB
		teamMembers: -1, // unlimited
		advancedAnalytics: true,
		apiAccess: true,
		teamSharing: true,
		prioritySupport: true,
		customRules: true,
	},
} as const;

export type PlanTier = keyof typeof PLAN_PERMISSIONS;
