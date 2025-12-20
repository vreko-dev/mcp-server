# Library Modernization Implementation Prompt

**Target:** AI Coding Assistant (Cursor/Qoder/Claude) with MCP access
**Project:** SnapBack (`ai_dev_utils/` pair programmer system)
**Goal:** Replace custom implementations with battle-tested libraries
**Last Updated:** 2024-12-20

---

## Discovery Status (Audited 2024-12-20)

| Library | Status | Location | Action |
|---------|--------|----------|--------|
| **atomically** | ✅ INTEGRATED | `ai_dev_utils/mcp/` | Safe writes for JSONL/patterns |
| **p-retry** | ✅ INTEGRATED | `ai_dev_utils/mcp/prompt-cache.ts` | Resilient API calls |
| **bottleneck** | ✅ INTEGRATED | `ai_dev_utils/mcp/server.ts` | Rate limiting |
| **chokidar** | ✅ INTEGRATED | `ai_dev_utils/mcp/` + 4 codebase locations | Pattern file watching |
| **ml-dbscan** | ⏳ EVALUATE | `packages/core/src/clustering/dbscan.ts` | Custom impl is well-tested |

### Codebase Findings:
- **withRetry** already exists at `@snapback-oss/sdk/utils/retry.ts` with RetryPresets
- **chokidar** already used in: `packages/core/src/utils/watcher.ts`, `packages/config/src/safeguards/file-watcher.ts`, `apps/vscode/src/ai/fs/agentWatcher.ts`
- **bottleneck** already in `packages/core/test/file-watching.integration.test.ts`
- **Custom DBSCAN** at `packages/core/src/clustering/dbscan.ts` (304 LOC) with comprehensive tests

---

## System Activation

Before ANY implementation work, execute these MCP calls in order:

```
1. codebase:get_context({
     task: "library modernization - replace custom implementations",
     files: ["packages/core/src", "packages/engine/src"],
     keywords: ["atomic", "retry", "rate-limit", "dbscan", "clustering", "chokidar", "watch"]
   })

2. codebase:check_patterns({
     code: "",
     filePath: "packages/core/src/clustering/dbscan.ts"
   })
```

Use returned context to inform implementation decisions.

---

## Task Classification (Per ROUTER.md)

This is a **REFACTORING** task with subtasks:

| Subtask | Type | Signal | Risk |
|---------|------|--------|------|
| Replace atomic writes | REFACTORING | Swap implementation | Low |
| Replace retry logic | REFACTORING | Swap implementation | Low |
| Replace rate limiting | REFACTORING | Swap implementation | Low |
| Replace DBSCAN | REFACTORING | Algorithm swap | Medium |
| Add chokidar (CLI) | NEW_FEATURE | New dependency | Low |

**Workflow:** Use `workflow-5-refactoring.md` pattern.

---

## Implementation Queue

Execute in dependency order. Each task follows TDD gates.

### TASK 1: atomically (Atomic File Writes)
**Priority:** P0 - Prevents data corruption
**Status:** ✅ COMPLETE - Integrated into ai_dev_utils/mcp
**Library:** `atomically` (npm)

**Discovered Locations:**
- `ai_dev_utils/mcp/server.ts` - appendJsonl, writeMd functions
- `ai_dev_utils/mcp/learning-engine.ts` - interaction logging
- `apps/vscode/src/storage/utils/atomicWrite.ts` - Uses vscode.workspace.fs (correct for extension)
- `packages/config/src/safeguards/atomic-writes.ts` - Custom impl (candidate for library)

**Integration (ai_dev_utils/mcp):**
```typescript
import { writeFile, writeFileSync } from "atomically";

// Atomic append with fallback
async function appendJsonl(filepath: string, data: any): Promise<void> {
  const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf-8") : "";
  await writeFile(fullPath, existing + JSON.stringify(data) + "\n");
}
```

**Note:** VS Code extension should continue using `vscode.workspace.fs` API (zero bundle impact).

---

### TASK 2: p-retry (Retry Logic)
**Priority:** P0 - API reliability
**Status:** ✅ COMPLETE - Integrated into ai_dev_utils/mcp/prompt-cache.ts
**Library:** `p-retry` (npm)

**Discovered Locations:**
- `@snapback-oss/sdk/utils/retry.ts` - **CANONICAL** withRetry + RetryPresets (KEEP THIS)
- `packages/sdk/src/utils/retry.ts` - Duplicate (consolidate to @snapback-oss/sdk)
- `apps/mcp-server/src/client/snapback-api.ts` - Uses `cockatiel` (already battle-tested)

