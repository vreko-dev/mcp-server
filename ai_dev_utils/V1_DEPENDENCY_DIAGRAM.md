# V1 Implementation Dependency Diagram

## Phase Dependencies

```
                    ┌──────────────────────┐
                    │   PHASE 5: TESTING   │
                    │ (Week 3: 10 hours)   │
                    │                      │
                    │ • Concurrency tests  │
                    │ • Perf budgets       │
                    │ • Crash recovery     │
                    │ • Schema migration   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
    ┌───────────▼──────┐  ┌────▼──────────┐  │
    │  PHASE 4: UX     │  │  PHASE 6:     │  │
    │  Onboarding      │  │  Config       │  │
    │ (Week 2: 8h)     │  │ (Week 3: 8h)  │  │
    │                  │  │               │  │
    │ • Progressive    │  │ • Project     │  │
    │   Disclosure     │  │   Detection   │  │
    │ • Walkthrough    │  │ • Config      │  │
    │   Telemetry      │  │   Validator   │  │
    │ • Type filtering │  │               │  │
    └────────┬─────────┘  └───────┬───────┘  │
             │                    │          │
             └────────┬───────────┘          │
                      │                      │
            ┌─────────▼──────────┐           │
            │  PHASE 3: SAFETY   │           │
            │  (Week 2: 10h)     │───────────┘
            │                    │
            │ • RollbackService  │
            │ • PRE_ROLLBACK     │
            │ • Perf instrument  │
            └─────────┬──────────┘
                      │
                      │ depends on
                      │
            ┌─────────▼──────────┐
            │  PHASE 1: STORAGE  │ ◄─── CRITICAL PATH
            │  (Week 1: 12h)     │
            │                    │
            │ • V2 Schema        │
            │ • State/Index      │
            │ • PRWManager       │
            │ • SnapshotStore v2 │
            └─────────┬──────────┘
                      │
                      │ parallel with
                      │
            ┌─────────▼──────────┐
            │ PHASE 2: UX Utils  │
            │ (Week 1: 4h)       │
            │                    │
            │ • ProgressReporter │ (already done ✅)
            │ • StatusBarAnimtr  │
            │ • TreeItemBadge    │
            └────────────────────┘
```

## Execution Timeline

```
WEEK 1 (14 hours):
═══════════════════════════════════════════════════════════
Mon   Tue   Wed   Thu   Fri
├─P1──┼─P1──┼─P1──┤                          P1 = Phase 1 (12h)
│ 4h  │ 4h  │ 4h  │                          P2 = Phase 2 (4h)
└─────┴─────┴─────┘
P2: Days 1-3 (4h parallel validation)

WEEK 2 (14 hours):
═══════════════════════════════════════════════════════════
Mon   Tue   Wed   Thu   Fri
├─P3──┼─P3──┼─P4──┼─P4──┼─P4──┤             P3 = Phase 3 (10h)
│ 4h  │ 6h  │ 3h  │ 3h  │ 2h  │             P4 = Phase 4 (8h)
└─────┴─────┴─────┴─────┴─────┘

WEEK 3 (24 hours):
═══════════════════════════════════════════════════════════
Mon   Tue   Wed   Thu   Fri
├─P5──┼─P5──┼─P5──┼─P6──┼─P6──┤             P5 = Phase 5 (10h)
│ 3h  │ 3h  │ 2h  │ 3h  │ 2h  │             P6 = Phase 6 (8h)
├─P6──┼─P6──┼─────┼─────┼─────┤             P6 also Days 1-3
│ 3h  │ 3h  │ 2h  │     │     │
└─────┴─────┴─────┴─────┴─────┘
```

## Critical Path & Gates

```
PHASE 1 (Storage Foundation) ⭐ CRITICAL
├─ types.ts update (types + guards)
├─ storeState.ts creation (state/index)
├─ SnapshotStore.ts upgrade (V2 + PRE)
├─ PRWManager.ts creation (rate limiting)
└─ GATE: All unit tests passing
        └─ Unblocks: PHASES 3, 4, 6

PHASE 2 (UX Utilities) ↔ PARALLEL with PHASE 1
├─ Verify ProgressReporter tests (24 tests)
├─ Verify StatusBarAnimator tests (27 tests)
├─ Verify TreeItemBadgeProvider tests (36 tests)
└─ GATE: 113 integration tests passing
        └─ Unblocks: PHASES 4 (partially)

PHASE 3 (Safety Layer) → Sequence after PHASE 1
├─ RollbackService.ts creation
├─ RollbackService wiring to UI
├─ perf.ts instrumentation
└─ GATE: 20+ integration tests + performance budget validation
        └─ Unblocks: PHASE 5 (partially)

PHASE 4 (UX Onboarding) → Sequence after PHASES 1, 2
├─ ProgressiveDisclosureController wiring
├─ WalkthroughTracker telemetry
├─ Snapshot type filtering
└─ GATE: 15+ progressive disclosure + 10+ telemetry tests
        └─ Unblocks: PHASE 5 (validation)

PHASE 5 (Testing) → Sequence after PHASES 1-4
├─ Concurrency tests (race conditions)
├─ Performance budget tests (all critical paths)
├─ Crash recovery tests (state corruption)
├─ Schema migration tests (V1→V2 compat)
└─ GATE: All tests passing, >80% coverage
        └─ Unblocks: PHASE 6 (validation)

PHASE 6 (Config) → Sequence after PHASES 1, 5
├─ ProjectDetector (5+ types)
├─ ConfigValidator (inline validation)
├─ Integration with SmartDefaults
└─ GATE: 20+ detection + 15+ validation tests
        └─ FINAL GATE: All 6 phases complete
```

