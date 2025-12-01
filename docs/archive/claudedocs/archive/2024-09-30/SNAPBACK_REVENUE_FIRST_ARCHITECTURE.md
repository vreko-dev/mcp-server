# SnapBack Revenue-First API Architecture

**Date**: 2025-09-30
**Status**: Implementation Ready
**Priority**: CRITICAL - Path to Revenue
**Timeline**: 2-4 Weeks to First Dollar

---

## Executive Summary

This document captures the **revenue-first approach** to SnapBack's API migration, incorporating critical feedback on monetization strategy. Instead of a 12-week perfect architecture, we're implementing a **2-week MVP** focused on immediate revenue generation.

**Core Principle**: Open-source clients (VS Code, CLI, MCP) drive adoption. Paid API service (with limits/tiers) drives revenue.

**Key Changes from Original Plan**:

-   ❌ Skip monorepo migration initially (do it AFTER revenue validated)
-   ✅ Implement Stripe + API keys + usage limits in Week 1-2
-   ✅ Focus on conversion funnel optimization
-   ✅ Add REST API alongside oRPC for broader adoption
-   ✅ Deploy revenue-generating features first, architectural perfection later

---

## Monetization Model

### Open Core Strategy

```
┌─────────────────────────────────────┐
│   FREE (Open Source)                │
│   - VS Code Extension               │
│   - CLI Tool                        │
│   - MCP Server                      │
│   - Local checkpoints (unlimited)   │
└─────────────────────────────────────┘
              ↓
    Requires API key for:
              ↓
┌─────────────────────────────────────┐
│   PAID (API Service)                │
│   - Cloud backup                    │
│   - Advanced risk analysis          │
│   - Team collaboration              │
│   - Usage analytics                 │
└─────────────────────────────────────┘
```

**Adoption Driver**: Free local-only tools (GitHub stars, word-of-mouth)
**Revenue Driver**: API limits force upgrades for power users

---

## Pricing Tiers

### Tier Definitions

```typescript
export const PRICING_TIERS = {
	free: {
		name: "Free",
		price: 0,
		interval: null,
		limits: {
			checkpointsPerMonth: 100,
			cloudStorageGB: 0,
			teamMembers: 1,
			apiCallsPerDay: 100,
			advancedRiskAnalysis: false,
			prioritySupport: false,
		},
		features: [
			"Unlimited local checkpoints",
			"Basic AI detection",
			"VS Code, CLI, MCP support",
			"Community support",
		],
	},

	solo: {
		name: "Solo",
		price: 29,
		interval: "month",
		stripeProductId: process.env.STRIPE_SOLO_PRODUCT_ID!,
		stripePriceId: process.env.STRIPE_SOLO_PRICE_ID!,
		limits: {
			checkpointsPerMonth: 1000,
			cloudStorageGB: 10,
			teamMembers: 1,
			apiCallsPerDay: 1000,
			advancedRiskAnalysis: true,
			prioritySupport: true,
		},
		features: [
			"Everything in Free",
			"Cloud checkpoint backup (10GB)",
			"Advanced AI-powered risk analysis",
			"Priority email support",
			"30-day checkpoint history",
			"Free SnapBack cap 🧢",
		],
		recommended: true,
	},

	team: {
		name: "Team",
		price: 99,
		interval: "month",
		stripeProductId: process.env.STRIPE_TEAM_PRODUCT_ID!,
		stripePriceId: process.env.STRIPE_TEAM_PRICE_ID!,
		limits: {
			checkpointsPerMonth: 5000,
			cloudStorageGB: 100,
			teamMembers: 10,
			apiCallsPerDay: 5000,
			advancedRiskAnalysis: true,
			prioritySupport: true,
			sso: false,
			auditLogs: true,
			sharedCheckpoints: true,
		},
		features: [
			"Everything in Solo",
			"Team collaboration (up to 10 members)",
			"Shared checkpoints across team",
			"Centralized team policies",
			"Audit logs & compliance reports",
			"90-day checkpoint history",
			"Slack integration",
		],
	},

	enterprise: {
		name: "Enterprise",
		price: null,
		interval: null,
		contactSales: true,
		limits: {
			checkpointsPerMonth: Infinity,
			cloudStorageGB: Infinity,
			teamMembers: Infinity,
			apiCallsPerDay: Infinity,
			advancedRiskAnalysis: true,
			prioritySupport: true,
			sso: true,
			auditLogs: true,
			sharedCheckpoints: true,
			onPremise: true,
			customSla: true,
		},
		features: [
			"Everything in Team",
			"Unlimited everything",
			"SSO (SAML, OIDC)",
			"On-premise deployment option",
			"Custom SLA & uptime guarantees",
			"Dedicated support engineer",
			"Custom AI model training",
		],
	},
} as const;
```

