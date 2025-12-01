# SnapBack Monetization System - TDD Implementation Plan

**Last Updated**: 2025-10-03

## Correct Tech Stack

### Infrastructure

-   **Database**: Supabase (managed PostgreSQL + Storage)
-   **ORM**: Drizzle ORM (NOT Prisma)
-   **Auth**: Better Auth with Drizzle adapter (NOT Supabase Auth, NOT Clerk)
-   **Storage**: Supabase Storage (S3-compatible)

### Application Stack

-   **Framework**: Next.js 15 (App Router) + React 19
-   **API**: Next.js Route Handlers + oRPC (existing)
-   **Payments**: Stripe (via @snapback/payments)
-   **Analytics**: PostHog
-   **Logging**: Pino
-   **Testing**: Vitest (unit/integration) + Playwright (E2E)

### Existing Packages

-   `@snapback/database` - Drizzle schema + Supabase client
-   `@snapback/auth` - Better Auth configuration
-   `@snapback/api` - API routes with oRPC
-   `@snapback/payments` - Stripe integration
-   `@snapback/storage` - Supabase Storage client
-   `@snapback/config` - App configuration

## Problem Statement

**Current Issue**: Users can create infinite free trials by reinstalling the VSCode extension.

**Solution**: Progressive authentication with device fingerprinting

1. **Stage 1 (Anonymous)**: 50 checkpoints using device fingerprint only
2. **Stage 2 (Email)**: 1,000 checkpoints after email signup
3. **Stage 3 (Paid)**: Unlimited checkpoints after payment

## Existing Database Schema (Already Built)

✅ `user` - Better Auth users
✅ `session` - Better Auth sessions
✅ `apiKeys` - Better Auth API keys
✅ `checkpoints` - Privacy-first checkpoint metadata
✅ `checkpointFiles` - Individual file metadata
✅ `apiKeyMetadata` - Extended API key tracking
✅ `apiUsageLogs` - Partitioned usage logs (by month)
✅ `usageStatsDaily` - Aggregated daily stats
✅ `organization` - Team/org management
✅ `planTypeEnum` - "free" | "solo" | "team" | "enterprise"

## New Schema Additions Required

### Device Trials Table

**File**: `packages/database/drizzle/schema/snapback/device-trials.ts`

**Purpose**: Track anonymous device usage and prevent trial abuse

**Fields**:

-   `id` - UUID primary key
-   `deviceFingerprint` - Unique device identifier (VSCode machineId)
-   `apiKeyId` - Links to Better Auth apiKeys table
-   `checkpointsUsed` - Counter for usage tracking
-   `apiCallsUsed` - API call counter
-   `checkpointLimit` - Default 50 for anonymous
-   `apiCallLimit` - Default 10,000 for anonymous
-   `trialStartedAt` - Trial creation timestamp
-   `trialExhaustedAt` - When limits were hit
-   `userId` - Links to user after email signup (nullable)
-   `convertedAt` - Conversion timestamp
-   `conversionTier` - Which tier they upgraded to
-   `installCount` - Track reinstall attempts
-   `lastSeenAt` - Last activity timestamp
-   `source` - "vscode" | "cli" | "mcp"
-   `metadata` - JSON metadata (versions, platform)

**Indexes**:

-   UNIQUE on `deviceFingerprint`
-   INDEX on `userId` (for conversion tracking)
-   INDEX on `trialExhaustedAt` (for analytics)

**Relations**:

-   `apiKey` - one-to-one with `apiKeys`
-   `user` - many-to-one with `user` (nullable)

## TDD Implementation Strategy

### Phase 1: Red Phase (Write Tests First)

#### Test 1.1: Device Trial Creation

