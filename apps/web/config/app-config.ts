/**
 * Global application configuration
 * Frontend-safe configuration only (no backend dependencies)
 */

export const appConfig = {
	appName: "SnapBack",
	tagline: "AI Code Protection for Developers",
	description:
		"Automatic snapshots before AI changes. Instant recovery when things break.",
} as const;

export type AppConfig = typeof appConfig;
