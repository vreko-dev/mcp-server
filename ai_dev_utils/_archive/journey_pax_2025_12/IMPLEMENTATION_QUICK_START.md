# SnapBack Telemetry Implementation - Quick Start Guide

**Target**: Complete config-based event registry in 4 weeks
**Framework**: TDD_CORE.md + PostHog 2025 patterns
**Output**: Type-safe, privacy-compliant, fully tracked user journeys

---

## Week 1: Core Events Setup

### Day 1-2: Create Missing Event Schemas

**File**: `packages/contracts/src/events/journey-events.ts`

```typescript
import { BaseEventSchema } from "./core";
import { z } from "zod";

// Journey #1: Waitlist Signup
export const WaitlistJoinedSchema = BaseEventSchema.extend({
  event: z.literal("waitlist_joined"),
  properties: z.object({
    email_domain: z.string(),
    referral_source: z.enum([
      "organic",
      "paid_search",
      "social",
      "referral",
      "direct",
      "other",
    ]),
    position: z.number().int().positive().optional(),
  }),
});

// Journey #3: API Key Creation
export const APIKeyCreatedSchema = BaseEventSchema.extend({
  event: z.literal("apikey_created"),
  properties: z.object({
    tier: z.enum(["free", "solo", "team", "enterprise"]),
    key_count: z.number().int().min(1),
  }),
});

// Journey #4: Dashboard View
export const DashboardViewedSchema = BaseEventSchema.extend({
  event: z.literal("dashboard_viewed"),
  properties: z.object({
    tab: z.enum(["overview", "metrics", "activity", "ai_analysis"]),
    has_data: z.boolean(),
    session_duration_ms: z.number().int().optional(),
  }),
});

// Journey #9: MCP Pro Features
export const MCPCheckpointCreatedSchema = BaseEventSchema.extend({
  event: z.literal("mcp_checkpoint_created"),
  properties: z.object({
    files_count: z.number().int().min(1),
    total_size_bytes: z.number().int().min(0),
    dry_run: z.boolean().default(false),
  }),
});

export const MCPCheckpointRestoredSchema = BaseEventSchema.extend({
  event: z.literal("mcp_checkpoint_restored"),
  properties: z.object({
    files_restored: z.number().int().min(1),
    dry_run: z.boolean().default(false),
  }),
});

// Additional events...
// Export union
export type JourneyTelemetryEvent =
  | z.infer<typeof WaitlistJoinedSchema>
  | z.infer<typeof APIKeyCreatedSchema>
  | z.infer<typeof DashboardViewedSchema>
  | z.infer<typeof MCPCheckpointCreatedSchema>
  | z.infer<typeof MCPCheckpointRestoredSchema>;

// Zod schema union
export const JourneyEventSchema = z.discriminatedUnion("event", [
  WaitlistJoinedSchema,
  APIKeyCreatedSchema,
  DashboardViewedSchema,
  MCPCheckpointCreatedSchema,
  MCPCheckpointRestoredSchema,
]);
```

### Day 3: Update Core Event Types

**File**: `packages/contracts/src/events/core.ts`

```typescript
// Add to existing CoreTelemetryEvent union
export type CoreTelemetryEvent =
  | SaveAttemptEvent
  | SnapshotCreatedEvent
  | SessionFinalizedEvent
  | IssueCreatedEvent
  | IssueResolvedEvent
  | SessionRestoredEvent
  | PolicyChangedEvent
  | AuthProviderSelectedEvent
  | AuthBrowserOpenedEvent
  | AuthCodeEntryEvent
  | AuthApprovalReceivedEvent
  | WelcomeFeatureViewedEvent
  | WelcomeActionTriggeredEvent
  // NEW: Add journey events
  | WaitlistJoinedEvent
  | APIKeyCreatedEvent
  | DashboardViewedEvent
  | MCPCheckpointCreatedEvent
  | MCPCheckpointRestoredEvent;

// Add to CORE_TELEMETRY_EVENTS enum
export const CORE_TELEMETRY_EVENTS = {
  // ... existing events ...
  WAITLIST_JOINED: "waitlist_joined",
  APIKEY_CREATED: "apikey_created",
  DASHBOARD_VIEWED: "dashboard_viewed",
  MCP_CHECKPOINT_CREATED: "mcp_checkpoint_created",
  MCP_CHECKPOINT_RESTORED: "mcp_checkpoint_restored",
} as const;
```