## Blocker Scenarios & Contingencies

```
Scenario 1: PHASE 1 overruns (e.g., 16 hours instead of 12)
├─ Impact: PHASE 3, 4, 6 delayed by 4 hours
├─ Mitigation: Reduce scope (defer advanced error handling)
└─ Contingency: Use interface stubs in Phases 3-4

Scenario 2: Test infrastructure issues (vitest, MSW)
├─ Impact: PHASE 5 delayed significantly
├─ Mitigation: Fix test setup in parallel with Phase 1
└─ Contingency: Manual testing for Phase 5 (not ideal)

Scenario 3: PHASE 1 breaks existing storage layer
├─ Impact: ALL downstream phases blocked
├─ Mitigation: Extensive compatibility testing (V1 manifest normalization)
├─ Contingency: Rollback to previous types.ts, restart Phase 1
└─ Prevention: Test V1→V2 conversion thoroughly before merging

Scenario 4: Race condition found after Phase 1 completion
├─ Impact: Phase 3-5 affected
├─ Mitigation: Add concurrent tests as part of Phase 5
└─ Contingency: Fix race condition, re-run Phase 5 tests

Scenario 5: Performance budgets not achievable
├─ Impact: PHASE 3 and 5 affected
├─ Mitigation: Measure continuously with perf.ts
├─ Contingency: Increase budget or reduce scope (e.g., defer async operations)
└─ Prevention: Prototype perf measurements early in Phase 1
```

## Communication Checkpoints

```
Week 1 Completion (Mon start of Week 2):
├─ Phase 1 Status: On track / Behind / Blocked
├─ Phase 2 Status: Complete ✅
├─ Metrics: Unit test count, coverage %, performance measurements
└─ Go/No-go for Phase 3 start

Week 2 Completion (Mon start of Week 3):
├─ Phase 3 Status: On track / Behind / Blocked
├─ Phase 4 Status: On track / Behind / Blocked
├─ Integration points verified: Phase 1 + Phase 3 wiring
└─ Go/No-go for Phase 5 start

Week 3 Completion:
├─ Phase 5 Status: Test coverage, performance metrics
├─ Phase 6 Status: On track / Behind / Blocked
├─ Final metrics: Total test count, coverage %, performance
└─ V1 Ready for Release ✅
```

## Key Assumptions

1. **Phase 1 completes EOD Week 1:** Types, state management, and SnapshotStore upgrade are foundational and must not delay
2. **TypeScript compilation is gateway:** If Phase 1 types.ts doesn't compile, nothing proceeds
3. **Test infrastructure stable:** vitest, MSW, mocking setup available from start
4. **V1 manifest compatibility:** All existing snapshots must continue to work (normalizeToV2 pattern)
5. **Performance measurable:** All critical paths can be instrumented with perf.ts utility
6. **Parallel work non-conflicting:** Phase 2 (UX Utils) and Phase 1 (Storage) don't interfere
7. **Interface stubs acceptable:** If Phase 1 delayed, Phase 3-4 can use mocks

## Success Metrics

| Metric | Target | Acceptance |
|--------|--------|-----------|
| Timeline | 3 weeks (52 hours) | On schedule or 1 day slip |
| Test Coverage | >80% new code | No components <75% |
| Performance | All budgets met | No p95 violations |
| Backward Compat | V1 manifests work | 0 data loss scenarios |
| Reliability | 100% crash recovery | Rebuild succeeds every time |
| Concurrency | No race conditions | 100+ concurrent ops safe |
| UX Value | 5 min → <1 min | ProjectDetector reduces setup |

---

## Quick Reference: Phase Owners & Dependencies

```
┌─────────────┬──────────────┬────────────┬──────────────────┐
│ Phase       │ Owner(s)     │ Duration   │ Dependencies     │
├─────────────┼──────────────┼────────────┼──────────────────┤
│ 1: Storage  │ Backend/Core │ 12h/W1     │ NONE (Critical)  │
│ 2: UX Utils │ Frontend     │ 4h/W1      │ NONE (Parallel)  │
│ 3: Safety   │ Core/Backend │ 10h/W2     │ Phase 1          │
│ 4: UX Onb.  │ Frontend/UX  │ 8h/W2      │ Phases 1, 2      │
│ 5: Testing  │ QA/All       │ 10h/W3     │ Phases 1-4       │
│ 6: Config   │ Frontend/UX  │ 8h/W3      │ Phases 1, 5      │
└─────────────┴──────────────┴────────────┴──────────────────┘
```

