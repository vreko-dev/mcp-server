import posthog from "posthog-js";

/**
 * Consolidated Analytics Utility
 *
 * Uses PostHog as the single source of truth for analytics.
 * PostHog can forward events to Google Analytics and other destinations
 * via integrations, eliminating the need for manual dual-tracking.
 *
 * Benefits:
 * - Single event tracking call
 * - Consistent event schema
 * - No duplicate pageviews
 * - Centralized analytics configuration
 */

export const analytics = {
	// Initialize is handled by AnalyticsScript component in ClientProviders
	init: () => {
		// No-op: PostHog is initialized in ClientProviders
		// GA4 is loaded via Next.js third-parties in layout.tsx
		if (process.env.NODE_ENV === "development") {
			console.log("📊 Analytics initialized via PostHog");
		}
	},

	// Track events via PostHog
	track: (event: string, properties?: Record<string, unknown>) => {
		if (typeof window === "undefined") {
			return;
		}

		// Track via PostHog (single source of truth)
		posthog.capture?.(event, properties);

		// Console in dev
		if (process.env.NODE_ENV === "development") {
			console.log(`📊 Track: ${event} ${JSON.stringify(properties || {})}`);
		}
	},

	// Track page views (handled automatically by PostHog with 'history_change')
	// This is kept for backwards compatibility but does nothing
	pageview: (url: string) => {
		// No-op: PostHog auto-tracks pageviews in 'history_change' mode
		// Manual pageview tracking is disabled to prevent duplicates
		if (process.env.NODE_ENV === "development") {
			console.log(`📊 Pageview (auto-tracked by PostHog): ${url}`);
		}
	},
};

// Usage throughout the app:
// import { analytics } from "@marketing/lib/analytics";
// analytics.track('hero_cta_click', {
//   location: 'hero',
//   text: 'Get SnapBack Free'
// });