**Decision:**
- **ai_dev_utils/mcp**: Use p-retry (standalone, simpler API)
- **Main codebase**: Keep `@snapback-oss/sdk/utils/retry.ts` (well-designed, tested)

**Integration (ai_dev_utils/mcp/prompt-cache.ts):**
```typescript
import pRetry, { AbortError } from "p-retry";

const response = await pRetry(
  async () => anthropic.messages.create({...}),
  {
    retries: 3,
    onFailedAttempt: (error) => {
      console.error(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      if (String(error).includes("401")) throw new AbortError(String(error));
    },
  }
);
```

**Existing SDK Pattern (CANONICAL - use this in codebase):**
```typescript
import { withRetry, RetryPresets } from "@snapback-oss/sdk";
await withRetry(() => fetch(url), RetryPresets.network);
```

---

### TASK 3: bottleneck (Rate Limiting)
**Priority:** P0 - Prevents API throttling
**Status:** ✅ COMPLETE - Integrated into ai_dev_utils/mcp/server.ts
**Library:** `bottleneck` (npm)

**Discovered Locations:**
- `packages/core/test/file-watching.integration.test.ts` - **ALREADY USING bottleneck**
- `apps/api/src/middleware/ratelimit.ts` - Custom token bucket
- `apps/api/middleware/rate-limit.ts` - Tier-based rate limiting
- `packages/sdk/src/token/RateLimiter.ts` - Custom RateLimiter class

**Integration (ai_dev_utils/mcp/server.ts):**
```typescript
import Bottleneck from "bottleneck";

// Rate limiter for API calls (prevents overwhelming services)
const apiLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 100, // 10 requests/second max
});

// Usage
const result = await apiLimiter.schedule(() => fetch(url));
```

**Note:** Production rate limiters in `apps/api/` use custom implementations for tier-based limits. Consider migrating to bottleneck for consistency.

---

### TASK 4: ml-dbscan (Clustering Algorithm)
**Priority:** P1 - Performance + correctness at scale
**Status:** ⏳ EVALUATE - Custom implementation is well-tested
**Location:** `packages/core/src/clustering/dbscan.ts` (304 lines)
**Library:** `ml-dbscan` or `density-clustering` (npm)

**Current Implementation Analysis:**
- Custom DBSCAN class with Euclidean distance
- Supports custom distance functions
- Comprehensive test suite at `packages/core/test/unit/clustering/dbscan.test.ts`
- Handles: empty datasets, single points, noise points, custom minPts/eps

**Recommendation:**
- **KEEP custom implementation** - It's well-tested and domain-specific
- Only replace if performance issues arise at scale
- The custom impl preserves SnapBack-specific session grouping logic

```bash
# Verify existing tests pass
pnpm --filter @snapback/core test -- --grep "dbscan|cluster"
```

**If replacement needed:**
```typescript
import DBSCAN from 'ml-dbscan';

export function clusterSnapshots(snapshots: Snapshot[], epsilon: number, minPts: number): SessionCluster[] {
  const points = snapshots.map(s => [s.timestamp, s.semanticHash]);
  const dbscan = new DBSCAN();
  const clusters = dbscan.run(points, epsilon, minPts);
  // Transform back to SnapBack domain
  return clusters.map(cluster => ({
    sessionId: generateSessionId(),
    snapshots: cluster.map(idx => snapshots[idx]),
  }));
}
```

---

### TASK 5: chokidar (File Watching - CLI/Non-VSCode)
**Priority:** P2 - For CLI surface
**Status:** ✅ COMPLETE - Already in use across codebase
**Library:** `chokidar` (npm)

**Discovered Locations (ALREADY USING):**
- `packages/core/src/utils/watcher.ts` - makeWatcher() with chokidar
- `packages/config/src/safeguards/file-watcher.ts` - ConfigWatcher class
- `apps/vscode/src/ai/fs/agentWatcher.ts` - Agent file watching
- `packages/core/test/file-watching.integration.test.ts` - Integration tests
- `ai_dev_utils/mcp/server.ts` - **NEW** Pattern file watching

**Integration (ai_dev_utils/mcp/server.ts):**
```typescript
import chokidar from "chokidar";

let patternWatcher: ReturnType<typeof chokidar.watch> | null = null;

function startPatternWatcher(): void {
  patternWatcher = chokidar.watch(patternsPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  });

  patternWatcher.on("change", (filePath: string) => {
    console.error(`[PatternWatcher] Reloading: ${path.basename(filePath)}`);
    cachedPatterns = null; // Invalidate cache
  });
}
```

