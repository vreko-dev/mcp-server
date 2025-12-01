# SnapBack Alpha Gap Closure - Free/Solo Focus

## Mission

Close SnapBack Free/Solo Alpha gaps and turn all acceptance gates green WITHOUT introducing Team/Enterprise or billing functionality. Preserve privacy guarantees: Free tier operates local-only, Solo backend requires explicit user consent.

## Scope Flags

```typescript
ALPHA = true
ENABLE_TEAMS = false
ENABLE_BILLING = false
ENABLE_SSO = false
```

## Current State Assessment

**Overall Completion**: 70% (based on codebase analysis)

**Critical Gaps Identified**:
1. CI guard script missing - no automated quality enforcement
2. Performance harness missing - no budget validation
3. Cloud backup integration unverified
4. E2E test coverage incomplete
5. Documentation lacks tier-aware components
6. Analytics wrapper enforcement not automated
7. Admin console missing

**Estimated Remaining**: ~52 hours for MVP Alpha release

---

## Execution Strategy

### Sequential Task Order

Tasks must be executed in strict sequence to maintain dependency order:

1. **Guards & Contracts** - Foundation for quality gates
2. **Core Snapshot/Restore** - Core product functionality
2.5. **Session Layer + Treelist UI** - Session-based change grouping
3. **Cloud Verification** - Data integrity validation
4. **Auth + E2E** - User flows and authentication
5. **Documentation** - Free/Solo user experience
6. **Analytics Wrapper** - Privacy-compliant telemetry
7. **Reliability Basics** - Production readiness
8. **Packaging** - Deployment artifacts
9. **Admin Flags** - Operational control
10. **Score Report** - Completion validation

### Stop Rules

**STOP immediately if**:
- Any CI guard fails
- Any performance budget fails
- E2E tests fail on critical paths
- Security vulnerability discovered

**Fix before proceeding to next task**

### Constraints

- ❌ NO Team/Enterprise code paths (except stubs gated by `ENABLE_TEAMS=false`)
- ❌ NO billing/Stripe integration (except stubs gated by `ENABLE_BILLING=false`)
- ❌ NO SSO/SAML/SCIM features
- ✅ YES privacy guarantees enforced (Free = local-only)
- ✅ YES feature flags for future capabilities

---

## Current State Analysis

### Completion by Lane (Current)

| Lane | Component | Current % | Status | Blocker |
|------|-----------|-----------|--------|----------|
| Phase 0 | Contracts & Guards | 95% | ⚠️ Partial | CI guards missing |
| Lane A | Snapshots & Restore | 65% | ⚠️ Partial | Cloud backup unverified |
| Lane B | Guardian & Policies | 75% | ✅ Strong | Minor gaps only |
| Lane C | Team & Sharing | 20% | ✅ Stub | By design (deferred) |
| Lane D | MCP Integration | 85% | ✅ Strong | Minor polish needed |
| Lane E | Auth & Billing | 80% | ⚠️ Partial | E2E gaps, billing off |
| Lane F | Documentation | 40% | ❌ Critical | Tier components missing |
| Lane G | Analytics & Feedback | 70% | ⚠️ Partial | Wrapper not enforced |
| Lane H | Reliability | 60% | ⚠️ Partial | Observability gaps |
| Lane I | Testing & QA | 55% | ❌ Critical | E2E incomplete |
| Lane J | Packaging & Release | 50% | ⚠️ Partial | Not validated |
| Lane K | Admin & Support | 30% | ❌ Critical | Console missing |

### Quality Gates Status

| Gate | Required | Current | Gap |
|------|----------|---------|-----|
| CI Guards Pass | ✅ | ❌ | Guard script not implemented |
| Performance Budgets Met | ✅ | ❌ | Harness not implemented |
| E2E Critical Paths Pass | ✅ | ⚠️ | Incomplete coverage |
| Test Coverage ≥70% | ✅ | ❓ | Not measured |
| Docs Link Check Pass | ✅ | ❌ | Tier components missing |
| Privacy Guarantees Verified | ✅ | ⚠️ | Design correct, not tested |

---

---

## TASK 1: CI Guards Implementation

### Objective

Create automated CI guard script to enforce Alpha scope constraints and prevent quality regressions.

### Duration

4 hours

### Deliverables

#### Guard Script
**Location**: `scripts/ci/guard.sh`

**Validation Rules**:

1. **Terminology Enforcement**
   - Fail on: `"checkpoint"` string in code/docs
   - Fail on: Legacy actions `"apply"` or `"review"` in policy context
   - Allowlist: `.guard-allowlist.txt` (glob patterns)
   - Exceptions: Migration docs, legacy references explicitly marked

2. **Analytics Privacy**
   - Fail on: Direct `posthog.capture(` calls
   - Allowed: Usage within `@snapback/analytics-client` package only
   - Validate: All analytics go through sanitization wrapper

3. **Scope Enforcement**
   - Fail on: `"SSO"`, `"SAML"`, `"SCIM"` mentions
   - Allowed: Only in `apps/docs/content/enterprise/` directory
   - Allowed: Environment variable names (e.g., `SSO_ENABLED`)

4. **Feature Flag Validation**
   - Verify: `ENABLE_TEAMS = false`
   - Verify: `ENABLE_BILLING = false`
   - Verify: `ENABLE_SSO = false`

**Implementation Approach**:

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

VIOLATIONS=0

# Function: Check for forbidden strings with allowlist
check_forbidden() {
  local pattern=$1
  local description=$2
  local allowlist_file=".guard-allowlist.txt"

  # Find all occurrences
  results=$(grep -r "$pattern" . \
    --include="*.ts" --include="*.tsx" --include="*.js" \
    --include="*.md" --include="*.mdx" \
    --exclude-dir=node_modules --exclude-dir=.git \
    --exclude-dir=dist --exclude-dir=build \
    || true)

  # Filter against allowlist if exists
  if [ -f "$allowlist_file" ]; then
    while IFS= read -r allowed_path; do
      results=$(echo "$results" | grep -v "$allowed_path" || true)
    done < "$allowlist_file"
  fi

  # Report violations
  if [ -n "$results" ]; then
    echo -e "${RED}✗ VIOLATION: $description${NC}"
    echo "$results"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo -e "${GREEN}✓ PASS: $description${NC}"
  fi
}

# Execute checks
check_forbidden "checkpoint" "Legacy 'checkpoint' terminology"
check_forbidden "\"apply\"" "Legacy 'apply' policy action"
check_forbidden "\"review\"" "Legacy 'review' policy action"
check_forbidden "posthog\.capture" "Direct PostHog usage (must use wrapper)"
check_forbidden "\bSSO\b" "SSO mentioned outside enterprise docs"
check_forbidden "\bSAML\b" "SAML mentioned outside enterprise docs"
check_forbidden "\bSCIM\b" "SCIM mentioned outside enterprise docs"

# Exit with failure if violations found
if [ $VIOLATIONS -gt 0 ]; then
  echo -e "${RED}Guard failed with $VIOLATIONS violation(s)${NC}"
  exit 1
fi

echo -e "${GREEN}All guards passed${NC}"
exit 0
```

#### Allowlist File
**Location**: `.guard-allowlist.txt`

```
ARCHIVE/
.qoder/quests/
docs/migration/
CLAUDE.md
README.md
```

#### GitHub Actions Integration
**Location**: `.github/workflows/alpha.yml`

```yaml
name: Alpha CI Gates

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  guards:
    name: CI Guards
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Guard Script
        run: bash scripts/ci/guard.sh

  build:
    name: Build & Test
    needs: guards
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.11.0'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10.14.0

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test
```

### Acceptance Criteria

- [ ] Guard script exists at `scripts/ci/guard.sh`
- [ ] Script is executable: `chmod +x scripts/ci/guard.sh`
- [ ] Allowlist file created: `.guard-allowlist.txt`
- [ ] GitHub workflow created: `.github/workflows/alpha.yml`
- [ ] Seeded violation test: Add "checkpoint" to test file → guard fails
- [ ] Clean tree test: Run on current codebase → guard passes
- [ ] CI integration: Workflow runs on PR and blocks merge if guard fails

### Test Plan

**Test 1: Terminology Violation**
```bash
# Create test file with violation
echo 'const x = "checkpoint";' > test-violation.ts

# Run guard (should fail)
bash scripts/ci/guard.sh

# Expected: Exit code 1, violation reported

# Cleanup
rm test-violation.ts
```

**Test 2: Direct PostHog Usage**
```bash
# Create test file with analytics violation
echo 'posthog.capture("EVENT", {});' > test-analytics.ts

# Run guard (should fail)
bash scripts/ci/guard.sh

# Expected: Exit code 1, analytics violation reported

# Cleanup
rm test-analytics.ts
```

**Test 3: Allowlist Exception**
```bash
# Add line to allowlist
echo "test-allowed.md" >> .guard-allowlist.txt

# Create allowed file with "checkpoint"
echo '# Checkpoint migration guide' > test-allowed.md

# Run guard (should pass)
bash scripts/ci/guard.sh

# Expected: Exit code 0, no violations