**File**: `packages/database/__tests__/device-trials.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../drizzle/client";
import { deviceTrials } from "../drizzle/schema/snapback/device-trials";

describe("Device Trials Schema", () => {
	beforeEach(async () => {
		// TODO: Clean up test database
		await db.delete(deviceTrials);
	});

	it("should create device trial with fingerprint", async () => {
		// TODO: Test creating a device trial
		// - Generate test device fingerprint
		// - Create API key via Better Auth
		// - Insert device trial
		// - Verify defaults (50 checkpoint limit, 10K API limit)
	});

	it("should enforce unique device fingerprint", async () => {
		// TODO: Test uniqueness constraint
		// - Create device trial with fingerprint "device-123"
		// - Attempt to create another with same fingerprint
		// - Expect error
	});

	it("should track usage counters", async () => {
		// TODO: Test usage tracking
		// - Create device trial
		// - Increment checkpointsUsed
		// - Increment apiCallsUsed
		// - Verify counters update correctly
	});

	it("should link device to user on conversion", async () => {
		// TODO: Test conversion flow
		// - Create device trial (userId = null)
		// - Create Better Auth user
		// - Update device trial with userId
		// - Set convertedAt timestamp
		// - Verify relationship
	});

	it("should prevent reinstall abuse", async () => {
		// TODO: Test anti-abuse logic
		// - Create device trial
		// - Exhaust trial (checkpointsUsed >= checkpointLimit)
		// - Set trialExhaustedAt
		// - Increment installCount
		// - Verify installCount > 3 blocks new trials
	});
});
```

#### Test 1.2: API Route - Device Trial Creation

**File**: `apps/web/__tests__/api/device-trial.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { POST } from "../../app/api/v1/device-trial/route";

describe("POST /api/v1/device-trial", () => {
	it("should create new device trial for unknown device", async () => {
		// TODO:
		// - Mock request with deviceFingerprint
		// - Call POST handler
		// - Expect 201 Created
		// - Expect response with apiKey, limits
		// - Verify device trial created in database
	});

	it("should return existing trial for known device", async () => {
		// TODO:
		// - Create existing device trial in database
		// - Mock request with same deviceFingerprint
		// - Call POST handler
		// - Expect 200 OK
		// - Expect same apiKey returned
		// - Verify installCount incremented
	});

	it("should block after 3 reinstalls", async () => {
		// TODO:
		// - Create exhausted device trial (installCount = 3)
		// - Mock request with same deviceFingerprint
		// - Call POST handler
		// - Expect 403 Forbidden
		// - Expect error: "TRIAL_ABUSE_DETECTED"
	});

	it("should enforce 24h cooldown after exhaustion", async () => {
		// TODO:
		// - Create exhausted trial (trialExhaustedAt = 1 hour ago)
		// - Mock request
		// - Expect 429 Too Many Requests
		// - Expect error: "TRIAL_COOLDOWN"
	});

	it("should track installation source", async () => {
		// TODO:
		// - Mock request with source: "vscode"
		// - Call POST handler
		// - Verify device trial has source = "vscode"
	});
});
```

#### Test 1.3: API Route - Checkpoint with Usage Tracking

**File**: `apps/web/__tests__/api/checkpoint.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { POST } from "../../app/api/v1/checkpoint/route";

describe("POST /api/v1/checkpoint", () => {
	it("should accept checkpoint with trial API key", async () => {
		// TODO:
		// - Create device trial with API key
		// - Mock checkpoint request with API key
		// - Call POST handler
		// - Expect 201 Created
		// - Verify checkpoint created
		// - Verify checkpointsUsed incremented
	});

	it("should enforce anonymous checkpoint limit (50)", async () => {
		// TODO:
		// - Create device trial (checkpointsUsed = 49)
		// - Mock checkpoint request
		// - Call POST handler
		// - Expect 200 OK with warning
		// - Try 51st checkpoint
		// - Expect 402 Payment Required
	});

	it("should enforce email tier limit (1000)", async () => {
		// TODO:
		// - Create user with email
		// - Link device trial to user (checkpointLimit = 1000)
		// - Create 999 checkpoints
		// - Call POST for 1000th
		// - Expect 200 OK with upgrade prompt
		// - Try 1001st
		// - Expect 402 Payment Required
	});

	it("should allow unlimited for paid tier", async () => {
		// TODO:
		// - Create paid user (tier = "solo")
		// - Create 2000 checkpoints
		// - Call POST handler
		// - Expect 201 Created (no limit)
	});
});
```

#### Test 1.4: Progressive Auth Flow

