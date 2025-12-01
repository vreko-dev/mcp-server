import { createLogger, LogLevel } from "@snapback/contracts";
import { PostHog } from "posthog-node";

const logger = createLogger({ name: "feature-flags", level: LogLevel.INFO });

// Initialize PostHog for feature flags
const posthog = new PostHog(process.env.POSTHOG_API_KEY || "default_key", {
	host: process.env.POSTHOG_HOST || "https://app.posthog.com",
});

// Check if a feature flag is enabled for a user
export async function isFeatureEnabled(
	flag: string,
	userId: string,
	properties: Record<string, any> = {},
): Promise<boolean> {
	try {
		const result = await posthog.isFeatureEnabled(flag, userId, properties);
		return result ?? false;
	} catch (error) {
		// If there's an error checking feature flags, we'll be conservative and disable the feature
		logger.error("Error checking feature flag:", { error });
		return false;
	}
}

// Get the value of a feature flag for a user
export async function getFeatureFlag(
	flag: string,
	userId: string,
	properties: Record<string, any> = {},
): Promise<string | boolean | number | undefined> {
	try {
		const result = await posthog.getFeatureFlag(flag, userId, properties);
		return result ?? undefined;
	} catch (error) {
		// If there's an error getting feature flag value, return undefined
		logger.error("Error getting feature flag value:", { error });
		return undefined;
	}
}

// Track feature flag usage
export async function trackFeatureFlag(
	flag: string,
	userId: string,
	properties: Record<string, any> = {},
): Promise<void> {
	try {
		posthog.capture({
			distinctId: userId,
			event: "feature_flag_evaluated",
			properties: {
				feature_flag: flag,
				...properties,
			},
		});
	} catch (error) {
		// If there's an error tracking, we'll log it but not fail
		logger.error("Error tracking feature flag:", { error });
	}
}

// Gracefully shutdown PostHog
export async function shutdownFeatureFlags(): Promise<void> {
	try {
		await posthog.shutdownAsync();
	} catch (error) {
		logger.error("Error shutting down PostHog:", { error });
	}
}
