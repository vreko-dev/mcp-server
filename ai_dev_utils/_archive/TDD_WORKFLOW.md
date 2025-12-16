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

**Emergency Hotfix Path (P0 Production Incidents Only):**

```
HOTFIX ──▶ AUDIT (quick) ──▶ RED (minimal) ──▶ GREEN (fix) ──▶ VERIFY ──▶ DEPLOY
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Schedule Full TDD Workflow
                              │
                              ▼
                      Track in GitHub Issue
```

**Hotfix rules:**
1. Still create failing test (proves bug exists)
2. Still implement minimal fix
3. Run quality checks (no skipping)
4. **Temporarily skip REFACTOR**
5. **Schedule proper TDD workflow post-deploy**

**Document in state:**
```json
{
  "taskType": "HOTFIX",
  "scheduledFollowup": "GH-####",
  "skipReason": "P0 production incident",
  "deployedAt": "2025-12-09T23:00:00Z"
}
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

---

## Quick Navigation

Always load **@TDD_CORE.md** first, then load the current phase document.

| Current Phase | Load This Document |
|---------------|-------------------|
| Starting new task | `@phases/0-architecture-audit.md` |
| Writing failing test | `@phases/1-red-phase.md` |
| Implementing minimal code | `@phases/2-green-phase.md` |
| Refactoring | `@phases/3-refactor-phase.md` |
| Quality checks | `@phases/4-quality-verification.md` |
| Final certification | `@phases/5-certification.md` |

---

## Gate Execution

**CRITICAL:** Never claim a phase is complete without running its gate.

The gate script (`tdd-gate.sh`) will:
1. Execute automated checks for the current phase
2. Verify all exit conditions are met
3. Update state file to next phase if passing
4. Log violations if failing

**If gate fails:**
- You are BLOCKED from proceeding
- Document the violation
- Update patterns if new violation type
- Fix and retry

---

**Last Updated:** 2025-12-09
**Authority:** State machine design for TDD enforcement
