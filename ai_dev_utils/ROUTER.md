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
|--------------|-----------|----------|----------|
| "fix", "broken", "bug", "error", "crash", "not working" | BUG_FIX | `1_triage.md` → `4_dev_complete.md` | P1-P2 |
| "add", "implement", "create", "new feature", "build" | NEW_FEATURE | `2_research.md` → `3_planning.md` → `4_dev_complete.md` | P2-P3 |
| "refactor", "clean up", "consolidate", "extract", "dedupe" | REFACTORING | `5_refactor.md` | P3-P4 |
| "test", "coverage", "edge case", "missing test" | TESTING | `6_test.md` | P3 |
| "docs", "outdated", "stale", "update docs", "cleanup docs" | DOC_HYGIENE | `8_doc_hygiene.md` | P4 |
| "P0", "production", "critical", "emergency", "down" | HOTFIX | `7_hotfix.md` | P0 |
| "investigate", "why", "how does", "understand" | RESEARCH | `2_research.md` | P3 |

---

## Context Detection

| Context Signal | Detected Area | Special Rules |
|----------------|---------------|---------------|
| "VS Code", "extension", "command", "activation" | `apps/vscode/` | Check activation order, disposables |
| "API", "endpoint", "backend", "database", "service" | `apps/api/` | Use service layer, no inline DB queries |
| "web", "dashboard", "component", "React", "Next.js" | `apps/web/` | Business logic in hooks, not components |
| "MCP", "server", "tool" | `apps/mcp-server/` | Follow MCP protocol patterns |
| Multiple contexts | Full-stack | Start with contracts, then backend, then frontend |

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

**Last Verified:** 2025-12-16
**Status:** active
