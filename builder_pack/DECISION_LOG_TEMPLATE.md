# Snapback Decision Log

> **Purpose:** Track architectural decisions, library choices, performance optimizations, and lessons learned.
>
> **Format:** Newest entries at the top. Keep entries concise and focused on the "why" behind decisions.

---

## Decision Log Template

```markdown
## YYYY-MM-DD: [Brief Decision Title]

**Context:**
[What problem were we solving? What was the situation?]

**Decision:**
[What did we choose to do?]

**Alternatives Considered:**

1. [Option A] - Rejected because: [reason]
2. [Option B] - Rejected because: [reason]

**Rationale:**

-   [Concrete reason 1]
-   [Concrete reason 2]
-   [Performance/DX/Simplicity benefit]

**Trade-offs:**

-   ✓ Gains: [what we got]
-   ✗ Costs: [what we gave up]

**Performance Impact:**

-   Before: [metric]
-   After: [metric]
-   Within budget: [yes/no]

**Validation:**

-   [ ] Tests passing
-   [ ] Lefthook passing
-   [ ] Performance validated
-   [ ] DX maintained

**Lessons Learned:**
[What would we do differently? What worked well?]

**References:**

-   Code: [file paths]
-   PR: [link if applicable]
-   Docs: [related documentation]
```

---

## Example Entries

### 2024-01-15: Use ts-morph for AST analysis

**Context:**
Need to detect semantic changes in TypeScript code beyond simple text diffs. Current git diff approach misses refactorings that preserve behavior.

**Decision:**
Integrate ts-morph for TypeScript AST parsing and semantic diffing.

**Alternatives Considered:**

1. typescript (native compiler) - Rejected: Too low-level, verbose API
2. babel-parser - Rejected: 87kb bundle size, not TypeScript-native
3. swc - Rejected: Performance overkill for our use case, adds complexity

**Rationale:**

-   Already using TypeScript in codebase (consistency)
-   24kb bundle size fits budget (<50kb)
-   Clean API for AST traversal and comparison
-   Good VS Code extension ecosystem support
-   Active maintenance and TS 5.x support

**Trade-offs:**

-   ✓ Gains: Semantic awareness, better detection accuracy
-   ✗ Costs: 24kb bundle increase, learning curve for maintainers

**Performance Impact:**

-   Parsing: 15ms avg for 500-line file
-   Memory: 8KB per cached AST
-   Budget: 25ms for pattern matching
-   Result: ✓ Within budget (15ms < 25ms)

**Validation:**

-   [x] Tests passing (30 tests, 100% coverage)
-   [x] Lefthook passing
-   [x] Performance validated (profiled with 1000 files)
-   [x] DX maintained (zero config for contributors)

**Lessons Learned:**

-   AST caching critical for performance
-   Clear cache on file modification (avoid stale data)
-   Worth the complexity for accuracy improvement (40% better detection)

**References:**

-   Code: `src/detection/semantic-diff.ts`
-   Tests: `src/__tests__/semantic-diff.test.ts`
-   PR: #142

---

### 2024-01-10: Debounce file watchers at 300ms

**Context:**
File watchers triggering too frequently during rapid edits (e.g., multi-cursor, find-replace). Causing UI jank and excessive CPU usage.

**Decision:**
Implement 300ms debounce on FileSystemWatcher events.

**Alternatives Considered:**

1. 100ms debounce - Rejected: Still too frequent, minimal UX benefit
2. 500ms debounce - Rejected: Feels sluggish to users
3. Throttle instead - Rejected: Need to capture final state, not intermediates

**Rationale:**

-   300ms feels instantaneous to users (<400ms perception threshold)
-   Reduces event processing by 85% in typical scenarios
-   Captures final state after rapid edits complete
-   Standard pattern in VS Code ecosystem

**Trade-offs:**

-   ✓ Gains: 85% fewer events, stable CPU usage, no UI jank
-   ✗ Costs: 300ms delay in detection (acceptable for safety layer)

