# SnapBack LLM Optimization: Implementation Phase

**For**: LLM coding agent
**Prerequisite**: Complete `snapback-audit-prompt.md` first
**Goal**: Transform SnapBack from pull-based multi-tool system to push-based minimal-tool system optimized for LLM token efficiency.

**Hard Constraints**:
- Maximum **4 tool calls** per session (current: 6-10)
- Maximum **~500 tokens** per session (current: ~2,000)
- **100% local-first** — all data on user's machine
- **Zero network required** for core functionality

---

## Architecture: Local-First, Core-Owned

### Confirmed Architecture Pattern

Based on industry best practices (Turborepo monorepo patterns, VS Code extension guidelines, embedded DB recommendations):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOCAL-FIRST, CORE-OWNED ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   packages/core/                    ◄── THE BRAIN (shared logic)        │
│   ├── db/                                                               │
│   │   ├── schema.ts                 # Learning schema, types            │
│   │   ├── learning-store.ts         # CRUD, FTS, retrieval              │
│   │   └── retrieval.ts              # Bloom filter, LRU cache           │
│   ├── git/                                                              │
│   │   └── status.ts                 # Unified git operations            │
│   ├── analysis/                                                         │
│   │   └── risk.ts                   # Risk assessment (extracted)       │
│   └── index.ts                      # Exports all classes               │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│   packages/cli/                     ◄── OWNS THE DATABASE               │
│   ├── daemon/                       # Background process                │
│   │   ├── index.ts                  # Daemon lifecycle                  │
│   │   ├── context-writer.ts         # Writes .snapback/ctx              │
│   │   └── event-handlers.ts         # File save, git, validation        │
│   └── services/                                                         │
│       └── learning-service.ts       # new LearningStore(DB_PATH)        │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│   apps/extension/                   ◄── THIN CLIENT (no DB)             │
│   └── services/                                                         │
│       └── snapback-client.ts        # Reads .ctx, calls CLI sparingly   │
│                                                                         │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│   apps/mcp-server/                  ◄── THIN CLIENT (stateless)         │
│   └── tools/                        # 4 tools only                      │
│       ├── snap.ts                   # Start/Check/Context               │
│       ├── snap-end.ts               # Complete + survey                 │
│       ├── snap-fix.ts               # Restore from snapshot             │
│       └── snap-help.ts              # Discovery                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Locations (Local-First)

```
~/.snapback/                          # GLOBAL (cross-workspace)
├── learnings.db                      # SQLite FTS5 or LanceDB
├── learnings.lance/                  # If using LanceDB
├── config.json                       # User preferences
├── cache/                            # LRU cache, bloom filter
└── analytics/                        # Local-only usage stats

<workspace>/.snapback/                # WORKSPACE-SPECIFIC
├── ctx                               # Push context file (daemon writes)
├── snapshots/                        # Content-addressable blobs
├── session.json                      # Current session state
└── violations.json                   # Tracked violations
```

### Database Decision

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **SQLite FTS5** | Simple, proven, no native deps if using sql.js | No vector search | ✅ For MVP |
| **LanceDB** | "SQLite for AI", native vectors, Rust perf | Newer, native deps | ✅ For future |
| **ChromaDB** | Popular, easy API | Heavier, Python-native | ❌ Skip |

**Recommendation**: Start with **SQLite FTS5** in `packages/core`, design schema to allow LanceDB migration later.

---

## Stress Test Results (December 2025)

### Overall Score: 62/100

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SNAPBACK STRESS TEST RESULTS                        │
├────────────────────────────────────────────────────────────────────────┤
│  ✅ WORKS WELL:                                                        │
│     • Protection layer (snapshots, validation) - 100% reliable         │
│     • 7-layer pattern checking (100% anti-pattern detection)           │
│     • Scale performance (handles 51K files, 858K lines)                │
│     • Compact mode (88% token reduction when enabled)                  │
│                                                                        │
│  ❌ CRITICAL BUGS:                                                     │
│     • Learning retrieval BROKEN (returns wrong learnings)              │
│     • 24 tools when 7 would suffice (71% reduction possible)           │
│     • Verbose by default (compact should be default)                   │
│                                                                        │
│  📊 KEY METRICS:                                                       │
│     • Tools: 24 found, 13 with high overlap                            │
│     • Tokens: 50% waste (8-12K current → 4-6K optimized)               │
│     • Learnings: 214 stored, 0% domain-specific retrieved              │
│     • Pitfalls caught: 100% (console.log, layer violations, etc.)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Qualitative Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Context quality | 18/25 | Good constraints, but learnings broken |
| Tool efficiency | 12/25 | Too many overlapping tools |
| Learning value | 8/25 | **CRITICAL BUG** - retrieval broken |
| Protection value | 24/25 | Excellent - snapshots, validation work great |

### Scale Testing Results

| Scale | Files | Lines | Response Time | Verdict |
|-------|-------|-------|---------------|---------|
| Small | 1 | ~50 | Instant | ✅ Appropriate |
| Medium | ~48 | ~5K | Instant | ✅ Appropriate |
| Large | ~500 | ~50K | Instant | ✅ Scales well |
| XL | 51,543 | 858,500 | Instant | ✅ Scales well |

**Key observation**: SnapBack scales well because tiered learning retrieval doesn't load all learnings. But the *wrong* learnings are being loaded.

---

## Phase 1 Audit Findings (Critical)

### Discovery: 97% Token Waste in Learning Retrieval

The audit revealed a **critical inefficiency** in `begin-task.ts`:

```typescript
// begin-task.ts:537 - THE BUG
const learningsPath = join(workspaceRoot, ".snapback", "learnings", "learnings.jsonl");
// Only loads ONE file, ignoring 11 curated domain files!
```

**Ignored domain files** (80+ curated patterns):
- `architecture-patterns.jsonl` (18 core constraints)
- `domain-vscode.jsonl` (7 VS Code patterns)
- `domain-testing.jsonl` (8 testing patterns)
- `anti-patterns.jsonl`
- `workflow-patterns.jsonl`
- `domain-intelligence.jsonl`
- etc.

**Impact**:
```
Tokens loaded: ~20,000 (199 entries × 100 tokens)
Tokens used:   ~500 (2-5 learnings returned)
Efficiency:    2.5% ← CRITICAL WASTE
```

### Discovery: 30% Stale Learnings

