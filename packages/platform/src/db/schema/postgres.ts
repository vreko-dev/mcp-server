import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

// Enums
export const purchaseTypeEnum = pgEnum("PurchaseType", ["SUBSCRIPTION", "ONE_TIME"]);

// Add new enums for SnapBack
export const subscriptionStatusEnum = pgEnum("subscription_status", [
	"active",
	"canceled",
	"past_due",
	"trialing",
	"paused",
]);

export const planTypeEnum = pgEnum("plan_type", ["free", "pro", "team", "enterprise"]);

// Pioneer Program enums
export const tierEnum = pgEnum("pioneer_tier", ["seedling", "grower", "cultivator", "guardian"]);
export const actionTypeEnum = pgEnum("pioneer_action_type", [
	"github_star",
	"discord_join",
	"referral_direct",
	"referral_bonus",
	"feedback",
	"bug_report",
	"tutorial_complete",
	"waitlist_early",
]);

// Tables
export const user = pgTable("user", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	username: text("username").unique(),
	role: text("role"),
	banned: boolean("banned"),
	banReason: text("banReason"),
	banExpires: timestamp("banExpires"),
	onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
	paymentsCustomerId: text("paymentsCustomerId"),
	locale: text("locale"),
	totalSnapshots: integer("totalSnapshots").default(0).notNull(),
	totalRecoveries: integer("totalRecoveries").default(0).notNull(),
	subscriptionTier: planTypeEnum("subscription_tier").default("free"), // Add subscription tier field
	twoFactorEnabled: boolean("twoFactorEnabled").default(false), // Required by Better Auth twoFactor plugin
	deviceFingerprint: text("deviceFingerprint"), // Added for fraud prevention
});

export const session = pgTable(
	"session",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		expiresAt: timestamp("expiresAt").notNull(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonatedBy"),
		activeOrganizationId: text("activeOrganizationId"),
		token: text("token").notNull(),
		createdAt: timestamp("createdAt").notNull(),
		updatedAt: timestamp("updatedAt").notNull(),
	},

	(table) => [uniqueIndex("session_token_idx").on(table.token)],
);

export const account = pgTable("account", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	expiresAt: timestamp("expiresAt"),
	password: text("password"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt"),
});

export const passkey = pgTable("passkey", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	name: text("name"),
	publicKey: text("publicKey").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	credentialID: text("credentialID").notNull(),
	counter: integer("counter").notNull(),
	deviceType: text("deviceType").notNull(),
	backedUp: boolean("backedUp").notNull(),
	transports: text("transports"),
	createdAt: timestamp("createdAt"),
});

export const twoFactor = pgTable("twoFactor", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	secret: text("secret").notNull(),
	backupCodes: text("backupCodes").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const organization = pgTable(
	"organization",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		name: text("name").notNull(),
		slug: text("slug"),
		logo: text("logo"),
		createdAt: timestamp("createdAt").notNull(),
		metadata: text("metadata"),
		paymentsCustomerId: text("paymentsCustomerId"),
	},

	(table) => [uniqueIndex("organization_slug_idx").on(table.slug)],
);

export const member = pgTable(
	"member",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		createdAt: timestamp("createdAt").notNull(),
	},

	(table) => [uniqueIndex("member_user_org_idx").on(table.userId, table.organizationId)],
);

export const invitation = pgTable("invitation", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	role: text("role"),
	status: text("status").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	inviterId: text("inviterId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const purchase = pgTable("purchase", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId").references(() => organization.id, {
		onDelete: "cascade",
	}),
	userId: text("userId").references(() => user.id, {
		onDelete: "cascade",
	}),
	type: purchaseTypeEnum("type").notNull(),
	customerId: text("customerId").notNull(),
	subscriptionId: text("subscriptionId").unique(),
	productId: text("productId").notNull(),
	status: text("status"),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt"),
});

export const aiChat = pgTable("aiChat", {
	id: varchar("id", { length: 255 })
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId").references(() => organization.id, {
		onDelete: "cascade",
	}),
	userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
	title: text("title"),
	messages: json("messages").$type<Array<object>>(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt"),
});