### Stripe Product Setup

**Required Stripe Products** (create in Stripe Dashboard):

1. **SnapBack Solo - Monthly**

    - Product: "SnapBack Solo"
    - Price: $29/month
    - Recurring: Monthly
    - Copy Price ID → `STRIPE_SOLO_PRICE_ID`

2. **SnapBack Team - Monthly**

    - Product: "SnapBack Team"
    - Price: $99/month
    - Recurring: Monthly
    - Copy Price ID → `STRIPE_TEAM_PRICE_ID`

3. **Environment Variables**:
    ```bash
    # .env.local
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_PUBLISHABLE_KEY=pk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    STRIPE_SOLO_PRICE_ID=price_...
    STRIPE_TEAM_PRICE_ID=price_...
    ```

---

## Enhanced Database Schema

### New Tables for Revenue Model

```typescript
// packages/database/drizzle/schema/postgres.ts

// API Keys with Usage Tracking
export const apiKeys = pgTable(
	"api_keys",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: text("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" }
		),

		// Key management
		name: text("name").notNull().default("Default Key"),
		prefix: text("prefix").notNull(), // "sbk_live_" or "sbk_test_"
		hashedKey: text("hashed_key").notNull().unique(), // bcrypt hash
		lastFourChars: text("last_four_chars").notNull(), // for UI display

		// Billing tier
		tier: text("tier").notNull().default("free"), // free | solo | team | enterprise

		// Usage limits (reset monthly)
		checkpointsPerMonth: integer("checkpoints_per_month")
			.notNull()
			.default(100),
		cloudStorageGB: integer("cloud_storage_gb").notNull().default(0),
		apiCallsPerDay: integer("api_calls_per_day").notNull().default(100),

		// Current usage (reset on billing cycle)
		checkpointsUsedThisMonth: integer("checkpoints_used_month")
			.notNull()
			.default(0),
		storageUsedGB: numeric("storage_used_gb", { precision: 10, scale: 2 })
			.notNull()
			.default("0"),
		apiCallsToday: integer("api_calls_today").notNull().default(0),
		lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),

		// Stripe integration
		stripeCustomerId: text("stripe_customer_id"),
		stripeSubscriptionId: text("stripe_subscription_id"),
		currentPeriodStart: timestamp("current_period_start"),
		currentPeriodEnd: timestamp("current_period_end"),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),

		// Metadata
		lastUsedAt: timestamp("last_used_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at"), // null = never expires
		revokedAt: timestamp("revoked_at"), // soft delete
	},
	(table) => ({
		hashedKeyIdx: uniqueIndex("api_keys_hashed_key_idx").on(
			table.hashedKey
		),
		userIdIdx: index("api_keys_user_id_idx").on(table.userId),
		tierIdx: index("api_keys_tier_idx").on(table.tier),
	})
);

// Projects (for checkpoint grouping)
export const projects = pgTable(
	"projects",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: text("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" }
		),

		name: text("name").notNull(),
		pathHash: text("path_hash").notNull(), // SHA-256 hash of local path (privacy)
		repositoryUrl: text("repository_url"), // Git remote URL (optional)

		// Settings
		autoCheckpoint: boolean("auto_checkpoint").default(true),
		cloudBackupEnabled: boolean("cloud_backup_enabled").default(false),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		lastCheckpointAt: timestamp("last_checkpoint_at"),
	},
	(table) => ({
		userIdIdx: index("projects_user_id_idx").on(table.userId),
		pathHashIdx: uniqueIndex("projects_path_hash_idx").on(table.pathHash),
	})
);

// Checkpoints
export const checkpoints = pgTable(
	"checkpoints",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		projectId: text("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		apiKeyId: text("api_key_id")
			.notNull()
			.references(() => apiKeys.id),

		// Git context
		branch: text("branch").notNull(),
		commit: text("commit").notNull(),

		// Trigger
		trigger: text("trigger").notNull(), // "ai-detection" | "manual" | "auto" | "scheduled"

		// Risk assessment
		riskScore: integer("risk_score").notNull(), // 0-100
		severity: text("severity").notNull(), // "low" | "medium" | "high" | "critical"
		riskFactors: json("risk_factors").$type<string[]>(),

		// Files
		fileCount: integer("file_count").notNull(),
		totalSizeBytes: bigint("total_size_bytes", {
			mode: "number",
		}).notNull(),
		filesMetadata: json("files_metadata").$type<
			{
				path: string;
				hash: string; // SHA-256
				size: number;
			}[]
		>(),

		// Cloud backup
		cloudBackupEnabled: boolean("cloud_backup_enabled").default(false),
		cloudBackupCompleted: boolean("cloud_backup_completed").default(false),
		storageKey: text("storage_key"), // S3 key if backed up

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		projectIdIdx: index("checkpoints_project_id_idx").on(table.projectId),
		userIdIdx: index("checkpoints_user_id_idx").on(table.userId),
		createdAtIdx: index("checkpoints_created_at_idx").on(table.createdAt),
	})
);

// Checkpoint Recoveries (for analytics)
export const checkpointRecoveries = pgTable("checkpoint_recoveries", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => cuid()),
	checkpointId: text("checkpoint_id")
		.notNull()
		.references(() => checkpoints.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	success: boolean("success").notNull(),
	filesRestored: integer("files_restored").notNull(),
	source: text("source").notNull(), // "local" | "cloud"
	durationMs: integer("duration_ms"),
	errorMessage: text("error_message"),

	recoveredAt: timestamp("recovered_at").defaultNow().notNull(),
});

// Conversion Funnel Events
export const conversionEvents = pgTable(
	"conversion_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		apiKeyId: text("api_key_id").references(() => apiKeys.id),

		eventType: text("event_type").notNull(), // see FUNNEL_EVENTS below
		eventData: json("event_data"),

		// Attribution
		source: text("source"), // "vscode" | "cli" | "mcp" | "web"
		referrer: text("referrer"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("conversion_events_user_id_idx").on(table.userId),
		eventTypeIdx: index("conversion_events_type_idx").on(table.eventType),
		createdAtIdx: index("conversion_events_created_at_idx").on(
			table.createdAt
		),
	})
);
```

