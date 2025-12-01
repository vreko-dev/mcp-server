# CR-V2 Refactor Implementation Analysis

**Analysis Date:** 2025-11-08
**Branch Analyzed:** claude/analyze-dev-branch-011CUvc25pixnD8v6Sx1cKgR
**Overall Completion:** 15.3% (2.75/18 tasks)

---

## Executive Summary

The CR-V2 refactor runlist defines 18 implementation tasks across 6 major areas. Current implementation shows **15.3% completion**, with most foundational schema hardening and adapter improvements not yet implemented. Test coverage shows better progress at 50%, and basic infrastructure exists but lacks the specific tooling defined in the runlist.

---

## Section-by-Section Analysis

### 1. SCHEMA HARDENING (0% - 0/5 tasks)

**Status:** ❌ **NOT IMPLEMENTED**

#### What the Runlist Requires:
- Normalize import paths to `../postgres`
- Add FK CASCADE to `userId` → `users.id` and `apiKeyId` → `apiKeys.id`
- Add CHECK constraints for enum fields (suggestionType, evaluationResult, loopType, feedbackType)
- Add composite indexes: `(user_id, created_at)` and `(api_key_id, created_at)`
- Align quarantine_events with FKs and indexes

#### Current State:
**Files Examined:**
- `packages/platform/src/db/schema/snapback/agent-suggestions.ts`
- `packages/platform/src/db/schema/snapback/policy-evaluations.ts`
- `packages/platform/src/db/schema/snapback/loops.ts`
- `packages/platform/src/db/schema/snapback/feedback.ts`
- `packages/platform/src/db/schema/snapback/post-accept-outcomes.ts`
- `packages/platform/src/db/schema/snapback/quarantine-events.ts`

**Findings:**
- ❌ No FK CASCADE references to `users.id` or `apiKeys.id`
- ❌ No CHECK constraints for enum validation
- ❌ No composite indexes on hot-path queries
- ❌ `quarantine_events` lacks `userId`/`apiKeyId` fields entirely (runlist expects to add these)
- ✅ Basic drizzle schema definitions exist
- ✅ `quarantine_events` has one index on `attemptedAt` (but not the runlist-specified structure)

**Example of Missing FK CASCADE:**
```typescript
// Current (agent-suggestions.ts:5-6)
userId: text("user_id").notNull(),
apiKeyId: text("api_key_id").notNull(),

// Runlist expects:
userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
```

**Example of Missing CHECK Constraint:**
```typescript
// Runlist expects (agent-suggestions.ts):
export const agentSuggestions = pgTable(
  "agent_suggestions",
  { /* columns */ },
  (t) => ({
    agent_suggestions_suggestion_type_check: check(
      'agent_suggestions_suggestion_type_check',
      sql`${t.suggestionType} in ('code', 'comment', 'refactor')`
    ),
  })
);
```

---

### 2. ADAPTER UPDATES (25% - 0.5/2 tasks)

**Status:** 🟡 **PARTIALLY IMPLEMENTED**

#### What the Runlist Requires:
- Create `redactObjectDeep` helper in `packages/analytics/src/redaction.ts`
- Patch `TelemetrySinkDb` to:
  - Use deep redaction on violations/remediationSteps
  - Add quarantine mechanism for failed inserts
  - Add unified `SLOW_MS = 200` threshold with logging

#### Current State:
**Files Examined:**
- `packages/analytics/src/redaction.ts` ✅
- `packages/platform/src/db/adapters/TelemetrySinkDb.ts` ❌

**Findings:**
✅ **DONE:** Redaction helpers exist
- `redactString()` - redacts emails, phones, file paths, URLs, UUIDs
- `redactObject()` - recursive redaction with deep copy
- `redactEventProperties()` - specialized for telemetry
- **Note:** Function is named `redactObject` not `redactObjectDeep`, but implements deep recursion

❌ **NOT DONE:** TelemetrySinkDb improvements
- No imports of redaction helpers
- No redaction applied in insert methods
- No try/catch blocks with quarantine fallback
- No `SLOW_MS` constant or slow-query logging
- No `logger.warn()` calls for performance monitoring