# Cleanup
rm test-allowed.md
```

**Test 4: Clean Codebase**
```bash
# Run guard on current codebase
bash scripts/ci/guard.sh

# Expected: Exit code 0, all checks pass
```

### Dependencies

None - foundational task

### Risks

**False Positives**:
- Legitimate use of "checkpoint" in comments
- Mitigation: Careful allowlist configuration

**Allowlist Management**:
- Allowlist could become stale
- Mitigation: Review allowlist in PR process

### Files Created

- `scripts/ci/guard.sh`
- `.guard-allowlist.txt`
- `.github/workflows/alpha.yml`

### Files Modified

None

### Validation

```bash
# 1. Make guard script executable
chmod +x scripts/ci/guard.sh

# 2. Run locally
bash scripts/ci/guard.sh

# 3. Check exit code
echo $?  # Should be 0 for pass

# 4. Trigger CI (push to branch)
git add .
git commit -m "feat: add CI guard script"
git push origin feature/ci-guards

# 5. Verify GitHub Actions runs guard step
# 6. Confirm guard passes in CI logs
```

---

---

## TASK 2: Performance Harness Implementation

### Objective

Implement automated performance testing with CI-enforced budgets to ensure Alpha meets latency requirements.

### Duration

4 hours

### Deliverables

#### Performance Test Suite
**Location**: `packages/perf/tests/perf.spec.ts`

**Benchmarks Required**:

1. **Snapshot Creation**: p95 < 100ms (500-file fixture)
2. **Risk Analysis**: < 500ms (10 files)
3. **Session Tracking**: < 50ms
4. **Analytics TTI**: < 2000ms

**Implementation Structure**:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { performance } from 'node:perf_hooks';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  p50: number;
  p90: number;
  p95: number;
  budget: number;
  passed: boolean;
}

interface PerformanceBaseline {
  hardware: {
    cpu: string;
    memory: string;
    os: string;
    ci_runner?: string;
  };
  benchmarks: Record<string, BenchmarkResult>;
  timestamp: string;
}

// Performance measurement utility
class PerformanceMeasurer {
  private measurements: number[] = [];

  async measure(fn: () => Promise<void> | void): Promise<void> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    this.measurements.push(end - start);
  }

  getResults() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)],
      p90: sorted[Math.floor(len * 0.9)],
      p95: sorted[Math.floor(len * 0.95)],
      mean: sorted.reduce((a, b) => a + b, 0) / len,
      min: sorted[0],
      max: sorted[len - 1]
    };
  }

  reset() {
    this.measurements = [];
  }
}

describe('Performance Benchmarks', () => {
  const measurer = new PerformanceMeasurer();
  const ITERATIONS = 10;
  const results: BenchmarkResult[] = [];

  beforeAll(async () => {
    // Create test fixture (500 files)
    await createTestFixture();
  });

  it('Snapshot creation p95 < 100ms', async () => {
    const budget = 100; // ms
    measurer.reset();

    for (let i = 0; i < ITERATIONS; i++) {
      await measurer.measure(async () => {
        await createSnapshot500Files();
      });
    }

    const stats = measurer.getResults();
    const passed = stats.p95 < budget;

    results.push({
      operation: 'snapshot_creation',
      iterations: ITERATIONS,
      ...stats,
      budget,
      passed
    });

    console.log(`Snapshot creation: p50=${stats.p50.toFixed(2)}ms, p90=${stats.p90.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms (budget: ${budget}ms)`);

    expect(stats.p95).toBeLessThan(budget);
  });

  it('Risk analysis < 500ms', async () => {
    const budget = 500; // ms
    measurer.reset();

    for (let i = 0; i < ITERATIONS; i++) {
      await measurer.measure(async () => {
        await analyzeRisk10Files();
      });
    }

    const stats = measurer.getResults();
    const passed = stats.p95 < budget;

    results.push({
      operation: 'risk_analysis',
      iterations: ITERATIONS,
      ...stats,
      budget,
      passed
    });

    console.log(`Risk analysis: p50=${stats.p50.toFixed(2)}ms, p90=${stats.p90.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms (budget: ${budget}ms)`);

    expect(stats.p95).toBeLessThan(budget);
  });

  it('Session tracking < 50ms', async () => {
    const budget = 50; // ms
    measurer.reset();

    for (let i = 0; i < ITERATIONS; i++) {
      await measurer.measure(async () => {
        await trackSession();
      });
    }

    const stats = measurer.getResults();
    const passed = stats.p95 < budget;

    results.push({
      operation: 'session_tracking',
      iterations: ITERATIONS,
      ...stats,
      budget,
      passed
    });

    console.log(`Session tracking: p50=${stats.p50.toFixed(2)}ms, p90=${stats.p90.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms (budget: ${budget}ms)`);

    expect(stats.p95).toBeLessThan(budget);
  });

  it('Analytics TTI < 2000ms', async () => {
    const budget = 2000; // ms
    measurer.reset();

    for (let i = 0; i < ITERATIONS; i++) {
      await measurer.measure(async () => {
        await measureAnalyticsTTI();
      });
    }

    const stats = measurer.getResults();
    const passed = stats.p95 < budget;

    results.push({
      operation: 'analytics_tti',
      iterations: ITERATIONS,
      ...stats,
      budget,
      passed
    });

    console.log(`Analytics TTI: p50=${stats.p50.toFixed(2)}ms, p90=${stats.p90.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms (budget: ${budget}ms)`);

    expect(stats.p95).toBeLessThan(budget);
  });

  afterAll(async () => {
    // Write baseline JSON
    await writeBaseline(results);
  });
});

// Helper functions
async function createTestFixture() {
  // Implementation: Create 500 test files
}

async function createSnapshot500Files() {
  // Implementation: Call snapshot creation API
}

async function analyzeRisk10Files() {
  // Implementation: Call risk analysis API
}

async function trackSession() {
  // Implementation: Call session tracking API
}

async function measureAnalyticsTTI() {
  // Implementation: Measure analytics page load time
}

async function writeBaseline(results: BenchmarkResult[]) {
  const baseline: PerformanceBaseline = {
    hardware: {
      cpu: os.cpus()[0].model,
      memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
      os: `${os.platform()} ${os.release()}`,
      ci_runner: process.env.CI ? 'GitHub Actions' : undefined
    },
    benchmarks: Object.fromEntries(
      results.map(r => [r.operation, r])
    ),
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(process.cwd(), '.perf-baseline.json'),
    JSON.stringify(baseline, null, 2)
  );
}
```

#### Baseline File
**Location**: `.perf-baseline.json`

```json
{
  "hardware": {
    "cpu": "Intel Core i7-9750H",
    "memory": "16GB",
    "os": "darwin 21.6.0",
    "ci_runner": "GitHub Actions"
  },
  "benchmarks": {
    "snapshot_creation": {
      "operation": "snapshot_creation",
      "iterations": 10,
      "p50": 65.2,
      "p90": 82.1,
      "p95": 87.3,
      "budget": 100,
      "passed": true
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Regression Detection
**Location**: `packages/perf/tests/regression-check.ts`

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface RegressionResult {
  operation: string;
  baseline_p95: number;
  current_p95: number;
  regression_percent: number;
  threshold: number;
  passed: boolean;
}

async function checkRegression() {
  const baselinePath = path.join(process.cwd(), '.perf-baseline.json');
  const currentPath = path.join(process.cwd(), '.perf-current.json');

  const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
  const current = JSON.parse(await fs.readFile(currentPath, 'utf-8'));

  const REGRESSION_THRESHOLD = 0.10; // 10%
  const results: RegressionResult[] = [];
  let failed = false;

  for (const [operation, baselineData] of Object.entries(baseline.benchmarks)) {
    const currentData = current.benchmarks[operation];

    if (!currentData) {
      console.warn(`⚠️  No current data for ${operation}`);
      continue;
    }

    const baselineP95 = baselineData.p95;
    const currentP95 = currentData.p95;
    const regressionPercent = (currentP95 - baselineP95) / baselineP95;
    const passed = regressionPercent <= REGRESSION_THRESHOLD;

    results.push({
      operation,
      baseline_p95: baselineP95,
      current_p95: currentP95,
      regression_percent: regressionPercent * 100,
      threshold: REGRESSION_THRESHOLD * 100,
      passed
    });

    const emoji = passed ? '✅' : '❌';
    const sign = regressionPercent >= 0 ? '+' : '';
    console.log(`${emoji} ${operation}: ${sign}${(regressionPercent * 100).toFixed(1)}% (threshold: ${REGRESSION_THRESHOLD * 100}%)`);

    if (!passed) {
      failed = true;
    }
  }

  if (failed) {
    console.error('\n❌ Performance regression detected!');
    process.exit(1);
  } else {
    console.log('\n✅ No performance regressions detected');
  }
}

checkRegression().catch(err => {
  console.error('Regression check failed:', err);
  process.exit(1);
});
```

### CI Integration

**Update**: `.github/workflows/alpha.yml`

```yaml
performance:
  name: Performance Budgets
  needs: build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.11.0'

    - name: Setup pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 10.14.0

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Run performance tests
      run: pnpm test:perf

    - name: Check for regressions
      run: node packages/perf/tests/regression-check.ts

    - name: Upload baseline
      uses: actions/upload-artifact@v3
      with:
        name: perf-baseline
        path: .perf-baseline.json
```

### Acceptance Criteria

- [ ] Performance test suite created at `packages/perf/tests/perf.spec.ts`
- [ ] All 4 benchmarks implemented (snapshot, risk, session, analytics)
- [ ] Baseline JSON generated: `.perf-baseline.json`
- [ ] Regression check script created
- [ ] CI workflow runs performance tests
- [ ] CI prints p50/p90/p95 for each benchmark
- [ ] CI fails on budget violation
- [ ] CI fails on >10% regression

### Test Plan

**Test 1: Run Benchmarks Locally**
```bash
cd packages/perf
pnpm test:perf

# Expected: All tests pass, baseline created
```

**Test 2: Verify Baseline Output**
```bash
cat .perf-baseline.json

# Expected: JSON with hardware info and benchmark results
```

**Test 3: Simulate Regression**
```bash
# Modify code to add artificial delay
# Re-run performance tests
pnpm test:perf

# Expected: Regression check fails if >10% slower
```

**Test 4: CI Integration**
```bash
git add .
git commit -m "feat: add performance harness"
git push

# Expected: GitHub Actions runs perf tests, reports in logs
```

### Dependencies

- TASK 1 (Guards) - Must pass before performance tests run

### Risks

**CI Runner Variance**:
- GitHub Actions runners may have different performance
- Mitigation: Record hardware specs in baseline

**Flaky Tests**:
- Network latency can affect results
- Mitigation: Run 10 iterations, use percentiles

### Files Created

- `packages/perf/tests/perf.spec.ts`
- `packages/perf/tests/regression-check.ts`
- `.perf-baseline.json`

### Files Modified

- `.github/workflows/alpha.yml` (add performance job)
- `packages/perf/package.json` (add test:perf script)

### Validation

```bash
# 1. Run tests locally
pnpm --filter @snapback/perf test:perf

# 2. Check baseline exists
test -f .perf-baseline.json && echo "Baseline created" || echo "Missing baseline"

# 3. Run regression check
node packages/perf/tests/regression-check.ts

# 4. Verify CI integration
git push
# Check GitHub Actions logs for performance output
```

---

---

## TASK 2.5: Session Layer + Treelist UI

### Objective

Add session-based change grouping over existing snapshot infrastructure without breaking schema. Sessions enable contextual multi-file rollback, appear in VS Code treelist, and emit privacy-safe analytics.

### Duration

12 hours

### Current State: 75% COMPLETE ✅

**Completed Components**:
- ✅ **Contract Extensions** (`packages/contracts/src/session.ts`) - COMPLETE (292 lines)
  - SessionManifestV1 schema with Zod validation
  - SessionChange with deferred hash computation
  - Trigger bitmask encoding/decoding
  - Privacy-safe filters and summaries

- ✅ **Analytics Events** (`packages/contracts/src/analytics.ts`) - COMPLETE
  - SESSION_STARTED and SESSION_FINALIZED events added
  - Type guards (isSessionEvent) implemented
  - Event name constants exported

- ✅ **Database Migration** (`packages/sdk/migrations/002_sessions.sql`) - COMPLETE (175 lines)
  - sessions, session_changes, session_snapshots, blobs tables
  - Reference counting triggers for blob GC
  - Partial indexes for active sessions
  - Views: active_sessions, blob_stats, session_summary

- ✅ **SessionManager** (`packages/sdk/src/session/SessionManager.ts`) - COMPLETE (654 lines)
  - start(), track(), finalize(), current(), list(), getManifest(), rollback()
  - Lazy hash computation (track() < 50ms)
  - Idle timer (15min default) with auto-finalization
  - POSIX path normalization
  - Batch flushing (50 changes or 5s interval)
  - Privacy-safe analytics emission

- ✅ **SessionRollback** (`packages/sdk/src/session/SessionRollback.ts`) - COMPLETE
  - Journal-based crash safety
  - Per-file atomic swap with .bak files
  - Cross-platform EXDEV fallback for Windows
  - Staging validation before rollback

- ✅ **SessionRecovery** (`packages/sdk/src/session/SessionRecovery.ts`) - COMPLETE
  - Crash recovery on startup
  - Journal replay for interrupted rollbacks
  - Cleanup of orphaned backup files

- ✅ **BlobStore** (`packages/sdk/src/storage/BlobStore.ts`) - COMPLETE
  - Content-addressable storage with SHA-256 hashing
  - LZ4 compression support
  - Reference counting for garbage collection

**Missing Components** (25% remaining):
- ❌ **VS Code TreeDataProvider** (`apps/vscode/src/views/SessionsTreeDataProvider.ts`)
  - Not found in codebase
  - Required for session list UI in sidebar

- ❌ **VS Code Commands** (`apps/vscode/src/commands/session/*.ts`)
  - snapback.session.finalize - Not found
  - snapback.session.rollback - Not found
  - snapback.session.reveal - Not found

- ❌ **Status Bar Integration**
  - Session indicator not added to StatusBarController.ts
  - "● Session recording (N files)" UI missing

- ❌ **Performance Test**
  - Session tracking benchmark not added to perf.spec.ts
  - Session tracking < 50ms (p95) not validated

- ❌ **Documentation**
  - apps/docs/content/sessions.mdx not created

**Architecture Quality**: ✅ EXCELLENT
- Follows Result<T, E> pattern for error handling
- Uses discriminated unions (SessionChange)
- Const assertions for trigger/op enums
- POSIX path normalization for cross-platform
- Journal-based crash recovery (industry best practice)
- Privacy-first design (no paths/content transmitted)

**Performance**: ✅ MEETS BUDGETS (based on code review)
- track(): Lazy hashing, in-memory buffering (<50ms target)
- finalize(): Batch hash computation (<500ms target)
- Per-file atomic swap (milliseconds per file)

**Next Steps** (6-8 hours estimated):
1. Create SessionsTreeDataProvider with 3 commands
2. Add status bar session indicator
3. Add session tracking to performance harness
4. Write sessions.mdx documentation
5. Integration testing with VS Code extension

### Context

SnapBack currently creates individual snapshots for file changes. This task layers session tracking on top to group related changes into logical units. Sessions use existing CAS (content-addressable storage) for blobs, adding only metadata structures.

**Key Insight**: Sessions are metadata that reference existing snapshots via their content hashes. No new storage format needed - selective rollback builds on full-restore infrastructure.

### Deliverables

#### 1. Contract Extensions

**Location**: `packages/contracts/src/session.ts` (new file)

**Session Schema Definition**:

```typescript
export type SessionSchema = 'sb.session.v1';

export type ChangeOperation = 'created' | 'modified' | 'deleted' | 'renamed';

export type SessionTrigger = 'filewatch' | 'pre-commit' | 'manual' | 'idle-finalize';

export interface SessionChange {
  p: string;              // relative path
  op: ChangeOperation;
  from?: string;          // prior rel path (for rename)
  hNew?: string;          // sha256 after change (hex)
  hOld?: string;          // sha256 before change (hex)
  sNew?: number;          // size after
  sOld?: number;          // size before
}

export interface SessionManifestV1 {
  schema: SessionSchema;      // 'sb.session.v1'
  sessionId: string;          // cuid
  startedAt: string;          // ISO timestamp
  endedAt?: string;           // ISO when finalized
  workspaceId: string;        // stable hash of workspace path
  name?: string;              // AI/LLM semantic label (optional until finalize)
  triggers: SessionTrigger[];
  changeCount: number;
  filesChanged: SessionChange[];
  snapshots?: string[];       // array of snapshotIds (sb.snap.v1) - optional linkage
}
```

**Snapshot Linkage (non-breaking)**:

**Location**: `packages/contracts/src/types/snapshot.ts`

**Modification**:
Add optional `sessionId` field to existing `SnapshotSchema`:

```typescript
export const SnapshotSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  meta: z.record(z.string(), z.any()).optional(),
  files: z.array(z.string()).optional(),
  fileContents: z.record(z.string(), z.string()).optional(),
  sessionId: z.string().optional(),  // NEW: link to session if created during active session
});
```

**Analytics Events**:

**Location**: `packages/contracts/src/analytics.ts`

**Extension**:
Add session-specific analytics events to existing `ProductAnalyticsEvent` union:

```typescript
export type ProductAnalyticsEvent =
  // ...existing events...
  | {
      name: 'SESSION_STARTED';
      meta: {
        workspaceId: string;  // hashed workspace path
        startedAt: string;    // ISO timestamp
      }
    }
  | {
      name: 'SESSION_FINALIZED';
      meta: {
        workspaceId: string;  // hashed workspace path
        sessionId: string;    // session identifier
        changeCount: number;  // number of files changed
        durationMs: number;   // session duration
      }
    };
```

**Privacy Note**: Ensure `sanitizeMeta` wrapper extends to strip absolute paths from session events. Only `workspaceId` (hashed), counts, and durations are emitted.

#### 2. Database Schema Migration

**Location**: `packages/sdk/migrations/002_sessions.sql` (new file)

**Tables**:

**Sessions Table**:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,       -- Unix timestamp (ms)
  ended_at INTEGER,                  -- Unix timestamp (ms), NULL if active
  name TEXT,                         -- Semantic name (AI-generated on finalize)
  trigger_mask INTEGER NOT NULL DEFAULT 0,  -- Bitmask of SessionTrigger flags
  change_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_workspace
  ON sessions(workspace_id, started_at DESC);
```

**Session Changes Table**:
```sql
CREATE TABLE IF NOT EXISTS session_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,                -- Relative path
  op TEXT NOT NULL,                  -- 'created'|'modified'|'deleted'|'renamed'
  from_path TEXT,                    -- For rename operations
  h_new TEXT,                        -- SHA256 hash after change
  h_old TEXT,                        -- SHA256 hash before change
  s_new INTEGER,                     -- File size after change
  s_old INTEGER,                     -- File size before change
  FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schanges_session
  ON session_changes(session_id);
```

**Session-Snapshot Link Table**:
```sql
CREATE TABLE IF NOT EXISTS session_snapshots (
  session_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  PRIMARY KEY (session_id, snapshot_id)
);
```

**Migration Notes**:
- Use same CAS blob storage as snapshots - `session_changes.h_new/h_old` reference existing content hashes
- No content duplication: rollback materializes files from CAS using hash lookup
- Trigger bitmask encoding: `filewatch=1, pre-commit=2, manual=4, idle-finalize=8`

#### 3. SDK Implementation

**Location**: `packages/sdk/src/session/SessionManager.ts` (new file)

**Interface**:

```typescript
export type ChangeOp = 'created' | 'modified' | 'deleted' | 'renamed';

export interface SessionManagerOptions {
  workspacePath: string;
  idleMs?: number;                // default 15 * 60_000 (15 minutes)
  persistIntervalMs?: number;     // batch flush to DB (default 5000ms)
  useVSCodeWatcher?: boolean;     // extension uses vscode.workspace.onDidChangeTextDocument
}

export class SessionManager {
  /**
   * Start a new session or resume active session
   * Returns sessionId (cuid format)
   */
  start(): Promise<{ sessionId: string }>;

  /**
   * Stop and finalize current session
   * Triggers: LLM name generation (if API key present), manifest persist
   * Returns: sessionId and changeCount
   */
  stopFinalize(): Promise<{ sessionId: string; changeCount: number }>;

  /**
   * Track a file change in current session
   * Batches changes in memory, flushes on interval or finalize
   */
  track(path: string, op: ChangeOp, meta?: { fromPath?: string }): void;

  /**
   * Get current session status
   * Returns null if no active session
   */
  current(): { sessionId: string | null; changeCount: number };

  /**
   * List recent sessions with metadata
   * Sorted by startedAt DESC, limit default 50
   */
  list(limit?: number): Promise<Array<{
    sessionId: string;
    name?: string;
    changeCount: number;
    startedAt: number;
    endedAt?: number;
  }>>;

  /**
   * Retrieve full session manifest by ID
   * Includes all SessionChange[] and linked snapshots
   */
  getManifest(sessionId: string): Promise<SessionManifestV1>;
}
```

**Key Implementation Details**:

**Idle Timer**:
- Default 15 minutes (configurable via `idleMs`)
- Auto-finalizes session with trigger `'idle-finalize'` when no file changes detected
- Resets on every `track()` call

**LLM Name Generation** (optional):
- On `stopFinalize()`, if `process.env.OPENAI_API_KEY` or `process.env.ANTHROPIC_API_KEY` present:
  - Call LLM with top 5 changed file stems and operation counts
  - Prompt: "Generate terse 5-word session name for: {files}"
  - Fallback: Synthesize name from file stems if API unavailable

**Batch Persistence**:
- Accumulate `SessionChange[]` in memory
- Flush to `session_changes` table every `persistIntervalMs` (default 5s)
- Final flush on `stopFinalize()`

**CAS Integration**:
- `SessionChange.hNew/hOld` reference same SHA256 hashes as snapshot content blobs
- Rollback uses `SELECT content FROM snapshot_contents WHERE hash = ?` to materialize file versions

#### 4. VS Code Extension Integration

**TreeDataProvider**:

**Location**: `apps/vscode/src/views/SessionsTreeDataProvider.ts` (new file)

**Structure**:
```
📊 Sessions
  └─ 🕒 Refactor auth flow (3h ago) [15 files]
      ├─ C packages/auth/login.ts
      ├─ M packages/auth/token.ts
      ├─ M apps/web/app/login/page.tsx
      ├─ D packages/auth/legacy.ts
      └─ R packages/auth/{old.ts → new.ts}
  └─ 🕒 Add session tracking (1h ago) [8 files]
      └─ ...
```

**Features**:
- List latest N sessions (default 10)
- Expandable tree: session → changed files with operation badges
- Badges: `C` (created), `M` (modified), `D` (deleted), `R` (renamed)
- Click file: Open diff view (old hash vs new hash)

**Commands**:

**Location**: `apps/vscode/src/commands/session/*.ts`

1. **snapback.session.finalize**
   - Manually finalize active session
   - Prompt for optional semantic name override
   - Update treelist

2. **snapback.session.rollback**
   - Apply inverse of `SessionChange[]`
   - For each change:
     - `created` → delete file
     - `modified` → restore `hOld` from CAS
     - `deleted` → restore `hOld` from CAS
     - `renamed` → rename back to `from`
   - Crash-safe: Validate all hashes exist before starting
   - On error: Auto-rollback partial changes, show Recovery notification

3. **snapback.session.reveal**
   - Open diff editor: `hOld` (left) vs `hNew` (right)
   - Uses VS Code built-in diff: `vscode.diff(uriOld, uriNew, title)`

**Status Bar Item**:

**Location**: Extend `apps/vscode/src/ui/StatusBarController.ts`

**Display**:
- Active session: `● Session recording (5 files)` (green dot)
- Click → Show quick pick:
  - "Finalize Session"
  - "View Changes"
  - "Cancel Session"

#### 5. Privacy & Analytics

**Wrapper Enforcement**:

**Location**: `packages/analytics/src/client.ts`

**Ensure**:
- `SESSION_STARTED` and `SESSION_FINALIZED` events go through existing `sanitizeMeta()` wrapper
- Scrub absolute paths: Only `workspaceId` (SHA256 of workspace root), not file paths
- Emit only: session duration (ms), change count, trigger types

**Autocapture**:
- Keep disabled (as per existing Alpha scope)
- Only explicit `capture()` calls allowed

**PII Protection**:
- Never send file contents or absolute paths
- Session names (LLM-generated) are stored locally only, not sent to PostHog unless user explicitly opts in

#### 6. Performance Budget

**Benchmark**: Session tracking < 50ms (p95)

**Location**: Update `packages/perf/tests/perf.spec.ts`

**Test**:
```typescript
it('Session tracking p95 < 50ms', async () => {
  const measurer = new PerformanceMeasurer();
  const budget = 50; // ms

  for (let i = 0; i < 10; i++) {
    await measurer.measure(async () => {
      sessionManager.track('/test.ts', 'modified');
      await sessionManager.flush(); // Force batch write
    });
  }

  const stats = measurer.getResults();
  console.log(`Session tracking: p95=${stats.p95.toFixed(2)}ms (budget: ${budget}ms)`);
  expect(stats.p95).toBeLessThan(budget);
});
```

**Integration with Existing Harness**:
- Add to TASK 2 performance suite (4 benchmarks → 5 benchmarks)
- Update `.perf-baseline.json` schema to include `session_tracking` operation

#### 7. Documentation

**Location**: `apps/docs/content/sessions.mdx` (new file)

**Sections**:

**What are Sessions?**
- Logical grouping of related file changes
- Formed automatically via idle detection (15min gaps)
- Manual finalization via command palette

**How Sessions are Formed**
- Idle boundaries (15 minutes of inactivity)
- Window blur/focus events
- Git commits
- Manual finalization
- Maximum duration (1 hour)

**Rollback Behavior**
- Selective restore: Only files within session
- Crash-safe: All-or-nothing atomicity
- Hash verification before write
- Auto-recovery on failure

**Privacy Model**
- Free tier: All session data local-only
- Solo tier: Session metadata (counts, durations) synced if consent given
- No file contents or paths sent to backend

### Acceptance Criteria

- [ ] `packages/contracts/src/session.ts` created with `SessionManifestV1` and `SessionChange` types
- [ ] `packages/contracts/src/types/snapshot.ts` updated with optional `sessionId` field
- [ ] `packages/contracts/src/analytics.ts` extended with `SESSION_STARTED` and `SESSION_FINALIZED` events
- [ ] `packages/sdk/migrations/002_sessions.sql` migration script created
- [ ] `packages/sdk/src/session/SessionManager.ts` implemented with all 6 public methods
- [ ] Idle timer (15min default) auto-finalizes sessions
- [ ] LLM name generation working (if API key present) or fallback to synthesized names
- [ ] `apps/vscode/src/views/SessionsTreeDataProvider.ts` displays sessions with changed files
- [ ] `snapback.session.finalize` command works
- [ ] `snapback.session.rollback` restores files using CAS hashes
- [ ] `snapback.session.reveal` opens diff view (old vs new)
- [ ] Status bar shows "● Session recording (N files)" when active
- [ ] Analytics events emit via wrapper with path sanitization
- [ ] Performance test shows session tracking < 50ms (p95)
- [ ] Documentation page `sessions.mdx` published
- [ ] File create/rename/delete operations populate `session_changes` table live
- [ ] After 15min idle, session auto-finalizes with semantic name
- [ ] Rollback leaves workspace consistent (all hash matches verified)
- [ ] No PII (file paths, contents) in PostHog events

### Test Plan

**Test 1: Session Creation & Idle Finalization**
```bash
# 1. Start VS Code in test workspace
# 2. Edit 3 files (create, modify, delete)
# 3. Wait 15 minutes (or mock timer)
# 4. Check SQLite:
sqlite3 ~/.snapback/snapback.db "SELECT * FROM sessions WHERE ended_at IS NOT NULL"

# Expected: 1 session with 3 entries in session_changes
```

**Test 2: Manual Finalization with LLM Name**
```bash
# 1. Set OPENAI_API_KEY env var
# 2. Edit 5 files
# 3. Command Palette → "SnapBack: Finalize Session"
# 4. Check session name in DB

# Expected: Semantic name like "Refactor auth flow"
```

**Test 3: Rollback Integrity**
```bash
# 1. Create session with 10 file changes
# 2. Finalize session
# 3. Make additional edits
# 4. Treelist → Right-click session → "Rollback"
# 5. Verify files match pre-session state

# Expected: All 10 files restored, hashes match session_changes.h_old
```

**Test 4: Diff Reveal**
```bash
# 1. Treelist → Expand session
# 2. Click modified file
# Expected: VS Code diff editor opens (old vs new)
```

**Test 5: Analytics Privacy**
```bash
# 1. Enable analytics (PostHog)
# 2. Finalize session
# 3. Check PostHog events:
curl "https://app.posthog.com/api/projects/{id}/events" \
  -H "Authorization: Bearer {key}"

# Expected:
# - SESSION_FINALIZED event exists
# - workspaceId is SHA256 hash (64 hex chars)
# - No file paths in metadata
# - changeCount and durationMs present
```

**Test 6: Performance Budget**
```bash
pnpm --filter @snapback/perf test:perf

# Expected: Session tracking p95 < 50ms
```

### Dependencies

- TASK 1 (Guards) - Must pass to ensure no PII leakage
- TASK 2 (Performance Harness) - Session tracking budget enforced
- Existing snapshot infrastructure (CAS storage)
- Existing analytics wrapper (`sanitizeMeta`)

### Risks

**Hash Collision in Rollback**:
- Mitigation: SHA256 collision probability is negligible (2^-128)
- Validation: Check hash exists in CAS before rollback

**LLM API Latency**:
- Mitigation: Name generation is async, doesn't block finalization
- Fallback: Synthesized name from file stems

**Idle Timer False Positives**:
- Mitigation: 15-minute threshold is conservative
- User control: Manual finalization always available

**CAS Garbage Collection**:
- Risk: Deleting snapshot might orphan session references
- Mitigation: Foreign key constraints + cascade delete in future migration

### Files Created

- `packages/contracts/src/session.ts`
- `packages/sdk/migrations/002_sessions.sql`
- `packages/sdk/src/session/SessionManager.ts`
- `apps/vscode/src/views/SessionsTreeDataProvider.ts`
- `apps/vscode/src/commands/session/finalize.ts`
- `apps/vscode/src/commands/session/rollback.ts`
- `apps/vscode/src/commands/session/reveal.ts`
- `apps/docs/content/sessions.mdx`

### Files Modified

- `packages/contracts/src/types/snapshot.ts` (add optional `sessionId`)
- `packages/contracts/src/analytics.ts` (add session events)
- `packages/perf/tests/perf.spec.ts` (add session tracking benchmark)
- `apps/vscode/src/ui/StatusBarController.ts` (add session indicator)
- `apps/vscode/src/extension.ts` (register session commands, treelist)

### Validation

```bash
# 1. Run migration
sqlite3 ~/.snapback/snapback.db < packages/sdk/migrations/002_sessions.sql

# 2. Check tables created
sqlite3 ~/.snapback/snapback.db ".tables"
# Expected: sessions, session_changes, session_snapshots

# 3. Start VS Code extension
code --extensionDevelopmentPath=apps/vscode

# 4. Verify treelist appears
# View → SnapBack → Sessions

# 5. Edit files and check session_changes table
sqlite3 ~/.snapback/snapback.db "SELECT * FROM session_changes LIMIT 10"

# 6. Run performance tests
pnpm test:perf

# 7. Check analytics events (if PostHog enabled)
# PostHog → Live Events → Filter "SESSION_FINALIZED"
```

---

### Delivered Components

#### Tier Contract ✅
**Location**: `packages/contracts/src/tiers.ts`

**Status**: Fully implemented with enhancements
- Type-safe tier definitions: `free`, `solo`, `team`, `enterprise`
- Alpha-active tiers flagged: `ALPHA_ACTIVE_TIERS = ['free', 'solo']`
- Feature flag for team features: `ENABLE_TEAM_FEATURES = false`
- Tier capabilities matrix with all four tiers defined
- Helper functions: `isAlphaActiveTier()`, `getTierCapabilities()`, `hasTierCapability()`
- Console warnings when accessing inactive tiers

**Assessment**: Exceeds specification - includes future-proofing with stub support

#### Analytics Contract ✅
**Location**: `packages/contracts/src/analytics.ts`

**Status**: Fully implemented with type safety
- All 10 required event types defined
- Discriminated union: `ProductAnalyticsEvent`
- Batch structure: `AnalyticsBatch`
- Type guards: `isSnapshotEvent()`, `isPolicyEvent()`, `isAISuggestionEvent()`
- Event name constants for type-safe creation
- Metadata interfaces for each event type

**Events Covered**:
1. SNAPSHOT_CREATED ✅
2. SNAPSHOT_RESTORED ✅
3. POLICY_VIOLATION ✅
4. AI_SUGGESTION_SHOWN ✅
5. AI_SUGGESTION_ACCEPTED ✅
6. AI_SUGGESTION_DISMISSED ✅
7. LOGIN ✅
8. UPGRADE_INTENT ✅
9. CLOUD_BACKUP ✅ (bonus)
10. POLICY_CHECK ✅ (bonus)

#### CI Guard System ⚠️
**Location**: `scripts/ci/guard.sh`

**Status**: Not found in search results

**Expected Features**:
- String "checkpoint" detection
- Deprecated policy action detection
- Direct analytics POST bypassing
- SSO/SAML/SCIM mention guard
- Allowlist mechanism

**Assessment**: MISSING - Critical CI enforcement missing

#### Performance Harness ⚠️
**Location**: `packages/perf/tests/perf.spec.ts`

**Status**: Not found

**Expected Benchmarks**:
- Snapshot creation <100ms (p95)
- Risk analysis <500ms
- Session tracking <50ms
- Analytics TTI <2000ms

**Assessment**: MISSING - Performance validation not implemented

### Gap Analysis

**Missing Components**:
1. CI guard script for terminology and pattern enforcement
2. Performance benchmark harness
3. E2E baseline test in dedicated package
4. ADR documentation (Architecture Decision Record)

**Recommendation**: Implement CI guards and performance harness before proceeding to production.

---

## Lane A: Snapshots & Restore (Core Product)

**Target Duration**: 8-12 hours
**Completion Status**: **65% COMPLETE**

### Implementation Evidence

#### Core Snapshot Module ✅
**Location**: `packages/core/src/`

**Found Components**:
- Analytics metrics tracking: `analytics/metrics.ts`
- Snapshot creation tracking
- Restore tracking
- Deduplication references in test documentation

**Test Evidence**:
- `packages/core/test/strategy/` contains E2E instructions and test architecture
- Snapshot restoration with diff preview specified
- Atomic write operations documented
- Performance budgets mentioned (avg <50ms, p95 <100ms)

#### Missing Components ❌

**Snapshot Creation System**:
- Manual trigger endpoints not verified
- Auto-trigger system (idle, pre-commit, window blur) not found
- Deduplication store implementation not confirmed
- Metadata schema implementation not validated

**Cloud Backup System**:
- S3 upload flow not verified
- Download flow not validated
- Integrity verification not confirmed
- Retry logic not found

**Restore Mechanism**:
- Atomicity guarantee implementation not confirmed
- Hash integrity validation not verified
- Rollback strategy not found

**Settings & Configuration**:
- Local pruning not validated
- `.snapbackignore` pattern support not confirmed
- Smart pruning strategy not found

### Test Coverage Assessment

**Unit Tests**: Unknown - not searched in detail
**Integration Tests**: Referenced but not validated
**E2E Tests**: Documentation exists but implementation not confirmed

### Gap Analysis

**Critical Gaps**:
1. No verified cloud backup implementation
2. S3 integration not confirmed
3. Atomicity guarantees unverified
4. Auto-trigger system missing evidence
5. Deduplication implementation unclear

**Estimated Remaining Work**: 35% (approximately 4-5 hours)

---

## Lane B: Guardian & Policies (Security Engine)

**Target Duration**: 10-14 hours
**Completion Status**: **75% COMPLETE**

### Implementation Evidence

#### Policy Engine ✅
**Location**: `packages/policy-engine/`

**Verified Components**:
- Core policy engine: `src/index.ts`
- Policy configuration: `PolicyConfig` interface
- Decision evaluation: `evaluate()` function
- SARIF support: Integration confirmed
- Threshold enforcement: Implemented
- Path-based rules: Glob pattern matching

**Test Coverage** ✅:
- `test/index.spec.ts`: Comprehensive policy engine tests
- `test/decisions.spec.ts`: Decision logic validation
- Test IDs: pol-001, pol-002, pol-003
- Edge cases: Empty SARIF, threshold validation, path rules

**Policy Actions**:
- Block decisions ✅
- Review decisions ✅
- Apply/Allow decisions ✅

#### Detector Suite ⚠️

**Status**: Partially implemented

**Evidence Found**:
- Policy decision framework complete
- SARIF format support
- Risk scoring structure exists

**Missing Evidence**:
- Secret detection patterns not verified
- Mock leakage detector not found
- Phantom dependency detection not validated
- Entropy analysis not confirmed

#### Framework Presets ❌

**Status**: NOT FOUND

**Expected**:
- Next.js preset
- React preset
- Express preset
- Stored in `packages/policy-engine/presets/`

### Test Coverage Assessment

**Unit Tests**: Strong (15+ test cases)
**Integration Tests**: Unknown
**Accuracy Validation**: Not confirmed (90% precision target)

### Gap Analysis

**Critical Gaps**:
1. Detector implementations not verified
2. Framework presets missing
3. SARIF export not validated
4. VS Code integration not confirmed
5. CLI integration not confirmed
6. Accuracy validation corpus missing

**Estimated Remaining Work**: 25% (approximately 3-4 hours)

---

## Lane C: Team & Sharing (Collaboration)

**Target Duration**: 8-10 hours
**Completion Status**: **20% COMPLETE** (Designed Stub)

### Implementation Evidence

#### Database Schema ⚠️

**Expected Tables**:
- Organizations table
- Members table
- Role permissions

**Status**: Not validated in search results

#### Shared Snapshots ❌

**Status**: NOT IMPLEMENTED

**Expected**:
- Organization-scoped snapshots
- Visibility rules
- Sharing flow

#### Policy Synchronization ❌

**Status**: NOT IMPLEMENTED

**Expected**:
- Organization default policy
- Merge strategy
- Synchronization mechanism

### Alpha Scope Decision Compliance ✅

**Observation**: Lane C is correctly treated as a designed stub per Alpha strategy

**Rationale from Spec**:
- Team/Enterprise features designed as stubs
- Feature flag: `ENABLE_TEAM_FEATURES = false` (confirmed in tiers.ts)
- API endpoints should return 501 Not Implemented
- Focus on Free/Solo for Alpha

### Gap Analysis

**By Design**: This lane is intentionally incomplete for Alpha
**Status**: Meets Alpha scope expectations
**Future Work**: Full implementation post-Alpha based on validated demand

---

## Lane D: MCP Integration (AI Assistant Interface)

**Target Duration**: 6-8 hours
**Completion Status**: **85% COMPLETE**

### Implementation Evidence

#### MCP Server ✅
**Location**: `apps/mcp-server/`

**Verified Components**:
- MCP server implementation: `src/index.ts`
- Tool definitions: `analyze_risk`, `check_dependencies`, `create_snapshot`
- Authentication: `src/auth.ts`
- API client: `src/client/snapback-api.ts`
- Tool schemas with Zod validation
- Performance tracking
- Error handling
- Security telemetry

**Tools Implemented**:
1. `snapback.analyze_risk` ✅
2. `snapback.check_dependencies` ✅
3. `snapback.create_checkpoint` ✅
4. `snapback.list_snapshots` ✅
5. Context7 integration ✅ (bonus)

#### Local MCP Tools ✅

**Status**: Fully implemented

**Tools**:
- `create_snapshot`: Local snapshot creation
- `analyze_risk`: Security analysis
- `check_deps`: Dependency checking

**Free Tier Guarantee**: Confirmed - no backend calls in local mode

#### Backend MCP Tools ✅

**Status**: Implemented with tier gating

**Features**:
- API key authentication ✅
- Tier validation ✅
- Solo+ requirement enforcement ✅
- Graceful degradation ✅
- Fallback to local tools ✅

#### Privacy Enforcement ✅

**Verified**:
- Tier checking before backend access
- Free tier never calls backend API
- Solo+ user consent (documented)
- Network-disabled operation for Free tier

#### Test Coverage ✅

**Found Tests**:
- `test/integration/backend-proxy.test.ts`: API integration
- Mock implementations for testing
- Tool request handling validation

### Documentation Quality ✅

**Files Found**:
- `README.md`: Comprehensive tool documentation
- `CLAUDE.md`: Architecture and integration details
- `DEPLOYMENT.md`: Deployment instructions
- `RECOVERY.md`: Historical context and fixes

### Gap Analysis

**Minor Gaps**:
1. Consent dialog UI not verified (may be in VS Code extension)
2. MCP server configuration file implementation unclear
3. Claude/Cursor integration examples not fully tested

**Estimated Remaining Work**: 15% (approximately 1 hour)

---

## Lane E: Auth & Billing (Monetization)

**Target Duration**: 10-12 hours
**Completion Status**: **80% COMPLETE**

### Implementation Evidence

#### Authentication System ✅
**Location**: `apps/web/` and `packages/auth/`

**Verified Components**:
- Better Auth integration: `lib/auth/`
- Authentication helpers: `lib/auth/helpers.ts`
- Session management: `hooks/use-session.ts`
- Middleware protection: `middleware.ts`, `lib/auth/middleware-secure.ts`
- OAuth providers: GitHub, Google
- Email/password authentication
- 2FA support
- Magic link support
- Password validation (OWASP 2025 compliant)

**Test Coverage**:
- Client tests: `__tests__/auth/auth-client.test.ts` (15 tests)
- Session tests: `__tests__/auth/use-session.test.tsx` (8 tests)
- Middleware tests: `__tests__/auth/middleware.test.ts` (12 tests)
- E2E tests: `tests/e2e/dashboard-api-keys.spec.ts`

**Total Test Cases**: 35+ comprehensive auth tests

#### Stripe Integration ⚠️
**Location**: `apps/api/modules/payments/`

**Found Components**:
- Checkout link creation: `procedures/create-checkout-link.ts`
- Stripe provider: `@snapback/integrations/stripe/`
- Webhook handler: Imported in `src/index.ts`

**Verified**:
- Checkout session creation
- Product ID handling
- One-time and subscription support
- Redirect URL configuration

**Unclear**:
- Complete webhook event handling
- 14-day trial implementation
- Subscription lifecycle management
- Payment failure handling

#### Entitlements & Feature Flags ✅
**Location**: `apps/api/modules/`

**Verified Components**:
- Feature flag system: `modules/feature-flags/`
- Subscription data: `modules/dashboard/procedures/get-subscription-data.ts`
- Tier-based limits
- Usage tracking
- Storage quota management

**Features**:
- Per-tier snapshot limits
- Storage quota enforcement
- API key issuance
- Instant flag updates

#### Downgrade Handling ⚠️

**Status**: Partially implemented

**Found**:
- Subscription status tracking
- Plan field in database
- Usage limit calculations

**Missing Evidence**:
- Graceful degradation logic
- Data retention on downgrade
- Feature disablement flow

### Gap Analysis

**Critical Gaps**:
1. Stripe webhook implementation not fully validated
2. 14-day trial flow not confirmed
3. Seat management for Team tier not verified
4. Downgrade user communication unclear
5. Re-upgrade path not validated

**Estimated Remaining Work**: 20% (approximately 2-3 hours)

---

## Lane F: Documentation (Developer Experience)

**Target Duration**: 12-16 hours
**Completion Status**: **40% COMPLETE**

### Implementation Evidence

#### Docs Infrastructure ⚠️
**Location**: `apps/docs/`

**Found**:
- Fumadocs-powered documentation site
- Structure exists: 12 files, 5 dirs

**Not Verified**:
- Tier-aware components (`ShowFor`, `CTAUpgrade`)
- Plan switcher implementation
- Tier badges
- Content organization

#### Content Sections ❌

**Expected Structure**:
1. Getting Started
2. Capabilities (with tier badges)
3. Guides (with tier filtering)
4. Enterprise (SSO/SAML)
5. Reference (CLI, Extension, API)
6. Plans & Limits

**Status**: Structure not validated in search

#### MCP Documentation Split ❌

**Expected**:
- Local MCP page (Free tier)
- Backend MCP page (Solo+ tier)

**Status**: Not found

#### Terminology Audit ❌

**Status**: CI guard not implemented to enforce

**Expected**:
- "snapshot/restore" everywhere
- "checkpoint" forbidden (except allowlist)
- Guard script validation

### Gap Analysis

**Critical Gaps**:
1. Tier-aware components not found
2. Content organization not validated
3. Terminology enforcement missing
4. Plans & Limits matrix not verified
5. Privacy footer not confirmed
6. SEO optimization not checked

**Estimated Remaining Work**: 60% (approximately 7-9 hours)

---

## Lane G: Analytics & Feedback (Product Intelligence)

**Target Duration**: 8-10 hours
**Completion Status**: **70% COMPLETE**

### Implementation Evidence

#### Analytics Infrastructure ✅
**Location**: `apps/web/`, `apps/api/modules/`

**Verified Components**:
- PostHog integration
- Vercel Analytics integration
- User identification on login
- Session recording with privacy controls
- Analytics client documented

**Test Coverage**:
- Integration tests: 14 tests
- E2E tests: 10 OAuth tests
- MSW mocking infrastructure

#### Event Instrumentation ⚠️

**Contract Compliance**:
- Analytics contract defined ✅
- Event types specified ✅
- Metadata sanitization documented ✅

**Implementation Status**:
- Instrumentation points unclear
- Wrapper enforcement not validated
- Direct PostHog call prevention not confirmed

#### Database Ingestion ⚠️

**Expected**:
- `/api/analytics/ingest` endpoint
- Batch processing
- PostHog forwarding

**Status**: Not verified in search

#### Feedback Widget ❌

**Status**: NOT FOUND

**Expected**:
- Web app floating button
- VS Code command
- Category selection
- Submission to API

#### NPS Survey ❌

**Status**: NOT FOUND

**Expected**:
- 7-day trigger logic
- 0-10 scale survey
- Database storage
- Cooldown period

### Gap Analysis

**Critical Gaps**:
1. Analytics wrapper enforcement not validated
2. Event instrumentation incomplete
3. Feedback widget missing
4. NPS survey system missing
5. Audit export not verified

**Estimated Remaining Work**: 30% (approximately 2-3 hours)

---

## Lane H: Reliability & Observability (Production Hardening)

**Target Duration**: 6-8 hours
**Completion Status**: **60% COMPLETE**

### Implementation Evidence

#### Logging Infrastructure ✅
**Location**: `packages/infrastructure/`

**Verified**:
- Pino logger integration
- Structured logging format
- Request ID propagation

**Implementation**:
- Log format with context
- Request tracking
- Error logging

#### Error Tracking ⚠️

**Expected**:
- Sentry integration
- Error capture
- PII scrubbing

**Status**: Environment variables defined, implementation not validated

#### Health Checks ✅
**Location**: `apps/api/src/routes/health.ts`

**Verified**:
- Health endpoint exists
- Test coverage: `__tests__/health.spec.ts`
- Public access (no auth)

**Missing**:
- Subsystem checks (database, Redis, S3)
- Detailed response structure
- Docker healthcheck validation

#### Rate Limiting ✅
**Location**: `apps/api/src/middleware/`

**Verified**:
- Middleware implementation
- Test coverage: `__tests__/ratelimit.spec.ts`
- Tier-based limits
- Free tier: 100 req/min
- Pro tier: 1000 req/min
- Headers: X-RateLimit-* present

#### Graceful Degradation ❌

**Status**: NOT VERIFIED

**Expected**:
- Circuit breaker pattern
- S3 failure handling
- PostHog buffering
- Stripe unavailability handling

### Gap Analysis

**Critical Gaps**:
1. Sentry integration not validated
2. Health check subsystem validation missing
3. Circuit breaker implementation not found
4. Chaos testing not performed
5. Graceful degradation not verified

**Estimated Remaining Work**: 40% (approximately 2-3 hours)

---

## Lane I: Testing & QA (Quality Assurance)

**Target Duration**: 10-12 hours
**Completion Status**: **55% COMPLETE**

### Implementation Evidence

#### Unit Test Coverage ⚠️

**Found Tests**:
- Policy engine: Strong coverage (15+ tests)
- Auth client: 35 comprehensive tests
- API middleware: Multiple test files
- Snapshots API: Test coverage exists

**Coverage Target**: ≥70% required

**Status**: Coverage not measured in search

#### Integration Tests ⚠️

**Found**:
- MCP backend proxy: Integration tests
- Analytics: 14 integration tests
- Auth flows: Multiple integration tests

**Missing**:
- Snapshot creation → Cloud upload → Integrity flow
- Policy violation → Block → Fix → Allow flow
- Stripe webhook → Tier update → Feature flag flow

#### E2E Tests ⚠️
**Location**: `apps/web/tests/e2e/`

**Found Tests**:
- Dashboard & API Keys: `dashboard-api-keys.spec.ts`
- Auth flows: OAuth success + error scenarios

**Missing Critical Journeys**:
1. New user onboarding
2. Upgrade flow (Free → Solo)
3. Team collaboration
4. Policy violation workflow
5. Export audit log

#### Performance Testing ❌

**Status**: NOT FOUND

**Expected**:
- k6 load testing
- 10 concurrent users
- Snapshot creation benchmarks
- p95 response time validation

#### Performance Budget Validation ❌

**Status**: NOT FOUND

**Expected**:
- Automated benchmark harness
- CI enforcement
- Baseline comparison

### Gap Analysis

**Critical Gaps**:
1. Coverage measurement not performed
2. Critical E2E journeys missing
3. Load testing not implemented
4. Performance budgets not enforced
5. Integration test gaps

**Estimated Remaining Work**: 45% (approximately 5-6 hours)

---

## Lane J: Packaging & Release (Deployment Readiness)

**Target Duration**: 6-8 hours
**Completion Status**: **50% COMPLETE**

### Implementation Evidence

#### VS Code Extension ⚠️
**Location**: `apps/vscode/`

**Found**:
- Extension structure: 49 files, 13 dirs
- Package manifest exists

**Not Verified**:
- Marketplace manifest completeness
- Icon presence
- README quality
- Publishing readiness

#### Version Management ⚠️

**Evidence**:
- Turborepo structure
- pnpm workspace

**Unclear**:
- Changesets implementation
- Version bump workflow
- Changelog generation

#### GitHub Actions ❌

**Status**: NOT VERIFIED

**Expected**:
- Release workflow: `.github/workflows/release.yml`
- CI pipeline stages
- Dry-run publish capability
- Artifact signing

### Gap Analysis

**Critical Gaps**:
1. VS Code extension packaging not verified
2. Changesets workflow unclear
3. GitHub Actions release workflow missing
4. Dry-run testing not confirmed
5. Artifact signing not implemented

**Estimated Remaining Work**: 50% (approximately 3-4 hours)

---

## Lane K: Admin & Support (Operations Tooling)

**Target Duration**: 4-6 hours
**Completion Status**: **30% COMPLETE**

### Implementation Evidence

#### Admin Console ❌

**Status**: NOT FOUND

**Expected**:
- User lookup
- Organization lookup
- Feature flags dashboard
- Export on behalf

**Location**: Should be at `apps/web/app/admin/`

#### Support Documentation ❌

**Status**: NOT FOUND

**Expected**:
- Support playbook
- Common scenarios
- Contact points

#### Admin Actions Audit ❌

**Status**: NOT IMPLEMENTED

**Expected**:
- `adminActions` table
- Action logging
- Audit trail

### Gap Analysis

**Critical Gaps**:
1. Admin console completely missing
2. Support playbook not created
3. Admin audit logging not implemented
4. Feature flag toggle UI missing

**Estimated Remaining Work**: 70% (approximately 3-4 hours)

---

## Overall Completion Analysis

### Completion by Lane

| Lane | Name | Target Hours | Completion % | Estimated Remaining |
|------|------|--------------|--------------|---------------------|
| Phase 0 | Contracts & Guards | ≤2 | 95% | 0.5h |
| A | Snapshots & Restore | 8-12 | 65% | 4-5h |
| B | Guardian & Policies | 10-14 | 75% | 3-4h |
| C | Team & Sharing | 8-10 | 20% | By design (stub) |
| D | MCP Integration | 6-8 | 85% | 1h |
| E | Auth & Billing | 10-12 | 80% | 2-3h |
| F | Documentation | 12-16 | 40% | 7-9h |
| G | Analytics & Feedback | 8-10 | 70% | 2-3h |
| H | Reliability | 6-8 | 60% | 2-3h |
| I | Testing & QA | 10-12 | 55% | 5-6h |
| J | Packaging & Release | 6-8 | 50% | 3-4h |
| K | Admin & Support | 4-6 | 30% | 3-4h |

### Weighted Completion Calculation

**Method**: Weight each lane by target hours, exclude Lane C (intentional stub)

**Calculation**:
```
Total Target Hours (excluding Lane C): 72-98 hours
Average: 85 hours

Weighted Completion:
- Phase 0: 2h × 0.95 = 1.90h
- Lane A: 10h × 0.65 = 6.50h
- Lane B: 12h × 0.75 = 9.00h
- Lane D: 7h × 0.85 = 5.95h
- Lane E: 11h × 0.80 = 8.80h
- Lane F: 14h × 0.40 = 5.60h
- Lane G: 9h × 0.70 = 6.30h
- Lane H: 7h × 0.60 = 4.20h
- Lane I: 11h × 0.55 = 6.05h
- Lane J: 7h × 0.50 = 3.50h
- Lane K: 5h × 0.30 = 1.50h

Total Completed: 59.30h
Total Target: 85h

Overall Completion: 59.30 / 85 = 69.8%
```

### **FINAL ASSESSMENT: 70% COMPLETE**

---

## Critical Path Analysis

### Blockers to Alpha Release

**High Priority (Must Fix)**:
1. **CI Guards**: Terminology and pattern enforcement missing
2. **Performance Budgets**: No automated validation
3. **Snapshot Cloud Backup**: S3 integration not verified
4. **Documentation**: Tier-aware components and content missing
5. **E2E Tests**: Critical user journeys incomplete

**Medium Priority (Should Fix)**:
1. Stripe webhook complete implementation
2. Feedback widget and NPS survey
3. Admin console for support operations
4. Graceful degradation testing
5. VS Code extension packaging validation

**Low Priority (Nice to Have)**:
1. Load testing with k6
2. Artifact signing
3. Enhanced monitoring dashboards
4. Additional framework presets

### Recommended Completion Sequence

**Sprint 1 (1 week)**: Infrastructure & Core
1. Implement CI guard script (4h)
2. Implement performance harness (4h)
3. Validate snapshot cloud backup (8h)
4. Complete E2E critical paths (12h)
5. Fix documentation structure (16h)

**Sprint 2 (1 week)**: Quality & Operations
1. Complete Stripe integration (8h)
2. Implement feedback mechanisms (8h)
3. Build admin console (12h)
4. Validate graceful degradation (8h)
5. VS Code extension polish (8h)

**Total Remaining**: ~88 hours (~2 weeks with 2 engineers)

---

## Quality Gates Assessment

### CI Gates Status

| Gate | Status | Evidence |
|------|--------|----------|
| Guard script passes | ❌ FAIL | Script not implemented |
| Performance budgets met | ❌ FAIL | Harness not implemented |
| E2E baseline passes | ⚠️ PARTIAL | Some tests exist |
| Docs guard passes | ❌ FAIL | Guard not implemented |
| Test coverage ≥70% | ⚠️ UNKNOWN | Not measured |

**Assessment**: **0/5 gates passing** - Critical CI infrastructure missing

### Definition of Done Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| All lanes A-K criteria passed | ❌ NO | ~30% of criteria unmet |
| Phase 0 contracts enforced | ⚠️ PARTIAL | Contracts exist, guards missing |
| Terminology standardized | ❌ NO | No automated enforcement |
| Privacy guarantees verified | ⚠️ PARTIAL | Free tier design correct, not tested |
| Unit test coverage ≥70% | ⚠️ UNKNOWN | Not measured |
| E2E tests pass 3 browsers | ❌ NO | Incomplete test suite |
| Performance budgets met | ❌ NO | No validation |
| Load test passes | ❌ NO | Not implemented |
| Documentation complete | ❌ NO | 40% complete |
| VS Code extension published | ❌ NO | Not ready |
| Monitoring active | ⚠️ PARTIAL | Logs exist, Sentry unclear |

**Assessment**: **2/11 criteria met** - Not ready for Alpha release

---

## Risk Assessment

### High Risk Items

**Technical Risks**:
1. **Snapshot Data Integrity**: Cloud backup implementation unverified - potential data loss risk
2. **Performance**: No automated budget enforcement - may not meet <100ms target
3. **Security**: Terminology guard missing - accidental "checkpoint" leakage possible
4. **Billing**: Stripe integration incomplete - revenue at risk

**Operational Risks**:
1. **Support**: No admin console - cannot assist users effectively
2. **Observability**: Incomplete monitoring - blind spots in production
3. **Testing**: Insufficient E2E coverage - bugs likely in production
4. **Documentation**: 60% incomplete - poor user experience

### Mitigation Recommendations

**Immediate Actions**:
1. Implement CI guards before any production deployment
2. Validate cloud backup with integration tests
3. Measure and enforce test coverage
4. Complete critical E2E test scenarios
5. Build minimal admin console for user support

**Before Beta**:
1. Complete documentation with tier-aware components
2. Implement feedback and NPS systems
3. Add graceful degradation for all external services
4. Perform load testing under realistic scenarios
5. Validate Stripe integration end-to-end

---

## Strengths & Achievements

### What's Working Well

**Strong Foundations**:
1. **Contracts**: Tier and analytics contracts are exemplary
2. **MCP Integration**: 85% complete with excellent architecture
3. **Authentication**: 80% complete with comprehensive test coverage (35 tests)
4. **Policy Engine**: 75% complete with solid test foundation

**Quality Highlights**:
1. Type safety throughout with TypeScript
2. Test-driven development evident in auth and policy modules
3. Privacy-first design correctly implemented in MCP tier gating
4. Good documentation in technical CLAUDE.md files

**Architecture Decisions**:
1. Feature flags correctly set for Alpha (Free/Solo only)
2. Team/Enterprise as designed stubs - correct scope management
3. Monorepo structure clean and organized
4. Package separation logical and maintainable

### Exceeds Specification

**Bonus Features**:
1. Context7 integration in MCP server
2. CLOUD_BACKUP and POLICY_CHECK events beyond original spec
3. OWASP 2025 password validation
4. Comprehensive error handling in auth flows

---

## Recommendations

### Path to Production

**Critical Path** (Must complete before Alpha):
1. CI guard implementation (4h)
2. Performance harness (4h)
3. Cloud backup validation (8h)
4. Documentation completion (16h)
5. E2E test suite (12h)
6. Admin console MVP (8h)

**Total**: ~52 hours (1.5 weeks with 2 engineers)

### Prioritization Framework

**Priority 1**: Infrastructure that blocks everything
- CI guards
- Performance budgets
- Test coverage measurement

**Priority 2**: Core product functionality
- Cloud backup
- Snapshot restore atomicity
- Stripe integration completion

**Priority 3**: User experience
- Documentation
- Feedback mechanisms
- Admin support tools

**Priority 4**: Quality & polish
- Load testing
- Additional E2E scenarios
- Enhanced monitoring

### Success Criteria Adjustment

**Proposed Alpha Release Criteria**:
1. ✅ Core snapshot create/restore working (local + cloud)
2. ✅ Auth with Free/Solo tiers functional
3. ✅ MCP integration complete with privacy guarantees
4. ✅ CI guards enforcing terminology and patterns
5. ✅ Performance budgets validated in CI
6. ✅ Minimum 70% test coverage measured
7. ✅ Critical E2E paths passing (signup, snapshot, restore, upgrade)
8. ✅ Basic documentation (getting started, API reference)
9. ✅ Admin console for user support
10. ✅ Monitoring active (logs, errors, health)

**Deferred to Beta**:
- Team/Enterprise features (by design)
- Load testing
- Complete docs with all tier features
- NPS survey system
- Advanced admin features

---

## Confidence Assessment

**Overall Confidence**: **MEDIUM**

**Basis**:
- ✅ Strong architectural foundation (contracts, types, structure)
- ✅ Key features partially working (auth, MCP, policies)
- ⚠️ Critical infrastructure missing (CI guards, perf validation)
- ⚠️ Test coverage unknown (could be 40% or 80%)
- ❌ Documentation significantly incomplete
- ❌ Production readiness uncertain (monitoring, graceful degradation)

**Risk Factors**:
1. No automated quality gates - manual validation required
2. Cloud backup unverified - data loss potential
3. Performance not validated - may not meet SLAs
4. Support tooling missing - operations challenges likely

**Success Factors**:
1. Clean codebase with good separation
2. Privacy-first design correctly implemented
3. Strong test culture in completed components
4. Feature flags enable safe rollout

---

## APPENDIX: Condensed Task Execution Guide

For rapid implementation reference, the remaining 10 tasks with key deliverables:

**TASK 3: Cloud Backup** (8h) - Integration test: snapshot→S3→restore with integrity checks
**TASK 4: Auth E2E** (12h) - 3 Playwright journeys across signup/snapshot/policy flows
**TASK 5: Documentation** (16h) - Tier components + Free/Solo content split + link/Lighthouse validation
**TASK 6: Analytics** (3h) - Enforce wrapper usage + PII sanitization in CI
**TASK 7: Reliability** (3h) - Health checks + requestId + rate limiting
**TASK 8: Packaging** (2h) - Validate VS Code `vsce package` + CLI help screens
**TASK 9: Admin Flags** (4h) - `/admin/flags` page with 3 toggles + audit logging
**TASK 10: Scoring** (4h) - `score-alpha.ts` calculates % per lane, outputs JSON + MD

Total: 52 hours → 2 weeks with 2 engineers → 100% Alpha completion
