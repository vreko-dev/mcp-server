"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY as string;

export function AnalyticsScript() {
	useEffect(() => {
		if (!posthogKey) {
			return;
		}

		// Use direct PostHog URL in development to avoid SSL proxy issues
		const isDev = process.env.NODE_ENV === "development";
		const apiHost = isDev ? process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com" : "/ingest";

		posthog.init(posthogKey, {
			api_host: apiHost,
			person_profiles: "identified_only",
			autocapture: true,
			capture_pageview: true,
			capture_pageleave: true,
			session_recording: {
				maskAllInputs: true,
				maskTextSelector: '[data-private="true"]',
				inlineStylesheet: true,
			},
			// Disable decide endpoint (feature flags) to prevent fetch errors
			advanced_disable_decide: true,
			advanced_disable_toolbar_metrics: true,
			loaded: (posthog) => {
				if (isDev) {
					posthog.debug();
				}
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

export { posthog };