---

## API Implementation

### API Key Generation & Management

```typescript
// packages/api/modules/apikeys/procedures/create-api-key.ts
import { procedure } from "../../../orpc/init";
import { z } from "zod";
import { apiKeys } from "@repo/database/drizzle/schema";
import { db } from "@repo/database";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PRICING_TIERS } from "@repo/config";

const CreateApiKeySchema = z.object({
	name: z.string().min(1).max(100),
	tier: z.enum(["free", "solo", "team", "enterprise"]).default("free"),
});

export const createApiKey = procedure
	.input(CreateApiKeySchema)
	.mutation(async ({ input, ctx }) => {
		if (!ctx.user) {
			throw new Error("Unauthorized");
		}

		// Generate API key: sbk_live_32randomchars
		const randomPart = randomBytes(16).toString("hex"); // 32 chars
		const prefix = "sbk_live_";
		const fullKey = `${prefix}${randomPart}`;

		// Hash for storage
		const hashedKey = await bcrypt.hash(fullKey, 10);
		const lastFourChars = fullKey.slice(-4);

		// Get tier limits
		const tierConfig = PRICING_TIERS[input.tier];

		// Insert into database
		const [newKey] = await db
			.insert(apiKeys)
			.values({
				userId: ctx.user.id,
				name: input.name,
				prefix,
				hashedKey,
				lastFourChars,
				tier: input.tier,
				checkpointsPerMonth: tierConfig.limits.checkpointsPerMonth,
				cloudStorageGB: tierConfig.limits.cloudStorageGB,
				apiCallsPerDay: tierConfig.limits.apiCallsPerDay,
			})
			.returning();

		// Track funnel event
		await trackConversionEvent({
			userId: ctx.user.id,
			apiKeyId: newKey.id,
			eventType: "API_KEY_CREATED",
			eventData: { tier: input.tier, name: input.name },
		});

		return {
			id: newKey.id,
			name: newKey.name,
			key: fullKey, // Only returned once
			prefix,
			lastFourChars,
			tier: input.tier,
			limits: tierConfig.limits,
			createdAt: newKey.createdAt,
		};
	});
```

### API Key Verification Middleware

```typescript
// packages/api/modules/auth/procedures/verify-api-key.ts
import { middleware } from "../../../orpc/init";
import bcrypt from "bcryptjs";
import { db } from "@repo/database";
import { apiKeys } from "@repo/database/drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

export const verifyApiKeyMiddleware = middleware(
	async ({ ctx, next, meta }) => {
		const authHeader = ctx.headers.get("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			throw new Error("Missing or invalid Authorization header");
		}

		const providedKey = authHeader.substring(7); // Remove "Bearer "

		// Security: Prevent timing attacks
		const allKeys = await db
			.select()
			.from(apiKeys)
			.where(
				and(
					isNull(apiKeys.revokedAt),
					isNull(apiKeys.expiresAt) // TODO: Add expiry check
				)
			);

		let matchedKey = null;
		for (const key of allKeys) {
			if (await bcrypt.compare(providedKey, key.hashedKey)) {
				matchedKey = key;
				break;
			}
		}

		if (!matchedKey) {
			throw new Error("Invalid API key");
		}

		// Update last used timestamp
		await db
			.update(apiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKeys.id, matchedKey.id));

		return next({
			ctx: {
				...ctx,
				apiKey: matchedKey,
				userId: matchedKey.userId,
				tier: matchedKey.tier,
			},
		});
	}
);
```

