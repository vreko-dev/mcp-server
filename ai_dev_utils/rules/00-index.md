---
description: "Core project rules loaded for ALL files"
alwaysApply: true
---

# SnapBack Core Rules

**Purpose:** Universal rules that apply to ALL development work.
**Priority:** HIGH - Always loaded

---

## Pre-Flight Checklist (NON-NEGOTIABLE)

Before ANY code changes:

1. **Call `codebase.start_task()`** - bundles context + learnings + violations
2. **Review returned patterns** - explicitly state which apply
3. **Verify existence** of all referenced files/packages
4. **ONLY THEN:** Proceed with implementation

---

## MCP Tools (Use Before Implementation)

| Tool | When |
|------|------|
| `codebase.start_task()` | BEFORE any implementation |
| `codebase.check_patterns()` | BEFORE committing |
| `codebase.report_violation()` | After mistakes |

---

## Verification Gates (ALL Required)

Don't declare complete until:
- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] No placeholder tests remain
- [ ] Manual testing confirms fix
- [ ] User validates

---

## Layer Boundaries

```
Presentation (apps/vscode, apps/web, apps/cli)
    ↓ imports ↓
Service (apps/api, apps/mcp-server)
    ↓ imports ↓
Core (packages/core, packages/engine)
    ↓ imports ↓
Infrastructure (packages/platform, packages/infrastructure)
```

**Rule:** Presentation CANNOT import Infrastructure directly.

---

**See domain-specific rules in:** `rules/*.md`
