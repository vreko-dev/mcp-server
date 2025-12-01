# SnapBack User Journey Tracking Architecture

**Document Version**: 1.0
**Date**: 2025-10-02
**Author**: System Architect

## Executive Summary

This document defines a comprehensive, scalable architecture for capturing, tracking, and acting upon 24+ user journeys across SnapBack's multi-platform ecosystem (VS Code, CLI, MCP, Web, future mobile). The architecture leverages existing infrastructure (PostHog, HubSpot) while introducing new components for journey detection, state management, and communication orchestration.

**Key Metrics Target**:

-   100+ communication touchpoints
-   Multi-platform event tracking (4+ platforms)
-   Real-time journey detection (<5s latency)
-   GDPR/privacy compliant
-   99.9% event delivery reliability

---

## 1. High-Level Architecture

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├──────────────┬──────────────┬──────────────┬─────────────────────────┤
│  VS Code Ext │   CLI Tool   │  Web App     │   Future Mobile         │
│  (existing)  │  (existing)  │  (Next.js)   │   (planned)             │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────────────────────┘
       │              │              │
       │ Event Stream │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EVENT INGESTION LAYER                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  API Gateway (HONO + oRPC)                                   │   │
│  │  - Rate limiting (existing)                                  │   │
│  │  - Authentication (Better Auth)                              │   │
│  │  - Event validation (Zod schemas)                            │   │
│  └──────────────────┬───────────────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  EVENT PROCESSING LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Event Router & Enricher                                   │     │
│  │  - Deduplicate events (Redis cache)                        │     │
│  │  - Enrich with user/subscription context                   │     │
│  │  - Sanitize PII (GDPR compliance)                          │     │
│  │  - Route to processors (parallel)                          │     │
│  └──┬───────────────┬─────────────────┬────────────────────────┘     │
│     │               │                 │                              │
│     ▼               ▼                 ▼                              │
│  ┌──────┐      ┌─────────┐      ┌──────────┐                        │
│  │PostHog│      │Database │      │Journey   │                        │
│  │Client│      │Writer   │      │Detector  │                        │
│  └──────┘      └─────────┘      └──────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  JOURNEY INTELLIGENCE LAYER                          │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Journey State Machine                                     │     │
│  │  - Detect current journey (24+ patterns)                   │     │
│  │  - Track state transitions                                 │     │
│  │  - Calculate progression metrics                           │     │
│  │  - Identify drop-off points                                │     │
│  └──────────────────────┬─────────────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  COMMUNICATION ORCHESTRATION LAYER                   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Communication Engine                                      │     │
│  │  - Trigger evaluation (100+ rules)                         │     │
│  │  - Frequency capping (anti-spam)                           │     │
│  │  - Channel selection (email/in-app/push)                   │     │
│  │  - A/B test assignment                                     │     │
│  └──┬──────────────────┬──────────────────┬───────────────────┘     │
└─────┼──────────────────┼──────────────────┼─────────────────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Email    │      │ In-App   │      │ HubSpot  │
│ Provider │      │ Messages │      │ CRM Sync │
│ (Resend) │      │ (Web/Ext)│      │ (Webhook)│
└──────────┘      └──────────┘      └──────────┘
```

### 1.2 Data Flow

**Event Capture → Processing → Intelligence → Action**

1. **Capture**: Clients emit events via API
2. **Process**: Dedupe, enrich, sanitize, persist
3. **Detect**: Journey state machine analyzes event stream
4. **Act**: Communication engine triggers appropriate touchpoints

---

## 2. Database Schema Design

### 2.1 Core Journey Tables

```typescript
// packages/database/drizzle/schema/snapback/user-journeys.ts

import {
	pgTable,
	text,
	timestamp,
	json,
	pgEnum,
	uniqueIndex,
	integer,
} from "drizzle-orm/pg-core";
import { createId as cuid } from "@paralleldrive/cuid2";
import { user, organization } from "../postgres";

// User lifecycle state enum
export const userStateEnum = pgEnum("user_state", [
	"visitor", // Not signed up
	"anonymous_user", // Signed up, not authenticated in extension
	"free_user", // Authenticated, using free tier
	"trial_user", // Active trial period
	"paid_user", // Active paid subscription
	"churned_user", // Cancelled, still in grace period
	"dormant_user", // Past grace period, no activity
	"reactivated_user", // Returned after churn
]);

// Journey type enum (24 journeys)
export const journeyTypeEnum = pgEnum("journey_type", [
	// Core Product Journeys
	"first_checkpoint_creation",
	"checkpoint_limit_awareness",
	"checkpoint_limit_hit",
	"first_recovery_success",
	"multi_recovery_pattern",

	// Conversion Journeys
	"free_to_trial_activation",
	"trial_to_paid_conversion",
	"trial_abandonment_recovery",
	"direct_purchase_no_trial",

	// Upgrade & Expansion
	"solo_to_team_upgrade",
	"team_seat_expansion",
	"feature_discovery_upgrade",
	"cloud_backup_adoption",

	// Engagement & Retention
	"daily_active_engagement",
	"power_user_emergence",
	"feature_exploration",
	"community_participation",

	// Churn Prevention & Recovery
	"usage_decline_intervention",
	"trial_ending_urgency",
	"payment_failure_recovery",
	"cancellation_feedback_flow",
	"win_back_dormant_user",

	// Advocacy & Growth
	"referral_activation",
	"review_request_qualified",
	"case_study_recruitment",
]);

// User journey state tracking
export const userJourneyStates = pgTable(
	"user_journey_states",
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

		// Current state
		currentState: userStateEnum("current_state")
			.notNull()
			.default("visitor"),
		previousState: userStateEnum("previous_state"),
		stateEnteredAt: timestamp("state_entered_at").notNull().defaultNow(),

		// Active journeys (user can be on multiple journeys simultaneously)
		activeJourneys: json("active_journeys")
			.$type<
				{
					journeyType: string;
					startedAt: string;
					currentStep: string;
					completionPercentage: number;
					metadata: Record<string, unknown>;
				}[]
			>()
			.default([]),

		// Journey completion history
		completedJourneys: json("completed_journeys")
			.$type<
				{
					journeyType: string;
					completedAt: string;
					outcome: "success" | "abandoned" | "converted";
					metadata: Record<string, unknown>;
				}[]
			>()
			.default([]),

		// Metadata
		lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [uniqueIndex("user_journey_states_user_idx").on(table.userId)]
);

