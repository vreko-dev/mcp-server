/**
 * Analytics Client
 *
 * Centralized analytics event tracking for client-side usage.
 */

export interface AnalyticsEvent {
	name: string;
	properties?: Record<string, unknown>;
}

export function captureAnalyticsEvent(event: AnalyticsEvent | string, properties?: Record<string, unknown>): void {
	if (typeof window === "undefined") {
		return;
	}

	let eventName: string;
	let eventProperties: Record<string, unknown> | undefined;

	if (typeof event === "string") {
		eventName = event;
		eventProperties = properties;
	} else {
		eventName = event.name;
		eventProperties = event.properties;
	}

	// PostHog is the only supported analytics provider
	const window_ = window as any;
	if (window_.posthog) {
		window_.posthog.capture(eventName, eventProperties);
	} else if (process.env.NODE_ENV === "development") {
		console.debug("[Analytics] PostHog not loaded, would track:", eventName, eventProperties);
	}
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
	if (typeof window === "undefined") {
		return;
	}

	const window_ = window as any;

	// PostHog
	if (window_.posthog) {
		window_.posthog.captureException(error);
		return;
	}

	// Fallback: console error in development
	if (process.env.NODE_ENV === "development") {
		console.error("captureException:", error, context);
	}
}
