// Dashboard metrics and types

export interface DashboardMetrics {
	snapshotCount: number;
	recoveryCount: number;
	filesProtected: number;
	aiDetectionRate: number;
}

export interface SessionMetrics {
	activeSessionCount?: number;
	lastActivityTime?: string;
}

export interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

export interface Activity {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface SubscriptionInfo {
	planName: string;
	status: "active" | "expired" | "cancelled";
	renewDate?: string;
}

export interface UsageLimits {
	snapshots: {
	current: number;
	limit: number;
	};
	storage: {
	current: number;
	limit: number;
	};
}

// Default empty metrics for initial state
export const DEFAULT_METRICS: DashboardMetrics = {
	snapshotCount: 0,
	recoveryCount: 0,
	filesProtected: 0,
	aiDetectionRate: 0,
};

// TODO: Replace with actual API calls to fetch metrics
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
	return DEFAULT_METRICS;
}

export async function fetchAIDetectionStats(): Promise<AIDetectionStat[]> {
	return [];
}

export async function fetchActivityFeed(): Promise<Activity[]> {
	return [];
}

export async function fetchSessionMetrics(): Promise<SessionMetrics> {
	return {
		activeSessionCount: 1,
		lastActivityTime: new Date().toISOString(),
	};
}

export async function getSubscription(_userId?: string): Promise<SubscriptionInfo> {
	return {
		planName: "Free",
		status: "active",
	};
}

export async function getUsageLimits(_userId?: string, _plan?: string): Promise<UsageLimits> {
	return {
		snapshots: {
			current: 0,
			limit: 100,
		},
		storage: {
			current: 0,
			limit: 5368709120, // 5GB in bytes
		},
	};
}
