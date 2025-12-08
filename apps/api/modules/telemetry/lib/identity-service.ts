import { logger } from "@snapback/infrastructure";
import { getPostHog } from "./posthog";

export async function linkUserIdentity(distinctId: string, anonymousId?: string, properties?: Record<string, unknown>) {
	try {
		const posthog = getPostHog();

		// 1. Identify the user
		posthog.identify({
			distinctId,
			properties,
		});

		// 2. Alias if anonymousId is provided (Link Anon -> Auth)
		if (anonymousId && anonymousId !== distinctId) {
			logger.info("Aliasing anonymous ID to authenticated ID", {
				distinctId,
				anonymousId,
			});
			posthog.alias({
				distinctId, // authenticated ID (master)
				alias: anonymousId, // anonymous ID (to merge)
			});
		}

		// Flush to ensure events are sent
		await posthog.shutdown();

		return { success: true };
	} catch (error) {
		logger.error("Failed to link user identity in PostHog", {
			error,
			distinctId,
			anonymousId,
		});
		throw new Error("Failed to link user identity");
	}
}
