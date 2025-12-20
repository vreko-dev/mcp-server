# Task Router

**Purpose:** Intelligent task classification and workflow routing with self-learning
**Entry Point:** Load this file to start any development task
**Philosophy:** Architecture-aware, research-first, validation-gated development
**Key Insight:** LLMs are pattern matchers. Feed them your patterns, and they'll match them.

---

## ⚠️ MANDATORY: Use MCP Tools

**DO NOT use grep/cat to search patterns or violations.**
**ALWAYS use the MCP tools below - they are available and connected.**

### Before ANY Implementation
```typescript
// REQUIRED: Call this first
codebase.get_context({ 
  task: "your task description", 
  keywords: ["relevant", "keywords"],
  files: ["files/you/will/modify.ts"]
})
```

### Before Committing
```typescript
codebase.check_patterns({ 
  code: "your new code", 
  filePath: "path/to/file.ts" 
})
```

### After Making Mistakes
```typescript
codebase.report_violation({
  type: "violation-type",
  file: "path/to/file.ts",
  whatHappened: "description",
  whyItHappened: "reflection",
  prevention: "how to prevent"
})
```

### Other Available Tools
- `codebase.query_learnings({ keywords: [...] })` - Search past learnings
- `codebase.get_violations_summary({})` - See violation stats
- `codebase.record_learning({ type, trigger, action, source })` - Capture new learnings

---

## Quick Start

```
Say: "Route: [YOUR TASK DESCRIPTION]"
Example: "Route: Fix the sign-in button not working in VS Code extension"
```

**Before implementing ANY feature:**
1. **CALL `codebase.get_context()`** - Query the knowledge layer
2. Review returned patterns and constraints
3. Validate your approach against anti-patterns

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SELF-LEARNING PAIR PROGRAMMER SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         KNOWLEDGE LAYER                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ ARCHITECTURE │  │   PATTERNS   │  │ CONSTRAINTS  │               │   │
│  │  │   (static)   │  │  (learned)   │  │   (rules)    │               │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │   │
│  │         │                 │                 │                        │   │
│  │         └─────────────────┼─────────────────┘                        │   │
│  │                           ▼                                          │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    CONTEXT ASSEMBLER                            │ │   │
│  │  │  Query-based loading: Only fetch what's relevant to task       │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │                      FEEDBACK LOOP ENGINE                            │   │
│  │                                                                      │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│  │  │  PRE-COMMIT │    │   RUNTIME   │    │  VIOLATION  │              │   │
│  │  │    HOOKS    │───▶│  MONITORS   │───▶│   LEARNER   │              │   │
│  │  └─────────────┘    └─────────────┘    └──────┬──────┘              │   │
│  │                                               │                      │   │
│  │                                               ▼                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                   PATTERN PROMOTER                              │ │   │
│  │  │  1x seen → Store in violations.jsonl                           │ │   │
│  │  │  3x seen → Promote to patterns/codebase-patterns.md            │ │   │
│  │  │  5x seen → Add automated detection rule                        │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         TASK ROUTER                                  │   │
│  │  Classifies tasks → Routes to workflows → Gates completion          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pre-Routing: Multi-Phase Checks

### 1. Knowledge Layer Query
**BEFORE classifying the task**, query relevant context:

```bash
# Check learned patterns
grep -i "[KEYWORD]" ai_dev_utils/patterns/codebase-patterns.md

# Check anti-patterns to avoid
grep -i "[KEYWORD]" ai_dev_utils/patterns/violations.jsonl

# Check historical learnings
grep -i "[KEYWORD]" ai_dev_utils/feedback/learnings.jsonl
```

**If match found:** Surface pattern/anti-pattern BEFORE proceeding.

