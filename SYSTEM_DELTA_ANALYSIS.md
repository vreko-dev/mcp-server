# SnapBack System Delta Analysis
**Current vs Target (Architecture + Feedback)** | **Last Updated:** Dec 3, 2025

---

## Executive Summary

Your system is **~60% aligned** with the target architecture. The gaps are strategic, not chaotic:
- ✅ **Foundation solid**: Auth, API keys, snapshots, dashboard metrics are implemented
- ⚠️ **Growth layer incomplete**: Lifecycle tracking, nurture paths, email integration not connected
- 📊 **Telemetry over-engineered**: Multiple event clients when one would suffice
- 🎯 **Recommendation**: Simplify before scaling (consolidate, then connect)

---

## 1. DATABASE SCHEMA / MIGRATIONS DELTA

### Current State (35 schema files)

✅ **Implemented Tables:**
| Table | Status | Notes |
|-------|--------|-------|
| `user` (Better Auth) | ✅ Ready | Foundation provided by Better Auth |
| `account`, `session`, `verification` | ✅ Ready | OAuth + session mgmt |
| `api_keys` | ✅ Ready | Long-lived tokens for clients |
| `extension_link_tokens` | ✅ Ready | Short-lived device auth |
| `extension_sessions` | ✅ Ready | Extension connection tracking |
| `snapshots` | ✅ Ready | Checkpoint storage |
| `featureUsage` | ✅ Ready | Feature tracking (AI detection, etc.) |
| `org_daily_metrics` | ✅ Ready | Organization-level daily aggregation |
| `audit_logs` | ✅ Ready | Compliance & security logging |
| `retention_config` | ✅ Ready | Data retention policies |
| `subscriptions` | ✅ Ready | Billing tier tracking |
| `teams` | ✅ Ready | Team/organization management |

❌ **Missing (Architecture-Critical):**
| Table | Purpose | Priority | Lines of Code |
|-------|---------|----------|----------------|
| `user_product_metrics` | Lifetime aggregation (snapshots, restores, minutes_saved) | 🔴 HIGH | 40-50 |
| `user_daily_metrics` | Daily aggregation per user (for emails, trend charts) | 🔴 HIGH | 40-50 |
| `user_lifecycle_state` | Stage machine (new→engaged→power_user) | 🔴 HIGH | 30-40 |
| `user_analytics_identities` | PostHog/HubSpot/Resend ID mapping | 🟠 MEDIUM | 20-30 |
| `protection_decisions` | ML training data (decision logs + outcomes) | 🟠 MEDIUM | 50-60 |

### Simplification Recommendation

**Current Approach** (Complex):
- `org_daily_metrics` exists
- Plan separate `user_daily_metrics` + `user_product_metrics`
- Separate `user_analytics_identities`
- Separate `protection_decisions`

**Simplified Approach** (Recommended):
```sql
-- SINGLE aggregation table per scope
user_daily_metrics (date, user_id, snapshots, restores, minutes_saved_est, ai_sessions)
  ↓ 
user_product_metrics = SELECT SUM(...) FROM user_daily_metrics (materialized view)

org_daily_metrics (already exists, keep as-is)

-- SINGLE identity bridge
user_analytics_map (user_id → posthog_distinct_id, hubspot_id, resend_id)

-- SINGLE training table  
protection_decisions (with outcome_labeled_at, restored_within_24h boolean)
```

### Migration Checklist

```typescript
// File: packages/platform/src/db/schema/snapback/user-metrics.ts
// PRIORITY: 🔴 HIGH - blocks dashboard/email pipeline

// File: packages/platform/src/db/schema/snapback/user-lifecycle.ts  
// PRIORITY: 🔴 HIGH - blocks nurture flow

// File: packages/platform/src/db/schema/snapback/protection-decisions.ts
// PRIORITY: 🟠 MEDIUM - blocks ML training

// File: packages/platform/src/db/schema/snapback/user-analytics-identity.ts
// PRIORITY: 🟠 MEDIUM - blocks growth integration

// Then update: packages/platform/drizzle.config.ts
// Then run: pnpm run db:generate && pnpm run db:migrate
```