### Usage Tracking Middleware

```typescript
// packages/api/modules/auth/procedures/track-api-usage.ts
import { middleware } from "../../../orpc/init";
import { db } from "@repo/database";
import { apiKeys } from "@repo/database/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const trackApiUsageMiddleware = middleware(async ({ ctx, next }) => {
	if (!ctx.apiKey) {
		throw new Error("API key required");
	}

	// Increment usage counters
	await db
		.update(apiKeys)
		.set({
			apiCallsToday: sql`${apiKeys.apiCallsToday} + 1`,
		})
		.where(eq(apiKeys.id, ctx.apiKey.id));

	// Check daily API call limit
	const [updated] = await db
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.id, ctx.apiKey.id));

	if (updated.apiCallsToday > updated.apiCallsPerDay) {
		throw new Error(
			`Daily API call limit exceeded (${updated.apiCallsPerDay} calls/day). Upgrade at https://snapback.dev/pricing`
		);
	}

	return next({ ctx });
});
```

### Checkpoint Creation with Limits

```typescript
// packages/api/modules/checkpoints/procedures/create.ts
import { procedure } from "../../../orpc/init";
import {
	CreateCheckpointRequestSchema,
	CreateCheckpointResponseSchema,
} from "@snapback/contracts";
import { db } from "@repo/database";
import { checkpoints, apiKeys } from "@repo/database/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import {
	verifyApiKeyMiddleware,
	trackApiUsageMiddleware,
} from "../../auth/procedures";

export const createCheckpoint = procedure
	.use(verifyApiKeyMiddleware)
	.use(trackApiUsageMiddleware)
	.input(CreateCheckpointRequestSchema)
	.output(CreateCheckpointResponseSchema)
	.mutation(async ({ input, ctx }) => {
		// Check monthly checkpoint limit
		const [keyData] = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.id, ctx.apiKey.id));

		if (keyData.checkpointsUsedThisMonth >= keyData.checkpointsPerMonth) {
			throw new Error(
				`Monthly checkpoint limit exceeded (${keyData.checkpointsPerMonth} checkpoints/month). ` +
					`Upgrade at https://snapback.dev/pricing for ${
						keyData.tier === "free" ? "1,000" : "unlimited"
					} checkpoints.`
			);
		}

		// Create checkpoint
		const [checkpoint] = await db
			.insert(checkpoints)
			.values({
				projectId: input.projectId,
				userId: ctx.userId,
				apiKeyId: ctx.apiKey.id,
				branch: input.branch,
				commit: input.commit,
				trigger: input.trigger,
				riskScore: input.riskScore,
				severity: input.severity,
				riskFactors: input.riskFactors || [],
				fileCount: input.files.length,
				totalSizeBytes: input.files.reduce((sum, f) => sum + f.size, 0),
				filesMetadata: input.files,
				cloudBackupEnabled:
					input.cloudBackup && keyData.cloudStorageGB > 0,
			})
			.returning();

		// Increment checkpoint usage
		await db
			.update(apiKeys)
			.set({
				checkpointsUsedThisMonth: sql`${apiKeys.checkpointsUsedThisMonth} + 1`,
			})
			.where(eq(apiKeys.id, ctx.apiKey.id));

		// Track funnel event
		await trackConversionEvent({
			userId: ctx.userId,
			apiKeyId: ctx.apiKey.id,
			eventType: "CHECKPOINT_CREATED",
			eventData: {
				checkpointId: checkpoint.id,
				trigger: input.trigger,
				riskScore: input.riskScore,
				cloudBackup: checkpoint.cloudBackupEnabled,
			},
		});

		// Check if approaching limit (80% used)
		const usagePercent =
			keyData.checkpointsUsedThisMonth / keyData.checkpointsPerMonth;
		if (usagePercent >= 0.8) {
			await trackConversionEvent({
				userId: ctx.userId,
				apiKeyId: ctx.apiKey.id,
				eventType: "LIMIT_APPROACHING",
				eventData: {
					usagePercent,
					currentUsage: keyData.checkpointsUsedThisMonth,
					limit: keyData.checkpointsPerMonth,
				},
			});
		}

		// Generate S3 pre-signed URL if cloud backup enabled
		let uploadUrl = undefined;
		if (checkpoint.cloudBackupEnabled) {
			uploadUrl = await generatePresignedUploadUrl({
				checkpointId: checkpoint.id,
				fileCount: input.files.length,
			});
		}

		return {
			...checkpoint,
			uploadUrl,
		};
	});
```

---

## Stripe Integration

### Checkout Session Creation

```typescript
// packages/api/modules/billing/procedures/create-checkout-session.ts
import { procedure } from "../../../orpc/init";
import { z } from "zod";
import Stripe from "stripe";
import { PRICING_TIERS } from "@repo/config";
import { trackConversionEvent } from "../../telemetry/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2024-12-18.acacia",
});

