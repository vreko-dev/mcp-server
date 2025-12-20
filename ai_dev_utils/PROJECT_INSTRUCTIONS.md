# SnapBack Development Instructions

## Codebase Intelligence System

This project has a self-learning context system. **You MUST use these tools for SnapBack development.**

### Required Tool Usage

| When | Tool | Example |
|------|------|---------|
| **BEFORE any implementation** | `codebase:get_context` | `codebase:get_context({ task: "add auth", files: ["apps/api/src/auth.ts"] })` |
| **BEFORE committing code** | `codebase:check_patterns` | `codebase:check_patterns({ code: "...", filePath: "..." })` |
| **AFTER making a mistake** | `codebase:report_violation` | Report it so the system learns |
| **AFTER completing a task** | `codebase:record_learning` | Capture patterns for future |

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
- **Hard constraints** - Rules that must not be violated (C-001 to C-008)
- **Learned patterns** - Patterns promoted from past violations
- **Recent violations** - Mistakes made in the same files
- **Learnings** - Tips captured from past sessions

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
| `ai_dev_utils/ARCHITECTURE.md` | System boundaries, layer rules |
| `ai_dev_utils/CONSTRAINTS.md` | Hard rules (non-negotiable) |
| `ai_dev_utils/ROUTER.md` | Task routing, workflows |
| `ai_dev_utils/patterns/codebase-patterns.md` | Promoted patterns |

### Gate Commands

```bash
# Check constraints on current task
npx tsx ai_dev_utils/gates/gate-runner.ts constraints

# Run TDD phase
npx tsx ai_dev_utils/gates/gate-runner.ts red|green|refactor|quality

# See violation summary
npx tsx ai_dev_utils/gates/gate-runner.ts summary
```

---

**Remember: The codebase tools are not optional. They are the primary way to get context for SnapBack development.**
