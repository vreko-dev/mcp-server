/**
 * Core Analytics Types
 *
 * Isomorphic types used by both server and client implementations.
 */

import type { EventPropertiesMap } from "./events";

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Base analytics client interface
 * Implemented by both server and client
 */
export interface AnalyticsClient {
	/**
	 * Track an event with type-safe properties
	 */
	track<E extends keyof EventPropertiesMap>(event: E, properties: EventPropertiesMap[E]): void | Promise<void>;

	/**
	 * Identify a user
	 */
	identify(userId: string, traits?: UserTraits): void | Promise<void>;

	/**
	 * Alias (link) two user identities
	 */
	alias(userId: string, previousId: string): void | Promise<void>;

	/**
	 * Associate user with a group (team, organization)
	 */
	setGroup(groupType: string, groupId: string, properties?: GroupProperties): void | Promise<void>;

	/**
	 * Check if a feature flag is enabled
	 */
	isFeatureEnabled?(flag: string): boolean | Promise<boolean>;

	/**
	 * Listen to feature flag changes
	 */
	onFeatureFlag?(flag: string, callback: (value: any) => void): void;

	/**
	 * Shutdown and flush events (server-only)
	 */
	shutdown?(): Promise<void>;
}

// ============================================================================
// USER & GROUP TRAITS
// ============================================================================

export interface UserTraits {
	email?: string;
	name?: string;
	plan?: "free" | "pro" | "team" | "enterprise";
	created_at?: string;
	avatar_url?: string;
	[key: string]: any;
}

export interface GroupProperties {
	name?: string;
	plan?: "team" | "enterprise";
	team_size?: number;
	created_at?: string;
	[key: string]: any;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AnalyticsConfig {
	/**
	 * PostHog API key
	 */
	apiKey: string;

	/**
	 * PostHog host URL
	 * @default 'https://us.i.posthog.com'
	 */
	host?: string;

	/**
	 * Enable analytics tracking
	 * @default true in production, false in development
	 */
	enabled?: boolean;

	/**
	 * Enable debug logging
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Opt out of tracking
	 * @default false
	 */
	optOut?: boolean;

	/**
	 * Current user plan (for super properties)
	 */
	plan?: "free" | "pro" | "team" | "enterprise";

	/**
	 * Current environment (for super properties)
	 */
	environment?: "extension" | "web" | "api" | "cli";

	/**
	 * App version (for super properties)
	 */
	version?: string;
}

// ============================================================================
// SERVER-SPECIFIC CONFIG
// ============================================================================

export interface ServerAnalyticsConfig extends AnalyticsConfig {
	/**
	 * Number of events to batch before flushing
	 * @default 20
	 */
	flushAt?: number;

	/**
	 * Flush interval in milliseconds
	 * @default 10000 (10 seconds)
	 */
	flushInterval?: number;
}

// ============================================================================
// CLIENT-SPECIFIC CONFIG
// ============================================================================

export interface SessionRecordingConfig {
	/**
	 * CSS selector for elements to mask
	 */
	maskTextSelector?: string;

	/**
	 * Mask all inputs in session recordings
	 * @default true
	 */
	maskAllInputs?: boolean;

	/**
	 * Mask input options
	 */
	maskInputOptions?: Record<string, boolean>;

	/**
	 * Record canvas elements
	 * @default false (disabled for privacy)
	 */
	recordCanvas?: boolean;

	/**
	 * Inline stylesheets
	 * @default true
	 */
	inlineStylesheet?: boolean;
}

export interface BrowserAnalyticsConfig extends AnalyticsConfig {
	/**
	 * Enable autocapture
	 * @default false (manual control recommended)
	 */
	autocapture?: boolean;

	/**
	 * Capture pageviews
	 * @default false (manual control for SPAs)
	 */
	capturePageview?: boolean;

	/**
	 * Capture page leave events
	 * @default false
	 */
	capturePageleave?: boolean;

	/**
	 * Session recording configuration
	 */
	sessionRecording?: SessionRecordingConfig;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract event name from EventPropertiesMap
 */
export type EventName = keyof EventPropertiesMap;

/**
 * Extract properties for a specific event
 */
export type EventProperties<E extends EventName> = EventPropertiesMap[E];

/**
 * NoOp client for testing/development
 */
export interface NoOpAnalyticsClient extends AnalyticsClient {
	// All methods do nothing
}
