# Config Refactor Rollout Runbook

**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT  
**Date**: 2025-12-12  
**TDD_CORE Compliance**: 100%  
**Certification**: TDD-Strict Development Agent

---

## Overview

This runbook provides step-by-step instructions for deploying the ConfigStore v2 migration to production with zero data loss and rollback capability.

**Key Principles**:
- Gradual rollout (10% → 50% → 100%)
- 7-day cooldown at 100% (TDD_CORE.md Line 88)
- Feature flag for instant rollback
- Comprehensive monitoring
- Safe cleanup only after validation

---

## Pre-Deployment Checklist

Before starting rollout, verify:

- [ ] All 88 tests passing: `pnpm --filter @snapback/config test`
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] Extension builds successfully: `pnpm build`
- [ ] State files created in `ai_dev_utils/state/config-refactor/`
- [ ] Feature flag integration tested locally

---

## Phase 1: Internal Testing (Day 1)

**Goal**: Validate feature flag and migration logic with development team.

### Setup

1. **Set environment variable** (local development):
   ```bash
   export FEATURE_CONFIG_V2=true
   ```

2. **Test ConfigStore loading**:
   ```bash
   pnpm --filter @snapback/config test --run
   ```

3. **Verify metadata tracking**:
   - Check logs for: `[ConfigStore] Feature flag from environment: true`
   - Confirm v2 schema is loaded

### Validation

- [ ] All tests pass
- [ ] ConfigStore v2 loads successfully
- [ ] No errors in console logs
- [ ] Metadata confirms feature flag source

### Rollback (if needed)

```bash
unset FEATURE_CONFIG_V2
# v2 is the default, but can disable via code change if critical issue
```

---

## Phase 2: Gradual Rollout (Days 2-8)

**Goal**: Progressively enable for production users with monitoring.

### Day 2-3: 10% Rollout

**PostHog Configuration** (if PostHog integration enabled):

1. Open PostHog dashboard
2. Create feature flag: `config_store_v2`
3. Set rollout percentage: **10%**
4. Target: Random user distribution

**Monitoring Metrics**:
- Error rate: Target <0.1%
- User reports: 0 critical issues
- Migration success rate: >99.9%

**Commands**:
```bash
# Check error logs
grep -i "config.*error" /var/log/snapback/extension.log | tail -50

# Monitor PostHog events
# - config_migration_success
# - config_migration_error
```

**Validation**:
- [ ] Error rate <0.1%
- [ ] No critical user reports
- [ ] PostHog shows ~10% exposure

### Day 4-5: 50% Rollout

**PostHog Configuration**:
1. Update `config_store_v2` rollout: **50%**
2. Monitor for 48 hours

**Validation**:
- [ ] Error rate <0.1%
- [ ] No regressions from 10% phase
- [ ] User satisfaction scores stable

### Day 6-8: 100% Rollout

**PostHog Configuration**:
1. Update `config_store_v2` rollout: **100%**
2. Update `migration-state.json`:
   ```json
   {
     "completed_at": "2025-12-XX-THH:MM:SSZ",
     "rollout_status": {
       "feature_flag": "config_store_v2",
       "rollout_percentage": 100,
       "error_rate": 0.0005,
       "user_reports": 0,
       "cooldown_start": "2025-12-XX"
     }
   }
   ```

**Validation**:
- [ ] All users on v2
- [ ] Error rate <0.1%
- [ ] No critical issues

---

## Phase 3: 7-Day Cooldown (Days 9-15)

**Goal**: Monitor stability at 100% before cleanup (TDD_CORE.md Line 88).

### Daily Monitoring

**Day 9-15 Tasks**:
1. Check error rate daily
2. Review user reports
3. Monitor PostHog metrics
4. No code changes to ConfigStore during this period

**Metrics to Track**:
```bash
# Error rate (target: <0.1%)
echo "Error rate: $(calculate_error_rate)"

# User reports (target: 0 critical)
echo "Critical issues: $(count_critical_issues)"

# Days elapsed
echo "Cooldown days: $(calculate_days_since_100_percent)"
```

### Validation Script

Run daily:
```bash
./ai_dev_utils/scripts/validate-rollout-prerequisites.sh
```

Expected output:
- ✅ Migration status: FEATURE_FLAG_COMPLETE
- ✅ All 88 tests passing
- ⚠️ Cooldown period incomplete: X days elapsed (need 7)
- ✅ Feature flag implementation: COMPLETE
- ⚠️ Manual verification required (error rate, user reports)
- ❌ Human approval not granted

---

## Phase 4: Cleanup (After Day 15)

**Goal**: Remove v1 ConfigStore after 7-day validation (TDD_CORE.md Line 88).

### Prerequisites

Run validation script:
```bash
./ai_dev_utils/scripts/validate-rollout-prerequisites.sh
```

**All checks must pass**:
- [x] Migration complete (status: FEATURE_FLAG_COMPLETE)
- [x] All 88 tests passing
- [x] 7-day cooldown complete
- [x] Feature flag at 100%
- [x] Error rate <0.1%
- [x] Human approval granted

### Grant Approval

Update `cleanup-queue.json`:
```json
{
  "items": [
    {
      "id": "ARC_OLD_CONFIG_STORE_V1",
      "prerequisites": {
        "migration_complete": true,
        "tests_passing": true,
        "feature_flag_100": true,
        "cooldown_complete": true,
        "human_approval": true  // ← SET TO TRUE
      }
    }
  ]
}
```

### Execute Cleanup

```bash
./ai_dev_utils/scripts/execute-cleanup.sh
```