**Critical Gap - No Quarantine Mechanism:**
```typescript
// Runlist expects:
try {
  await this.db.insert(table).values(redacted);
} catch (error) {
  await this.db.insert(quarantineEvents).values({
    originalEvent: event,
    errorReason: error.message,
    errorStack: error.stack,
  });
  throw error;
}
```

---

### 3. ANALYTICS IMPROVEMENTS (0% - 0/3 tasks)

**Status:** ❌ **NOT IMPLEMENTED**

#### What the Runlist Requires:
- Create `packages/analytics/src/query/filters.ts` with dynamic filter builder
- Inject testable `Clock` interface into `retention.ts`
- Add time-travel test in `packages/analytics/test/retention.clock.spec.ts`

#### Current State:
**Files Examined:**
- `packages/analytics/src/` directory
- `packages/analytics/src/retention.ts`
- `packages/analytics/test/retention.spec.ts`

**Findings:**
❌ **Missing Filter Infrastructure:**
- No `packages/analytics/src/query/` directory
- No `filters.ts` with `buildFilters()` function
- No `applyFilters()` helper in `reads.ts`

❌ **Missing Clock Injection:**
```typescript
// Runlist expects:
export interface Clock { now(): Date }
const sysClock: Clock = { now: () => new Date() };

export async function runRetention(clock: Clock = sysClock) {
  const cutoff = clock.now();
  // ...
}
```

❌ **Missing Time-Travel Test:**
- `retention.spec.ts` exists but uses mocks, not clock injection
- No deterministic time advancement tests
- No verification of expiry logic at specific timestamps

---

### 4. TEST IMPLEMENTATIONS (50% - 2/4 tasks)

**Status:** 🟡 **HALF COMPLETE**

#### What the Runlist Requires:
1. Concurrency smoke test for adapter
2. EXPLAIN capture test
3. Deep redaction behavior test
4. Slow insert logging test

#### Current State:
**Files Examined:**
- `packages/analytics/test/ingest.spec.ts` ✅
- `packages/analytics/test/plane-b.perf.spec.ts` 🟡
- `packages/analytics/test/redaction.spec.ts` ✅
- `packages/platform/test/perf.spec.ts` ❌
- `packages/platform/test/sink.telemetry.spec.ts` ❌

**Findings:**

✅ **DONE: Concurrency Test** (ingest.spec.ts:71-120)
```typescript
it("should handle batch insert with backpressure", async () => {
  const events = Array.from({ length: 5 }, (_, i) => ({ /* ... */ }));
  await ingestHandler.ingestBatch(batch);
  expect(mockSink.insertAgentSuggestion).toHaveBeenCalledTimes(5);
});
```

❌ **NOT DONE: EXPLAIN Capture Test**
- `plane-b.perf.spec.ts` tests query performance but does NOT verify EXPLAIN output
- Runlist expects: `db.execute('EXPLAIN ' + sql)` with plan assertion

✅ **DONE: Deep Redaction Test** (redaction.spec.ts:34-70)
```typescript
it("should redact sensitive keys in objects", () => {
  const input = { password: "secret123", data: { nested: { secret: "top_secret" } } };
  const result = redactObject(input);
  expect(result.data.nested.secret).toContain("REDACTED_");
});
```

❌ **NOT DONE: Slow Insert Logging Test**
- No test verifies `logger.warn()` is called when insert exceeds threshold
- No verification of `SLOW_MS` constant enforcement

---

### 5. OPS TOOLING (12.5% - 0.25/2 tasks)

**Status:** ❌ **MOSTLY NOT IMPLEMENTED**

#### What the Runlist Requires:
1. `scripts/quarantine-replay.ts` CLI tool with --dry-run and --limit flags
2. Updated `docs/RUNBOOKS.md` with replay procedure and 200ms threshold

#### Current State:
**Files Examined:**
- `scripts/` directory
- `docs/RUNBOOKS.md`
- `package.json` scripts

**Findings:**

❌ **NOT DONE: Quarantine Replay CLI**
- `scripts/quarantine-replay.ts` does NOT exist
- No `quarantine:replay` script in `package.json`
- Runlist expects:
  ```json
  "scripts": {
    "quarantine:replay": "tsx scripts/quarantine-replay.ts --dry --limit 200"
  }
  ```

