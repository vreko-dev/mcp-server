# SnapBack MCP Wire Format Specification v1

## Overview

SnapBack tools return a compact "wire format" line plus a human-readable summary. This design optimizes for token efficiency while maintaining comprehension.

---

## Wire Response Grammar

**FORMAT:**
```
🧢|TYPE|field1|field2|...
---
<human-readable summary>
```

### TYPE Codes

| Code | Meaning | Tool |
|------|---------|------|
| `S` | Start task | `snap` (mode: start) |
| `C` | Check result | `snap` (mode: check), `check` |
| `X` | Context snapshot | `snap` (mode: context) |
| `E` | End task summary | `snap_end` |
| `R` | Snapshot list/restore | `snap_fix` |
| `L` | Learning captured | `snap_learn` |
| `V` | Violation recorded | `snap_violation` |
| `H` | Help response | `snap_help` |
| `!` | Error | Any tool |

### Field Conventions

| Convention | Meaning | Example |
|------------|---------|---------|
| `L`, `M`, `H` | Risk level: Low, Medium, High | `risk:M` |
| `✓`, `✗`, `⏭️` | Status: pass, fail, skipped | `ts:✓` |
| `3E`, `2W` | Counts: 3 errors, 2 warnings | `err:3E` |
| `0-100` | Percentage (coverage, protection) | `prot:85` |
| `→` | Compressed spaces | `auth→pattern→found` |

### Labeled vs Compact Mode

**Default (labeled)** - Self-documenting fields:
```
🧢|S|id:task_1|snap:snap_a|risk:M|prot:85|dirty:2|status:created|learn:jwt→validation
```

**Compact mode** (`compact: true`) - Positional fields for maximum efficiency:
```
🧢|S|task_1|snap_a|M|85|2|created|jwt→validation
```

> **When to use compact**: Only when operating under severe token pressure (>85% context usage). Default labeled mode is recommended for reliable LLM comprehension.

---

## Fallback Behavior

> **Important**: The human-readable summary after `---` contains all essential information in natural language. If the wire format is unclear, rely on the summary. The wire line is structured for extraction; the summary is for understanding.

**Recovery instruction**: If you receive a wire response you cannot interpret, call `snap_help` with `topic: "wire"` to get this reference in plain text.

---

## Wire Response Shapes by Tool

### `snap` (mode: start) → TYPE `S`

```
🧢|S|id:<taskId>|snap:<snapshotId>|risk:<L/M/H>|prot:<0-100>|dirty:<count>|status:<text>|learn:<compressed>
---
Task started. <context summary>
```

**Fields:**
- `id`: Unique task identifier for subsequent calls
- `snap`: Snapshot ID associated with this task
- `risk`: Risk level (L=low, M=medium, H=high)
- `prot`: Protection coverage percentage (0-100)
- `dirty`: Count of uncommitted/changed files
- `status`: Snapshot status (created, reused, failed)
- `learn`: Compressed learnings (spaces→arrows)

### `snap` (mode: check) / `check` → TYPE `C`

```
🧢|C|status:<✓/✗/⏭️>|err:<n>E|warn:<n>W|ts:<✓/✗/⏭️>|lint:<✓/✗/⏭️>|tests:<✓/✗/⏭️>|issues:<compressed>
---
Check <passed/failed>. <details>
```

**Fields:**
- `status`: Overall result
- `err`: Error count
- `warn`: Warning count
- `ts`, `lint`, `tests`: Per-subsystem status
- `issues`: Compressed issue summary

### `snap` (mode: context) → TYPE `X`

```
🧢|X|risk:<L/M/H>|prot:<0-100>|dirty:<count>|learn:<compressed>
---
Current context: <summary>
```

### `snap_end` → TYPE `E`

```
🧢|E|status:<OK/ERR>|learn:<n>L|files:<n>F|lines:<+added-removed>|summary:<compressed>|<JSON-survey>
---
Task ended. <outcome summary>
```

**Survey JSON** (clear keys, not abbreviated):
```json
{"patterns_used":2,"pitfalls_avoided":1,"helpfulness":5,"unhelpful_count":0}
```

### `snap_fix` → TYPE `R`

**List snapshots:**
```
🧢|R|count:<n>|<id>:<age>:<files>f|...
---
<n> snapshots available.
```

**Restore snapshot:**
```
🧢|R|status:OK|files:<n>|<file1>|<file2>|...
---
Restored <n> files from snapshot.
```