**File**: `apps/web/__tests__/api/link-device.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { POST } from "../../app/api/v1/auth/link-device/route";

describe("POST /api/v1/auth/link-device", () => {
	it("should link device trial to new user account", async () => {
		// TODO:
		// - Create device trial (userId = null, checkpointsUsed = 45)
		// - Create Better Auth user via email signup
		// - Mock request with deviceFingerprint + session
		// - Call POST handler
		// - Verify deviceTrial.userId set
		// - Verify checkpointLimit increased to 1000
		// - Verify convertedAt timestamp set
		// - Verify PostHog alias called (device → user)
	});

	it("should preserve checkpoint history on conversion", async () => {
		// TODO:
		// - Create device trial with 30 checkpoints
		// - Link to user account
		// - Verify checkpointsUsed still = 30
		// - Verify remaining = 970 (1000 - 30)
	});

	it("should reject if device already linked", async () => {
		// TODO:
		// - Create device trial linked to user A
		// - Attempt to link to user B
		// - Expect 409 Conflict
	});
});
```

#### Test 1.5: Stripe Webhooks

**File**: `apps/web/__tests__/api/stripe-webhooks.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { POST } from "../../app/api/webhooks/stripe/route";
import Stripe from "stripe";

describe("Stripe Webhook Handler", () => {
	it("should handle customer.subscription.created", async () => {
		// TODO:
		// - Create test user (tier = "free")
		// - Mock Stripe subscription.created webhook
		// - Call POST handler
		// - Verify user tier updated to "solo"
		// - Verify paymentsCustomerId linked
		// - Verify PostHog event tracked
	});

	it("should handle invoice.payment_succeeded", async () => {
		// TODO:
		// - Create paid user with subscription
		// - Mock invoice.payment_succeeded webhook
		// - Call POST handler
		// - Verify subscription renewed
		// - Verify usage limits reset
	});

	it("should handle customer.subscription.deleted", async () => {
		// TODO:
		// - Create paid user (tier = "solo")
		// - Mock subscription.deleted webhook
		// - Call POST handler
		// - Verify user tier downgraded to "free"
		// - Verify checkpointLimit set to 1000 (email tier)
		// - Verify cloud backup disabled
		// - Verify local checkpoints preserved
	});

	it("should verify Stripe signature", async () => {
		// TODO:
		// - Mock webhook with invalid signature
		// - Call POST handler
		// - Expect 400 Bad Request
	});
});
```

### Phase 2: Green Phase (Implement to Pass Tests)

#### Implementation 2.1: Device Trials Schema

**File**: `packages/database/drizzle/schema/snapback/device-trials.ts`

```typescript
import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";
import { planTypeEnum } from "../postgres";

/**
 * Device Trials - Anonymous usage tracking for trial abuse prevention
 *
 * TODO:
 * - [ ] Define deviceTrials table with all fields
 * - [ ] Add UNIQUE constraint on deviceFingerprint
 * - [ ] Add foreign key to apiKeys
 * - [ ] Add foreign key to user (nullable for anonymous trials)
 * - [ ] Set default limits (50 checkpoints, 10K API calls)
 * - [ ] Add indexes for performance
 * - [ ] Define relations to user and apiKeys
 * - [ ] Export TypeScript types
 */

export const deviceTrials = pgTable("device_trials", {
	// TODO: Implement schema
	// id: uuid("id").primaryKey().defaultRandom(),
	// deviceFingerprint: text("device_fingerprint").notNull().unique(),
	// apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id),
	// ... rest of fields
});

export const deviceTrialsRelations = relations(deviceTrials, ({ one }) => ({
	// TODO: Define relations
	// user: one(user, { fields: [...], references: [...] }),
	// apiKey: one(apiKeys, { fields: [...], references: [...] }),
}));

export type DeviceTrial = typeof deviceTrials.$inferSelect;
export type NewDeviceTrial = typeof deviceTrials.$inferInsert;
```

#### Implementation 2.2: API Route - Device Trial Creation

