import { logger } from "@snapback/infrastructure";
import { PostHog } from "posthog-node";

/**
 * Server-side PostHog client for capturing events
 * Uses posthog-node for server-side analytics
 */

let posthogClient: PostHog | null = null;

export function initializePostHog(): void {
	const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

	if (!apiKey) {
		logger.warn("PostHog not configured - analytics disabled");
		return;
	}

	posthogClient = new PostHog(apiKey, {
		host,
		flushAt: 20, // Flush after 20 events
		flushInterval: 10000, // Flush every 10 seconds
	});

	logger.info("PostHog server client initialized");
}

export function getPostHogClient(): PostHog | null {
	return posthogClient;
}

/**
 * Get PostHog client, initializing if needed (lazy singleton)
 */
export function getPostHog(): PostHog {
	if (!posthogClient) {
		initializePostHog();
	}
	if (!posthogClient) {
		throw new Error("PostHog not configured - API key required");
	}
	return posthogClient;
}

/**
 * Capture event with PostHog
 */
export async function captureEvent(
	distinctId: string,
	event: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	if (!posthogClient) {
		logger.debug("PostHog not initialized, skipping event", { event });
		return;
	}

	try {
		posthogClient.capture({
			distinctId,
			event,
			properties: {
				...properties,
				$lib: "posthog-node",
				$lib_version: "3.6.0",
			},
		});
	} catch (error) {
		logger.error("Failed to capture PostHog event", { error, event });
	}
}

/**
 * Identify user with traits
 */
export async function identifyUser(distinctId: string, properties?: Record<string, unknown>): Promise<void> {
	if (!posthogClient) {
		return;
	}

	try {
		posthogClient.identify({
			distinctId,
			properties,
		});
	} catch (error) {
		logger.error("Failed to identify user in PostHog", { error, distinctId });
	}
}

/**
 * Associate user with organization (group)
 */
export async function groupUser(
	distinctId: string,
	groupType: string,
	groupKey: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	if (!posthogClient) {
		return;
	}

	try {
		posthogClient.groupIdentify({
			groupType,
			groupKey,
			properties,
		});

		// Also set the group for the user
		posthogClient.capture({
			distinctId,
			event: "$group_identify",
			properties: {
				$group_type: groupType,
				$group_key: groupKey,
			},
		});
	} catch (error) {
		logger.error("Failed to group user in PostHog", {
			error,
			distinctId,
			groupType,
			groupKey,
		});
	}
}

/**
 * Shutdown PostHog client (flush pending events)
 */
export async function shutdownPostHog(): Promise<void> {
	if (posthogClient) {
		await posthogClient.shutdown();
		logger.info("PostHog client shut down");
	}
}

/**
 * Capture waitlist event
 */
export async function captureWaitlistEvent(
	email: string,
	event: "waitlist_joined" | "waitlist_invited" | "waitlist_accepted",
	properties?: Record<string, unknown>,
): Promise<void> {
	await captureEvent(email, event, {
		...properties,
		source: "api",
		timestamp: new Date().toISOString(),
	});
}
