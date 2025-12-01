"use client";

import type { PropsWithChildren } from "react";
import { usePostHogAuth } from "../hooks/use-posthog-auth";

/**
 * Component that tracks authentication state in PostHog
 * Must be rendered inside SessionProvider
 */
export function PostHogAuthTracker({ children }: PropsWithChildren) {
	usePostHogAuth();
	return <>{children}</>;
}
