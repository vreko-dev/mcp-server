# Task Router

**Purpose:** Intelligent task classification and workflow routing with self-learning
**Entry Point:** Load this file to start any development task

---

## Quick Start

```
Say: "Route: [YOUR TASK DESCRIPTION]"
Example: "Route: Fix the sign-in button not working in VS Code extension"
```

---

## Pre-Routing: Learning Check

Before classifying, I scan `feedback/learnings.jsonl` for relevant patterns:

```bash
# Check for known patterns matching your task
grep -i "[KEYWORD]" ai_dev_utils/feedback/learnings.jsonl
```

**If match found:** Surface learning before proceeding.

---

## Task Classification Matrix

| Signal Words | Task Type | Workflow | Priority |
|--------------|-----------|----------|---------|
| "fix", "broken", "bug", "error", "crash", "not working" | BUG_FIX | `1_triage.md` → `4_dev_complete.md` | P1-P2 |
| "slow", "regression", "performance", "timing", "activation time", "unaccounted time", "budget exceeded" | PERFORMANCE_REGRESSION | `2_research.md` (profile) → Sequential Thinking → `4_dev_complete.md` | P0-P1 |
| "add", "implement", "create", "new feature", "build" | NEW_FEATURE | `2_research.md` → `3_planning.md` → `4_dev_complete.md` | P2-P3 |
| "refactor", "clean up", "consolidate", "extract", "dedupe" | REFACTORING | `5_refactor.md` | P3-P4 |
| "UX", "tree view", "sidebar", "UI structure", "layout" | UX_REFACTORING | `5_refactor.md` + UI patterns | P2-P3 |
| "test", "coverage", "edge case", "missing test" | TESTING | `6_test.md` | P3 |
| "docs", "outdated", "stale", "update docs", "cleanup docs" | DOC_HYGIENE | `8_doc_hygiene.md` | P4 |
| "P0", "production", "critical", "emergency", "down" | HOTFIX | `7_hotfix.md` | P0 |
| "investigate", "why", "how does", "understand" | RESEARCH | `2_research.md` | P3 |

---

## Context Detection

| Context Signal | Detected Area | Special Rules |
|----------------|---------------|---------------|
| "VS Code", "extension", "command", "activation" | `apps/vscode/` | Check activation order, disposables, ExtensionContext |
| "activation slow", "performance regression", "timing", "budget exceeded", "unaccounted time" | `apps/vscode/` | **Use sequential timing analysis**, profile activation phases, check duplicate instances, validate against 500ms budget |
| "TreeView", "TreeDataProvider", "sidebar" | `apps/vscode/` | See VS Code Extension Patterns below |
| "API", "endpoint", "backend", "database", "service" | `apps/api/` | Use service layer, no inline DB queries |
| "web", "dashboard", "component", "React", "Next.js" | `apps/web/` | Business logic in hooks, not components |
| "MCP", "server", "tool" | `apps/mcp-server/` | Follow MCP protocol patterns |
| Multiple contexts | Full-stack | Start with contracts, then backend, then frontend |

---

## Test Infrastructure Rules

**CRITICAL:** When working on tests or vitest configurations, follow these standards:

### Vitest Config Standard

All packages MUST use `@snapback/vitest-config` for consistent test configuration:

```typescript
// vitest.config.ts - Standard pattern for ALL packages
import { nodeConfig, mergeConfigs } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

export default defineProject(
  mergeConfigs(nodeConfig, {
    test: {
      name: "@snapback/my-package",
      include: ["test/**/*.test.ts"],
    },
  })
);
```

### Available Presets

| Preset | Use Case |
|--------|----------|
| `nodeConfig` | Node.js packages, SDK, CLI, API |
| `jsdomConfig` | React components, browser testing |
| `vscodeConfig` | VS Code extension testing |
| `integrationConfig` | Integration tests (30s timeout) |
| `e2eConfig` | End-to-end tests (60s timeout) |

### Test File Naming

- Use `.test.ts` exclusively (NOT `.spec.ts`)
- Standard location: `test/**/*.test.ts`
- Integration tests: `test/integration/**/*.test.ts`

### DO NOT

