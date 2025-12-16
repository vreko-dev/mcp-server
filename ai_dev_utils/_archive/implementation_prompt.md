## The Implementation Prompt

Give this to your agent:

```markdown
# TASK: Build Adaptive TDD Enforcement System

## Objective
Create a modular, state-machine-based TDD workflow system that:
1. Minimizes token usage through just-in-time context loading
2. Enforces quality gates that block progress on violations
3. Learns from violations to improve over time
4. Persists state between sessions

## Directory Structure to Create

```
ai_dev_utils/
├── TDD_CORE.md                      # Always-loaded foundation (~300 lines)
├── TDD_WORKFLOW.md                  # State machine controller (~200 lines)
├── phases/
│   ├── 0-architecture-audit.md      # STEP 0: Service discovery (~250 lines)
│   ├── 1-red-phase.md               # Write failing test (~200 lines)
│   ├── 2-green-phase.md             # Minimal implementation (~200 lines)
│   ├── 3-refactor-phase.md          # Clean up (~150 lines)
│   ├── 4-quality-verification.md    # Automated checks (~300 lines)
│   └── 5-certification.md           # Evidence collection (~200 lines)
├── gates/
│   ├── gate-runner.ts               # Main gate execution script
│   ├── checks/
│   │   ├── audit-gate.ts            # Verifies service search completed
│   │   ├── red-gate.ts              # Verifies test fails correctly
│   │   ├── green-gate.ts            # Verifies test passes
│   │   ├── assertion-gate.ts        # Scans for vague assertions
│   │   └── coverage-gate.ts         # Verifies 4-path coverage
│   └── index.ts                     # Gate registry and exports
├── patterns/
│   ├── violations.jsonl             # Append-only violation log (start empty)
│   ├── codebase-patterns.md         # Learned patterns (start with template)
│   └── assertion-examples.md        # Good vs bad assertion patterns
├── feedback/
│   ├── violation-template.md        # Template for violation reports
│   └── reports/                     # Directory for violation reports (empty)
│       └── .gitkeep
├── state/
│   ├── current-task.json            # Persists workflow state
│   └── .gitkeep
└── scripts/
    ├── tdd-start.sh                 # Entry point: loads core + starts workflow
    ├── tdd-gate.sh                  # Runs gate for current phase
    └── tdd-report-violation.sh      # Records violation and updates patterns
```

---

## FILE CONTENTS

### 1. `TDD_CORE.md` - Always Loaded Foundation

```markdown
# TDD Core - SnapBack Codebase

**Token Budget:** ~400 tokens (always loaded)
**Purpose:** Non-negotiable rules that apply to ALL phases

---

## Identity

You are a TDD-strict development agent for the SnapBack codebase.
You operate through a state machine with enforced gates.
You cannot proceed to the next phase until the current gate passes.

---

## Absolute Rules (Gate-Enforced)

1. **NEVER** write implementation before a failing test exists
2. **NEVER** bypass the service layer - business logic lives in `apps/api/src/services/`
3. **NEVER** use vague assertions: `.toBeTruthy()`, `.toBeDefined()`, `.toBeNull()` alone
4. **NEVER** skip the architecture audit (Phase 0)
5. **NEVER** proceed without evidence captured
6. **ALWAYS** require 4-path coverage: happy, sad, edge, error
7. **ALWAYS** search for existing services before creating new ones
8. **ALWAYS** run the phase gate before claiming completion
9. **ALWAYS** document violations with justification
10. **ALWAYS** update patterns after violations

---

## Workflow Entry

**To start a TDD task:**
1. Load this document (TDD_CORE.md)
2. Load @TDD_WORKFLOW.md
3. Begin at Phase 0

**State file:** `ai_dev_utils/state/current-task.json`

---

## Gate Protocol

After EACH phase:
```bash
./ai_dev_utils/scripts/tdd-gate.sh [phase-name]
```

- If gate **PASSES**: Proceed to next phase
- If gate **FAILS**:
  1. Load `@feedback/violation-template.md`
  2. Document violation with justification
  3. Run `./ai_dev_utils/scripts/tdd-report-violation.sh`
  4. Fix violation
  5. Re-run gate

---

## Quick Reference

**Service locations:**
- Dashboard metrics: `apps/api/src/services/metrics-aggregator.ts`
- Analytics: `apps/api/src/services/analytics-service.ts`
- Snapshots: `packages/core/src/snapshot/`

**Test utilities:**
- Cleanup: `TestCleanupManager`
- Time mocking: `DeterministicTime`
- DB setup: `setupTestDatabase()`