**File**: `apps/web/app/api/v1/device-trial/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database";
import { deviceTrials } from "@snapback/database/schema/snapback/device-trials";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/logs";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/device-trial
 *
 * Creates or retrieves device trial with API key for anonymous usage
 *
 * Request Body:
 * {
 *   deviceFingerprint: string,  // VSCode machineId hash
 *   source: "vscode" | "cli" | "mcp",
 *   metadata?: {
 *     vscodeVersion?: string,
 *     platform?: string,
 *     extensionVersion?: string
 *   }
 * }
 *
 * Response:
 * {
 *   apiKey: string,
 *   limits: {
 *     checkpoints: { used: number, limit: number, remaining: number },
 *     apiCalls: { used: number, limit: number, remaining: number }
 *   },
 *   trialStatus: "active" | "exhausted" | "converted"
 * }
 *
 * TODO:
 * - [ ] Parse and validate request body
 * - [ ] Check for existing device trial by fingerprint
 * - [ ] If exists:
 *   - [ ] Check if exhausted (trialExhaustedAt set)
 *   - [ ] Check if within 24h cooldown
 *   - [ ] Check if installCount > 3 (abuse)
 *   - [ ] Increment installCount
 *   - [ ] Return existing trial data
 * - [ ] If new device:
 *   - [ ] Generate API key via Better Auth apiKey plugin
 *   - [ ] Create device trial record in database
 *   - [ ] Set default limits (50 checkpoints, 10K API calls)
 *   - [ ] Track installation source
 * - [ ] Log event to PostHog
 * - [ ] Return API key and usage limits
 * - [ ] Handle errors gracefully
 */
export async function POST(request: NextRequest) {
	try {
		// TODO: Implement device trial creation logic

		return NextResponse.json(
			{
				apiKey: "sk_trial_...",
				limits: {
					checkpoints: { used: 0, limit: 50, remaining: 50 },
					apiCalls: { used: 0, limit: 10000, remaining: 10000 },
				},
				trialStatus: "active",
			},
			{ status: 201 }
		);
	} catch (error) {
		logger.error("Device trial creation failed", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.3: API Route - Checkpoint with Usage Tracking

**File**: `apps/web/app/api/v1/checkpoint/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database";
import { checkpoints } from "@snapback/database/schema/snapback/checkpoints";
import { deviceTrials } from "@snapback/database/schema/snapback/device-trials";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/logs";

/**
 * POST /api/v1/checkpoint
 *
 * Creates checkpoint and tracks usage against trial/user limits
 *
 * Headers:
 * Authorization: Bearer <api_key>
 *
 * Request Body:
 * {
 *   name?: string,
 *   description?: string,
 *   trigger: "manual" | "auto" | "pre_command" | "risk_detection",
 *   files: Array<{
 *     path: string,
 *     hash: string,
 *     sizeBytes: number,
 *     changeType?: "added" | "modified" | "deleted"
 *   }>,
 *   gitContext?: {
 *     branch: string,
 *     commit: string,
 *     dirty: boolean
 *   },
 *   projectPath: string,
 *   metadata?: Record<string, any>
 * }
 *
 * Response:
 * {
 *   checkpointId: string,
 *   usage: {
 *     checkpoints: { used: number, limit: number, remaining: number },
 *     apiCalls: { used: number, limit: number, remaining: number }
 *   },
 *   upgradePrompt?: {
 *     message: string,
 *     cta: string,
 *     ctaUrl: string
 *   }
 * }
 *
 * TODO:
 * - [ ] Validate API key via Better Auth
 * - [ ] Get user or device trial from API key
 * - [ ] Check checkpoint limits by tier:
 *   - Device trial (anonymous): 50 checkpoints
 *   - Email tier: 1000 checkpoints
 *   - Paid tier: unlimited
 * - [ ] If at limit:
 *   - [ ] Return 402 Payment Required
 *   - [ ] Include upgrade prompt
 * - [ ] If near limit (80%):
 *   - [ ] Include upgrade prompt in response
 * - [ ] Create checkpoint record:
 *   - [ ] Insert into checkpoints table
 *   - [ ] Insert file metadata into checkpoint_files
 *   - [ ] Upload to Supabase Storage if cloud backup enabled
 * - [ ] Increment usage counters:
 *   - [ ] device_trials.checkpointsUsed
 *   - [ ] device_trials.apiCallsUsed
 * - [ ] Set trialExhaustedAt if limit reached
 * - [ ] Log usage event to PostHog
 * - [ ] Return checkpoint ID and usage stats
 */