// Event stream for journey detection
export const journeyEvents = pgTable(
	"journey_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Event identification
		eventName: text("event_name").notNull(),
		eventCategory: text("event_category").notNull(), // "lifecycle", "feature_usage", "conversion", "engagement"

		// Event context
		properties: json("properties")
			.$type<Record<string, unknown>>()
			.default({}),
		platform: text("platform").notNull(), // "vscode", "cli", "web", "mcp", "mobile"
		clientVersion: text("client_version"),

		// Journey association
		associatedJourneys: json("associated_journeys")
			.$type<string[]>()
			.default([]),
		journeyImpact: json("journey_impact")
			.$type<
				{
					journeyType: string;
					action:
						| "started"
						| "progressed"
						| "completed"
						| "abandoned";
					stepName?: string;
				}[]
			>()
			.default([]),

		// Metadata
		sessionId: text("session_id"),
		timestamp: timestamp("timestamp").notNull().defaultNow(),

		// PostHog sync
		posthogEventId: text("posthog_event_id"),
		posthogSyncedAt: timestamp("posthog_synced_at"),
	},
	(table) => [
		uniqueIndex("journey_events_user_idx").on(table.userId),
		uniqueIndex("journey_events_timestamp_idx").on(table.timestamp),
		uniqueIndex("journey_events_event_name_idx").on(table.eventName),
	]
);

// Communication touchpoint history
export const communicationTouchpoints = pgTable(
	"communication_touchpoints",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Touchpoint details
		touchpointType: text("touchpoint_type").notNull(), // "email", "in_app_message", "push_notification", "hubspot_sequence"
		touchpointName: text("touchpoint_name").notNull(), // Descriptive name
		journeyType: journeyTypeEnum("journey_type"),

		// Content
		subject: text("subject"),
		content: text("content"),
		ctaUrl: text("cta_url"),

		// Delivery tracking
		status: text("status").notNull().default("pending"), // "pending", "sent", "delivered", "opened", "clicked", "bounced", "unsubscribed"
		sentAt: timestamp("sent_at"),
		deliveredAt: timestamp("delivered_at"),
		openedAt: timestamp("opened_at"),
		clickedAt: timestamp("clicked_at"),

		// A/B testing
		variant: text("variant"), // "A", "B", "control"
		experimentId: text("experiment_id"),

		// External IDs
		emailProvider: text("email_provider"), // "resend", "postmark", etc.
		emailProviderId: text("email_provider_id"),
		hubspotEmailId: text("hubspot_email_id"),

		// Metadata
		metadata: json("metadata").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("communication_touchpoints_user_idx").on(table.userId),
		uniqueIndex("communication_touchpoints_created_idx").on(
			table.createdAt
		),
	]
);

// Communication frequency tracking (anti-spam)
export const communicationFrequency = pgTable(
	"communication_frequency",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Frequency limits
		emailsSentToday: integer("emails_sent_today").notNull().default(0),
		emailsSentThisWeek: integer("emails_sent_this_week")
			.notNull()
			.default(0),
		inAppMessagesToday: integer("in_app_messages_today")
			.notNull()
			.default(0),

		// Last sent timestamps
		lastEmailSentAt: timestamp("last_email_sent_at"),
		lastInAppMessageAt: timestamp("last_in_app_message_at"),
		lastPushNotificationAt: timestamp("last_push_notification_at"),

		// User preferences
		emailOptOut: timestamp("email_opt_out"),
		inAppOptOut: timestamp("in_app_opt_out"),
		pushOptOut: timestamp("push_opt_out"),

		// Reset tracking
		dailyResetAt: timestamp("daily_reset_at").notNull().defaultNow(),
		weeklyResetAt: timestamp("weekly_reset_at").notNull().defaultNow(),

		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("communication_frequency_user_idx").on(table.userId),
	]
);

// Journey trigger rules configuration
export const journeyTriggerRules = pgTable("journey_trigger_rules", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => cuid()),

	// Rule identification
	ruleName: text("rule_name").notNull().unique(),
	journeyType: journeyTypeEnum("journey_type").notNull(),

	// Trigger conditions (evaluated against event stream)
	triggerConditions: json("trigger_conditions")
		.$type<{
			eventName?: string;
			eventCategory?: string;
			userState?: string[];
			timeWindow?: { value: number; unit: "minutes" | "hours" | "days" };
			eventCount?: { min?: number; max?: number };
			customLogic?: string; // JavaScript expression
		}>()
		.notNull(),

	// Communication touchpoints to trigger
	touchpoints: json("touchpoints")
		.$type<
			{
				touchpointType: string;
				touchpointName: string;
				delay?: { value: number; unit: "minutes" | "hours" | "days" };
				condition?: string; // Additional condition to evaluate
			}[]
		>()
		.default([]),

	// Priority and execution
	priority: integer("priority").notNull().default(0), // Higher = more important
	enabled: timestamp("enabled"), // null = disabled

	// Metadata
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### 2.2 Integration with Existing Schema

The journey tracking tables integrate with existing tables:

-   **`user`**: Primary relationship for all journey tracking
-   **`organization`**: Team-level journey tracking
-   **`subscriptions`**: Current plan/state for journey detection
-   **`apiKeys`**: Platform attribution (which client triggered event)
-   **`apiUsage`**: Feature usage signals for journey progression
-   **`extensionSessions`**: VS Code engagement patterns

---

## 3. Event Taxonomy & Naming Conventions

### 3.1 Event Naming Standard

**Format**: `{platform}.{category}.{action}.{object}`

**Examples**:

-   `vscode.checkpoint.created.success`
-   `web.subscription.upgraded.solo_to_team`
-   `cli.recovery.executed.files_restored`
-   `extension.feature.discovered.cloud_backup`

### 3.2 Event Categories

