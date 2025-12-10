export type ActionType =
	| "account_created" // +50, once
	| "email_verified" // +25, once
	| "github_starred" // +100, once
	| "discord_joined" // +75, once
	| "first_snapshot" // +50, once
	| "referral_signup" // +200, repeatable
	| "referral_activated" // +100, repeatable (referral hits 5 snapshots)
	| "feedback_submitted" // +150, repeatable
	| "share_twitter" // +50, weekly
	| "tutorial_completed"; // +25, once

export interface Pioneer {
	id: string;
	userId: string;
	githubUsername: string;
	tier: "seedling" | "grower" | "cultivator" | "guardian";
	totalPoints: number;
	referralCode: string;
	referredBy?: string;
	createdAt: string;
	lastActivityAt: string;
}

export interface PioneerAction {
	id: string;
	pioneerId: string;
	actionType: ActionType;
	points: number;
	verified: boolean;
	metadata?: Record<string, unknown>;
	createdAt: string;
}

export interface ActionDefinition {
	id: ActionType;
	label: string;
	points: number;
	once: boolean;
	cta?: {
		label: string;
		href?: string;
		type?: "link" | "copy" | "action";
		value?: string; // for copy
	};
}

export const ACTIONS: ActionDefinition[] = [
	{
		id: "account_created",
		label: "Create Account",
		points: 50,
		once: true,
	},
	{
		id: "email_verified",
		label: "Verify Email",
		points: 25,
		once: true,
	},
	{
		id: "github_starred",
		label: "Star GitHub Repo",
		points: 100,
		once: true,
		cta: { label: "⭐ Star Now", href: "https://github.com/marcelle-labs/snapback", type: "link" },
	},
	{
		id: "discord_joined",
		label: "Join Discord",
		points: 75,
		once: true,
		cta: { label: "💬 Join Server", href: "/api/auth/discord", type: "link" },
	},
	{
		id: "first_snapshot",
		label: "First Snapshot",
		points: 50,
		once: true,
	},
	{
		id: "referral_signup",
		label: "Refer a Friend",
		points: 200,
		once: false,
		cta: { label: "🔗 Copy Link", type: "copy" }, // Value dynamic based on user
	},
	{
		id: "feedback_submitted",
		label: "Submit Feedback",
		points: 150,
		once: false,
		cta: { label: "📝 Share Feedback", href: "/feedback", type: "link" },
	},
];