**Forbidden patterns:** See `@patterns/assertion-examples.md`

---

## Navigation

| Phase | Document | Gate |
|-------|----------|------|
| 0 | `@phases/0-architecture-audit.md` | `audit` |
| 1 | `@phases/1-red-phase.md` | `red` |
| 2 | `@phases/2-green-phase.md` | `green` |
| 3 | `@phases/3-refactor-phase.md` | `refactor` |
| 4 | `@phases/4-quality-verification.md` | `quality` |
| 5 | `@phases/5-certification.md` | `certify` |
```

---

### 2. `TDD_WORKFLOW.md` - State Machine Controller

```markdown
# TDD Workflow Controller

**Purpose:** Orchestrates TDD workflow through discrete, gate-verified phases.

---

## Current State

```json
// Loaded from: ai_dev_utils/state/current-task.json
{
  "task": "",
  "phase": "NOT_STARTED",
  "completedPhases": [],
  "violations": [],
  "evidence": {}
}
```

---

## Workflow Phases

### Phase 0: Architecture Audit
**Load:** `@phases/0-architecture-audit.md`
**Gate:** `./ai_dev_utils/scripts/tdd-gate.sh audit`
**Exit Condition:**
- Service search executed and logged
- Canonical location identified
- No architecture conflicts

### Phase 1: RED (Failing Test)
**Load:** `@phases/1-red-phase.md`
**Gate:** `./ai_dev_utils/scripts/tdd-gate.sh red`
**Exit Condition:**
- Test file created
- Test FAILS with expected error
- No vague assertions
- Evidence captured

### Phase 2: GREEN (Minimal Implementation)
**Load:** `@phases/2-green-phase.md`
**Gate:** `./ai_dev_utils/scripts/tdd-gate.sh green`
**Exit Condition:**
- Implementation added to correct service
- Test PASSES
- Implementation is MINIMAL (no extras)

### Phase 3: REFACTOR
**Load:** `@phases/3-refactor-phase.md`
**Gate:** `./ai_dev_utils/scripts/tdd-gate.sh refactor`
**Exit Condition:**
- Code cleaned/improved
- Test STILL passes
- No new functionality added

### Phase 4: Quality Verification
**Load:** `@phases/4-quality-verification.md`
**Gate:** `./ai_dev_utils/scripts/tdd-gate.sh quality`
**Exit Condition:**
- All automated checks pass
- 4-path coverage verified
- Zero vague assertions

### Phase 5: Certification
**Load:** `@phases/5-certification.md`
**Gate:** `./ai_dev_utils/scripts/tdd-gate.sh certify`
**Exit Condition:**
- All evidence collected
- Certification statement complete
- Task marked DONE

---

## State Transitions

```
NOT_STARTED ──▶ AUDIT ──▶ RED ──▶ GREEN ──▶ REFACTOR ──▶ VERIFY ──▶ CERTIFY ──▶ DONE
                 │         │       │          │           │          │
                 ▼         ▼       ▼          ▼           ▼          ▼
              [GATE]    [GATE]  [GATE]     [GATE]      [GATE]     [GATE]
                 │         │       │          │           │          │
                 └─────────┴───────┴──────────┴───────────┴──────────┘
                                      │
                                      ▼
                              VIOLATION_LOOP
                                      │
                           ┌──────────┴──────────┐
                           ▼                     ▼
                    Document Violation    Update Patterns
                           │                     │
                           └──────────┬──────────┘
                                      ▼
                               Retry Phase
```

---

## Commands

**Start new task:**
```bash
./ai_dev_utils/scripts/tdd-start.sh "Task description"
```

**Check current state:**
```bash
cat ai_dev_utils/state/current-task.json | jq
```

**Run gate for current phase:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh [phase]
```

**Report violation:**
```bash
./ai_dev_utils/scripts/tdd-report-violation.sh
```

---

## Violation Loop

If any gate fails:

1. **STOP** - Do not proceed
2. **LOAD** `@feedback/violation-template.md`
3. **DOCUMENT** what went wrong and why
4. **RUN** `./ai_dev_utils/scripts/tdd-report-violation.sh`
5. **FIX** the violation
6. **RE-RUN** the gate
7. **REPEAT** until gate passes
```

---

### 3. `phases/0-architecture-audit.md`

```markdown
# Phase 0: Architecture Audit

**Entry:** New TDD task received
**Exit:** Gate `audit` passes

---

## Step 1: Search for Existing Services

**Execute:**
```bash
# Search for services related to this domain
find apps/api/src/services -type f -name "*.ts" | head -20

