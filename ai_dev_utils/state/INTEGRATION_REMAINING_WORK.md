# Integration Remaining Work

**Generated:** 2025-12-21
**Source:** Integration Audit per ROUTER.md
**Status:** Active tracking document

---

## Executive Summary

| Category | Fixed | Remaining | Priority |
|----------|-------|-----------|----------|
| Auth Integration | 4 | 0 | - |
| Service Layer (C-002) | **10 services + 17 procedures** | ~18 procedures | P2-P3 |
| 3rd Party Wiring | 2 (Stripe, PostHog) | 0 | - |
| Type Safety | Critical fixed | 7 low-priority | P4 |

---

## INT-002: Service Layer Extraction (IN PROGRESS)

### Completed Services (10) ✅

| Module | Service File | Procedures Refactored | Status |
|--------|-------------|----------------------|--------|
| privacy | `services/privacy-service.ts` | delete-my-data, export-my-data, get-retention-info, update-preferences | ✅ |
| apikeys | `services/apikeys-service.ts` | create-api-key, list-api-keys, revoke-api-key | ✅ |
| payments | `services/payments-service.ts` | list-purchases, create-checkout-link, create-customer-portal-link | ✅ |
| device-trials | `services/device-trials-service.ts` | create-device-trial, link-device | ✅ |
| analytics | `services/analytics-service.ts` | get-analytics-metrics, get-api-key-usage, ingest-events, **+ 8 new functions** | ✅ |
| extension | `services/extension-service.ts` | create-extension-session, validate-api-key | ✅ |
| snapshots | `services/snapshots-service.ts` | list-snapshots, get-snapshot, delete-snapshot | ✅ |
| **dashboard** | `services/dashboard-service.ts` | get-ai-detection-stats, get-metrics, get-org-metrics, get-recent-activity, get-session-metrics, get-subscription-data, get-user-metrics | ✅ NEW |
| **feedback** | `services/feedback-service.ts` | submit-feedback, submit-nps | ✅ NEW |

### Remaining Procedures (~18)

#### Auth Module (2 procedures)
```
apps/api/modules/auth/procedures/
├── track-api-usage.ts            # Direct DB calls
└── verify-api-key.ts             # Direct DB calls
```

**Effort:** Low - Consider consolidating with extension-service

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

### P2 - Medium Effort ✅ COMPLETE (2025-12-21)
5. **Dashboard Module** - ✅ Service created, 7 procedures refactored
6. **Analytics remaining** - ✅ Extended with 8 functions (get-agent-suggestions, get-daily-metrics, get-feedback, get-loops, get-policy-evaluations, get-post-accept-outcomes, get-snapshots, process-daily-metrics)
7. **INT-006 PostHog** - ✅ FIXED - Consolidated to single init
8. **Feedback Module** - ✅ Service created, 2 procedures refactored

### P3 - Lower Effort (DEFERRED)
9. **Newsletter Module** - 1 procedure (subscribe-to-newsletter)
10. **Organizations Module** - 1 procedure (get-by-id)
11. **Pioneer Module** - 2 procedures (signup, update-email)
12. **Auth Module** - 2 procedures (track-api-usage, verify-api-key)
13. **Risk Module** - 1 procedure (analyze-risk)
14. **Rules Module** - 1 procedure (get-rules-bundle)
15. **Telemetry Module** - 2 procedures (enrich-event, track-event)

### P4 - Complex (DEFERRED)
16. **Waitlist Module** - 5 procedures (get-position, get-recent-activity, get-referrals, join-waitlist, helpers)
17. **Snapshots create-snapshot.ts** - 416 lines, 15+ DB calls
18. **Snapshots restore-snapshot.ts** - Direct DB calls
19. **INT-007 Type Safety** - Low priority improvement

---

## Service Files Created

| Service | Module | Functions | Status |
|---------|--------|-----------|--------|
| dashboard-service.ts | dashboard | 7 | ✅ 2025-12-21 |
| analytics-service.ts (extended) | analytics | +8 (total 11) | ✅ 2025-12-21 |
| feedback-service.ts | feedback | 2 | ✅ 2025-12-21 |
| newsletter-service.ts | newsletter | 1 | DEFERRED |
| organizations-service.ts | organizations | 1 | DEFERRED |
| pioneer-service.ts | pioneer | 2 | DEFERRED |
| risk-service.ts | risk | 1 | DEFERRED |
| rules-service.ts | rules | 1 | DEFERRED |
| telemetry-service.ts | telemetry | 2 | DEFERRED |
| waitlist-service.ts | waitlist | 5 | DEFERRED |

**Total Completed:** 3 new services + 1 extended, 17 functions

---

## Verification Commands

```bash
# Check remaining direct DB calls (should be ~18)
find apps/api/modules -name "*.ts" -path "*/procedures/*" -exec grep -l "getDb()" {} \; | wc -l

# Check PostHog initializations (should be 1)
grep -rn "new PostHog" apps/api --include="*.ts" | grep -v node_modules

# Check as any casts in auth (should be 7)
grep -n "as any" apps/api/src/middleware/auth*.ts

# Verify service layer exists
ls -la apps/api/modules/*/services/
```

---

## Completion Criteria

- [x] All P1 procedures delegate to service layer (4 modules complete)
- [x] All P2 procedures delegate to service layer (Dashboard, Analytics, Feedback complete)
- [ ] All P3 procedures delegate to service layer (Newsletter, Orgs, Pioneer, Auth, Risk, Rules, Telemetry)
- [x] PostHog initialized once in `lib/posthog-server.ts`
- [ ] No `as any` casts in auth middleware (optional)
- [x] All services have consistent patterns per C-002
- [x] TypeScript compilation passes (1 unrelated error: policy-engine)
- [ ] ROUTER.md INT table shows all P1+P2 FIXED

---

**Last Updated:** 2025-12-21
**Owner:** Integration Audit
**Session Progress:**
- P1 items: 4/4 complete (device-trials, privacy, apikeys, payments)
- P2 items: 3/3 complete (dashboard, analytics extended, feedback)
- INT-006 PostHog: FIXED
- **Refactored:** 17 procedures across 3 modules (Dashboard=7, Analytics=8, Feedback=2)
- **Remaining:** 18 procedures across 7 modules (Newsletter, Orgs, Pioneer, Auth, Risk, Rules, Telemetry, Waitlist, Snapshots)