```typescript
// packages/api/lib/analytics/event-taxonomy.ts

export const EventCategories = {
	// Lifecycle events (account/subscription state changes)
	LIFECYCLE: "lifecycle",

	// Feature usage (product interactions)
	FEATURE_USAGE: "feature_usage",

	// Conversion events (free→trial→paid)
	CONVERSION: "conversion",

	// Engagement (activity, session, interaction)
	ENGAGEMENT: "engagement",

	// Errors & issues
	ERROR: "error",

	// System events (background processes)
	SYSTEM: "system",
} as const;

export const JourneyEvents = {
	// Checkpoint Events (Core Product)
	CHECKPOINT_CREATED: "checkpoint.created",
	CHECKPOINT_RECOVERED: "checkpoint.recovered",
	CHECKPOINT_LIMIT_WARNING: "checkpoint.limit.warning",
	CHECKPOINT_LIMIT_HIT: "checkpoint.limit.hit",
	CHECKPOINT_CLOUD_BACKUP_SUCCESS: "checkpoint.cloud_backup.success",

	// Subscription Events (Conversion)
	TRIAL_STARTED: "subscription.trial.started",
	TRIAL_ENDING_7D: "subscription.trial.ending.7d",
	TRIAL_ENDING_3D: "subscription.trial.ending.3d",
	TRIAL_ENDING_1D: "subscription.trial.ending.1d",
	TRIAL_CONVERTED: "subscription.trial.converted",
	TRIAL_EXPIRED: "subscription.trial.expired",

	SUBSCRIPTION_CREATED: "subscription.created",
	SUBSCRIPTION_UPGRADED: "subscription.upgraded",
	SUBSCRIPTION_DOWNGRADED: "subscription.downgraded",
	SUBSCRIPTION_CANCELLED: "subscription.cancelled",
	SUBSCRIPTION_RENEWED: "subscription.renewed",

	PAYMENT_SUCCEEDED: "payment.succeeded",
	PAYMENT_FAILED: "payment.failed",

	// Engagement Events
	SESSION_STARTED: "session.started",
	SESSION_ENDED: "session.ended",
	DAILY_ACTIVE: "engagement.daily_active",
	FEATURE_DISCOVERED: "feature.discovered",
	SETTINGS_CHANGED: "settings.changed",

	// Team Events (Solo→Team conversion)
	TEAM_MEMBER_INVITED: "team.member.invited",
	TEAM_MEMBER_JOINED: "team.member.joined",
	TEAM_SEAT_ADDED: "team.seat.added",

	// Churn Signals
	USAGE_DECLINED: "engagement.usage.declined",
	LAST_ACTIVITY_30D: "engagement.dormant.30d",
	CANCELLATION_SURVEY_COMPLETED: "subscription.cancellation.survey",

	// Win-back
	WINBACK_EMAIL_SENT: "communication.winback.sent",
	WINBACK_EMAIL_CLICKED: "communication.winback.clicked",
	REACTIVATION_SUCCESS: "subscription.reactivated",

	// Advocacy
	REFERRAL_LINK_SHARED: "referral.link.shared",
	REFERRAL_SIGNUP: "referral.signup",
	REVIEW_REQUESTED: "advocacy.review.requested",
	REVIEW_SUBMITTED: "advocacy.review.submitted",

	// Error/Support
	ERROR_OCCURRED: "error.occurred",
	SUPPORT_TICKET_CREATED: "support.ticket.created",
	FEATURE_REQUEST_SUBMITTED: "feedback.feature_request",
} as const;

// Event property schemas (for validation)
export const EventPropertySchemas = {
	[JourneyEvents.CHECKPOINT_CREATED]: z.object({
		checkpointId: z.string(),
		filesProtected: z.number(),
		triggerSource: z.enum(["auto", "manual", "ai_detection"]),
		aiTool: z.string().optional(),
	}),

	[JourneyEvents.SUBSCRIPTION_UPGRADED]: z.object({
		fromPlan: z.enum(["free", "solo", "team"]),
		toPlan: z.enum(["solo", "team", "enterprise"]),
		billingInterval: z.enum(["month", "year"]),
		mrr: z.number(),
	}),

	// ... define schema for all events
} as const;
```

### 3.3 Platform Identifiers

```typescript
export const Platforms = {
	VSCODE: "vscode",
	CLI: "cli",
	WEB: "web",
	MCP: "mcp",
	MOBILE: "mobile", // future
	API: "api", // server-side events
} as const;
```

---

## 4. Integration Architecture

### 4.1 PostHog Integration Pattern

**Purpose**: Analytics warehouse, funnel analysis, experimentation

```typescript
// packages/api/lib/analytics/posthog-client.ts

import { PostHog } from "posthog-node";

class PostHogService {
	private client: PostHog;

	constructor() {
		this.client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
			host:
				process.env.NEXT_PUBLIC_POSTHOG_HOST ||
				"https://app.posthog.com",
			flushAt: 20, // Batch events
			flushInterval: 10000, // Flush every 10s
		});
	}

	async captureEvent(params: {
		userId: string;
		event: string;
		properties?: Record<string, unknown>;
		journeyContext?: {
			currentState: string;
			activeJourneys: string[];
			journeyProgression?: Record<string, number>;
		};
	}) {
		const { userId, event, properties, journeyContext } = params;

		// Enrich with journey context
		const enrichedProperties = {
			...properties,
			// Journey metadata
			user_state: journeyContext?.currentState,
			active_journeys: journeyContext?.activeJourneys,
			journey_progression: journeyContext?.journeyProgression,
			// Timestamp
			timestamp: new Date().toISOString(),
		};

		this.client.capture({
			distinctId: userId,
			event,
			properties: enrichedProperties,
		});
	}

	async identify(userId: string, properties: Record<string, unknown>) {
		this.client.identify({
			distinctId: userId,
			properties,
		});
	}

	async setPersonProperties(
		userId: string,
		properties: Record<string, unknown>
	) {
		this.client.identify({
			distinctId: userId,
			properties: {
				$set: properties,
			},
		});
	}

	async shutdown() {
		await this.client.shutdownAsync();
	}
}

export const posthog = new PostHogService();
```

### 4.2 HubSpot CRM Integration

**Purpose**: Marketing automation, email sequences, lead scoring

```typescript
// packages/api/lib/crm/hubspot-sync.ts

import { Client as HubSpotClient } from "@hubspot/api-client";

class HubSpotService {
	private client: HubSpotClient;

	constructor() {
		this.client = new HubSpotClient({
			accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
		});
	}

	/**
	 * Sync user journey state to HubSpot contact properties
	 */
	async syncJourneyState(params: {
		userId: string;
		email: string;
		journeyState: {
			currentState: string;
			activeJourneys: string[];
			lastActivityAt: string;
			trialEndsAt?: string;
			plan?: string;
		};
	}) {
		const { email, journeyState } = params;

		try {
			// Create or update contact
			await this.client.crm.contacts.basicApi.create({
				properties: {
					email,
					snapback_user_state: journeyState.currentState,
					snapback_active_journeys:
						journeyState.activeJourneys.join(","),
					snapback_last_activity: journeyState.lastActivityAt,
					snapback_trial_ends: journeyState.trialEndsAt || "",
					snapback_plan: journeyState.plan || "free",
				},
			});
		} catch (error: any) {
			// If contact exists, update instead
			if (error.statusCode === 409) {
				const contactId =
					error.body.message.match(/contact: (\d+)/)?.[1];
				if (contactId) {
					await this.client.crm.contacts.basicApi.update(contactId, {
						properties: {
							snapback_user_state: journeyState.currentState,
							snapback_active_journeys:
								journeyState.activeJourneys.join(","),
							snapback_last_activity: journeyState.lastActivityAt,
							snapback_trial_ends: journeyState.trialEndsAt || "",
							snapback_plan: journeyState.plan || "free",
						},
					});
				}
			} else {
				throw error;
			}
		}
	}

	/**
	 * Trigger HubSpot workflow/sequence based on journey event
	 */
	async triggerWorkflow(params: {
		email: string;
		workflowId: string;
		properties?: Record<string, string>;
	}) {
		const { email, workflowId, properties } = params;

		// Enroll contact in workflow
		await this.client.automation.workflows.enrollmentsApi.enroll(
			workflowId,
			{ email, ...properties }
		);
	}

	/**
	 * Track custom timeline event in HubSpot
	 */
	async trackEvent(params: {
		email: string;
		eventName: string;
		properties?: Record<string, unknown>;
	}) {
		const { email, eventName, properties } = params;

		// Create custom behavioral event
		await this.client.events.eventsApi.create({
			eventName,
			email,
			properties,
			occurredAt: new Date().toISOString(),
		});
	}
}

export const hubspot = new HubSpotService();
```

