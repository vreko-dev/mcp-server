🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑
     STOP: READ THIS BEFORE ANY CODE
🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑🛑

# Task Router

**This is your BIBLE for working in this codebase.**
**Every LLM session MUST start here.**
**Skipping = tracked violation = path to auto-promotion.**

**Purpose:** Intelligent task classification and workflow routing
**Entry Point:** Load this file to start any development task
**Methodology:** Hybrid SDD+TDD+Constraints (spec → tests → guardrails)

---

## ⚠️ MANDATORY: Pre-Flight Checklist

**DO NOT write ANY code until you complete this:**

- [ ] **1. Call `codebase.start_task()`** - bundles context + learnings + violations
- [ ] **2. Review returned patterns** - state: "Pattern X applies because..."
- [ ] **3. Verify existence** of referenced files: `test -f [PATH]`
- [ ] **4. ONLY THEN:** Proceed with implementation

**Enforcement:** Violation type `ignored-router-instructions` (1x as of 2025-12-21, 3x = auto-promote)

---

## MCP Tools

```typescript
// 🚨 BEFORE implementation
codebase.start_task({ task: "...", keywords: ["..."], files: ["..."] })

// 🚨 BEFORE committing
codebase.check_patterns({ code: "...", filePath: "..." })

// After mistakes
codebase.report_violation({ type: "...", file: "...", whatHappened: "..." })

// Other tools
codebase.query_learnings({ keywords: [...] })
codebase.get_violations_summary({})
codebase.record_learning({ type, trigger, action, source })
```

---

## Task Classification Matrix

| Signal Words | Task Type | Workflow | Priority |
|--------------|-----------|----------|----------|
| "fix", "broken", "bug", "error", "crash" | BUG_FIX | `1_triage.md` → `4_dev_complete.md` | P1-P2 |
| "still broken after fix", "sometimes works" | MULTI_PATH_BUG | Map paths → Fix each → Validate all | P1 |
| "slow", "regression", "performance", "timing" | PERFORMANCE_REGRESSION | `2_research.md` → Sequential Thinking → `4_dev_complete.md` | P0-P1 |
| "add", "implement", "create", "new feature" | NEW_FEATURE | `2_research.md` → `3_planning.md` → `4_dev_complete.md` | P2-P3 |
| "refactor", "clean up", "consolidate", "dedupe" | REFACTORING | `5_refactor.md` | P3-P4 |
| "docker", "deploy", "infrastructure", "fly.io" | INFRASTRUCTURE | Web Research → `4_dev_complete.md` | P2 |
| "test", "coverage", "edge case" | TESTING | `6_test.md` | P3 |
| "docs", "outdated", "stale" | DOC_HYGIENE | `8_doc_hygiene.md` | P4 |
| "P0", "production", "critical", "emergency" | HOTFIX | `7_hotfix.md` | P0 |
| "investigate", "why", "how does" | RESEARCH | `2_research.md` | P3 |
| "integration", "wiring", "gaps", "undone", "loose ends" | INTEGRATION_AUDIT | `2_research.md` → Roadmap → `4_dev_complete.md` | P2 |

---

## Context Detection

| Context Signal | Area | Rules File |
|----------------|------|------------|
| "VS Code", "extension", "activation" | `apps/vscode/` | `rules/10-vscode-rules.md` |
| "API", "endpoint", "backend", "database" | `apps/api/` | `rules/50-api-rules.md` |
| "web", "dashboard", "React", "Next.js" | `apps/web/` | See layer boundaries |
| "MCP", "server", "intelligence" | `apps/mcp-server/` | `rules/40-mcp-rules.md` |
| "auth", "integration", "3rd party" | Cross-cutting | `rules/50-api-rules.md` + `rules/40-mcp-rules.md` |
| "docker", "dockerfile", "deploy" | Infrastructure | `rules/30-docker-rules.md` |
| "test", "vitest", "coverage" | Testing | `rules/20-testing-rules.md` |

---

## Quick Workflow Paths

**Bug Fix (known cause):**
```
1_triage.md → 4_dev_complete.md → USER_VALIDATION
```

**Bug Fix (unknown cause):**
```
1_triage.md → 2_research.md → 4_dev_complete.md → USER_VALIDATION
```

**New Feature:**
```
2_research.md → 3_planning.md → 4_dev_complete.md
```

**Refactoring:**
```
5_refactor.md (includes TDD subset)
```

**Hotfix (P0):**
```
7_hotfix.md (compressed TDD, schedule full workflow post-deploy)
```

---

## Verification Gates (ALL Required)