🟡 **PARTIAL: Runbooks Documentation**
- ✅ `docs/RUNBOOKS.md` exists (created recently: Nov 8 14:47)
- ❌ Content does NOT match runlist specification:
  - Missing replay procedure section
  - Threshold is 150ms instead of 200ms (line 9, 32)
  - No mention of `--dry-run` or `--no-dry` flags
  - Quarantine section exists but lacks replay instructions

**Discrepancy Example:**
```markdown
## Current RUNBOOKS.md (line 2-3)
## Slow Queries (P95 > 150ms)

## Runlist expects:
## Slow Queries
- Threshold: **200ms** per insert (SLOW_MS).
```

---

### 6-7. DB ASSERTIONS & CI/CD (0% - 0/2 tasks)

**Status:** ❌ **NOT IMPLEMENTED**

#### What the Runlist Requires:
1. `scripts/db-assert.ts` to verify FK CASCADE and CHECK constraints in live DB
2. `.github/workflows/verify.yml` with unit tests, optional db:assert, and verify.sh

#### Current State:
**Files Examined:**
- `scripts/` directory
- `.github/workflows/` directory
- `package.json` scripts

**Findings:**

❌ **NOT DONE: DB Assertion Script**
- `scripts/db-assert.ts` does NOT exist
- No `db:assert` script in `package.json`
- No DATABASE_URL-conditional verification logic

❌ **NOT DONE: Verify Workflow**
- `.github/workflows/verify.yml` does NOT exist
- Existing workflows:
  - ✅ `ci.yml`, `ci-cd.yml`, `turborepo-ci.yml` (general CI)
  - ✅ `vscode-test.yml`, `web-validate.yml` (app-specific)
  - ❌ No unified verify pipeline as runlist specifies

**What's Missing:**
```yaml
# .github/workflows/verify.yml (runlist expects)
name: verify
jobs:
  verify:
    steps:
      - run: pnpm -w vitest run --coverage
      - env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }
        run: pnpm db:assert
      - run: |
          if [ -x ./verify.sh ]; then ./verify.sh; fi
```

---

## Completion Scorecard

| Section | Tasks Complete | Total Tasks | % Complete | Status |
|---------|---------------|-------------|------------|--------|
| 1. Schema Hardening | 0 | 5 | 0% | ❌ |
| 2. Adapter Updates | 0.5 | 2 | 25% | 🟡 |
| 3. Analytics Improvements | 0 | 3 | 0% | ❌ |
| 4. Test Implementations | 2 | 4 | 50% | 🟡 |
| 5. Ops Tooling | 0.25 | 2 | 12.5% | ❌ |
| 6-7. DB Assertions & CI | 0 | 2 | 0% | ❌ |
| **TOTAL** | **2.75** | **18** | **15.3%** | ❌ |

---

## High-Impact Missing Features

### Critical (Blocking GDPR/Production Readiness):
1. **FK CASCADE on user deletion** - Without this, deleting a user won't cascade to telemetry rows
2. **Enum CHECK constraints** - Invalid enum values can be inserted (data integrity risk)
3. **Quarantine mechanism** - Failed telemetry inserts silently fail instead of being quarantined for replay
4. **DB assertion script** - No automated verification of schema constraints in production

### High Priority (Performance/Observability):
5. **Composite indexes** - Hot-path queries on `(user_id, created_at)` will do full table scans
6. **Slow-query logging** - No visibility into insert performance degradation
7. **Redaction in adapter** - PII may be stored in database (privacy risk)
8. **Quarantine replay CLI** - No operational tool to recover from failed ingests

### Medium Priority (Testing/Maintenance):
9. **Clock injection in retention** - Can't test retention logic deterministically
10. **EXPLAIN capture test** - Can't verify query plans are optimal
11. **Dynamic filters** - Analytics queries hardcoded, not reusable
12. **Verify workflow** - No single CI job to gate PRs

---

## What IS Working

✅ **Good Test Coverage:**
- Concurrency handling tested (ingest.spec.ts)
- Redaction logic thoroughly tested (redaction.spec.ts)
- Performance budgets enforced (plane-b.perf.spec.ts: 150ms P95)