### 4.3 Event Deduplication Strategy

**Challenge**: Prevent duplicate events from retry logic, client reconnections

**Solution**: Redis-based deduplication with idempotency keys

```typescript
// packages/api/lib/events/deduplication.ts

import { redis } from "../redis-client";

const DEDUPE_TTL = 3600; // 1 hour

export async function deduplicateEvent(params: {
	userId: string;
	eventName: string;
	properties: Record<string, unknown>;
	timestamp: Date;
}): Promise<boolean> {
	const { userId, eventName, properties, timestamp } = params;

	// Generate deterministic idempotency key
	const idempotencyKey = generateIdempotencyKey({
		userId,
		eventName,
		properties,
		timestamp,
	});

	// Check if event was already processed
	const exists = await redis.get(`event:dedupe:${idempotencyKey}`);

	if (exists) {
		return false; // Duplicate, skip processing
	}

	// Mark event as processed
	await redis.setex(`event:dedupe:${idempotencyKey}`, DEDUPE_TTL, "1");

	return true; // New event, proceed with processing
}

function generateIdempotencyKey(params: {
	userId: string;
	eventName: string;
	properties: Record<string, unknown>;
	timestamp: Date;
}): string {
	const { userId, eventName, properties, timestamp } = params;

	// Round timestamp to 10-second window to handle minor delays
	const roundedTimestamp = Math.floor(timestamp.getTime() / 10000) * 10000;

	// Create stable property hash (sorted keys)
	const propertyHash = hashObject(properties);

	return `${userId}:${eventName}:${propertyHash}:${roundedTimestamp}`;
}

function hashObject(obj: Record<string, unknown>): string {
	// Sort keys and create stable hash
	const sortedKeys = Object.keys(obj).sort();
	const stableString = sortedKeys
		.map((k) => `${k}=${JSON.stringify(obj[k])}`)
		.join("|");

	// Simple hash (use crypto.createHash in production)
	let hash = 0;
	for (let i = 0; i < stableString.length; i++) {
		hash = (hash << 5) - hash + stableString.charCodeAt(i);
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash.toString(36);
}
```

---

## 5. Journey Detection Engine

### 5.1 State Machine Design

```typescript
// packages/api/lib/journeys/state-machine.ts

import { EventEmitter } from "events";

export type UserState =
	| "visitor"
	| "anonymous_user"
	| "free_user"
	| "trial_user"
	| "paid_user"
	| "churned_user"
	| "dormant_user"
	| "reactivated_user";

export type StateTransition = {
	from: UserState;
	to: UserState;
	trigger: string; // Event name that triggers transition
	condition?: (context: UserContext) => boolean;
};

export type UserContext = {
	userId: string;
	currentState: UserState;
	email: string;
	signupDate: Date;
	subscriptionId?: string;
	plan?: string;
	trialEndsAt?: Date;
	lastActivityAt: Date;
	checkpointsCreated: number;
	metadata: Record<string, unknown>;
};

// Define state transitions
const STATE_TRANSITIONS: StateTransition[] = [
	// Visitor → Anonymous User
	{
		from: "visitor",
		to: "anonymous_user",
		trigger: "user.signed_up",
	},

	// Anonymous → Free (authenticated in extension)
	{
		from: "anonymous_user",
		to: "free_user",
		trigger: "extension.authenticated",
	},

	// Free → Trial
	{
		from: "free_user",
		to: "trial_user",
		trigger: "subscription.trial.started",
	},

	// Trial → Paid (conversion)
	{
		from: "trial_user",
		to: "paid_user",
		trigger: "subscription.trial.converted",
	},

	// Trial → Free (trial expired without conversion)
	{
		from: "trial_user",
		to: "free_user",
		trigger: "subscription.trial.expired",
	},

	// Free → Paid (direct purchase, no trial)
	{
		from: "free_user",
		to: "paid_user",
		trigger: "subscription.created",
		condition: (ctx) => !ctx.metadata.hadTrial,
	},

	// Paid → Churned (cancelled but still in grace period)
	{
		from: "paid_user",
		to: "churned_user",
		trigger: "subscription.cancelled",
	},

	// Churned → Dormant (grace period ended)
	{
		from: "churned_user",
		to: "dormant_user",
		trigger: "subscription.expired",
	},

	// Dormant → Reactivated (came back!)
	{
		from: "dormant_user",
		to: "reactivated_user",
		trigger: "subscription.reactivated",
	},

	// Free → Dormant (inactive for 90+ days)
	{
		from: "free_user",
		to: "dormant_user",
		trigger: "engagement.dormant.90d",
	},
];

export class JourneyStateMachine extends EventEmitter {
	private context: UserContext;

	constructor(context: UserContext) {
		super();
		this.context = context;
	}

	/**
	 * Process event and potentially transition state
	 */
	async processEvent(event: {
		name: string;
		properties: Record<string, unknown>;
		timestamp: Date;
	}): Promise<{
		stateChanged: boolean;
		previousState?: UserState;
		newState?: UserState;
		triggeredJourneys: string[];
	}> {
		const { name: eventName, properties, timestamp } = event;

		// Find applicable state transition
		const transition = STATE_TRANSITIONS.find(
			(t) =>
				t.from === this.context.currentState &&
				t.trigger === eventName &&
				(!t.condition || t.condition(this.context))
		);

		let stateChanged = false;
		let previousState: UserState | undefined;
		let newState: UserState | undefined;

		if (transition) {
			// Execute state transition
			previousState = this.context.currentState;
			newState = transition.to;

			this.context.currentState = newState;
			stateChanged = true;

			// Emit state change event
			this.emit("stateChanged", {
				userId: this.context.userId,
				previousState,
				newState,
				timestamp,
			});
		}

		// Detect journeys triggered by this event
		const triggeredJourneys = await this.detectJourneys(event);

		return {
			stateChanged,
			previousState,
			newState,
			triggeredJourneys,
		};
	}

	/**
	 * Detect which journeys are triggered/progressed by event
	 */
	private async detectJourneys(event: {
		name: string;
		properties: Record<string, unknown>;
	}): Promise<string[]> {
		const { name: eventName, properties } = event;
		const triggered: string[] = [];

		// Journey detection logic (match event to journey patterns)
		const journeyPatterns: Record<
			string,
			(event: any, context: UserContext) => boolean
		> = {
			first_checkpoint_creation: (e, ctx) =>
				e.name === "checkpoint.created" && ctx.checkpointsCreated === 0,

			checkpoint_limit_hit: (e) => e.name === "checkpoint.limit.hit",

			free_to_trial_activation: (e, ctx) =>
				e.name === "subscription.trial.started" &&
				ctx.currentState === "free_user",

			trial_to_paid_conversion: (e, ctx) =>
				e.name === "subscription.trial.converted",

			solo_to_team_upgrade: (e) =>
				e.name === "subscription.upgraded" &&
				e.properties.fromPlan === "solo" &&
				e.properties.toPlan === "team",

			usage_decline_intervention: (e) =>
				e.name === "engagement.usage.declined",

			// ... define all 24 journey patterns
		};

		// Check each pattern
		for (const [journeyType, matcher] of Object.entries(journeyPatterns)) {
			if (matcher(event, this.context)) {
				triggered.push(journeyType);
			}
		}

		return triggered;
	}

	/**
	 * Get current journey progression for all active journeys
	 */
	getJourneyProgression(): Record<string, number> {
		// Calculate completion percentage for each active journey
		// This would be implemented based on journey step definitions
		return {};
	}
}
```