### 2. Architecture Context Check
Before implementing, consider:
- **Full deployment topology** (local, Docker, Fly.io, Vercel)
- **Cross-service consistency** (ports, env vars, package dependencies)
- **Existing patterns** (don't reinvent, consolidate)
- **Layer boundaries** (what can access what)

### 3. Existence Validation
**CRITICAL:** Verify all referenced entities exist before proceeding:
```bash
# Check package exists before referencing
ls packages/[PACKAGE_NAME]/package.json

# Check file exists before importing
test -f [FILE_PATH] && echo "exists" || echo "MISSING"
```

**Common pitfalls:**
- Referencing `packages/guardian-lite` that doesn't exist
- Importing from files that were deleted/moved
- Using outdated package names in Dockerfiles

### 4. Anti-Pattern Check
Before implementing, review recent violations for this area:
```bash
jq -s 'map(select(.context | contains("[AREA]"))) | sort_by(.timestamp) | reverse | .[0:5]' \
  ai_dev_utils/patterns/violations.jsonl
```

---

## Knowledge Layer Structure

```
ai_dev_utils/
├── # ═════════════════════════════════════════════════════════════
├── # ROUTING & ORCHESTRATION
├── # ═════════════════════════════════════════════════════════════
├── ROUTER.md                      # THIS FILE - Task classification & routing
├── README.md                      # System overview
│
├── # ═════════════════════════════════════════════════════════════
├── # WORKFLOWS (Execution)
├── # ═════════════════════════════════════════════════════════════
├── workflows/
│   ├── 1_triage.md                # Issue assessment, classification
│   ├── 2_research.md              # Investigation, root cause
│   ├── 3_planning.md              # Architecture audit, design
│   ├── 4_dev_complete.md          # CANONICAL TDD - RED/GREEN/REFACTOR
│   ├── 5_refactor.md              # Code quality, consolidation
│   ├── 6_test.md                  # Coverage gaps, edge cases
│   ├── 7_hotfix.md                # Emergency production fixes
│   └── 8_doc_hygiene.md           # Doc cleanup, staleness removal
│
├── # ═════════════════════════════════════════════════════════════
├── # PATTERNS (Learned Knowledge)
├── # ═════════════════════════════════════════════════════════════
├── patterns/
│   ├── codebase-patterns.md       # Promoted patterns (3x+ occurrences)
│   ├── violations.jsonl           # All violations ever recorded
│   └── assertion-examples.md      # Testing assertion patterns
│
├── # ═════════════════════════════════════════════════════════════
├── # FEEDBACK (Learning System)
├── # ═════════════════════════════════════════════════════════════
├── feedback/
│   ├── learnings.jsonl            # Session learnings with triggers
│   ├── COMPLETION_TRACKER.md      # Task completion tracking
│   └── violation-template.md      # Template for reporting violations
│
├── # ═════════════════════════════════════════════════════════════
├── # STATE (Current Context)
├── # ═════════════════════════════════════════════════════════════
├── state/
│   ├── current-task.json          # Active task state
│   └── ...                        # Phase-specific state files
│
├── # ═════════════════════════════════════════════════════════════
├── # SCRIPTS (Automation)
├── # ═════════════════════════════════════════════════════════════
└── scripts/
    ├── start.sh                   # Start new task
    ├── gate.sh                    # Run phase gate
    ├── learn.sh                   # Record learning
    └── tdd-report-violation.sh    # Report and learn from violations
```

---

## MCP Context Tools

**Available via Internal MCP Server** (`ai_dev_utils/mcp/server.ts`)

### Setup

```bash
# Install and start
cd ai_dev_utils/mcp
pnpm install
pnpm start
```

**Cursor Config** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "snapback-internal": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/SnapBack-Site/ai_dev_utils/mcp", "start"]
    }
  }
}
```

### Available Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `codebase.get_context` | Get architectural context for a task | BEFORE starting any implementation |
| `codebase.check_patterns` | Validate code against patterns | BEFORE committing |
| `codebase.report_violation` | Report pattern violation for learning | After mistakes or pre-commit catch |
| `codebase.query_decisions` | Get history behind architectural decisions | When asking "why is it done this way?" |
| `codebase.validate_approach` | Check if planned approach aligns with patterns | BEFORE implementing |
| `codebase.get_anti_patterns` | Get anti-patterns for an area | When implementing in unfamiliar area |

### Tool Usage Examples

**Before implementing:**
```typescript
// Get relevant context
const context = await codebase.get_context({
  task: "Add authentication to MCP server",
  files: ["apps/mcp-server/src/auth.ts"],
  keywords: ["auth", "api-key", "verification"]
});

