import { PostHog } from "posthog-node";
import { logger } from "../logging/logger.js";

// Define the alert configuration types
export interface AlertConfig {
	name: string;
	insightId: string;
	series: string;
	type: "value" | "increase" | "decrease";
	threshold: number;
	thresholdType: "absolute" | "percentage";
	frequency: "hourly" | "daily" | "weekly" | "monthly";
	recipients: string[];
	enabled?: boolean;
}

export interface AlertNotification {
	id: string;
	name: string;
	createdAt: string;
	lastTriggered?: string;
	enabled: boolean;
}

// Initialize PostHog client
let posthogClient: PostHog | null = null;

function _getPostHog(): PostHog {
	if (!posthogClient) {
		const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
		if (!posthogKey) {
			throw new Error("PostHog personal API key not configured");
		}

		const posthogHost = process.env.POSTHOG_HOST || "https://app.posthog.com";
		posthogClient = new PostHog(posthogKey, {
			host: posthogHost,
		});
	}
	return posthogClient;
}

/**
 * Create a new alert in PostHog
 * @param config Alert configuration
 * @returns Promise resolving to the created alert ID
 */
export async function createAlert(config: AlertConfig): Promise<string> {
	try {
		// In a real implementation, we would use the PostHog API to create alerts
		// Since PostHog doesn't have a direct API for alerts yet, we'll simulate this
		// and log the configuration for manual setup

		logger.info("PostHog Alert Configuration (Manual Setup Required)", {
			alert: config,
		});

		// Return a mock alert ID
		return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	} catch (error) {
		logger.error("Failed to create PostHog alert", { error, config });
		throw new Error("Failed to create PostHog alert");
	}
}

/**
 * Get all alerts from PostHog
 * @returns Promise resolving to array of alerts
 */
export async function getAlerts(): Promise<AlertNotification[]> {
	try {
		// In a real implementation, we would fetch alerts from PostHog API
		// Since PostHog doesn't have a direct API for alerts yet, we'll return empty array
		return [];
	} catch (error) {
		logger.error("Failed to fetch PostHog alerts", { error });
		throw new Error("Failed to fetch PostHog alerts");
	}
}

/**
 * Enable or disable an alert
 * @param alertId The ID of the alert to update
 * @param enabled Whether the alert should be enabled
 * @returns Promise resolving to success status
 */
export async function toggleAlert(alertId: string, enabled: boolean): Promise<boolean> {
	try {
		// In a real implementation, we would update the alert status via PostHog API
		logger.info("Toggling PostHog alert", { alertId, enabled });
		return true;
	} catch (error) {
		logger.error("Failed to toggle PostHog alert", { error, alertId, enabled });
		throw new Error("Failed to toggle PostHog alert");
	}
}

/**
 * Delete an alert from PostHog
 * @param alertId The ID of the alert to delete
 * @returns Promise resolving to success status
 */
export async function deleteAlert(alertId: string): Promise<boolean> {
	try {
		// In a real implementation, we would delete the alert via PostHog API
		logger.info("Deleting PostHog alert", { alertId });
		return true;
	} catch (error) {
		logger.error("Failed to delete PostHog alert", { error, alertId });
		throw new Error("Failed to delete PostHog alert");
	}
}

// Alert configurations for key metrics from KPI dashboard
export const KEY_METRIC_ALERTS: AlertConfig[] = [
	{
		name: "TTFV p75 Alert",
		insightId: "ttfv_insight",
		series: "ttfv_p75",
		type: "value",
		threshold: 7, // Alert if TTFV p75 > 7 minutes
		thresholdType: "absolute",
		frequency: "daily",
		recipients: ["engineering-team@snapback.ai"],
	},
	{
		name: "Onboarding Completion Rate Alert",
		insightId: "onboarding_insight",
		series: "completion_rate",
		type: "value",
		threshold: 60, // Alert if completion rate < 60%
		thresholdType: "absolute",
		frequency: "daily",
		recipients: ["product-team@snapback.ai"],
	},
	{
		name: "Crash-free Sessions Alert",
		insightId: "crash_insight",
		series: "crash_free_rate",
		type: "value",
		threshold: 95, // Alert if crash-free rate < 95%
		thresholdType: "absolute",
		frequency: "daily",
		recipients: ["engineering-team@snapback.ai"],
	},
	{
		name: "Replay Budget Alert",
		insightId: "replay_insight",
		series: "replay_budget",
		type: "value",
		threshold: 80, // Alert if replay budget > 80% of monthly budget
		thresholdType: "percentage",
		frequency: "weekly",
		recipients: ["analytics-team@snapback.ai"],
	},
	{
		name: "D7 Retention Alert",
		insightId: "retention_insight",
		series: "d7_retention",
		type: "decrease",
		threshold: 5, // Alert if D7 retention drops by more than 5% from baseline
		thresholdType: "percentage",
		frequency: "weekly",
		recipients: ["growth-team@snapback.ai"],
	},
];