---

## 2. TEST SCENARIOS DELTA

### Test Coverage Summary

**Total test files found:** 25  
**Coverage estimate:** ~40% of critical paths

### ✅ Well-Covered Areas

| Component | Tests Found | Status |
|-----------|-------------|--------|
| API Keys (create, list, revoke) | ✅ `api-keys.test.ts` | COMPLETE |
| Snapshots CRUD | ✅ `snapshots.test.ts` | COMPLETE |
| Risk Analysis | ✅ `risk-analysis.test.ts` | COMPLETE |
| Telemetry Ingestion | ✅ `ingest-events.test.ts` | COMPLETE |
| Feature Flags | ✅ `get-user-flags.test.ts` | COMPLETE |
| Privacy Controls | ✅ `privacy-controls.test.ts` | COMPLETE |
| CLI Restore | ✅ `restore.test.ts` | COMPLETE |
| MCP Integration | ✅ `snapback-api.test.ts` | COMPLETE |

### ❌ Critical Gaps (Industry-Leading Quality Requires)

| Scenario | Why Missing | Impact | Est. Lines |
|----------|------------|--------|-----------|
| **User Metrics Aggregation** | `user_daily_metrics` table missing | Dashboard shows wrong stats | 100 |
| **Lifecycle State Machine** | No `user_lifecycle_state` table | Can't segment users for nurture | 80 |
| **Nudge Rate Limiting** | Race condition in concurrent nudges | User sees duplicate prompts | 40 |
| **Device Auth Flow** | Not implemented yet | Auth fails on WSL/Remote SSH | 120 |
| **Key Rotation** | No revocation detection | User doesn't know key is invalid | 60 |
| **Funnel Breakdown Events** | Only happy path tracked | Can't debug drop-offs (critical!) | 50 |
| **Lifecycle Transitions** | No state machine tests | Segments bleed between stages | 90 |
| **HubSpot Sync** | Webhook handler exists but no e2e test | Can't verify contacts update | 70 |
| **Email Orchestration** | Only generic handler, no trigger logic | Nurture emails never sent | 150 |
| **PostHog Cohorts** | No cohort definition tests | Can't verify funnel funnels work | 60 |

### Priority Test Implementation

**Phase 1 (This Week): BLOCKING**
```typescript
// packages/platform/test/user-metrics.spec.ts
// - Daily metrics aggregation from snapshots
// - Lifetime metrics calculation (sum daily)
// - Null/zero edge cases

// apps/api/modules/lifecycle/tests/lifecycle-state-machine.test.ts
// - Transitions: new → engaged → power_user
// - Prevent invalid transitions
// - Trigger handlers on state change

// apps/api/modules/extension/tests/device-auth-flow.test.ts  
// - Request device code
// - Poll for token completion
// - Handle expiration
```

**Phase 2 (Next Week): HIGH**
```typescript
// apps/api/modules/auth/tests/key-validation.test.ts
// - Background validation check (5 min interval)
// - Revoked key detection
// - Clear + re-auth prompt

// apps/api/modules/nudge/tests/nudge-rate-limit.test.ts
// - Concurrent request handling
// - In-memory + persistent throttle
// - Session-level + 24h window

// apps/api/modules/telemetry/tests/funnel-events.test.ts
// - Install → Activate → Welcome → Auth → First Snapshot
// - Diagnostic breakpoints (browser_opened, callback_received)
```

**Phase 3 (Growth): MEDIUM**
```typescript
// apps/api/modules/growth/tests/email-trigger.test.ts
// - Trigger conditions (first_restore, 7d_milestone, inactive_3d)
// - Template selection
// - Resend API mocking

// apps/api/modules/growth/tests/hubspot-sync.test.ts
// - User property sync
// - Lifecycle field mapping
// - Retry on failure
```

### Test Quality Gate

