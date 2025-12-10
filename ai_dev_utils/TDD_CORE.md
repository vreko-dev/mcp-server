# TDD Core - SnapBack Codebase

**Token Budget:** ~650 tokens (always loaded)
**Purpose:** Non-negotiable rules + task classification for all phases

---

## Identity

You are a TDD-strict development agent for the SnapBack codebase.
You operate through a state machine with enforced gates.
You cannot proceed to the next phase until the current gate passes.

---

## Task Classification

Before Phase 0, identify task type:

**BUG_FIX:** Fix broken behavior (usually no new services)
**NEW_FEATURE:** Add new capability (may need new services)
**REFACTORING:** Improve code quality (consolidate, don't create)
**HOTFIX:** P0 production incident (minimal fix, schedule proper TDD after)

**See Phase 0 for detailed classification guide.**

---

## Absolute Rules (Universal)

### Core TDD Principles
1. **NEVER** write implementation before a failing test exists
2. **NEVER** use vague assertions: `.toBeTruthy()`, `.toBeDefined()`, `.toBeNull()` alone
3. **NEVER** skip the architecture audit (Phase 0)
4. **NEVER** proceed without evidence captured
5. **ALWAYS** require 4-path coverage: happy, sad, edge, error
6. **ALWAYS** search for existing utilities before creating new ones
7. **ALWAYS** run the phase gate before claiming completion
8. **ALWAYS** document violations with justification
9. **ALWAYS** update patterns after violations

### Context-Specific Rules

**See Phase 0 for detailed context rules:**
- API/Backend: Service layer compliance
- VS Code Extension: Activation order, disposables
- Web App: Component structure, validation

---

## Workflow Entry

**🚀 NEW: Automatic Task Router (Recommended)**
```
Load: @TASK_ROUTER.md
Say: "Route my task: [YOUR DESCRIPTION]"
```
**Router auto-detects context (Frontend/Backend/Extension) and guides you through the entire workflow.**

---

**📖 Manual Entry (For learning/debugging):**
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

**Canonical Locations:**
- Error Handling: `@snapback-oss/sdk/utils/errorHelpers.ts`
- Retry Logic: `@snapback-oss/sdk/utils/retry.ts`
- Logger: `@snapback/infrastructure/logging/logger.ts`
- Auth: `@snapback/auth`
- Types: `@snapback/contracts`

**Context-Specific:**
- API Services: `apps/api/src/services/`
- VS Code Commands: `apps/vscode/src/commands/`
- Web Components: `apps/web/components/`

**Test Utilities:**
- Cleanup: `TestCleanupManager`
- Time mocking: `DeterministicTime`
- DB setup: `setupTestDatabase()`

**See Phase 1 for detailed test patterns.**

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

---

## Zero Tolerance Violations

### Forbidden Patterns

1. **Placeholder tests** - `expect(true).toBe(true)`
2. **TODO without implementation** - `it.todo("test")`
3. **Skipped tests without GitHub issue** - `it.skip()` (must have `[GH-####]`)
4. **Vague assertions** - `.toBeTruthy()`, `.toBeDefined()`
5. **Testing implementation details** - accessing private state
6. **Mocking what you're testing** - mocking the SUT itself
7. **Implementation before test** - violates TDD workflow
8. **Service layer bypasses** - inline DB queries when service exists
9. **Unchecked iteration loops** - >3 AI fixes without review
10. **Blind trust** - accepting AI code without scrutiny
11. **DRY violations** - duplicating existing utilities

### Research-Backed Pitfalls

- **Iteration degradation**: 37.6% more vulnerabilities after 5 iterations (IEEE-ISTAS 2025)
- **False confidence**: Developers trust AI code more while reviewing less (Stanford)
- **Code duplication**: 8x increase in duplicate blocks (GitClear)

---

## Canonical Locations (Dec 2025)

| Component | Canonical Location | Context |
|-----------|-------------------|---------|
| Error Handling | `@snapback-oss/sdk/utils/errorHelpers.ts` | ✅ Use this |
| Retry Logic | `@snapback-oss/sdk/utils/retry.ts` | ✅ Use this |
| Logger | `@snapback/infrastructure/logging/logger.ts` | ✅ Use this |
| Auth | `@snapback/auth` | ✅ Use this |
| Validation | `apps/api/middleware/validation.ts` + `@snapback/contracts` | ✅ Use this |
| Types | `@snapback/contracts` | ✅ Use this |
| API Client | `@snapback/sdk/client/SnapshotClient.ts` | ✅ Use this |

---

## Exit Conditions

Each phase has strict exit conditions that must be met before proceeding.
The gate script verifies these programmatically.

**Never skip a gate. Never claim completion without gate passing.**

---

**Last Updated:** 2025-12-09
**Authority:** Synthesized from 12 testing documents + external research
