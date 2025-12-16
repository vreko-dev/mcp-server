# Workflow 2: Research

**Purpose:** Deep investigation, root cause analysis, and prior art discovery
**Entry:** Classified issue needing investigation OR new feature request
**Exit:** Clear understanding ready for planning

---

## Research Objectives

1. **Root Cause** - Why is this happening?
2. **Affected Scope** - What else might be impacted?
3. **Prior Art** - Has this been solved before?
4. **Patterns** - Does this match known patterns/anti-patterns?

---

## Step 1: Codebase Investigation

### Search for Related Code

```bash
# Find files related to the domain
find apps/ packages/ -name "*[KEYWORD]*" -type f

# Search for function/class names
grep -rn "[FUNCTION_NAME]" apps/ packages/

# Find usages
grep -rn "import.*[MODULE]" apps/ packages/
```

### Trace the Call Stack

```bash
# Who calls this?
grep -rn "[FUNCTION_NAME](" apps/ packages/

# What does this call?
grep -n "this\." [FILE_PATH] | head -20
```

### Check Recent Changes

```bash
# Recent commits touching this area
git log --oneline -20 -- [FILE_PATH]

# What changed in last relevant commit?
git show [COMMIT_HASH] --stat
```

---

## Step 2: Documentation Review

### Check Existing Docs

```bash
# Search for related documentation
grep -ri "[KEYWORD]" docs/ --include="*.md"

# Check architecture docs
ls docs/architecture/
```

### Check for Known Issues

```bash
# Search for similar patterns in feedback
grep -i "[KEYWORD]" ai_dev_utils/feedback/learnings.jsonl

# Check violation patterns
grep -i "[KEYWORD]" ai_dev_utils/patterns/violations.jsonl
```

---

## Step 3: Similar Pattern Analysis

### Check Canonical Locations

| Domain | Check This Location |
|--------|---------------------|
| Error handling | `@snapback-oss/sdk/utils/errorHelpers.ts` |
| Retry logic | `@snapback-oss/sdk/utils/retry.ts` |
| Logging | `@snapback/infrastructure/logging/logger.ts` |
| Auth | `@snapback/auth` |
| Types | `@snapback/contracts` |

### Check for Existing Solutions

```bash
# Does a utility already exist?
grep -rn "export.*function.*[SIMILAR_NAME]" packages/*/src/

# Is there a service for this?
find apps/api/src/services -name "*.ts" | xargs grep -l "[DOMAIN]"
```

---

## Step 4: External Research (if needed)

For new patterns or unfamiliar territory:

1. Check library documentation
2. Search for common patterns
3. Review similar open-source implementations

---

## Research Output Template

```yaml
investigation_summary:
  root_cause: "[EXPLANATION]"
  confidence: high | medium | low
  
affected_scope:
  files:
    - "[FILE_1]"
    - "[FILE_2]"
  tests_needed: "[DESCRIPTION]"
  
prior_art:
  similar_solutions:
    - location: "[PATH]"
      applicable: true | false
  existing_utilities:
    - "[UTILITY_NAME]"
    
patterns_matched:
  - pattern: "[PATTERN_NAME]"
    apply: true | false
    
blockers:
  - "[BLOCKER_IF_ANY]"
  
ready_for_planning: true | false
```

---

## Decision Point

**If root cause is clear and solution is obvious:**
- Skip `3_planning.md`
- Go directly to `4_dev_complete.md`

**If architecture decisions needed:**
- Proceed to `3_planning.md`

**If more investigation needed:**
- Stay in research mode
- Document what's known
- Ask for help if blocked

---

## Record Learning

If you discovered something useful:

```bash
./ai_dev_utils/scripts/learn.sh "discovery" "[what triggered this]" "[what you found]" "[task-id]"
```

---

**Last Verified:** 2025-12-16
**Status:** active