~60 learnings reference outdated information:
- Line numbers that shifted
- Files renamed/moved
- Migrations completed
- Near-duplicates (#14-15, #21-32)

### Discovery: Intent Mapping Already Exists

`INTENT_CONTEXT_CONFIG` partially exists but isn't wired to learning files:

```typescript
// This mapping exists but isn't used for learnings!
implement → architecture-patterns.jsonl
debug → domain-testing.jsonl, anti-patterns.jsonl
refactor → workflow-patterns.jsonl
```

**This is a quick win**: Wire existing domain files to intent detection.

### CONFIRMED BY STRESS TEST: Learning Retrieval Bug

The stress test validated this with concrete evidence:

```yaml
# Three DIFFERENT keyword searches returned THE SAME 5 learnings:

test_1:
  keywords: ["vitest", "mock", "hoisting"]
  expected: "Vitest mocking patterns"
  actual: "Generic architecture learnings"
  precision: 0%

test_2:
  keywords: ["vscode", "extension", "activation"]
  expected: "VSCode activation patterns"
  actual: "Generic architecture learnings"
  precision: 20%

test_3:
  keywords: ["error", "catch", "silent"]
  expected: "Error handling patterns"
  actual: "Generic architecture learnings"
  precision: 0%
```

**Root cause confirmed**: `get_learnings` searches only the hot tier, ignoring:
- `domain-testing.jsonl` (8 entries with exact "vitest config" matches)
- `domain-vscode.jsonl` (7 entries)
- `domain-web.jsonl` (6 entries)
- etc.

**Fix required in**: `packages/mcp/src/facades/handlers.ts` or the learning retrieval logic

---

## Tool Consolidation (Stress Test Validated)

### Complete Tool Inventory (24 Tools Found)

| # | Tool | Category | Value | Overlap |
|---|------|----------|-------|---------|
| 1 | begin_task | Entry | HIGH | get_context, prepare_workspace, get_learnings |
| 2 | get_context | Entry | MEDIUM | begin_task |
| 3 | prepare_workspace | Entry | LOW | begin_task |
| 4 | snapshot_create | Protection | HIGH | - |
| 5 | snapshot_list | Protection | HIGH | - |
| 6 | snapshot_restore | Protection | HIGH | - |
| 7 | suggest_snapshot | Protection | LOW | prepare_workspace |
| 8 | compare_snapshots | Protection | MEDIUM | - |
| 9 | acknowledge_risk | Protection | LOW | rarely used |
| 10 | check_patterns | Validation | HIGH | validate, quick_check |
| 11 | validate | Validation | LOW | check_patterns |
| 12 | quick_check | Validation | HIGH | check_patterns |
| 13 | learn | Knowledge | HIGH | - |
| 14 | get_learnings | Knowledge | HIGH | begin_task |
| 15 | report_violation | Knowledge | MEDIUM | - |
| 16 | lookup_exports | Discovery | MEDIUM | niche |
| 17 | analyze | Discovery | LOW | check_patterns |
| 18 | complete_task | Lifecycle | HIGH | review_work |
| 19 | review_work | Lifecycle | MEDIUM | what_changed, complete_task |
| 20 | what_changed | Lifecycle | HIGH | review_work |
| 21 | session | Session | LOW | internal |
| 22 | context | Session | LOW | internal |
| 23 | cleanup | Maintenance | LOW | rare use |
| 24 | meta | Maintenance | LOW | discovery only |

### Overlap Matrix (From Stress Test)

```
OVERLAP MATRIX (L=Low, M=Medium, H=High, H++=Merge candidate)

              │begin│get_ │prep_│quick│check│valid│what_│revw_│compl│
              │task │cntx │work │chck │patn │ate  │chng │work │task │
──────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
begin_task    │  -  │ H++ │ H++ │  L  │  L  │  L  │  M  │  M  │  L  │
get_context   │ H++ │  -  │ H++ │  L  │  L  │  L  │  L  │  L  │  L  │
prepare_wksp  │ H++ │ H++ │  -  │  L  │  L  │  L  │  L  │  L  │  L  │
quick_check   │  L  │  L  │  L  │  -  │ H++ │ H++ │  L  │  M  │  L  │
check_patterns│  L  │  L  │  L  │ H++ │  -  │ H++ │  L  │  M  │  L  │
validate      │  L  │  L  │  L  │ H++ │ H++ │  -  │  L  │  M  │  L  │
what_changed  │  M  │  L  │  L  │  L  │  L  │  L  │  -  │ H++ │  M  │
review_work   │  M  │  L  │  L  │  M  │  M  │  M  │ H++ │  -  │  H  │
complete_task │  L  │  L  │  L  │  L  │  L  │  L  │  M  │  H  │  -  │
```

### High-Overlap Clusters (Must Merge)

```
Cluster 1: Entry Points → "snap"
├── begin_task ────┐
├── get_context ───┼── ALL provide context + learnings
├── prepare_workspace ─┤
└── get_learnings ─┘

Cluster 2: Validation → "check"
├── check_patterns ──┐
├── validate ────────┼── ALL validate code
└── quick_check ─────┘

Cluster 3: Progress Tracking → "snap.end"
├── what_changed ──┐
├── review_work ───┼── ALL show changes + completion
└── complete_task ─┘
```

### Validated Consolidation: 24 → 7 Tools

```yaml
PRIMARY_TOOLS (4):
  snap:
    modes: ["start", "context", "learnings", "prepare"]
    replaces: [begin_task, get_context, prepare_workspace, get_learnings]
    usage: 'snap({task:"...", files:[...]})'

  check:
    modes: ["quick", "full", "patterns"]
    replaces: [quick_check, check_patterns, validate]
    usage: 'check({code:"...", mode:"quick"})'

  snap.end:
    modes: ["review", "complete"]
    replaces: [complete_task, review_work, what_changed, learn]
    usage: 'snap.end({outcome:"completed", learnings:[...]})'

  snap.fix:
    modes: ["list", "restore", "diff"]
    replaces: [snapshot_list, snapshot_restore, compare_snapshots]
    usage: 'snap.fix({mode:"list"})'

SECONDARY_TOOLS (2):
  snap.learn:
    purpose: "Capture learnings mid-session"
    replaces: [learn]

  snap.violation:
    purpose: "Report violations for promotion"
    replaces: [report_violation]

DISCOVERY (1):
  snap.?:
    purpose: "Help and discovery"
    replaces: [meta, get_pairing_protocol]

ELIMINATED (7):
  - suggest_snapshot  # merged into snap prepare mode
  - acknowledge_risk  # rarely used, make it a flag
  - analyze           # overlaps check
  - session           # internal only
  - context           # internal only
  - cleanup           # rare, keep as hidden
  - lookup_exports    # niche, keep as hidden

METRICS:
  tools_before: 24
  tools_after: 7
  reduction: 71%
  calls_per_task_before: 6-8
  calls_per_task_after: 3-4
```

---

## Token Efficiency (Stress Test Validated)

### Per-Tool Token Measurements

| Tool | Input | Output | Useful % | Waste Pattern |
|------|-------|--------|----------|---------------|
| meta | ~20 | ~1,500 | 40% | Verbose JSON |
| begin_task (compact) | ~50 | ~150 | **90%** | Excellent |
| begin_task (full) | ~50 | ~1,300 | 50% | Debug info |
| get_context | ~40 | ~800 | 60% | Overlaps begin_task |
| prepare_workspace | ~10 | ~500 | 50% | Overlaps begin_task |
| get_learnings | ~30 | ~600 | 70% | Good |
| snapshot_list | ~10 | ~600 | 80% | Good |
| quick_check | ~30 | ~300 | **85%** | Excellent |
| check_patterns | ~40 | ~800 | 75% | Layer details useful |
| validate | ~30 | ~150 | **90%** | Very compact |
| what_changed | ~10 | ~250 | 80% | Good |
| review_work | ~20 | ~350 | 70% | Overlaps what_changed |
| complete_task | ~20 | ~200 | 80% | Good |

### Critical Finding: Compact Mode = 88% Reduction

```yaml
compact_comparison:
  begin_task_full:
    tokens: ~1,300
    parse_difficulty: "medium"

  begin_task_compact:
    tokens: ~150
    parse_difficulty: "easy"

  reduction: 88%
  information_loss: "minimal"

  RECOMMENDATION: "Default compact=true"
```

### Token Waste Patterns Identified

```yaml
waste_patterns:
  - pattern: "Verbose JSON with deeply nested objects"
    frequency: "every call"
    tokens_wasted: ~200-500 per call
    fix: "Flatten structures, use compact mode by default"

  - pattern: "next_actions array repeated in every response"
    frequency: "every call"
    tokens_wasted: ~50-100 per call
    fix: "Only include when actionable"

  - pattern: "Repeated constraint info across tools"
    frequency: "entry tools"
    tokens_wasted: ~100 per call
    fix: "Cache constraints, show only once per session"

  - pattern: "Full vitals object when only summary needed"
    frequency: "prepare_workspace, suggest_snapshot"
    tokens_wasted: ~150 per call
    fix: "Return vitals_summary by default"
```

---

## Known Issues from Dogfooding

### Issues to Fix (Priority Order)

| Issue | Root Cause | Fix | Priority |
|-------|-----------|-----|----------|
| **`what_changed` missed edits** | Uses git baseline, not session tracking | Add `SessionFileTracker` class | P0 |
| **`review_work` showed 0 files** | Same baseline issue, scope too broad | Default to session-touched files only | P0 |
| **`complete_task` stats were 0** | Not tracking actual edits | Integrate with `SessionFileTracker` | P1 |
| **Verbose `begin_task` output** | Returns everything always | Add `compact` flag, make default | P1 |
| **76KB handlers.ts not flagged** | No code smell detection | Add file size check to `quick_check` | P2 |
| **25+ silent catch blocks** | No eslint rule | Add rule, systematic fix | P2 |
| **No hotspot suggestions** | Missing violation history integration | Surface files with past violations | P3 |

### Dogfooding Friction → Implementation Tasks

```yaml
friction_to_task_mapping:

  - friction: "Verbose begin_task output"
    task: "Implement compact mode"
    implementation: |
      Add `compact: boolean = true` parameter
      Compact output: "task_id|risk|protection|dirty|learning1|learning2"
      Full output: Only when `compact: false`

  - friction: "what_changed missed my edits"
    task: "Session-scoped file tracking"
    implementation: |
      Create SessionFileTracker in packages/cli/src/session/
      Track: file path, access time, modification type
      what_changed reads from tracker, not git baseline

  - friction: "review_work showed 0 files"
    task: "Scoped review"
    implementation: |
      Default scope = session-touched files
      Add `scope: 'session' | 'workspace' | 'all'` parameter

  - friction: "No guidance on WHERE to look"
    task: "Hotspot suggestions"
    implementation: |
      In begin_task, query violations.json for files with past issues
      Surface top 3 "hotspots" in compact output

  - friction: "76KB handlers.ts not flagged"
    task: "Code smell detection"
    implementation: |
      In quick_check, add file size warning (>500 lines)
      Add to patterns: catch {}, console.log, any type
```

---

## Tool Consolidation Specification

### From 12+ Tools to 4 Tools

```
BEFORE (12+ tools, ~6-10 calls/session, ~2000 tokens):
┌─────────────────────────────────────────────────────────────────┐
│ begin_task, get_context, prepare_workspace, get_learnings,     │
│ quick_check, check_patterns, validate, what_changed,           │
│ review_work, complete_task, snapshot_create, snapshot_list,    │
│ snapshot_restore, learn, report_violation, session.*           │
└─────────────────────────────────────────────────────────────────┘

AFTER (4 tools, 2-3 calls/session, ~300 tokens):
┌─────────────────────────────────────────────────────────────────┐
│ snap, snap.end, snap.fix, snap.?                               │
└─────────────────────────────────────────────────────────────────┘
```

### Tool 1: `snap` (Universal Entry Point)

```typescript
// apps/mcp-server/src/tools/snap.ts

export const snapTool = {
  name: "snap",
  description: "Start(s)|Check(c)|Context(x). s:task,files→ctx,learnings. c:→validation. x:→state.",

  inputSchema: {
    type: "object",
    properties: {
      m: {
        type: "string",
        enum: ["s", "c", "x"],
        description: "Mode: s=start, c=check, x=context"
      },
      t: { type: "string", description: "Task description (mode:s)" },
      f: { type: "array", items: { type: "string" }, description: "Files (mode:s)" },
      thorough: { type: "boolean", description: "Full 7-layer validation (mode:c)" },
    },
    required: ["m"],
  },

  async execute(params: SnapParams): Promise<MCPResponse> {
    switch (params.m) {
      case "s": return await handleStart(params);
      case "c": return await handleCheck(params);
      case "x": return await handleContext();
    }
  }
};

// Compact response format (default):
// "S|task_abc|L|98|12|mock→vi.spy|test→vi.reset|auth.ts:3violations"
//  ^  ^       ^  ^  ^  ^          ^             ^
//  |  |       |  |  |  └──────────┴─────────────┴── learnings (top 3)
//  |  |       |  |  └── dirty file count
//  |  |       |  └── protection score
//  |  |       └── risk (L/M/H)
//  |  └── task ID
//  └── Status type
```

### Tool 2: `snap.end` (Complete + Learning Capture)

```typescript
// apps/mcp-server/src/tools/snap-end.ts

export const snapEndTool = {
  name: "snap.end",
  description: "End task. ok:1/0, l:[learnings], survey:{...}. →summary.",

  inputSchema: {
    type: "object",
    properties: {
      ok: { type: "number", enum: [0, 1], description: "Success?" },
      l: { type: "array", items: { type: "string" }, description: "Quick learnings" },
      survey: {
        type: "object",
        description: "Full exit survey (optional)",
        properties: {
          tech: { type: "object" },      // patterns, pitfalls
          eff: { type: "object" },       // wasted_attempts, should_have
          ins: { type: "object" },       // generalizable, applies_to
          fb: { type: "object" },        // snapback feedback
        }
      },
    },
  },

  async execute(params: SnapEndParams): Promise<MCPResponse> {
    const result = await completeTask({
      outcome: params.ok ? 'success' : 'failed',
      learnings: params.l,
      exitSurvey: params.survey ? expandSurvey(params.survey) : undefined,
    });

    // Compact response:
    // "E|OK|3L|2F|45+12-|mock→spy|order→first"
    //  ^  ^  ^  ^  ^     └────────┴────────── learnings captured
    //  |  |  |  |  └── lines changed (+added/-removed)
    //  |  |  |  └── files touched
    //  |  |  └── learnings generated
    //  |  └── status
    //  └── End type
    return formatCompact('E', result);
  }
};
```

### Tool 3: `snap.fix` (Restore)

```typescript
// apps/mcp-server/src/tools/snap-fix.ts

export const snapFixTool = {
  name: "snap.fix",
  description: "List/restore snapshots. No params→list. id:X→restore.",

  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Snapshot ID to restore" },
      dry: { type: "boolean", description: "Preview only" },
    },
  },

  async execute(params: SnapFixParams): Promise<MCPResponse> {
    if (!params.id) {
      // List mode
      const snaps = await listSnapshots({ limit: 5 });
      // "R|5|snap_a:2m:3f|snap_b:1h:5f|snap_c:2h:2f"
      return formatSnapList(snaps);
    }

    // Restore mode
    const result = await restoreSnapshot(params.id, { dryRun: params.dry });
    // "R|OK|3f|auth.ts|api.ts|config.ts"
    return formatRestoreResult(result);
  }
};
```

### Tool 4: `snap.?` (Help/Discovery)

```typescript
// apps/mcp-server/src/tools/snap-help.ts

export const snapHelpTool = {
  name: "snap.?",
  description: "Help. Tools, state, stats.",

  inputSchema: { type: "object", properties: {} },

  async execute(): Promise<MCPResponse> {
    // Minimal help output:
    return {
      content: [{
        type: "text",
        text: `snap m:s|c|x→start/check/ctx
snap.end ok:1 l:["..."]→complete
snap.fix id:X→restore
snap.?→help
state:${await getCompactState()}`
      }]
    };
  }
};
```

---

## Push Architecture Implementation

### Context File System

The daemon maintains `.snapback/ctx` that LLMs read automatically (via Cursor rules, Claude project instructions, etc.):

```typescript
// packages/cli/src/daemon/context-writer.ts

interface CtxFile {
  v: 1;                              // Version
  t: number;                         // Timestamp (unix ms)
  r: 'L' | 'M' | 'H';               // Risk
  p: number;                         // Protection 0-100
  d: number;                         // Dirty count
  l: string[];                       // Learnings (top 3, truncated)
  w: string[];                       // Warnings (top 2)
  h: string[];                       // Hotspots (files with violations)
  e: string[];                       // Recent errors
  c: { b: string; a: string };       // Constraints (bundle, activation)
}

export class ContextWriter {
  private ctxPath: string;

  constructor(workspacePath: string) {
    this.ctxPath = join(workspacePath, '.snapback', 'ctx');
  }

  async write(state: WorkspaceState): Promise<void> {
    const ctx: CtxFile = {
      v: 1,
      t: Date.now(),
      r: state.risk[0].toUpperCase() as 'L' | 'M' | 'H',
      p: state.protectionScore,
      d: state.dirtyFiles.length,
      l: state.learnings.slice(0, 3).map(l => this.compress(l.action, 50)),
      w: state.warnings.slice(0, 2),
      h: state.hotspots.slice(0, 3),
      e: state.recentErrors.slice(0, 3),
      c: {
        b: state.constraints.bundleSize || '2M',
        a: state.constraints.activation || '500ms'
      },
    };

    // Single line, no whitespace, <500 bytes
    await writeFile(this.ctxPath, JSON.stringify(ctx));
  }

  private compress(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  }
}
```

### Event-Driven Updates

```typescript
// packages/cli/src/daemon/event-handlers.ts

export class DaemonEventHandlers {
  constructor(
    private ctx: ContextWriter,
    private tracker: SessionFileTracker,
    private learnings: LearningStore,
  ) {}

  // Called by extension on file save
  async onFileSave(file: string, content: string): Promise<void> {
    // Track the change
    this.tracker.recordChange(file, 'modified');

    // Detect patterns (silent catch, console.log, etc.)
    const warnings = await detectPatterns(content, file);

    // Detect errors from recent terminal
    const errors = await this.captureTerminalErrors();

    // Match errors to learnings
    const hints: string[] = [];
    for (const err of errors) {
      const match = await this.learnings.findByError(err);
      if (match) hints.push(`💡 ${match.action}`);
    }

    // Push update
    await this.ctx.write({
      ...await this.buildState(),
      warnings: [...warnings, ...hints],
      recentErrors: errors,
    });
  }

  // Called on git events
  async onGitChange(): Promise<void> {
    await this.ctx.write(await this.buildState());
  }

  // Called on test/lint completion
  async onValidationComplete(results: ValidationResults): Promise<void> {
    const state = await this.buildState();
    state.recentErrors = results.errors.slice(0, 5);

    // Auto-flag code smells
    for (const file of results.filesChecked) {
      const lines = await countLines(file);
      if (lines > 500) {
        state.warnings.push(`⚠️ ${basename(file)}: ${lines} lines (consider splitting)`);
      }
    }

    await this.ctx.write(state);
  }
}
```

### IDE Integration

**For Cursor** (`.cursorrules`):
```
# SnapBack Context
Read .snapback/ctx on conversation start. JSON format:
r=risk(L/M/H), p=protection%, d=dirty, l=learnings, w=warnings, h=hotspots, e=errors
If w contains items, address warnings first.
If h contains files, those have past violations.
```

**For Claude Projects** (instructions):
```
The file .snapback/ctx contains real-time workspace state updated by the SnapBack daemon.
Format: {"r":"L","p":100,"d":3,"l":["..."],"w":[],"h":[],"e":[],"c":{"b":"2M"}}
Check warnings (w) before starting work. Hotspots (h) have past issues.
```

---

## Session File Tracking (Fixes Dogfooding Issues)

```typescript
// packages/cli/src/session/file-tracker.ts

interface FileAccess {
  path: string;
  firstAccess: number;
  lastAccess: number;
  type: 'read' | 'modified' | 'created' | 'deleted';
  changeCount: number;
}

export class SessionFileTracker {
  private files: Map<string, FileAccess> = new Map();
  private sessionStart: number;

  constructor() {
    this.sessionStart = Date.now();
  }

  recordChange(path: string, type: FileAccess['type']): void {
    const existing = this.files.get(path);
    if (existing) {
      existing.lastAccess = Date.now();
      existing.changeCount++;
      if (type !== 'read') existing.type = type;
    } else {
      this.files.set(path, {
        path,
        firstAccess: Date.now(),
        lastAccess: Date.now(),
        type,
        changeCount: 1,
      });
    }
  }

  getSessionFiles(): FileAccess[] {
    return Array.from(this.files.values());
  }

  getModifiedFiles(): string[] {
    return this.getSessionFiles()
      .filter(f => f.type !== 'read')
      .map(f => f.path);
  }

  getSummary(): { files: number; lines: { added: number; removed: number } } {
    const modified = this.getModifiedFiles();
    // Calculate actual diff since session start
    return {
      files: modified.length,
      lines: await this.calculateLineChanges(modified),
    };
  }
}
```

### Updated `what_changed` (Fixes Dogfooding)

```typescript
// packages/cli/src/commands/what-changed.ts

export async function whatChanged(options: WhatChangedOptions): Promise<WhatChangedResult> {
  const tracker = getSessionTracker();

  // Use session tracker, NOT git baseline
  const sessionFiles = tracker.getModifiedFiles();

  if (sessionFiles.length === 0) {
    return { files: [], message: "No files modified this session" };
  }

  // Get actual diffs for session files only
  const changes = await Promise.all(
    sessionFiles.map(async file => ({
      file,
      diff: options.includeDiff ? await getFileDiff(file) : undefined,
      lines: await countLineChanges(file),
    }))
  );

  return {
    files: changes,
    summary: {
      filesModified: changes.length,
      linesAdded: changes.reduce((sum, c) => sum + c.lines.added, 0),
      linesRemoved: changes.reduce((sum, c) => sum + c.lines.removed, 0),
    },
  };
}
```

---

## Tiered Learning Storage (From Phase 1 Audit)

### Critical Finding: 97% Token Waste

**Current state** (from audit):
```
199 learning entries × ~100 tokens = ~20,000 tokens loaded
Only 2-5 learnings returned = ~500 tokens used
Efficiency: 2.5% (97% waste!)
```

**Root cause**: `begin-task.ts:537` only loads from `learnings.jsonl`, ignoring 11 curated domain files:
```typescript
// BROKEN: Only loads one file
const learningsPath = join(workspaceRoot, ".snapback", "learnings", "learnings.jsonl");

// IGNORED: 80+ curated patterns in domain files
// - architecture-patterns.jsonl (18 constraints)
// - domain-vscode.jsonl (7 VS Code patterns)
// - domain-testing.jsonl (8 testing patterns)
// - anti-patterns.jsonl
// - workflow-patterns.jsonl
// etc.
```

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  HOT TIER (Always Loaded) ~1,500 tokens                        │
│  ─────────────────────────────────────────────────────────────  │
│  • Critical violations (promoted 3x+)                          │
│  • Active constraints from .ctx                                │
│  • Recent learnings (<7 days, high relevance)                  │
│  • ~10-15 entries                                              │
│  Source: .snapback/learnings/hot.jsonl (auto-generated)        │
├─────────────────────────────────────────────────────────────────┤
│  WARM TIER (Loaded on Intent Match) ~3,000 tokens              │
│  ─────────────────────────────────────────────────────────────  │
│  • Domain files based on task intent:                          │
│    implement → architecture-patterns.jsonl                     │
│    debug → domain-testing.jsonl, anti-patterns.jsonl           │
│    refactor → workflow-patterns.jsonl                          │
│  • ~20-30 entries per domain                                   │
│  Source: .snapback/learnings/domain-*.jsonl                    │
├─────────────────────────────────────────────────────────────────┤
│  COLD TIER (On-Demand Query Only) never auto-loaded            │
│  ─────────────────────────────────────────────────────────────  │
│  • Historical learnings >30 days                               │
│  • Low-relevance learnings                                     │
│  • Completed migration learnings                               │
│  • Accessible via get_learnings keyword search                 │
│  • ~150+ entries                                               │
│  Source: .snapback/learnings/archive.jsonl                     │
└─────────────────────────────────────────────────────────────────┘
```

### Intent → Domain Mapping

```typescript
// packages/cli/src/intelligence/intent-loader.ts

export const INTENT_LEARNING_FILES: Record<TaskIntent, string[]> = {
  implement: [
    "architecture-patterns.jsonl",
    "domain-intelligence.jsonl",
  ],
  debug: [
    "anti-patterns.jsonl",
    "domain-testing.jsonl",
  ],
  refactor: [
    "workflow-patterns.jsonl",
    "architecture-context.jsonl",
  ],
  review: [
    "anti-patterns.jsonl",
    "domain-testing.jsonl",
  ],
  explore: [
    "architecture-context.jsonl",
  ],
};

export async function loadTieredLearnings(
  workspaceRoot: string,
  intent: TaskIntent,
  keywords: string[],
): Promise<Learning[]> {
  const learningsDir = join(workspaceRoot, ".snapback", "learnings");

  // ALWAYS load hot tier
  const hot = await loadJsonl(join(learningsDir, "hot.jsonl"));

  // Load warm tier based on intent
  const warmFiles = INTENT_LEARNING_FILES[intent] || [];
  const warm = await Promise.all(
    warmFiles.map(f => loadJsonl(join(learningsDir, f)))
  ).then(arrs => arrs.flat());

  // Filter by keywords
  const combined = [...hot, ...warm];
  const relevant = combined.filter(l =>
    keywords.some(kw =>
      l.trigger.toLowerCase().includes(kw.toLowerCase()) ||
      l.action.toLowerCase().includes(kw.toLowerCase()) ||
      l.keywords?.some(k => k.toLowerCase().includes(kw.toLowerCase()))
    )
  );

  // Return top 5, sorted by tier then recency
  return relevant
    .sort((a, b) => {
      if (a.tier !== b.tier) return tierPriority(a.tier) - tierPriority(b.tier);
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    })
    .slice(0, 5);
}

function tierPriority(tier: string): number {
  return tier === 'hot' ? 0 : tier === 'warm' ? 1 : 2;
}
```

### Enhanced Learning Schema

```typescript
// packages/core/src/db/learning-schema.ts

export interface TieredLearning {
  // Existing fields
  id: string;
  type: 'pattern' | 'pitfall' | 'efficiency' | 'discovery' | 'workflow';
  trigger: string;
  action: string;
  keywords: string[];
  source: 'survey' | 'manual' | 'violation' | 'curated';

  // NEW: Tiering metadata
  tier: 'hot' | 'warm' | 'cold';
  domain?: string;           // e.g., "testing", "vscode", "architecture"

  // NEW: Usage tracking (for auto-promotion/demotion)
  createdAt: string;         // ISO date
  lastAccessed?: string;     // ISO date
  accessCount: number;       // Times surfaced to LLM
  appliedCount: number;      // Times LLM reported using it

  // NEW: Relevance decay
  relevanceScore: number;    // 0-1, decreases over time
  appliedDate?: string;      // If set, marks as "done" → cold

  // NEW: Promotion tracking
  promotedFrom?: 'violation'; // If promoted from violation
  promotionCount?: number;    // How many times promoted (3 = pattern)
}
```

### Tier Management Logic

```typescript
// packages/cli/src/intelligence/tier-manager.ts

export class TierManager {

  // Auto-promote hot learnings
  async promoteToHot(learning: TieredLearning): Promise<void> {
    if (learning.accessCount >= 5 && learning.appliedCount >= 2) {
      learning.tier = 'hot';
      await this.moveLearning(learning, 'hot.jsonl');
    }
  }

  // Demote stale learnings
  async demoteStale(): Promise<number> {
    const hot = await this.loadTier('hot');
    const now = Date.now();
    let demoted = 0;

    for (const learning of hot) {
      const lastAccess = new Date(learning.lastAccessed || 0).getTime();
      const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);

      if (daysSinceAccess > 30 && learning.accessCount < 3) {
        learning.tier = 'cold';
        await this.moveLearning(learning, 'archive.jsonl');
        demoted++;
      }
    }

    return demoted;
  }

  // Archive completed migrations
  async archiveCompleted(): Promise<number> {
    const all = await this.loadAllTiers();
    let archived = 0;

    for (const learning of all) {
      if (learning.appliedDate) {
        learning.tier = 'cold';
        await this.moveLearning(learning, 'archive.jsonl');
        archived++;
      }
    }

    return archived;
  }

  // Calculate relevance decay
  calculateRelevance(learning: TieredLearning): number {
    const daysSinceCreated = this.daysSince(learning.createdAt);
    const daysSinceAccessed = learning.lastAccessed
      ? this.daysSince(learning.lastAccessed)
      : daysSinceCreated;

    // Base decay: loses 2% per day since last access
    const decay = Math.max(0, 1 - (daysSinceAccessed * 0.02));

    // Boost from usage
    const usageBoost = Math.min(0.3, learning.appliedCount * 0.1);

    return Math.min(1, decay + usageBoost);
  }
}
```

### Stale Learning Cleanup (From Audit)

The audit found these should be archived immediately:

```yaml
archive_immediately:
  completed_migrations:
    - "#1-3: MCP embed/consolidation"
    - "#6, #9, #13: Archive migrations"
    - "#17-19: Tech debt audit"

  duplicates_to_merge:
    - "#14 & #15 → single OfflineEventQueue pattern"
    - "#21-32 → single 'DRY consolidation workflow' summary"

  stale_references:
    - "30% of learnings reference shifted line numbers"
    - "Files renamed/moved since learning created"