# Search for specific domain
find apps/api/src/services -name "*[DOMAIN]*"

# Example for metrics:
find apps/api/src/services -name "*metric*" -o -name "*dashboard*" -o -name "*analytics*"
```

**Record output:**
```
[PASTE COMMAND OUTPUT HERE]
```

**Decision:**
- [ ] Existing service found → Add method to: `________________`
- [ ] No existing service → Justify new service: `________________`

---

## Step 2: Check Architecture Documentation

**Execute:**
```bash
# Find relevant architecture docs
grep -r "[TASK_DOMAIN]" docs/ --include="*.md" | head -10

# Check for task-specific specs
ls docs/architecture/ 2>/dev/null || echo "No architecture docs"
```

**Relevant specs found:**
```
[PASTE FINDINGS HERE]
```

---

## Step 3: Verify Canonical Locations

**SnapBack canonical locations:**
| Domain | Location |
|--------|----------|
| Dashboard metrics | `apps/api/src/services/metrics-aggregator.ts` |
| User analytics | `apps/api/src/services/analytics-service.ts` |
| Snapshot operations | `packages/core/src/snapshot/` |
| API procedures | `apps/api/src/procedures/` |
| Database queries | `packages/platform/src/db/` |

**My code will live in:**
- [ ] Service layer: `apps/api/src/services/___________`
- [ ] Procedure layer: `apps/api/src/procedures/___________`
- [ ] Core package: `packages/core/src/___________`

**Justification:**
```
[EXPLAIN WHY THIS LOCATION IS CORRECT]
```

---

## Step 4: Identify Test Location

**Test file will be:**
```
[SERVICE_PATH].test.ts
```

**Example:** `apps/api/src/services/metrics-aggregator.test.ts`

---

## Audit Report

```yaml
task: "[TASK DESCRIPTION]"
service_search_completed: true/false
existing_service_found: true/false
service_location: "[PATH]"
test_location: "[PATH]"
architecture_conflicts: none/[LIST]
layer: service/procedure/core
justification: "[WHY THIS DESIGN]"
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh audit
```

**Gate checks:**
- [ ] Service search log exists
- [ ] Service location is in canonical directory
- [ ] No direct DB access in procedures

**If PASS:** Load `@phases/1-red-phase.md`
**If FAIL:** Document violation, fix, retry
```

---

### 4. `phases/1-red-phase.md`

```markdown
# Phase 1: RED - Write Failing Test

**Entry:** Architecture audit complete (Phase 0 passed)
**Exit:** Gate `red` passes

---

## Prerequisite Check

Before writing ANY code, confirm:
- [ ] I know the service location: `________________`
- [ ] I know the test location: `________________`
- [ ] I have NOT written any implementation yet

---

## Step 1: Create Test File (if needed)

**Test file path:**
```
[SERVICE_FILE].test.ts
```

**Basic structure:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Import the service (will fail - that's expected)
import { ServiceName } from './service-name';

describe('ServiceName', () => {
  describe('methodName', () => {
    // Tests go here
  });
});
```

---

## Step 2: Write the Failing Test

**Test requirements:**
- [ ] Descriptive name: `it("should [BEHAVIOR] when [CONDITION]")`
- [ ] Specific assertions (NO `.toBeTruthy()`, `.toBeDefined()`)
- [ ] Follows Arrange-Act-Assert pattern

**Template:**
```typescript
it('should [SPECIFIC BEHAVIOR] when [SPECIFIC CONDITION]', async () => {
  // Arrange - Set up test data with SPECIFIC values
  const input = {
    userId: 'test-user-123',
    dateRange: { start: '2024-01-01', end: '2024-01-31' }
  };

  // Act - Call the method
  const result = await service.methodName(input);

  // Assert - Check SPECIFIC expected values
  expect(result).toEqual({
    success: true,
    data: {
      count: 42,  // Specific number, not just "truthy"
      items: [    // Specific structure
        { id: 'item-1', value: 100 }
      ]
    }
  });
});
```

**My test:**
```typescript
[PASTE YOUR TEST HERE]
```

---

## Step 3: Run Test (MUST FAIL)

**Execute:**
```bash
pnpm test [TEST_FILE_PATH] 2>&1 | tee ai_dev_utils/state/red-phase-output.txt
```

**Expected failure:**
```
TypeError: service.methodName is not a function
# OR
Error: Cannot find module './service-name'
# OR
Expected: [value]
Received: undefined
```

