# TDD Implementation Guide - System Delta Closure
**Status:** RED Phase Complete ✅ | **Next:** GREEN Phase  
**Last Updated:** Dec 3, 2025 | **Organized by:** Contextual ROI

---

## Overview

This guide coordinates the TDD (Test-Driven Development) implementation across 8 phases to close the gap identified in `SYSTEM_DELTA_ANALYSIS.md`.

**Current Status:**
- ✅ **PHASE 1 (RED):** All critical RED tests written (281 + 285 + 414 = 980 lines)
- 🟡 **PHASE 2-8:** Ready for GREEN implementation

---

## Phase 1: RED Tests ✅ COMPLETE

### Test Files Created

1. **User Metrics Aggregation** (280 lines)
   - File: `/packages/platform/test/user-metrics-aggregation.spec.ts`
   - Coverage: Table schema, aggregation accuracy, edge cases
   - Tests failing: ✅ 7 test suites, 28 assertions

2. **Lifecycle State Machine** (285 lines)
   - File: `/apps/api/modules/lifecycle/tests/lifecycle-state-machine.red.test.ts`
   - Coverage: State transitions, triggers, integration
   - Tests failing: ✅ 6 test suites, 35+ assertions

3. **Device Auth Flow** (414 lines)
   - File: `/apps/api/modules/auth/tests/device-auth-flow.red.test.ts`
   - Coverage: RFC 8628 Device Authorization, polling, security
   - Tests failing: ✅ 9 test suites, 45+ assertions

**Total RED Test Lines:** 980
**Total Test Assertions:** 100+

---

## Phase 2: Database Schema (GREEN)

### Tables to Create (in order)

#### 1. `user_daily_metrics` (40-50 LOC)
**File:** `/packages/platform/src/db/schema/snapback/user-daily-metrics.ts`

Schema:
```typescript
export const userDailyMetrics = pgTable(
  "user_daily_metrics",
  {
    id: text("id").primaryKey().$defaultFn(() => cuid()),
    userId: text("user_id").notNull().references(() => user.id),
    date: timestamp("date").notNull(),
    snapshotsCreated: integer("snapshots_created").default(0),
    restoresPerformed: integer("restores_performed").default(0),
    minutesSavedEstimate: integer("minutes_saved_estimate"), // NULL allowed
    aiSessions: integer("ai_sessions").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_daily_metrics_user_id_idx").on(table.userId),
    dateIdx: index("user_daily_metrics_date_idx").on(table.date),
    userDateUnique: unique("user_daily_metrics_user_id_date_unique").on(table.userId, table.date),
  })
);
```

**Key Points:**
- ✅ Unique constraint on (user_id, date)
- ✅ Indexes for efficient queries
- ✅ Nullable minutes_saved (handle NULL gracefully)

---

#### 2. `user_product_metrics` (40-50 LOC)
**File:** `/packages/platform/src/db/schema/snapback/user-product-metrics.ts`

Schema:
```typescript
export const userProductMetrics = pgTable(
  "user_product_metrics",
  {
    userId: text("user_id").primaryKey().references(() => user.id),
    snapshotsTotal: integer("snapshots_total").default(0),
    restoresTotal: integer("restores_total").default(0),
    minutesSavedTotal: integer("minutes_saved_total").default(0),
    firstSeenAt: timestamp("first_seen_at"),
    lastSeenAt: timestamp("last_seen_at"),
    lastWeekSnapshots: integer("last_week_snapshots").default(0),
    lastWeekRestores: integer("last_week_restores").default(0),
    lastWeekMinutesSaved: integer("last_week_minutes_saved").default(0),
    primaryClientType: text("primary_client_type"), // 'vscode' | 'cli' | 'web'
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);
```

**Key Points:**
- 🟡 This is denormalized from `user_daily_metrics`
- Can be a materialized view or table updated by aggregation job
- Recommendation: Start as table, migrate to view later

---

#### 3. `user_lifecycle_state` (30-40 LOC)
**File:** `/packages/platform/src/db/schema/snapback/user-lifecycle-state.ts`

Schema:
```typescript
export const userLifecycleState = pgTable(
  "user_lifecycle_state",
  {
    userId: text("user_id").primaryKey().references(() => user.id),
    retentionStage: text("retention_stage").notNull() // 'new' | 'engaged' | 'power_user' | 'at_risk' | 'churned'
      .$defaultFn(() => "new"),
    lastTransitionAt: timestamp("last_transition_at").defaultNow(),
    lastSnapshotAt: timestamp("last_snapshot_at"),
    snapshotCountTotal: integer("snapshot_count_total").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    retentionStageIdx: index("user_lifecycle_state_retention_stage_idx").on(table.retentionStage),
    lastTransitionIdx: index("user_lifecycle_state_last_transition_idx").on(table.lastTransitionAt),
  })
);
```