```

### Token Efficiency Targets

| Scenario | Tokens Loaded | Used | Efficiency |
|----------|---------------|------|------------|
| **Current** | ~20,000 | ~500 | 2.5% |
| **With tiering** | ~4,500 | ~500 | 11% |
| **With intent filtering** | ~1,500 | ~500 | 33% |
| **Target** | ~1,500 | ~500 | 33% |

---

## Token Compression Protocol

### Wire Format Specification

```typescript
// packages/core/src/protocol/wire-format.ts

/**
 * SnapBack Wire Protocol v1
 *
 * Design principles:
 * - Single line, pipe-delimited
 * - No spaces, no quotes
 * - Abbreviations over full words
 * - Machine-optimized, not human-optimized
 *
 * Response types:
 * - S: Start (snap m:s)
 * - C: Check (snap m:c)
 * - X: Context (snap m:x)
 * - E: End (snap.end)
 * - R: Restore (snap.fix)
 * - H: Help (snap.?)
 * - !: Error
 */

export function formatStart(result: StartResult): string {
  // S|task_id|risk|protection|dirty|learning1|learning2|hotspot1
  const parts = [
    'S',
    result.taskId,
    result.risk[0].toUpperCase(),
    result.protection,
    result.dirty,
    ...result.learnings.slice(0, 3).map(l => compress(l, 40)),
    ...result.hotspots.slice(0, 2).map(h => `${basename(h.file)}:${h.violations}v`),
  ];
  return parts.join('|');
}

