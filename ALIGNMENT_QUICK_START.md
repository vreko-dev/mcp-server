# Quick Start: Alignment Implementation

**TL;DR** - Your codebase is 70% aligned. Four critical consolidations will bring you to 85%+ ready.

## Red Flags (Do These First)

### 1. Telemetry is in 6 Places ⚠️
**Impact**: Inconsistent event tracking, hard to debug
**Fix**: Create ONE canonical service in `packages/analytics/src/telemetry-service.ts`
**Effort**: 2 days
**Blockers**: None - can parallel with other work

```
Current scattered:
├── apps/api/lib/posthog-server.ts
├── apps/web/lib/posthog-client.tsx
├── packages/infrastructure/src/metrics/server/
├── packages/infrastructure/src/metrics/client/
├── packages/infrastructure/src/analytics/AnalyticsWrapper.ts
├── packages/infrastructure/src/tracing/telemetry-client.ts
└── apps/api/modules/telemetry/procedures/

Target: ALL → packages/analytics/src/telemetry-service.ts
```

### 2. Event Names are Inconsistent ⚠️
**Impact**: Telemetry data quality, funnel analysis broken
**Fix**: Standardize all events to `dot.notation` + add 6 missing diagnostic events
**Effort**: 1 day
**Blockers**: None

```typescript
// Current problem:
'extension.activated'    // ✓ good
'snapshot.created'       // ✓ good
'auth_flow_started'      // ✗ should be 'auth.flow.started'
'welcome_panel_shown'    // ✗ should be 'welcome.panel.shown'

// Missing from feedback.md:
'auth.provider.selected'
'auth.browser.opened'
'auth.callback.received'
'auth.exchange.started'
```

### 3. Analytics Packages are Split ⚠️
**Impact**: Confusion about where analytics code lives
**Fix**: Merge `packages/analytics-infra` → `packages/analytics`
**Effort**: 4 hours
**Blockers**: None

### 4. Event Constants Duplicated in 4 Places ⚠️
**Impact**: Hard to maintain single source of truth
**Fix**: Keep only `packages/contracts/src/events/core.ts`
**Effort**: 2 hours
**Blockers**: Update imports in 3 files

---

## Yellow Flags (Do These Second)

### 5. Device Auth Flow Not Implemented
**Impact**: OAuth fails on WSL/Remote SSH (from feedback.md)
**Fix**: Implement RFC 8628 Device Authorization Flow
**Effort**: 2-3 days
**Timeline**: Week 2

### 6. Key Rotation Not Handled
**Impact**: Users can't revoke/rotate keys safely
**Fix**: Implement KeyValidator with 5-min background checks
**Effort**: 1-2 days
**Timeline**: Week 3

### 7. Auth-Mock Package Exists
**Impact**: Minor - just test utilities in separate package
**Fix**: Merge into `packages/auth/test/`
**Effort**: 2 hours
**Timeline**: Week 1

---

## Green Flags (Already Good)

✅ Database schema matches architecture.md perfectly
✅ API endpoints structure is correct
✅ Better Auth integration is sound
✅ Privacy filtering implemented
✅ packages-oss sync structure is intentional

---

## Documentation Cleanup

**Option 1: Archive (Recommended)**
```bash
mkdir -p docs/archive/
mv claudedocs/ docs/archive/
mv builder_pack/ docs/archive/
mv GIT_VS_SNAPBACK_VISIBILITY_FIX.md docs/archive/
mv SYSTEM_DELTA_ANALYSIS.md docs/archive/
mv TEST_FULL_COMMIT.md docs/archive/
```

**Option 2: Just Update .gitignore**
```
# If you want to keep them around for reference
claudedocs/
builder_pack/
```