### 5.2 Real-time vs Batch Processing

**Architecture Decision**: Hybrid approach

**Real-time Processing** (via API during event ingestion):

-   State transitions
-   High-priority journey detection (e.g., limit hit → immediate upsell message)
-   Immediate communication triggers (in-app messages)

**Batch Processing** (via scheduled jobs):

-   Journey progression calculation
-   Cohort analysis
-   PostHog/HubSpot sync
-   Communication scheduling (emails)
-   Analytics aggregation

```typescript
// Scheduled jobs (using cron or queue system)

// Every 5 minutes: Process pending communications
async function processPendingCommunications() {
	// Fetch scheduled touchpoints from database
	// Evaluate delivery conditions
	// Send via appropriate channel
	// Update delivery status
}

// Every hour: Sync journey states to HubSpot
async function syncJourneyStatesToHubSpot() {
	// Fetch users with state changes in last hour
	// Batch sync to HubSpot
}

// Daily: Detect dormancy patterns
async function detectDormantUsers() {
	// Query users with no activity in 30/60/90 days
	// Trigger dormancy journeys
}
```

---

## 6. Communication Engine

### 6.1 Trigger Evaluation System

```typescript
// packages/api/lib/communications/trigger-evaluator.ts

import { db } from "@repo/database";
import {
	journeyTriggerRules,
	communicationFrequency,
	userJourneyStates,
} from "@repo/database/drizzle/schema";
import { eq, and, isNull, lte } from "drizzle-orm";

export class TriggerEvaluator {
	/**
	 * Evaluate all applicable trigger rules for a journey event
	 */
	async evaluateTriggers(params: {
		userId: string;
		event: {
			name: string;
			category: string;
			properties: Record<string, unknown>;
			timestamp: Date;
		};
		userState: string;
		activeJourneys: string[];
	}): Promise<{
		triggeredTouchpoints: Array<{
			touchpointType: string;
			touchpointName: string;
			delay?: { value: number; unit: string };
			metadata: Record<string, unknown>;
		}>;
	}> {
		const { userId, event, userState, activeJourneys } = params;

		// Fetch enabled trigger rules
		const rules = await db
			.select()
			.from(journeyTriggerRules)
			.where(and(isNull(journeyTriggerRules.enabled)))
			.orderBy(journeyTriggerRules.priority);

		const triggeredTouchpoints: any[] = [];

		for (const rule of rules) {
			// Check if rule conditions match
			const matches = this.evaluateRuleConditions({
				rule,
				event,
				userState,
				activeJourneys,
			});

			if (!matches) continue;

			// Check communication frequency limits
			const canSend = await this.checkFrequencyLimits(
				userId,
				rule.touchpoints
			);

			if (!canSend) continue;

			// Add touchpoints to triggered list
			for (const touchpoint of rule.touchpoints) {
				// Evaluate touchpoint-specific conditions
				if (touchpoint.condition) {
					const conditionMet = this.evaluateCondition(
						touchpoint.condition,
						{
							event,
							userState,
							activeJourneys,
						}
					);

					if (!conditionMet) continue;
				}

				triggeredTouchpoints.push({
					touchpointType: touchpoint.touchpointType,
					touchpointName: touchpoint.touchpointName,
					delay: touchpoint.delay,
					metadata: {
						ruleId: rule.id,
						ruleName: rule.ruleName,
						journeyType: rule.journeyType,
					},
				});
			}
		}

		return { triggeredTouchpoints };
	}

	/**
	 * Evaluate rule conditions against event/user context
	 */
	private evaluateRuleConditions(params: {
		rule: any;
		event: any;
		userState: string;
		activeJourneys: string[];
	}): boolean {
		const { rule, event, userState, activeJourneys } = params;
		const conditions = rule.triggerConditions;

		// Event name match
		if (conditions.eventName && conditions.eventName !== event.name) {
			return false;
		}

		// Event category match
		if (
			conditions.eventCategory &&
			conditions.eventCategory !== event.category
		) {
			return false;
		}

		// User state match
		if (conditions.userState && !conditions.userState.includes(userState)) {
			return false;
		}

		// Custom logic evaluation (JavaScript expression)
		if (conditions.customLogic) {
			try {
				const result = eval(conditions.customLogic);
				if (!result) return false;
			} catch (error) {
				console.error("Error evaluating custom logic:", error);
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if user hasn't exceeded communication frequency limits
	 */
	private async checkFrequencyLimits(
		userId: string,
		touchpoints: any[]
	): Promise<boolean> {
		const frequency = await db
			.select()
			.from(communicationFrequency)
			.where(eq(communicationFrequency.userId, userId))
			.limit(1);

		if (!frequency.length) return true; // No limits set

		const limits = frequency[0];

		// Check email limits
		const hasEmail = touchpoints.some((t) => t.touchpointType === "email");
		if (hasEmail) {
			if (limits.emailOptOut) return false; // User opted out
			if (limits.emailsSentToday >= 3) return false; // Daily limit
			if (limits.emailsSentThisWeek >= 10) return false; // Weekly limit
		}

		// Check in-app message limits
		const hasInApp = touchpoints.some(
			(t) => t.touchpointType === "in_app_message"
		);
		if (hasInApp) {
			if (limits.inAppOptOut) return false;
			if (limits.inAppMessagesToday >= 5) return false;
		}

		return true;
	}

	/**
	 * Evaluate JavaScript condition expression
	 */
	private evaluateCondition(
		condition: string,
		context: Record<string, any>
	): boolean {
		try {
			// Create safe evaluation context
			const func = new Function(
				...Object.keys(context),
				`return ${condition}`
			);
			return func(...Object.values(context));
		} catch (error) {
			console.error("Error evaluating condition:", error);
			return false;
		}
	}
}
```

### 6.2 Anti-Spam & Frequency Capping

**Rules**:

-   Max 3 emails/day per user
-   Max 10 emails/week per user
-   Max 5 in-app messages/day
-   Min 2-hour gap between emails from same journey
-   Respect user opt-out preferences

**Implementation**: See `communicationFrequency` table and `checkFrequencyLimits` above

---

## 7. Recommended Technology Stack

### 7.1 Build vs Buy Analysis

