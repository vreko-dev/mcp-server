"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY as string;

export function AnalyticsScript() {
	useEffect(() => {
		if (!posthogKey) {
			return;
		}

		posthog.init(posthogKey, {
			api_host:
				process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
			person_profiles: "identified_only",
			autocapture: true,

			// Enable pageview tracking for SPA (Next.js App Router)
			// Use 'history_change' to avoid double-counting with Vercel Analytics
			capture_pageview: true,
			capture_pageleave: true,

			// Session recording with smart sampling
			session_recording: {
				maskAllInputs: true,
				maskTextSelector: '[data-private="true"]', // Mask elements with data-private attribute
				// recordCanvas removed - not available in current PostHog version
				inlineStylesheet: true,
			},

			// Advanced session replay configuration
			advanced_disable_decide: false,
			advanced_disable_toolbar_metrics: true, // Disable toolbar metrics for privacy

			// Sampling configuration removed - not available in current PostHog version
			// Use decide endpoint or feature flags for sampling instead

			loaded: (posthog) => {
				if (process.env.NODE_ENV === "development") posthog.debug();
			},
		});
	}, []);

	return null;
}

export function useAnalytics() {
	const trackEvent = (event: string, data?: Record<string, unknown>) => {
		if (!posthogKey) {
			return;
		}

		posthog.capture(event, data);
	};

	const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
		if (!posthogKey) {
			return;
		}

		posthog.identify(userId, traits);
	};

	const resetUser = () => {
		if (!posthogKey) {
			return;
		}

		posthog.reset();
	};

	return {
		trackEvent,
		identifyUser,
		resetUser,
	};
}

// Export posthog instance for advanced usage
export { posthog };
