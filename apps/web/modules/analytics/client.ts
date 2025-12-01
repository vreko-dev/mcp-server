/**
 * Analytics Client
 *
 * Centralized analytics event tracking for client-side usage.
 */

export interface AnalyticsEvent {
	name: string;
	properties?: Record<string, unknown>;
}

export function captureAnalyticsEvent(
	event: AnalyticsEvent | string,
	properties?: Record<string, unknown>,
): void {
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

	// Try to use available analytics providers
	const window_ = window as any;

	// PostHog
	if (window_.posthog) {
		window_.posthog.capture(eventName, eventProperties);
		return;
	}

	// Plausible
	if (window_.plausible) {
		window_.plausible(eventName, { props: eventProperties });
		return;
	}

	// Google Analytics
	if (window_.gtag) {
		window_.gtag("event", eventName, eventProperties || {});
		return;
	}

	// Pirsch
	if (window_.pirsch) {
		window_.pirsch(eventName, eventProperties);
		return;
	}

	// Umami
	if (window_.umami) {
		window_.umami.track(eventName, eventProperties);
		return;
	}

	// Fallback: console log in development
	if (process.env.NODE_ENV === "development") {
		console.debug("captureAnalyticsEvent:", eventName, eventProperties);
	}
}

export function captureException(
	error: Error,
	context?: Record<string, unknown>,
): void {
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