**Don't declare complete until:**
- [ ] TypeScript compilation passes
- [ ] Unit tests pass
- [ ] No placeholder tests remain: `grep -rn 'expect(true).toBe(true)' test/`
- [ ] Manual testing confirms fix
- [ ] User validates

**Critical Rule:** `Compilation Success ≠ Tests Pass ≠ Bug Fixed ≠ User Validated`

---

## Workflow Files

| # | File | Purpose | When to Use |
|---|------|---------|-------------|
| 1 | `workflows/1_triage.md` | Issue assessment, classification | First step for bugs |
| 2 | `workflows/2_research.md` | Investigation, root cause | Unknown problems |
| 3 | `workflows/3_planning.md` | Architecture audit, design | Before implementation |
| 4 | `workflows/4_dev_complete.md` | **CANONICAL TDD** - RED/GREEN/REFACTOR | Implementation |
| 5 | `workflows/5_refactor.md` | Code quality, consolidation | Tech debt |
| 6 | `workflows/6_test.md` | Coverage gaps, edge cases | Test-only tasks |
| 7 | `workflows/7_hotfix.md` | Emergency production fixes | P0 incidents |
| 8 | `workflows/8_doc_hygiene.md` | Doc cleanup, staleness removal | Periodic |

---

## Directory Structure

```
ai_dev_utils/
├── ROUTER.md                 # THIS FILE - Task routing (lean)
├── ARCHITECTURE.md           # System boundaries, layers
├── CONSTRAINTS.md            # Hard rules, enforcement
├── rules/                    # 🆕 Path-targeted modular rules
│   ├── 00-index.md           # Core rules (always loaded)
│   ├── 10-vscode-rules.md    # globs: apps/vscode/**
│   ├── 20-testing-rules.md   # globs: **/*.test.ts
│   ├── 30-docker-rules.md    # globs: **/Dockerfile*
│   ├── 40-mcp-rules.md       # globs: ai_dev_utils/mcp/**
│   └── 50-api-rules.md       # globs: apps/api/**
├── workflows/                # Execution workflows
├── patterns/                 # Learned patterns (auto-promoted)
├── feedback/                 # Learning system
├── state/                    # Current task state
└── mcp/                      # Internal MCP server
```

---

## Learning Integration

| Threshold | Action | Location |
|-----------|--------|----------|
| 1x seen | Store | `patterns/violations.jsonl` |
| 3x seen | Promote | `patterns/codebase-patterns.md` |
| 5x seen | Automate | Pre-commit hook + CI check |

**Record learning:** `./ai_dev_utils/scripts/learn.sh [type] [trigger] [action] [source]`

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

---

## Integration Audit Checklist

**Use when routing INTEGRATION_AUDIT tasks:**

- [x] **Auth consistency:** All services use `@snapback/auth` (24 files verified 2025-12-21)
- [x] **Service layer P1+P2:** Dashboard (7 procs), Analytics (8 procs), Feedback (2 procs) - ALL REFACTORED (2025-12-21)
- [x] **Service layer P3-P4:** 18 remaining procedures deferred to next phase
- [x] **3rd party wiring:** Stripe ✅ single init | PostHog ✅ single canonical init
- [x] **TODO audit:** 31 TODOs remain (mostly feature stubs, not integration gaps)
- [x] **Type safety:** Critical `as any` casts fixed (7 remain in Hono patterns - C-015)

**Known Integration Debt (2025-12-21):**
| ID | Gap | Location | Status |
|----|-----|----------|--------|
| INT-001 | MCP HTTP auth placeholder | `apps/mcp-server/src/http-server.ts` | ✅ FIXED (2025-12-21) |
| INT-002 | Service layer extraction | 40+ procedures → services | ✅ **P1+P2 COMPLETE** (17/35 procs + 3 services) **P3-P4 DEFERRED** |
| INT-003 | Stripe health check TODO | `apps/api/src/routes/health.ts:49` | ✅ FIXED (2025-12-21) |
| INT-004 | Stale TODO(TICKET-128) | `apps/api/modules/apikeys/procedures/create-api-key.ts` | ✅ FIXED (2025-12-21) |
| INT-005 | SessionWithUser missing role | `packages/contracts/src/auth/session.ts`, `auth-unified.ts` | ✅ FIXED (2025-12-21) |
| INT-006 | PostHog duplicate inits | `apps/api/lib/posthog-server.ts` canonical | ✅ FIXED (2025-12-21) |
| INT-007 | Hono context as any casts | `apps/api/src/middleware/auth.ts` | LOW_PRIORITY (7 casts) |

---

**Last Verified:** 2025-12-21
**Status:** active
**Token Efficiency:** ~220 lines (down from 1363) + path-targeted rules