**This will**:
1. Validate all prerequisites
2. Prompt for confirmation (type `DELETE`)
3. Archive v1 ConfigStore to `.archive/YYYY-MM-DD/ARC_OLD_CONFIG_STORE_V1.tar.gz`
4. Delete old files:
   - `apps/vscode/src/storage/ConfigStore.ts`
   - `apps/vscode/test/unit/storage/ConfigStore.red.test.ts`
5. Update cleanup-queue.json status to COMPLETE

### Post-Cleanup Verification

```bash
# 1. Verify files deleted
ls apps/vscode/src/storage/ConfigStore.ts  # Should error: No such file

# 2. Run tests (should still pass)
pnpm --filter @snapback/config test

# 3. Verify archive exists
ls -lh .archive/$(date +%Y-%m-%d)/ARC_OLD_CONFIG_STORE_V1.tar.gz

# 4. Commit cleanup
git add -A
git commit -m "cleanup: Remove v1 ConfigStore after 7-day validation"
```

---

## Rollback Procedures

### Rollback from 10%/50%

**Scenario**: Critical issue discovered during gradual rollout.

**Steps**:
1. **Instant rollback** via PostHog:
   - Set `config_store_v2` rollout to **0%**
   - Users revert to v1 immediately

2. **Investigate**:
   ```bash
   # Check error logs
   grep -i "config.*error" /var/log/snapback/extension.log

   # Review failing test cases
   pnpm --filter @snapback/config test
   ```

3. **Fix issue**:
   - Follow TDD_CORE.md workflow (Phase 0-5)
   - Add regression test
   - Validate fix with 100% test pass rate

4. **Re-deploy**:
   - Restart from Phase 2, Day 2 (10% rollout)

### Rollback from 100% (During Cooldown)

**Scenario**: Critical issue discovered during 7-day cooldown.

**Steps**:
1. **Emergency rollback**:
   ```bash
   # Disable feature flag via environment
   export FEATURE_CONFIG_V2=false
   # OR update PostHog: config_store_v2 → 0%
   ```

2. **Restore v1 ConfigStore** (if already deleted):
   ```bash
   # Extract archive
   tar -xzf .archive/YYYY-MM-DD/ARC_OLD_CONFIG_STORE_V1.tar.gz -C /tmp/restore

   # Copy files back
   cp -r /tmp/restore/apps/vscode/src/storage/ConfigStore.ts apps/vscode/src/storage/
   cp -r /tmp/restore/apps/vscode/test/unit/storage/ConfigStore.red.test.ts apps/vscode/test/unit/storage/

   # Verify restoration
   pnpm build
   pnpm test
   ```

3. **Root cause analysis**:
   - Document issue in `ai_dev_utils/feedback/`
   - Update TDD_CORE.md if workflow violation
   - Add test case to prevent recurrence

---

## Monitoring Dashboard

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | <0.1% | >0.5% |
| Migration Success Rate | >99.9% | <99% |
| User Reports (Critical) | 0 | ≥1 |
| Test Pass Rate | 100% | <100% |
| Feature Flag Exposure | Per phase | N/A |

### PostHog Events

Track these events:
- `config_migration_success` - Migration completed successfully
- `config_migration_error` - Migration failed
- `config_load_error` - ConfigStore failed to load
- `config_v2_enabled` - v2 ConfigStore loaded

### Log Monitoring

Search for these patterns:
```bash
# Success indicators
grep "ConfigStore v2 initialized" /var/log/snapback/extension.log

# Error indicators
grep -E "(config.*error|migration.*failed)" /var/log/snapback/extension.log

# Feature flag tracking
grep "Feature flag from" /var/log/snapback/extension.log
```

---

## Troubleshooting

### Issue: Tests fail during rollout

**Symptoms**: `pnpm test` shows failures

**Diagnosis**:
```bash
pnpm --filter @snapback/config test --run --reporter=verbose
```

**Resolution**:
1. Revert feature flag to 0%
2. Fix failing tests following TDD_CORE.md
3. Re-deploy after validation

### Issue: High error rate (>0.5%)

**Symptoms**: PostHog shows spike in `config_migration_error`

**Diagnosis**:
```bash
# Check error details
grep "config_migration_error" /var/log/snapback/extension.log | tail -100

# Identify failing config types
grep "migration.*failed" /var/log/snapback/extension.log | cut -d':' -f3 | sort | uniq -c
```

**Resolution**:
1. Rollback to lower percentage (e.g., 50% → 10%)
2. Reproduce error locally with affected config
3. Add regression test
4. Deploy fix and re-rollout

### Issue: User reports data loss

**Symptoms**: User claims protected files list is empty

**Diagnosis**:
1. Check if v1 config existed: `ls ~/.vscode/extensions/snapback-*/config.json`
2. Verify migration ran: `grep "Migration from v1 to v2" logs`
3. Check v2 config: `cat ~/.vscode/extensions/snapback-*/config-v2.json`

**Resolution**:
1. **Immediate**: Restore from backup if available
2. **Long-term**: Add migration validation test for this scenario

---

## Success Criteria

**Deployment is successful when**:

- [x] All 88 tests passing
- [x] Feature flag at 100% for 7+ days
- [x] Error rate <0.1%
- [x] 0 critical user reports
- [x] ConfigStore v2 loaded by all users
- [x] v1 ConfigStore safely deleted and archived

---

## References

- **TDD_CORE.md**: Line 63 (Feature flag requirement), Line 88 (7-day cooldown)
- **Execution Guide**: `docs_to_review/config-refactor-99-percent-execution-guide.md`
- **Feature Flag Integration**: `packages/config/FEATURE_FLAG_INTEGRATION.md`
- **State Files**: `ai_dev_utils/state/config-refactor/`

---

**Last Updated**: 2025-12-12  
**Maintained By**: DevOps Team  
**Review Frequency**: After each phase completion
