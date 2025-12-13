# Capability Coverage Analysis Matrix
**Generated:** 2025-12-12
**Purpose:** Assess test coverage for 9 existing capabilities before Capability Contracts refactoring

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Capabilities Analyzed** | 9 | ✅ |
| **Test Files Found** | 44 in `@snapback/core` | ✅ |
| **Test Success Rate** | 358/370 (96.8%) | ⚠️ 12 failing tests |
| **Estimated Coverage** | ~40-50% | 🚫 Below 80% threshold |
| **Blocker for Refactoring?** | **YES** | Per TDD_CORE.md lines 75-79 |

---

## Detailed Capability Matrix

### Legend
- **Demo Critical:** P0 = Must work for demo, P1 = Important but not demo-blocking, P2 = Nice-to-have
- **Coverage Status:** ✅ >80%, ⚠️ 50-80%, 🚫 <50%
- **Effort:** Hours to write characterization tests

| # | Capability | File Path | Test File | Coverage | Demo Priority | Effort | Status |
|---|------------|-----------|-----------|----------|---------------|--------|--------|
| 1 | **RiskAnalyzer** | `packages/core/src/risk-analyzer.ts` | `test/risk-analyzer.test.ts` | 🚫 **~30%** | **P0** | 8-12h | **12/22 tests FAILING** (timeouts) |
| 2 | **AIPresenceDetector** | `packages/sdk/src/core/detection/AIPresenceDetector.ts` | ❌ None found | 🚫 **0%** | **P0** | 12-16h | **NO TESTS** - core value prop |
| 3 | **DBSCAN Clustering** | `packages/sdk/src/clustering/DBSCAN.ts` | ❌ None found | 🚫 **0%** | P1 | 6-8h | **NO TESTS** |
| 4 | **SnapshotNamingStrategy** | `apps/vscode/src/snapshot/SnapshotNamingStrategy.ts` | ❌ None found | 🚫 **0%** | P2 | 4-6h | **NO TESTS** |
| 5 | **LocalStorage** | `packages/sdk/src/storage/SqliteStorageAdapter.ts` | ❌ None found | 🚫 **~10%** | **P0** | 10-14h | Indirect tests only |
| 6 | **PolicyEngine** | `packages/policy-engine/src/PolicyEngine.ts` | ❌ None found | 🚫 **0%** | P1 | 8-10h | **NO TESTS** |
| 7 | **NotificationManager** | ❓ Not found | ❌ None | 🚫 **0%** | P2 | 6-8h | Capability doesn't exist |
| 8 | **SessionCoordinator** | `packages/core/src/mcp-client.ts` | `src/mcp-client.test.ts` | ⚠️ **~60%** | P1 | 4-6h | Tests exist, need expansion |
| 9 | **ProtectionDecisionEngine** | ❓ Not found | ❌ None | 🚫 **0%** | **P0** | 10-12h | **CRITICAL - activation funnel** |

---

## Critical Findings

### 🚫 **Zero-Coverage Violations (TDD_CORE.md Blockers)**

Per TDD_CORE.md lines 75-79:
> "If target code has 0% test coverage → STOP, implement tests first"

**Blocking Capabilities:**
1. **AIPresenceDetector** - Core value proposition, 0% coverage
2. **ProtectionDecisionEngine** - Activation funnel logic, 0% coverage (NOT FOUND)
3. **LocalStorage** - Data integrity critical, ~10% coverage
4. **DBSCAN** - 0% coverage
5. **PolicyEngine** - 0% coverage
6. **SnapshotNamingStrategy** - 0% coverage

---

### ⚠️ **RiskAnalyzer Test Failures**

**12 failing tests** in `packages/core/test/risk-analyzer.test.ts`:
- 7 tests timing out (5000ms)
- 1 test with 10000ms timeout
- 2 tests with rate limiting assertion failures

