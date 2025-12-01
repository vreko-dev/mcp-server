# SnapBack User Journey Architecture - Business-Focused Implementation

**Document Version**: 2.0 (Business-Optimized)
**Date**: 2025-10-02
**Author**: System Architect
**Context**: Post-Business Panel Strategic Alignment

---

## Executive Summary

This document refines the user journey tracking architecture based on strategic insights from the business panel (Porter, Kim/Mauborgne, Drucker, Collins, Meadows). The architecture focuses on **high-ROI journeys** aligned with SnapBack's positioning as "AI Safety Insurance" rather than generic code versioning.

### Strategic Imperatives

**From Business Panel Analysis**:

1. **Focus on Crisis Response Flywheel**: Journeys 1, 6, 14, 21A (80% conversion rate)
2. **Enterprise as Primary Segment**: Highest LTV, defensibility
3. **Eliminate Low-ROI Journeys**: Stop journey 5 (15% win-back), journey 18 (discount spiral)
4. **Simplify to 2 Plans**: Free → Enterprise (remove Solo/Team complexity)
5. **"AI Safety Insurance" Positioning**: Blue ocean vs code versioning tools

### Architecture Changes from v1.0

| Change                 | v1.0                         | v2.0 Business-Focused                   |
| ---------------------- | ---------------------------- | --------------------------------------- |
| **Journey Count**      | 24 journeys                  | 11 core journeys (eliminate 13 low-ROI) |
| **Plan Structure**     | 4 plans (Free/Solo/Team/Ent) | 2 plans (Free/Enterprise)               |
| **Primary Metric**     | MRR                          | Time-to-Recovery + Enterprise ACV       |
| **Target Segment**     | Broad developer market       | Enterprise compliance buyers            |
| **Discount Strategy**  | Win-back discounts           | NO discounts (insurance model)          |
| **Communication Tone** | Feature-driven               | Crisis prevention + compliance          |

---

## 1. Refined Journey Taxonomy (11 Core Journeys)

### 1.1 Crisis Response Flywheel (Highest Priority)

**Journey 1: Perfect Path (Visitor → Enterprise)**

-   **Business Impact**: 80% conversion rate, $50K+ ACV
-   **Trigger**: First AI-induced code break → checkpoint saves the day
-   **Key Metric**: Time from incident to full enterprise deployment
-   **Communications**:
    -   Day 0: Crisis averted confirmation (in-app)
    -   Day 1: "What just happened" technical explanation (email)
    -   Day 3: Enterprise compliance briefing (email + calendar invite)
    -   Day 7: Security team introduction (personal outreach)

**Journey 6: Crisis Response (Emergency Conversion)**

-   **Business Impact**: Same-day onboarding, 70% → Enterprise within 30 days
-   **Trigger**: Production incident detected (high checkpoint frequency + recovery pattern)
-   **Key Metric**: Incident detection → Enterprise signed (target: <24 hours)
-   **Communications**:
    -   Immediate: "We detected a critical incident" (in-app alert)
    -   30 min: Enterprise support callback offer
    -   2 hours: SOC2/HIPAA compliance brief (if applicable)
    -   24 hours: C-suite escalation if no response

**Journey 14: Referral/Viral Loop (Organic Growth)**

-   **Business Impact**: 40% of new enterprise deals from internal champions
-   **Trigger**: Power user shares checkpoint with teammate
-   **Key Metric**: Referral → Team adoption rate
-   **Communications**:
    -   Day 0: "Your teammate invited you" onboarding
    -   Day 3: Team dashboard preview
    -   Day 7: Enterprise pricing for teams >5

**Journey 21A: Product-Led Growth Viral (Network Effects)**

-   **Business Impact**: Exponential growth via team adoption
-   **Trigger**: 3+ checkpoints shared within organization domain
-   **Key Metric**: Organization-wide adoption rate (seats/total devs)
-   **Communications**:
    -   Immediate: Team adoption dashboard (in-app)
    -   Weekly: Executive summary report (PDF to manager emails)
    -   Monthly: ROI calculator based on incidents prevented

### 1.2 Conversion & Activation (4 Journeys)

**Journey 2: Free → Enterprise Activation**

-   **Trigger**: 10 checkpoints created OR 1 successful recovery
-   **Key Metric**: Free → Enterprise conversion rate (target: 25%)
-   **Communications**:
    -   10 checkpoints: "You're protecting your work. Enterprise protects your team."
    -   First recovery: "You just saved [X] hours. Enterprise includes BAA/SOC2."

**Journey 7: Trial Conversion (Eliminated "Trial" - Now Direct Enterprise)**

-   **Trigger**: Enterprise trial request (demo/calendar booking)
-   **Key Metric**: Demo → signed (target: 40%)
-   **Communications**:
    -   Pre-demo: Technical architecture brief
    -   Post-demo: Compliance requirements checklist
    -   Day 3: Security team Q&A session

**Journey 8: Onboarding Completion**

-   **Trigger**: First checkpoint created
-   **Key Metric**: First checkpoint → 10 checkpoints (activation)
-   **Communications**:
    -   Immediate: "First checkpoint success" confirmation
    -   Day 1: "How AI detection works" education
    -   Day 3: Advanced features tutorial