### Day 4-5: Write Tests

**File**: `packages/contracts/src/events/__tests__/journey-events.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { JourneyEventSchema } from "../journey-events";

describe("Journey Events", () => {
  describe("WaitlistJoinedSchema", () => {
    it("should validate valid waitlist_joined event", () => {
      const event = {
        event: "waitlist_joined",
        event_version: "1.0.0",
        timestamp: Date.now(),
        properties: {
          email_domain: "example.com",
          referral_source: "organic",
          position: 42,
        },
      };

      const result = JourneyEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should reject missing referral_source", () => {
      const event = {
        event: "waitlist_joined",
        properties: {
          email_domain: "example.com",
        },
      };

      const result = JourneyEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  // ... more tests for each event type ...
});
```

### Day 5: Run Tests & Type Check

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site

# Run tests
pnpm --filter @snapback/contracts test --run

# Type check
pnpm type-check

# Lint
pnpm lint
```

---

## Week 2: Config Registry

### Day 1-2: Create Journey Registry

**File**: `packages/analytics/src/journey-registry.ts`

```typescript
/**
 * Canonical Journey Telemetry Registry
 *
 * Single source of truth for all user journey events.
 * Auto-generates schemas, funnel definitions, and documentation.
 */

import type { CoreTelemetryEventName } from "@snapback/contracts/events";

export interface EventDefinition {
  /** Event name (must match CoreTelemetryEventName) */
  event: CoreTelemetryEventName;

  /** Which platforms emit this event */
  platforms: ("extension" | "web" | "cli" | "mcp" | "api")[];

  /** Event properties with types */
  properties: Record<string, string>;

  /** Minimum tier required to track this event */
  tier_gate: "free" | "solo" | "team" | "enterprise";

  /** Funnel step number (if part of conversion funnel) */
  funnel_step?: number;

  /** Is this the final step of a funnel? */
  funnel_terminal?: boolean;

  /** Description for documentation */
  description?: string;
}

export interface JourneyDefinition {
  [key: string]: EventDefinition;
}