const CreateCheckoutSessionSchema = z.object({
	tier: z.enum(["solo", "team"]),
	apiKeyId: z.string(),
	successUrl: z.string().url().optional(),
	cancelUrl: z.string().url().optional(),
});

export const createCheckoutSession = procedure
	.input(CreateCheckoutSessionSchema)
	.mutation(async ({ input, ctx }) => {
		if (!ctx.user) {
			throw new Error("Unauthorized");
		}

		const tierConfig = PRICING_TIERS[input.tier];
		const baseUrl =
			process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

		// Create Stripe Checkout session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: [
				{
					price: tierConfig.stripePriceId,
					quantity: 1,
				},
			],
			mode: "subscription",
			success_url:
				input.successUrl || `${baseUrl}/dashboard?checkout=success`,
			cancel_url: input.cancelUrl || `${baseUrl}/pricing`,
			customer_email: ctx.user.email,
			metadata: {
				userId: ctx.user.id,
				apiKeyId: input.apiKeyId,
				tier: input.tier,
			},
			subscription_data: {
				metadata: {
					userId: ctx.user.id,
					apiKeyId: input.apiKeyId,
					tier: input.tier,
				},
			},
		});

		// Track funnel event
		await trackConversionEvent({
			userId: ctx.user.id,
			apiKeyId: input.apiKeyId,
			eventType: "CHECKOUT_STARTED",
			eventData: {
				tier: input.tier,
				price: tierConfig.price,
				sessionId: session.id,
			},
		});

		return {
			checkoutUrl: session.url!,
			sessionId: session.id,
		};
	});
```

### Stripe Webhook Handler

```typescript
// packages/api/modules/billing/webhooks/stripe.ts
import Stripe from "stripe";
import { db } from "@repo/database";
import { apiKeys } from "@repo/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { PRICING_TIERS } from "@repo/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2024-12-18.acacia",
});

export async function handleStripeWebhook(rawBody: string, signature: string) {
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			rawBody,
			signature,
			webhookSecret
		);
	} catch (err) {
		throw new Error(
			`Webhook signature verification failed: ${err.message}`
		);
	}

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object as Stripe.Checkout.Session;
			const { userId, apiKeyId, tier } = session.metadata!;

			// Update API key with subscription details
			const tierConfig =
				PRICING_TIERS[tier as keyof typeof PRICING_TIERS];

			await db
				.update(apiKeys)
				.set({
					tier,
					stripeCustomerId: session.customer as string,
					stripeSubscriptionId: session.subscription as string,
					checkpointsPerMonth: tierConfig.limits.checkpointsPerMonth,
					cloudStorageGB: tierConfig.limits.cloudStorageGB,
					apiCallsPerDay: tierConfig.limits.apiCallsPerDay,
					currentPeriodStart: new Date(),
					currentPeriodEnd: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					), // +30 days
				})
				.where(eq(apiKeys.id, apiKeyId));

			// Track conversion
			await trackConversionEvent({
				userId,
				apiKeyId,
				eventType: "CHECKOUT_COMPLETED",
				eventData: {
					tier,
					subscriptionId: session.subscription,
					customerId: session.customer,
				},
			});

			break;
		}

		case "invoice.payment_succeeded": {
			const invoice = event.data.object as Stripe.Invoice;
			const subscriptionId = invoice.subscription as string;

			// Reset monthly usage counters
			await db
				.update(apiKeys)
				.set({
					checkpointsUsedThisMonth: 0,
					apiCallsToday: 0,
					lastResetAt: new Date(),
					currentPeriodStart: new Date(invoice.period_start * 1000),
					currentPeriodEnd: new Date(invoice.period_end * 1000),
				})
				.where(eq(apiKeys.stripeSubscriptionId, subscriptionId));

			break;
		}

		case "customer.subscription.deleted": {
			const subscription = event.data.object as Stripe.Subscription;

			// Downgrade to free tier
			const freeTier = PRICING_TIERS.free;
			await db
				.update(apiKeys)
				.set({
					tier: "free",
					stripeSubscriptionId: null,
					checkpointsPerMonth: freeTier.limits.checkpointsPerMonth,
					cloudStorageGB: freeTier.limits.cloudStorageGB,
					apiCallsPerDay: freeTier.limits.apiCallsPerDay,
					cancelAtPeriodEnd: false,
				})
				.where(eq(apiKeys.stripeSubscriptionId, subscription.id));

			break;
		}

		case "customer.subscription.updated": {
			const subscription = event.data.object as Stripe.Subscription;

			// Update cancel_at_period_end status
			await db
				.update(apiKeys)
				.set({
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
				})
				.where(eq(apiKeys.stripeSubscriptionId, subscription.id));

			break;
		}
	}

	return { received: true };
}
```

### Webhook Route

```typescript
// apps/web/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@repo/api/modules/billing/webhooks/stripe";