**Journey 13: Feature Discovery (Cloud Backup)**

-   **Trigger**: User approaches local storage limits
-   **Key Metric**: Cloud backup adoption rate
-   **Communications**:
    -   "Your checkpoints are local-only. Enterprise includes cloud backup + audit logs."

### 1.3 Retention & Engagement (2 Journeys)

**Journey 15: Power User Recognition**

-   **Trigger**: >50 checkpoints OR daily active for 30 days
-   **Key Metric**: Power user → advocate conversion
-   **Communications**:
    -   Recognition: "You're in the top 5% of users"
    -   Case study invitation: "Share your story, get swag + credit"
    -   Conference speaking opportunity

**Journey 17: Daily Active Engagement**

-   **Trigger**: Daily checkpoint activity
-   **Key Metric**: DAU/MAU ratio (target: >40%)
-   **Communications**:
    -   Weekly digest: "You protected [X] files this week"
    -   Monthly: Incident prevention report

### 1.4 Churn Prevention (2 Journeys - MODIFIED)

**Journey 19: Usage Decline Intervention**

-   **Trigger**: <2 checkpoints in 14 days (previously active user)
-   **Key Metric**: Dormancy → reactivation rate
-   **Communications**:
    -   **NO DISCOUNT** (per business panel)
    -   "We noticed you're not using SnapBack. Is everything okay?"
    -   Follow-up: "Your team is still at risk. Here's what you're missing."

**Journey 22: Payment Failure Recovery**

-   **Trigger**: Payment declined (enterprise subscription)
-   **Key Metric**: Recovery rate (target: 90%)
-   **Communications**:
    -   Immediate: Billing team email + invoice
    -   24 hours: Account manager call
    -   72 hours: CFO escalation email

### 1.5 Eliminated Journeys (From v1.0)

**Removed Based on Business Panel Analysis**:

