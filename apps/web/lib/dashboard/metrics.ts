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

/**
 * Fetch dashboard metrics from real API endpoint
 * Falls back to default metrics if API call fails
 */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
	try {
		const response = await fetch("/api/dashboard/metrics", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			console.warn("Failed to fetch dashboard metrics", response.status);
			return DEFAULT_METRICS;
		}

		const metrics = (await response.json()) as DashboardMetrics;
		return metrics;
	} catch (error) {
		console.error("Error fetching dashboard metrics:", error);
		return DEFAULT_METRICS;
	}
}

/**
 * Fetch AI detection stats from real API endpoint
 * Falls back to empty array if API call fails
 */
export async function fetchAIDetectionStats(): Promise<AIDetectionStat[]> {
	try {
		const response = await fetch("/api/dashboard/ai-stats", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			console.warn("Failed to fetch AI detection stats", response.status);
			return [];
		}

		const stats = (await response.json()) as AIDetectionStat[];
		return stats;
	} catch (error) {
		console.error("Error fetching AI detection stats:", error);
		return [];
	}
}

/**
 * Fetch activity feed from real API endpoint
 * Falls back to empty array if API call fails
 */
export async function fetchActivityFeed(): Promise<Activity[]> {
	try {
		const response = await fetch("/api/dashboard/activity", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			console.warn("Failed to fetch activity feed", response.status);
			return [];
		}

		const activity = (await response.json()) as Activity[];
		return activity;
	} catch (error) {
		console.error("Error fetching activity feed:", error);
		return [];
	}
}

export async function fetchSessionMetrics(): Promise<SessionMetrics> {
	return {
		activeSessionCount: 1,
		lastActivityTime: new Date().toISOString(),
	};
}

export async function getSubscription(
	_userId?: string,
): Promise<SubscriptionInfo> {
	return {
		planName: "Free",
		status: "active",
	};
}

export async function getUsageLimits(
	_userId?: string,
	_plan?: string,
): Promise<UsageLimits> {
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
