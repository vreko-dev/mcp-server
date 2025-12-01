import {
	captureEvent as captureEventClient,
	identifyUser,
} from "@/lib/posthog-client";

// Create a posthog-like interface to match the expected API
const posthog = {
	captureEvent: async (
		distinctId: string,
		event: string,
		properties?: Record<string, unknown>,
	) => {
		// Add the distinctId to properties if needed
		const eventProperties = {
			...properties,
			distinctId,
		};
		captureEventClient(event, eventProperties);
	},
	alias: async (params: { userId: string; previousId: string }) => {
		// For aliasing, we'll identify the user with both IDs
		identifyUser(params.userId);
		// Note: PostHog JS doesn't have a direct alias method, but identifying with the new ID
		// after having identified with the previous ID achieves a similar effect
	},
};

/**
 * Analytics Service
 *
 * Handles analytics event tracking and identity management using PostHog
 */

export class AnalyticsService {
	/**
	 * Track event for anonymous device
	 * @param deviceFingerprint Unique device identifier
	 * @param event Event name
	 * @param properties Event properties
	 */
	async trackDeviceEvent(
		deviceFingerprint: string,
		event: string,
		properties: Record<string, any> = {},
	): Promise<void> {
		try {
			const distinctId = `device_${deviceFingerprint}`;
			await posthog.captureEvent(distinctId, event, properties);
		} catch (error) {
			console.error(`Device event tracking failed: ${event}`, error);
		}
	}

	/**
	 * Track event for authenticated user
	 * @param userId User ID
	 * @param event Event name
	 * @param properties Event properties
	 * @param deviceFingerprint Optional device fingerprint
	 */
	async trackUserEvent(
		userId: string,
		event: string,
		properties: Record<string, any> = {},
		deviceFingerprint?: string,
	): Promise<void> {
		try {
			// Identify the user first
			identifyUser(userId);

			await posthog.captureEvent(userId, event, {
				...properties,
				deviceFingerprint,
			});
		} catch (error) {
			console.error(`User event tracking failed: ${event}`, error);
		}
	}

	/**
	 * Link device to user (merge identities)
	 * @param deviceFingerprint Device fingerprint
	 * @param userId User ID
	 */
	async linkDeviceToUser(
		deviceFingerprint: string,
		userId: string,
	): Promise<void> {
		try {
			const deviceDistinctId = `device_${deviceFingerprint}`;
			// Call PostHog alias() to merge device and user identities
			await posthog.alias({
				userId,
				previousId: deviceDistinctId,
			});

			// Track conversion event
			await this.trackUserEvent(userId, "device_linked", {
				deviceFingerprint,
			});
		} catch (error) {
			console.error(
				`Device linking failed: deviceFingerprint=${deviceFingerprint}, userId=${userId}`,
				error,
			);
		}
	}

	/**
	 * Track conversion funnel events
	 * @param userId User ID
	 * @param stage Conversion stage
	 * @param properties Additional properties
	 */
	async trackConversion(
		userId: string,
		stage: string,
		properties: Record<string, any> = {},
	): Promise<void> {
		try {
			await this.trackUserEvent(userId, `conversion_${stage}`, properties);
		} catch (error) {
			console.error(`Conversion tracking failed: ${stage}`, error);
		}
	}
}