| Component                    | Build Custom               | Use Library/Service     | Recommendation                |
| ---------------------------- | -------------------------- | ----------------------- | ----------------------------- |
| **Event ingestion**          | High control, existing API | Segment, RudderStack    | **Build** (already have API)  |
| **Event deduplication**      | Simple with Redis          | N/A                     | **Build** (lightweight)       |
| **Journey state machine**    | Full customization         | Customer.io, Intercom   | **Build** (unique to product) |
| **PostHog integration**      | N/A                        | posthog-node (existing) | **Use** (already integrated)  |
| **HubSpot CRM sync**         | N/A                        | @hubspot/api-client     | **Use** (official SDK)        |
| **Email delivery**           | N/A                        | Resend (existing)       | **Use** (already setup)       |
| **Communication scheduling** | Simple queue               | BullMQ, Agenda          | **Use BullMQ** (robust)       |
| **A/B testing**              | N/A                        | PostHog experiments     | **Use** (built into PostHog)  |

**Verdict**: Build journey detection & state management (core IP), use existing integrations for delivery

### 7.2 New Dependencies Required

```json
// packages/api/package.json additions
{
	"dependencies": {
		"bullmq": "^5.0.0", // Job queue for communication scheduling
		"ioredis": "^5.3.2" // Redis client for BullMQ (faster than 'redis')
	}
}
```

**Existing dependencies (no changes needed)**:

-   `posthog-node`: Already installed
-   `@hubspot/api-client`: Already installed
-   `redis`: Already installed (for deduplication)

---

## 8. Scalability & Performance Considerations

### 8.1 Event Volume Projections

**Assumptions**:

-   10,000 active users
-   50 events/user/day average
-   = 500,000 events/day
-   = 350 events/minute
-   = 6 events/second (average)

**Peak load** (3x average): 18 events/second

**Database writes**:

-   `journeyEvents` table: 6 inserts/sec
-   `userJourneyStates` table: 1 update/sec (state changes less frequent)
-   `communicationTouchpoints` table: 0.5 inserts/sec

**Scalability strategy**:

-   PostgreSQL can handle 10,000+ writes/sec → No immediate bottleneck
-   Use connection pooling (Drizzle default)
-   Consider read replicas when >100K users

### 8.2 Indexing Strategy

```sql
-- Critical indexes for performance

-- Journey events queries (frequent)
CREATE INDEX idx_journey_events_user_timestamp
  ON journey_events(user_id, timestamp DESC);

CREATE INDEX idx_journey_events_event_name
  ON journey_events(event_name, timestamp DESC);

-- User journey state lookups
CREATE INDEX idx_user_journey_states_state
  ON user_journey_states(current_state);

CREATE INDEX idx_user_journey_states_activity
  ON user_journey_states(last_activity_at DESC);

-- Communication touchpoint queries
CREATE INDEX idx_comm_touchpoints_user_created
  ON communication_touchpoints(user_id, created_at DESC);

CREATE INDEX idx_comm_touchpoints_status
  ON communication_touchpoints(status, sent_at);

-- Trigger rules (small table, but frequently queried)
CREATE INDEX idx_trigger_rules_enabled
  ON journey_trigger_rules(enabled, priority DESC)
  WHERE enabled IS NOT NULL;
```

### 8.3 Caching Strategy

```typescript
// Cache frequently accessed data in Redis

// Cache user journey state (5-minute TTL)
async function getCachedJourneyState(userId: string) {
	const cacheKey = `journey:state:${userId}`;
	const cached = await redis.get(cacheKey);

	if (cached) {
		return JSON.parse(cached);
	}

	// Fetch from database
	const state = await db.query.userJourneyStates.findFirst({
		where: eq(userJourneyStates.userId, userId),
	});

	// Cache for 5 minutes
	await redis.setex(cacheKey, 300, JSON.stringify(state));

	return state;
}

// Cache trigger rules (1-hour TTL, invalidate on update)
async function getCachedTriggerRules() {
	const cacheKey = "trigger:rules:all";
	const cached = await redis.get(cacheKey);

	if (cached) {
		return JSON.parse(cached);
	}

	const rules = await db.select().from(journeyTriggerRules);
	await redis.setex(cacheKey, 3600, JSON.stringify(rules));

	return rules;
}
```

### 8.4 Queue System for Communication Delivery

```typescript
// packages/api/lib/communications/queue.ts

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
	host: process.env.REDIS_HOST,
	port: parseInt(process.env.REDIS_PORT || "6379"),
	maxRetriesPerRequest: null,
});

// Create queue for communication delivery
export const communicationQueue = new Queue("communications", { connection });

// Worker to process communication jobs
const worker = new Worker(
	"communications",
	async (job) => {
		const { userId, touchpointType, touchpointName, metadata } = job.data;

		// Execute communication delivery
		switch (touchpointType) {
			case "email":
				await sendEmail({ userId, touchpointName, metadata });
				break;
			case "in_app_message":
				await createInAppMessage({ userId, touchpointName, metadata });
				break;
			case "hubspot_sequence":
				await enrollInHubSpotSequence({ userId, metadata });
				break;
		}
	},
	{ connection }
);

// Schedule communication with delay
export async function scheduleCommunication(params: {
	userId: string;
	touchpointType: string;
	touchpointName: string;
	delay?: { value: number; unit: string };
	metadata: Record<string, unknown>;
}) {
	const { delay, ...data } = params;

	const delayMs = delay ? convertDelayToMs(delay.value, delay.unit) : 0;

	await communicationQueue.add("send-communication", data, {
		delay: delayMs,
	});
}

function convertDelayToMs(value: number, unit: string): number {
	const multipliers = {
		minutes: 60 * 1000,
		hours: 60 * 60 * 1000,
		days: 24 * 60 * 60 * 1000,
	};
	return value * (multipliers[unit as keyof typeof multipliers] || 0);
}
```

---

## 9. Privacy & GDPR Compliance

### 9.1 Data Minimization

**Principle**: Only collect necessary data, sanitize PII

```typescript
// Existing implementation in track-event.ts is GDPR-compliant

// PII fields automatically removed:
const piiFields = [
	"email",
	"userEmail",
	"userName",
	"password",
	"apiKey",
	"token",
	"secret",
];

// File paths sanitized (remove usernames)
sanitized.filePath = sanitized.filePath.replace(
	/\/Users\/[^/]+/,
	"/Users/[redacted]"
);
```

### 9.2 User Consent & Opt-Out

**Implementation**:

```typescript
// packages/api/lib/privacy/consent-manager.ts

export async function checkUserConsent(params: {
	userId: string;
	consentType: "analytics" | "marketing" | "product_emails";
}): Promise<boolean> {
	const { userId, consentType } = params;

	// Fetch user consent preferences from database
	const user = await db.query.user.findFirst({
		where: eq(user.id, userId),
	});

	// Default: analytics = true, marketing = false
	const consent = user?.metadata?.consent || {
		analytics: true,
		marketing: false,
		product_emails: true,
	};

	return consent[consentType] ?? false;
}

// Opt-out handling
export async function handleOptOut(params: {
	userId: string;
	channel: "email" | "in_app" | "push";
}) {
	const { userId, channel } = params;

	await db
		.update(communicationFrequency)
		.set({
			[`${channel}OptOut`]: new Date(),
		})
		.where(eq(communicationFrequency.userId, userId));
}
```

