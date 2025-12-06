/**
 * Browser Analytics Client
 *
 * PostHog analytics implementation for browser (client-side) environments.
 * Uses posthog-js with automatic super property enrichment.
 */

import { createLogger, LogLevel } from "@snapback/contracts";
import type { PostHog as PostHogBrowser } from "posthog-js";
import type { EventPropertiesMap } from "../core/events";
import { shouldSampleEvent } from "../core/sampling";
import type { AnalyticsClient, BrowserAnalyticsConfig, GroupProperties, UserTraits } from "../core/types";
import { SessionReplayManager } from "../session-replay/manager";

const logger = createLogger({ name: "analytics-client", level: LogLevel.INFO });

// ============================================================================
// BROWSER ANALYTICS CLIENT
// ============================================================================

export class BrowserAnalyticsClient implements AnalyticsClient {
	private client: PostHogBrowser;
	private config: BrowserAnalyticsConfig;
	private sessionReplayManager: SessionReplayManager;

	constructor(client: PostHogBrowser, config: BrowserAnalyticsConfig) {
		this.client = client;
		this.config = config;
		this.sessionReplayManager = SessionReplayManager.getInstance();

		// Update session replay manager with user context
		if (config.plan || config.environment) {
			this.sessionReplayManager.updateContext({
				plan: config.plan,
				segments: config.environment ? [config.environment] : [],
			});
		}

		// Register super properties (auto-enrichment for browser)
		const superProperties: Record<string, any> = {};

		if (config.plan) {
			superProperties.plan_tier = config.plan;
		}
		if (config.environment) {
			superProperties.environment = config.environment;
		}
		if (config.version) {
			superProperties.app_version = config.version;
		}

		if (Object.keys(superProperties).length > 0) {
			this.client.register(superProperties);
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

		// Track event (super properties auto-enriched by PostHog)
		this.client.capture(event as string, properties);

		if (this.config.debug) {
			console.log("[Analytics] Event tracked:", event, properties);
		}
	}

	identify(userId: string, traits?: UserTraits): void {
		this.client.identify(userId, traits);

		// Update session replay manager with user ID
		this.sessionReplayManager.updateContext({ userId });

		if (this.config.debug) {
			console.log("[Analytics] User identified:", userId, traits);
		}
	}

	alias(userId: string, previousId: string): void {
		this.client.alias(userId, previousId);

		if (this.config.debug) {
			console.log("[Analytics] User aliased:", userId, "←", previousId);
		}
	}

	setGroup(groupType: string, groupId: string, properties?: GroupProperties): void {
		this.client.group(groupType, groupId, properties);

		if (this.config.debug) {
			console.log("[Analytics] Group set:", groupType, groupId, properties);
		}
	}

	isFeatureEnabled(flag: string): boolean {
		try {
			return this.client.isFeatureEnabled(flag) ?? false;
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

	/**
	 * Start session recording
	 * This should be called when we want to explicitly start recording a session
	 */
	startSessionRecording(): void {
		try {
			this.client.startSessionRecording();
			// Record this session in our budget tracking
			this.sessionReplayManager.recordSession();

			if (this.config.debug) {
				console.log("[Analytics] Session recording started");
			}
		} catch (error) {
			if (this.config.debug) {
				logger.error("[Analytics] Failed to start session recording:", { error });
			}
		}
	}

	/**
	 * Stop session recording
	 */
	stopSessionRecording(): void {
		try {
			this.client.stopSessionRecording();

			if (this.config.debug) {
				console.log("[Analytics] Session recording stopped");
			}
		} catch (error) {
			if (this.config.debug) {
				logger.error("[Analytics] Failed to stop session recording:", { error });
			}
		}
	}
}

// ============================================================================
// NOOP CLIENT
// ============================================================================

class NoOpBrowserAnalyticsClient implements AnalyticsClient {
	track(): void {}
	identify(): void {}
	alias(): void {}
	setGroup(): void {}
	isFeatureEnabled(): boolean {
		return false;
	}
	startSessionRecording(): void {}
	stopSessionRecording(): void {}
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create browser-side analytics client
 *
 * @example
 * ```typescript
 * import { createBrowserAnalytics } from '@snapback/analytics/client';
 *
 * const analytics = createBrowserAnalytics({
 *   apiKey: import.meta.env.VITE_POSTHOG_API_KEY!,
 *   plan: 'pro',
 *   environment: 'web',
 * });
 *
 * analytics.track(AnalyticsEvents.DASHBOARD_VIEWED, {
 *   view_duration_ms: 5000,
 *   snapshot_count: 10,
 * });
 * ```
 */
export function createBrowserAnalytics(config: BrowserAnalyticsConfig): AnalyticsClient {
	// Return NoOp client if disabled or opted out
	if (config.enabled === false || config.optOut === true) {
		return new NoOpBrowserAnalyticsClient();
	}

	// Import PostHog from posthog-js (external package, not Node.js module)
	const posthog = require("posthog-js");

	// Get session replay manager instance
	const sessionReplayManager = SessionReplayManager.getInstance();

	// Get dynamic configuration based on user context
	const dynamicConfig = sessionReplayManager.getAnalyticsConfig();

	posthog.init(config.apiKey, {
		api_host: config.host ?? "https://us.i.posthog.com",
		person_profiles: "identified_only",
		autocapture: config.autocapture ?? dynamicConfig.autocapture ?? false,
		capture_pageview: config.capturePageview ?? dynamicConfig.capturePageview ?? false,
		capture_pageleave: config.capturePageleave ?? dynamicConfig.capturePageleave ?? false,
		session_recording:
			config.sessionRecording || dynamicConfig.sessionRecording
				? {
						maskTextSelector:
							(config.sessionRecording?.maskTextSelector ||
								dynamicConfig.sessionRecording?.maskTextSelector) ??
							'[data-private="true"]',
						maskAllInputs:
							(config.sessionRecording?.maskAllInputs || dynamicConfig.sessionRecording?.maskAllInputs) ??
							true,
						recordCanvas: false, // Always disable canvas recording for privacy
						inlineStylesheet: true,
					}
				: undefined,
	});

	return new BrowserAnalyticsClient(posthog, config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AnalyticsEvents } from "../core/events";
export type { BrowserAnalyticsConfig } from "../core/types";
export { SessionReplayManager } from "../session-replay/manager";
