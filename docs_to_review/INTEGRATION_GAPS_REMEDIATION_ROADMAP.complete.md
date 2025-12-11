# Integration Gaps Remediation Roadmap

**Status**: Generated December 9, 2025
**Based on**: Deep codebase analysis + `arch_remediation.md` Phases 1-4
**Timeline**: 4-5 weeks across Phases 1-4
**Total Effort**: ~60-70 engineering hours

---

## Executive Summary

After comprehensive codebase analysis, 5 critical integration gaps were identified where infrastructure exists but end-to-end wiring is incomplete. This document provides:

1. **What's broken**: Specific files, line numbers, and root causes
2. **How to fix it**: Step-by-step implementation with code examples
3. **How to verify**: Test templates for each gap
4. **Execution order**: Optimal sequence to avoid blockers

---

## The 5 Critical Integration Gaps

### Overview Matrix

| Gap | Infrastructure | Integration | Impact | Effort |
|-----|-----------------|-------------|--------|--------|
| **Dashboard Metrics** | ✅ Complete (MetricsAggregator) | ❌ Broken (hardcoded zeros) | Users see empty metrics | 4-6h |
| **Cloud Backup** | ✅ Complete (CloudBackupService) | ❌ Never called | Pro feature unusable | 5-8h |
| **Offline Queue** | ✅ Complete (OfflineEventQueue) | ❌ Never triggered | Offline telemetry lost | 3-5h |
| **Trust Calibration** | ✅ Complete (EWMA schema) | ❌ No update loop | AI confidence mocked | 6-8h |
| **Feature Flags** | ✅ Wired (PostHog) | ❌ Static only (env vars) | No dynamic control | 3-4h |
| **TOTAL** | | | | **21-31h** |

---

## Detailed Gap Analysis

### Gap 1: Dashboard Metrics (Task 4.1)

**The Problem**:
```typescript
// apps/api/modules/dashboard/procedures/get-metrics.ts (lines 121-127)
recent_activity: [],  // ❌ HARDCODED EMPTY
ai_breakdown: {       // ❌ HARDCODED ZEROS
    copilot: 0,
    cursor: 0,
    claude: 0,
    windsurf: 0,
}
```

**Why This Matters**:
- Dashboard shows no activity, no AI tool usage
- Users see "everything is empty" when they have active protection
- Kills credibility of product demo
- Blocks metric-based sales conversation

**What Needs to Happen**:
1. Enable daily metrics aggregation job (cron: 00:00 daily)
2. Call `MetricsAggregator` service from dashboard endpoint
3. Replace hardcoded arrays with actual aggregated data
4. Add aggregation methods for AI tool breakdown

**Files to Modify**:
- `/apps/api/modules/dashboard/procedures/get-metrics.ts` (lines 88-128)
- `/apps/api/src/services/metrics-aggregator.ts` (add methods)
- NEW: `/apps/api/src/jobs/daily-metrics-aggregation.ts`

**See**: `final_test_framework/arch_remediation.md` **Task 4.1** for full implementation

---

### Gap 2: Cloud Backup Upload (Task 4.2)

**The Problem**:
```typescript
// apps/api/modules/snapshots/procedures/create-snapshot.ts (lines 167-173)
cloudBackupUrl would be set by separate upload process if enabled
// ^^ Comment indicates deferred upload
// ❌ But no such process exists!
```

**Why This Matters**:
- Pro tier feature never works
- Users can't backup snapshots to cloud
- Subscription revenue blocker
- CloudBackupService is 100% complete but orphaned

**What Needs to Happen**:
1. Create CloudBackupService instance in snapshot creation
2. Upload snapshot content (with compression + encryption) to S3
3. Store resulting cloud URL in database
4. Handle failure gracefully (non-blocking)

**Files to Modify**:
- `/apps/api/modules/snapshots/procedures/create-snapshot.ts` (lines 167-173)
- `.env` configuration (S3 bucket, region, credentials)
- NEW: Optional presigned URL endpoint for client-side uploads

**See**: `final_test_framework/arch_remediation.md` **Task 4.2** for full implementation

---

### Gap 3: Offline Event Queue Processing (Task 4.3)

**The Problem**:
```typescript
// apps/vscode/src/services/telemetry-proxy.ts (lines 40-54)
window.addEventListener('online', () => {
    logger.info('Network restored');
    // ❌ Queue processing never called
});
```

**Why This Matters**:
- Offline telemetry queue gets filled but never drained
- User activity data lost when offline (until 7-day TTL expires)
- Extension claims to support offline but doesn't replay events
- Funnel analytics incomplete (missing offline conversion events)

**What Needs to Happen**:
1. Wire `OfflineEventQueue.processQueue()` to 'online' event
2. Add error handling for queue processing failures
3. Add retry logic with exponential backoff (already in queue, just need to call it)
4. Monitor queue size and add metrics

**Files to Modify**:
- `/apps/vscode/src/services/telemetry-proxy.ts` (lines 40-54)
- `/apps/vscode/src/telemetry/OfflineEventQueue.ts` (add monitoring)

**See**: `final_test_framework/arch_remediation.md` **Task 4.3** for full implementation

---

### Gap 4: Trust Score Calibration (Task 4.4)

**The Problem**:
```typescript
// apps/api/lib/dashboard-metrics.ts (lines 130-137)
avgConfidence: 0.9 + Math.random() * 0.09  // ❌ MOCKED: Random 90-99%
```

**Why This Matters**:
- AI detection "confidence" is fake (random 90-99%)
- No learning from user feedback
- Can't show calibration progress (e.g., "Learning: 73% accuracy")
- EWMA trust scoring infrastructure exists but unused
- Database schema complete, update logic missing