- Create standalone vitest configs without importing `@snapback/vitest-config`
- Use `defineConfig` instead of `defineProject` for package configs
- Mix `.test.ts` and `.spec.ts` naming patterns

**Reference:** `packages/testing/README.md` for full documentation

---

## VS Code Extension Patterns

### Constructor Changes (ExtensionContext)

When adding `ExtensionContext` as a constructor parameter:

1. **Update ALL test files** - Search for `new ProviderName(` across test files
2. **Add mockContext** with required properties:
   ```typescript
   const mockContext = {
     globalState: {
       get: vi.fn().mockReturnValue(undefined),
       update: vi.fn().mockResolvedValue(undefined),
     },
     subscriptions: { push: vi.fn() },
   };
   ```
3. **Static `register()` methods** need full context mock too

### TreeView/TreeDataProvider Refactoring

When restructuring tree hierarchy:

1. **Navigate by `item.data.type`** not `item.label` in tests
2. **Group keys are hyphenated** (`this-week`) not camelCase (`thisWeek`)
3. **Create helper functions** like `getSnapshotItemsFromGroup(groupKey)`
4. **Update all assertions** for new label formats and section names

### Test Migration Checklist

- [ ] Search for constructor instantiations in all test files
- [ ] Update mock objects with new required properties
- [ ] Verify group keys match `types.ts` definitions
- [ ] Update label/description expectations for new formats

### Performance Patterns (Activation)

**CRITICAL:** VS Code extension activation budget is **500ms**. Exceeding this degrades UX.

**Fire-and-Forget IPC Pattern:**
```typescript
// ❌ WRONG - Awaiting serializes IPC calls (100ms each)
async (key, value) => {
  await vscode.commands.executeCommand("setContext", key, value);
}

// ✅ CORRECT - Fire-and-forget for performance
(key, value) => {
  vscode.commands.executeCommand("setContext", key, value);
  return Promise.resolve();
}
```

**Deferred Initialization:**
```typescript
// ⚡ Defer non-critical work after activation
setImmediate(() => {
  protectionService.auditRepo().catch(logger.error);
});
```

**Common Pitfalls:**
- **Duplicate Service Instances**: Search for `new ServiceName(` across `extension.ts` and `phase*-*.ts` files
- **Blocking IPC**: Never `await` setContext during activation (100ms per call)
- **Synchronous FS Ops**: Use async file operations or defer to background
- **Missing Budget Validation**: Profile activation and measure against 500ms budget

**Debug Unaccounted Time:**
```typescript
// Add timing around unmeasured sections
const gapStart = Date.now();
// ... code between phases ...
logger.debug(`[PERF] Gap time: ${Date.now() - gapStart}ms`);
```

---

## Commit Organization

When completing multi-phase tasks, organize commits by logical grouping:

| Order | Type | Prefix | Example |
|-------|------|--------|--------|
| 1 | Implementation | `feat:` | Core feature changes |
| 2 | Tests | `test:` | Test updates for new behavior |
| 3 | Infrastructure | `chore:` | Config, tooling, deps |
| 4 | Documentation | `docs:` | README, guides |

**Process:**
1. Run `git status --short` to see all changes
2. Group related files by purpose
3. Stage and commit each group with descriptive message
4. Verify clean working directory before finishing

### Performance Regression Commits

**Required sections:**
```
perf(scope): brief description

Root Cause Analysis:
- [Explain what caused the regression]
- [Use sequential thinking breakdown]

Performance Impact:
- Before fixes: [timing]ms ([over budget by X]ms)
- Expected after: [timing]ms ([under budget by X]ms)
- Removes: ~[timing]ms of [specific overhead]

Validation:
- [Profiling method]
- [Test results]
- [Performance budget reference]
```

**Example:**
```
perf(vscode): fix 83% activation regression from async setContext

Root Cause Analysis:
- Async setContext added 100ms IPC latency per call
- ContextManager calls setContext 3× serially = 300ms
- Total overhead: 900-1000ms matches +1072ms regression

Performance Impact:
- Before fixes: 2362ms (1862ms over 500ms budget)
- Expected after: ~1000ms (2× under budget)

Validation:
- Sequential timing analysis
- TypeScript compilation: Pass
```

---

## Workflow Routing