export function formatCheck(result: CheckResult): string {
  // C|OK|0E|2W or C|ERR|3E|1W|file:line:msg|file:line:msg
  const status = result.errors.length === 0 ? 'OK' : 'ERR';
  const parts = [
    'C',
    status,
    `${result.errors.length}E`,
    `${result.warnings.length}W`,
  ];

  if (result.errors.length > 0) {
    parts.push(...result.errors.slice(0, 3).map(e =>
      `${basename(e.file)}:${e.line}:${compress(e.message, 30)}`
    ));
  }

  return parts.join('|');
}

export function formatEnd(result: EndResult): string {
  // E|OK|3L|2F|45+12-|learning1|learning2
  return [
    'E',
    result.success ? 'OK' : 'FAIL',
    `${result.learningsGenerated}L`,
    `${result.filesModified}F`,
    `${result.linesAdded}+${result.linesRemoved}-`,
    ...result.learnings.slice(0, 2).map(l => compress(l, 30)),
  ].join('|');
}

function compress(s: string, max: number): string {
  // Remove spaces, truncate
  const clean = s.replace(/\s+/g, '→');
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}
```

### Abbreviation Dictionary

```typescript
// packages/core/src/protocol/abbreviations.ts

export const ABBREV = {
  // Symbols
  '→': 'use/apply/becomes',
  '←': 'from/source',
  '⚠': 'warning',
  '✓': 'ok/pass',
  '✗': 'error/fail',
  '💡': 'hint/suggestion',

  // Common terms (for documentation, not used in wire format)
  'ts': 'typescript',
  'vi': 'vitest',
  'fn': 'function',
  'mod': 'module',
  'dep': 'dependency',
  'cfg': 'config',
  'auth': 'authentication',
  'err': 'error',
  'req': 'request',
  'res': 'response',

  // Response types
  'S': 'Start response',
  'C': 'Check response',
  'X': 'Context response',
  'E': 'End response',
  'R': 'Restore response',
  'H': 'Help response',
  '!': 'Error response',

  // Risk levels
  'L': 'Low risk',
  'M': 'Medium risk',
  'H': 'High risk',
};
```

---

## Exit Survey System (Learning Loop)

### Survey Schema (Compressed)

```typescript
// packages/cli/src/types/exit-survey.ts