Add to `package.json`:
```json
{
  "scripts": {
    "test:critical-paths": "vitest --run packages/platform/test/*.spec.ts apps/api/modules/*/tests/*.test.ts --coverage --coverage.thresholds.statements=85"
  }
}
```

---

## 3. API ROUTES DELTA

### Current Routes (By Router)

✅ **Fully Implemented:**
| Router | Endpoints | Status |
|--------|-----------|--------|
| `apiKeys` | POST create, GET list, POST revoke | ✅ 3/3 |
| `dashboard` | GET metrics, stats, activity, subscription, org metrics | ✅ 6/6 |
| `auth` | Better Auth (sign-in, sign-out, get-session) | ✅ 3/3 |
| `snapshots` | List, restore, create | ✅ 3/3 |
| `organizations` | Create, get, list, update | ✅ 4/4 |
| `users` | Get profile, update settings | ✅ 2/2 |
| `payments` | Webhook handler | ✅ 1/1 |
| `telemetry` | Ingest events | ✅ 1/1 |

❌ **Missing Routes (Architecture-Required):**

#### Category 1: Authentication (Feedback.md Issue #1)
| Route | Purpose | Priority | Est. Code |
|-------|---------|----------|-----------|
| `POST /api/auth/device-code` | Request device authorization | 🔴 BLOCKING | 60 |
| `POST /api/auth/device-token` | Poll for device auth completion | 🔴 BLOCKING | 80 |
| `POST /api/keys/validate` | Background key validation | 🟠 HIGH | 40 |
| `GET /api/auth/extension-grant` | Grant API key after OAuth | 🟠 HIGH | 50 |

#### Category 2: Metrics (Architecture.md Part 8)
| Route | Purpose | Priority | Est. Code |
|-------|---------|----------|-----------|
| `GET /api/metrics/my-usage` | Lifetime stats (snapshots, restores, minutes_saved) | 🔴 HIGH | 80 |
| `GET /api/metrics/my-timeline` | Daily trends (for dashboard chart) | 🔴 HIGH | 70 |
| `GET /api/metrics/my-usage-limits` | Free tier limits check | 🟠 HIGH | 40 |

#### Category 3: Growth (Architecture.md Part 7)
| Route | Purpose | Priority | Est. Code |
|-------|---------|----------|-----------|
| `POST /api/growth/lifecycle/transition` | Update user stage (internal, triggered by events) | 🔴 HIGH | 50 |
| `POST /api/growth/sync/hubspot` | Sync user → HubSpot (internal, cron-triggered) | 🟠 MEDIUM | 100 |
| `POST /api/growth/email/trigger` | Queue email via Resend (internal, triggered by lifecycle) | 🟠 MEDIUM | 60 |

#### Category 4: Events (Feedback.md Issue #2)
| Route | Purpose | Priority | Est. Code |
|-------|---------|----------|-----------|
| `POST /api/telemetry/funnel-event` | Track funnel diagnostic events | 🟠 HIGH | 40 |
| Already: `POST /api/telemetry/events` | Ingest all telemetry | ✅ | - |

### Simplified API Architecture

**Current Organization:**
```
/api/
  /auth/...
  /snapshots/...
  /dashboard/...
  /apiKeys/...
  /metrics/... (partial, scattered across dashboard)
  /growth/... (missing)
  /telemetry/...
```

**Recommended Structure:**
```
/api/
  /auth/
    /sign-in, /sign-out, /get-session (Better Auth)
    /device-code, /device-token (Device Flow)
    /keys/validate (Key Rotation)
  /snapshots/
    /list, /get, /restore, /create
  /metrics/  ← CONSOLIDATE dashboard + new endpoints
    /me/usage (lifetime: snapshots, restores, minutes_saved)
    /me/timeline (daily aggregation)
    /me/usage-limits (free tier)
  /dashboard/ ← Keep for now, but defer to /metrics after migration
  /growth/ ← NEW ROUTER
    /lifecycle/transition (internal)
    /sync/hubspot (internal)
    /email/trigger (internal)
  /telemetry/
    /events (ingest)
    /funnel-event (diagnostic)
```