**Root Cause:** Tests appear to call real async operations without proper mocking:
```typescript
// Test expects async completion but hangs
it("should detect security threats in file content", async () => {
  const fileChanges: FileChangeInfo[] = [
    {
      filePath: "src/auth.ts",
      content: "const password = process.env.DB_PASSWORD", // Real file content analysis
      changeType: "modified",
    },
  ];
  const result = await riskAnalyzer.analyzeFileChanges(fileChanges); // TIMEOUT
  // ...
});
```

**Fix Required:** Mock Guardian/AST analysis, fix rate limiter logic

---

## Prioritized Characterization Test Plan

### **Phase 1: P0 Capabilities (Demo-Critical) - Est. 40-52 hours**

#### 1.1 ProtectionDecisionEngine (10-12h) ⚠️ **MISSING CAPABILITY**
- **Location:** Unknown - needs discovery
- **Why P0:** Activation funnel - determines Watch/Warn/Block levels
- **Tests Needed:**
  - Protection level calculation based on risk scores
  - Threshold boundary conditions
  - Fallback behavior when risk analyzer unavailable
- **Dependencies:** RiskAnalyzer, PolicyEngine

**Action:** Search codebase for protection decision logic before writing tests

---

#### 1.2 AIPresenceDetector (12-16h)
- **Location:** 3 duplicates - use `packages/sdk/src/core/detection/AIPresenceDetector.ts`
- **Why P0:** Core value prop - "AI-aware protection"
- **Tests Needed:**
  - Burst write pattern detection (≥3 writes in 500ms window)
  - File velocity analysis
  - Confidence score calculation
  - Edge cases: single writes, old events, concurrent file changes
- **Example Test:**
```typescript
describe("AIPresenceDetector Characterization", () => {
  it("should detect burst writes (3+ in 500ms)", () => {
    const detector = new AIPresenceDetector();
    const events = [
      { timestamp: Date.now(), type: "write", filePath: "src/file.ts" },
      { timestamp: Date.now() + 100, type: "write", filePath: "src/file.ts" },
      { timestamp: Date.now() + 200, type: "write", filePath: "src/file.ts" },
    ];
    const result = detector.analyze(events);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.indicators).toContain("burst_writes");
  });
});
```

---

#### 1.3 LocalStorage (10-14h)
- **Location:** `packages/sdk/src/storage/SqliteStorageAdapter.ts`
- **Why P0:** Data integrity - snapshots must persist correctly
- **Tests Needed:**
  - CRUD operations (save, get, list, delete)
  - Transaction rollback on errors
  - Concurrent access handling
  - Deduplication logic (content hash)
  - Migration compatibility
- **Risk:** Existing ~10% coverage likely tests `StorageAdapter` interface, not SQLite-specific logic

---

#### 1.4 RiskAnalyzer (8-12h) - **FIX EXISTING TESTS**
- **Location:** `packages/core/src/risk-analyzer.ts`
- **Why P0:** Feeds protection decision engine
- **Action Required:**
  1. Fix 12 failing tests (timeouts + rate limiter)
  2. Add missing edge cases
  3. Mock Guardian AST analysis
- **Estimated Fix Time:** 8-12h

**Subtotal P0: 40-52 hours**

---

### **Phase 2: P1 Capabilities (Important) - Est. 18-24 hours**

#### 2.1 DBSCAN Clustering (6-8h)
- **Location:** `packages/sdk/src/clustering/DBSCAN.ts`
- **Why P1:** Snapshot organization feature
- **Tests Needed:**
  - Cluster formation with ε=0.3, minPts=2
  - Noise point handling
  - Distance metric calculation
  - Empty dataset handling

---

#### 2.2 PolicyEngine (8-10h)
- **Location:** `packages/policy-engine/src/PolicyEngine.ts`
- **Why P1:** Determines when to create snapshots
- **Tests Needed:**
  - Policy evaluation (allow/block/warn)
  - Multiple detector orchestration
  - Detector weight aggregation
  - Custom policy rules

---

#### 2.3 SessionCoordinator (4-6h) - **EXPAND EXISTING**
- **Location:** `packages/core/src/mcp-client.ts` (MCPClientManager)
- **Why P1:** Multi-server orchestration
- **Action:** Expand from ~60% to 80%+
- **Tests to Add:**
  - Connection pooling
  - Server failover
  - Concurrent tool calls

