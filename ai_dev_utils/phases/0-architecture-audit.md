# Phase 0: Architecture Audit

**Entry:** New TDD task received
**Exit:** Gate `audit` passes

---

## Step 0: Classify Task Type

Before diving into architecture, identify what kind of work this is.

**Task Types:**

### BUG_FIX
**When:** Something broken that should work
**Focus:** Verify bug exists, locate broken code
**Services:** Usually no new services needed
**Example:** "Fix activation race in auth flow", "Fix missing command registration"

**State file entry:**
```json
{
  "taskType": "BUG_FIX",
  "scope": "apps/vscode/src/commands/authCommands.ts"
}
```

**Phase 0 priorities:**
- ✅ Reproduce the bug
- ✅ Locate the broken code
- ✅ Check if fix already exists
- ⏭️ Skip service search (usually not needed)

---

### NEW_FEATURE
**When:** Adding new capability that didn't exist
**Focus:** Search for existing services, identify canonical location
**Services:** May need new service methods or entire service
**Example:** "Add AI tool detection counts to dashboard", "Implement file deduplication"

**State file entry:**
```json
{
  "taskType": "NEW_FEATURE",
  "scope": "apps/api/src/services/"
}
```

**Phase 0 priorities:**
- ✅ Search for existing services thoroughly
- ✅ Identify canonical location
- ✅ Check for similar features
- ✅ Plan service architecture

---

### REFACTORING
**When:** Improving code quality without changing behavior
**Focus:** Identify duplication, extract to canonical locations
**Services:** Consolidate existing, don't create new
**Example:** "Extract shared auth logic to helper", "Eliminate code duplication"

**State file entry:**
```json
{
  "taskType": "REFACTORING",
  "scope": "apps/vscode/src/commands/"
}
```

**Phase 0 priorities:**
- ✅ Find all instances of duplicated code
- ✅ Verify canonical location exists
- ✅ Plan extraction without behavior changes
- ✅ Ensure tests exist for current behavior

---

### HOTFIX
**When:** Production P0 incident requiring immediate fix
**Focus:** Minimal change to restore service
**Services:** Use existing, no new services
**Example:** "Fix critical auth failure", "Patch security vulnerability"

**State file entry:**
```json
{
  "taskType": "HOTFIX",
  "scheduledFollowup": "GH-####"
}
```

**Phase 0 priorities:**
- ✅ Identify root cause quickly
- ✅ Plan minimal fix
- ⏭️ Skip extensive service search
- ✅ Schedule proper TDD workflow post-deploy

---

## Step 0.5: Context-Specific Architecture Rules

**Identify your context before proceeding:**

### Working in `apps/api/` (Backend Services)

**Architecture rules:**
- ✅ Business logic MUST go in `apps/api/src/services/`
- ✅ Procedures MUST NOT have inline DB queries
- ✅ Use Drizzle ORM for database access
- ✅ Validate input in procedures, process in services

**Service layer compliance:**
```bash
# Check for service bypasses
grep -n "db\.\|prisma\." apps/api/modules/*/procedures/*.ts
```
**Expected:** Empty or only service instantiation

---

### Working in `apps/vscode/` (VS Code Extension)

**Architecture rules:**
- ✅ Commands go in `apps/vscode/src/commands/`
- ✅ Services go in `apps/vscode/src/services/`
- ✅ NEVER register commands before dependencies exist (activation race)
- ✅ ALWAYS use disposables for cleanup
- ✅ Use constants for command IDs from `constants/commands.ts`

**Activation order matters:**
```typescript
// ✅ CORRECT
1. Initialize service
2. Register listener that depends on service

// ❌ WRONG (activation race)
1. Register listener
2. Initialize service (listener fires with null service)
```

---

### Working in `apps/web/` (Next.js Web App)

**Architecture rules:**
- ✅ API routes in `apps/web/app/api/`
- ✅ Business logic in hooks or server actions
- ✅ NEVER put business logic in components
- ✅ Server-side validation required
- ✅ Client components for UI only

**Component structure:**
```typescript
// ✅ CORRECT
component → hook → server action → API

// ❌ WRONG
component → inline fetch → process data
```

---

## Step 0.9: Efficiency Check - Is Issue Already Fixed?

**Before proceeding with full audit:**

```bash
# For BUG_FIX tasks: Check if bug still exists
grep -n "[SUSPECTED_FIX]" [FILE_PATH]
```

**If bug is already fixed:**
1. Document in state:
```json
{
  "evidence": {
    "auditReport": {
      "status": "ALREADY_FIXED",
      "fixLocation": "apps/vscode/src/extension.ts:350-368",
      "fixVerified": true
    }
  }
}
```

2. Verify fix is correct (review code)
3. Check tests exist (if not, add them in Phase 1)
4. ✅ **SKIP to Phase 4** (Quality Verification)

**Exit early:** No need for full service search if issue is resolved.

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
| Error handling | `@snapback-oss/sdk/utils/errorHelpers.ts` |
| Retry logic | `@snapback-oss/sdk/utils/retry.ts` |
| Logger | `@snapback/infrastructure/logging/logger.ts` |
| Auth | `@snapback/auth` |
| Validation | `apps/api/middleware/validation.ts` + `@snapback/contracts` |
| Types | `@snapback/contracts` |

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
[SERVICE_PATH]/__tests__/[SERVICE_NAME].test.ts
```

**Example:** `apps/api/src/services/__tests__/metrics-aggregator.test.ts`

---

## Step 5: Check for Existing Utilities

**Before creating ANY utility function:**
```bash
# Search for similar utilities
grep -r "function ${FUNCTION_NAME}" packages/*/src/ apps/*/lib/
grep -r "export const ${FUNCTION_NAME}" packages/*/src/ apps/*/lib/

# Example: Searching for validation function
grep -r "function validate" packages/*/src/ apps/*/lib/
```

**Found existing utilities:**
```
[PASTE FINDINGS OR "NONE"]
```

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
reusing_utilities: [LIST OR "creating new"]
```

**Save this audit report to:**
```bash
# Append to state file
jq '.evidence.auditReport = {
  "task": "[TASK]",
  "serviceLocation": "[PATH]",
  "testLocation": "[PATH]",
  "existingService": true/false,
  "conflicts": "none"
}' ai_dev_utils/state/current-task.json > tmp.json && mv tmp.json ai_dev_utils/state/current-task.json
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
- [ ] No direct DB access planned for procedures
- [ ] No duplicate utilities being created
- [ ] Audit report saved to state file

**If PASS:** Load `@phases/1-red-phase.md`
**If FAIL:** Document violation, fix, retry

---

## Real-World Example: Task 4.1.A Violation

**What happened:**
```
Task: Add AI tool detection counts to dashboard metrics
Wrong approach: Wrote inline DB query in procedure file
```

**How audit would have prevented it:**
```bash
# Step 1: Search for services
$ find apps/api/src/services -name "*metric*"
apps/api/src/services/metrics-aggregator.ts  ← SERVICE EXISTS!

# Step 2: Read service
$ grep "class MetricsAggregator" apps/api/src/services/metrics-aggregator.ts
export class MetricsAggregator {
  // Has methods: getDailyMetrics, getRecentMetrics, etc.
  // MISSING: getAIToolDetectionCounts ← ADD THIS METHOD
}

# Conclusion: Add method to existing service, don't bypass!
```

---

**Remember:**
- Architecture violations pass tests but violate design
- 5-10 minutes now saves hours of refactoring later
- NEVER skip this phase

**Last Updated:** 2025-12-09
