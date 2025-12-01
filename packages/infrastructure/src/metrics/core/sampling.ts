/**
 * Event Sampling Logic for Free Tier Budget Management
 *
 * PostHog Free Tier: 1M events/month
 * Target: 800K events/month (80% of limit)
 * Reserve: 200K for spikes
 */

import { AnalyticsEvents } from "./events.js";

// ============================================================================
// SAMPLING TIERS
// ============================================================================

/**
 * Event sampling rates based on business priority
 */
export enum EventTier {
	/**
	 * Core business events - Always tracked (100%)
	 * Auth, snapshots, billing conversions
	 */
	CORE = 1.0,

	/**
	 * Engagement events - Sampled at 50%
	 * Dashboard views, command usage
	 */
	ENGAGEMENT = 0.5,

	/**
	 * Optional events - Sampled at 10%
	 * Diffs, searches, help docs
	 */
	OPTIONAL = 0.1,

	/**
	 * Errors - Always tracked (100%)
	 * Critical for debugging
	 */
	ERRORS = 1.0,
}

// ============================================================================
// EVENT TIER MAPPING
// ============================================================================

/**
 * Map each event to its sampling tier
 */
export const EVENT_SAMPLING_RATES: Record<string, EventTier> = {
	// ===== TIER 1: CORE (100% sampling) =====
	// Authentication
	[AnalyticsEvents.AUTH_SIGNUP_COMPLETED]: EventTier.CORE,
	[AnalyticsEvents.AUTH_LOGIN_COMPLETED]: EventTier.CORE,
	[AnalyticsEvents.AUTH_EMAIL_VERIFIED]: EventTier.CORE,
	[AnalyticsEvents.AUTH_PASSWORD_RESET_COMPLETED]: EventTier.CORE,

	// Core Snapshots
	[AnalyticsEvents.SNAPSHOT_CREATED]: EventTier.CORE,
	[AnalyticsEvents.SNAPSHOT_RESTORED]: EventTier.CORE,
	[AnalyticsEvents.SNAPSHOT_LIMIT_HIT]: EventTier.CORE,
	[AnalyticsEvents.SNAPSHOT_AUTO_CREATED]: EventTier.CORE,

	// Billing & Conversion
	[AnalyticsEvents.BILLING_UPGRADE_PROMPT_SHOWN]: EventTier.CORE,
	[AnalyticsEvents.BILLING_UPGRADE_PROMPT_CLICKED]: EventTier.CORE,
	[AnalyticsEvents.BILLING_CHECKOUT_STARTED]: EventTier.CORE,
	[AnalyticsEvents.BILLING_CHECKOUT_COMPLETED]: EventTier.CORE,
	[AnalyticsEvents.BILLING_CHECKOUT_ABANDONED]: EventTier.CORE,
	[AnalyticsEvents.BILLING_SUBSCRIPTION_UPGRADED]: EventTier.CORE,
	[AnalyticsEvents.BILLING_SUBSCRIPTION_DOWNGRADED]: EventTier.CORE,
	[AnalyticsEvents.BILLING_SUBSCRIPTION_CANCELLED]: EventTier.CORE,

	// Extension Lifecycle
	[AnalyticsEvents.EXTENSION_INSTALLED]: EventTier.CORE,
	[AnalyticsEvents.EXTENSION_ACTIVATED]: EventTier.CORE,
	[AnalyticsEvents.EXTENSION_UNINSTALLED]: EventTier.CORE,

	// Team
	[AnalyticsEvents.TEAM_CREATED]: EventTier.CORE,
	[AnalyticsEvents.TEAM_MEMBER_JOINED]: EventTier.CORE,

	// ===== TIER 2: ENGAGEMENT (50% sampling) =====
	// Snapshot Engagement
	[AnalyticsEvents.SNAPSHOT_VIEWED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.SNAPSHOT_DELETED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.SNAPSHOT_SHARED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.SNAPSHOT_EXPORTED]: EventTier.ENGAGEMENT,

	// Dashboard
	[AnalyticsEvents.DASHBOARD_VIEWED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.DASHBOARD_API_KEY_CREATED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.DASHBOARD_USAGE_CHART_VIEWED]: EventTier.ENGAGEMENT,

	// Extension Usage
	[AnalyticsEvents.EXTENSION_COMMAND_USED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.EXTENSION_SETTINGS_CHANGED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.EXTENSION_UPDATED]: EventTier.ENGAGEMENT,

	// Billing Views
	[AnalyticsEvents.BILLING_PRICING_VIEWED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.BILLING_INVOICE_VIEWED]: EventTier.ENGAGEMENT,

	// API Usage
	[AnalyticsEvents.API_CALL_MADE]: EventTier.ENGAGEMENT,

	// AI Features
	[AnalyticsEvents.AI_SUGGESTION_SHOWN]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.AI_SUGGESTION_ACCEPTED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.AI_SUGGESTION_REJECTED]: EventTier.ENGAGEMENT,

	// Team Collaboration
	[AnalyticsEvents.TEAM_MEMBER_INVITED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.TEAM_SNAPSHOT_SHARED]: EventTier.ENGAGEMENT,
	[AnalyticsEvents.TEAM_SETTINGS_CHANGED]: EventTier.ENGAGEMENT,

	// ===== TIER 3: OPTIONAL (10% sampling) =====
	// Low-priority Snapshots
	[AnalyticsEvents.SNAPSHOT_DIFF_VIEWED]: EventTier.OPTIONAL,
	[AnalyticsEvents.SNAPSHOT_SEARCHED]: EventTier.OPTIONAL,

	// Dashboard Low-priority
	[AnalyticsEvents.DASHBOARD_SEARCH_PERFORMED]: EventTier.OPTIONAL,
	[AnalyticsEvents.DASHBOARD_HELP_ACCESSED]: EventTier.OPTIONAL,
	[AnalyticsEvents.DASHBOARD_EXPORT_TRIGGERED]: EventTier.OPTIONAL,

	// Auth Low-priority
	[AnalyticsEvents.AUTH_LOGOUT_COMPLETED]: EventTier.OPTIONAL,
	[AnalyticsEvents.AUTH_PASSWORD_RESET_REQUESTED]: EventTier.OPTIONAL,

	// Extension Feedback
	[AnalyticsEvents.EXTENSION_FEEDBACK_SUBMITTED]: EventTier.OPTIONAL,

	// Billing Low-priority
	[AnalyticsEvents.BILLING_COUPON_APPLIED]: EventTier.OPTIONAL,

	// Team Low-priority
	[AnalyticsEvents.TEAM_MEMBER_REMOVED]: EventTier.OPTIONAL,

	// ===== ERRORS: ALWAYS TRACK (100%) =====
	[AnalyticsEvents.EXTENSION_ERROR_OCCURRED]: EventTier.ERRORS,
	[AnalyticsEvents.API_ERROR_OCCURRED]: EventTier.ERRORS,
	[AnalyticsEvents.BILLING_PAYMENT_FAILED]: EventTier.ERRORS,
	[AnalyticsEvents.API_RATE_LIMIT_HIT]: EventTier.ERRORS,
	[AnalyticsEvents.AI_RISK_DETECTED]: EventTier.ERRORS,
	[AnalyticsEvents.AI_RISK_PREVENTED]: EventTier.ERRORS,
};

