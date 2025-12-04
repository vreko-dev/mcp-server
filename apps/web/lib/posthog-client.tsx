"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Client-side PostHog initialization and tracking
 *
 * EVENT COORDINATION STRATEGY (prevents double counting):
 *
 * Server-side events (posthog-node) - Source of truth for state changes:
 *   - waitlist_joined, waitlist_invited, waitlist_accepted
 *   - user_created, payment_processed, subscription_changed
 *   - All API mutations that change backend state
 *   - Tagged with: source: "api"
 *
 * Client-side events (posthog-js) - UI interactions only:
 *   - $pageview, button_clicked, form_submitted (autocapture)
 *   - UI interactions that DON'T trigger API mutations
 *   - Tagged with: $lib: "web" (automatic)
 *
 * CRITICAL RULE: Never capture the same logical event from both client and server.
 * If the backend captures it, the frontend should NOT.
 */

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
		const host =
			process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

		if (!apiKey) {
			console.warn("PostHog not configured");
			return;
		}

		// Initialize PostHog
		if (!posthog.__loaded) {
			posthog.init(apiKey, {
				api_host: host,
				person_profiles: "identified_only",
				capture_pageview: false, // We'll capture manually
				capture_pageleave: true,
				autocapture: {
					dom_event_allowlist: ["click", "submit"],
					element_allowlist: ["button", "a", "form"],
				},
				session_recording: {
					// Selective masking instead of maskAllInputs: true
					maskTextSelector:
						".sensitive, [data-sensitive], input[type='password'], input[type='email']",
					maskInputOptions: {
						password: true,
					},
				},
			});
		}
	}, []);

	useEffect(() => {
		// Track pageviews
		if (pathname && posthog.__loaded) {
			let url = window.origin + pathname;
			if (searchParams?.toString()) {
				url += `?${searchParams.toString()}`;
			}
			posthog.capture("$pageview", {
				$current_url: url,
			});
		}
	}, [pathname, searchParams]);

	return <>{children}</>;
}

/**
 * Identify user after auth
 */
export function identifyUser(
	userId: string,
	properties?: Record<string, unknown>,
): void {
	if (posthog.__loaded) {
		posthog.identify(userId, properties);
	}
}

/**
 * Associate user with organization
 */
export function setUserGroup(
	groupType: string,
	groupKey: string,
	properties?: Record<string, unknown>,
): void {
	if (posthog.__loaded) {
		posthog.group(groupType, groupKey, properties);
	}
}

/**
 * Capture custom event
 */
export function captureEvent(
	event: string,
	properties?: Record<string, unknown>,
): void {
	if (posthog.__loaded) {
		posthog.capture(event, properties);
	}
}

/**
 * Reset user (on logout)
 */
export function resetUser(): void {
	if (posthog.__loaded) {
		posthog.reset();
	}
}
