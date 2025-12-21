# Integration Remaining Work

**Generated:** 2025-12-21
**Source:** Integration Audit per ROUTER.md
**Status:** Active tracking document

---

## Executive Summary

| Category | Fixed | Remaining | Priority |
|----------|-------|-----------|----------|
| Auth Integration | 4 | 0 | - |
| Service Layer (C-002) | 7 services + 4 P1 modules | ~32 procedures | P2 |
| 3rd Party Wiring | 2 (Stripe, PostHog) | 0 | - |
| Type Safety | Critical fixed | 7 low-priority | P4 |

---

## INT-002: Service Layer Extraction (PARTIAL)

### Completed Services (7)

| Module | Service File | Procedures Refactored |
|--------|-------------|----------------------|
| privacy | `services/privacy-service.ts` | delete-my-data |
| apikeys | `services/apikeys-service.ts` | create-api-key |
| payments | `services/payments-service.ts` | list-purchases, create-checkout-link |
| device-trials | `services/device-trials-service.ts` | (service created, procedures pending) |
| analytics | `services/analytics-service.ts` | get-analytics-metrics, get-api-key-usage, ingest-events |
| extension | `services/extension-service.ts` | create-extension-session, validate-api-key |
| snapshots | `services/snapshots-service.ts` | list-snapshots, get-snapshot, delete-snapshot |

### Remaining Procedures (~40)

#### Analytics Module (8 procedures)
```
apps/api/modules/analytics/procedures/
├── get-agent-suggestions.ts      # Direct DB calls
├── get-daily-metrics.ts          # Direct DB calls
├── get-feedback.ts               # Direct DB calls
├── get-loops.ts                  # Direct DB calls
├── get-policy-evaluations.ts     # Direct DB calls
├── get-post-accept-outcomes.ts   # Direct DB calls
├── get-snapshots.ts              # Direct DB calls (analytics view)
└── process-daily-metrics.ts      # Complex - 6+ DB calls
```

**Effort:** Medium - Similar patterns to existing analytics-service functions

#### API Keys Module (2 procedures) ✅ REFACTORED
```
apps/api/modules/apikeys/procedures/
├── list-api-keys.ts              # Now uses apikeys-service.ts
└── revoke-api-key.ts             # Now uses apikeys-service.ts
```

**Status:** Complete - Added listApiKeysForUser, getApiKeyWithOwnerCheck, revokeApiKeyById to service

#### Auth Module (2 procedures)
```
apps/api/modules/auth/procedures/
├── track-api-usage.ts            # Direct DB calls
└── verify-api-key.ts             # Direct DB calls
```

**Effort:** Low - Consider consolidating with extension-service

#### Dashboard Module (7 procedures)
```
apps/api/modules/dashboard/procedures/
├── get-ai-detection-stats.ts     # Direct DB calls
├── get-metrics.ts                # Direct DB calls
├── get-org-metrics.ts            # Direct DB calls
├── get-recent-activity.ts        # Direct DB calls
├── get-session-metrics.ts        # Direct DB calls
├── get-subscription-data.ts      # Direct DB calls
└── get-user-metrics.ts           # Direct DB calls
```

**Effort:** Medium - New dashboard-service.ts needed

#### Device Trials Module (2 procedures) ✅ REFACTORED
```
apps/api/modules/device-trials/procedures/
├── create-device-trial.ts      # Now uses device-trials-service.ts
└── link-device.ts                # Now uses device-trials-service.ts
```

**Status:** Complete - Procedures now delegate to service layer

#### Feedback Module (2 procedures)
```
apps/api/modules/feedback/procedures/
├── submit-feedback.ts            # Direct DB calls
└── submit-nps.ts                 # Direct DB calls
```

**Effort:** Low - New feedback-service.ts needed

#### Newsletter Module (1 procedure)
```
apps/api/modules/newsletter/procedures/
└── subscribe-to-newsletter.ts    # Direct DB calls
```

**Effort:** Low - Simple service extraction

#### Organizations Module (1 procedure)
```
apps/api/modules/organizations/procedures/
└── get-by-id.ts                  # Direct DB calls
```

**Effort:** Low - New organizations-service.ts

#### Payments Module (1 procedure) ✅ REFACTORED
```
apps/api/modules/payments/procedures/
└── create-customer-portal-link.ts # Now uses payments-service.ts
```

**Status:** Complete - Added getPurchaseById, checkUserOrganizationOwnership to service

#### Pioneer Module (2 procedures)
```
apps/api/modules/pioneer/procedures/
├── signup.ts                     # Direct DB calls
└── update-email.ts               # Direct DB calls
```

**Effort:** Low - New pioneer-service.ts

#### Privacy Module (3 procedures) ✅ REFACTORED
```
apps/api/modules/privacy/procedures/
├── export-my-data.ts             # Now uses privacy-service.ts
├── get-retention-info.ts         # Now uses privacy-service.ts
└── update-preferences.ts         # Now uses privacy-service.ts
```

**Status:** Complete - Added getUserExportData, getSnapshotAgeData, buildPrivacyPreferences, RETENTION_POLICIES to service

#### Risk Module (1 procedure)
```
apps/api/modules/risk/procedures/
└── analyze-risk.ts               # Direct DB calls
```

**Effort:** Low - New risk-service.ts