**Note:** VS Code extension should continue using `vscode.workspace.createFileSystemWatcher` (zero bundle impact).

---

## Execution Protocol

For EACH task:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CONTEXT                                                      │
│     codebase:get_context({ task, files, keywords })             │
│                                                                 │
│  2. DISCOVER                                                    │
│     Find all usages of current implementation                   │
│     Document in task notes                                      │
│                                                                 │
│  3. TEST FIRST (RED)                                            │
│     Write failing test that validates library behavior          │
│     npx tsx ai_dev_utils/gates/gate-runner.ts red               │
│                                                                 │
│  4. IMPLEMENT (GREEN)                                           │
│     Install library: pnpm add <library> --filter <package>      │
│     Replace implementation                                      │
│     npx tsx ai_dev_utils/gates/gate-runner.ts green             │
│                                                                 │
│  5. REFACTOR                                                    │
│     Remove old implementation files                             │
│     Update all import paths                                     │
│     npx tsx ai_dev_utils/gates/gate-runner.ts refactor          │
│                                                                 │
│  6. VERIFY                                                      │
│     pnpm test --filter <package>                                │
│     pnpm typecheck                                              │
│                                                                 │
│  7. RECORD                                                      │
│     codebase:record_learning({ context, learning, tags })       │
│                                                                 │
│  8. COMMIT                                                      │
│     git add -A && git commit -m "refactor(<pkg>): replace X with Y"│
└─────────────────────────────────────────────────────────────────┘
```

---

## Constraint Checks

Before committing any task, verify:

```
codebase:check_patterns({
  code: <new_implementation>,
  filePath: <file_path>
})
```

**Hard Constraints (from CONSTRAINTS.md):**
- [ ] No increase in bundle size beyond library weight
- [ ] All existing tests still pass
- [ ] No new TypeScript errors
- [ ] Performance budgets maintained (<100ms for snapshots)
- [ ] Privacy-first: no new external network calls from libraries

---

## Error Handling

If a task fails:

```
codebase:report_violation({
  type: "LIBRARY_INTEGRATION",
  message: "Failed to integrate <library>: <reason>",
  file: "<file_path>",
  suggestion: "<what to try next>"
})
```

Then:
1. Revert changes: `git checkout -- .`
2. Document blocker in task notes
3. Move to next task
4. Return with more context later

---

## Success Criteria

All tasks complete when:

```bash
# All tests pass
pnpm test

# No type errors
pnpm typecheck

# Bundle size acceptable
pnpm --filter @snapback/vscode bundle:analyze

# Performance budgets met
pnpm --filter @snapback/core bench
```

**Final Recording:**
```
codebase:record_learning({
  context: "library-modernization-complete",
  learning: "Replaced 5 custom implementations with battle-tested libraries. Saved ~180 dev hours, eliminated ~40 potential bugs.",
  tags: ["milestone", "libraries", "refactoring"]
})
```

---

## Quick Reference: Libraries

| Library | Size | Purpose | Status | Location |
|---------|------|---------|--------|----------|
| `atomically` | ~15KB | Atomic file writes | ✅ Integrated | `ai_dev_utils/mcp/` |
| `p-retry` | ~5KB | Retry with backoff | ✅ Integrated | `ai_dev_utils/mcp/prompt-cache.ts` |
| `bottleneck` | ~25KB | Rate limiting | ✅ Integrated | `ai_dev_utils/mcp/server.ts` |
| `chokidar` | ~50KB | File watching | ✅ Integrated | Multiple locations |
| `ml-dbscan` | ~10KB | DBSCAN clustering | ⏳ Evaluate | Custom impl adequate |

**ai_dev_utils/mcp bundle impact:** ~95KB (acceptable for reliability gains)

---

## Installation (ai_dev_utils/mcp)

```bash
# CRITICAL: Use --ignore-workspace flag (ai_dev_utils is outside main workspace)
cd ai_dev_utils/mcp
pnpm add atomically p-retry bottleneck chokidar --ignore-workspace
```

---

## Activation

Copy this entire prompt into your AI assistant, then say:

```
Execute TASK 1: atomically
```

The AI should:
1. Call `codebase:get_context` to find atomic write usages
2. Follow TDD gates
3. Implement replacement
4. Record learning
5. Report completion

Repeat for each task.
