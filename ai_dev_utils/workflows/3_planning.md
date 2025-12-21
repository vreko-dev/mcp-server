# Workflow 3: Planning

**Purpose:** Architecture audit, design decisions, implementation planning
**Entry:** Research complete, ready to design solution
**Exit:** Approved implementation plan ready for `4_dev_complete.md`

---

## Planning Objectives

1. **Specification** - What are we building and why? (Source of truth)
2. **Architecture Compliance** - Does design fit existing patterns?
3. **Canonical Location** - Where should code live?
4. **Test Strategy** - What tests are needed?
5. **Risk Assessment** - What could go wrong?

---

## Step 0: Specification (Before Tests)

**The specification is the source of truth that guides test generation and implementation.**

### Why Specification First?

- Tests lock in WHAT, spec explains WHY
- Prevents superficial test generation (agent writes tests that pass but miss intent)
- Provides context for GREEN phase decisions
- Enables human validation before code is written

### Specification Template

```yaml
specification:
  intent: "[ONE SENTENCE: What problem are we solving?]"

  success_criteria:
    - "[MEASURABLE OUTCOME 1]"
    - "[MEASURABLE OUTCOME 2]"

  out_of_scope:
    - "[What this DOESN'T do - prevents over-engineering]"

  constraints:  # Reference CONSTRAINTS.md
    - "C-001: [Layer boundary applies because...]"
    - "C-004: [4-path coverage required]"

  acceptance_test: "[How user validates this works]"

  edge_cases:
    - "[Edge case 1 that tests must cover]"
    - "[Edge case 2 that tests must cover]"
```

### Quick Spec (For Simple Tasks)

For bug fixes or small changes, use abbreviated form:

```yaml
quick_spec:
  fix: "[What's broken]"
  expected: "[What should happen]"
  acceptance: "[How to verify]"
```

**Save specification to state:**
```bash
jq '.specification = { "intent": "...", "success_criteria": [...] }' \
  ai_dev_utils/state/current-task.json > tmp.json && mv tmp.json ai_dev_utils/state/current-task.json
```

---

## Step 1: Architecture Audit (Phase 0 from TDD)

### Service Layer Check

```bash
# Search for existing services in domain
find apps/api/src/services -name "*[DOMAIN]*"

# If service exists, add method there
# If no service, justify creating new one
```

### Context-Specific Rules

**Working in `apps/api/` (Backend):**
- Business logic MUST go in `apps/api/src/services/`
- Procedures MUST NOT have inline DB queries
- Use Drizzle ORM for database access

**Working in `apps/vscode/` (Extension):**
- Commands go in `apps/vscode/src/commands/`
- Services go in `apps/vscode/src/services/`
- NEVER register commands before dependencies exist
- ALWAYS use disposables for cleanup

**Working in `apps/web/` (Frontend):**
- Business logic in hooks or server actions
- NEVER put business logic in components
- Server-side validation required

---

## Step 2: Identify Canonical Locations

| Domain | Canonical Location |
|--------|-------------------|
| Dashboard metrics | `apps/api/src/services/metrics-aggregator.ts` |
| User analytics | `apps/api/src/services/analytics-service.ts` |
| Snapshot operations | `packages/core/src/snapshot/` |
| Error handling | `@snapback-oss/sdk/utils/errorHelpers.ts` |
| Retry logic | `@snapback-oss/sdk/utils/retry.ts` |
| Logger | `@snapback/infrastructure/logging/logger.ts` |
| Auth | `@snapback/auth` |
| Types | `@snapback/contracts` |

**My code will live in:** `_________________`

**Justification:** `_________________`

---

## Step 3: Test Strategy

### Required Coverage (4-Path Model)

| Path | Description | Test Case |
|------|-------------|-----------|
| **Happy** | Normal successful flow | Input valid → expected output |
| **Sad** | Expected failure handled | Invalid input → graceful error |
| **Edge** | Boundary conditions | Empty, null, max values |
| **Error** | Unexpected failures | Network down, DB error |

### Test Location

```
[SERVICE_PATH]/__tests__/[SERVICE_NAME].test.ts
```

---

## Step 4: Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Write characterization tests first |
| Performance regression | Add performance budget test |
| Security vulnerability | Review auth/validation |
| Data corruption | Test rollback capability |

---

## Planning Output Template

```yaml
plan:
  task: "[DESCRIPTION]"
  task_type: BUG_FIX | NEW_FEATURE | REFACTORING

architecture:
  service_location: "[PATH]"
  test_location: "[PATH]"
  existing_service_used: true | false
  new_service_justified: "[REASON_IF_NEW]"

implementation:
  files_to_modify:
    - "[FILE_1]"
    - "[FILE_2]"
  files_to_create:
    - "[FILE_1]"

test_strategy:
  happy_path: "[DESCRIPTION]"
  sad_path: "[DESCRIPTION]"
  edge_cases: "[DESCRIPTION]"
  error_cases: "[DESCRIPTION]"

risks:
  - risk: "[DESCRIPTION]"
    mitigation: "[APPROACH]"

estimated_effort: "[HOURS]"
ready_for_implementation: true | false
```

---

## Gate Check

Before proceeding to implementation:

```bash
./ai_dev_utils/scripts/gate.sh audit
```

**Gate verifies:**
- [ ] Service search completed
- [ ] Canonical location identified
- [ ] No architecture conflicts
- [ ] Test strategy defined

---

## Next Step

If gate passes: Load `@workflows/4_dev_complete.md`

---

**Last Verified:** 2025-12-16
**Status:** active