✅ **Redaction Infrastructure:**
- Comprehensive pattern detection (emails, phones, UUIDs, file paths, code snippets)
- Deep object recursion implemented
- Sensitive key detection (passwords, tokens, secrets)

✅ **Basic Schema:**
- All 5 telemetry tables exist with proper drizzle definitions
- `quarantine_events` table exists (though structure differs from runlist)
- Timestamps and UUIDs correctly configured

✅ **Documentation:**
- `docs/RUNBOOKS.md` exists with operational procedures
- RUNBOOKS covers slow queries, duplicates, retention, quarantine (needs updates per runlist)

---

## Recommendations

### Immediate Actions (Before Production):
1. **Implement FK CASCADE** (schema-fk-cascade task) - GDPR compliance blocker
2. **Add redaction to adapter** (adapter-patch task) - PII exposure risk
3. **Add quarantine try/catch** (adapter-patch task) - Data loss prevention
4. **Create composite indexes** (schema-indexes task) - Avoid P95 violations at scale

### Short-Term (Sprint):
5. **Build quarantine replay CLI** (replay-cli task) - Operational necessity
6. **Add CHECK constraints** (schema-enum-checks task) - Data integrity
7. **Implement slow-query logging** (adapter-patch task) - Performance monitoring
8. **Create db-assert script** (db-assertions task) - CI/CD safety

### Medium-Term (Next Sprint):
9. **Inject Clock in retention** (retention-clock task) - Test reliability
10. **Add dynamic filters** (analytics-filters task) - Code reusability
11. **Create verify workflow** (ci-workflows task) - Unified CI gate
12. **Update RUNBOOKS** (docs-runbooks task) - Align with 200ms threshold

---

## Files Requiring Changes

### Schema Files (5 files):
- `packages/platform/src/db/schema/snapback/agent-suggestions.ts`
- `packages/platform/src/db/schema/snapback/policy-evaluations.ts`
- `packages/platform/src/db/schema/snapback/loops.ts`
- `packages/platform/src/db/schema/snapback/feedback.ts`
- `packages/platform/src/db/schema/snapback/post-accept-outcomes.ts`

### Adapter Files (1 file):
- `packages/platform/src/db/adapters/TelemetrySinkDb.ts`

### Analytics Files (3 files):
- `packages/analytics/src/query/filters.ts` (CREATE)
- `packages/analytics/src/retention.ts` (MODIFY)
- `packages/analytics/src/reads.ts` (MODIFY if exists)

### Test Files (3 files):
- `packages/analytics/test/retention.clock.spec.ts` (CREATE)
- `packages/analytics/test/plane-b.perf.spec.ts` (MODIFY - add EXPLAIN)
- `packages/platform/test/slowlog.spec.ts` (CREATE)

### Ops Files (3 files):
- `scripts/quarantine-replay.ts` (CREATE)
- `scripts/db-assert.ts` (CREATE)
- `docs/RUNBOOKS.md` (UPDATE)

### CI Files (1 file):
- `.github/workflows/verify.yml` (CREATE)

### Config Files (1 file):
- `package.json` (ADD scripts: `quarantine:replay`, `db:assert`)

**Total Files to Modify/Create:** 17 files

---

## Migration Path

Since schema changes require database migrations:

1. **Generate migration:** `drizzle-kit generate` after schema updates
2. **Review migration SQL:** Verify FK CASCADE syntax is correct
3. **Test migration:** Apply to staging DB first
4. **Rollback plan:** Prepare `DROP CONSTRAINT` statements
5. **Apply to production:** During maintenance window (CASCADE may lock tables)

**Estimated Downtime:** 2-5 minutes (depending on table sizes)

---

## Conclusion

The codebase has a **solid foundation** with working telemetry ingestion, redaction utilities, and test infrastructure. However, the **CR-V2 refactor runlist is only 15.3% complete**, with critical gaps in:

- **Data integrity** (no FK CASCADE, no CHECK constraints)
- **Privacy** (redaction not wired to adapter)
- **Reliability** (no quarantine mechanism)
- **Performance** (missing indexes, no slow-query monitoring)
- **Operations** (no replay CLI, no db assertions)

**Priority:** Focus on Section 1 (Schema Hardening) and Section 2 (Adapter Updates) first, as these are **production blockers** for GDPR compliance and data integrity.