export async function POST(req: NextRequest) {
	const rawBody = await req.text();
	const signature = req.headers.get("stripe-signature")!;

	try {
		await handleStripeWebhook(rawBody, signature);
		return NextResponse.json({ received: true });
	} catch (err) {
		console.error("Stripe webhook error:", err);
		return NextResponse.json({ error: err.message }, { status: 400 });
	}
}
```

---

## Conversion Funnel Tracking

### Funnel Events

```typescript
// packages/api/modules/telemetry/constants.ts
export const FUNNEL_EVENTS = {
	// Onboarding
	USER_REGISTERED: "user.registered",
	API_KEY_CREATED: "api_key.created",

	// Activation
	FIRST_CHECKPOINT: "checkpoint.first",
	FIRST_RECOVERY: "recovery.first",

	// Engagement
	CHECKPOINT_CREATED: "checkpoint.created",
	RECOVERY_SUCCESS: "recovery.success",
	RECOVERY_FAILED: "recovery.failed",

	// Monetization
	LIMIT_APPROACHING: "limit.approaching",
	LIMIT_HIT: "limit.hit",
	PRICING_VIEWED: "pricing.viewed",
	CHECKOUT_STARTED: "checkout.started",
	CHECKOUT_COMPLETED: "checkout.completed",
	CHECKOUT_ABANDONED: "checkout.abandoned",

	// Retention
	TEAM_CREATED: "team.created",
	TEAM_MEMBER_INVITED: "team.member_invited",

	// Churn signals
	SUBSCRIPTION_CANCELED: "subscription.canceled",
	API_KEY_REVOKED: "api_key.revoked",
} as const;
```

### Tracking Helper

```typescript
// packages/api/modules/telemetry/utils/track-conversion.ts
import { db } from "@repo/database";
import { conversionEvents } from "@repo/database/drizzle/schema";

export async function trackConversionEvent({
	userId,
	apiKeyId,
	eventType,
	eventData,
	source,
	referrer,
}: {
	userId?: string;
	apiKeyId?: string;
	eventType: string;
	eventData?: any;
	source?: string;
	referrer?: string;
}) {
	await db.insert(conversionEvents).values({
		userId,
		apiKeyId,
		eventType,
		eventData,
		source,
		referrer,
	});
}
```

### Usage Analytics Endpoint

```typescript
// packages/api/modules/analytics/procedures/get-usage.ts
import { procedure } from "../../../orpc/init";
import { z } from "zod";
import { db } from "@repo/database";
import {
	apiKeys,
	checkpoints,
	conversionEvents,
} from "@repo/database/drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";

const GetUsageSchema = z.object({
	apiKeyId: z.string(),
	period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export const getUsage = procedure
	.input(GetUsageSchema)
	.query(async ({ input, ctx }) => {
		if (!ctx.user) {
			throw new Error("Unauthorized");
		}

		const [keyData] = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.id, input.apiKeyId));

		if (!keyData || keyData.userId !== ctx.user.id) {
			throw new Error("API key not found");
		}

		// Calculate date range
		const days = parseInt(input.period);
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		// Get checkpoint count
		const checkpointCount = await db
			.select({
				count: sql<number>`count(*)`,
			})
			.from(checkpoints)
			.where(
				and(
					eq(checkpoints.apiKeyId, input.apiKeyId),
					gte(checkpoints.createdAt, startDate)
				)
			);

		return {
			tier: keyData.tier,
			limits: {
				checkpointsPerMonth: keyData.checkpointsPerMonth,
				cloudStorageGB: keyData.cloudStorageGB,
				apiCallsPerDay: keyData.apiCallsPerDay,
			},
			usage: {
				checkpointsThisMonth: keyData.checkpointsUsedThisMonth,
				checkpointsLast30Days: checkpointCount[0].count,
				apiCallsToday: keyData.apiCallsToday,
				storageUsedGB: parseFloat(keyData.storageUsedGB),
			},
			billing: {
				currentPeriodStart: keyData.currentPeriodStart,
				currentPeriodEnd: keyData.currentPeriodEnd,
				cancelAtPeriodEnd: keyData.cancelAtPeriodEnd,
			},
		};
	});
```

---

## Client Integration

### VS Code Extension - API Key Setup

```typescript
// apps/vscode/src/api/client.ts
import {
	CreateCheckpointRequest,
	CreateCheckpointResponse,
} from "@snapback/contracts";
import * as vscode from "vscode";

const API_BASE = process.env.SNAPBACK_API_URL || "https://api.snapback.dev";