### 9.3 Data Retention Policy

**Rules**:

-   Journey events: Retain 2 years
-   Communication history: Retain 1 year
-   Deleted user data: Purge within 30 days

```sql
-- Scheduled cleanup job (daily)

-- Delete old journey events (>2 years)
DELETE FROM journey_events
WHERE timestamp < NOW() - INTERVAL '2 years';

-- Delete old communication touchpoints (>1 year)
DELETE FROM communication_touchpoints
WHERE created_at < NOW() - INTERVAL '1 year';

-- Purge deleted user data
DELETE FROM user_journey_states
WHERE user_id IN (
  SELECT id FROM user WHERE deleted_at < NOW() - INTERVAL '30 days'
);
```

---

## 10. Implementation Phases & Priorities

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Basic event tracking and storage

-   [ ] Create database schema (journey tables)
-   [ ] Extend telemetry API endpoint for journey events
-   [ ] Implement event deduplication (Redis)
-   [ ] Setup basic PostHog event forwarding
-   [ ] Create event taxonomy documentation

**Deliverables**:

-   Migration files for new tables
-   Updated telemetry API with journey event support
-   Event naming convention guide

### Phase 2: Journey Detection (Weeks 3-4)

**Goal**: State machine and journey pattern detection

-   [ ] Implement user state machine
-   [ ] Define journey patterns (24 journeys)
-   [ ] Build journey detection engine
-   [ ] Create journey progression tracking
-   [ ] Setup journey state caching (Redis)

**Deliverables**:

-   Journey state machine service
-   Journey pattern definitions
-   Real-time journey detection

### Phase 3: Communication Engine (Weeks 5-6)

**Goal**: Trigger-based communication delivery

-   [ ] Implement trigger evaluation system
-   [ ] Setup BullMQ for communication scheduling
-   [ ] Build frequency capping logic
-   [ ] Create email templates (journey-specific)
-   [ ] Implement in-app messaging system

**Deliverables**:

-   Trigger rule engine
-   Communication queue system
-   Initial email templates

### Phase 4: CRM Integration (Week 7)

**Goal**: HubSpot synchronization

-   [ ] Implement HubSpot contact sync
-   [ ] Setup journey state property mapping
-   [ ] Create HubSpot workflow triggers
-   [ ] Build batch sync job (hourly)

**Deliverables**:

-   HubSpot integration service
-   Automated sync jobs

### Phase 5: Analytics & Monitoring (Week 8)

**Goal**: Visibility and optimization

-   [ ] Create journey analytics dashboard (PostHog)
-   [ ] Setup journey progression funnels
-   [ ] Implement A/B testing framework
-   [ ] Build admin UI for trigger rules
-   [ ] Create alerting for journey anomalies

**Deliverables**:

-   Journey analytics dashboard
-   Trigger rule management UI
-   Monitoring & alerts

### Phase 6: Optimization (Ongoing)

**Goal**: Continuous improvement

-   [ ] Analyze journey conversion rates
-   [ ] Optimize communication timing
-   [ ] Refine trigger conditions
-   [ ] Expand communication templates
-   [ ] Scale infrastructure as needed

---

## 11. API Design for Multi-Platform Tracking

### 11.1 Enhanced Telemetry Endpoint

```typescript
// packages/api/modules/telemetry/procedures/track-journey-event.ts

export const trackJourneyEvent = protectedProcedure
	.input(
		z.object({
			event: z.string().min(1),
			category: z.enum([
				"lifecycle",
				"feature_usage",
				"conversion",
				"engagement",
				"error",
				"system",
			]),
			properties: z.record(z.string(), z.unknown()).optional(),

			// Platform context
			platform: z.enum(["vscode", "cli", "web", "mcp", "mobile"]),
			clientVersion: z.string().optional(),
			ideVersion: z.string().optional(),

			// Session context
			sessionId: z.string().optional(),

			// Timestamp (client-provided, but server validates)
			timestamp: z.string().datetime().optional(),
		})
	)
	.handler(async ({ input, context }) => {
		const user = context.user!;
		const timestamp = input.timestamp
			? new Date(input.timestamp)
			: new Date();

		// 1. Deduplicate event
		const isUnique = await deduplicateEvent({
			userId: user.id,
			eventName: input.event,
			properties: input.properties || {},
			timestamp,
		});

		if (!isUnique) {
			return { success: true, deduplicated: true };
		}

		// 2. Get user journey state
		const journeyState = await getCachedJourneyState(user.id);

		if (!journeyState) {
			// Initialize journey state for new user
			await db.insert(userJourneyStates).values({
				userId: user.id,
				currentState: "free_user", // Default
				stateEnteredAt: new Date(),
				lastActivityAt: new Date(),
			});
		}

		// 3. Process event through state machine
		const stateMachine = new JourneyStateMachine({
			userId: user.id,
			currentState: journeyState?.currentState || "free_user",
			// ... other context
		});

		const result = await stateMachine.processEvent({
			name: input.event,
			properties: input.properties || {},
			timestamp,
		});

		// 4. Persist event to database
		await db.insert(journeyEvents).values({
			userId: user.id,
			eventName: input.event,
			eventCategory: input.category,
			properties: input.properties || {},
			platform: input.platform,
			clientVersion: input.clientVersion,
			sessionId: input.sessionId,
			associatedJourneys: result.triggeredJourneys,
			timestamp,
		});

		// 5. Update journey state if changed
		if (result.stateChanged) {
			await db
				.update(userJourneyStates)
				.set({
					currentState: result.newState!,
					previousState: result.previousState,
					stateEnteredAt: new Date(),
					lastActivityAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(userJourneyStates.userId, user.id));

			// Invalidate cache
			await redis.del(`journey:state:${user.id}`);
		}

		// 6. Evaluate communication triggers
		const triggerEvaluator = new TriggerEvaluator();
		const { triggeredTouchpoints } =
			await triggerEvaluator.evaluateTriggers({
				userId: user.id,
				event: {
					name: input.event,
					category: input.category,
					properties: input.properties || {},
					timestamp,
				},
				userState:
					result.newState ||
					journeyState?.currentState ||
					"free_user",
				activeJourneys: result.triggeredJourneys,
			});

		// 7. Schedule communications
		for (const touchpoint of triggeredTouchpoints) {
			await scheduleCommunication({
				userId: user.id,
				touchpointType: touchpoint.touchpointType,
				touchpointName: touchpoint.touchpointName,
				delay: touchpoint.delay,
				metadata: touchpoint.metadata,
			});
		}

		// 8. Forward to PostHog (async, don't await)
		posthog
			.captureEvent({
				userId: user.id,
				event: input.event,
				properties: input.properties,
				journeyContext: {
					currentState:
						result.newState ||
						journeyState?.currentState ||
						"free_user",
					activeJourneys: result.triggeredJourneys,
				},
			})
			.catch(console.error);

		// 9. Sync to HubSpot (async, batched)
		if (result.stateChanged) {
			hubspot
				.syncJourneyState({
					userId: user.id,
					email: user.email,
					journeyState: {
						currentState: result.newState!,
						activeJourneys: result.triggeredJourneys,
						lastActivityAt: new Date().toISOString(),
					},
				})
				.catch(console.error);
		}

		return {
			success: true,
			eventId: crypto.randomUUID(),
			stateChanged: result.stateChanged,
			triggeredJourneys: result.triggeredJourneys,
			scheduledCommunications: triggeredTouchpoints.length,
		};
	});
```