**What Needs to Happen**:
1. Create TrustCalibrationEngine with EWMA scoring
2. Wire recovery outcomes (user approved/rejected) to trust updates
3. Update trust_scores table on each outcome
4. Use actual scores in dashboard instead of mocked values
5. Add momentum and volatility tracking (already in schema)

**Files to Modify**:
- NEW: `/apps/api/src/services/trust-calibration.ts`
- `/apps/api/modules/recovery/router.ts` (add outcome webhook)
- `/apps/api/lib/dashboard-metrics.ts` (use actual scores)

**See**: `final_test_framework/arch_remediation.md` **Task 4.4** for full implementation

---

### Gap 5: Dynamic Feature Flags (Task 4.5)

**The Problem**:
```typescript
// packages/config/src/utils/feature-flags.ts
export function isFeatureEnabled(featureKey: string): boolean {
    const feature = FEATURE_FLAGS[featureKey];  // ❌ STATIC ONLY
    return feature?.enabled ?? false;
}

let posthogInstance: PostHog | null = null;  // ❌ INITIALIZED BUT NEVER USED
```

**Why This Matters**:
- Feature flags can't change without code deployment
- No A/B testing capability
- Can't do gradual rollouts (% of users)
- Can't target specific user tiers/segments
- PostHog integration is dead code
- Features disabled (like MCP tools) can't be enabled without redeploy

**What Needs to Happen**:
1. Make `isFeatureEnabled()` async and call PostHog
2. Add fallback to static config if PostHog unavailable
3. Update all call sites to `await isFeatureEnabled()`
4. Add user context/targeting support
5. Configure feature flags in PostHog dashboard

**Files to Modify**:
- `/packages/config/src/utils/feature-flags.ts` (make async, call PostHog)
- All files calling `isFeatureEnabled()` (add await)
- Search: `grep -rn "isFeatureEnabled" apps/ packages/`

**See**: `final_test_framework/arch_remediation.md` **Task 4.5** for full implementation

---

## Implementation Sequence

### Phase Breakdown

**Phase 1-3**: Trust chain and architecture fixes (existing in arch_remediation.md)
- Week 1: SDK ownership extraction
- Week 2: Decision logic consolidation
- Week 3-4: Config/event standardization

**Phase 4**: Critical gap closure (NEW - see tasks 4.1-4.5 in arch_remediation.md)
- Days 1-3: Task 4.1 (Dashboard Metrics)
- Days 4-6: Task 4.5 (Feature Flags)
- Days 7-10: Task 4.2 (Cloud Backup)
- Days 11-13: Task 4.3 (Offline Queue)
- Days 14-17: Task 4.4 (Trust Calibration)

### Recommended Execution Order

```
1. Dashboard Metrics (4.1)       [4-6h]  ← Start here (easiest, highest visibility)
   └─ Shows working metrics immediately

2. Feature Flags (4.5)           [3-4h]  ← Do next (unblocks all others)
   └─ Enables gradual testing of remaining gaps

3. Cloud Backup (4.2)            [5-8h]  ← Infrastructure mostly done
   └─ 100% complete service, just needs wiring

4. Offline Queue (4.3)           [3-5h]  ← Well-tested existing code
   └─ Straightforward event wiring

5. Trust Calibration (4.4)       [6-8h]  ← Most complex (do last)
   └─ Foundation for future ML improvements
```

**Total**: 21-31 hours ≈ 3-4 engineers × 1 week

---

## Success Criteria

After completing all 5 tasks:

| Feature | Current State | Target State | Verification |
|---------|---------------|--------------|--------------|
| Dashboard Metrics | Hardcoded zeros/empty | Actual aggregated data | `GET /api/metrics` returns real counts |
| Cloud Backup | Broken (comment says "TBD") | Working (snapshots uploaded) | `snapshot.cloudBackupUrl` has S3 URL |
| Offline Queue | Non-functional (filled but never drained) | Functional (events replayed on restore) | Queue drains on network 'online' event |
| AI Confidence | Mocked (0.9 + random 0-0.09) | From database (EWMA scores) | `avgConfidence` matches trust_scores table |
| Feature Flags | Static env vars only | PostHog + fallback | Flags toggle in PostHog dashboard without redeploy |

---

## References

**Full Implementation Details**: See `final_test_framework/arch_remediation.md`
- **Task 4.1**: Dashboard Metrics wiring + aggregation methods
- **Task 4.2**: CloudBackup upload + presigned URL endpoint
- **Task 4.3**: Queue processing + network event connection
- **Task 4.4**: EWMA trust calibration engine + outcome webhook
- **Task 4.5**: PostHog integration + dynamic feature flags

**Related Documents**:
- `demo_prep/gold_plating/high_roi_integrations.md` - Feature ownership and ROI analysis
- `claudedocs/deep-architecture-review-10x.md` - Architecture assessment

---

## Quick Commands

```bash
# Phase 1-3 (existing remediation)
git checkout -b fix/architecture-remediation-phase-1
# ... implement Phase 1 tasks ...
pnpm test && pnpm typecheck && git commit

# Phase 4 (new integration gaps)
git checkout -b fix/architecture-remediation-phase-4
# Task 4.1: Dashboard Metrics
# Task 4.5: Feature Flags (unblocks others)
# Task 4.2: Cloud Backup
# Task 4.3: Offline Queue
# Task 4.4: Trust Calibration
pnpm test && pnpm typecheck && git commit
```

---

**Generated**: 2025-12-09
**Next Step**: Review Phase 4 tasks in `arch_remediation.md` and start with Task 4.1