export async function POST(request: NextRequest) {
	try {
		// TODO: Implement checkpoint creation with usage tracking

		return NextResponse.json(
			{
				checkpointId: "ckpt_...",
				usage: {
					checkpoints: { used: 1, limit: 50, remaining: 49 },
					apiCalls: { used: 1, limit: 10000, remaining: 9999 },
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		logger.error("Checkpoint creation failed", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.4: API Route - Link Device to User

**File**: `apps/web/app/api/v1/auth/link-device/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database";
import { deviceTrials } from "@snapback/database/schema/snapback/device-trials";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/logs";
import { eq } from "drizzle-orm";
import posthog from "posthog-js";

/**
 * POST /api/v1/auth/link-device
 *
 * Links device trial to user account after email signup (Stage 1 → Stage 2)
 *
 * Headers:
 * Authorization: Bearer <session_token>
 *
 * Request Body:
 * {
 *   deviceFingerprint: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   limits: {
 *     checkpoints: { used: number, limit: 1000, remaining: number }
 *   },
 *   message: "Device linked successfully. Checkpoint limit increased to 1,000."
 * }
 *
 * TODO:
 * - [ ] Validate user session via Better Auth
 * - [ ] Extract userId from session
 * - [ ] Validate deviceFingerprint from request body
 * - [ ] Find device trial by fingerprint
 * - [ ] Check if already linked to a user
 *   - If yes: return 409 Conflict
 * - [ ] Update device trial:
 *   - [ ] Set userId
 *   - [ ] Set convertedAt timestamp
 *   - [ ] Set conversionTier = "free" (email tier)
 *   - [ ] Increase checkpointLimit to 1000
 *   - [ ] Increase apiCallLimit to 50000
 * - [ ] Merge analytics identities (PostHog):
 *   - [ ] Call posthog.alias() to link device → user
 *   - [ ] Track "device_linked" event
 * - [ ] Track conversion in analytics
 * - [ ] Return updated limits
 * - [ ] Handle errors gracefully
 */
export async function POST(request: NextRequest) {
	try {
		// TODO: Implement device-to-user linking logic

		return NextResponse.json(
			{
				success: true,
				limits: {
					checkpoints: { used: 45, limit: 1000, remaining: 955 },
				},
				message:
					"Device linked successfully. Checkpoint limit increased to 1,000.",
			},
			{ status: 200 }
		);
	} catch (error) {
		logger.error("Device linking failed", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.5: Stripe Webhook Handler

**File**: `apps/web/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database";
import { user } from "@snapback/database/schema/postgres";
import Stripe from "stripe";
import { logger } from "@snapback/logs";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: "2024-12-18.acacia",
});

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events
 *
 * Events Handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 *
 * TODO:
 * - [ ] Verify Stripe webhook signature
 * - [ ] Parse webhook event
 * - [ ] Handle customer.subscription.created:
 *   - [ ] Extract userId from metadata
 *   - [ ] Update user record:
 *     - Set paymentsCustomerId
 *     - Update tier based on price_id
 *   - [ ] Enable cloud backup permission
 *   - [ ] Send welcome email via @snapback/mail
 *   - [ ] Track "subscription_created" event (PostHog)
 * - [ ] Handle invoice.payment_succeeded:
 *   - [ ] Update subscription end date
 *   - [ ] Reset usage limits if new billing period
 *   - [ ] Track "payment_succeeded" event
 * - [ ] Handle customer.subscription.deleted:
 *   - [ ] Downgrade user tier to "free"
 *   - [ ] Set checkpoint limit to 1000 (preserve email tier)
 *   - [ ] Disable cloud backup
 *   - [ ] DO NOT delete local checkpoints
 *   - [ ] Send cancellation email
 *   - [ ] Track "subscription_cancelled" event
 * - [ ] Log all events to Pino
 * - [ ] Return 200 OK to Stripe
 * - [ ] Handle errors and return 400/500 appropriately
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const signature = request.headers.get("stripe-signature")!;

		// TODO: Verify signature
		const event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET!
		);

		// TODO: Handle different event types
		switch (event.type) {
			case "customer.subscription.created":
				// TODO: Implement subscription creation logic
				break;

			case "invoice.payment_succeeded":
				// TODO: Implement payment success logic
				break;

			case "customer.subscription.deleted":
				// TODO: Implement subscription cancellation logic
				break;

			default:
				logger.info("Unhandled Stripe event", { type: event.type });
		}

		return NextResponse.json({ received: true }, { status: 200 });
	} catch (error) {
		logger.error("Stripe webhook processing failed", { error });
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 400 }
		);
	}
}
```

### Phase 3: Services & Utilities

#### Service 3.1: Device Fingerprinting

**File**: `apps/vscode/src/services/device-fingerprint.ts`

```typescript
import * as vscode from "vscode";
import { createHash } from "crypto";