export const JOURNEY_TELEMETRY = {
  // ========================================
  // Journey #1: Waitlist Signup
  // ========================================
  WAITLIST: {
    JOINED: {
      event: "waitlist_joined",
      platforms: ["web"],
      properties: {
        email_domain: "string (e.g., 'example.com')",
        referral_source: "enum (organic|paid_search|social|referral|direct)",
        position: "number (optional waitlist position)",
      },
      tier_gate: "free",
      funnel_step: 1,
      description: "User joined product waitlist",
    },
  } as const,

  // ========================================
  // Journey #2: OAuth Activation
  // ========================================
  AUTH: {
    PROVIDER_SELECTED: {
      event: "auth.provider.selected",
      platforms: ["extension"],
      properties: {
        provider: "enum (oauth|device_flow)",
        trigger: "enum (user_selected|fallback|auto)",
      },
      tier_gate: "free",
      funnel_step: 1,
      description: "User selected authentication method",
    },
    BROWSER_OPENED: {
      event: "auth.browser.opened",
      platforms: ["extension"],
      properties: {
        method: "enum (external_command|clipboard|error)",
        success: "boolean",
      },
      tier_gate: "free",
      funnel_step: 2,
      description: "Auth browser window opened",
    },
    CODE_ENTRY: {
      event: "auth.code.entry",
      platforms: ["extension"],
      properties: {
        code_format: "enum (valid|invalid_chars|wrong_length)",
        time_to_enter_ms: "number",
        attempts: "number",
      },
      tier_gate: "free",
      funnel_step: 3,
      description: "User entered device code",
    },
    APPROVAL_RECEIVED: {
      event: "auth.approval.received",
      platforms: ["extension"],
      properties: {
        polling_attempts: "number",
        total_wait_ms: "number",
        device_code_expired: "boolean",
      },
      tier_gate: "free",
      funnel_step: 4,
      funnel_terminal: true,
      description: "OAuth approval received",
    },
  } as const,

  // ========================================
  // Journey #3: API Key Generation
  // ========================================
  APIKEY: {
    CREATED: {
      event: "apikey_created",
      platforms: ["web"],
      properties: {
        tier: "enum (free|solo|team|enterprise)",
        key_count: "number (total keys for user)",
      },
      tier_gate: "solo",
      funnel_step: 5,
      description: "User created API key",
    },
  } as const,

  // ========================================
  // Journey #4: Dashboard Metrics
  // ========================================
  DASHBOARD: {
    VIEWED: {
      event: "dashboard_viewed",
      platforms: ["web"],
      properties: {
        tab: "enum (overview|metrics|activity|ai_analysis)",
        has_data: "boolean",
        session_duration_ms: "number (optional)",
      },
      tier_gate: "free",
      description: "User viewed dashboard",
    },
  } as const,

  // ========================================
  // Journey #9: MCP Pro Features
  // ========================================
  MCP: {
    CHECKPOINT_CREATED: {
      event: "mcp_checkpoint_created",
      platforms: ["mcp"],
      properties: {
        files_count: "number",
        total_size_bytes: "number",
        dry_run: "boolean",
      },
      tier_gate: "solo",
      funnel_step: 6,
      description: "User created checkpoint via MCP",
    },
    CHECKPOINT_RESTORED: {
      event: "mcp_checkpoint_restored",
      platforms: ["mcp"],
      properties: {
        files_restored: "number",
        dry_run: "boolean",
      },
      tier_gate: "solo",
      funnel_terminal: true,
      description: "User restored checkpoint via MCP",
    },
  } as const,
} as const;

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Extract all event names from registry
 */
export function getAllEventNames(): CoreTelemetryEventName[] {
  const events: CoreTelemetryEventName[] = [];

  for (const journey of Object.values(JOURNEY_TELEMETRY)) {
    for (const event of Object.values(journey)) {
      events.push(event.event as CoreTelemetryEventName);
    }
  }

  return events;
}

/**
 * Get all events for a specific platform
 */
export function getEventsByPlatform(platform: string): EventDefinition[] {
  const events: EventDefinition[] = [];

  for (const journey of Object.values(JOURNEY_TELEMETRY)) {
    for (const event of Object.values(journey)) {
      if (event.platforms.includes(platform as any)) {
        events.push(event);
      }
    }
  }

  return events;
}

/**
 * Get funnel steps in order
 */
export function getFunnelSteps(): EventDefinition[] {
  const events: EventDefinition[] = [];

  for (const journey of Object.values(JOURNEY_TELEMETRY)) {
    for (const event of Object.values(journey)) {
      if (event.funnel_step) {
        events.push(event);
      }
    }
  }

  return events.sort((a, b) => (a.funnel_step || 0) - (b.funnel_step || 0));
}
```

### Day 3: Create Funnel Definitions

**File**: `packages/analytics/src/funnel-definitions.ts`

```typescript
import { JOURNEY_TELEMETRY, getFunnelSteps } from "./journey-registry";

export interface FunnelStep {
  event: string;
  name: string;
  terminal?: boolean;
}

export interface FunnelDefinition {
  name: string;
  steps: FunnelStep[];
  breakdown_by?: string[];
  timing?: {
    max_duration_days?: number;
  };
  kpi?: string;
  description?: string;
}

