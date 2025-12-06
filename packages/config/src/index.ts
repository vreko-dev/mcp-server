// Legacy config compatibility layer
import type { Config } from "./types.js";

const configValue: Config = {
	appName: "SnapBack",
	tagline: "AI Code Protection for Developers",
	description: "Automatic snapshots before AI changes. Instant recovery when things break.",
	// Organizations
	organizations: {
		// Whether organizations are enabled in general
		enable: true,
		// Whether billing for organizations should be enabled (below you can enable it for users instead)
		enableBilling: true,
		// Whether the organization should be hidden from the user (use this for multi-tenant applications)
		hideOrganization: false,
		// Should users be able to create new organizations? Otherwise only admin users can create them
		enableUsersToCreateOrganizations: true,
		// Whether users should be required to be in an organization. This will redirect users to the organization page after sign in
		requireOrganization: false,
		// Define forbidden organization slugs. Make sure to add all paths that you define as a route after /app/... to avoid routing issues
		forbiddenOrganizationSlugs: [
			"new-organization",
			"admin",
			"settings",
			"ai-demo",
			"organization-invitation",
			"api-keys", // Added for API keys feature
			"snapshot", // Added for SnapBack features
			"snapback", // Added for SnapBack features
			"recover", // Added for SnapBack features
			"protection", // Added for SnapBack features
		],
	},
	// Users
	users: {
		// Whether billing should be enabled for users (above you can enable it for organizations instead)
		enableBilling: false, // Only org-level billing as per guide
		// Whether you want the user to go through an onboarding form after signup (can be defined in the OnboardingForm.tsx)
		enableOnboarding: true,
	},
	// Authentication
	auth: {
		// Whether users should be able to create accounts (otherwise users can only be by admins)
		enableSignup: true,
		// Whether users should be able to sign in with a magic link
		enableMagicLink: true,
		// Whether users should be able to sign in with a social provider
		enableSocialLogin: true,
		// Whether users should be able to sign in with a passkey
		enablePasskeys: false, // As per guide
		// Whether users should be able to sign in with a password
		enablePasswordLogin: true,
		// Whether users should be activate two factor authentication
		enableTwoFactor: true,
		// where users should be redirected after the sign in
		redirectAfterSignIn: "/app/dashboard",
		// where users should be redirected after logout
		redirectAfterLogout: "/",
		// how long a session should be valid
		sessionCookieMaxAge: 60 * 60 * 24 * 30,
	},
	// Mails
	mails: {
		// the from address for mails
		from: "protection@snapback.dev", // Updated as per guide
	},
	// Frontend
	ui: {
		// the themes that should be available in the app
		enabledThemes: ["dark"], // Dark mode only as per guide
		// the default theme
		defaultTheme: "dark",
		// the saas part of the application
		saas: {
			// whether the saas part should be enabled (otherwise all routes will be redirect to the marketing page)
			enabled: true,
			// whether the sidebar layout should be used
			useSidebarLayout: true,
		},
		// the marketing part of the application
		marketing: {
			// whether the marketing features should be enabled (otherwise all routes will be redirect to the saas part)
			enabled: true,
		},
	},
	// Storage
	storage: {
		// define the name of the buckets for the different types of files
		bucketNames: {
			avatars: process.env.NEXT_PUBLIC_AVATARS_BUCKET_NAME ?? "avatars",
			checkpoints: process.env.NEXT_PUBLIC_CHECKPOINTS_BUCKET_NAME ?? "checkpoints",
			snapshots: "snapback-snapshots", // Added for cloud backup feature as per guide
		},
	},
	contactForm: {
		// whether the contact form should be enabled
		enabled: true,
		// the email to which the contact form messages should be sent
		to: "support@snapback.dev", // Updated as per guide
		// the subject of the email
		subject: "SnapBack Contact Form Message",
	},
	// Payments
	payments: {
		// define the products that should be available in the checkout
		plans: {
			// The free plan is treated differently. It will automatically be assigned if the user has no other plan.
			free: {
				name: "Free",
				description: "Open Source Core",
				features: ["VS Code extension", "CLI tool included", "Unlimited local snapshots", "Community support"],
				isFree: true,
			},
			pro: {
				name: "Pro",
				description: "Cloud Intelligence",
				recommended: true,
				features: [
					"Everything in Free",
					"Unlimited local snapshots",
					"5GB cloud backup storage",
					"GitHub integration (personal repos)",
					"30-day cloud history",
					"Cross-repo intelligence",
					"Advanced AI detection (94% accuracy)",
					"Priority support",
				],
				prices: [
					{
						type: "recurring",
						productId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID as string,
						interval: "month",
						amount: 12,
						currency: "USD",
						trialPeriodDays: 14,
					},
					{
						type: "recurring",
						productId: process.env.STRIPE_PRO_YEARLY_PRICE_ID as string,
						interval: "year",
						amount: 120,
						currency: "USD",
						trialPeriodDays: 14,
					},
				],
			},
			team: {
				name: "Team",
				description: "Governance & Visibility",
				features: [
					"Everything in Pro",
					"Team dashboard",
					"PR risk scoring",
					"Block merge policies",
					"Centralized billing",
					"1-year cloud history",
					"25GB storage per user",
					"Role-based access control",
				],
				prices: [
					{
						type: "recurring",
						productId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID as string,
						interval: "month",
						amount: 29,
						currency: "USD",
						seatBased: true,
					},
				],
			},
		},
	},
} as const satisfies Config;

// Export the legacy config as both a named export and default export for backward compatibility
export const config = configValue;
export default configValue;

// Export the type for external use
export type { Config };

// Re-export other modules
export * from "./defaults.js";
export * from "./env.js";
export * from "./feature-flags.js";
export * from "./subscription-config.js";
export * from "./utils/base-url.js";
// Utilities
export * from "./utils/index.js";
export * from "./utils/monorepo-flattener.js";
export * from "./utils/path-transformer.js";