### Router Implementation Checklist

```typescript
// apps/api/modules/metrics/router.ts - NEW
export const metricsRouter = protectedProcedure.router({
  getMyUsage,      // lifetime snapshot/restore/minutes
  getMyTimeline,   // daily aggregation for charts
  getMyUsageLimits,// free tier validation
});

// apps/api/modules/growth/router.ts - NEW  
export const growthRouter = protectedProcedure.router({
  // Private (admin only)
  transitionLifecycle, // internal trigger
  syncHubspot,         // internal cron
  triggerEmail,        // internal event handler
});

// apps/api/modules/auth/procedures/ - ADD
export const requestDeviceCode,
             pollDeviceToken,
             validateApiKey;

// apps/api/orpc/router.ts - UPDATE
export const router = publicProcedure.prefix('/api').router({
  // existing...
  metrics: metricsRouter,      // NEW
  growth: growthRouter,         // NEW
  // ...
});
```

---

## 4. PostHog USER JOURNEYS & NURTURE PATHS DELTA

### Current Event Implementation

✅ **Events Defined:** 58 total events (excellent taxonomy!)
- Core events (Auth, Snapshot, Billing) = 100% sampled
- Engagement events (Dashboard, API) = 50% sampled
- Optional events (Search, Help) = 10% sampled

❌ **Missing Event Triggers & Journeys:**

### Journey 1: ACTIVATION FUNNEL (Demo-Blocking per feedback.md)

**Architecture.md Definition:**
```
Install → Activate → Welcome → [Auth/Skip] → First Save → First Snapshot
  ↓         ↓         ↓           ↓            ↓              ↓
extension extension  welcome    auth_login   save_attempt  snapshot_
installed activated  _panel_    _completed      (first)     created
                     shown
```

**Current Implementation:** 🟠 PARTIAL
- ✅ `EXTENSION_INSTALLED` - triggered
- ✅ `EXTENSION_ACTIVATED` - triggered
- ❌ `welcome.panel_shown` - NOT TRACKED
- ❌ `auth.flow_started` - NOT TRACKED (only completed)
- ❌ `auth.browser_opened` - NOT TRACKED (diagnostic!)
- ❌ `auth.callback_received` - NOT TRACKED (diagnostic!)
- ✅ `SNAPSHOT_CREATED` - triggered (but not marked "first")
- ❌ `FIRST_SNAPSHOT_CREATED` - NOT FIRED as distinct event

**Missing Diagnostic Events:**
```typescript
// apps/vscode/src/telemetry/funnel-events.ts - NEEDS CREATION

// Auth diagnostics (help debug drop-offs)
trackAuthFlowStarted(provider: 'github' | 'google')
trackAuthBrowserOpened() 
trackAuthCallbackReceived()
trackAuthExchangeStarted()
trackAuthExchangeFailed(reason: string)

// Welcome diagnostics
trackWelcomePanelShown(skipped_before: boolean)
trackWelcomeFeatureViewed(feature: 'sync' | 'ai' | 'restore')

// Activation diagnostics  
trackFirstSnapshotAttempted()
trackFirstSnapshotFailed(reason: string)
```

**PostHog Queries Broken By Missing Events:**
- ❌ "What % of users see the welcome panel?" (no event)
- ❌ "Browser actually opens for auth?" (no event)
- ❌ "Users stuck at callback?" (no event)
- ❌ "Auth failure rate breakdown?" (no exchange_failed event)

### Journey 2: LIFECYCLE TRANSITIONS

**Architecture.md Definition:**
```
new → engaged → power_user
 ↓      ↓          ↓
triggered by:
- first snapshot
- 7 active days
- 50+ snapshots
```

**Current Implementation:** 🔴 NOT IMPLEMENTED
- No `user_lifecycle_state` table (blocking)
- No lifecycle transition service
- No event triggers on transition
- No nurture track assignment