---

#### 4. `user_analytics_identities` (20-30 LOC)
**File:** `/packages/platform/src/db/schema/snapback/user-analytics-identities.ts`

Maps one SnapBack user to multiple analytics platforms:
```typescript
export const userAnalyticsIdentities = pgTable(
  "user_analytics_identities",
  {
    userId: text("user_id").primaryKey().references(() => user.id),
    posthogDistinctId: text("posthog_distinct_id").notNull().unique(),
    hubspotContactId: text("hubspot_contact_id"),
    resendContactId: text("resend_contact_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);
```

---

#### 5. `protection_decisions` (50-60 LOC)
**File:** `/packages/platform/src/db/schema/snapback/protection-decisions.ts`

ML training data (decision logs with outcome labels):
```typescript
export const protectionDecisions = pgTable(
  "protection_decisions",
  {
    id: text("id").primaryKey().$defaultFn(() => cuid()),
    userId: text("user_id").references(() => user.id),
    anonymousId: text("anonymous_id"),
    snapshotId: text("snapshot_id").references(() => snapshots.id),
    // Decision inputs (features)
    riskScore: integer("risk_score"), // 0-100
    aiDetected: boolean("ai_detected").default(false),
    criticalFilesChanged: integer("critical_files_changed").default(0),
    // Decision output
    decisionSnapshot: boolean("decision_snapshot").notNull(), // Did we create snapshot?
    algorithmVersion: text("algorithm_version").default("v1"),
    // Outcome labels (for ML training)
    restoredWithin24h: boolean("restored_within_24h"),
    userMarkedHelpful: boolean("user_marked_helpful"),
    userMarkedAnnoying: boolean("user_marked_annoying"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("protection_decisions_user_id_idx").on(table.userId),
    snapshotIdIdx: index("protection_decisions_snapshot_id_idx").on(table.snapshotId),
  })
);
```

---

#### 6. `nurture_track` (30-40 LOC)
**File:** `/packages/platform/src/db/schema/snapback/nurture-track.ts`

Email sequencing and enrollment tracking:
```typescript
export const nurtureTrack = pgTable(
  "nurture_track",
  {
    id: text("id").primaryKey().$defaultFn(() => cuid()),
    userId: text("user_id").notNull().references(() => user.id),
    trackName: text("track_name").notNull(), // 'new_user' | 'engaged' | 'power_user'
    stepIndex: integer("step_index").default(0), // Current email in sequence
    enrolledAt: timestamp("enrolled_at").defaultNow(),
    sentAt: timestamp("sent_at"),
    completedAt: timestamp("completed_at"),
    skippedAt: timestamp("skipped_at"),
    bounced: boolean("bounced").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("nurture_track_user_id_idx").on(table.userId),
    trackNameIdx: index("nurture_track_track_name_idx").on(table.trackName),
  })
);
```

---

### Migration Steps

1. **Create schema files** in `/packages/platform/src/db/schema/snapback/`
2. **Update exports** in `/packages/platform/src/db/schema/snapback/index.ts`
3. **Run drizzle generate:**
   ```bash
   pnpm run db:generate
   ```
4. **Verify migrations create cleanly:**
   ```bash
   ls packages/platform/drizzle/migrations/
   ```

**Expected files:**
- `0007_user_metrics.sql`
- `0008_lifecycle.sql`
- `0009_protection_decisions.sql`
- `0010_analytics_identity.sql`
- `0011_nurture_track.sql`

---

## Phase 3: Business Logic Services (GREEN)

### Services to Implement

#### 1. MetricsAggregator (80-100 LOC)
**File:** `/apps/api/modules/analytics/services/MetricsAggregator.ts`

```typescript
export class MetricsAggregator {
  /**
   * Aggregate daily metrics from snapshots table
   * Called nightly to populate user_daily_metrics
   */
  async aggregateDailyMetrics(date: Date): Promise<void> {
    // For each user with snapshots on date:
    // 1. Count snapshots created
    // 2. Count restores performed
    // 3. Estimate minutes saved (see formula below)
    // 4. Count AI sessions
    // 5. Upsert into user_daily_metrics
  }

  /**
   * Calculate lifetime metrics from daily aggregates
   */
  async aggregateLifetimeMetrics(userId: string): Promise<void> {
    // SELECT SUM(*) FROM user_daily_metrics WHERE user_id = ?
    // Upsert into user_product_metrics
  }

  /**
   * Calculate 7-day rolling window
   */
  async calculateRollingMetrics(userId: string): Promise<void> {
    // SELECT SUM(*) FROM user_daily_metrics 
    // WHERE user_id = ? AND date >= NOW() - INTERVAL 7 DAY
  }
}
```