### 11.2 Client SDK Examples

**VS Code Extension**:

```typescript
// clients/snapback-clients/apps/vscode/src/telemetry.ts

import { telemetryClient } from "@snapback/telemetry";

export async function trackCheckpointCreated(params: {
	checkpointId: string;
	filesProtected: number;
	triggerSource: "auto" | "manual" | "ai_detection";
}) {
	await telemetryClient.trackEvent({
		event: "checkpoint.created",
		category: "feature_usage",
		properties: params,
		platform: "vscode",
		clientVersion: getExtensionVersion(),
		ideVersion: vscode.version,
	});
}
```

**CLI Tool**:

```typescript
// clients/snapback-clients/packages/cli/src/telemetry.ts

export async function trackRecoveryExecuted(params: {
	checkpointId: string;
	filesRestored: number;
}) {
	await telemetryClient.trackEvent({
		event: "checkpoint.recovered",
		category: "feature_usage",
		properties: params,
		platform: "cli",
		clientVersion: CLI_VERSION,
	});
}
```

---

## 12. Monitoring & Alerting

### 12.1 Key Metrics to Track

**Event Processing**:

-   Events ingested/minute
-   Event processing latency (p50, p95, p99)
-   Deduplication rate
-   PostHog sync success rate

**Journey Detection**:

-   State transitions/hour
-   Active journeys per user (avg)
-   Journey completion rates
-   Journey abandonment rates

**Communication Delivery**:

-   Communications scheduled/hour
-   Communications sent/hour
-   Delivery success rates
-   Frequency cap violations

**System Health**:

-   Database query performance
-   Redis cache hit rate
-   Queue depth (BullMQ)
-   API error rates

### 12.2 Alerting Rules

```yaml
alerts:
    - name: High Event Processing Latency
      condition: p95_latency > 5000ms
      severity: warning

    - name: Low PostHog Sync Rate
      condition: sync_success_rate < 95%
      severity: critical

    - name: Communication Queue Backup
      condition: queue_depth > 10000
      severity: warning

    - name: Database Connection Pool Exhaustion
      condition: active_connections > 90% pool_size
      severity: critical
```

---

## Appendix A: Journey Definitions

### 24 User Journeys Mapped

1. **First Checkpoint Creation**: Visitor → Free User onboarding
2. **Checkpoint Limit Awareness**: Educate about upcoming limits
3. **Checkpoint Limit Hit**: Trigger upgrade prompt
4. **First Recovery Success**: Reinforce value proposition
5. **Multi-Recovery Pattern**: Identify power users
6. **Free to Trial Activation**: Convert free to trial
7. **Trial to Paid Conversion**: Convert trial to paid
8. **Trial Abandonment Recovery**: Win back trial users
9. **Direct Purchase (No Trial)**: Fast-track conversion
10. **Solo to Team Upgrade**: Expansion revenue
11. **Team Seat Expansion**: Seat-based growth
12. **Feature Discovery Upgrade**: Feature-driven conversion
13. **Cloud Backup Adoption**: Premium feature activation
14. **Daily Active Engagement**: Retention monitoring
15. **Power User Emergence**: Identify advocates
16. **Feature Exploration**: Onboarding optimization
17. **Community Participation**: Engagement tracking
18. **Usage Decline Intervention**: Churn prevention
19. **Trial Ending Urgency**: Conversion catalyst
20. **Payment Failure Recovery**: Revenue protection
21. **Cancellation Feedback Flow**: Churn learning
22. **Win-back Dormant User**: Reactivation campaign
23. **Referral Activation**: Viral growth
24. **Review/Case Study Recruitment**: Social proof generation

_(Full journey definitions with trigger conditions, steps, and communication templates would be documented separately)_

---

## Appendix B: File Structure

```
packages/
├── api/
│   ├── lib/
│   │   ├── analytics/
│   │   │   ├── events.ts                 # Event taxonomy
│   │   │   ├── posthog-client.ts         # PostHog service
│   │   │   └── event-taxonomy.ts         # Event schemas
│   │   ├── crm/
│   │   │   └── hubspot-sync.ts           # HubSpot integration
│   │   ├── journeys/
│   │   │   ├── state-machine.ts          # Journey state machine
│   │   │   ├── journey-patterns.ts       # Journey definitions
│   │   │   └── progression-tracker.ts    # Journey progression
│   │   ├── communications/
│   │   │   ├── trigger-evaluator.ts      # Trigger engine
│   │   │   ├── queue.ts                  # BullMQ queue
│   │   │   └── frequency-limiter.ts      # Anti-spam
│   │   ├── events/
│   │   │   └── deduplication.ts          # Event deduplication
│   │   └── privacy/
│   │       └── consent-manager.ts        # GDPR compliance
│   └── modules/
│       └── telemetry/
│           └── procedures/
│               └── track-journey-event.ts # Enhanced endpoint
│
├── database/
│   └── drizzle/
│       └── schema/
│           └── snapback/
│               ├── user-journeys.ts       # Journey tables
│               └── communications.ts      # Communication tables
│
└── mail/
    └── templates/
        └── journeys/                      # Journey-specific emails
            ├── trial-ending-3d.tsx
            ├── limit-hit-upgrade.tsx
            └── winback-dormant.tsx
```

---

## Summary

This architecture provides:

✅ **Scalable event ingestion** via existing API infrastructure
✅ **Intelligent journey detection** through state machine + pattern matching
✅ **Multi-platform tracking** (VS Code, CLI, Web, MCP, future mobile)
✅ **PostHog analytics integration** for funnel analysis & experiments
✅ **HubSpot CRM sync** for marketing automation
✅ **Communication orchestration** with frequency capping
✅ **GDPR compliance** with PII sanitization & opt-out handling
✅ **High reliability** with event deduplication & queue-based delivery
✅ **Performance optimization** via caching, indexing, batch processing

**Total estimated effort**: 8 weeks for full implementation
**Infrastructure cost**: Minimal (leverages existing services)
**Scalability**: Handles 10K users → 100K users without major changes

---

**Next Steps**:

1. Review and approve architecture
2. Prioritize journey definitions (which 24 journeys to implement first)
3. Begin Phase 1: Database schema creation
4. Design communication templates for priority journeys
5. Setup monitoring dashboards

---

_Document maintained by: System Architect_
_Last updated: 2025-10-02_