**Diff snapshots:**
```
🧢|D|from:<id1>|to:<id2>|added:<+n>|removed:<-n>|changed:<~n>
---
Diff: +<n> added, -<n> removed, ~<n> changed.
```

### `snap_learn` → TYPE `L`

```
🧢|L|status:OK|id:<learningId>|type:<pattern/pitfall/efficiency/discovery/workflow>
---
Learning captured: <description>
```

### `snap_violation` → TYPE `V`

```
🧢|V|status:OK|type:<violationType>|count:<n>|promote:<NO/PROMOTED/PATTERN>|auto:<NO/YES>
---
Violation '<type>' recorded (<n> occurrences). <promotion status>
```

**Auto-promotion thresholds:**
- `1-2×`: Stored for reference
- `3×`: Auto-promoted to pattern (affects future tasks)
- `5×`: Marked for automation (`auto:YES`)

### `snap_help` → TYPE `H` (Plain Text Only)

> **Note**: `snap_help` returns plain text WITHOUT wire format prefix. This is intentional—it's the escape hatch for when wire format is confusing.

```
# SnapBack Wire Format Reference

TYPE CODES:
S = Start task
C = Check result
...

FIELD DECODE:
S: id | snap | risk | prot | dirty | status | learn
...
```

### Errors → TYPE `!`

```
🧢|!|code:<ERROR_CODE>|reason:<compressed>
---
Error: <human explanation>
```

**Common error codes:**
- `NO_TASK`: No active task found
- `SNAPSHOT_NOT_FOUND`: Referenced snapshot doesn't exist
- `INVALID_MODE`: Unrecognized mode parameter
- `VALIDATION_FAILED`: Input validation error

---

## Tool Input Schemas

### `snap` - Universal Entry Point

```typescript
{
  type: "object",
  properties: {
    mode: {
      type: "string",
      enum: ["start", "check", "context"],
      description: "Operation mode: 'start' begins a task, 'check' validates code, 'context' gets current state."
    },
    task: {
      type: "string",
      description: "Task title or goal (required for mode: start)."
    },
    files: {
      type: "array",
      items: { type: "string" },
      description: "Primary files involved in the task."
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Keywords or tags for pattern matching."
    },
    compact: {
      type: "boolean",
      default: false,
      description: "If true, return positional-only wire fields. Default returns labeled fields."
    }
  },
  required: ["mode"]
}
```

**Example call:**
```json
{ "mode": "start", "task": "fix auth bug", "files": ["auth.ts"], "keywords": ["jwt"] }
```

**Example response:**
```
🧢|S|id:task_1|snap:snap_a|risk:M|prot:85|dirty:2|status:created|learn:jwt→validation→pattern
---
Task started. 1 relevant pattern found. Medium risk due to auth scope.
```

### `check` - Code Validation

```typescript
{
  type: "object",
  properties: {
    mode: {
      type: "string",
      enum: ["quick", "patterns", "full", "build", "test", "impact", "circular", "docs", "all"],
      description: "Check mode. Groups: Quick (quick, patterns), Full (full, build, test), Analysis (impact, circular, docs, all)."
    },
    taskId: {
      type: "string",
      description: "Task ID from snap start. If omitted, uses current context."
    },
    files: {
      type: "array",
      items: { type: "string" },
      description: "Specific files to check. If omitted, checks task scope."
    },
    compact: {
      type: "boolean",
      default: false,
      description: "If true, return positional-only wire fields."
    }
  },
  required: ["mode"]
}
```

**Mode groups:**
- **Quick**: `quick` (fast sanity), `patterns` (pattern validation only)
- **Full**: `full` (comprehensive), `build` (compile only), `test` (tests only)
- **Analysis**: `impact` (change effects), `circular` (dependency cycles), `docs` (documentation freshness), `all` (everything)

**Example call:**
```json
{ "mode": "full", "taskId": "task_1" }
```

**Example response:**
```
🧢|C|status:✗|err:3E|warn:5W|ts:✗|lint:✗|tests:⏭️|issues:auth→validation→missing
---
Full check failed. 3 errors and 5 warnings, mainly in auth validation.
```

### `snap_end` - Complete Task

```typescript
{
  type: "object",
  properties: {
    taskId: {
      type: "string",
      description: "Task ID to complete."
    },
    outcome: {
      type: "string",
      enum: ["completed", "abandoned", "blocked"],
      description: "How the task ended."
    },
    learnings: {
      type: "array",
      items: { type: "string" },
      description: "Key learnings from this task."
    },
    survey: {
      type: "object",
      description: "Optional self-assessment.",
      properties: {
        patterns_used: { type: "number", description: "Count of patterns applied." },
        pitfalls_avoided: { type: "number", description: "Count of pitfalls dodged." },
        helpfulness: { type: "number", description: "Rating 1-5." },
        unhelpful_count: { type: "number", description: "Count of unhelpful suggestions." }
      }
    },
    compact: {
      type: "boolean",
      default: false
    }
  },
  required: ["taskId"]
}
```

