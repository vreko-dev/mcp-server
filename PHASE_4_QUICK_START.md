# Phase 4: Quick Start Guide

**What**: 5 integration gaps → ready-to-implement fixes
**Where**: `final_test_framework/arch_remediation.md` (Tasks 4.1-4.5)
**When**: 1 week (3-4 engineers)
**How**: Follow task checklist below

---

## The 5 Tasks at a Glance

```
Task 4.1: Dashboard Metrics         ⏱ 4-6h   📍 /apps/api/modules/dashboard/
Task 4.2: Cloud Backup              ⏱ 5-8h   📍 /apps/api/modules/snapshots/
Task 4.3: Offline Queue             ⏱ 3-5h   📍 /apps/vscode/src/services/
Task 4.4: Trust Calibration         ⏱ 6-8h   📍 /apps/api/src/services/
Task 4.5: Feature Flags             ⏱ 3-4h   📍 /packages/config/src/utils/
```

---

## Start Here: Task 4.1 (Dashboard Metrics)

### What's Broken?
```typescript
// apps/api/modules/dashboard/procedures/get-metrics.ts (lines 121-127)
recent_activity: [],  // ❌ Empty
ai_breakdown: { copilot: 0, cursor: 0, claude: 0, windsurf: 0 }  // ❌ Zeros
```

### Why Fix It?
- Users see "no activity" when dashboard should show metrics
- Demo killer: "Here's all the protection... nothing."
- Blocks sales conversation about AI tool detection

### What to Do?
**File**: `final_test_framework/arch_remediation.md` → **Task 4.1** (search for `### Task 4.1`)

Follow these steps in order:
1. Create `/apps/api/src/jobs/daily-metrics-aggregation.ts` (cron job)
2. Update `get-metrics.ts` to call MetricsAggregator
3. Add aggregation methods to `metrics-aggregator.ts`
4. Write tests from provided template
5. Run: `pnpm test && pnpm typecheck`
6. Commit: `git commit -m "feat(dashboard): Wire MetricsAggregator for real metrics"`

### Code Example
```typescript
// Replace hardcoded zeros:
const aggregator = new MetricsAggregator(db);
const aiToolBreakdown = await aggregator.getAIToolDetectionCounts(userId);

// Use real data:
ai_breakdown: {
    copilot: aiToolBreakdown.copilot ?? 0,
    cursor: aiToolBreakdown.cursor ?? 0,
    // ... etc
}
```

---

## Next: Task 4.5 (Feature Flags)

### Why This One?
- Unblocks all other tasks
- Enables gradual testing
- 3-4 hours (quick win)

### What to Do?
**File**: `final_test_framework/arch_remediation.md` → **Task 4.5**

Make `isFeatureEnabled()` async and call PostHog:
```typescript
export async function isFeatureEnabled(
    featureKey: string,
    userId?: string
): Promise<boolean> {
    if (posthogInstance && userId) {
        const isEnabled = await posthogInstance.isFeatureEnabled(featureKey, userId);
        return isEnabled ?? getFallbackFeatureState(featureKey);
    }
    return getFallbackFeatureState(featureKey);
}
```

---

## Then: Task 4.2 (Cloud Backup)

### What's Broken?
```typescript
// apps/api/modules/snapshots/procedures/create-snapshot.ts (line 173)
// cloudBackupUrl would be set by separate upload process if enabled
// ❌ But no such process exists!
```

### Why Fix It?
- Pro tier feature completely non-functional
- CloudBackupService is 100% complete, just never called
- Revenue-blocking feature gap

### What to Do?
**File**: `final_test_framework/arch_remediation.md` → **Task 4.2**

1. Create CloudBackupService instance
2. Call `upload()` after snapshot is saved
3. Store result in database
4. Handle failure gracefully (non-blocking)

---

## Then: Task 4.3 (Offline Queue)

### What's Broken?
```typescript
// apps/vscode/src/services/telemetry-proxy.ts (lines 40-54)
window.addEventListener('online', () => {
    logger.info('Network restored');
    // ❌ Queue processing never called
});
```

### Why Fix It?
- Offline telemetry collected but never replayed
- Queue infrastructure 100% complete
- One-line fix that enables whole feature

### What to Do?
**File**: `final_test_framework/arch_remediation.md` → **Task 4.3**