**Consolidate Into /docs/**:
- Move `ARCHITECTURE.md` → `docs/architecture/README.md`
- Move `TDD_IMPLEMENTATION_GUIDE.md` → `docs/development/`
- Move `PROJECT_MAINTENANCE_GUIDE.md` → `docs/maintenance/`

---

## By-the-Numbers Implementation Plan

### Week 1 (Code Consolidation)
- Day 1: Event naming + constants consolidation
- Day 2: Telemetry unification (create canonical service)
- Day 3-4: Merge analytics packages + auth-mock
- Day 5: Testing + integration verification

**Effort**: ~2 developer-days
**Risk**: LOW (consolidation is straightforward)
**Reward**: 40 → 65% alignment

### Week 2 (Features from feedback.md)
- Device authorization flow implementation
- Event mapper enhancements
- Snapshot counter atomicity
- Testing

**Effort**: ~3 developer-days
**Risk**: MEDIUM (new auth flow needs careful testing)
**Reward**: 65 → 80% alignment

### Week 3 (Auth + Polish)
- Key validation + rotation handling
- AnonymousMode type safety review
- Documentation consolidation
- Final integration testing

**Effort**: ~2 developer-days
**Risk**: MEDIUM (auth is critical path)
**Reward**: 80 → 85%+ alignment + docs clean

---

## Specific File Changes Needed

### Must Change
```typescript
// 1. Consolidate event constants
OLD: packages/contracts/src/telemetry/events.ts
OLD: packages/contracts/src/events/legacy.ts  ← DELETE
OLD: packages/contracts/src/telemetry/events.v1.ts  ← DELETE
NEW: packages/contracts/src/events/core.ts  (keep one source)

// 2. Create canonical telemetry
NEW: packages/analytics/src/telemetry-service.ts
DEPRECATE: apps/api/lib/posthog-server.ts  (4-week grace)
DEPRECATE: apps/web/lib/posthog-client.tsx  (4-week grace)
DEPRECATE: packages/infrastructure/src/analytics/AnalyticsWrapper.ts
DEPRECATE: packages/infrastructure/src/tracing/telemetry-client.ts

// 3. Merge packages
DELETE: packages/auth-mock/ (merge to packages/auth/test/)
DELETE: packages/analytics-infra/ (merge to packages/analytics/)
UPDATE: packages/analytics/package.json (add PostHog client)
```

### Should Update
```typescript
// 4. Add missing auth endpoints (from feedback.md)
NEW: apps/api/modules/auth/procedures/device-code.ts
NEW: apps/api/modules/auth/procedures/device-token.ts
NEW: packages/auth/src/lib/key-validator.ts

// 5. Update telemetry event names
UPDATE: packages/contracts/src/events/core.ts (dot notation everywhere)
UPDATE: All imports of event constants (1-2 files)
```

### Can Keep
```typescript
// These are fine as-is
packages/platform/src/db/schema/snapback/
packages/auth/src/ (main auth logic)
apps/api/modules/telemetry/procedures/ (refactor to use canonical service)
docs/ (Fumadocs - production docs)
packages-oss/ (OSS sync target)
```

---

## Verification Checklist

After implementation, verify:

- [ ] Telemetry events flow through single service
- [ ] All event names use dot.notation
- [ ] No direct PostHog imports in apps (only via canonical service)
- [ ] Event mapper covers all 7 core events
- [ ] Anonymous user context doesn't use `tier` field
- [ ] Key validation runs every 5 minutes (background)
- [ ] Device auth flow works on WSL/Remote SSH
- [ ] /docs is the only source of truth for architecture
- [ ] No imports from `claudedocs/` or `builder_pack/`
- [ ] `packages/auth-mock` directory deleted
- [ ] `packages/analytics-infra` directory deleted

---

## Files to Review First

1. **CODEBASE_ALIGNMENT_ANALYSIS.md** (full details - this document links to it)
2. **scripts/snapback_implementation_pack/architecture.md** (proposed design)
3. **scripts/snapback_implementation_pack/feedback.md** (critique with recommendations)

---

## Questions?

- **"Can I implement piecemeal?"** Yes! Week 1 code changes are mostly independent.
- **"What's the riskiest change?"** Device auth flow - needs careful testing on WSL.
- **"Can I skip telemetry consolidation?"** No - it's blocking telemetry reliability.
- **"Do I need to delete claudedocs?"** No - archiving keeps it for reference.
- **"What happens to packages-oss?"** Keep it - it's intentional OSS sync target.

---

**Ready to start? Begin with the consolidated CODEBASE_ALIGNMENT_ANALYSIS.md document above.**