export const FUNNELS = {
  CORE_ACTIVATION: {
    name: "Core Activation Funnel",
    steps: [
      {
        event: "waitlist_joined",
        name: "Waitlist Join",
      },
      {
        event: "auth.approval.received",
        name: "OAuth Complete",
      },
      {
        event: "extension_activated",
        name: "Extension Activated",
      },
      {
        event: "snapshot_created",
        name: "First Snapshot",
        terminal: true,
      },
    ],
    breakdown_by: ["platform", "referral_source"],
    timing: {
      max_duration_days: 30,
    },
    kpi: "conversion_rate",
    description:
      "Track users through complete onboarding from signup to first protection action",
  },

  PRO_CONVERSION: {
    name: "Pro Tier Adoption",
    steps: [
      {
        event: "apikey_created",
        name: "API Key Created",
      },
      {
        event: "mcp_checkpoint_created",
        name: "First Pro Tool Used",
        terminal: true,
      },
    ],
    breakdown_by: ["tier"],
    timing: {
      max_duration_days: 7,
    },
    kpi: "pro_adoption_rate",
    description: "Track Free → Solo conversion through Pro feature usage",
  },

  RECOVERY_ACTIVATION: {
    name: "Error Recovery Funnel",
    steps: [
      {
        event: "save_attempt",
        name: "High-Risk Save Detected",
      },
      {
        event: "snapshot_created",
        name: "Auto Snapshot Created",
      },
      {
        event: "session_restored",
        name: "Session Restored",
        terminal: true,
      },
    ],
    kpi: "recovery_success_rate",
    description: "Track risk detection → protection → recovery flow",
  },
} as const;
```

### Day 4: Create Tests

```bash
pnpm --filter @snapback/analytics test --run
pnpm type-check
```

### Day 5: Document Registry

Create `packages/analytics/README.md`:

```markdown
# Analytics Package

## Event Registry

All user journey events are defined in `journey-registry.ts`.

### Getting Started

```typescript
import { JOURNEY_TELEMETRY, getEventsByPlatform } from '@snapback/analytics';

// Get all events for web platform
const webEvents = getEventsByPlatform('web');

// Get funnel steps in order
import { getFunnelSteps } from '@snapback/analytics';
const steps = getFunnelSteps();
```

### Adding New Events

1. Add schema to `packages/contracts/src/events/journey-events.ts`
2. Add to `JOURNEY_TELEMETRY` in `journey-registry.ts`
3. If part of funnel, add to `FUNNELS` in `funnel-definitions.ts`
4. Run tests and type-check
```

---

## Week 3: Integration & Wiring

### Day 1: Web Dashboard Integration

**File**: `apps/web/modules/saas/dashboard/lib/analytics.ts`

```typescript
import { JOURNEY_TELEMETRY } from "@snapback/analytics";
import { posthog } from "@snapback/infrastructure";

export async function trackDashboardView(tab: string, hasData: boolean) {
  const event = JOURNEY_TELEMETRY.DASHBOARD.VIEWED;

  posthog.capture(event.event, {
    tab,
    has_data: hasData,
    session_duration_ms: performance.now(),
    $groups: {
      organization: "org_123", // from auth context
    },
  });
}
```

### Day 2: Extension Integration

**File**: `apps/vscode/src/telemetry/journey-tracker.ts`

```typescript
import { JOURNEY_TELEMETRY } from "@snapback/analytics";
import { posthog } from "@snapback/infrastructure";

export async function trackExtensionActivated(
  activationTimeMs: number
) {
  const event = JOURNEY_TELEMETRY.EXTENSION.ACTIVATED;

  posthog.capture(event.event, {
    activation_time_ms: activationTimeMs,
  });
}
```

### Day 3: MCP Server Integration

**File**: `apps/mcp-server/src/telemetry/journey-tracker.ts`

```typescript
import { JOURNEY_TELEMETRY } from "@snapback/analytics";
import { posthog } from "@snapback/infrastructure";

export async function trackCheckpointCreated(
  filesCount: number,
  totalSizeBytes: number
) {
  const event = JOURNEY_TELEMETRY.MCP.CHECKPOINT_CREATED;

  posthog.capture(event.event, {
    files_count: filesCount,
    total_size_bytes: totalSizeBytes,
  });
}
```

### Day 4: CLI Integration

**File**: `apps/cli/src/telemetry/journey-tracker.ts`

```typescript
import { JOURNEY_TELEMETRY } from "@snapback/analytics";

