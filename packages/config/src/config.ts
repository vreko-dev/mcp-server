import type { Config } from "./types";

export const config: Config = {
	appName: "SnapBack",
	tagline: "AI-Native DevOps",
	description: "Protection for your code.",
	organizations: {
		enable: true,
		enableBilling: true,
		enableUsersToCreateOrganizations: true,
		requireOrganization: false,
		hideOrganization: false,
		forbiddenOrganizationSlugs: ["admin", "root", "api", "app"],
	},
	users: {
		enableBilling: true,
		enableOnboarding: true,
	},
	auth: {
		enableSignup: true,
		enableMagicLink: true,
		enableSocialLogin: true,
		enablePasskeys: false,
		enablePasswordLogin: true,
		enableTwoFactor: false,
		redirectAfterSignIn: "/app",
		redirectAfterLogout: "/",
		sessionCookieMaxAge: 60 * 60 * 24 * 30,
	},
	mails: {
		from: "no-reply@snapback.dev",
	},
	storage: {
		bucketNames: {
			avatars: "snapback-avatars",
			checkpoints: "snapback-checkpoints",
			snapshots: "snapback-snapshots",
		},
	},
	ui: {
		enabledThemes: ["light", "dark"],
		defaultTheme: "dark",
		saas: {
			enabled: true,
			useSidebarLayout: true,
		},
		marketing: {
			enabled: true,
		},
	},
	contactForm: {
		enabled: true,
		to: "support@snapback.dev",
		subject: "Contact from SnapBack",
	},
	payments: {
		plans: {
			free: {
				name: "Free",
				description: "Essential protection for individuals.",
				features: ["Unlimited local checkpoints", "Basic AI detection", "Community support"],
				isFree: true,
				prices: [
					{
						productId: "price_free",
						amount: 0,
						currency: "USD",
						type: "recurring",
						interval: "month",
					},
				],
			},
			pro: {
				name: "Pro",
				description: "Advanced protection for professional developers.",
				features: ["Cloud backup & sync", "Advanced AI analysis", "Priority support", "Unlimited history"],
				recommended: true,
				prices: [
					{
						productId: "price_pro_monthly",
						amount: 2000,
						currency: "USD",
						type: "recurring",
						interval: "month",
					},
					{
						productId: "price_pro_yearly",
						amount: 20000,
						currency: "USD",
						type: "recurring",
						interval: "year",
					},
				],
			},
			team: {
				name: "Team",
				description: "Collaborative security for teams.",
				features: ["Everything in Pro", "Team dashboard", "Centralized policy management", "Audit logs"],
				prices: [
					{
						productId: "price_team_monthly",
						amount: 4900,
						currency: "USD",
						type: "recurring",
						interval: "month",
						seatBased: true,
					},
				],
			},
		},
	},
};