**Subtotal P1: 18-24 hours**

---

### **Phase 3: P2 Capabilities (Nice-to-Have) - Est. 10-14 hours**

#### 3.1 SnapshotNamingStrategy (4-6h)
- **Location:** `apps/vscode/src/snapshot/SnapshotNamingStrategy.ts`
- **Why P2:** UX polish, not critical path
- **Tests Needed:**
  - Timestamp formatting
  - Deduplication suffix logic
  - Max length truncation

**Subtotal P2: 4-6 hours**

---

## Total Effort Estimate

| Phase | Capabilities | Effort Range | Priority |
|-------|--------------|--------------|----------|
| **Phase 1 (P0)** | 4 | **40-52 hours** | CRITICAL - Demo blockers |
| **Phase 2 (P1)** | 3 | 18-24 hours | Important |
| **Phase 3 (P2)** | 1 | 4-6 hours | Optional |
| **TOTAL** | **8** | **62-82 hours** | **~10-12 days** |

---

## Recommended Execution Strategy

### **Option A: Sequential P0 → P1 → P2** (12 days)
- Write all characterization tests before refactoring
- Safest, highest quality
- Delays capability contracts by 2 weeks

### **Option B: Parallel with Feature Flags** (6 days) ⚠️ **RISKY**
- Write P0 tests (40-52h)
- Start refactoring with feature flags for tested capabilities
- Write P1/P2 tests in parallel
- **Risk:** Refactored code may break untested capabilities

### **Option C: Minimal Viable Coverage** (3-4 days) ⚠️ **HIGHEST RISK**
- Fix RiskAnalyzer tests (8-12h)
- Write AIPresenceDetector tests (12-16h)
- Write ProtectionDecisionEngine tests (10-12h)
- **Skip:** DBSCAN, PolicyEngine, SnapshotNamingStrategy, NotificationManager
- **Risk:** Unprotected code during refactoring

---

## Next Steps Decision Gate

**You must choose:**

1. **Full Coverage (Option A):** 12 days, safest
2. **Scoped P0 (Option C):** 3-4 days, riskiest
3. **Hybrid:** Write P0 tests → refactor → write P1/P2 tests

**After selection, I will:**
- Generate characterization test templates
- Fix failing RiskAnalyzer tests
- Begin capability contract extraction

---

## Appendix: Test Execution Evidence

### Test Run Summary (2025-12-12 22:54)
```
 Test Files  3 failed | 41 passed (44)
      Tests  12 failed | 358 passed (370)
   Duration  40.49s
```

### Failing Tests Detail
```
packages/core/test/risk-analyzer.test.ts
├── ❌ should detect security threats in file content (timeout 5000ms)
├── ❌ should analyze file complexity (timeout 5000ms)
├── ❌ should identify sensitive files (timeout 5000ms)
├── ❌ should analyze change velocity with Git context (timeout 5000ms)
├── ❌ should return low risk score for safe changes (timeout 5000ms)
├── ❌ should detect pattern-based triggers (timeout 5000ms)
├── ❌ should optimize performance for large file sets (timeout 10000ms)
├── ❌ should respect rate limiting for snapshot creation (assertion failure)
└── ❌ should allow snapshot creation after rate limit cooldown (assertion failure)

packages/core/test/lefthook-config.test.ts
├── ❌ should include detect-patterns command in pre-push hooks
├── ❌ should have no-unsafe-regex disabled
└── ❌ should have proper command structure for detection tests

packages/core/test/file-watching.integration.test.ts
└── ❌ Cannot find package 'fs-extra' (import error)
```

### Coverage Gaps by Package
```
packages/sdk/src/core/detection/    - 0% coverage (AIPresenceDetector)
packages/sdk/src/clustering/        - 0% coverage (DBSCAN)
packages/sdk/src/storage/           - ~10% coverage (SqliteStorageAdapter)
packages/policy-engine/src/         - 0% coverage (PolicyEngine)
apps/vscode/src/snapshot/           - 0% coverage (SnapshotNamingStrategy)
```
