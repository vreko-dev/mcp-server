# Workflow 1: Triage

**Purpose:** Quick issue assessment, classification, and severity assignment
**Entry:** Bug report, issue, or unclear problem
**Exit:** Classified task ready for next workflow

---

## Quick Assessment Checklist

### 1. Reproduce the Issue

```bash
# Can you reproduce it?
[ ] Yes - proceed to classification
[ ] No - need more info (ask user)
[ ] Intermittent - note frequency, move to research
```

### 2. Is This Already Fixed?

Before diving deep, check if someone already fixed this:

```bash
# Search for recent fixes in the suspected area
git log --oneline -10 -- [SUSPECTED_FILE]

# Search codebase for fix patterns
grep -rn "[SUSPECTED_FIX]" apps/
```

**If already fixed:**
- Document in state
- Close issue or update
- Skip to verification only

### 3. Severity Assessment

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| **P0** | Production down, data loss, security breach | Immediate → `7_hotfix.md` |
| **P1** | Major feature broken, workaround exists | Same day → `4_dev_complete.md` |
| **P2** | Minor feature broken, no workaround | This sprint |
| **P3** | Cosmetic, low impact | Backlog |
| **P4** | Nice to have, edge case | Future |

### 4. Classification

| Type | Indicators | Next Workflow |
|------|------------|---------------|
| **BUG_FIX** | "was working", "broke", "error" | `4_dev_complete.md` |
| **NEW_FEATURE** | "add", "implement", "doesn't exist" | `2_research.md` → `3_planning.md` |
| **REFACTORING** | "messy", "duplicate", "consolidate" | `5_refactor.md` |
| **HOTFIX** | "production", "P0", "critical" | `7_hotfix.md` |

---

## Triage Template

```yaml
issue: "[DESCRIPTION]"
reported_by: "[USER/SYSTEM]"
reported_at: "[DATE]"

reproducible: true | false | intermittent
severity: P0 | P1 | P2 | P3 | P4
type: BUG_FIX | NEW_FEATURE | REFACTORING | HOTFIX

context:
  area: "apps/vscode | apps/api | apps/web"
  file: "[SUSPECTED_FILE]"
  
already_fixed: true | false
  
root_cause_known: true | false
next_workflow: "[WORKFLOW_FILE]"
```

---

## Output

Update state and route to next workflow:

```bash
# Update state
jq '.taskType = "[TYPE]" | .severity = "[SEVERITY]" | .phase = "TRIAGED"' \
  ai_dev_utils/state/current-task.json > tmp.json && mv tmp.json ai_dev_utils/state/current-task.json
```

**Next:** Load the appropriate workflow based on classification.

---

## Red Flags (Escalate Immediately)

- Security vulnerability mentioned
- Data loss or corruption
- Production system affected
- Multiple users reporting same issue
- Issue appeared after recent deployment

---

**Last Verified:** 2025-12-16
**Status:** active
