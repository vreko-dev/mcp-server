import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { blob, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Tables
export const user = sqliteTable("user", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
	image: text("image"),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
	username: text("username").unique(),
	role: text("role"),
	banned: integer("banned", { mode: "boolean" }),
	banReason: text("banReason"),
	banExpires: integer("banExpires", { mode: "timestamp" }),
	onboardingComplete: integer("onboardingComplete", { mode: "boolean" }).notNull().default(false),
	paymentsCustomerId: text("paymentsCustomerId"),
	locale: text("locale"),
});

export const session = sqliteTable(
	"session",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonatedBy"),
		activeOrganizationId: text("activeOrganizationId"),
		token: text("token").notNull(),
		createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
	},
	(table) => [uniqueIndex("session_token_idx").on(table.token), index("session_user_idx").on(table.userId)],
);

export const account = sqliteTable(
	"account",
	{
		id: text("id")
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
		expiresAt: integer("expiresAt", { mode: "timestamp" }),
		password: text("password"),
		accessTokenExpiresAt: integer("accessTokenExpiresAt", {
			mode: "timestamp",
		}),
		refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
			mode: "timestamp",
		}),
		scope: text("scope"),
		createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		index("account_user_idx").on(table.userId),
		index("account_provider_user_idx").on(table.providerId, table.userId),
	],
);

export const verification = sqliteTable("verification", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	createdAt: integer("createdAt", { mode: "timestamp" }),
	updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export const passkey = sqliteTable("passkey", {
	id: text("id")
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
	backedUp: integer("backedUp", { mode: "boolean" }).notNull(),
	transports: text("transports"),
	createdAt: integer("createdAt", { mode: "timestamp" }),
});

export const twoFactor = sqliteTable("twoFactor", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	secret: text("secret").notNull(),
	backupCodes: text("backupCodes").notNull(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const organization = sqliteTable(
	"organization",
	{
		id: text("id")
			.$defaultFn(() => cuid())
			.primaryKey(),
		name: text("name").notNull(),
		slug: text("slug"),
		logo: text("logo"),
		createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
		metadata: text("metadata"),
		paymentsCustomerId: text("paymentsCustomerId"),
	},
	(table) => [uniqueIndex("organization_slug_idx").on(table.slug)],
);

export const member = sqliteTable(
	"member",
	{
		id: text("id").primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	},
	(table) => [uniqueIndex("member_user_org_idx").on(table.userId, table.organizationId)],
);

export const invitation = sqliteTable("invitation", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	role: text("role"),
	status: text("status").notNull(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	inviterId: text("inviterId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const purchase = sqliteTable("purchase", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId").references(() => organization.id, {
		onDelete: "cascade",
	}),
	userId: text("userId").references(() => user.id, {
		onDelete: "cascade",
	}),
	type: text({ enum: ["SUBSCRIPTION", "ONE_TIME"] }).notNull(),
	customerId: text("customerId").notNull(),
	subscriptionId: text("subscriptionId").unique(),
	productId: text("productId").notNull(),
	status: text("status"),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const aiChat = sqliteTable("aiChat", {
	id: text("id")
		.$defaultFn(() => cuid())
		.primaryKey(),
	organizationId: text("organizationId").references(() => organization.id, {
		onDelete: "cascade",
	}),
	userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
	title: text("title"),
	messages: blob("messages", { mode: "json" }),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// Add SnapBack specific tables
// API Keys table - This is the main integration point
export const apiKeys = sqliteTable(
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
		permissions: blob("permissions", { mode: "json" }).$type<{
			maxSnapshots?: number;
			cloudBackup?: boolean;
			advancedDetection?: boolean;
			customRules?: boolean;
			teamSharing?: boolean;
		}>(),
		lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
		expiresAt: integer("expires_at", { mode: "timestamp" }),
		revokedAt: integer("revoked_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => {
		return {
			userIdx: index("api_keys_user_idx").on(table.userId),
			orgIdx: index("api_keys_org_idx").on(table.organizationId),
		};
	},
);

// Usage tracking from the dev tools
export const apiUsage = sqliteTable(
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
		metadata: blob("metadata", { mode: "json" }).$type<{
			filesProtected?: number;
			snapshotId?: string;
			aiTool?: string;
		}>(),
		timestamp: integer("timestamp", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => {
		return {
			keyIdx: index("api_usage_key_idx").on(table.apiKeyId),
			timestampIdx: index("api_usage_timestamp_idx").on(table.timestamp),
		};
	},
);

// Subscription management
export const subscriptions = sqliteTable(
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
		plan: text({ enum: ["free", "solo", "team", "enterprise"] })
			.notNull()
			.default("free"),
		status: text({
			enum: ["active", "canceled", "past_due", "trialing", "paused"],
		})
			.notNull()
			.default("active"),
		currentPeriodStart: integer("current_period_start", {
			mode: "timestamp",
		}),
		currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
		cancelAtPeriodEnd: integer("cancel_at_period_end", {
			mode: "boolean",
		}).default(false),
		trialEnd: integer("trial_end", { mode: "timestamp" }),
		seats: integer("seats").default(1),
		metadata: blob("metadata", { mode: "json" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
		updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
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
export const usageLimits = sqliteTable(
	"usage_limits",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		subscriptionId: text("subscription_id").references(() => subscriptions.id, {
			onDelete: "cascade",
		}),
		month: integer("month", { mode: "timestamp" }).notNull(),
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
export const userRelations = relations(user, ({ many }) => ({
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

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
	purchases: many(purchase),
	aiChats: many(aiChat),
	apiKeys: many(apiKeys), // Add relation for API keys
	subscriptions: many(subscriptions), // Add relation for subscriptions
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));

export const purchaseRelations = relations(purchase, ({ one }) => ({
	organization: one(organization, {
		fields: [purchase.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [purchase.userId],
		references: [user.id],
	}),
}));

export const aiChatRelations = relations(aiChat, ({ one }) => ({
	organization: one(organization, {
		fields: [aiChat.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [aiChat.userId],
		references: [user.id],
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id],
	}),
}));

// Add relations for new tables
export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
	user: one(user, {
		fields: [apiKeys.userId],
		references: [user.id],
	}),
	organization: one(organization, {
		fields: [apiKeys.organizationId],
		references: [organization.id],
	}),
	usage: many(apiUsage),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
	apiKey: one(apiKeys, {
		fields: [apiUsage.apiKeyId],
		references: [apiKeys.id],
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
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

export const usageLimitsRelations = relations(usageLimits, ({ one }) => ({
	subscription: one(subscriptions, {
		fields: [usageLimits.subscriptionId],
		references: [subscriptions.id],
	}),
}));