**Actual output:**
```
[PASTE TEST OUTPUT HERE]
```

---

## Step 4: Verify Failure Type

The test MUST fail because:
- [ ] Method doesn't exist yet (correct)
- [ ] Import fails (correct)
- [ ] Returns wrong value (correct - if testing existing method)

The test MUST NOT fail because:
- [ ] Syntax error (FIX THIS)
- [ ] Timeout (FIX THIS)
- [ ] Test passes (WRONG PHASE)

---

## Evidence Collection

**Screenshot/output saved to:**
```
ai_dev_utils/state/red-phase-output.txt
```

**Verify evidence exists:**
```bash
cat ai_dev_utils/state/red-phase-output.txt | grep -E "(FAIL|Error|TypeError)"
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh red
```

**Gate checks:**
- [ ] Test file exists
- [ ] Test fails (not passes)
- [ ] Failure is correct type (not syntax/timeout)
- [ ] No vague assertions found
- [ ] Evidence file exists

**If PASS:** Load `@phases/2-green-phase.md`
**If FAIL:** Document violation, fix, retry
```

---

### 5. `phases/2-green-phase.md`

```markdown
# Phase 2: GREEN - Minimal Implementation

**Entry:** RED phase complete (test fails correctly)
**Exit:** Gate `green` passes

---

## Golden Rule

> Write the MINIMUM code to make the test pass.
> No optimizations. No extra features. No "while I'm here" additions.

---

## Step 1: Implement in Correct Location

**Implementation goes in:**
```
[SERVICE_LOCATION from Phase 0]
```