/**
 * Device Fingerprinting Service
 *
 * Generates unique device identifier for trial tracking
 *
 * TODO:
 * - [ ] Use vscode.env.machineId (persistent per machine)
 * - [ ] Use vscode.env.sessionId (changes on reinstall)
 * - [ ] Combine with extension version
 * - [ ] Hash fingerprint with SHA-256 for privacy
 * - [ ] Store fingerprint in extension global state
 * - [ ] Detect reinstalls by comparing sessionId changes
 * - [ ] Return consistent fingerprint for same device
 */

export class DeviceFingerprintService {
	/**
	 * Generate device fingerprint
	 *
	 * TODO:
	 * - [ ] Get machineId from vscode.env
	 * - [ ] Get sessionId from vscode.env
	 * - [ ] Get extension version from package.json
	 * - [ ] Combine: `${machineId}:${sessionId}:${version}`
	 * - [ ] Hash with SHA-256
	 * - [ ] Return hashed fingerprint
	 */
	async generateFingerprint(): Promise<string> {
		// TODO: Implement fingerprinting logic
		const machineId = vscode.env.machineId;
		const sessionId = vscode.env.sessionId;

		return "device_fingerprint_placeholder";
	}

	/**
	 * Detect if this is a reinstall
	 *
	 * TODO:
	 * - [ ] Read stored sessionId from global state
	 * - [ ] Compare with current sessionId
	 * - [ ] If different: This is a reinstall
	 * - [ ] Update stored sessionId
	 * - [ ] Return boolean
	 */
	async isReinstall(context: vscode.ExtensionContext): Promise<boolean> {
		// TODO: Implement reinstall detection
		return false;
	}
}
```

#### Service 3.2: Analytics Identity Manager

**File**: `packages/api/lib/analytics-identity.ts`

```typescript
import { PostHog } from "posthog-node";
import { logger } from "@snapback/logs";

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
	host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

/**
 * Analytics Identity Management (PostHog)
 *
 * Handles device → user identity merging for analytics continuity
 *
 * TODO:
 * - [ ] Track device-based events (anonymous stage)
 * - [ ] Track user-based events (authenticated stage)
 * - [ ] Merge identities when device links to user (alias)
 * - [ ] Preserve device context after merge
 * - [ ] Track conversion funnel events
 */

export class AnalyticsIdentity {
	/**
	 * Track event for anonymous device
	 *
	 * TODO:
	 * - [ ] Use deviceFingerprint as distinctId
	 * - [ ] Add device metadata to properties
	 * - [ ] Track event to PostHog
	 * - [ ] Handle errors gracefully
	 */
	async trackDeviceEvent(
		deviceFingerprint: string,
		event: string,
		properties: Record<string, any> = {}
	): Promise<void> {
		try {
			// TODO: Implement device event tracking
			posthog.capture({
				distinctId: `device_${deviceFingerprint}`,
				event,
				properties: {
					...properties,
					identityType: "device",
					isAnonymous: true,
				},
			});
		} catch (error) {
			logger.error("Device event tracking failed", { error, event });
		}
	}

	/**
	 * Track event for authenticated user
	 *
	 * TODO:
	 * - [ ] Use userId as distinctId
	 * - [ ] Include deviceFingerprint in properties
	 * - [ ] Track event to PostHog
	 * - [ ] Handle errors gracefully
	 */
	async trackUserEvent(
		userId: string,
		event: string,
		properties: Record<string, any> = {},
		deviceFingerprint?: string
	): Promise<void> {
		try {
			// TODO: Implement user event tracking
			posthog.capture({
				distinctId: userId,
				event,
				properties: {
					...properties,
					identityType: "user",
					isAnonymous: false,
					...(deviceFingerprint && { deviceFingerprint }),
				},
			});
		} catch (error) {
			logger.error("User event tracking failed", { error, event });
		}
	}

	/**
	 * Link device to user (merge identities)
	 *
	 * TODO:
	 * - [ ] Call PostHog alias() to merge device → user
	 * - [ ] Track "device_linked" conversion event
	 * - [ ] Preserve device event history
	 * - [ ] Handle errors gracefully
	 */
	async linkDeviceToUser(
		deviceFingerprint: string,
		userId: string
	): Promise<void> {
		try {
			// TODO: Implement identity merging
			posthog.alias({
				distinctId: userId,
				alias: `device_${deviceFingerprint}`,
			});

			// Track conversion event
			await this.trackUserEvent(userId, "device_linked", {
				deviceFingerprint,
				conversionStage: "email_signup",
			});
		} catch (error) {
			logger.error("Device linking failed", {
				error,
				deviceFingerprint,
				userId,
			});
		}
	}
}
```

#### Service 3.3: Trial Limit Enforcer

**File**: `packages/api/lib/trial-limits.ts`

```typescript
import { db } from "@snapback/database";
import { deviceTrials } from "@snapback/database/schema/snapback/device-trials";
import { user } from "@snapback/database/schema/postgres";
import { eq } from "drizzle-orm";

