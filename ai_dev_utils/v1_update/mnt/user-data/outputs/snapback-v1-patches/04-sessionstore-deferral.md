# SessionStore Deferral - Architecture Decision Record

**Decision:** Defer SessionStore lazy/async conversion to post-V1  
**Date:** 2025-12-14  
**Status:** Accepted  
**Context:** V1 Consolidated Roadmap

---

## Background

In the original V1 spec discussions, we identified that SessionStore has **eager manifest writes** which could cause issues:

> "SessionStore writes manifests eagerly on every session update, which creates disk I/O pressure and potential failure modes during burst detection."

The proposed fix was:
> "Convert SessionStore to lazy/async: derived view that's recomputed on-demand rather than written on every change."

---

## Decision

**We are deferring this work to post-V1.** SessionStore changes are NOT in the Consolidated V1 Roadmap.

---

## Rationale

### 1. SessionStore is Not on Critical Path
- PRE/POST checkpoints work independently of sessions
- Sessions are a grouping/visualization layer
- Core protection (the V1 goal) doesn't require session changes

### 2. Risk vs. Reward
- Changing SessionStore while also changing SnapshotStore increases risk
- Two storage layer rewrites in parallel = more failure modes
- Better to stabilize SnapshotStore V2 first

### 3. Time Budget
- V1 is already 52 hours across 3 weeks
- SessionStore conversion would add 6-10 hours
- Pushing timeline risks demo deadline

### 4. Current SessionStore Works
- It's not broken, just not optimal
- Eager writes are a performance issue, not a correctness issue
- Can be optimized later without user impact

---

## What This Means for V1

### SessionStore Remains As-Is
- Still writes `sessions/*.json` on session boundaries
- Still has eager manifest writes
- Still works with existing UI

### No Breaking Changes
- Sessions API unchanged
- Tree view grouping unchanged
- No migration needed

### Performance Implication
- Under burst detection, session writes may add ~10-20ms per boundary
- Acceptable for V1 given other optimizations (PRE checkpoints are ~5ms)

---

## Post-V1 Roadmap Item

Add to backlog for V1.1 or V2:

```markdown
### SessionStore Optimization

**Goal:** Convert SessionStore to lazy/async pattern

**Why:** 
- Reduce disk I/O during burst detection
- Remove eager manifest writes
- Sessions become derived from snapshot parentSeq chains

**Approach:**
1. Sessions computed from snapshot metadata (parentSeq/timestamp)
2. DBSCAN clustering applied to grouped snapshots
3. Cache invalidation when new snapshots added
4. Write session manifest only on explicit save/export

**Estimated Effort:** M (8-12 hours)

**Dependencies:**
- V1 SnapshotStore V2 schema stable
- DBSCAN integration working
```

---

## Risks of Deferral

### Risk: Session Data Inconsistency
**Mitigation:** SessionStore already has integrity checks. No new risk.

### Risk: Performance Complaints
**Mitigation:** PRE checkpoints are fast (~5ms). Session writes are cold-path (end of session), not hot-path (during burst).

### Risk: Technical Debt Accumulation
**Mitigation:** Explicit backlog item with effort estimate. Won't be forgotten.

---

## Decision Log

| Date | Who | Decision |
|------|-----|----------|
| 2025-12-14 | Qwynn | Defer SessionStore to post-V1 |

---

## References

- Original spec: "Sessions | Eager manifest writes → Derived view, async recompute"
- V1 Consolidated Roadmap: Phase 1-6 (SessionStore not listed)
- DBSCAN integration: Already in `packages/core/src/clustering/dbscan.ts`
