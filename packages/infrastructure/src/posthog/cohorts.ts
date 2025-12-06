/**
 * PostHog Cohort Management
 *
 * Module for creating and managing retention cohorts in PostHog for D7/D30 analysis
 * and correlation analysis.
 */

import { PostHog } from "posthog-node";
import { logger } from "../logging/logger";

// Define the cohort configuration types
export interface CohortConfig {
	name: string;
	description: string;
	filters: {
		properties: Array<{
			key: string;
			value: string | number | boolean | string[];
			operator: string;
			type: string;
		}>;
	};
	is_static?: boolean;
	is_calculating?: boolean;
}

export interface Cohort {
	id: number;
	name: string;
	description: string;
	created_at: string;
	created_by: {
		id: number;
		uuid: string;
		distinct_ids: string[];
		first_name: string;
		email: string;
	};
	deleted: boolean;
	filters: any;
	is_calculating: boolean;
	last_calculation: string;
	errors_calculating: number;
	count?: number;
	groups: any[];
}

// Initialize PostHog client
let posthogClient: PostHog | null = null;
let posthogApiKey: string | null = null;
let posthogHost: string | null = null;

function getPostHog(): PostHog {
	if (!posthogClient) {
		const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
		if (!posthogKey) {
			throw new Error("PostHog personal API key not configured");
		}

		const host = process.env.POSTHOG_HOST || "https://app.posthog.com";
		posthogClient = new PostHog(posthogKey, {
			host,
		});

		// Store for API calls
		posthogApiKey = posthogKey;
		posthogHost = host;
	}
	return posthogClient;
}

function getPostHogConfig(): { apiKey: string; host: string } {
	if (!posthogApiKey || !posthogHost) {
		// Initialize if not already done
		getPostHog();
	}

	// After initialization, these are guaranteed to be set
	if (!posthogApiKey || !posthogHost) {
		throw new Error("PostHog configuration not initialized");
	}

	return {
		apiKey: posthogApiKey,
		host: posthogHost,
	};
}

/**
 * Create a new cohort in PostHog
 * @param config Cohort configuration
 * @returns Promise resolving to the created cohort
 */