export async function trackSnapshotCreated(
  filesCount: number,
  sizeBytes: number
) {
  const event = JOURNEY_TELEMETRY.EXTENSION.FIRST_PROTECTED_SAVE;
  // CLI uses same snapshot event as extension
}
```

### Day 5: PostHog Funnel Sync

**File**: `apps/api/modules/analytics/procedures/sync-funnels.ts`

```typescript
import { publicProcedure } from "@/orpc/procedures";
import { FUNNELS } from "@snapback/analytics";
import { getPostHog } from "@/lib/posthog";

export const syncFunnelsToPostHog = publicProcedure.handler(async () => {
  const posthog = getPostHog();

  for (const [key, funnel] of Object.entries(FUNNELS)) {
    const steps = funnel.steps.map((step, index) => ({
      name: step.name,
      event: step.event,
      order: index,
    }));

    // Create insight in PostHog
    console.log(`Creating funnel: ${funnel.name}`);
    console.log(`Steps: ${steps.map((s) => s.name).join(" → ")}`);

    // In production, use PostHog API to create insight
    // await posthog.createInsight({
    //   name: funnel.name,
    //   type: 'funnels',
    //   ...
    // });
  }
});
```

---

## Week 4: Validation & Launch

### Day 1-2: End-to-End Testing

```bash
# Test event emission
npm run test:e2e -- tests/telemetry.e2e.ts

# Manual testing checklist:
# [ ] Extension emits events to PostHog
# [ ] Web dashboard emits events
# [ ] CLI emits events
# [ ] MCP server emits events
# [ ] PostHog receives all events within 5 seconds
```

### Day 3: Dashboard & Alerts

1. Create PostHog dashboards for each funnel
2. Set up alerts:
   - Core Activation drop below 0.1%
   - Pro Conversion drop below 5%
   - Recovery Success below 80%

### Day 4: Documentation & Handoff

```bash
# Generate telemetry documentation
npm run docs:telemetry

# Outputs:
# - README with all events
# - TypeScript definitions
# - PostHog schema
```

### Day 5: Launch & Monitor

- [ ] Deploy to staging
- [ ] Verify events in PostHog
- [ ] Deploy to production
- [ ] Monitor first 24 hours
- [ ] Set up on-call rotation for alerts

---

## Files to Create

```
packages/analytics/src/
├── journey-registry.ts           (Week 2, Day 1-2)
├── funnel-definitions.ts         (Week 2, Day 3)
├── cohort-definitions.ts         (optional)
├── __tests__/
│   ├── journey-registry.test.ts  (Week 2, Day 4)
│   ├── funnel-definitions.test.ts
│   └── ...
└── README.md                     (Week 2, Day 5)

packages/contracts/src/events/
├── journey-events.ts             (Week 1, Day 1-2)
└── __tests__/
    └── journey-events.test.ts    (Week 1, Day 4-5)

apps/web/modules/saas/dashboard/
├── lib/
│   └── analytics.ts              (Week 3, Day 1)

apps/vscode/src/telemetry/
├── journey-tracker.ts            (Week 3, Day 2)

apps/mcp-server/src/telemetry/
├── journey-tracker.ts            (Week 3, Day 3)

apps/api/modules/analytics/
├── procedures/
│   └── sync-funnels.ts           (Week 3, Day 5)
```

---

## Success Criteria

- ✅ All 24 journeys have telemetry events
- ✅ Events follow PostHog naming conventions
- ✅ Config-based registry with single source of truth
- ✅ Type-safe event tracking across all platforms
- ✅ Funnel definitions in PostHog
- ✅ 100% test coverage for event schemas
- ✅ Privacy compliance verified
- ✅ Funnels tracking conversion rates
- ✅ Cohorts defined for analysis
- ✅ Dashboards created in PostHog

---

**Estimated Effort**: 160 hours (4 weeks × 40 hours)
**Team Size**: 1-2 engineers
**ROI**: Data-driven product decisions enabled