-   ❌ Journey 3: Checkpoint Limit Awareness (conflicts with insurance model)
-   ❌ Journey 4: Checkpoint Limit Hit (no artificial limits in insurance)
-   ❌ Journey 5: Win-back with discount (15% success, creates discount spiral)
-   ❌ Journey 9: Solo → Team upgrade (eliminated Solo/Team plans)
-   ❌ Journey 10: Team seat expansion (simplified to Enterprise seat model)
-   ❌ Journey 11: Solo to Team (plan consolidation)
-   ❌ Journey 12: Feature-driven upgrade (insurance is all-or-nothing)
-   ❌ Journey 16: Feature exploration (too granular)
-   ❌ Journey 18: Trial ending urgency (no trials, direct enterprise)
-   ❌ Journey 20: Cancellation feedback (learn but don't prevent with discounts)
-   ❌ Journey 23: Review request (low ROI compared to case studies)
-   ❌ Journey 24: Case study recruitment (merged into Journey 15)

---

## 2. Simplified Database Schema (Business-Focused)

### 2.1 Core Changes from v1.0

```typescript
// packages/database/drizzle/schema/snapback/user-journeys.ts

// UPDATED: Simplified user state enum (removed trial/paid complexity)
export const userStateEnum = pgEnum("user_state", [
	"visitor", // Not signed up
	"free_user", // Authenticated, using free tier
	"enterprise_prospect", // Requested demo/enterprise info
	"enterprise_user", // Active enterprise subscription
	"churned_user", // Cancelled enterprise
	"dormant_user", // No activity >90 days
]);

// UPDATED: Focus on 11 core journeys only
export const journeyTypeEnum = pgEnum("journey_type", [
	// Crisis Response Flywheel (Priority 1)
	"perfect_path", // Journey 1
	"crisis_response", // Journey 6
	"referral_viral", // Journey 14
	"product_led_viral", // Journey 21A

	// Conversion & Activation (Priority 2)
	"free_to_enterprise", // Journey 2
	"enterprise_trial_conversion", // Journey 7
	"onboarding_completion", // Journey 8
	"cloud_backup_discovery", // Journey 13

	// Retention & Engagement (Priority 3)
	"power_user_recognition", // Journey 15
	"daily_active_engagement", // Journey 17

	// Churn Prevention (Priority 4)
	"usage_decline_intervention", // Journey 19
	"payment_failure_recovery", // Journey 22
]);

// NEW: Enterprise-specific tracking
export const enterpriseJourneyMetrics = pgTable("enterprise_journey_metrics", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => cuid()),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),

	// Time-to-Recovery metrics (core value prop)
	totalIncidents: integer("total_incidents").default(0),
	totalRecoveries: integer("total_recoveries").default(0),
	avgTimeToRecoverySeconds: integer("avg_time_to_recovery_seconds"),
	fastestRecoverySeconds: integer("fastest_recovery_seconds"),

	// Compliance tracking
	socCompliant: boolean("soc_compliant").default(false),
	hipaaCompliant: boolean("hipaa_compliant").default(false),
	baaSignedAt: timestamp("baa_signed_at"),

	// Team adoption metrics
	totalSeats: integer("total_seats").default(1),
	activeSeats: integer("active_seats").default(0),
	adoptionRate: integer("adoption_rate"), // percentage

	// ROI calculation data
	estimatedHoursSaved: integer("estimated_hours_saved").default(0),
	estimatedCostSaved: integer("estimated_cost_saved_usd").default(0),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NEW: Crisis detection events (Journey 6 trigger)
export const crisisDetectionEvents = pgTable(
	"crisis_detection_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: text("organization_id").references(
			() => organization.id
		),

		// Crisis indicators
		rapidCheckpointCount: integer("rapid_checkpoint_count"), // e.g., >10 in 1 hour
		emergencyRecoveryCount: integer("emergency_recovery_count"),
		errorPatternDetected: boolean("error_pattern_detected"),

		// AI tool context
		aiTool: text("ai_tool"), // "cursor", "github-copilot", "claude", etc.

		// Severity scoring
		severityScore: integer("severity_score"), // 0-100

		// Response tracking
		enterpriseContactAttempted: boolean(
			"enterprise_contact_attempted"
		).default(false),
		contactAttemptedAt: timestamp("contact_attempted_at"),
		convertedToEnterprise: boolean("converted_to_enterprise").default(
			false
		),
		conversionTimeSeconds: integer("conversion_time_seconds"),

		timestamp: timestamp("timestamp").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("crisis_events_user_timestamp_idx").on(
			table.userId,
			table.timestamp
		),
	]
);

// UPDATED: Communication touchpoints (business-focused)
export const communicationTouchpoints = pgTable("communication_touchpoints", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => cuid()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	organizationId: text("organization_id").references(() => organization.id),

	// Touchpoint categorization
	touchpointType: text("touchpoint_type").notNull(), // "email", "in_app", "phone_call", "executive_email"
	touchpointName: text("touchpoint_name").notNull(),
	journeyType: journeyTypeEnum("journey_type"),

	// Business context
	isEnterpriseOutreach: boolean("is_enterprise_outreach").default(false),
	estimatedDealValue: integer("estimated_deal_value_usd"), // For enterprise prospects

	// Content
	subject: text("subject"),
	content: text("content"),
	ctaUrl: text("cta_url"),

	// Delivery tracking
	status: text("status").notNull().default("pending"),
	sentAt: timestamp("sent_at"),
	deliveredAt: timestamp("delivered_at"),
	openedAt: timestamp("opened_at"),
	clickedAt: timestamp("clicked_at"),
	repliedAt: timestamp("replied_at"), // NEW: Track replies for enterprise outreach

	// A/B testing (ONLY for non-crisis communications)
	variant: text("variant"),
	experimentId: text("experiment_id"),

	// NO DISCOUNT TRACKING (eliminated per business panel)

	// External IDs
	emailProvider: text("email_provider"),
	emailProviderId: text("email_provider_id"),
	hubspotEmailId: text("hubspot_email_id"),
	hubspotWorkflowId: text("hubspot_workflow_id"),

	metadata: json("metadata").$type<Record<string, unknown>>().default({}),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 2.2 Integration with Existing Schema

**Leverages existing tables**:

-   ✅ `user` - primary relationship
-   ✅ `organization` - enterprise customer tracking
-   ✅ `subscriptions` - simplified to Free/Enterprise only
-   ✅ `apiKeys` - platform attribution
-   ✅ `checkpoints` - core product usage
-   ✅ `apiUsage` - feature usage signals

**New tables**:

-   `enterpriseJourneyMetrics` - enterprise-specific KPIs
-   `crisisDetectionEvents` - Journey 6 triggers
-   `communicationTouchpoints` - business-focused tracking

---

## 3. Event Taxonomy (Business-Aligned)

### 3.1 Core Business Events

```typescript
// packages/api/lib/analytics/business-events.ts

export const BusinessEvents = {
	// Crisis Response Events (Journey 1, 6)
	CRISIS_DETECTED: "crisis.detected",
	CRISIS_RESOLVED: "crisis.resolved",
	EMERGENCY_RECOVERY: "checkpoint.recovery.emergency",

	// Time-to-Recovery Metrics
	RECOVERY_STARTED: "recovery.started",
	RECOVERY_COMPLETED: "recovery.completed",
	RECOVERY_TIME_RECORDED: "recovery.time_recorded",

	// Enterprise Conversion Events
	ENTERPRISE_DEMO_REQUESTED: "enterprise.demo.requested",
	ENTERPRISE_DEMO_COMPLETED: "enterprise.demo.completed",
	ENTERPRISE_TRIAL_STARTED: "enterprise.trial.started",
	ENTERPRISE_CONTRACT_SIGNED: "enterprise.contract.signed",
	ENTERPRISE_ONBOARDED: "enterprise.onboarded",

	// Compliance Events
	SOC2_AUDIT_REQUESTED: "compliance.soc2.requested",
	HIPAA_BAA_REQUESTED: "compliance.hipaa.baa_requested",
	BAA_SIGNED: "compliance.baa.signed",

	// Team Adoption Events (Journey 14, 21A)
	CHECKPOINT_SHARED_INTERNAL: "checkpoint.shared.internal",
	TEAM_MEMBER_INVITED: "team.member.invited",
	TEAM_ADOPTION_MILESTONE: "team.adoption.milestone", // 25%, 50%, 75%, 100%

	// Power User Events (Journey 15)
	POWER_USER_MILESTONE: "user.power_user.milestone", // 50, 100, 500 checkpoints
	ADVOCATE_CASE_STUDY_INVITED: "advocate.case_study.invited",
	ADVOCATE_REFERRAL_SUCCESSFUL: "advocate.referral.successful",

	// Churn Signals (Journey 19, 22)
	USAGE_DECLINED_WARNING: "engagement.usage.declined",
	PAYMENT_FAILED: "payment.failed",
	PAYMENT_RECOVERED: "payment.recovered",
	SUBSCRIPTION_CANCELLED: "subscription.cancelled",

	// AI Safety Insurance Positioning
	AI_INCIDENT_PREVENTED: "ai.incident.prevented",
	AI_TOOL_INTEGRATION_DETECTED: "ai.tool.detected", // Cursor, Copilot, etc.
} as const;

// Event property schemas
export const BusinessEventSchemas = {
	[BusinessEvents.CRISIS_DETECTED]: z.object({
		rapidCheckpointCount: z.number(),
		emergencyRecoveryCount: z.number(),
		severityScore: z.number().min(0).max(100),
		aiTool: z.string().optional(),
		errorPattern: z.string().optional(),
	}),

	[BusinessEvents.RECOVERY_COMPLETED]: z.object({
		checkpointId: z.string(),
		filesRestored: z.number(),
		timeToRecoverySeconds: z.number(),
		recoveryMethod: z.enum(["cli", "vscode", "api"]),
	}),

	[BusinessEvents.ENTERPRISE_CONTRACT_SIGNED]: z.object({
		organizationId: z.string(),
		contractValue: z.number(), // ACV in USD
		seats: z.number(),
		billingInterval: z.enum(["month", "year"]),
		complianceRequirements: z.array(z.enum(["soc2", "hipaa", "gdpr"])),
	}),

	[BusinessEvents.TEAM_ADOPTION_MILESTONE]: z.object({
		organizationId: z.string(),
		totalSeats: z.number(),
		activeSeats: z.number(),
		adoptionRate: z.number(), // percentage
		milestone: z.enum(["25", "50", "75", "100"]),
	}),
} as const;
```

### 3.2 Platform Tracking (Unchanged)

```typescript
export const Platforms = {
	VSCODE: "vscode",
	CLI: "cli",
	WEB: "web",
	MCP: "mcp",
	MOBILE: "mobile", // future
	API: "api",
} as const;
```

---

## 4. Journey Detection Engine (Simplified)

### 4.1 Streamlined State Machine

```typescript
// packages/api/lib/journeys/business-state-machine.ts

export type UserState =
	| "visitor"
	| "free_user"
	| "enterprise_prospect"
	| "enterprise_user"
	| "churned_user"
	| "dormant_user";

// SIMPLIFIED: Focus on enterprise conversion path
const STATE_TRANSITIONS: StateTransition[] = [
	// Visitor → Free
	{
		from: "visitor",
		to: "free_user",
		trigger: "user.signed_up",
	},

	// Free → Enterprise Prospect (requested demo)
	{
		from: "free_user",
		to: "enterprise_prospect",
		trigger: "enterprise.demo.requested",
	},

	// Free → Enterprise (direct conversion)
	{
		from: "free_user",
		to: "enterprise_user",
		trigger: "enterprise.contract.signed",
	},

	// Prospect → Enterprise
	{
		from: "enterprise_prospect",
		to: "enterprise_user",
		trigger: "enterprise.contract.signed",
	},

	// Enterprise → Churned
	{
		from: "enterprise_user",
		to: "churned_user",
		trigger: "subscription.cancelled",
	},

	// Churned → Enterprise (reactivation)
	{
		from: "churned_user",
		to: "enterprise_user",
		trigger: "subscription.reactivated",
	},

	// Free/Churned → Dormant
	{
		from: ["free_user", "churned_user"],
		to: "dormant_user",
		trigger: "engagement.dormant.90d",
	},
];

export class BusinessJourneyStateMachine extends EventEmitter {
	/**
	 * Detect journeys with business-focused patterns
	 */
	private async detectJourneys(event: {
		name: string;
		properties: Record<string, unknown>;
	}): Promise<string[]> {
		const { name: eventName, properties } = event;
		const triggered: string[] = [];

		// Journey 1: Perfect Path (Crisis → Enterprise)
		if (
			eventName === "crisis.detected" &&
			this.context.currentState === "free_user" &&
			properties.severityScore >= 70
		) {
			triggered.push("perfect_path");
		}

		// Journey 6: Crisis Response (Emergency conversion)
		if (
			eventName === "crisis.detected" &&
			properties.rapidCheckpointCount >= 10 &&
			properties.emergencyRecoveryCount >= 2
		) {
			triggered.push("crisis_response");
		}

		// Journey 14: Referral Viral
		if (
			eventName === "checkpoint.shared.internal" &&
			this.context.currentState === "enterprise_user"
		) {
			triggered.push("referral_viral");
		}

		// Journey 21A: Product-Led Viral
		if (
			eventName === "team.adoption.milestone" &&
			properties.adoptionRate >= 50
		) {
			triggered.push("product_led_viral");
		}

		// Journey 2: Free → Enterprise Activation
		if (
			(eventName === "checkpoint.created" &&
				this.context.checkpointsCreated === 10) ||
			eventName === "checkpoint.recovery.success"
		) {
			triggered.push("free_to_enterprise");
		}

		// Journey 15: Power User Recognition
		if (
			eventName === "user.power_user.milestone" &&
			properties.milestone >= 50
		) {
			triggered.push("power_user_recognition");
		}

		// Journey 19: Usage Decline
		if (eventName === "engagement.usage.declined") {
			triggered.push("usage_decline_intervention");
		}

		// Journey 22: Payment Failure
		if (eventName === "payment.failed") {
			triggered.push("payment_failure_recovery");
		}

		return triggered;
	}
}
```

### 4.2 Crisis Detection Algorithm (Journey 6)

```typescript
// packages/api/lib/journeys/crisis-detector.ts

export class CrisisDetector {
	/**
	 * Analyze checkpoint patterns to detect production incidents
	 */
	async analyzeForCrisis(params: {
		userId: string;
		organizationId?: string;
		timeWindowMinutes: number;
	}): Promise<{
		isCrisis: boolean;
		severityScore: number;
		indicators: string[];
	}> {
		const { userId, timeWindowMinutes } = params;

		// Fetch recent checkpoints (last N minutes)
		const recentCheckpoints = await db
			.select()
			.from(checkpoints)
			.where(
				and(
					eq(checkpoints.userId, userId),
					gte(
						checkpoints.createdAt,
						new Date(Date.now() - timeWindowMinutes * 60 * 1000)
					)
				)
			);

		const indicators: string[] = [];
		let severityScore = 0;

		// Indicator 1: Rapid checkpoint creation (>10 in 1 hour)
		if (recentCheckpoints.length >= 10 && timeWindowMinutes <= 60) {
			indicators.push("rapid_checkpoint_creation");
			severityScore += 30;
		}

		// Indicator 2: Multiple emergency recoveries
		const emergencyRecoveries = await db
			.select()
			.from(journeyEvents)
			.where(
				and(
					eq(journeyEvents.userId, userId),
					eq(
						journeyEvents.eventName,
						"checkpoint.recovery.emergency"
					),
					gte(
						journeyEvents.timestamp,
						new Date(Date.now() - timeWindowMinutes * 60 * 1000)
					)
				)
			);

		if (emergencyRecoveries.length >= 2) {
			indicators.push("multiple_emergency_recoveries");
			severityScore += 40;
		}

		// Indicator 3: Error pattern in checkpoint metadata
		const errorPatterns = recentCheckpoints.filter(
			(cp) => cp.riskScore && cp.riskScore >= 70
		);

		if (errorPatterns.length >= 3) {
			indicators.push("high_risk_pattern_detected");
			severityScore += 30;
		}

		const isCrisis = severityScore >= 70;

		return {
			isCrisis,
			severityScore,
			indicators,
		};
	}

	/**
	 * Trigger enterprise outreach for crisis scenarios
	 */
	async triggerCrisisResponse(params: {
		userId: string;
		severityScore: number;
		indicators: string[];
	}) {
		const { userId, severityScore, indicators } = params;

		// Log crisis event
		await db.insert(crisisDetectionEvents).values({
			userId,
			rapidCheckpointCount: indicators.includes(
				"rapid_checkpoint_creation"
			)
				? 10
				: 0,
			emergencyRecoveryCount: indicators.includes(
				"multiple_emergency_recoveries"
			)
				? 2
				: 0,
			errorPatternDetected: indicators.includes(
				"high_risk_pattern_detected"
			),
			severityScore,
			timestamp: new Date(),
		});

		// Schedule immediate enterprise outreach
		await scheduleCommunication({
			userId,
			touchpointType: "email",
			touchpointName: "crisis_detected_enterprise_offer",
			delay: { value: 0, unit: "minutes" }, // Immediate
			metadata: {
				severityScore,
				indicators,
				isEnterpriseOutreach: true,
				estimatedDealValue: 50000, // Enterprise ACV
			},
		});

		// Schedule follow-up call (30 minutes)
		await scheduleCommunication({
			userId,
			touchpointType: "phone_call",
			touchpointName: "crisis_response_callback",
			delay: { value: 30, unit: "minutes" },
			metadata: {
				priority: "critical",
				isEnterpriseOutreach: true,
			},
		});
	}
}
```

---

## 5. Communication Engine (Business-Focused)

### 5.1 Enterprise Communication Rules

```typescript
// packages/api/lib/communications/enterprise-triggers.ts

export const ENTERPRISE_TRIGGER_RULES = [
	// Journey 1: Perfect Path (Crisis → Enterprise)
	{
		ruleName: "perfect_path_crisis_to_enterprise",
		journeyType: "perfect_path",
		priority: 100, // Highest priority
		triggerConditions: {
			eventName: "crisis.detected",
			userState: ["free_user"],
			customLogic: "event.properties.severityScore >= 70",
		},
		touchpoints: [
			{
				touchpointType: "email",
				touchpointName: "crisis_enterprise_immediate",
				delay: { value: 0, unit: "minutes" },
			},
			{
				touchpointType: "in_app",
				touchpointName: "crisis_enterprise_banner",
				delay: { value: 0, unit: "minutes" },
			},
			{
				touchpointType: "phone_call",
				touchpointName: "enterprise_sales_callback",
				delay: { value: 30, unit: "minutes" },
			},
		],
	},

	// Journey 2: Free → Enterprise (10 checkpoints)
	{
		ruleName: "free_to_enterprise_activation",
		journeyType: "free_to_enterprise",
		priority: 80,
		triggerConditions: {
			eventName: "checkpoint.created",
			customLogic: "context.checkpointsCreated === 10",
		},
		touchpoints: [
			{
				touchpointType: "email",
				touchpointName: "enterprise_value_proposition",
				delay: { value: 0, unit: "minutes" },
			},
			{
				touchpointType: "in_app",
				touchpointName: "enterprise_upgrade_banner",
				delay: { value: 1, unit: "hours" },
			},
		],
	},

	// Journey 19: Usage Decline (NO DISCOUNT)
	{
		ruleName: "usage_decline_check_in",
		journeyType: "usage_decline_intervention",
		priority: 50,
		triggerConditions: {
			eventName: "engagement.usage.declined",
		},
		touchpoints: [
			{
				touchpointType: "email",
				touchpointName: "usage_decline_check_in", // NO DISCOUNT MENTIONED
				delay: { value: 24, unit: "hours" },
			},
			// NO follow-up discount email (eliminated)
		],
	},

	// Journey 22: Payment Failure Recovery
	{
		ruleName: "payment_failure_enterprise",
		journeyType: "payment_failure_recovery",
		priority: 95,
		triggerConditions: {
			eventName: "payment.failed",
			userState: ["enterprise_user"],
		},
		touchpoints: [
			{
				touchpointType: "email",
				touchpointName: "payment_failed_urgent",
				delay: { value: 0, unit: "minutes" },
			},
			{
				touchpointType: "phone_call",
				touchpointName: "account_manager_call",
				delay: { value: 24, unit: "hours" },
			},
			{
				touchpointType: "executive_email",
				touchpointName: "cfo_escalation",
				delay: { value: 72, unit: "hours" },
				condition: "!event.properties.paymentRecovered",
			},
		],
	},
];
```

### 5.2 Email Templates (Business Tone)

```typescript
// packages/mail/templates/journeys/crisis-enterprise-immediate.tsx

import { Button, Html, Text } from "@react-email/components";

export default function CrisisEnterpriseImmediateEmail({
	userName,
	severityScore,
	checkpointsCreated,
	timeToRecovery,
}: {
	userName: string;
	severityScore: number;
	checkpointsCreated: number;
	timeToRecovery?: number;
}) {
	return (
		<Html>
			<Text style={{ fontSize: 16, fontWeight: "bold" }}>
				{userName}, we detected a critical incident
			</Text>

			<Text>
				Your recent checkpoint activity indicates a production incident.
				{timeToRecovery &&
					` SnapBack just saved you ${Math.floor(
						timeToRecovery / 60
					)} minutes of recovery time.`}
			</Text>

			<Text style={{ marginTop: 20, fontWeight: "bold" }}>
				What Enterprise includes:
			</Text>
			<ul>
				<li>SOC2 Type II compliance</li>
				<li>HIPAA Business Associate Agreement (BAA)</li>
				<li>Centralized audit logs for your team</li>
				<li>Priority incident response (15-minute SLA)</li>
				<li>Cloud backup with 99.99% uptime SLA</li>
			</ul>

			<Text style={{ marginTop: 20 }}>
				<strong>
					This isn't code versioning. It's AI safety insurance.
				</strong>
			</Text>

			<Button
				href="https://snapback.dev/enterprise/demo"
				style={{
					background: "#000",
					color: "#fff",
					padding: "12px 24px",
					borderRadius: "8px",
					textDecoration: "none",
				}}
			>
				Schedule Enterprise Demo
			</Button>

			<Text style={{ marginTop: 20, fontSize: 14, color: "#666" }}>
				Or reply directly to this email - our enterprise team responds
				within 2 hours.
			</Text>

			<Text style={{ marginTop: 30, fontSize: 12, color: "#999" }}>
				No discount codes. No feature upsells. Just enterprise-grade
				protection when you need it.
			</Text>
		</Html>
	);
}
```

```typescript
// packages/mail/templates/journeys/usage-decline-check-in.tsx

export default function UsageDeclineCheckInEmail({
	userName,
	lastActiveDate,
	teamStillActive,
}: {
	userName: string;
	lastActiveDate: string;
	teamStillActive: boolean;
}) {
	return (
		<Html>
			<Text>Hi {userName},</Text>

			<Text>
				We noticed you haven't used SnapBack since {lastActiveDate}.
				{teamStillActive &&
					" Your team is still actively protecting their code."}
			</Text>

			<Text>
				Is everything okay? Sometimes teams stop using protection right
				before they need it most.
			</Text>

			<Text style={{ marginTop: 20, fontWeight: "bold" }}>
				What you're missing:
			</Text>
			<ul>
				<li>Automatic AI incident detection</li>
				<li>Team-wide protection policies</li>
				<li>Compliance audit trails</li>
			</ul>

			{/* NO DISCOUNT MENTION */}

			<Button href="https://snapback.dev/dashboard">
				Return to Dashboard
			</Button>

			<Text style={{ marginTop: 20, fontSize: 14, color: "#666" }}>
				Or reply to let us know what's wrong - we read every message.
			</Text>
		</Html>
	);
}
```

---

## 6. PostHog & HubSpot Integration (Unchanged Architecture)

The integration patterns from v1.0 remain valid:

-   ✅ PostHog for analytics, funnels, experiments
-   ✅ HubSpot for CRM sync, lead scoring, workflows
-   ✅ Event deduplication with Redis
-   ✅ BullMQ for communication scheduling

**Key Changes**:

-   PostHog cohorts focused on enterprise segments (not broad user segments)
-   HubSpot workflows optimized for enterprise sales cycle
-   Remove discount-based email sequences from HubSpot

---

## 7. Implementation Phases (Business-Prioritized)

### Phase 1: Crisis Response Foundation (Weeks 1-2)

**Goal**: Enable Journey 6 (Crisis Response) for immediate revenue impact

-   [ ] Implement `crisisDetectionEvents` table
-   [ ] Build `CrisisDetector` service with severity scoring
-   [ ] Create crisis response email templates (enterprise-focused)
-   [ ] Setup enterprise outreach automation (email + phone call scheduling)
-   [ ] Integrate with existing checkpoint/recovery tracking

**Success Metrics**:

-   Crisis detection accuracy >80%
-   Enterprise outreach triggered within 5 minutes
-   First enterprise conversion from crisis scenario

### Phase 2: Perfect Path Journey (Weeks 3-4)

**Goal**: Optimize Journey 1 (Visitor → Enterprise) conversion

-   [ ] Implement simplified state machine (6 states, not 8)
-   [ ] Build "Perfect Path" journey tracking
-   [ ] Create enterprise value proposition email sequence
-   [ ] Setup demo scheduling automation
-   [ ] Build compliance requirements checklist (SOC2/HIPAA)

**Success Metrics**:

-   Perfect Path conversion rate >25%
-   Time from first checkpoint → enterprise demo <7 days
-   Demo → signed conversion >40%

### Phase 3: Viral Growth Mechanisms (Weeks 5-6)

**Goal**: Enable Journeys 14 & 21A (referral + team viral)

-   [ ] Implement `enterpriseJourneyMetrics` table
-   [ ] Build team adoption tracking
-   [ ] Create internal sharing analytics
-   [ ] Setup referral attribution
-   [ ] Build executive summary reports (weekly/monthly)

**Success Metrics**:

-   40% of enterprise deals from internal referrals
-   Team adoption rate >50% within 30 days
-   Referral conversion rate >30%

### Phase 4: Enterprise Retention (Week 7)

**Goal**: Journeys 19 & 22 (usage decline + payment recovery)

-   [ ] Implement usage decline detection (no discount messaging)
-   [ ] Build payment failure recovery workflow
-   [ ] Create account manager escalation process
-   [ ] Setup executive escalation emails (CFO/CTO)

**Success Metrics**:

-   Payment recovery rate >90%
-   Churn rate <5% annually
-   Reactivation rate (dormant → active) >20%

### Phase 5: Analytics & Optimization (Week 8)

**Goal**: Visibility and continuous improvement

-   [ ] Create enterprise journey dashboards (PostHog)
-   [ ] Build ROI calculator (hours saved → $ saved)
-   [ ] Setup journey funnel analysis
-   [ ] Implement A/B testing for enterprise emails
-   [ ] Create alerting for journey anomalies

**Success Metrics**:

-   Dashboard adoption by sales team >80%
-   A/B test winners improving conversion >10%
-   Journey completion visibility in real-time

---

## 8. Key Metrics Dashboard

### 8.1 North Star Metrics

**Primary (Revenue)**:

-   **Enterprise ACV**: Average Contract Value (target: $50K+)
-   **Time-to-Enterprise**: Days from first checkpoint → signed (target: <30 days)
-   **Perfect Path Conversion**: % of crisis scenarios → enterprise (target: 25%)

**Secondary (Product-Market Fit)**:

-   **Time-to-Recovery**: Average seconds to restore code (target: <60s)
-   **Incidents Prevented**: AI-induced breaks caught by checkpoints
-   **Team Adoption Rate**: % of organization using SnapBack (target: >50%)

**Tertiary (Efficiency)**:

-   **CAC**: Customer Acquisition Cost
-   **LTV**: Lifetime Value (enterprise focus)
-   **Churn Rate**: Annual churn (target: <5%)

### 8.2 Journey-Specific KPIs

| Journey                 | Primary Metric                       | Target | Current |
| ----------------------- | ------------------------------------ | ------ | ------- |
| Perfect Path (1)        | Crisis → Enterprise conversion       | 25%    | TBD     |
| Crisis Response (6)     | Response time (detection → outreach) | <5 min | TBD     |
| Referral Viral (14)     | Referral conversion rate             | 40%    | TBD     |
| Product-Led Viral (21A) | Team adoption rate                   | >50%   | TBD     |
| Free → Enterprise (2)   | 10-checkpoint activation rate        | 30%    | TBD     |
| Power User (15)         | Power user → advocate                | 20%    | TBD     |
| Usage Decline (19)      | Reactivation rate (no discount)      | 20%    | TBD     |
| Payment Failure (22)    | Recovery rate                        | >90%   | TBD     |

---

## 9. File Structure (Updated)

```
packages/
├── api/
│   ├── lib/
│   │   ├── analytics/
│   │   │   ├── business-events.ts          # NEW: Enterprise-focused events
│   │   │   ├── posthog-client.ts           # Existing
│   │   │   └── event-taxonomy.ts           # Updated
│   │   ├── crm/
│   │   │   └── hubspot-sync.ts             # Updated (no discount workflows)
│   │   ├── journeys/
│   │   │   ├── business-state-machine.ts   # NEW: Simplified state machine
│   │   │   ├── crisis-detector.ts          # NEW: Journey 6 detection
│   │   │   └── journey-patterns.ts         # Updated (11 journeys)
│   │   ├── communications/
│   │   │   ├── enterprise-triggers.ts      # NEW: Enterprise-focused rules
│   │   │   ├── trigger-evaluator.ts        # Updated
│   │   │   ├── queue.ts                    # Existing
│   │   │   └── frequency-limiter.ts        # Updated (no discount emails)
│   │   └── events/
│   │       └── deduplication.ts            # Existing
│   └── modules/
│       └── telemetry/
│           └── procedures/
│               └── track-business-event.ts # NEW: Business-focused endpoint
│
├── database/
│   └── drizzle/
│       └── schema/
│           └── snapback/
│               ├── user-journeys.ts        # Updated (11 journeys, 6 states)
│               ├── enterprise-metrics.ts   # NEW
│               ├── crisis-events.ts        # NEW
│               └── communications.ts       # Updated
│
└── mail/
    └── templates/
        └── journeys/
            ├── crisis-enterprise-immediate.tsx      # NEW
            ├── enterprise-value-proposition.tsx     # NEW
            ├── usage-decline-check-in.tsx           # NEW (no discount)
            └── payment-failure-urgent.tsx           # NEW

ELIMINATED FILES (from v1.0):
- trial-ending-3d.tsx (no trial plans)
- limit-hit-upgrade.tsx (no artificial limits)
- winback-dormant.tsx (no win-back discounts)
```

---

## 10. Business Constraints & Compliance

### 10.1 Strategic Constraints

**FROM BUSINESS PANEL**:

1. ✅ **NO discounts ever** (insurance model, not SaaS feature upsell)
2. ✅ **NO artificial limits** (checkpoint limits create bad UX for insurance)
3. ✅ **NO trial urgency** (enterprise doesn't buy on urgency, buys on compliance)
4. ✅ **NO Solo/Team plans** (complexity dilutes enterprise focus)
5. ✅ **YES Crisis Response** (80% conversion, highest ROI)
6. ✅ **YES Enterprise compliance** (SOC2/HIPAA/BAA are table stakes)

### 10.2 Technical Compliance

**Enterprise Requirements**:

-   SOC2 Type II certification (in progress)
-   HIPAA compliance with BAA option
-   GDPR compliance (PII sanitization already implemented)
-   Data residency options (US/EU)
-   99.99% uptime SLA for cloud backup
-   <15 minute incident response SLA

**Data Retention** (unchanged from v1.0):

-   Journey events: 2 years
-   Communication history: 1 year
-   Enterprise metrics: Indefinite (compliance audit requirement)

---

## Summary: v1.0 → v2.0 Changes

### Removed Complexity

-   ❌ 13 low-ROI journeys eliminated
-   ❌ Discount-based email sequences deleted
-   ❌ Trial/Solo/Team plan states removed
-   ❌ Feature limit enforcement logic removed

### Added Strategic Focus

-   ✅ Crisis detection algorithm (Journey 6)
-   ✅ Enterprise metrics tracking
-   ✅ Time-to-Recovery as core metric
-   ✅ Compliance workflow automation (SOC2/HIPAA/BAA)
-   ✅ Team viral growth mechanics (Journeys 14, 21A)

### Business Alignment

-   🎯 **Positioning**: "AI Safety Insurance" not "code versioning"
-   🎯 **Target**: Enterprise compliance buyers not indie developers
-   🎯 **Monetization**: Direct Free → Enterprise (no trial/upgrade ladder)
-   🎯 **Value Metric**: Time-to-Recovery + Compliance, not feature counts

**Total Estimated Effort**: 8 weeks → 6 weeks (reduced complexity)
**Infrastructure Cost**: Minimal (leverages existing services)
**Scalability**: Handles 10K users → 100K users without changes
**Business Impact**: 25% conversion rate on Perfect Path = $1.25M ARR at 100 conversions

---

**Next Steps**:

1. ✅ Review business-focused architecture with team
2. ⏳ Implement Phase 1 (Crisis Response) - **START IMMEDIATELY**
3. ⏳ Design enterprise email templates with legal/compliance
4. ⏳ Setup PostHog dashboards for 11 core journeys
5. ⏳ Configure HubSpot workflows (no discount sequences)

---

_Document Version: 2.0 (Business-Focused)_
_Maintained by: System Architect_
_Last updated: 2025-10-02_
_Based on: Business Panel Strategic Analysis (Porter, Kim/Mauborgne, Drucker, Collins, Meadows)_