// Add SnapBack specific tables
// API Keys table - This is the main integration point
export const apiKeys = pgTable(
	"api_keys",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: text("organization_id").references(() => organization.id, {
			onDelete: "cascade",
		}),
		name: text("name").notNull().default("Default Key"),
		key: text("key").unique().notNull(), // Hashed version
		keyPreview: text("key_preview").notNull(), // First 8 chars for display
		permissions: json("permissions")
			.$type<{
				maxSnapshots?: number;
				cloudBackup?: boolean;
				advancedDetection?: boolean;
				customRules?: boolean;
				teamSharing?: boolean;
			}>()
			.default({}),
		lastUsedAt: timestamp("last_used_at"),
		expiresAt: timestamp("expires_at"),
		revokedAt: timestamp("revoked_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},

	(table) => {
		return {
			userIdx: index("api_keys_user_idx").on(table.userId),
			orgIdx: index("api_keys_org_idx").on(table.organizationId),
			keyIdx: uniqueIndex("api_keys_key_idx").on(table.key),
		};
	},
);

// Client Tokens table - for VS Code extension and other clients
export const clientTokens = pgTable(
	"client_tokens",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		token: text("token").unique().notNull(), // Hashed version
		tokenPreview: text("token_preview").notNull(), // First 8 chars for display
		permissions: json("permissions")
			.$type<{
				maxSnapshots?: number;
				cloudBackup?: boolean;
				advancedDetection?: boolean;
				customRules?: boolean;
				teamSharing?: boolean;
			}>()
			.default({}),
		lastUsedAt: timestamp("last_used_at"),
		expiresAt: timestamp("expires_at"),
		revokedAt: timestamp("revoked_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},

	(table) => {
		return {
			userIdx: index("client_tokens_user_idx").on(table.userId),
			tokenIdx: uniqueIndex("client_tokens_token_idx").on(table.token),
		};
	},
);

// Usage tracking from the dev tools
export const apiUsage = pgTable(
	"api_usage",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		endpoint: text("endpoint").notNull(), // 'snapshot', 'recovery', 'status'
		method: text("method").notNull(),
		statusCode: integer("status_code"),
		metadata: json("metadata").$type<{
			filesProtected?: number;
			snapshotId?: string;
			aiTool?: string;
		}>(),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
	},

	(table) => {
		return {
			keyIdx: index("api_usage_key_idx").on(table.apiKeyId),
			timestampIdx: index("api_usage_timestamp_idx").on(table.timestamp),
		};
	},
);

// VS Code Extension Session Tracking - defined in extension-auth.ts
// (Removed duplicate - use extension-auth.ts version instead)

// Subscription management
export const subscriptions = pgTable(
	"subscriptions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		organizationId: text("organization_id").references(() => organization.id, {
			onDelete: "cascade",
		}),
		stripeSubscriptionId: text("stripe_subscription_id").unique(),
		stripeCustomerId: text("stripe_customer_id"),
		plan: planTypeEnum("plan").notNull().default("free"),
		status: subscriptionStatusEnum("status").notNull().default("active"),
		currentPeriodStart: timestamp("current_period_start"),
		currentPeriodEnd: timestamp("current_period_end"),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
		trialEnd: timestamp("trial_end"),
		seats: integer("seats").default(1),
		metadata: json("metadata"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},

	(table) => {
		return {
			userIdx: uniqueIndex("subscriptions_user_idx").on(table.userId),
			orgIdx: uniqueIndex("subscriptions_org_idx").on(table.organizationId),
			stripeIdx: uniqueIndex("subscriptions_stripe_idx").on(table.stripeSubscriptionId),
		};
	},
);

// Usage limits based on plan
export const usageLimits = pgTable(
	"usage_limits",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		subscriptionId: text("subscription_id").references(() => subscriptions.id, {
			onDelete: "cascade",
		}),
		month: timestamp("month").notNull(),
		snapshotsUsed: integer("snapshots_used").default(0),
		snapshotsLimit: integer("snapshots_limit"), // null = unlimited
		cloudStorageUsedMb: integer("cloud_storage_used_mb").default(0),
		cloudStorageLimitMb: integer("cloud_storage_limit_mb"),
		apiCallsUsed: integer("api_calls_used").default(0),
		apiCallsLimit: integer("api_calls_limit"),
	},

	(table) => {
		return {
			subscriptionMonthUnique: uniqueIndex("usage_limits_subscription_month_unique").on(
				table.subscriptionId,
				table.month,
			),
		};
	},
);