**Performance Impact:**

-   Before: ~30 events/second during typing
-   After: ~3 events/second (final state only)
-   CPU usage: Reduced from 12% → 2%

**Validation:**

-   [x] Tests passing
-   [x] Lefthook passing
-   [x] Performance validated (tested with 500+ file workspace)
-   [x] DX maintained (feels instant to users)

**Lessons Learned:**

-   300ms is the sweet spot for file watching
-   Debounce over throttle for state capture
-   Profile before and after optimizations (don't guess)

**References:**

-   Code: `src/detection/file-watcher.ts`
-   Perf PR: #138

---

## Active Decisions (Under Evaluation)

> **Note:** These are decisions currently being evaluated. Move to main log when finalized.

### YYYY-MM-DD: [Decision Being Considered]

**Status:** 🟡 Evaluating / 🟢 Approved / 🔴 Rejected

**Context:**
[Brief description]

**Current Approach:**
[What we're testing]

**Early Findings:**
[What we're learning]

**Next Steps:**

1. [Action 1]
2. [Action 2]

---

## Rejected Approaches (Learn From These)

> **Note:** Document approaches we tried but abandoned. Prevents repeating mistakes.

### 2024-01-08: Real-time AI detection via LLM API

**Why Rejected:**

-   Latency: 500-2000ms per request (way over 100ms budget)
-   Cost: $0.02 per file analysis (not sustainable)
-   Privacy: Sending code to external API (security concern)
-   Reliability: API downtime blocks extension functionality

**What We Learned:**

-   Local heuristics sufficient for 90% of cases
-   Pattern matching (<25ms) beats LLM accuracy for speed
-   Privacy-first approach is non-negotiable

**Alternative Adopted:**
Local pattern matching + statistical analysis (see entry 2024-01-12)

---

### 2024-01-05: Checkpoint-based rollback system

**Why Rejected:**

-   Terminology confusion with git checkpoints
-   Complex state management (300+ LOC)
-   Edge cases with merge conflicts
-   Git already provides this functionality

**What We Learned:**

-   Use git primitives instead of reimplementing
-   Simple snapshot comparison sufficient
-   Terminology matters for developer mental models

**Alternative Adopted:**
Snapshot comparison with git diff integration (see entry 2024-01-07)

---

## Performance Budget Changes

Track changes to performance budgets when we discover new requirements.

| Date       | Operation     | Old Budget | New Budget | Reason                               |
| ---------- | ------------- | ---------- | ---------- | ------------------------------------ |
| 2024-01-12 | Diff Analysis | 50ms       | 100ms      | Complex git histories need more time |
| 2024-01-10 | File Watch    | 500ms      | 300ms      | Users prefer faster feedback         |

---

## Guidelines for Entries

### When to Log a Decision

✓ **Do log:**

-   New library integrations
-   Architecture changes
-   Performance optimizations
-   Pattern changes
-   Breaking changes
-   Rejected approaches (learn from them!)

✗ **Don't log:**

-   Routine bug fixes
-   Code style changes
-   Minor refactors
-   Documentation updates

### Writing Good Entries

**Good:**

```
Decision: Use SHA-256 for file hashing
Rationale: Fast (5ms avg), secure enough, native Node.js support
Performance: 5ms per file, well under 50ms budget
```

**Bad:**

```
Decision: Use hashing
Rationale: It's better
Performance: Fast
```

### Keep It Concise

-   Use bullet points
-   Include concrete numbers
-   Reference code locations
-   Focus on "why" not "how"
-   Link to detailed docs if needed

---

## Review Schedule

-   **Weekly:** Review active decisions for progress
-   **Monthly:** Ensure recent decisions have validation checkmarks
-   **Quarterly:** Review rejected approaches to validate they're still correct

---

**Last Updated:** [Date]
**Maintainers:** [Team members responsible for updates]
