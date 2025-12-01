// Materialized views for analytics
// Note: These are SQL views, not Drizzle ORM tables, so they're defined as types only

// Daily active users
export type DailyActiveUserView = {
	date: Date;
	dau: number;
	totalRequests: number;
	avgResponseTime: number;
	cachedRequests: number;
	serverErrors: number;
	clientErrors: number;
};

// Popular features
export type PopularFeatureView = {
	featureName: string;
	featureCategory: string;
	usageCount: number;
	uniqueUsers: number;
	avgDuration: number;
	successRate: number;
	shortcutUses: number;
	contextMenuUses: number;
};

// User cohorts
export type UserCohortView = {
	cohortMonth: Date;
	totalUsers: number;
	paidUsers: number;
	conversionRate: number;
	avgRevenueCents: number;
};

// Extension version adoption
export type ExtensionVersionView = {
	extensionVersion: string;
	uniqueUsers: number;
	sessionCount: number;
	avgSessionDuration: number;
	lastSeen: Date;
};