// Relations
export const userRelations = relations(user, ({ many }: any) => ({
	sessions: many(session),
	accounts: many(account),
	passkeys: many(passkey),
	invitations: many(invitation),
	purchases: many(purchase),
	memberships: many(member),
	aiChats: many(aiChat),
	twoFactors: many(twoFactor),
	apiKeys: many(apiKeys), // Add relation for API keys
	subscriptions: many(subscriptions), // Add relation for subscriptions
}));

export const organizationRelations = relations(organization, ({ many }: any) => ({
	members: many(member),
	invitations: many(invitation),
	purchases: many(purchase),
	aiChats: many(aiChat),
	apiKeys: many(apiKeys), // Add relation for API keys
	subscriptions: many(subscriptions), // Add relation for subscriptions
}));

export const sessionRelations = relations(session, ({ one }: any) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }: any) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const passkeyRelations = relations(passkey, ({ one }: any) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }: any) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));

export const purchaseRelations = relations(purchase, ({ one }: any) => ({
	organization: one(organization, {
		fields: [purchase.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [purchase.userId],
		references: [user.id],
	}),
}));

export const aiChatRelations = relations(aiChat, ({ one }: any) => ({
	organization: one(organization, {
		fields: [aiChat.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [aiChat.userId],
		references: [user.id],
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }: any) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id],
	}),
}));

