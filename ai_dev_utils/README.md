# AI Dev Utils

**Purpose:** Self-learning workflow system for AI-assisted development
**Entry Point:** This file OR `@ROUTER.md`

---

## Quick Start

```
Load: @ROUTER.md
Say: "Route: [YOUR TASK DESCRIPTION]"
```

**Example:**
```
"Route: Fix the sign-in button not working in VS Code extension"
"Route: Add user analytics to the web dashboard"
"Route: Clean up duplicate error handling code"
```

---

## Directory Structure

```
ai_dev_utils/
├── README.md                  # This file - Quick start
├── ROUTER.md                  # Task classifier + workflow routing
│
├── workflows/                 # Task-type-specific workflows
│   ├── 1_triage.md           # Issue assessment, classification
│   ├── 2_research.md         # Investigation, root cause analysis
│   ├── 3_planning.md         # Architecture audit, design decisions
│   ├── 4_dev_complete.md     # ⭐ CANONICAL TDD implementation
│   ├── 5_refactor.md         # Code quality, consolidation
│   ├── 6_test.md             # Coverage gaps, edge cases
│   ├── 7_hotfix.md           # Emergency production fixes
│   └── 8_doc_hygiene.md      # Doc cleanup, staleness removal
│
├── phases/                    # Detailed TDD phase docs
│   ├── 0-architecture-audit.md
│   ├── 1-red-phase.md
│   ├── 2-green-phase.md
│   ├── 3-refactor-phase.md
│   ├── 4-quality-verification.md
│   └── 5-certification.md
│
├── patterns/                  # Reusable patterns
│   ├── codebase-patterns.md  # Canonical locations, conventions
│   ├── violations.jsonl      # Known anti-patterns
│   └── assertion-examples.md # Test assertion patterns
│
├── feedback/                  # Self-learning system
│   ├── learnings.jsonl       # ⭐ Machine-readable learnings
│   ├── COMPLETION_TRACKER.md # Completed features
│   └── violation-template.md # Violation reporting
│
├── state/                     # Current task state
│   └── current-task.json
│
├── scripts/                   # Automation
│   ├── gate.sh               # Phase gate runner
│   ├── start.sh              # Start new task
│   └── learn.sh              # Record learnings
│
├── evidence/                  # Task evidence artifacts
│
└── _archive/                  # Archived project-specific docs
```

---

## Workflow Selection Guide

| Task Type | Workflow Path |
|-----------|---------------|
| **Bug (known cause)** | `1_triage` → `4_dev_complete` |
| **Bug (unknown cause)** | `1_triage` → `2_research` → `4_dev_complete` |
| **New Feature** | `2_research` → `3_planning` → `4_dev_complete` |
| **Refactoring** | `5_refactor` |
| **Test Coverage** | `6_test` |
| **P0 Emergency** | `7_hotfix` |
| **Doc Cleanup** | `8_doc_hygiene` |

---

## Self-Learning System

The system learns from each task:

### Record a Learning

```bash
./scripts/learn.sh "pattern" "trigger phrase" "recommended action" "source-task"
```

### Learning Types

| Type | When to Use |
|------|-------------|
| `pattern` | Reusable code pattern discovered |
| `pitfall` | Common mistake to avoid |
| `efficiency` | Better way to do something |
| `discovery` | Useful finding about codebase |
| `incident` | Post-mortem learning |
| `stale_doc` | Documentation was outdated |

### How It Works

1. Complete task → Record learning
2. Learning stored in `feedback/learnings.jsonl`
3. ROUTER reads learnings on startup
4. Relevant learnings surfaced during task routing
5. Flywheel: More tasks → more learnings → smarter routing

---

## Key Scripts

```bash
# Start new task
./scripts/start.sh "Task description"

# Run phase gate
./scripts/gate.sh [audit|red|green|refactor|verify|certify|test]

# Record learning
./scripts/learn.sh [type] [trigger] [action] [source]
```

---

## Canonical Locations

| Component | Location |
|-----------|----------|
| Error Handling | `@snapback-oss/sdk/utils/errorHelpers.ts` |
| Retry Logic | `@snapback-oss/sdk/utils/retry.ts` |
| Logger | `@snapback/infrastructure/logging/logger.ts` |
| Auth | `@snapback/auth` |
| Types | `@snapback/contracts` |
| API Client | `@snapback/sdk/client/SnapshotClient.ts` |

---

## Doc Freshness Standard

Every doc has a freshness header:

```yaml
---
last_verified: 2025-12-16
verified_by: agent | human
status: active | stale | archived
---
```

**Stale docs are context poison.** Run `8_doc_hygiene.md` periodically.

---

## Migration from Old Structure

| Old File | New Location |
|----------|--------------|
| `TDD_CORE.md` | `workflows/4_dev_complete.md` |
| `TDD_WORKFLOW.md` | `ROUTER.md` + `workflows/` |
| `TASK_ROUTER.md` | `ROUTER.md` |
| `TDD_AGENT_PROMPT.md` | `_archive/` (synthesized into workflows) |
| `testing_docs/` | `_archive/` (synthesized into workflows) |
| `v1_rollout/`, `v1_update/` | `_archive/` (project-specific) |

---

**Last Verified:** 2025-12-16
**Status:** active