export interface ExitSurvey {
  tech: {
    pat: string[];      // patterns_discovered
    pit: string[];      // pitfalls_encountered
    hlp: string[];      // tools_that_helped
    nhlp: string[];     // tools_that_didnt_help
  };
  eff: {
    wa: number;         // wasted_attempts
    won: string;        // wasted_on
    first: string;      // should_have_done_first
    worked: string;     // what_finally_worked
    saved: string;      // time_could_have_saved
  };
  ins: {
    gen: string;        // generalizable_lesson
    app: string[];      // applies_to
    conf: 'l' | 'm' | 'h';  // confidence
  };
  fb: {
    hlp: string;        // what_helped
    miss: string;       // what_was_missing
    fric: string[];     // friction_points
    sug: string;        // suggested_improvement
  };
}

// Survey processor converts to learnings
export interface GeneratedLearning {
  type: 'pat' | 'pit' | 'eff' | 'disc' | 'wf';  // pattern/pitfall/efficiency/discovery/workflow
  trig: string;         // trigger
  act: string;          // action
  kw: string[];         // keywords
  conf: number;         // confidence 0-1
  src: 'survey';
}
```

### Survey Processing

```typescript
// packages/cli/src/intelligence/survey-processor.ts

export class SurveyProcessor {
  process(survey: ExitSurvey, taskId: string): GeneratedLearning[] {
    const learnings: GeneratedLearning[] = [];

    // Patterns → learnings
    for (const pat of survey.tech.pat) {
      if (pat.trim()) {
        learnings.push({
          type: 'pat',
          trig: `Working with ${survey.ins.app.slice(0, 2).join('/')}`,
          act: pat,
          kw: survey.ins.app,
          conf: this.mapConf(survey.ins.conf),
          src: 'survey',
        });
      }
    }

    // Pitfalls → learnings
    for (const pit of survey.tech.pit) {
      if (pit.trim()) {
        learnings.push({
          type: 'pit',
          trig: `Avoid when ${survey.ins.app.slice(0, 2).join('/')}`,
          act: `⚠ ${pit}`,
          kw: [...survey.ins.app, 'avoid', 'pitfall'],
          conf: this.mapConf(survey.ins.conf),
          src: 'survey',
        });
      }
    }

    // Efficiency insight (high value)
    if (survey.eff.wa > 2 && survey.eff.first) {
      learnings.push({
        type: 'eff',
        trig: `Stuck on: ${survey.eff.won}`,
        act: `Do FIRST: ${survey.eff.first}`,
        kw: [...survey.ins.app, 'efficiency', 'first'],
        conf: 0.9,
        src: 'survey',
      });
    }

    // Generalizable insight (highest value)
    if (survey.ins.gen && survey.ins.conf !== 'l') {
      learnings.push({
        type: 'disc',
        trig: survey.ins.app.join('/'),
        act: survey.ins.gen,
        kw: survey.ins.app,
        conf: this.mapConf(survey.ins.conf),
        src: 'survey',
      });
    }

    return learnings;
  }