// Add relations for new tables
export const apiKeysRelations = relations(apiKeys, ({ one, many }: any) => ({
	user: one(user, {
		fields: [apiKeys.userId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [apiKeys.organizationId],
		references: [organization.id],
	}),
	usage: many(apiUsage),
	// extensionSessions relation is defined in extension-auth.ts
}));

export const clientTokensRelations = relations(clientTokens, ({ one }: any) => ({
	user: one(user, {
		fields: [clientTokens.userId],
		references: [user.id],
	}),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }: any) => ({
	apiKey: one(apiKeys, {
		fields: [apiUsage.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// extensionSessionsRelations - defined in extension-auth.ts
// (Removed duplicate)

export const subscriptionsRelations = relations(subscriptions, ({ one, many }: any) => ({
	user: one(user, {
		fields: [subscriptions.userId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [subscriptions.organizationId],
		references: [organization.id],
	}),
	limits: many(usageLimits),
}));

export const usageLimitsRelations = relations(usageLimits, ({ one }: any) => ({
	subscription: one(subscriptions, {
		fields: [usageLimits.subscriptionId],
		references: [subscriptions.id],
	}),
}));

// Newsletter Subscribers table
export const newsletterSubscribers = pgTable(
	"newsletter_subscribers",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		email: text("email").notNull().unique(),
		source: text("source").default("website"), // website, extension, api, etc.
		hubspotContactId: text("hubspot_contact_id"), // HubSpot contact ID for sync
		hubspotSyncedAt: timestamp("hubspot_synced_at"), // Last sync to HubSpot
		subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
		unsubscribedAt: timestamp("unsubscribed_at"),
		metadata: json("metadata").$type<{
			referrer?: string;
			utmSource?: string;
			utmMedium?: string;
			utmCampaign?: string;
			userAgent?: string;
		}>(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},

	(table) => [uniqueIndex("newsletter_email_idx").on(table.email)],
);

export const newsletterSubscribersRelations = relations(newsletterSubscribers, () => ({}));

// Pioneer Program tables
export const pioneers = pgTable(
	"pioneers",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		username: text("username").notNull(),
		githubId: text("github_id").notNull(),
		tier: tierEnum("tier").notNull().default("seedling"),
		totalPoints: integer("total_points").notNull().default(0),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
		referralCode: text("referral_code").notNull().unique(),
		githubStarred: boolean("github_starred").notNull().default(false),
		lastSyncedAt: timestamp("last_synced_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("pioneers_user_id_idx").on(table.userId),
		uniqueIndex("pioneers_github_id_idx").on(table.githubId),
		uniqueIndex("pioneers_referral_code_idx").on(table.referralCode),
	],
);

export const pioneerActions = pgTable(
	"pioneer_actions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		pioneerId: text("pioneer_id")
			.notNull()
			.references(() => pioneers.id, { onDelete: "cascade" }),
		actionType: actionTypeEnum("action_type").notNull(),
		points: integer("points").notNull(),
		verified: boolean("verified").notNull().default(false),
		metadata: json("metadata").$type<Record<string, any>>(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("pioneer_actions_pioneer_id_idx").on(table.pioneerId),
		index("pioneer_actions_action_type_idx").on(table.actionType),
		index("pioneer_actions_created_at_idx").on(table.createdAt),
	],
);

export const pioneerTierHistory = pgTable(
	"pioneer_tier_history",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		pioneerId: text("pioneer_id")
			.notNull()
			.references(() => pioneers.id, { onDelete: "cascade" }),
		previousTier: tierEnum("previous_tier"),
		newTier: tierEnum("new_tier").notNull(),
		pointsAtTransition: integer("points_at_transition").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("pioneer_tier_history_pioneer_id_idx").on(table.pioneerId)],
);

// Pioneer Program relations
export const pioneersRelations = relations(pioneers, ({ one, many }: any) => ({
	user: one(user, {
		fields: [pioneers.userId],
		references: [user.id],
	}),
	actions: many(pioneerActions),
	tierHistory: many(pioneerTierHistory),
}));

export const pioneerActionsRelations = relations(pioneerActions, ({ one }: any) => ({
	pioneer: one(pioneers, {
		fields: [pioneerActions.pioneerId],
		references: [pioneers.id],
	}),
}));

export const pioneerTierHistoryRelations = relations(pioneerTierHistory, ({ one }: any) => ({
	pioneer: one(pioneers, {
		fields: [pioneerTierHistory.pioneerId],
		references: [pioneers.id],
	}),
}));

export { deviceTrials } from "./snapback/device-trials";
// Snapback schema imports
export * from "./snapback/snapshots";
export * from "./snapback/waitlist";

import { waitlist, waitlistReferrals, waitlistTasks } from "./snapback/waitlist";

// Schema namespace export - all tables as a single object
// Note: extensionSessions is exported from extension-auth.ts via index.ts
export const schema = {
	user,
	session,
	account,
	verification,
	passkey,
	twoFactor,
	organization,
	member,
	invitation,
	purchase,
	aiChat,
	apiKeys,
	clientTokens, // Add client tokens to schema
	apiUsage,
	subscriptions,
	usageLimits,
	newsletterSubscribers,
	pioneers,
	pioneerActions,
	pioneerTierHistory,
	waitlist,
	waitlistReferrals,
	waitlistTasks,
};

// Database type for Supabase client integration
export type Database = {
	public: {
		Tables: {
			user: {
				Row: typeof user.$inferSelect;
				Insert: typeof user.$inferInsert;
				Update: Partial<typeof user.$inferInsert>;
			};
			session: {
				Row: typeof session.$inferSelect;
				Insert: typeof session.$inferInsert;
				Update: Partial<typeof session.$inferInsert>;
			};
			account: {
				Row: typeof account.$inferSelect;
				Insert: typeof account.$inferInsert;
				Update: Partial<typeof account.$inferInsert>;
			};
			verification: {
				Row: typeof verification.$inferSelect;
				Insert: typeof verification.$inferInsert;
				Update: Partial<typeof verification.$inferInsert>;
			};
			passkey: {
				Row: typeof passkey.$inferSelect;
				Insert: typeof passkey.$inferInsert;
				Update: Partial<typeof passkey.$inferInsert>;
			};
			twoFactor: {
				Row: typeof twoFactor.$inferSelect;
				Insert: typeof twoFactor.$inferInsert;
				Update: Partial<typeof twoFactor.$inferInsert>;
			};
			organization: {
				Row: typeof organization.$inferSelect;
				Insert: typeof organization.$inferInsert;
				Update: Partial<typeof organization.$inferInsert>;
			};
			member: {
				Row: typeof member.$inferSelect;
				Insert: typeof member.$inferInsert;
				Update: Partial<typeof member.$inferInsert>;
			};
			invitation: {
				Row: typeof invitation.$inferSelect;
				Insert: typeof invitation.$inferInsert;
				Update: Partial<typeof invitation.$inferInsert>;
			};
			purchase: {
				Row: typeof purchase.$inferSelect;
				Insert: typeof purchase.$inferInsert;
				Update: Partial<typeof purchase.$inferInsert>;
			};
			aiChat: {
				Row: typeof aiChat.$inferSelect;
				Insert: typeof aiChat.$inferInsert;
				Update: Partial<typeof aiChat.$inferInsert>;
			};
			api_keys: {
				Row: typeof apiKeys.$inferSelect;
				Insert: typeof apiKeys.$inferInsert;
				Update: Partial<typeof apiKeys.$inferInsert>;
			};
			api_usage: {
				Row: typeof apiUsage.$inferSelect;
				Insert: typeof apiUsage.$inferInsert;
				Update: Partial<typeof apiUsage.$inferInsert>;
			};

			subscriptions: {
				Row: typeof subscriptions.$inferSelect;
				Insert: typeof subscriptions.$inferInsert;
				Update: Partial<typeof subscriptions.$inferInsert>;
			};
			usage_limits: {
				Row: typeof usageLimits.$inferSelect;
				Insert: typeof usageLimits.$inferInsert;
				Update: Partial<typeof usageLimits.$inferInsert>;
			};
			newsletter_subscribers: {
				Row: typeof newsletterSubscribers.$inferSelect;
				Insert: typeof newsletterSubscribers.$inferInsert;
				Update: Partial<typeof newsletterSubscribers.$inferInsert>;
			};
			pioneers: {
				Row: typeof pioneers.$inferSelect;
				Insert: typeof pioneers.$inferInsert;
				Update: Partial<typeof pioneers.$inferInsert>;
			};
			pioneer_actions: {
				Row: typeof pioneerActions.$inferSelect;
				Insert: typeof pioneerActions.$inferInsert;
				Update: Partial<typeof pioneerActions.$inferInsert>;
			};
			pioneer_tier_history: {
				Row: typeof pioneerTierHistory.$inferSelect;
				Insert: typeof pioneerTierHistory.$inferInsert;
				Update: Partial<typeof pioneerTierHistory.$inferInsert>;
			};
		};
	};
};

// Type exports
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ClientToken = typeof clientTokens.$inferSelect;
export type NewClientToken = typeof clientTokens.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
export type Pioneer = typeof pioneers.$inferSelect;
export type NewPioneer = typeof pioneers.$inferInsert;
export type PioneerAction = typeof pioneerActions.$inferSelect;
export type NewPioneerAction = typeof pioneerActions.$inferInsert;
export type PioneerTierHistory = typeof pioneerTierHistory.$inferSelect;
export type NewPioneerTierHistory = typeof pioneerTierHistory.$inferInsert;

// Agent Suggestions table
export const agentSuggestions = pgTable(
	"agent_suggestions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id, { onDelete: "cascade" }),
		sessionId: text("session_id"),
		requestId: text("request_id").notNull(),
		suggestionId: text("suggestion_id").notNull(),
		suggestionText: text("suggestion_text").notNull(),
		suggestionType: text("suggestion_type"),
		filePath: text("file_path"),
		lineStart: integer("line_start"),
		lineEnd: integer("line_end"),
		characterStart: integer("character_start"),
		characterEnd: integer("character_end"),
		accepted: boolean("accepted").default(false),
		dismissed: boolean("dismissed").default(false),
		timestamp: timestamp("timestamp").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			userCreatedAtIndex: index("agent_suggestions_user_created_at_idx").on(table.userId, table.createdAt),
			apiKeyCreatedAtIndex: index("agent_suggestions_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
			// Check constraint is not directly supported in drizzle-orm/pg-core pgTable builder yet in this version or syntax might differ,
			// but we can skip it for now or add it via raw SQL if needed.
			// The original file had a check constraint.
		};
	},
);

export type AgentSuggestion = typeof agentSuggestions.$inferSelect;
export type NewAgentSuggestion = typeof agentSuggestions.$inferInsert;