/**
 * Trial Limit Enforcement Service
 *
 * Checks and enforces usage limits based on user tier
 *
 * TODO:
 * - [ ] Check checkpoint limits by tier
 * - [ ] Check API call limits by tier
 * - [ ] Return remaining usage
 * - [ ] Trigger upgrade prompts at 80% usage
 * - [ ] Block requests at 100% usage
 * - [ ] Update trial status when exhausted
 */

export interface UsageLimits {
	checkpoints: {
		used: number;
		limit: number;
		remaining: number;
		percentage: number;
	};
	apiCalls: {
		used: number;
		limit: number;
		remaining: number;
		percentage: number;
	};
	shouldPromptUpgrade: boolean;
	isExhausted: boolean;
}

export class TrialLimitEnforcer {
	/**
	 * Check checkpoint limits for user or device
	 *
	 * TODO:
	 * - [ ] Determine if userId or deviceFingerprint
	 * - [ ] Get current usage from database
	 * - [ ] Get limits based on tier:
	 *   - Anonymous device: 50 checkpoints
	 *   - Email user: 1000 checkpoints
	 *   - Paid user: unlimited (999999)
	 * - [ ] Calculate remaining and percentage
	 * - [ ] Set shouldPromptUpgrade if > 80%
	 * - [ ] Set isExhausted if >= 100%
	 * - [ ] Return usage stats
	 */
	async checkLimits(
		userId?: string,
		deviceFingerprint?: string
	): Promise<UsageLimits> {
		// TODO: Implement limit checking logic

		return {
			checkpoints: {
				used: 0,
				limit: 50,
				remaining: 50,
				percentage: 0,
			},
			apiCalls: {
				used: 0,
				limit: 10000,
				remaining: 10000,
				percentage: 0,
			},
			shouldPromptUpgrade: false,
			isExhausted: false,
		};
	}

	/**
	 * Mark trial as exhausted
	 *
	 * TODO:
	 * - [ ] Update device_trials.trialExhaustedAt
	 * - [ ] Track "trial_exhausted" event (PostHog)
	 * - [ ] Send upgrade notification
	 */
	async markTrialExhausted(deviceFingerprint: string): Promise<void> {
		// TODO: Implement exhaustion marking
	}
}
```

### Phase 4: E2E Tests (Playwright)

#### E2E Test 4.1: Complete Monetization Funnel

**File**: `apps/web/tests/e2e/monetization-flow.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

/**
 * Complete Monetization Funnel E2E Test
 *
 * Flow:
 * 1. Install extension (simulated) → Device trial created
 * 2. Create checkpoints until anonymous limit (50)
 * 3. Sign up with email → Limit increased to 1000
 * 4. Create more checkpoints until email limit
 * 5. Upgrade to paid plan → Stripe checkout
 * 6. Verify unlimited access
 *
 * TODO:
 * - [ ] Set up test database with clean state
 * - [ ] Mock VSCode extension API calls
 * - [ ] Test Stage 1: Anonymous device trial
 * - [ ] Test Stage 2: Email signup and device linking
 * - [ ] Test Stage 3: Payment and unlimited access
 * - [ ] Verify analytics events tracked correctly
 * - [ ] Clean up test data
 */