**Minutes Saved Estimation Formula:**
```typescript
function estimateMinutesSaved(restore: RestoreEvent): number {
  const baseMinutes = 5; // Base time to re-do work
  const filesMultiplier = Math.min(restore.filesRestored / 3, 3); // Cap at 3x
  const aiBonus = restore.aiDetected ? 5 : 0;
  const criticalBonus = restore.criticalFiles > 0 ? 5 : 0;

  return Math.round(baseMinutes + (baseMinutes * filesMultiplier) + aiBonus + criticalBonus);
  // Range: 5-25 minutes per restore
}
```

---

#### 2. LifecycleEngine (80-100 LOC)
**File:** `/apps/api/modules/lifecycle/services/LifecycleEngine.ts`

```typescript
export class LifecycleEngine {
  /**
   * Transition user to new stage based on event/conditions
   */
  async transitionUserStage(userId: string, trigger: string): Promise<void> {
    const user = await this.getCurrentState(userId);
    const nextStage = this.calculateNextStage(user, trigger);
    
    if (nextStage === user.retentionStage) return; // No change
    
    // 1. Update user_lifecycle_state
    // 2. Emit event for PostHog
    // 3. Trigger EmailOrchestrator for enrollment
    // 4. Trigger HubspotSyncService
  }

  /**
   * Check if user qualifies for transition
   */
  private calculateNextStage(user: User, trigger: string): LifecycleStage {
    // new → engaged: snapshot_created
    // engaged → power_user: snapshots >= 50 AND active >= 7 days
    // engaged → at_risk: inactive >= 3 days
    // at_risk → churned: inactive >= 30 days
    // at_risk → engaged: snapshot_created (recovery)
  }
}
```

---

#### 3. DeviceAuthHandler (100-120 LOC)
**File:** `/apps/api/modules/auth/services/DeviceAuthHandler.ts`

```typescript
export class DeviceAuthHandler {
  /**
   * Request device code for extension auth (RFC 8628)
   */
  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    // 1. Generate device_code (random 32 chars)
    // 2. Generate user_code (4-4 format)
    // 3. Store with 15-min TTL
    // 4. Return verification_uri
  }

  /**
   * Poll for token (extension calls repeatedly)
   */
  async pollForToken(deviceCode: string): Promise<TokenResponse | TokenError> {
    // 1. Validate device_code exists and not expired
    // 2. Check if approved in browser
    // 3. If yes: generate API key and return
    // 4. If no: return authorization_pending
    // 5. If expired: return expired_token
  }

  /**
   * Browser approves device code after OAuth
   */
  async markDeviceCodeApproved(userCode: string, userId: string): Promise<void> {
    // Called by /auth/device callback after OAuth success
    // 1. Lookup device_code by user_code
    // 2. Mark approved_by_user_id = userId
    // 3. Generate API key
  }
}
```

---

#### 4. KeyValidator (40-60 LOC)
**File:** `/apps/api/modules/auth/services/KeyValidator.ts`

```typescript
export class KeyValidator {
  private lastValidated = new Map<string, number>(); // userId → timestamp
  private readonly VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 min

  /**
   * Periodically validate API key is still active
   * (background check, not on every request)
   */
  async validateIfNeeded(apiKey: string): Promise<boolean> {
    const userId = await this.getUserIdFromKey(apiKey);
    const lastCheck = this.lastValidated.get(userId);

    if (lastCheck && Date.now() - lastCheck < this.VALIDATION_INTERVAL) {
      return true; // Cached, assume valid
    }

    // Check database: is this key revoked?
    const key = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, hashKey(apiKey)),
    });

    if (!key || key.revokedAt !== null) {
      return false; // Key revoked or not found
    }

    this.lastValidated.set(userId, Date.now());
    return true;
  }
}
```

---

## Phase 4: API Routes (GREEN)

### Metrics Router
**File:** `/apps/api/modules/metrics/router.ts`

```typescript
export const metricsRouter = protectedProcedure.router({
  getMyUsage: procedure that returns {
    snapshots_total, restores_total, minutes_saved_total,
    ai_sessions_detected
  },
  
  getMyTimeline: procedure that returns [{
    date, snapshots_created, restores_performed, minutes_saved_estimate
  }],
  
  getMyUsageLimits: procedure that returns {
    snapshots_used, snapshots_limit,
    cloud_storage_used_mb, cloud_storage_limit_mb
  },
});
```

### Growth Router (Admin)
**File:** `/apps/api/modules/growth/router.ts`

```typescript
export const growthRouter = adminProcedure.router({
  transitionLifecycle: (userId, trigger),
  syncHubspot: (userId),
  triggerEmail: (userId, trackName, stepIndex),
});
```

---

## Phase 5: Telemetry & Events

### Event Naming Consistency
**File:** `/packages/infrastructure/src/metrics/core/events.ts`

Fix inconsistent naming (currently mixes `snake_case` and `dot.notation`):

