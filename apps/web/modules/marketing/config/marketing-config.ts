/**
 * Marketing configuration
 * Frontend-safe configuration only (no backend dependencies)
 */

export const marketingConfig = {
	appName: "SnapBack",
	tagline: "AI Code Protection for Developers",
	contactForm: {
		enabled: true,
		to: "support@snapback.dev",
		subject: "SnapBack Contact Form Message",
	},
} as const;

export type MarketingConfig = typeof marketingConfig;
