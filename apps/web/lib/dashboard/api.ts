import { orpcClient } from "@shared/lib/orpc-client";
import type { Activity, AIDetectionStat, DashboardMetrics, SessionMetrics } from "./metrics";

// Fetch user dashboard metrics from API
export async function fetchUserMetrics(): Promise<DashboardMetrics> {
	try {
		// Use the new getMetrics procedure which returns real data
		const result = await orpcClient.dashboard.getMetrics();
		return result;
	} catch (error) {
		console.error("Failed to fetch user metrics", { error });
		// Throw error for Resource pattern to handle
		throw error;
	}
}

// Fetch AI detection stats from API
export async function fetchAIDetectionStats(): Promise<AIDetectionStat[]> {
	try {
		const result = await orpcClient.dashboard.getAIDetectionStats();
		return result;
	} catch (error) {
		console.error("Failed to fetch AI detection stats", { error });
		// Throw error for Resource pattern to handle
		throw error;
	}
}

// Fetch recent activity from API
export async function fetchRecentActivity(): Promise<Activity[]> {
	try {
		const result = await orpcClient.dashboard.getRecentActivity();
		return result;
	} catch (error) {
		console.error("Failed to fetch recent activity", { error });
		// Throw error for Resource pattern to handle
		throw error;
	}
}

// Fetch subscription data from API
export async function fetchSubscriptionData() {
	try {
		const result = await orpcClient.dashboard.getSubscriptionData();
		return result;
	} catch (error) {
		console.error("Failed to fetch subscription data", { error });
		// Throw error for Resource pattern to handle
		throw error;
	}
}

// Fetch session metrics from API
export async function fetchSessionMetrics(): Promise<SessionMetrics> {
	try {
		const result = await orpcClient.dashboard.getSessionMetrics();
		return result;
	} catch (error) {
		console.error("Failed to fetch session metrics", { error });
		// Throw error for Resource pattern to handle
		throw error;
	}
}
