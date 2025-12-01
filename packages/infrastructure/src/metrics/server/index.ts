/**
 * Server Analytics Client
 *
 * PostHog analytics implementation for server-side (Node.js) environments.
 * Uses posthog-node with proper shutdown handling.
 */

import { createLogger, LogLevel } from "@snapback/contracts";
import { nanoid } from "nanoid";
import type { PostHog as PostHogClient } from "posthog-node";
import type { EventPropertiesMap } from "../core/events.js";
import { shouldSampleEvent } from "../core/sampling.js";
import type { AnalyticsClient, GroupProperties, ServerAnalyticsConfig, UserTraits } from "../core/types.js";

const logger = createLogger({ name: "analytics-server", level: LogLevel.INFO });

// ============================================================================
// SERVER ANALYTICS CLIENT
// ============================================================================

export class ServerAnalyticsClient implements AnalyticsClient {
	private client: PostHogClient;
	private config: ServerAnalyticsConfig;
	private superProperties: Record<string, any> = {};

	constructor(client: PostHogClient, config: ServerAnalyticsConfig) {
		this.client = client;
		this.config = config;

		// Set up super properties (manual enrichment for server-side)
		if (config.plan) {
			this.superProperties.plan_tier = config.plan;
		}
		if (config.environment) {
			this.superProperties.environment = config.environment;
		}
		if (config.version) {
			this.superProperties.app_version = config.version;
		}
	}

	track<E extends keyof EventPropertiesMap>(event: E, properties: EventPropertiesMap[E]): void {
		// Apply sampling
		if (!shouldSampleEvent(event as string)) {
			if (this.config.debug) {
				console.log("[Analytics] Event sampled out:", event, properties);
			}
			return;
		}

		// Enrich with super properties
		const enrichedProperties = {
			...properties,
			...this.superProperties,
		};

		// Track event
		this.client.capture({
			distinctId: this.getDistinctId(properties),
			event: event as string,
			properties: enrichedProperties,
		});

		if (this.config.debug) {
			console.log("[Analytics] Event tracked:", event, enrichedProperties);
		}
	}

	identify(userId: string, traits?: UserTraits): void {
		this.client.identify({
			distinctId: userId,
			properties: traits,
		});

		if (this.config.debug) {
			console.log("[Analytics] User identified:", userId, traits);
		}
	}

	alias(userId: string, previousId: string): void {
		this.client.alias({
			distinctId: userId,
			alias: previousId,
		});

		if (this.config.debug) {
			console.log("[Analytics] User aliased:", userId, "←", previousId);
		}
	}

	setGroup(groupType: string, groupId: string, properties?: GroupProperties): void {
		this.client.groupIdentify({
			groupType,
			groupKey: groupId,
			properties,
		});

		if (this.config.debug) {
			console.log("[Analytics] Group set:", groupType, groupId, properties);
		}
	}

	async isFeatureEnabled(flag: string): Promise<boolean> {
		try {
			const enabled = await this.client.isFeatureEnabled(flag, this.getDistinctId());
			return enabled ?? false;
		} catch (error) {
			if (this.config.debug) {
				logger.error("[Analytics] Feature flag check failed:", {
					flag,
					error,
				});
			}
			return false;
		}
	}

	async shutdown(): Promise<void> {
		try {
			await this.client.shutdown();
			if (this.config.debug) {
				console.log("[Analytics] Shutdown complete");
			}
		} catch (error) {
			if (this.config.debug) {
				logger.error("[Analytics] Shutdown error:", { error });
			}
		}
	}

	/**
	 * Get distinct ID from properties or generate anonymous ID
	 */
	private getDistinctId(properties?: Record<string, any>): string {
		return properties?.user_id ?? properties?.device_id ?? properties?.session_id ?? `anon_${nanoid()}`;
	}
}

// ============================================================================
// NOOP CLIENT
// ============================================================================

class NoOpServerAnalyticsClient implements AnalyticsClient {
	track(): void {}
	identify(): void {}
	alias(): void {}
	setGroup(): void {}
	async isFeatureEnabled(): Promise<boolean> {
		return false;
	}
	async shutdown(): Promise<void> {}
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create server-side analytics client
 *
 * @example
 * ```typescript
 * import { createServerAnalytics } from '@snapback/analytics/server';
 *
 * const analytics = createServerAnalytics({
 *   apiKey: process.env.POSTHOG_API_KEY!,
 *   plan: 'pro',
 *   environment: 'api',
 * });
 *
 * analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
 *   snapshot_id: 'chk_123',
 *   branch_name: 'main',
 *   file_count: 10,
 *   size_bytes: 1024,
 * });
 *
 * // IMPORTANT: Always shutdown on process exit
 * process.on('SIGTERM', async () => {
 *   await analytics.shutdown();
 * });
 * ```
 */
export function createServerAnalytics(config: ServerAnalyticsConfig): AnalyticsClient {
	// Return NoOp client if disabled or opted out
	if (config.enabled === false || config.optOut === true) {
		return new NoOpServerAnalyticsClient();
	}

	// Import PostHog from posthog-node
	const { PostHog } = require("posthog-node");

	const client = new PostHog(config.apiKey, {
		host: config.host ?? "https://us.i.posthog.com",
		flushAt: config.flushAt ?? 20,
		flushInterval: config.flushInterval ?? 10000,
	});

	return new ServerAnalyticsClient(client, config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AnalyticsEvents } from "../core/events.js";
export type { ServerAnalyticsConfig } from "../core/types.js";