// ============================================================================
// SAMPLING FUNCTIONS
// ============================================================================

/**
 * Determine if an event should be sampled (sent to PostHog)
 *
 * @param event - Event name
 * @returns true if event should be tracked, false otherwise
 */
export function shouldSampleEvent(event: string): boolean {
	const samplingRate = EVENT_SAMPLING_RATES[event] ?? EventTier.CORE;
	return Math.random() <= samplingRate;
}

/**
 * Get the sampling rate for a specific event
 *
 * @param event - Event name
 * @returns Sampling rate (0.0 to 1.0)
 */
export function getSamplingRate(event: string): number {
	return EVENT_SAMPLING_RATES[event] ?? EventTier.CORE;
}

/**
 * Get the tier for a specific event
 *
 * @param event - Event name
 * @returns Event tier
 */
export function getEventTier(event: string): EventTier {
	return EVENT_SAMPLING_RATES[event] ?? EventTier.CORE;
}

// ============================================================================
// BUDGET ESTIMATION
// ============================================================================

/**
 * Estimate monthly event count based on sampling
 *
 * @param rawEventCount - Raw event count before sampling
 * @param eventDistribution - Distribution of events by tier
 * @returns Estimated sampled event count
 */
export function estimateSampledEventCount(
	rawEventCount: number,
	eventDistribution: {
		core: number; // % of events that are core (0-1)
		engagement: number; // % of events that are engagement (0-1)
		optional: number; // % of events that are optional (0-1)
		errors: number; // % of events that are errors (0-1)
	},
): number {
	const coreEvents = rawEventCount * eventDistribution.core * EventTier.CORE;
	const engagementEvents = rawEventCount * eventDistribution.engagement * EventTier.ENGAGEMENT;
	const optionalEvents = rawEventCount * eventDistribution.optional * EventTier.OPTIONAL;
	const errorEvents = rawEventCount * eventDistribution.errors * EventTier.ERRORS;

	return Math.round(coreEvents + engagementEvents + optionalEvents + errorEvents);
}

/**
 * Example budget calculation
 *
 * Assumptions:
 * - 1,000 users
 * - 26 events/user/day average
 * - Distribution: 37.5% core, 25% engagement, 12.5% optional, 25% errors
 */
export const BUDGET_EXAMPLE = {
	monthlyUsers: 1000,
	eventsPerUserPerDay: 26,
	daysPerMonth: 30,
	rawEventCount: 1000 * 26 * 30, // 780K events
	distribution: {
		core: 0.375, // 37.5%
		engagement: 0.25, // 25%
		optional: 0.125, // 12.5%
		errors: 0.25, // 25%
	},
	// Sampled count: 292.5K core + 97.5K engagement + 9.75K optional + 195K errors = 594.75K
	// Well under 800K target!
};
