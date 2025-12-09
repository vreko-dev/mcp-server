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
