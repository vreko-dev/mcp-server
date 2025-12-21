# SnapBack Development Instructions

**Last updated:** 2025-12-21

## Codebase Intelligence System

This project has a self-learning context system. **You MUST use these tools for SnapBack development.**

### Required Tool Usage

| When | Tool | Example |
|------|------|---------|
| **BEFORE any implementation** | `codebase:get_context` | `codebase:get_context({ task: "add auth", files: ["apps/api/src/auth.ts"] })` |
| **BEFORE committing code** | `codebase:check_patterns` | `codebase:check_patterns({ code: "...", filePath: "..." })` |
| **AFTER making a mistake** | `codebase:report_violation` | Report it so the system learns |
| **AFTER completing a task** | `codebase:record_learning` | Capture patterns for future |

### Full Tool Reference

| Tool | Purpose |
|------|---------|
| `codebase:start_task` | Initialize task context, load relevant patterns |
| `codebase:get_context` | Get architecture, constraints, patterns for task |
| `codebase:check_patterns` | Validate code against constraints before commit |
| `codebase:report_violation` | Report mistakes for system learning |
| `codebase:query_learnings` | Search past learnings by keywords |
| `codebase:get_violations_summary` | View all violations grouped by type |
| `codebase:record_learning` | Capture new patterns/pitfalls/discoveries |
| `codebase:ask_ai` | Query intelligence layer for guidance |
| `codebase:validate_code` | Run 7-layer validation pipeline |
| `codebase:log_interaction` | Track interactions for learning engine |
| `codebase:record_feedback` | Provide feedback on validation results |
| `codebase:get_learning_stats` | View learning engine statistics |

### Workflow

```
User asks to implement something
         ↓
FIRST: Call codebase:get_context({ task: "...", files: [...], keywords: [...] })
         ↓
Read the returned context (architecture, constraints, patterns, violations)
         ↓
Implement following the patterns
         ↓
BEFORE suggesting code: Call codebase:check_patterns({ code: "...", filePath: "..." })
         ↓
If violations found, fix them first
         ↓
After task complete: Call codebase:record_learning if you learned something new
```

### Why This Matters

The codebase tools provide:
- **Architecture rules** - Layer boundaries, what can import what
- **Hard constraints** - Rules that must not be violated (C-001 to C-012)
- **Learned patterns** - Patterns promoted from past violations (3x → patterns, 5x → automation)
- **Recent violations** - Mistakes made in the same files
- **Learnings** - Tips captured from past sessions (42+ learnings)

**Skipping these tools means you'll likely repeat past mistakes.**

### Tool Preference Order

When working on SnapBack code:

1. **FIRST**: `codebase:get_context` - Always start here
2. **THEN**: `filesystem:*` tools for reading/writing code
3. **BEFORE COMMIT**: `codebase:check_patterns` - Validate your work
4. **IF STUCK**: `codebase:query_learnings` - Search for relevant tips

### Key Files

| File | Purpose |
|------|---------|
| `ai_dev_utils/ARCHITECTURE.md` | System boundaries, layer rules, package inventory |
| `ai_dev_utils/CONSTRAINTS.md` | Hard rules C-001 to C-012 (non-negotiable) |
| `ai_dev_utils/ROUTER.md` | Task routing, workflows, MCP tool requirements |
| `ai_dev_utils/patterns/codebase-patterns.md` | Promoted patterns from violations |
| `ai_dev_utils/patterns/violations.jsonl` | Violation history (auto-promotion at 3x/5x) |
| `ai_dev_utils/feedback/learnings.jsonl` | Session learnings and discoveries |

### Architecture Layers

```
Presentation: apps/vscode, apps/web, apps/cli, apps/docs
Service:      apps/mcp-server, apps/api, packages/sdk
Core:         packages/core, packages/engine, packages/contracts
Intelligence: packages/intelligence (validation, learning, context, policy, vitals)
Infra:        packages/platform, packages/integrations, packages/auth
Observability: packages/infrastructure
```

### Layer Import Rules

- Presentation → Core, Contracts, SDK (NOT Infrastructure)
- Service → Core, Infrastructure, Contracts, Intelligence
- Core → Contracts, Config only
- Intelligence → Contracts, Storage abstractions only

### Gate Commands

```bash
# Check constraints on current task
npx tsx ai_dev_utils/gates/gate-runner.ts constraints

# Run TDD phase
npx tsx ai_dev_utils/gates/gate-runner.ts red|green|refactor|quality

# See violation summary
npx tsx ai_dev_utils/gates/gate-runner.ts summary
```

### Violation Auto-Promotion

| Threshold | Action |
|-----------|--------|
| 1x | Stored in violations.jsonl |
| 3x | Auto-promoted to codebase-patterns.md |
| 5x | Becomes hard constraint (C-XXX) with automated gate check |

---

**Remember: The codebase tools are not optional. They are the primary way to get context for SnapBack development.**