#### Rules Module (1 procedure)
```
apps/api/modules/rules/procedures/
└── get-rules-bundle.ts           # Direct DB calls
```

**Effort:** Low - New rules-service.ts

#### Snapshots Module (2 procedures)
```
apps/api/modules/snapshots/procedures/
├── create-snapshot.ts            # Complex - 15+ DB calls
└── restore-snapshot.ts           # Direct DB calls
```

**Effort:** High - create-snapshot.ts is complex (416 lines)

#### Telemetry Module (2 procedures)
```
apps/api/modules/telemetry/procedures/
├── enrich-event.ts               # Direct DB calls
└── track-event.ts                # Direct DB calls
```

**Effort:** Low - New telemetry-service.ts

#### Waitlist Module (5 procedures)
```
apps/api/modules/waitlist/procedures/
├── get-position.ts               # Direct DB calls
├── get-recent-activity.ts        # Direct DB calls
├── get-referrals.ts              # Direct DB calls
├── helpers.ts                    # Shared helpers with DB
└── join-waitlist.ts              # Direct DB calls
```

**Effort:** Medium - New waitlist-service.ts

---

## INT-006: PostHog Duplicate Initializations (FIXED)

### Resolution (2025-12-21)
Consolidated all PostHog initializations to single canonical location:
- **Canonical:** `apps/api/lib/posthog-server.ts`
- **Exports:** `initializePostHog()`, `getPostHog()`, `getPostHogClient()`, `captureEvent()`
- **Refactored files:**
  - `apps/api/modules/telemetry/lib/posthog.ts` → Re-exports from canonical
  - `apps/api/modules/telemetry/procedures/track-event.ts` → Uses canonical
  - `apps/api/modules/telemetry/procedures/enrich-event.ts` → Uses canonical
  - `apps/api/modules/telemetry/procedures/ingest-events.ts` → Uses canonical
  - `apps/api/modules/analytics/procedures/ingest-events.ts` → Uses canonical

---

## INT-007: Hono Context `as any` Casts (LOW_PRIORITY)

### Current State
7 `as any` casts in `apps/api/src/middleware/auth.ts`:
```typescript
(c.env as any).auth = context;  // Lines 178, 243, 291, 323, 389
(c.env as any).auth as AuthContext | undefined;  // Line 399
```

Plus 1 in `auth-unified.ts`:
```typescript
verified.payload as any;  // Line 78
```

### Solution
Create proper Hono environment types:
```typescript
// In types/hono.d.ts
interface HonoEnv {
  Variables: {
    auth: AuthContext;
  };
}
```

### Effort
Low - Type definition update

### Priority
Low - Functional code, just type safety improvement

---

## Priority Order for Remaining Work

### P1 - High Impact, Low Effort ✅ COMPLETE
1. **Device Trials** - ✅ Service wired, procedures refactored
2. **Privacy Module** - ✅ Service extended, 3 functions added
3. **API Keys** - ✅ Service extended, 2 functions added
4. **Payments** - ✅ Service extended, 1 function added

### P2 - Medium Effort
5. **Dashboard Module** - New service, 7 similar procedures (DEFERRED)
6. **Analytics remaining** - Add 8 functions to existing service (DEFERRED)
7. **INT-006 PostHog** - ✅ FIXED - Consolidated to single init

### P3 - Higher Effort
8. **Waitlist Module** - New service, 5 procedures
9. **Telemetry Module** - New service, 2 procedures + PostHog wiring

### P4 - Complex
10. **Snapshots create-snapshot.ts** - 416 lines, 15+ DB calls
11. **INT-007 Type Safety** - Low priority improvement

---

## Service Files to Create

| Service | Module | Functions Needed |
|---------|--------|------------------|
| dashboard-service.ts | dashboard | 7 |
| feedback-service.ts | feedback | 2 |
| newsletter-service.ts | newsletter | 1 |
| organizations-service.ts | organizations | 1 |
| pioneer-service.ts | pioneer | 2 |
| risk-service.ts | risk | 1 |
| rules-service.ts | rules | 1 |
| telemetry-service.ts | telemetry | 2 |
| waitlist-service.ts | waitlist | 5 |

**Total:** 9 new services, 22 functions

---

## Verification Commands

```bash
# Check remaining direct DB calls
grep -rln "getDb()" apps/api/modules/*/procedures/*.ts | wc -l

# Check PostHog initializations
grep -rn "new PostHog" apps/api --include="*.ts" | grep -v node_modules

# Check as any casts in auth
grep -n "as any" apps/api/src/middleware/auth*.ts

# Verify service layer exists
ls -la apps/api/modules/*/services/
```

---

## Completion Criteria

- [ ] All procedures delegate to service layer (0 direct `getDb()` calls)
- [ ] PostHog initialized once in `lib/posthog-server.ts`
- [ ] No `as any` casts in auth middleware (optional)
- [ ] All services have consistent patterns per C-002
- [ ] TypeScript compilation passes
- [ ] ROUTER.md INT table shows all FIXED

---

**Last Updated:** 2025-12-21
**Owner:** Integration Audit
**Session Progress:**
- P1 items: 4/4 complete (device-trials, privacy, apikeys, payments)
- INT-006 PostHog: FIXED
- Remaining: Dashboard (7 procs), Analytics (8 procs), Waitlist (5 procs), + other services