Simply add:
```typescript
window.addEventListener('online', async () => {
    logger.info('Network restored, processing queue');
    await this.offlineQueue.processQueue();
});
```

---

## Finally: Task 4.4 (Trust Calibration)

### What's Broken?
```typescript
// apps/api/lib/dashboard-metrics.ts (line 133)
avgConfidence: 0.9 + Math.random() * 0.09  // ❌ MOCKED!
```

### Why Fix It?
- AI confidence scores are fake (random 90-99%)
- No learning from user feedback
- EWMA schema exists but unused
- Most complex but complete infrastructure

### What to Do?
**File**: `final_test_framework/arch_remediation.md` → **Task 4.4**

1. Create TrustCalibrationEngine (EWMA scoring)
2. Wire recovery outcomes to trust updates
3. Update dashboard to use real scores

---

## Execution Checklist

### Pre-Implementation
- [ ] Read all 5 task descriptions in `arch_remediation.md` Task 4.x sections
- [ ] Review test templates for each task
- [ ] Set up feature branch: `git checkout -b fix/phase-4-integration-gaps`

### Task 4.1: Dashboard Metrics
- [ ] Create daily metrics aggregation job
- [ ] Update dashboard endpoint to use aggregator
- [ ] Add aggregation methods
- [ ] Write and pass tests
- [ ] Verify dashboard shows real metrics
- [ ] Commit

### Task 4.5: Feature Flags
- [ ] Make `isFeatureEnabled()` async
- [ ] Add PostHog calls with fallback
- [ ] Find all call sites: `grep -rn "isFeatureEnabled"`
- [ ] Update to `await isFeatureEnabled()`
- [ ] Write and pass tests
- [ ] Verify can toggle in PostHog
- [ ] Commit

### Task 4.2: Cloud Backup
- [ ] Integrate CloudBackupService into snapshot creation
- [ ] Set environment variables (S3 bucket, region)
- [ ] Handle upload failures gracefully
- [ ] Write and pass tests
- [ ] Verify snapshots have cloudBackupUrl
- [ ] Commit

### Task 4.3: Offline Queue
- [ ] Wire queue processor to 'online' event
- [ ] Add monitoring/logging
- [ ] Write and pass tests
- [ ] Verify queue drains on network restore
- [ ] Commit

### Task 4.4: Trust Calibration
- [ ] Create TrustCalibrationEngine
- [ ] Create recovery outcome webhook
- [ ] Update dashboard to use real trust scores
- [ ] Write and pass tests
- [ ] Verify confidence scores from database
- [ ] Commit

### Final Verification
- [ ] All tests pass: `pnpm test`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`
- [ ] All commits are in order
- [ ] Create PR with Phase 4 summary

---

## Commands You'll Need

```bash
# Before starting
git checkout -b fix/phase-4-integration-gaps

# While implementing
pnpm test                    # Run tests frequently
pnpm typecheck              # Check types
grep -rn "search-term"      # Find call sites
git add --patch             # Stage selective changes

# After each task
git commit -m "feat(task-name): Description"

# When done
pnpm test && pnpm typecheck && pnpm build
# Create PR
```

---

## Success = Dashboard Shows Real Data

### Before Phase 4
```json
{
  "recent_activity": [],
  "ai_breakdown": {
    "copilot": 0,
    "cursor": 0,
    "claude": 0,
    "windsurf": 0
  },
  "avgConfidence": 0.92  // Mocked
}
```

### After Phase 4
```json
{
  "recent_activity": [
    { "type": "snapshot", "timestamp": 1702180000, "count": 5 },
    { "type": "recovery", "timestamp": 1702179000, "count": 2 }
  ],
  "ai_breakdown": {
    "copilot": 12,
    "cursor": 8,
    "claude": 5,
    "windsurf": 3
  },
  "avgConfidence": 0.78  // From trust_scores table
}
```

---

## Questions?

**For full details**: See `final_test_framework/arch_remediation.md`
**For strategic overview**: See `INTEGRATION_GAPS_REMEDIATION_ROADMAP.md`
**For summary**: See `REMEDIATION_PLAN_SUMMARY.md`

---

**Status**: ✅ Ready to implement
**Time to complete**: 1 week (3-4 engineers)
**Effort**: 21-31 hours total
**Impact**: 5 major features → functional end-to-end