export class SnapBackAPIClient {
	private apiKey: string | undefined;

	async initialize() {
		// Get API key from VS Code secrets storage
		this.apiKey = (await vscode.workspace
			.getConfiguration()
			.get("snapback.apiKey")) as string;
	}

	async createCheckpoint(
		data: CreateCheckpointRequest
	): Promise<CreateCheckpointResponse> {
		if (!this.apiKey) {
			throw new Error(
				"API key not configured. Run 'SnapBack: Configure API Key' to set up."
			);
		}

		const response = await fetch(`${API_BASE}/v1/checkpoints`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const error = await response.text();

			// Handle limit errors with upgrade CTA
			if (error.includes("limit exceeded")) {
				const action = await vscode.window.showErrorMessage(
					error,
					"Upgrade Now",
					"View Pricing"
				);

				if (action === "Upgrade Now") {
					vscode.env.openExternal(
						vscode.Uri.parse("https://snapback.dev/pricing")
					);
				}
			}

			throw new Error(error);
		}

		return response.json();
	}
}
```

### CLI - API Key Management

```bash
# snapback login
$ snapback login
Enter your API key: sbk_live_********************************
✓ API key verified
✓ Tier: Solo ($29/month)
✓ Limits: 1,000 checkpoints/month, 10GB cloud storage

# snapback status
$ snapback status
API Key: sbk_...xyz4
Tier: Solo
Usage this month: 127 / 1,000 checkpoints (12.7%)
Cloud storage: 2.4GB / 10GB (24%)

# snapback upgrade
$ snapback upgrade
Opening pricing page... https://snapback.dev/pricing
```

---

## REST API (External Consumers)

### Public REST Endpoints

```typescript
// apps/web/app/api/v1/checkpoints/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreateCheckpointRequestSchema } from "@snapback/contracts";
import { verifyApiKey, createCheckpoint } from "@repo/api";