// Returns:
// - relevantArchitecture: Layer boundaries, auth patterns
// - applicablePatterns: @snapback/auth usage
// - relevantConstraints: Type safety, privacy rules
// - antiPatterns: Common auth mistakes
// - recentViolations: Recent mistakes in this area
// - relatedDecisions: Why we chose this auth approach
```

**Before committing:**
```typescript
const validation = await codebase.check_patterns({
  code: myNewCode,
  filePath: "apps/mcp-server/src/auth.ts"
});

if (!validation.valid) {
  // Fix violations before committing
  console.log(validation.violations);
}
```

---

## @snapback/intelligence Package

**Unified intelligence layer** extracted from `ai_dev_utils/mcp/` for reuse across products.

### Import Paths

```typescript
// Main facade - use for most cases
import { Intelligence } from "@snapback/intelligence";

// Subpath imports for specific modules
import { ValidationPipeline } from "@snapback/intelligence/validation";
import { LearningEngine, ViolationTracker } from "@snapback/intelligence/learning";
import { ContextEngine, SemanticRetriever } from "@snapback/intelligence/context";
import { JsonlStore, ConfigStore } from "@snapback/intelligence/storage";
```

### Configuration

```typescript
const intel = await Intelligence.create({
  rootDir: "/path/to/project",           // Workspace root
  patternsDir: "ai_dev_utils/patterns",  // Relative to rootDir
  feedbackDir: "ai_dev_utils/feedback",  // Relative to rootDir
  constraintsPath: "ai_dev_utils/CONSTRAINTS.md",
});
```

### Core APIs

| Method | Description |
|--------|-------------|
| `intel.validate(code, filePath)` | Run 7-layer validation pipeline |
| `intel.getContext(task, keywords)` | Assemble relevant context for a task |
| `intel.reportViolation(input)` | Track violation with auto-promotion |
| `intel.recordLearning(input)` | Capture learning for future retrieval |
| `intel.queryLearnings(keywords)` | Search past learnings |
| `intel.getViolationsSummary()` | Get violation stats and promotion status |

### 7-Layer Validation Pipeline

| Layer | Checks |
|-------|--------|
| `syntax` | Bracket matching, semicolons |
| `types` | `any` usage, @ts-ignore, non-null assertions |
| `tests` | Vague assertions (C-003), 4-path coverage (C-004) |
| `architecture` | Layer boundaries (C-001), service bypass (C-002) |
| `security` | Hardcoded secrets, eval(), privacy (C-006) |
| `dependencies` | Deprecated packages |
| `performance` | console.log (C-007), sync I/O, await in loops |

### Violation Auto-Promotion

- **1x**: Stored in `violations.jsonl`
- **3x**: Auto-promoted to `codebase-patterns.md`
- **5x**: Marked for automated detection

---

## Task Classification Matrix

| Signal Words | Task Type | Workflow | Priority |
|--------------|-----------|----------|---------||
| "fix", "broken", "bug", "error", "crash", "not working" | BUG_FIX | `1_triage.md` → `4_dev_complete.md` | P1-P2 |
| "still broken after fix", "sometimes works", "inconsistent behavior" | MULTI_PATH_BUG | Map code paths → Fix each → Validate all | P1 |
| "slow", "regression", "performance", "timing", "activation time", "unaccounted time", "budget exceeded" | PERFORMANCE_REGRESSION | `2_research.md` (profile) → Sequential Thinking → `4_dev_complete.md` | P0-P1 |
| "add", "implement", "create", "new feature", "build" | NEW_FEATURE | `2_research.md` → `3_planning.md` → `4_dev_complete.md` | P2-P3 |
| "refactor", "clean up", "consolidate", "extract", "dedupe" | REFACTORING | `5_refactor.md` | P3-P4 |
| "docker", "dockerfile", "deploy", "infrastructure", "fly.io", "vercel", "ci/cd" | INFRASTRUCTURE | **Web Research** → Validation → `4_dev_complete.md` | P2 |
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
| "UI not updating", "visual feedback missing", "operation succeeds but nothing changes" | Event-driven architecture | Check event emission → listeners → state sync |
| "TreeView", "TreeDataProvider", "sidebar" | `apps/vscode/` | See VS Code Extension Patterns below |
| "API", "endpoint", "backend", "database", "service" | `apps/api/` | Use service layer, no inline DB queries |
| "web", "dashboard", "component", "React", "Next.js" | `apps/web/` | Business logic in hooks, not components |
| "MCP", "server", "tool" | `apps/mcp-server/` | Follow MCP protocol patterns |
| Multiple contexts | Full-stack | Start with contracts, then backend, then frontend |

---

## Multi-Path Bug Detection

**CRITICAL:** When user reports "still broken" after initial fix, assume multiple root causes.

### Recognition Patterns

**Symptoms:**
- User says "still broken", "nothing changed", "issue persists" after your fix
- Same symptom appears in different user flows
- Fix works in one scenario but not others
- Logs show operation succeeds but user sees no effect

### Diagnostic Workflow

1. **Assume Multiple Root Causes** - Same symptom ≠ same bug
2. **Map All Code Paths** - Search for alternate entry points:
   ```bash
   # Find all places that trigger operation
   grep -r "createSnapshot\|setProtectionLevel" apps/vscode/src/
   ```
3. **Validate Each Path** - Test each user flow independently:
   - Path A: Direct API calls → Works? ✓/✗
   - Path B: Config file updates → Works? ✓/✗
   - Path C: CLI commands → Works? ✓/✗
4. **Fix ALL Paths** - Don't mark complete until all validated

### Event-Driven Architecture Debugging

**Use when:**
- Logs show operation succeeded
- No errors thrown
- UI doesn't update (visual feedback missing)

**Diagnostic Checklist:**
1. ✓ Verify operation executes (logs/breakpoints)
2. ✓ Trace event emission (is `eventBus.publish()` called?)
3. ✓ Trace event listeners (are observers registered?)
4. ✓ Check state synchronization (in-memory vs persistent storage)

**Common Root Causes:**
- Component bypasses coordinator (direct manager calls)
- Config file updates don't sync in-memory registry
- Event listeners registered after events fired
- Multiple code paths with inconsistent event emission

**Example from Session:**
```typescript
// Path A: AutoDecisionIntegration → SnapshotManager (MISSING event)
// Fix: Use OperationCoordinator.coordinateSnapshotCreation()