  private mapConf(c: 'l' | 'm' | 'h'): number {
    return c === 'h' ? 0.9 : c === 'm' ? 0.7 : 0.5;
  }
}
```

---

## Web Research Tasks

Complete these searches and document findings:

```yaml
required_searches:

  1_mcp_push:
    query: "MCP model context protocol push notifications server-sent events"
    goal: "Can MCP push context updates without tool calls?"

  2_llm_tool_optimization:
    query: "LLM tool calling minimize round trips agent efficiency"
    goal: "Patterns for reducing tool call count"

  3_semantic_compression:
    query: "semantic compression LLM context token efficient prompting"
    goal: "Libraries/techniques for dense encoding"

  4_local_vector_db:
    query: "LanceDB vs SQLite FTS5 local embeddings typescript 2024"
    goal: "Best local DB for learnings"

  5_monorepo_shared_db:
    query: "turborepo shared database package CLI extension pattern"
    goal: "Confirm core-owns-db architecture"

  6_cursor_rules:
    query: "cursor rules format context injection automatic"
    goal: "How to auto-inject .ctx file content"

  7_file_watcher_patterns:
    query: "VS Code extension file watcher daemon communication IPC"
    goal: "Best extension↔daemon communication pattern"

  8_bloom_filter_fts:
    query: "bloom filter text search optimization LRU cache retrieval"
    goal: "Learning retrieval optimization patterns"