```typescript
// BEFORE (inconsistent)
'welcome_panel_shown'      // snake_case
'auth_login_completed'     // snake_case
'extension.activated'      // dot notation

// AFTER (consistent)
'welcome.panel_shown'      // all dots
'auth.flow_completed'      // all dots
'extension.activated'      // all dots
```

### Funnel Diagnostic Events
Add missing events to `AnalyticsEvents`:

```typescript
'welcome.panel_shown',          // When welcome component appears
'auth.flow_started',            // When user clicks "Sign in"
'auth.provider_selected',       // GitHub or Google chosen
'auth.browser_opened',          // Browser actually launched
'auth.callback_received',       // Callback hit extension
'auth.exchange_started',        // Code→token exchange begins
'auth.flow_completed',          // API key received (rename from auth_login_completed)
```

---

## Phase 6: Growth Integration

### Lifecycle Triggers
Wire LifecycleEngine into event handlers:
- On `snapshot_created` → check if `new` → transition to `engaged`
- On daily cron → check all users for transitions

### Email Orchestrator
**File:** `/apps/api/modules/growth/services/EmailOrchestrator.ts`

Manages nurture track enrollment and email scheduling.

### HubSpot Sync
**File:** `/apps/api/modules/growth/services/HubspotSyncService.ts`

Maps user metrics to HubSpot contact fields:
- `snapback_snapshots_7d`
- `snapback_restores_7d`
- `snapback_lifecycle_stage`

---

## Phase 7: Quality Assurance

### E2E Tests to Add

1. **Activation Funnel** (install → activate → welcome → auth → first snapshot)
2. **Lifecycle Flow** (new → engaged → power_user with email triggers)
3. **Metrics Aggregation** (create snapshots → verify daily → verify lifetime)

### Performance Checks
- ✅ `user_daily_metrics` query with 100K users: < 100ms
- ✅ Aggregation job: < 5 seconds
- ✅ Bundle size increase: < 50KB

### CI Integration
Update GitHub Actions to run critical path tests.

---

## Phase 8: Deployment

### Order of Operations
1. **Schema** → migrations apply cleanly
2. **Services** → business logic tested
3. **Routes** → endpoints working
4. **Telemetry** → events wired
5. **Growth** → full pipeline end-to-end

### Staging Verification
- [ ] All migrations run without data loss
- [ ] E2E flows work end-to-end
- [ ] Performance meets targets
- [ ] No regressions

### Production Rollout
- [ ] Deploy with feature flags (if needed)
- [ ] Monitor metrics dashboard
- [ ] Verify funnel funnels (activation)
- [ ] Verify email sending
- [ ] Verify HubSpot sync

---

## Key Implementation Rules (Repo Standards)

### TypeScript Patterns
✅ Use discriminated unions for state (from `always-typescript-patterns.md`):
```typescript
type UserState = 
  | { status: "new" }
  | { status: "engaged"; engagementDays: number }
  | { status: "power_user"; snapshotCount: number };
```

### Monorepo Imports
✅ Always use `@snapback/*` for cross-package imports (from `always-monorepo-imports.md`):
```typescript
import { db } from "@snapback/platform";
import { logger } from "@snapback/infrastructure";
// NOT: import { db } from "../../packages/platform/src"
```

### Result Type Pattern
✅ Use `Result<T, E>` for expected failures (from `always-result-type-pattern.md`):
```typescript
async function transitionUser(userId: string): Promise<Result<void, LifecycleError>> {
  // ...
  return Ok(undefined);
}
```

### Testing
✅ Follow TDD: RED → GREEN → REFACTOR

✅ Run tests before committing:
```bash
pnpm test:critical-paths
```

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| RED tests written | ✅ 100% (980 LOC) | COMPLETE |
| Schema created | GREEN Phase | IN_PROGRESS |
| Services implemented | GREEN Phase | PENDING |
| API routes working | Phase 4 | PENDING |
| E2E tests passing | Phase 7 | PENDING |
| Test coverage | 85%+ | PENDING |
| Performance budget | < 100ms queries | PENDING |

---

## Next Steps

1. ✅ RED Phase complete
2. 🟡 **Start GREEN Phase:** Implement `user_daily_metrics` schema
3. 🟡 Implement MetricsAggregator service
4. 🟡 Implement LifecycleEngine service
5. 🟡 Implement DeviceAuthHandler
6. 🟡 Wire all services into endpoints
7. 🟡 E2E test full pipeline
8. 🟡 Deploy to production

**Estimated Timeline:** 14 days (2 weeks)

---

## Document References

- **Architecture:** `/SYSTEM_DELTA_ANALYSIS.md`
- **TypeScript Rules:** `always-typescript-patterns.md`
- **Import Rules:** `always-monorepo-imports.md`
- **Result Pattern:** `always-result-type-pattern.md`
- **Testing:** `development_test_specification` memory