**What Needs To Exist:**
```typescript
// apps/api/modules/growth/services/LifecycleEngine.ts - NEW
export class LifecycleEngine {
  // Triggered by events (snapshot_created, daily cron, milestone checks)
  transitionUserStage(userId: string, event: LifecycleEvent): Promise<void> {
    // Check triggers:
    // new → engaged: if (snapshots_count > 0 AND api_called)
    // engaged → power_user: if (7 days active AND snapshots > 50)
    
    // Update user_lifecycle_state.retention_stage
    // Emit event to PostHog for cohort updates
    // Trigger nurture track assignment (see below)
  }
}

// Emit for PostHog cohort tracking
track('lifecycle_transitioned', {
  from_stage: 'new',
  to_stage: 'engaged',
  trigger: 'first_snapshot_created',
  time_to_stage_days: 3,
});
```

### Journey 3: NURTURE TRACKS (Email Sequencing)

**Architecture.md Definition:**
```
Lifecycle Stage → Nurture Track → Email Sequence

new (0-24h)
  ↓
  new_user track
    → "Welcome to SnapBack" (immediate)
    → "Did you know: AI detection" (+24h if no snapshot)
    → "Quick start guide" (+3d if no snapshot)

engaged (7 days) → "Week 1 stats" email
power_user (50+ snapshots) → "Advanced features" email
inactive (3 days no save) → "We miss you" email
```

**Current Implementation:** 🔴 NOT IMPLEMENTED
- No nurture track definitions
- No email trigger logic
- Resend integration exists but not wired
- HubSpot contact fields not synced

**What Needs To Exist:**
```typescript
// packages/platform/src/db/schema/snapback/nurture-tracks.ts - NEW
export const nurtureTrack = pgTable('nurture_track', {
  userId: text('user_id').references(() => user.id),
  trackName: text('track_name').notNull(), // 'new_user' | 'engaged' | 'power_user'
  stepIndex: integer('step_index').default(0),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  skippedAt: timestamp('skipped_at'), // user unsubscribed
});

// apps/api/modules/growth/services/EmailOrchestrator.ts - NEW
export class EmailOrchestrator {
  async onLifecycleTransition(userId: string, toStage: string): Promise<void> {
    // Unenroll from old track
    await db.update(nurtureTrack)
      .set({ completedAt: new Date() })
      .where(eq(nurtureTrack.userId, userId));
    
    // Enroll in new track based on stage
    const trackName = this.getTrackForStage(toStage); // 'new_user', 'engaged', etc.
    await db.insert(nurtureTrack)
      .values({ userId, trackName, stepIndex: 0, enrolledAt: new Date() });
    
    // Send first email immediately
    await this.sendEmail(userId, trackName, 0);
    
    // Schedule future emails via cron
    // (new_user step 0 @ now, step 1 @ +24h, step 2 @ +3d)
  }
  
  async cronSendScheduledEmails(): Promise<void> {
    // Run hourly: find all (user, track, step) with sendAt <= now
    // Send via Resend
    // Mark sent_at
  }
}

// apps/api/modules/webhooks/handlers/EmailEventHandler.ts - NEW
export async function handleEmailBounce(event: ResendEvent): Promise<void> {
  // Mark email_bounced in nurture_track
  // Update user_analytics_identities.resend_contact_id = null
}
```

### PostHog Cohort Definitions

**Missing Cohort Tests:**
```typescript
// apps/api/modules/growth/tests/cohort-sync.test.ts - NEW

// Cohorts should auto-sync from database:
// Cohort "Activated Users" = user_lifecycle_state.retention_stage = 'engaged'
// Cohort "Power Users" = user_lifecycle_state.retention_stage = 'power_user'  
// Cohort "At Risk" = user_lifecycle_state.retention_stage = 'at_risk'
// Cohort "New Users" = created_at > NOW() - INTERVAL 7 DAY

// PostHog queries that should work after implementation:
// "Activation Rate" = Funnel(install → first_snapshot)
// "Day 7 Retention" = User count with (last_snapshot > 7 days ago)
// "Email Engagement" = Users in 'new_user' track who clicked email
```

---