export async function createCohort(config: CohortConfig): Promise<Cohort> {
	try {
		// Initialize PostHog (if not already done)
		getPostHog();

		// Get config for API calls
		const phConfig = getPostHogConfig();

		// Note: PostHog Node SDK doesn't have direct cohort creation API
		// We'll need to use the HTTP API directly
		const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${phConfig.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: config.name,
				description: config.description,
				filters: config.filters,
				is_static: config.is_static,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to create cohort: ${response.statusText}`);
		}

		const cohort = await response.json();
		logger.info("Created PostHog cohort", { cohort });

		return cohort;
	} catch (error) {
		logger.error("Failed to create PostHog cohort", { error, config });
		throw new Error(`Failed to create PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Get all cohorts from PostHog
 * @returns Promise resolving to array of cohorts
 */
export async function getCohorts(): Promise<Cohort[]> {
	try {
		// Initialize PostHog (if not already done)
		getPostHog();

		// Get config for API calls
		const phConfig = getPostHogConfig();

		const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${phConfig.apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch cohorts: ${response.statusText}`);
		}

		const data = await response.json();
		return data.results || [];
	} catch (error) {
		logger.error("Failed to fetch PostHog cohorts", { error });
		throw new Error(`Failed to fetch PostHog cohorts: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Get a specific cohort by ID
 * @param cohortId Cohort ID
 * @returns Promise resolving to the cohort
 */
export async function getCohort(cohortId: number): Promise<Cohort> {
	try {
		// Initialize PostHog (if not already done)
		getPostHog();

		// Get config for API calls
		const phConfig = getPostHogConfig();

		const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${phConfig.apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch cohort: ${response.statusText}`);
		}

		const cohort = await response.json();
		return cohort;
	} catch (error) {
		logger.error("Failed to fetch PostHog cohort", { error, cohortId });
		throw new Error(`Failed to fetch PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Update an existing cohort
 * @param cohortId Cohort ID
 * @param config Updated cohort configuration
 * @returns Promise resolving to the updated cohort
 */
export async function updateCohort(cohortId: number, config: Partial<CohortConfig>): Promise<Cohort> {
	try {
		// Initialize PostHog (if not already done)
		getPostHog();

		// Get config for API calls
		const phConfig = getPostHogConfig();

		const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${phConfig.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(config),
		});

		if (!response.ok) {
			throw new Error(`Failed to update cohort: ${response.statusText}`);
		}

		const cohort = await response.json();
		logger.info("Updated PostHog cohort", { cohort });

		return cohort;
	} catch (error) {
		logger.error("Failed to update PostHog cohort", { error, cohortId, config });
		throw new Error(`Failed to update PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Delete a cohort
 * @param cohortId Cohort ID
 * @returns Promise resolving to void
 */
export async function deleteCohort(cohortId: number): Promise<void> {
	try {
		// Initialize PostHog (if not already done)
		getPostHog();

		// Get config for API calls
		const phConfig = getPostHogConfig();

		const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${phConfig.apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to delete cohort: ${response.statusText}`);
		}

		logger.info("Deleted PostHog cohort", { cohortId });
	} catch (error) {
		logger.error("Failed to delete PostHog cohort", { error, cohortId });
		throw new Error(`Failed to delete PostHog cohort: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Get cohort members (people in the cohort)
 * @param cohortId Cohort ID
 * @returns Promise resolving to array of people
 */
export async function getCohortMembers(cohortId: number): Promise<any[]> {
	try {
		// Initialize PostHog (if not already done)
		getPostHog();

		// Get config for API calls
		const phConfig = getPostHogConfig();

		const response = await fetch(`${phConfig.host}/api/projects/@current/cohorts/${cohortId}/persons/`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${phConfig.apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch cohort members: ${response.statusText}`);
		}

		const data = await response.json();
		return data.results || [];
	} catch (error) {
		logger.error("Failed to fetch PostHog cohort members", { error, cohortId });
		throw new Error(
			`Failed to fetch PostHog cohort members: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Predefined cohort configurations for retention analysis
export const RETENTION_COHORTS: CohortConfig[] = [
	{
		name: "D7 Retention",
		description: "Users who return within 7 days of their first activity",
		filters: {
			properties: [
				{
					key: "first_seen",
					value: "7 days",
					operator: "within",
					type: "event",
				},
			],
		},
	},
	{
		name: "D30 Retention",
		description: "Users who return within 30 days of their first activity",
		filters: {
			properties: [
				{
					key: "first_seen",
					value: "30 days",
					operator: "within",
					type: "event",
				},
			],
		},
	},
	{
		name: "Onboarding Completion Cohort",
		description: "Users who completed the onboarding process",
		filters: {
			properties: [
				{
					key: "onboarding_completed",
					value: true,
					operator: "exact",
					type: "event",
				},
			],
		},
	},
	{
		name: "High Engagement Users",
		description: "Users with high engagement (5+ sessions in 7 days)",
		filters: {
			properties: [
				{
					key: "session_count",
					value: 5,
					operator: "gt",
					type: "event",
				},
				{
					key: "activity_period",
					value: "7 days",
					operator: "within",
					type: "event",
				},
			],
		},
	},
];

// Predefined cohort configurations for correlation analysis
export const CORRELATION_COHORTS: CohortConfig[] = [
	{
		name: "Feature Power Users",
		description: "Users who use advanced features regularly",
		filters: {
			properties: [
				{
					key: "advanced_feature_usage",
					value: true,
					operator: "exact",
					type: "event",
				},
			],
		},
	},
	{
		name: "At-Risk Churn",
		description: "Users showing signs of disengagement",
		filters: {
			properties: [
				{
					key: "days_since_last_activity",
					value: 14,
					operator: "gt",
					type: "event",
				},
			],
		},
	},
	{
		name: "Free to Paid Converters",
		description: "Users who upgraded from free to paid plan",
		filters: {
			properties: [
				{
					key: "plan_upgrade",
					value: "free_to_paid",
					operator: "exact",
					type: "event",
				},
			],
		},
	},
];
