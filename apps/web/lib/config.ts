/**
 * Application Configuration
 *
 * Centralized configuration from environment variables.
 * Replaces hardcoded config objects throughout the app.
 *
 * Usage:
 * import { config } from "@/lib/config";
 * if (config.users.enableOnboarding) { ... }
 */

import { env } from "@/lib/env";

/**
 * Payments configuration
 */
export const config = {
	appName: "SnapBack",
	users: {
		enableOnboarding: env.NEXT_PUBLIC_FEATURE_ONBOARDING,
		enableBilling: env.NEXT_PUBLIC_FEATURE_BILLING,
	},
	organizations: {
		enable: env.NEXT_PUBLIC_FEATURE_ORGANIZATIONS,
		enableBilling: env.NEXT_PUBLIC_FEATURE_BILLING,
		requireOrganization: env.NEXT_PUBLIC_FEATURE_REQUIRE_ORGANIZATION,
		enableUsersToCreateOrganizations: true, // Always true when organizations are enabled
	},
	payments: {
		plans: {
			free: { isFree: true, name: "Free" },
			pro: { isFree: false, name: "Pro" },
			enterprise: { isFree: false, name: "Enterprise" },
		},
	},
} as const;

/**
 * Type-safe config access
 */
export type Config = typeof config;