## 5. SIMPLIFICATION RECOMMENDATIONS

### Consolidate Event Clients

**Current (Over-engineered):**
- `TelemetryClient` (VS Code proxy)
- `AnalyticsWrapper` (privacy filtering)
- `BrowserAnalyticsClient` (PostHog-JS)
- `ServerAnalyticsClient` (PostHog-Node)

**Simplified:**
```typescript
// Single unified interface
export interface Analytics {
  track(event: string, properties?: Record<string, any>): void;
  identify(userId: string, traits?: Traits): void;
  shutdown?(): Promise<void>;
}

// Single factory
export function createAnalytics(config: AnalyticsConfig): Analytics {
  if (config.environment === 'browser') {
    return new PostHogBrowserAdapter(config);
  }
  if (config.environment === 'extension') {
    return new ProxyTelemetryAdapter(config);
  }
  return new PostHogServerAdapter(config);
}

// All path through privacy filter before sending
```

### Eliminate Event Naming Inconsistency

**Feedback.md Issue #2:** Events mix naming conventions
```typescript
// Current (INCONSISTENT):
'welcome_panel_shown'      // snake_case
'auth_login_completed'     // snake_case
'extension.activated'      // dot notation

// Fixed (CONSISTENT):
'auth.flow_started'        // All dots
'auth.flow_completed'
'welcome.panel_shown'
'snapshot.created'
```

**Update locations:**
1. `packages/infrastructure/src/metrics/core/events.ts` (AnalyticsEvents)
2. `packages/infrastructure/src/metrics/core/sampling.ts` (EVENT_SAMPLING_RATES)
3. All telemetry tracking calls across codebase

### Consolidate Metrics Tables

**Current (Separate concerns):**
- `user_daily_metrics` (daily)
- `user_product_metrics` (lifetime)

**Simplified (Single table, views):**
```sql
-- Single table
user_daily_metrics (user_id, date, snapshots, restores, minutes_saved, ai_sessions)

-- Views for convenience
CREATE VIEW user_product_metrics AS
SELECT 
  user_id,
  SUM(snapshots) AS snapshots_total,
  SUM(restores) AS restores_total,
  SUM(minutes_saved) AS minutes_saved_total
FROM user_daily_metrics
GROUP BY user_id;
```

---

## 6. IMPLEMENTATION ROADMAP

### Week 1: Database Foundation (Blocking)

```
MON: 
  [ ] Create user_product_metrics migration
  [ ] Create user_daily_metrics migration
  [ ] Create user_lifecycle_state migration
  [ ] Run migrations locally
  [ ] Add tests: user-metrics aggregation

TUE:
  [ ] Create user_analytics_identities migration
  [ ] Create protection_decisions migration
  [ ] Update index strategy
  [ ] Tests: protection_decisions schema

WED:
  [ ] Create nurture_track schema
  [ ] Create email_events schema (bounce tracking)
  [ ] Verify all migrations run cleanly
  [ ] Update drizzle.config.ts exports

THU:
  [ ] Implement MetricsAggregator service
  [ ] Write nightly aggregation cron job
  [ ] Test daily → lifetime rollups

FRI:
  [ ] Implement LifecycleEngine
  [ ] Wire lifecycle event triggers
  [ ] E2E test: new → engaged transition
```

### Week 2: API Routes (Blocking)

```
MON:
  [ ] Device auth endpoints (device-code, device-token)
  [ ] Tests: device-auth-flow.test.ts

TUE:
  [ ] Key validation endpoint (/api/keys/validate)
  [ ] Background validation job
  [ ] Tests: key-rotation.test.ts

WED:
  [ ] Metrics router (getMyUsage, getMyTimeline)
  [ ] Dashboard → metrics migration
  [ ] Tests: metrics-aggregation.test.ts

THU:
  [ ] Growth router (lifecycle, hubspot, email)
  [ ] Lifecycle transition trigger
  [ ] Tests: lifecycle-state-machine.test.ts

FRI:
  [ ] Event naming consistency fix
  [ ] Funnel event definitions
  [ ] Test: funnel-breakdown.test.ts
```

