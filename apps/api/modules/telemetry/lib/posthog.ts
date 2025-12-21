/**
 * Re-export PostHog from canonical location
 *
 * Per INT-006: Consolidate PostHog to single init from lib/posthog-server.ts
 */
export { captureEvent, getPostHog, getPostHogClient, initializePostHog } from "@/lib/posthog-server";