// Path B: .snapbackrc update → File write (MISSING registry sync)
// Fix: Call protectedFileRegistry.updateProtectionLevel() after write
```

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

## Infrastructure & Docker Patterns

**CRITICAL:** Always research best practices BEFORE implementing infrastructure changes.

### Research-First Workflow

```
1. Web search for current best practices (pnpm, turbo, Docker, Fly.io)
2. Explore codebase for existing patterns
3. Validate all referenced packages/files exist
4. Implement with consistency checks
5. Verify with syntax checks (docker buildx --check, compose config)
```

### Docker Best Practices (Monorepo)

**Multi-stage build pattern:**
```dockerfile
# Stage 1: Dependencies (cacheable)
FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Stage 2: Builder
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY packages-oss ./packages-oss
RUN pnpm install --frozen-lockfile
COPY apps/[APP] ./apps/[APP]
RUN pnpm --filter @snapback/[APP] build

# Stage 3: Production
FROM base AS production
COPY --from=builder /app/apps/[APP]/dist ./dist
ENV PORT=8080
CMD ["node", "dist/index.js"]
```

### Port Consistency Matrix

| Service | Local Dev | Docker | Fly.io |
|---------|-----------|--------|--------|
| API | 3001 | 8080 | 8080 |
| MCP | 3002 | 8080 | 8080 |
| Web | 3000 | 3000 | 3000 |

**Rule:** Fly.io always uses PORT=8080. Dockerfiles should use ENV PORT=8080.

### Common Infrastructure Pitfalls

- **Missing packages in Dockerfile:** Verify all `COPY packages/X` exist with `ls packages/X`
- **Port mismatches:** Local ≠ Docker ≠ Fly.io ports cause routing failures
- **Duplicate Docker files:** Audit before creating (21 files → 12 after cleanup)
- **Wrong Dockerfile references:** Fly.io configs must point to correct `apps/*/Dockerfile`
- **pnpm workspace issues:** Use `--frozen-lockfile` in production, `--no-frozen-lockfile` in dev

---

## Async Patterns (Cross-Cutting)

**Fire-and-Forget for Non-Blocking Operations:**
```typescript
// ❌ WRONG - Blocks on network call that doesn't need immediate result
const profile = await auth.getProfile();

// ✅ CORRECT - Fire-and-forget for deferred work
auth.getProfile()
  .then((profile) => gatekeeper.setProfile(profile))
  .catch((e) => logger.error("Profile fetch failed", e));
```

**When to use fire-and-forget:**
- Non-critical network calls (analytics, profile sync)
- Background tasks that don't block user flow
- Initialization that can complete after activation

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
TRIAGE (classify) → RESEARCH (investigate) → PLANNING (design) → DEV_COMPLETE (implement) → USER_VALIDATION → [optional: REFACTOR, TEST]
```

### Verification Gates (ALL Required)

**Don't declare task complete until:**
- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] **Manual testing confirms bug resolved**
- [ ] **User validates fix in their environment**

**Critical Rule:**
```
Compilation Success ≠ Tests Pass ≠ Bug Fixed ≠ User Validated
```

**If user reports "still broken":**
1. Assume partial fix (missed code path) or multi-part bug
2. Re-enter RESEARCH phase
3. Map alternate entry points
4. Apply Multi-Path Bug Detection workflow

### Quick Paths

**Bug Fix (known cause):**
```
1_triage.md → 4_dev_complete.md → USER_VALIDATION
```

**Bug Fix (unknown cause):**
```
1_triage.md → 2_research.md → 4_dev_complete.md → USER_VALIDATION
```

**Multi-Path Bug:**
```
2_research.md (map paths) → 4_dev_complete.md (fix all) → USER_VALIDATION (test each path)
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

**Infrastructure/Docker:**
```
Web Research (best practices) → Existence Validation → 4_dev_complete.md (implement) → Syntax Check
```

**Key steps:**
1. Research current best practices (search web for pnpm/Docker/Fly.io patterns)
2. Explore codebase for existing patterns and duplicates
3. Validate all referenced files/packages exist
4. Implement with cross-environment consistency (ports, env vars)
5. Verify with `docker buildx --check` and `docker-compose config`

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

## User Feedback Clarification

**When user reports "still broken" or "nothing changed":**

### Ask for Specifics

**Template Questions:**
1. What **SPECIFIC UI element/behavior** isn't working?
   - (e.g., "file icon badge", "status bar counter", "tree view")
2. What do you **expect to see**?
3. Can you provide **logs** showing the operation?
4. Have you **reloaded/restarted** the extension?

### Clarification Patterns

| Vague Report | Clarifying Question | Example Response |
|--------------|---------------------|------------------|
| "Nothing changes" | "Which UI element isn't updating?" | "File explorer icon badge" |
| "Still broken" | "Can you show logs of the operation?" | "Added protection rule to .snapbackrc: file.log (block)" |
| "Doesn't work" | "What specific action are you taking?" | "Right-click → Set Protection Level → Block" |

**Example from Session:**
```
User: "still.. nothing changes when I change a file"
Me: (Initially thought: "Need to reload VS Code window")

User clarified: "protection levels on the file... no change in file explorer"
Me: (Corrected: "Decoration provider not receiving events")

Root cause: .snapbackrc path missing registry sync
```

---

## Auto-Configuration

Based on detection, I generate:

```json
{
  "task": "[YOUR_DESCRIPTION]",
  "taskType": "BUG_FIX | MULTI_PATH_BUG | NEW_FEATURE | REFACTORING | TESTING | DOC_HYGIENE | HOTFIX",
  "context": "apps/vscode | apps/api | apps/web | multi-context",
  "priority": "P0 | P1 | P2 | P3 | P4",
  "workflow": ["1_triage.md", "4_dev_complete.md"],
  "learningsApplied": ["L001", "L003"]
}
```

---

## Learning Integration

### How the System Gets Smarter

```
Week 1: Bootstrap
├── You write initial patterns, constraints, architecture docs
├── patterns/violations.jsonl starts empty
└── feedback/learnings.jsonl captures session insights

Week 2: First Violations
├── LLM makes mistakes, pre-commit or review catches them
├── Violations get recorded with reflection (why it happened)
├── patterns/violations.jsonl grows
└── "Recently Learned" section populates

Week 4: First Promotions
├── Pattern seen 3x → promoted to patterns/codebase-patterns.md
├── Detection hints added to pattern entry
├── LLM starts seeing these in context queries
└── Same mistakes decrease in frequency

Week 8: Automation
├── Pattern seen 5x → automated detection rule added
├── Pre-commit hooks catch violations automatically
├── No manual intervention needed for common issues
└── LLM error rate drops significantly

Month 3+: Self-Sustaining
├── System catches most violations automatically
├── New edge cases get captured and learned
├── Documentation stays current via violation feedback
└── Onboarding new devs/LLMs is instant
```

### Pattern Promotion Thresholds

| Threshold | Action | Storage Location |
|-----------|--------|------------------|
| 1x seen | Store in violations log | `patterns/violations.jsonl` |
| 3x seen | Promote to codebase patterns | `patterns/codebase-patterns.md` |
| 5x seen | Add automated detection rule | Pre-commit hook + CI check |

### Reporting Violations

After any mistake or pattern violation:

```bash
./ai_dev_utils/scripts/tdd-report-violation.sh
```

**Or manually record:**
```bash
cat >> ai_dev_utils/patterns/violations.jsonl << 'EOF'
{
  "id": "V-XXX",
  "type": "layer-boundary-violation",
  "file": "apps/vscode/src/snapshot.ts",
  "context": "apps/vscode",
  "whatHappened": "Imported @snapback/infrastructure directly in extension",
  "whyItHappened": "LLM doesn't understand layer boundaries",
  "prevention": "Use @snapback/core for extension code, not infrastructure",
  "timestamp": "2025-12-19T10:00:00Z",
  "count": 1
}
EOF
```

### Violation Schema

```json
{
  "id": "V-XXX",
  "type": "layer-boundary-violation | missing-error-handling | wrong-import-pattern | performance-budget-exceeded | type-safety-bypass",
  "file": "path/to/file.ts",
  "context": "apps/vscode | apps/api | apps/web | packages/*",
  "whatHappened": "Description of the violation",
  "whyItHappened": "Root cause analysis (reflection)",
  "prevention": "What would have prevented this",
  "wrongExample": "// optional: code that was wrong",
  "correctExample": "// optional: code that is correct",
  "detectionRule": "// optional: regex or lint rule to detect",
  "timestamp": "ISO timestamp",
  "count": 1,
  "promotedAt": null,
  "automatedAt": null
}
```

### Recording Session Learnings

```bash
./ai_dev_utils/scripts/learn.sh "pattern" "trigger phrase" "recommended action" "source"
```

**Example:**
```bash
./ai_dev_utils/scripts/learn.sh "pitfall" "inline db query" "use service layer instead" "task-4-1-a"
```

### Knowledge Graph Format

Learnings are stored in `feedback/learnings.jsonl` with queryable structure:

```json
{
  "id": "L042",
  "type": "pitfall|pattern|architecture|performance",
  "trigger": ["docker", "dockerfile", "missing package"],
  "context": "apps/api|apps/mcp-server|infrastructure",
  "problem": "Dockerfile references non-existent package",
  "solution": "Always validate package exists: ls packages/[NAME]/package.json",
  "related": ["L041", "L039"],
  "source": "session-2025-12-19",
  "timestamp": "2025-12-19T16:00:00Z"
}
```

### Query Patterns

```bash
# Find all Docker-related learnings
jq 'select(.trigger | contains(["docker"]))' feedback/learnings.jsonl

# Find pitfalls for specific context
jq 'select(.type == "pitfall" and .context == "apps/api")' feedback/learnings.jsonl

# Find violations by type
jq -s 'map(select(.type == "layer-boundary-violation"))' patterns/violations.jsonl

# Find promoted patterns (count >= 3)
jq -s 'map(select(.count >= 3))' patterns/violations.jsonl
```

### Session Learning Capture

At end of each session, capture learnings with:
1. **Trigger patterns** — What signals would surface this learning?
2. **Context scope** — Which parts of codebase does this apply to?
3. **Related learnings** — Link to existing knowledge graph nodes

---

## Anti-Patterns Document Format

When violations are promoted (3x+), they're formatted in `patterns/codebase-patterns.md`:

```markdown
### AP-001: Direct Database Access in Extension
**Frequency:** 7 occurrences
**First Seen:** 2024-11-12
**Root Cause:** LLM doesn't understand layer boundaries

❌ **Wrong:**
```typescript
// apps/vscode/src/snapshot.ts
import { db } from '@snapback/infrastructure'; // WRONG: Extension can't access DB
```

✅ **Correct:**
```typescript
// apps/vscode/src/snapshot.ts
import { createSnapshot } from '@snapback/core'; // Uses local storage
```

**Detection Rule:** Any import of `@snapback/infrastructure` in `apps/vscode/`
```

### Common Anti-Pattern Types

| Type | Description | Detection Method |
|------|-------------|------------------|
| `layer-boundary-violation` | Importing across forbidden boundaries | Import path checks |
| `missing-error-handling` | No loading/error states for async | React component analysis |
| `wrong-import-pattern` | Relative imports across packages | Import path regex |
| `performance-budget-exceeded` | Blocking operations in hot paths | Timing profiler |
| `type-safety-bypass` | Using `any`, unvalidated assertions | TypeScript strict mode |

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

## Session Learnings (2025-12-19)

**Captured from Docker/Infrastructure cleanup session:**

| ID | Type | Trigger | Solution |
|----|------|---------|----------|
| L040 | pitfall | `guardian-lite`, missing package | Validate package exists before referencing in Dockerfile |
| L041 | pattern | Docker, monorepo, pnpm | Research best practices before implementing infrastructure |
| L042 | architecture | port, fly.io, docker | Use PORT=8080 for Fly.io, maintain consistency matrix |
| L043 | pattern | duplicate files, cleanup | Audit for duplicates before creating new files |
| L044 | performance | blocking await, network | Use fire-and-forget for non-critical async calls |

**Captured from UI Refresh Bug session:**

| ID | Type | Trigger | Solution |
|----|------|---------|----------|
| L045 | pitfall | "still broken", partial fix | Don't declare success until user validates; assume multi-path bug |
| L046 | pattern | UI not updating, event-driven | Map event flow: operation → emission → listeners → state sync |
| L047 | architecture | code path analysis | Search for ALL entry points to operation, validate each independently |
| L048 | pattern | user feedback, vague reports | Ask for specific UI element, logs, expected behavior, restart status |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| LLM error rate | -50% in 30 days | violations.jsonl frequency |
| Time to onboard new LLM | <1 hour | Time to first correct implementation |
| Repeat violations | <2 before promotion | Auto-tracked in violations.jsonl |
| Context relevance | >80% useful | Manual review of context queries |
| Promotion rate | 3-5 patterns/month | Track promotedAt timestamps |

---

## Summary: What This System Provides

1. **Instant Context** — LLMs understand your codebase without reading everything
2. **Continuous Learning** — Every mistake makes the system smarter
3. **Graduated Enforcement** — Soft guidance → hard gates as patterns stabilize
4. **Token Efficiency** — Query-based loading, not front-loaded prompts
5. **Integration Ready** — Works with any LLM through MCP or prompts

---

**Last Verified:** 2025-12-19
**Status:** active
**Philosophy:** Research-first, validation-gated, architecture-aware, self-learning development