### Week 3: Growth Integration (High)

```
MON:
  [ ] Email orchestrator service
  [ ] Resend integration wiring
  [ ] Tests: email-trigger.test.ts

TUE:
  [ ] HubSpot sync service
  [ ] Field mapping (snapshots_7d, restores_7d, etc.)
  [ ] Tests: hubspot-sync.test.ts

WED:
  [ ] Nurture track enrollment logic
  [ ] Email schedule cron jobs
  [ ] Tests: nurture-track.test.ts

THU:
  [ ] PostHog cohort definitions
  [ ] Funnel definition tests
  [ ] Activation funnel validation

FRI:
  [ ] End-to-end demo flow
  [ ] Performance testing
  [ ] Deployment readiness check
```

---

## 7. QUALITY CHECKPOINTS

### Before Merging Database Changes
```bash
✓ All migrations generate without errors
✓ Schema indexes appropriate (user_id, created_at, state)
✓ Test coverage: schema validation, edge cases
✓ Performance: sample query with 100K users < 100ms
```

### Before Merging API Routes
```bash
✓ OpenAPI schema generates cleanly
✓ E2E test: Happy path (install → auth → snapshot)
✓ Error cases: 401, 403, 429 (rate limit)
✓ Tests pass with CI pipeline
```

### Before Merging Growth Layer
```bash
✓ Email sends without errors (mock Resend)
✓ Lifecycle transitions trigger correctly
✓ HubSpot sync creates/updates contacts
✓ PostHog events land in correct cohorts
```

---

## 8. APPENDIX: FILES TO CREATE/MODIFY

### Create (New Files)
```
packages/platform/src/db/schema/snapback/
  ├── user-metrics.ts           (user_daily_metrics table)
  ├── user-lifecycle-state.ts   (retention_stage tracking)
  ├── protection-decisions.ts   (ML training data)
  ├── user-analytics-identity.ts (CRM mapping)
  └── nurture-track.ts          (email sequencing)

apps/api/modules/metrics/
  ├── router.ts                 (new metrics router)
  ├── procedures/
  │   ├── get-my-usage.ts       (lifetime stats)
  │   ├── get-my-timeline.ts    (daily trends)
  │   └── get-my-usage-limits.ts
  └── tests/
      └── metrics-aggregation.test.ts

apps/api/modules/growth/
  ├── router.ts                 (growth router)
  ├── services/
  │   ├── LifecycleEngine.ts
  │   ├── EmailOrchestrator.ts
  │   └── HubspotSyncService.ts
  └── tests/
      ├── lifecycle-state-machine.test.ts
      ├── email-trigger.test.ts
      └── hubspot-sync.test.ts

apps/api/modules/auth/
  └── procedures/
      ├── request-device-code.ts
      ├── poll-device-token.ts
      └── validate-api-key.ts
```

### Modify (Existing Files)
```
packages/platform/drizzle.config.ts
  → Update schema path to include new tables

packages/platform/src/index.ts  
  → Export new schema types

apps/api/orpc/router.ts
  → Add metrics, growth routers

packages/infrastructure/src/metrics/core/events.ts
  → Fix naming consistency (dots, not underscores)
  → Add funnel diagnostic events

apps/api/modules/telemetry/router.ts
  → Add funnel-event ingestion
```

---

## Summary: Current Delta

| Dimension | Status | GAP | Fix Time |
|-----------|--------|-----|----------|
| **Database** | 35% complete | Missing 5 critical tables | 2-3 days |
| **API Routes** | 70% complete | Missing 10 endpoints (metrics, growth, device auth) | 3 days |
| **Tests** | 40% coverage | Missing 8-10 critical scenarios | 4 days |
| **PostHog Journeys** | 30% complete | Missing lifecycle, nurture, email triggers | 5 days |
| **Overall Alignment** | **60%** | Gaps are strategic, not broken | **14 days** |

**→ Recommendation:** Implement in this exact sequence to unblock demo and reduce rework.