**Example call:**
```json
{
  "taskId": "task_1",
  "outcome": "completed",
  "learnings": ["cooldown should be set after success"],
  "survey": { "patterns_used": 2, "pitfalls_avoided": 1, "helpfulness": 5, "unhelpful_count": 0 }
}
```

**Example response:**
```
🧢|E|status:OK|learn:2L|files:3F|lines:+45-12|summary:auth→pattern→captured|{"patterns_used":2,"pitfalls_avoided":1,"helpfulness":5,"unhelpful_count":0}
---
Task ended. 2 learnings captured across 3 files (+45/-12 lines). Helpfulness rated 5/5.
```

### `snap_violation` - Report Violation

```typescript
{
  type: "object",
  properties: {
    type: {
      type: "string",
      description: "Violation type key (e.g., 'silent_catch', 'missing_auth_check')."
    },
    file: {
      type: "string",
      description: "File where violation occurred."
    },
    description: {
      type: "string",
      description: "What happened."
    },
    prevention: {
      type: "string",
      description: "How to prevent this in future."
    },
    taskId: {
      type: "string",
      description: "Associated task ID."
    }
  },
  required: ["type", "description"]
}
```

**Example call:**
```json
{
  "type": "silent_catch",
  "file": "auth.ts",
  "description": "Catch block swallowed error without logging",
  "prevention": "Always log in catch blocks"
}
```

**Example response:**
```
🧢|V|status:OK|type:silent_catch|count:3|promote:PROMOTED|auto:NO
---
Violation 'silent_catch' seen 3 times. Promoted to pattern—will appear in future task starts.
```

### `snap_learn` - Capture Learning

```typescript
{
  type: "object",
  properties: {
    trigger: {
      type: "string",
      description: "What situation triggers this learning."
    },
    action: {
      type: "string",
      description: "What to do when triggered."
    },
    type: {
      type: "string",
      enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"],
      description: "Learning category."
    }
  },
  required: ["trigger", "action", "type"]
}
```

**Example call:**
```json
{
  "trigger": "auto-snapshot cooldown logic",
  "action": "set cooldown AFTER success, not before try block",
  "type": "pitfall"
}
```

**Example response:**
```
🧢|L|status:OK|id:learn_abc123|type:pitfall
---
Learning captured: "auto-snapshot cooldown logic" → set cooldown AFTER success.
```

### `snap_fix` - Snapshot Operations

```typescript
{
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["list", "restore", "diff"],
      default: "list",
      description: "Operation: list available, restore specific, or diff two snapshots."
    },
    id: {
      type: "string",
      description: "Snapshot ID for restore/diff."
    },
    diffWith: {
      type: "string",
      description: "Second snapshot ID for diff operation."
    },
    dryRun: {
      type: "boolean",
      description: "Preview restore without applying."
    }
  }
}
```

### `snap_help` - Wire Format Help

```typescript
{
  type: "object",
  properties: {
    topic: {
      type: "string",
      enum: ["wire", "modes", "thresholds", "tools", "all"],
      description: "Help topic: wire format, check modes, promotion thresholds, tool list, or everything."
    }
  },
  required: ["topic"]
}
```

> **Note**: This tool returns plain text, NOT wire format. It's the escape hatch for confusion.

---

## Migration from Legacy Tools

| Legacy Tool | New Tool | Migration |
|-------------|----------|-----------|
| `begin_task` | `snap` mode: start | Same semantics |
| `get_context` | `snap` mode: context | Same semantics |
| `quick_check` | `check` mode: quick | Same semantics |
| `prepare_workspace` | `snap` mode: start | Combined into start |
| `complete_task` | `snap_end` | Add outcome field |
| `learn` | `snap_learn` | Rename trigger→trigger, action→action |
| `report_violation` | `snap_violation` | Same semantics |
| `snapshot_list` | `snap_fix` action: list | Same semantics |
| `snapshot_restore` | `snap_fix` action: restore | Same semantics |
| `check_patterns` | `check` mode: patterns | Same semantics |

---

## Version History

- **v1** (2024-12): Initial specification with labeled wire format default