```

---

## Implementation Checklist

### 🔴 P0: Critical Fixes (Week 1) - FROM STRESS TEST

**Learning Retrieval Bug** - Core value proposition is broken
- [ ] Audit `get_learnings` handler in `packages/mcp/src/facades/handlers.ts`
- [ ] Fix to search ALL tier files, not just hot tier
- [ ] Implement domain-aware retrieval based on file paths
- [ ] Add keyword matching against domain-*.jsonl files
- [ ] Test with stress test queries (vitest/mock, vscode/extension, error/catch)
- [ ] Verify precision ≥70%

**Compact Mode Default** - 88% token waste
- [ ] Change `compact` parameter default to `true` in `begin_task`
- [ ] Update all entry tools to default to compact
- [ ] Remove verbose debug info from default responses
- [ ] Test token reduction (target: 1,300 → 150 tokens)

### Phase 1: Tiered Learning Storage (Week 1) ⭐ HIGH IMPACT
- [ ] Fix `begin-task.ts:537` to load from domain files
- [ ] Implement `INTENT_LEARNING_FILES` mapping
- [ ] Create `loadTieredLearnings()` function
- [ ] Add `tier` field to learning schema
- [ ] Archive stale learnings (#1-3, #6, #9, #13, #17-19)
- [ ] Merge duplicates (#14-15, #21-32)
- [ ] Create `hot.jsonl` from high-access learnings
- [ ] Implement `TierManager` class

### Phase 2: Tool Consolidation (Week 1-2) - 24 → 7 Tools
- [ ] Create `snap` unified tool with modes (s/c/x)
- [ ] Create `check` unified tool with modes (quick/full/patterns)
- [ ] Create `snap.end` tool (complete + review + learn)
- [ ] Create `snap.fix` tool (list/restore/diff)
- [ ] Create `snap.learn` tool (mid-session capture)
- [ ] Create `snap.violation` tool (violation reporting)
- [ ] Create `snap.?` tool (help/discovery)
- [ ] Deprecate old tools (keep working, add warnings)
- [ ] Update tool descriptions for LLM selection clarity

### Phase 3: Core Extraction (Week 2)
- [ ] Extract git utilities to `packages/core/src/git/`
- [ ] Extract learning schema to `packages/core/src/db/`
- [ ] Extract risk assessment to `packages/core/src/analysis/`
- [ ] Create `LearningStore` class with FTS5
- [ ] Add bloom filter for fast "might have learning" check
- [ ] Add LRU cache for recent retrievals

### Phase 4: Push Architecture (Week 2-3)
- [ ] Create `packages/cli/src/daemon/` structure
- [ ] Implement `ContextWriter` class
- [ ] Implement `DaemonEventHandlers`
- [ ] Add `.snapback/ctx` file writing
- [ ] Create Cursor rules template
- [ ] Create Claude project instructions template

### Phase 5: Session Tracking (Week 3)
- [ ] Implement `SessionFileTracker`
- [ ] Fix `what_changed` to use session tracker
- [ ] Fix `review_work` to scope to session
- [ ] Fix `complete_task` to report actual stats

### Phase 6: Unknown Territory Handling (Week 3-4)
- [ ] Add project detection (is this the SnapBack codebase?)
- [ ] Clear/filter learnings for non-matching projects
- [ ] Add graceful "no learnings available" response
- [ ] Prevent context pollution from parent projects

### Phase 5: Pattern Detection (Week 3)
- [ ] Add silent catch detection to `quick_check`
- [ ] Add file size warning (>500 lines)
- [ ] Add hotspot suggestions in `begin_task`
- [ ] Integrate violation history

---

## Exit Assessment (REQUIRED)

After implementing, complete this assessment:

### A. Metrics

```yaml
metrics:
  tool_calls_per_session:
    before: ___
    after: ___
    target: ≤4

  tokens_per_session:
    before: ___
    after: ___
    target: ≤500

  push_vs_pull_ratio:
    before: "0:100"
    after: "___:___"
    target: "70:30"

  response_parse_time:
    before: "___"
    after: "___"
    target: "instant"