test.describe("Monetization Funnel", () => {
	test("Complete journey: device → email → payment → unlimited", async ({
		page,
	}) => {
		// TODO: Implement complete funnel test
		// Stage 1: Anonymous trial
		// - Simulate extension install
		// - Create device trial via API
		// - Create 50 checkpoints
		// - Verify limit reached message
		// Stage 2: Email signup
		// - Navigate to signup page
		// - Fill email form
		// - Submit and verify account created
		// - Link device to user via API
		// - Verify limit increased to 1000
		// Stage 3: Payment
		// - Create 1000 checkpoints
		// - Verify payment required message
		// - Navigate to pricing page
		// - Click "Upgrade to Pro"
		// - Complete Stripe checkout (test mode)
		// - Verify webhook processed
		// - Verify unlimited access granted
	});

	test("Abuse prevention: Block after 3 reinstalls", async ({ page }) => {
		// TODO: Test reinstall abuse prevention
		// - Create device trial
		// - Exhaust trial
		// - Simulate 3 reinstalls
		// - Verify 4th reinstall blocked
	});

	test("Trial exhaustion and cooldown", async ({ page }) => {
		// TODO: Test 24h cooldown after exhaustion
		// - Create and exhaust device trial
		// - Attempt new trial immediately
		// - Verify 429 Too Many Requests
		// - Fast-forward 24h (mock time)
		// - Attempt new trial
		// - Verify allowed
	});
});
```

## Checklist

### Database Schema

-   [ ] Create `device_trials` table schema in Drizzle
-   [ ] Add relations to `user` and `apiKeys`
-   [ ] Create database migration
-   [ ] Run migration on development database
-   [ ] Write schema tests (Vitest)
-   [ ] Run tests and verify they pass

### API Routes

-   [ ] Write API route tests first (TDD Red)
-   [ ] Create placeholder route files with TODOs
-   [ ] Implement `/api/v1/device-trial` endpoint
-   [ ] Implement `/api/v1/checkpoint` with usage tracking
-   [ ] Implement `/api/v1/auth/link-device` endpoint
-   [ ] Implement `/api/webhooks/stripe` handler
-   [ ] Run tests and verify they pass (TDD Green)

### Services

-   [ ] Write service tests first (TDD Red)
-   [ ] Implement DeviceFingerprintService
-   [ ] Implement AnalyticsIdentity
-   [ ] Implement TrialLimitEnforcer
-   [ ] Run tests and verify they pass (TDD Green)

### VSCode Extension

-   [ ] Create device fingerprinting module
-   [ ] Implement auto-trial on activation
-   [ ] Add upgrade prompt UI
-   [ ] Test extension activation flow

### Pricing Page

-   [ ] Update pricing tiers (Free $0, Pro $19, Team $49/seat, Enterprise custom)
-   [ ] Add "Install VSCode Extension" primary CTA
-   [ ] Add open-source badges (GitHub stars)
-   [ ] Show API key value proposition
-   [ ] Test responsive design (Playwright)

### E2E Testing

-   [ ] Write complete funnel test (device → email → payment)
-   [ ] Write abuse prevention test
-   [ ] Write trial cooldown test
-   [ ] Run all E2E tests with Playwright

### Analytics

-   [ ] Configure PostHog events
-   [ ] Test device event tracking
-   [ ] Test user event tracking
-   [ ] Test identity merging (alias)
-   [ ] Verify funnel visualization in PostHog

### Deployment

-   [ ] Deploy database migrations to Supabase
-   [ ] Deploy API routes to Vercel
-   [ ] Configure Stripe webhook endpoint
-   [ ] Test webhook delivery
-   [ ] Deploy pricing page updates
-   [ ] Publish VSCode extension to marketplace

## Success Metrics

**Day 1 (Database + API)**:

-   [ ] Device trials table created and tested
-   [ ] API endpoints functional (all tests passing)
-   [ ] Usage tracking accurate
-   [ ] Analytics events firing correctly

**Day 2 (Extension + Integration)**:

-   [ ] VSCode extension creates device trials
-   [ ] Email signup links devices
-   [ ] Stripe checkout functional
-   [ ] Webhooks processing correctly

**Week 1 (Launch)**:

-   100+ extension installs
-   20+ email signups
-   5+ paid conversions
-   <2% error rate
-   <200ms API response time
-   Analytics funnel visualized

## Notes

-   **Supabase** hosts the PostgreSQL database + provides S3-compatible Storage
-   **Drizzle ORM** for all database queries (type-safe, no Prisma)
-   **Better Auth** for authentication (not Supabase Auth, not Clerk)
-   **Next.js 15** App Router with React 19
-   **TDD approach**: Red (write tests) → Green (implement) → Refactor
-   **Existing packages**: Leverage @snapback/payments, @snapback/storage, etc.
-   **Progressive auth**: 3 stages (anonymous → email → payment)
-   **Privacy-first**: Device fingerprinting is hashed, no PII collected anonymously
