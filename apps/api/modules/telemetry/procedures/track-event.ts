import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { getPostHog } from "@/lib/posthog-server";
import { trackUsage } from "@/lib/usage";
import { protectedProcedure } from "@/orpc/procedures";
import {
	getApiKeyPermissions,
	getSubscriptionTier,
	getUserSubscription,
	requireUserApiKey,
} from "@/src/services/user-context-service";

// Input validation
const trackEventSchema = z.object({
	event: z.string().min(1),
	properties: z.record(z.string(), z.unknown()).optional(),
	clientVersion: z.string().optional(),
	ideVersion: z.string().optional(),
	platform: z.enum(["darwin", "linux", "win32"]).optional(),
});

export const trackEvent = protectedProcedure.input(trackEventSchema).handler(async ({ input, context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Get user's API key and subscription (via service layer)
	const apiKey = await requireUserApiKey(user.id);
	const subscription = await getUserSubscription(user.id);

	// 2. Sanitize PII from properties
	const sanitizedProperties = sanitizeProperties(input.properties || {});

	// 3. Enrich event with subscription metadata
	const enrichedProperties = {
		...sanitizedProperties,
		// Subscription context
		plan: getSubscriptionTier(subscription),
		status: subscription?.status || "active",
		// Client context
		clientVersion: input.clientVersion,
		ideVersion: input.ideVersion,
		platform: input.platform,
		// Timestamp
		timestamp: new Date().toISOString(),
	};

	// 4. Apply cost control filtering
	const shouldSendToPostHog = shouldForwardToPostHog(input.event);

	const eventId = crypto.randomUUID();

	// 5. Send to PostHog (if not filtered out)
	if (shouldSendToPostHog) {
		try {
			const posthog = getPostHog();
			posthog.capture({
				distinctId: user.id,
				event: input.event,
				properties: enrichedProperties,
			});

			// Don't await shutdown - let it happen in background
			// await posthog.shutdownAsync();
		} catch (error) {
			// Log error but don't fail the request
			logger.error("PostHog error", { error });
			// Store event locally for retry (would implement retry queue in production)
		}
	}

	// 6. Track usage for billing (always, even if PostHog fails)
	trackUsage({
		requestId: crypto.randomUUID(),
		apiKeyId: apiKey.id,
		userId: user.id,
		endpoint: "/api/telemetry/event",
		method: "POST",
		tokensUsed: 0,
		responseTime: 0,
		responseStatus: 200,
		cached: false,
		clientVersion: input.clientVersion,
		metadata: {
			event: input.event,
			properties: sanitizedProperties,
		},
	}).catch(console.error);

	// 7. Get feature flags for user
	const featureFlags = getFeatureFlags(getSubscriptionTier(subscription), user.id, getApiKeyPermissions(apiKey));

	// 8. Return acknowledgment with feature flags
	return {
		success: true,
		eventId,
		featureFlags,
		timestamp: new Date().toISOString(),
	};
});

/**
 * Sanitize PII and secrets from event properties
 */
function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
	const sanitized = { ...properties };

	// Remove common PII fields
	const piiFields = [
		"email",
		"userEmail",
		"userName",
		"password",
		"apiKey",
		"token",
		"secret",
		"accessToken",
		"refreshToken",
	];

	for (const field of piiFields) {
		delete sanitized[field];
	}

	// Sanitize file paths (remove usernames)
	const props = sanitized as Record<string, any>;
	if (props.filePath && typeof props.filePath === "string") {
		props.filePath = props.filePath.replace(/\/Users\/[^/]+/, "/Users/[redacted]");
		props.filePath = props.filePath.replace(/\/home\/[^/]+/, "/home/[redacted]");
		props.filePath = props.filePath.replace(/C:\\Users\\[^\\]+/, "C:\\Users\\[redacted]");
	}

	return sanitized;
}

/**
 * Determine if event should be forwarded to PostHog (cost control)
 */
function shouldForwardToPostHog(event: string): boolean {
	// Low-priority UI events - store locally only
	const lowPriorityPatterns = [/^ui\./, /^hover/, /^focus/, /^blur/, /^scroll/];

	for (const pattern of lowPriorityPatterns) {
		if (pattern.test(event)) {
			return false;
		}
	}

	// Everything else goes to PostHog
	return true;
}

/**
 * Get feature flags based on user plan
 */
function getFeatureFlags(
	_plan: string,
	userId: string,
	permissions: {
		maxSnapshots?: number;
		cloudBackup?: boolean;
		advancedDetection?: boolean;
		customRules?: boolean;
		teamSharing?: boolean;
	},
): Record<string, boolean> {
	// Base flags from plan
	const baseFlags = {
		cloudBackup: permissions.cloudBackup || false,
		advancedDetection: permissions.advancedDetection || false,
		customRules: permissions.customRules || false,
		teamSharing: permissions.teamSharing || false,
	};

	// A/B testing flags (deterministic based on userId)
	const userHash = hashString(userId);
	const experimentGroup = userHash % 2 === 0 ? "A" : "B";

	const experimentFlags = {
		newSnapshotUI: experimentGroup === "B",
		betaFeatures: experimentGroup === "B",
	};

	return {
		...baseFlags,
		...experimentFlags,
	};
}

/**
 * Simple hash function for deterministic A/B testing
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}