**NOT in:**
- ❌ Procedure file (business logic doesn't belong here)
- ❌ Controller file (HTTP handling only)
- ❌ New file (unless justified in Phase 0)

---

## Step 2: Write Minimal Implementation

**Template:**
```typescript
// In: apps/api/src/services/[service-name].ts

export async function methodName(input: InputType): Promise<OutputType> {
  // MINIMAL implementation - only what the test requires

  // If test expects { count: 42 }, return exactly that
  // Don't add caching, logging, or error handling YET
  // Those come with their own tests

  return {
    // Match test expectations exactly
  };
}
```

**My implementation:**
```typescript
[PASTE YOUR IMPLEMENTATION HERE]
```

---

## Step 3: Run Test (MUST PASS)

**Execute:**
```bash
pnpm test [TEST_FILE_PATH] 2>&1 | tee ai_dev_utils/state/green-phase-output.txt
```

**Expected:**
```
✓ should [behavior] when [condition]

Test Files  1 passed
Tests       1 passed
```

**Actual output:**
```
[PASTE TEST OUTPUT HERE]
```

---

## Step 4: Verify Minimalism

Check your implementation:
- [ ] No code that isn't tested
- [ ] No "future-proofing"
- [ ] No error handling (unless tested)
- [ ] No caching (unless tested)
- [ ] No logging (unless tested)

**If you added extras:** Remove them. They get their own tests.

---

## Evidence Collection

**Screenshot/output saved to:**
```
ai_dev_utils/state/green-phase-output.txt
```

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh green
```

**Gate checks:**
- [ ] Test passes
- [ ] Implementation in correct service location
- [ ] No direct DB queries in procedures (if applicable)
- [ ] Evidence file exists

**If PASS:** Load `@phases/3-refactor-phase.md`
**If FAIL:** Document violation, fix, retry
```

---

### 6. `phases/4-quality-verification.md`

```markdown
# Phase 4: Quality Verification

**Entry:** Refactor phase complete
**Exit:** Gate `quality` passes

---

## Automated Quality Checks

### Check 1: Run Full Test Suite

```bash
pnpm test [TEST_FILE_PATH] --reporter=verbose 2>&1 | tee ai_dev_utils/state/quality-output.txt
```

**Result:**
- [ ] All tests pass
- [ ] No console errors/warnings

---

### Check 2: Assertion Quality Scan

```bash
# Find vague assertions
grep -n "\.toBeTruthy()\|\.toBeDefined()\|\.toBeNull()\s*)" [TEST_FILE]
```

**Output:**
```
[PASTE OUTPUT - should be empty]
```

**Violations found:** [COUNT]

For each violation:
| Line | Current | Should Be |
|------|---------|-----------|
| | | |

---

### Check 3: 4-Path Coverage

For EACH method implemented, verify all 4 paths:

**Method: `[METHOD_NAME]`**

| Path | Test Name | Line # | Status |
|------|-----------|--------|--------|
| Happy | `should return X when valid input` | | ✅/❌ |
| Sad | `should return error when invalid input` | | ✅/❌ |
| Edge | `should handle empty/boundary case` | | ✅/❌ |
| Error | `should handle exception/failure` | | ✅/❌ |

**Missing paths:** [LIST]

---

### Check 4: Service Layer Compliance

```bash
# Verify no business logic in procedures
grep -n "db\.\|prisma\.\|drizzle\." apps/api/src/procedures/[RELATED_PROCEDURE].ts
```

**Output:**
```
[PASTE OUTPUT - should be empty or only through service calls]
```

---

### Check 5: No Skipped/Focused Tests

```bash
grep -n "\.skip\|\.only\|xit\|xdescribe" [TEST_FILE]
```

**Output:**
```
[PASTE OUTPUT - should be empty]
```

---

## Quality Score

| Check | Status | Notes |
|-------|--------|-------|
| Tests pass | ✅/❌ | |
| No vague assertions | ✅/❌ | |
| 4-path coverage | ✅/❌ | |
| Service layer compliance | ✅/❌ | |
| No skipped tests | ✅/❌ | |

**Overall:** PASS / FAIL

---

## Exit Gate

**Run:**
```bash
./ai_dev_utils/scripts/tdd-gate.sh quality
```

**If PASS:** Load `@phases/5-certification.md`
**If FAIL:** Fix violations, re-run checks
```

---

### 7. `gates/gate-runner.ts`

```typescript
#!/usr/bin/env npx ts-node

/**
 * TDD Gate Runner
 * Executes verification gates for each TDD phase
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface GateResult {
  phase: string;
  passed: boolean;
  checks: CheckResult[];
  violations: Violation[];
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

interface Violation {
  type: string;
  file?: string;
  line?: number;
  message: string;
  prevention: string;
}

const STATE_FILE = 'ai_dev_utils/state/current-task.json';
const VIOLATIONS_FILE = 'ai_dev_utils/patterns/violations.jsonl';

// Gate implementations
const gates: Record<string, () => Promise<GateResult>> = {

  audit: async (): Promise<GateResult> => {
    const checks: CheckResult[] = [];
    const violations: Violation[] = [];

    // Check 1: Service search was performed
    const searchLog = fs.existsSync('ai_dev_utils/state/audit-search.log');
    checks.push({
      name: 'Service search executed',
      passed: searchLog,
      message: searchLog ? 'Search log found' : 'No service search log found'
    });

    if (!searchLog) {
      violations.push({
        type: 'MISSING_SERVICE_SEARCH',
        message: 'Architecture audit requires service search before implementation',
        prevention: 'Run: find apps/api/src/services -name "*[domain]*" and save output'
      });
    }

    // Check 2: State file has service location
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const hasLocation = state.evidence?.serviceLocation;
    checks.push({
      name: 'Service location identified',
      passed: !!hasLocation,
      message: hasLocation ? `Location: ${hasLocation}` : 'No service location in state'
    });

    return {
      phase: 'audit',
      passed: checks.every(c => c.passed),
      checks,
      violations
    };
  },

  red: async (): Promise<GateResult> => {
    const checks: CheckResult[] = [];
    const violations: Violation[] = [];
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const testFile = state.evidence?.testFile;

    // Check 1: Test file exists
    const testExists = testFile && fs.existsSync(testFile);
    checks.push({
      name: 'Test file exists',
      passed: testExists,
      message: testExists ? `Found: ${testFile}` : 'Test file not found'
    });

    // Check 2: Test fails
    if (testExists) {
      try {
        execSync(`pnpm test ${testFile} 2>&1`, { encoding: 'utf-8' });
        // If we get here, test passed - that's wrong for RED phase
        checks.push({
          name: 'Test fails correctly',
          passed: false,
          message: 'Test passed - should fail in RED phase'
        });
        violations.push({
          type: 'TEST_PASSED_IN_RED',
          file: testFile,
          message: 'Test should fail before implementation exists',
          prevention: 'Write test for non-existent functionality'
        });
      } catch (error: any) {
        // Test failed - correct!
        const output = error.stdout || error.message;
        const correctFailure = !output.includes('SyntaxError') && !output.includes('Timeout');
        checks.push({
          name: 'Test fails correctly',
          passed: correctFailure,
          message: correctFailure ? 'Test fails as expected' : 'Test fails with wrong error type'
        });
      }
    }

    // Check 3: No vague assertions
    if (testExists) {
      const content = fs.readFileSync(testFile, 'utf-8');
      const vaguePatterns = [
        /\.toBeTruthy\(\)/g,
        /\.toBeDefined\(\)/g,
        /\.toBeNull\(\)\s*[;)]/g,
        /\.toBeFalsy\(\)/g
      ];

      let vagueCount = 0;
      for (const pattern of vaguePatterns) {
        const matches = content.match(pattern);
        if (matches) vagueCount += matches.length;
      }

      checks.push({
        name: 'No vague assertions',
        passed: vagueCount === 0,
        message: vagueCount === 0 ? 'All assertions specific' : `Found ${vagueCount} vague assertions`
      });

      if (vagueCount > 0) {
        violations.push({
          type: 'VAGUE_ASSERTION',
          file: testFile,
          message: `Found ${vagueCount} vague assertions`,
          prevention: 'Use specific assertions: .toEqual(), .toBe(), .toMatchObject() with real values'
        });
      }
    }

    return {
      phase: 'red',
      passed: checks.every(c => c.passed),
      checks,
      violations
    };
  },

  green: async (): Promise<GateResult> => {
    const checks: CheckResult[] = [];
    const violations: Violation[] = [];
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const testFile = state.evidence?.testFile;

    // Check 1: Test passes
    if (testFile && fs.existsSync(testFile)) {
      try {
        execSync(`pnpm test ${testFile} 2>&1`, { encoding: 'utf-8' });
        checks.push({
          name: 'Test passes',
          passed: true,
          message: 'All tests passing'
        });
      } catch {
        checks.push({
          name: 'Test passes',
          passed: false,
          message: 'Tests still failing'
        });
      }
    }

    // Check 2: Implementation in correct location
    const serviceLocation = state.evidence?.serviceLocation;
    if (serviceLocation) {
      const inServices = serviceLocation.includes('/services/');
      checks.push({
        name: 'Implementation in service layer',
        passed: inServices,
        message: inServices ? 'Correct location' : 'Implementation not in services directory'
      });

      if (!inServices) {
        violations.push({
          type: 'SERVICE_BYPASS',
          file: serviceLocation,
          message: 'Business logic must be in service layer',
          prevention: 'Move implementation to apps/api/src/services/'
        });
      }
    }

    return {
      phase: 'green',
      passed: checks.every(c => c.passed),
      checks,
      violations
    };
  },

  quality: async (): Promise<GateResult> => {
    const checks: CheckResult[] = [];
    const violations: Violation[] = [];
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    const testFile = state.evidence?.testFile;

    if (!testFile) {
      return { phase: 'quality', passed: false, checks: [], violations: [] };
    }

    const content = fs.readFileSync(testFile, 'utf-8');

    // Check 1: 4-path coverage
    const hasHappyPath = content.includes('should return') || content.includes('should successfully');
    const hasSadPath = content.includes('should fail') || content.includes('should return error');
    const hasEdgeCase = content.includes('empty') || content.includes('boundary') || content.includes('zero');
    const hasErrorCase = content.includes('should throw') || content.includes('should handle error');

    const pathCount = [hasHappyPath, hasSadPath, hasEdgeCase, hasErrorCase].filter(Boolean).length;

    checks.push({
      name: '4-path coverage',
      passed: pathCount >= 4,
      message: `${pathCount}/4 paths covered`
    });

    if (pathCount < 4) {
      const missing = [];
      if (!hasHappyPath) missing.push('happy path');
      if (!hasSadPath) missing.push('sad path');
      if (!hasEdgeCase) missing.push('edge case');
      if (!hasErrorCase) missing.push('error case');

      violations.push({
        type: 'INCOMPLETE_COVERAGE',
        file: testFile,
        message: `Missing test paths: ${missing.join(', ')}`,
        prevention: 'Add tests for all 4 paths before completing'
      });
    }

    // Check 2: No skipped tests
    const hasSkipped = content.includes('.skip') || content.includes('.only') ||
                       content.includes('xit(') || content.includes('xdescribe(');
    checks.push({
      name: 'No skipped tests',
      passed: !hasSkipped,
      message: hasSkipped ? 'Found skipped/focused tests' : 'No skipped tests'
    });

    return {
      phase: 'quality',
      passed: checks.every(c => c.passed),
      checks,
      violations
    };
  }
};

// Main execution
async function runGate(phase: string): Promise<void> {
  console.log(`\n🔍 Running gate: ${phase}\n`);

  const gate = gates[phase];
  if (!gate) {
    console.error(`❌ Unknown gate: ${phase}`);
    process.exit(1);
  }

  const result = await gate();

  // Print results
  console.log('Checks:');
  for (const check of result.checks) {
    const icon = check.passed ? '✅' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  }

  if (result.violations.length > 0) {
    console.log('\nViolations:');
    for (const v of result.violations) {
      console.log(`  ⚠️  ${v.type}: ${v.message}`);
      console.log(`      Prevention: ${v.prevention}`);

      // Append to violations log
      fs.appendFileSync(VIOLATIONS_FILE, JSON.stringify({
        date: new Date().toISOString(),
        phase,
        ...v
      }) + '\n');
    }
  }

  console.log(`\n${result.passed ? '✅ GATE PASSED' : '❌ GATE FAILED'}\n`);

  process.exit(result.passed ? 0 : 1);
}

// CLI entry point
const phase = process.argv[2];
if (!phase) {
  console.error('Usage: gate-runner.ts <phase>');
  console.error('Phases: audit, red, green, quality');
  process.exit(1);
}

runGate(phase);
```

---

### 8. `feedback/violation-template.md`

```markdown
# Violation Report

**Fill this out when ANY gate fails.**

---

## Violation Details

**Date:** [YYYY-MM-DD HH:MM]
**Phase:** [AUDIT | RED | GREEN | REFACTOR | VERIFY | CERTIFY]
**Task:** [Current task description]
**Gate that failed:** [Gate name]

---

## What Happened

**Describe the violation:**
```
[What rule was broken? What check failed?]
```

**File(s) affected:**
```
[List file paths]
```

**Line number(s):**
```
[If applicable]
```

---

## Root Cause Analysis

**Why did I miss this?**
```
[Be honest - what caused the oversight?]
- [ ] Didn't read phase document carefully
- [ ] Skipped a step
- [ ] Misunderstood requirement
- [ ] Missing knowledge about codebase
- [ ] Time pressure
- [ ] Other: ___________
```

**What information would have prevented this?**
```
[What rule, reminder, or check was missing from the docs?]
```

---

## Fix Applied

**How I fixed it:**
```
[Describe the fix]
```

**Code change:**
```typescript
// Before:
[old code]

// After:
[new code]
```

---

## Pattern Update Proposal

**Should this be added to codebase patterns?**
- [ ] Yes - this is codebase-specific
- [ ] No - already covered in general rules

**Proposed addition to `patterns/codebase-patterns.md`:**
```markdown
## [Pattern Name]

**Problem:** [What goes wrong]
**Solution:** [What to do instead]
**Example:**
[Code example]
```

---

## Prevention Automation

**Can this be caught by automated gate?**
- [ ] Yes - add check to: `gates/checks/[FILE].ts`
- [ ] No - requires human judgment

**Proposed gate check:**
```typescript
// Add to [gate-file].ts:
[proposed code]
```

---

## Certification

- [ ] I have fixed the violation
- [ ] I have re-run the gate and it passes
- [ ] I have updated patterns if applicable
- [ ] I have proposed automation if possible

**Signed:** [Agent]
**Date:** [YYYY-MM-DD]
```

---

### 9. `patterns/codebase-patterns.md` (Starting Template)

```markdown
# SnapBack Codebase Patterns

**Auto-updated based on violation reports.**
**Query these patterns before starting related tasks.**

---

## Service Locations

| Domain | Canonical Location | Notes |
|--------|-------------------|-------|
| Dashboard metrics | `apps/api/src/services/metrics-aggregator.ts` | All dashboard data flows through here |
| User analytics | `apps/api/src/services/analytics-service.ts` | PostHog integration |
| Snapshots | `packages/core/src/snapshot/` | Core snapshot logic |
| API procedures | `apps/api/src/procedures/` | Thin orchestration only |

---

## Test Patterns

### Database Tests
```typescript
import { setupTestDatabase, TestCleanupManager } from '@/test-utils';

describe('ServiceName', () => {
  let cleanup: TestCleanupManager;

  beforeAll(async () => {
    cleanup = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanup.dispose();
  });

  afterEach(async () => {
    await cleanup.clear();
  });
});
```

### Time-Dependent Tests
```typescript
import { DeterministicTime } from '@/test-utils';

it('should handle time correctly', () => {
  const time = new DeterministicTime('2024-01-15T10:00:00Z');
  // Use time.now() instead of Date.now()
});
```

---

## Common Violations (Learned)

### 1. Service Bypass
**Seen:** [X] times
**Pattern:** Direct DB queries in procedure files
**Fix:** Move all business logic to service layer

### 2. Vague Assertions
**Seen:** [X] times
**Pattern:** Using `.toBeTruthy()` instead of `.toEqual()`
**Fix:** Always assert specific values

### 3. Missing Error Path
**Seen:** [X] times
**Pattern:** Only testing happy path
**Fix:** Always include error case test

---

## Recent Fixes

| Date | Violation | File | Fix Applied |
|------|-----------|------|-------------|
| | | | |

---

*Last updated: [DATE]*
```

---

### 10. `scripts/tdd-start.sh`

```bash
#!/bin/bash

# TDD Workflow Starter
# Usage: ./ai_dev_utils/scripts/tdd-start.sh "Task description"

TASK="$1"
STATE_FILE="ai_dev_utils/state/current-task.json"

if [ -z "$TASK" ]; then
  echo "Usage: ./tdd-start.sh \"Task description\""
  exit 1
fi

# Initialize state
cat > "$STATE_FILE" << EOF
{
  "task": "$TASK",
  "phase": "AUDIT",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "completedPhases": [],
  "violations": [],
  "evidence": {}
}
EOF

echo "📋 TDD Task Started"
echo "==================="
echo "Task: $TASK"
echo "Phase: AUDIT"
echo ""
echo "Next steps:"
echo "1. Load @TDD_CORE.md"
echo "2. Load @phases/0-architecture-audit.md"
echo "3. Complete audit checklist"
echo "4. Run: ./ai_dev_utils/scripts/tdd-gate.sh audit"
```

---

### 11. `scripts/tdd-gate.sh`

```bash
#!/bin/bash

# TDD Gate Runner
# Usage: ./ai_dev_utils/scripts/tdd-gate.sh <phase>

PHASE="$1"

if [ -z "$PHASE" ]; then
  echo "Usage: ./tdd-gate.sh <phase>"
  echo "Phases: audit, red, green, refactor, quality, certify"
  exit 1
fi

# Run the TypeScript gate runner
npx ts-node ai_dev_utils/gates/gate-runner.ts "$PHASE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  # Update state to next phase
  NEXT_PHASE=""
  case "$PHASE" in
    audit) NEXT_PHASE="RED" ;;
    red) NEXT_PHASE="GREEN" ;;
    green) NEXT_PHASE="REFACTOR" ;;
    refactor) NEXT_PHASE="VERIFY" ;;
    quality) NEXT_PHASE="CERTIFY" ;;
    certify) NEXT_PHASE="DONE" ;;
  esac

  if [ -n "$NEXT_PHASE" ]; then
    # Update state file
    jq ".phase = \"$NEXT_PHASE\" | .completedPhases += [\"$PHASE\"]" \
      ai_dev_utils/state/current-task.json > tmp.json && \
      mv tmp.json ai_dev_utils/state/current-task.json

    echo "State updated. Next phase: $NEXT_PHASE"
  fi
fi

exit $EXIT_CODE
```

---

## Execution Instructions

After creating all files above:

1. **Make scripts executable:**
```bash
chmod +x ai_dev_utils/scripts/*.sh
```

2. **Initialize empty tracking files:**
```bash
touch ai_dev_utils/patterns/violations.jsonl
echo '{}' > ai_dev_utils/state/current-task.json
```

3. **Test the system:**
```bash
./ai_dev_utils/scripts/tdd-start.sh "Test task"
cat ai_dev_utils/state/current-task.json
```

4. **Verify gate runner compiles:**
```bash
npx ts-node ai_dev_utils/gates/gate-runner.ts audit
```

---

## Success Criteria

- [ ] All directories created
- [ ] All markdown documents have proper linking (`@phases/...`)
- [ ] Gate runner compiles and executes
- [ ] State file updates correctly
- [ ] Violations append to JSONL file
- [ ] Scripts are executable

---

## Token Budget Achieved

| Component | Lines | Est. Tokens |
|-----------|-------|-------------|
| TDD_CORE.md | ~120 | ~200 |
| Phase doc (each) | ~150 | ~250 |
| Loaded per task | Core + 2-3 phases | ~700-1000 |

**vs. Previous: ~4,000 tokens**
**Savings: 75%+**
```

---

## Summary

**Database verdict:** Skip it. File-based JSONL is perfect for this use case - version controllable, human readable, zero infrastructure.

**The prompt above will create:**
1. A state-machine controller that forces sequential phases
2. Automated gates that block progress on violations
3. A feedback loop that learns from mistakes
4. ~75% token reduction through just-in-time loading

