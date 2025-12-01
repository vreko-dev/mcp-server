"use client";

type PosthogLike = {
	capture?: (event: string, properties?: Record<string, unknown>) => void;
};

const getPosthog = (): PosthogLike | undefined => {
	if (typeof window === "undefined") {
		return undefined;
	}

	const posthog = (window as typeof window & { posthog?: PosthogLike }).posthog;
	return posthog;
};

export const trackMarketingEvent = (
	event: string,
	properties?: Record<string, unknown>,
): void => {
	const posthog = getPosthog();
	if (!posthog || typeof posthog.capture !== "function") {
		return;
	}

	posthog.capture(event, properties);
};

export const marketingAnalytics = {
	hatSystemViewed: () => trackMarketingEvent("hat_system_viewed"),
	hatHovered: (level: string) =>
		trackMarketingEvent("hat_hovered", {
			level,
		}),
	demoHatAssigned: (file: string, hat: string) =>
		trackMarketingEvent("demo_hat_assigned", {
			file,
			hat,
		}),
	recoverySectionViewed: () => trackMarketingEvent("recovery_section_viewed"),
	recoveryTimelineInteraction: (label: string) =>
		trackMarketingEvent("recovery_timeline_interaction", {
			label,
		}),
	recoveryCtaClicked: (variant: "primary" | "docs") =>
		trackMarketingEvent("recovery_cta_clicked", {
			variant,
		}),
	configCopied: () => trackMarketingEvent("config_copied"),
	configDownloaded: () => trackMarketingEvent("config_downloaded"),
	planSelected: (plan: string, billingCycle: "monthly" | "yearly") =>
		trackMarketingEvent("pricing_plan_selected", {
			plan,
			billingCycle,
		}),
	newsletterSubscribed: (domain: string) =>
		trackMarketingEvent("newsletter_subscribed", {
			domain,
		}),
};