```

### B. Helpfulness Rating (1-100)

```yaml
helpfulness:
  score: ___/100

  breakdown:
    context_quality: ___/25      # Did learnings help?
    tool_efficiency: ___/25      # Minimal calls needed?
    response_clarity: ___/25     # Easy to parse?
    recovery_value: ___/25       # Could restore if needed?

  reasoning: "..."
```

### C. Tool Evaluation

For each of the 4 tools:

```yaml
tool_evaluation:
  snap:
    calls_made: ___
    necessary: true/false
    response_useful_pct: ___%
    friction: none/low/medium/high
    improvement: "..."

  snap.end:
    # ...

  snap.fix:
    # ...

  snap.?:
    # ...
```

### D. Would Recommend?

```yaml
recommendation:
  would_recommend_to_other_llms: true/false

  what_increases_tool_usage:
    naming:
      observation: "..."
      suggestion: "..."
    description:
      observation: "..."
      suggestion: "..."
    response_format:
      observation: "..."
      suggestion: "..."

  friction_points: ["...", "..."]

  missing_features: ["...", "..."]
```

### E. Learning Submission

```typescript
snap.end({
  ok: 1,
  l: [
    "...",  // Pattern discovered
    "...",  // Pitfall avoided
    "...",  // Efficiency insight
  ],
  survey: {
    tech: { pat: [...], pit: [...], hlp: [...], nhlp: [...] },
    eff: { wa: ___, won: "...", first: "...", worked: "...", saved: "..." },
    ins: { gen: "...", app: [...], conf: "h" },
    fb: { hlp: "...", miss: "...", fric: [...], sug: "..." },
  }
})
```

---

## Success Criteria (Stress Test Validated)

| Metric | Before | Current | Target | Status |
|--------|--------|---------|--------|--------|
| Tool calls/session | 6-10 | 6-8 | ≤4 | 🟡 In Progress |
| Tokens/session | ~2,000 | 8-12K | ≤500 | 🔴 Needs Work |
| Tools in surface | 12+ | 24 | 7 | 🔴 Needs Work |
| Push:Pull ratio | 0:100 | 0:100 | 70:30 | 🔴 Needs Work |
| Session tracking accuracy | 0% | 0% | 100% | 🔴 Needs Work |
| Dogfooding issues fixed | 0/7 | 0/7 | 7/7 | 🔴 Needs Work |
| **Learning load efficiency** | 2.5% | **0%** | ≥33% | 🔴 **CRITICAL** |
| **Learning tokens loaded** | ~20,000 | ~600 | ≤1,500 | 🟡 In Progress |
| **Domain files utilized** | 0/11 | **0/11** | 11/11 | 🔴 **CRITICAL** |
| **Stale learnings archived** | 0 | 0 | ~60 | 🔴 Needs Work |
| **Compact mode default** | false | false | true | 🔴 Needs Work |
| **Anti-pattern detection** | N/A | **100%** | 100% | ✅ **PASSING** |
| **Scale performance** | N/A | **All pass** | All pass | ✅ **PASSING** |

### Stress Test Pass/Fail Summary

| Dimension | Threshold | Result | Status |
|-----------|-----------|--------|--------|
| Tool overlap identified | Document all | 13 high-overlap pairs | ✅ PASS |
| Consolidation proposed | ≤7 tools | 24 → 7 proposed | ✅ PASS |
| Token efficiency measured | Calculate waste % | 50% waste identified | ✅ PASS |
| Scale tested | All 4 sizes | S/M/L/XL passed | ✅ PASS |
| Learning retrieval | ≥70% precision | 0-20% precision | ❌ **FAIL** |
| Tiering verified | Hot/warm/cold working | Files exist, retrieval broken | ❌ **FAIL** |
| Issue avoidance | ≥80% caught | 100% caught | ✅ PASS |
| Unknown territory | Graceful handling | Context pollution | ⚠️ PARTIAL |
| Exit survey | Loop confirmed | Broken at retrieval | ❌ **FAIL** |
| Cross-session | Persistence verified | Files persist, untested | ⚠️ PARTIAL |

---

## Remember

```
LOCAL-FIRST: All data on user's machine
CORE-OWNED: packages/core exports, CLI instantiates
PUSH > PULL: Daemon writes .ctx, LLM reads automatically
7 TOOLS MAX: snap, snap.end, snap.fix, snap.?, snap.learn, snap.violation, check
COMPACT DEFAULT: Wire format, not JSON (88% token reduction)
SESSION-SCOPED: Track actual edits, not git baseline
TIERED LEARNINGS: Hot (always) → Warm (intent) → Cold (query)
INTENT-BASED: Load domain files matching task intent
FIX RETRIEVAL: get_learnings MUST search domain-*.jsonl files
```

### Critical Priorities (From Stress Test)

```yaml
P0_MUST_FIX:
  - "Learning retrieval returns wrong learnings (0% precision)"
  - "Compact mode not default (88% token waste)"

P1_SHOULD_FIX:
  - "Tool proliferation (24 → 7 tools)"
  - "Context pollution on unknown projects"

P2_NICE_TO_HAVE:
  - "Proactive warnings (currently reactive only)"
  - "Formal exit survey prompt"
```
