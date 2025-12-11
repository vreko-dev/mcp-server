# Violation & Completion Report

**Fill this out when ANY gate fails OR when a feature is completed for tracking.**

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
- [ ] Yes - add check to: `gates/gate-runner.ts`
- [ ] No - requires human judgment

**Proposed gate check:**
```typescript
// Add to gate-runner.ts:
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