### Standard Development Flow

```
TRIAGE (classify) → RESEARCH (investigate) → PLANNING (design) → DEV_COMPLETE (implement) → [optional: REFACTOR, TEST]
```

### Quick Paths

**Bug Fix (known cause):**
```
1_triage.md → 4_dev_complete.md
```

**Bug Fix (unknown cause):**
```
1_triage.md → 2_research.md → 4_dev_complete.md
```

**New Feature:**
```
2_research.md → 3_planning.md → 4_dev_complete.md
```

**Refactoring:**
```
5_refactor.md (includes its own TDD subset)
```

**Pure Testing:**
```
6_test.md
```

**Hotfix (P0):**
```
7_hotfix.md (compressed TDD, schedule full workflow post-deploy)
```

**Doc Cleanup:**
```
8_doc_hygiene.md
```

**Performance Regression:**
```
2_research.md (profile/measure) → Sequential Thinking Analysis → 4_dev_complete.md (fix + validate)
```

**Key steps:**
1. Profile/measure to establish baseline and regression magnitude
2. Use sequential thinking to trace execution flow and timing gaps
3. Identify architectural issues (duplicate instances, blocking IPC, etc.)
4. Validate fixes against performance budget (500ms for activation)
5. Commit with before/after measurements

---

## Workflow Files

| # | File | Purpose | When to Use |
|---|------|---------|-------------|
| 1 | `workflows/1_triage.md` | Issue assessment, classification, severity | First step for bugs/issues |
| 2 | `workflows/2_research.md` | Investigation, root cause, prior art | Unknown problems, new features |
| 3 | `workflows/3_planning.md` | Architecture audit, design decisions | Before implementation |
| 4 | `workflows/4_dev_complete.md` | **CANONICAL TDD** - RED/GREEN/REFACTOR | Implementation phase |
| 5 | `workflows/5_refactor.md` | Code quality, consolidation | Tech debt, cleanup |
| 6 | `workflows/6_test.md` | Coverage gaps, edge cases | Test-only tasks |
| 7 | `workflows/7_hotfix.md` | Emergency production fixes | P0 incidents only |
| 8 | `workflows/8_doc_hygiene.md` | Doc cleanup, staleness removal | Periodic or triggered |

---

## Auto-Configuration

Based on detection, I generate:

```json
{
  "task": "[YOUR_DESCRIPTION]",
  "taskType": "BUG_FIX | NEW_FEATURE | REFACTORING | TESTING | DOC_HYGIENE | HOTFIX",
  "context": "apps/vscode | apps/api | apps/web | multi-context",
  "priority": "P0 | P1 | P2 | P3 | P4",
  "workflow": ["1_triage.md", "4_dev_complete.md"],
  "learningsApplied": ["L001", "L003"]
}
```

---

## Learning Integration

After task completion, record learnings:

```bash
./ai_dev_utils/scripts/learn.sh "pattern" "trigger phrase" "recommended action" "source"
```

**Example:**
```bash
./ai_dev_utils/scripts/learn.sh "pitfall" "inline db query" "use service layer instead" "task-4-1-a"
```

Learnings are stored in `feedback/learnings.jsonl` and applied to future routing.

---

## Stale Doc Check

Before loading any referenced doc, verify freshness:

```yaml
# Check doc header for:
last_verified: 2025-12-16  # If > 30 days old, warn
status: active             # If "stale" or "archived", skip
```

**If stale doc detected:** Route to `8_doc_hygiene.md` first.

---

## State Management

Current task state stored in: `state/current-task.json`

```json
{
  "task": "Description",
  "taskType": "BUG_FIX",
  "workflow": "4_dev_complete.md",
  "phase": "RED",
  "startedAt": "2025-12-16T10:00:00Z"
}
```

---

## Quick Commands

```bash
# Start new task
./ai_dev_utils/scripts/start.sh "Task description"

# Run phase gate
./ai_dev_utils/scripts/gate.sh [phase]

# Record learning
./ai_dev_utils/scripts/learn.sh [type] [trigger] [action] [source]

# Check current state
cat ai_dev_utils/state/current-task.json | jq
```

---

**Last Verified:** 2025-12-17
**Status:** active