export async function POST(req: NextRequest) {
	try {
		// Verify API key
		const apiKey = req.headers.get("Authorization")?.substring(7);
		if (!apiKey) {
			return NextResponse.json(
				{ error: "Missing Authorization header" },
				{ status: 401 }
			);
		}

		const ctx = await verifyApiKey(apiKey);

		// Parse & validate request body
		const body = await req.json();
		const data = CreateCheckpointRequestSchema.parse(body);

		// Create checkpoint
		const checkpoint = await createCheckpoint(data, ctx);

		return NextResponse.json(checkpoint, { status: 201 });
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
}

export async function GET(req: NextRequest) {
	try {
		const apiKey = req.headers.get("Authorization")?.substring(7);
		if (!apiKey) {
			return NextResponse.json(
				{ error: "Missing Authorization header" },
				{ status: 401 }
			);
		}

		const ctx = await verifyApiKey(apiKey);

		// Get query params
		const { searchParams } = new URL(req.url);
		const projectId = searchParams.get("projectId");
		const limit = parseInt(searchParams.get("limit") || "50");

		// List checkpoints
		const checkpoints = await listCheckpoints({
			userId: ctx.userId,
			projectId: projectId || undefined,
			limit,
		});

		return NextResponse.json(checkpoints);
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
}
```

---

## Implementation Timeline (Revenue-First)

### Week 1: MVP API (Revenue Foundation)

**Monday-Tuesday**: Database & Auth

-   [x] Enhanced database schema (API keys, checkpoints, projects)
-   [x] API key generation with bcrypt
-   [x] Verification middleware
-   [x] Usage tracking middleware

**Wednesday-Thursday**: Stripe Integration

-   [ ] Stripe checkout session creation
-   [ ] Webhook handler (subscription lifecycle)
-   [ ] Test mode subscription flow
-   [ ] Pricing tiers configuration

**Friday**: Deployment

-   [ ] Database migrations (Drizzle push)
-   [ ] Deploy API to Vercel
-   [ ] Configure Stripe webhook endpoint
-   [ ] Test end-to-end flow (create key → upgrade → limits update)

**Deliverable**: Working API with billing

### Week 2: Client Integration & Limits

**Monday-Tuesday**: VS Code Extension

-   [ ] API client implementation
-   [ ] API key configuration UI
-   [ ] Usage stats display
-   [ ] Upgrade prompts on limit hit

**Wednesday**: CLI Updates

-   [ ] `snapback login` command
-   [ ] `snapback status` (show usage)
-   [ ] `snapback upgrade` (open pricing)

**Thursday**: Conversion Optimization

-   [ ] Funnel event tracking
-   [ ] Limit approaching notifications
-   [ ] Dashboard usage analytics
-   [ ] Email notifications (Resend)

**Friday**: Launch Prep

-   [ ] Documentation (API docs, setup guides)
-   [ ] Pricing page updates
-   [ ] Beta tester invitations
-   [ ] Launch announcement

**Deliverable**: Revenue-generating API with clients

### Week 3-4: Enhanced Features (Retention)

**Team Features**:

-   [ ] Workspace creation
-   [ ] Team member invitations
-   [ ] Shared checkpoints viewer
-   [ ] Team policies

**Analytics**:

-   [ ] Dashboard showing conversion funnel
-   [ ] Cohort analysis
-   [ ] Churn prediction
-   [ ] MRR tracking

**Cloud Backup** (Paid Feature):

-   [ ] S3 integration (pre-signed URLs)
-   [ ] Chunked file uploads
-   [ ] Encryption at rest
-   [ ] 90-day retention policy

---

## Success Metrics

### Revenue Metrics (Week 1-4)

-   **Week 1**: First paid subscription
-   **Week 2**: $500 MRR (17 Solo or 5 Team subs)
-   **Week 4**: $2,000 MRR (69 Solo or 20 Team subs)

### Conversion Funnel

```
100 users create API key (free tier)
  → 40 hit limit in first month (40% activation)
    → 10 view pricing page (25% intent)
      → 3 start checkout (30% consideration)
        → 2 complete checkout (67% conversion)

Overall: 2% free → paid conversion
```

**Optimization Targets**:

-   Activation: 40% → 60% (better onboarding)
-   Intent: 25% → 40% (clearer upgrade CTAs)
-   Conversion: 67% → 80% (reduce checkout friction)
-   **Overall**: 2% → 5% conversion rate

### Retention Metrics

-   **Day 7**: 70% of users still active
-   **Day 30**: 40% of users still active
-   **Month 2**: 80% of paid users renew

---

## Pricing Strategy

### Free Tier (Adoption Engine)

-   100 checkpoints/month (enough for light users)
-   No cloud backup (local only)
-   Full feature access locally
-   Upgrade CTA at 80% usage

**Goal**: Drive GitHub stars, word-of-mouth, SEO

### Solo Tier ($29/mo - Sweet Spot)

-   1,000 checkpoints/month (10x free)
-   10GB cloud backup
-   Advanced risk analysis
-   Priority support
-   Free SnapBack cap 🧢 (swag = loyalty)

**Goal**: Individual developers, freelancers

### Team Tier ($99/mo - High LTV)

-   5,000 checkpoints/month
-   100GB cloud backup
-   Team collaboration features
-   Audit logs (compliance)

**Goal**: Small teams (3-10 devs)

### Enterprise (Custom - Whale Hunting)

-   Unlimited everything
-   SSO, on-premise, SLA
-   Dedicated support

**Goal**: Large companies (>50 devs)

---

## Risk Mitigation

### Technical Risks

| Risk                          | Impact | Mitigation                                  |
| ----------------------------- | ------ | ------------------------------------------- |
| Stripe webhook failures       | High   | Retry logic, dead letter queue              |
| API key brute force           | Medium | Rate limiting, bcrypt (slow hash)           |
| Usage counter race conditions | Medium | Database transactions, row-level locking    |
| S3 cost overrun               | High   | Per-user storage limits, lifecycle policies |

### Business Risks

| Risk                | Impact | Mitigation                              |
| ------------------- | ------ | --------------------------------------- |
| Low conversion rate | High   | A/B test pricing, optimize funnel       |
| High churn          | High   | Improve onboarding, add retention hooks |
| Free tier abuse     | Medium | API rate limits, captcha on signup      |

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Approve this plan** - Confirm revenue-first approach
2. 🚀 **Start Week 1 implementation** - Database schema + Stripe setup
3. 📝 **Create Stripe products** - Solo ($29/mo), Team ($99/mo)
4. 🔑 **Set environment variables** - Stripe keys, webhook secret
5. 📊 **Setup analytics** - PostHog or Amplitude for funnel tracking

### Follow-Up Documents Needed

-   [ ] API Documentation (OpenAPI spec)
-   [ ] Client Integration Guide (VS Code, CLI, MCP)
-   [ ] Billing FAQ (for support)
-   [ ] Webhook Testing Guide

---

## Conclusion

**This is the path to revenue.** Instead of 12 weeks of architectural perfection, we're shipping a revenue-generating API in 2 weeks.

**Open Core Model**:

-   Free clients (GitHub, open source) → Drive adoption
-   Paid API (limits, cloud features) → Drive revenue

**Timeline**:

-   Week 1: MVP API + Stripe integration
-   Week 2: Client integration + launch
-   Week 3-4: Enhanced features + optimization
-   Week 5+: Monorepo migration (after revenue validated)

**Success = First Dollar in 14 Days**

Let's build it.

---

**Document Status**: Ready for Implementation
**Approval Required**: Yes
**Implementation Start**: Upon approval
**Target Launch**: 2 weeks from start
