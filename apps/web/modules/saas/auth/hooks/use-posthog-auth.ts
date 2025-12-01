"use client";

import { posthog } from "@analytics/provider/posthog";
import { useEffect } from "react";
import { useSession } from "./use-session";

/**
 * Hook that integrates PostHog with authentication
 * - Identifies user in PostHog after successful login
 * - Resets PostHog on logout
 */
export function usePostHogAuth() {
	const { user } = useSession();

	useEffect(() => {
		// Skip if PostHog is not configured
		if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			return;
		}

		if (user) {
			// Identify user in PostHog
			posthog.identify(user.id, {
				email: user.email,
				name: user.name,
				createdAt: user.createdAt,
			});
		} else {
			// Reset on logout
			posthog.reset();
		}
	}, [user]);
}
