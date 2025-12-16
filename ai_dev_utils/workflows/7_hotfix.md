# Workflow 7: Hotfix

**Purpose:** Emergency production fixes with minimal TDD
**Entry:** P0 production incident
**Exit:** Fix deployed, full TDD scheduled

**WARNING:** This is for emergencies only. Abuse leads to tech debt.

---

## When to Use

- Production is DOWN
- Data loss occurring
- Security breach active
- Critical business function broken
- Multiple users affected NOW

**If not P0:** Use `4_dev_complete.md` instead.

---

## Hotfix Flow (Compressed TDD)

```
INCIDENT → QUICK AUDIT → RED (prove bug) → GREEN (fix) → VERIFY → DEPLOY → SCHEDULE FULL TDD
```

**Total target time:** < 2 hours

---

## Step 1: Quick Audit (15 min max)

### Identify Root Cause

```bash
# Recent deployments?
git log --oneline -10

# Error logs?
# [Check your monitoring system]

# Related code?
grep -rn "[ERROR_KEYWORD]" apps/
```

### Document Incident

```yaml
incident:
  reported_at: "[TIMESTAMP]"
  severity: P0
  symptoms: "[WHAT'S BROKEN]"
  affected_users: "[ESTIMATE]"
  suspected_cause: "[HYPOTHESIS]"
```

---

## Step 2: RED - Prove Bug Exists (15 min max)

Write a MINIMAL test that reproduces the bug:

```typescript
describe("HOTFIX: [Incident Description]", () => {
  it("reproduces the production bug", async () => {
    // Arrange - replicate production state
    const input = { /* production-like input */ };
    
    // Act
    const result = await brokenFunction(input);
    
    // Assert - current broken behavior
    // This test SHOULD FAIL after fix is applied
    expect(result.error).toBe("The bug we're seeing");
  });
});
```

```bash
pnpm test [test-file] --run
# Should PASS (because bug exists)
```

---

## Step 3: GREEN - Minimal Fix (30 min max)

### Rules

- **MINIMAL** - Fix only what's broken
- **No refactoring** - Schedule for later
- **No "while I'm here"** - Stay focused
- **Use existing patterns** - Don't innovate

### Apply Fix

```typescript
// Minimal change to fix the issue
// Add TODO for proper fix
// TODO(HOTFIX): [GH-####] Proper fix needed
```

### Verify

```bash
pnpm test [test-file] --run
# Test should now FAIL (because bug is fixed)
```

Wait - that's backwards. The test was proving the bug exists. Now fix the test to expect correct behavior:

```typescript
it("handles [scenario] correctly", async () => {
  const result = await fixedFunction(input);
  expect(result.success).toBe(true); // Now expects correct behavior
});
```

---

## Step 4: Quick Verify (15 min)

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# All tests
pnpm test --run

# Smoke test affected area manually
```

---

## Step 5: Deploy

Follow your deployment process. This workflow doesn't cover deployment specifics.

---

## Step 6: Schedule Full TDD (REQUIRED)

After hotfix is deployed, you MUST:

1. **Create GitHub issue** for proper fix:
   ```
   Title: [HOTFIX FOLLOWUP] Proper TDD for [Incident]
   Body:
   - Incident: [DESCRIPTION]
   - Hotfix applied: [COMMIT]
   - Technical debt: [WHAT WAS SKIPPED]
   - Proper fix needed: [DESCRIPTION]
   ```

2. **Update state:**
   ```json
   {
     "taskType": "HOTFIX",
     "deployedAt": "2025-12-16T12:00:00Z",
     "scheduledFollowup": "GH-####",
     "techDebt": "[WHAT WAS SKIPPED]"
   }
   ```

3. **Add to backlog** with high priority

---

## What's Skipped (Must Be Done Later)

| Phase | Normal TDD | Hotfix | Follow-up Required |
|-------|------------|--------|-------------------|
| Architecture Audit | Full | Quick | YES - proper audit |
| RED Phase | 4-path coverage | Bug reproduction only | YES - full tests |
| GREEN Phase | Minimal + clean | Minimal + TODO | YES - clean up |
| REFACTOR Phase | Full | SKIPPED | YES - must do |
| CERTIFY Phase | Full | Quick log | YES - proper cert |

---

## Hotfix Log Template

```yaml
hotfix:
  incident_id: "[ID]"
  reported_at: "[TIMESTAMP]"
  fixed_at: "[TIMESTAMP]"
  deployed_at: "[TIMESTAMP]"
  
fix:
  commit: "[HASH]"
  files_changed:
    - "[FILE]"
  lines_changed: [NUMBER]
  
verification:
  tests_passed: true
  manual_smoke_test: true
  
followup:
  github_issue: "GH-####"
  scheduled_for: "[DATE]"
  tech_debt:
    - "[ITEM]"
    
lessons_learned:
  - "[WHAT_CAUSED_THIS]"
  - "[HOW_TO_PREVENT]"
```

---

## Record Learning

After incident resolution:

```bash
./ai_dev_utils/scripts/learn.sh "incident" "[root cause]" "[prevention]" "hotfix-[ID]"
```

---

**Last Verified:** 2025-12-16
**Status:** active
