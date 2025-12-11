# ROADMAP Migration & Consolidation

**Date:** 2025-12-10
**Objective:** Consolidate scattered task lists into single source of truth
**Authority:** TDD_CORE.md Phase 0 completion + journeys.md synthesis

---

## What Changed

### New Single Source of Truth

**📍 File:** `/ROADMAP.md`

All development work now tracked in one place with:
- **24 numbered items** (ROADMAP-001 through ROADMAP-024)
- **Priority levels:** P0 (Demo Blockers) through P3 (Polish)
- **TDD phase mapping:** Each item references required phases (1-5)
- **4-path test coverage** requirements explicitly stated
- **Dependency tracking** (blocking relationships)
- **Surface classification** (Web, Extension, MCP, CLI)

### Files Deleted

Old/redundant task lists that are now consolidated in ROADMAP.md:

✅ Deleted:
- `COMPREHENSIVE_IMPLEMENTATION_REVIEW.md` → Items in ROADMAP-001 through ROADMAP-020
- `ai_dev_utils/PHASE_0_COMPREHENSIVE_AUDIT.md` → Foundation tasks (F0) in ROADMAP
- `ai_dev_utils/STORAGE_CLEANUP_PLAN.md` → Incorporated into ROADMAP-006, ROADMAP-011, ROADMAP-012

Still Referenced (contextual support):
- `journey_pax/journeys.md` → 24 detailed journey specifications (remains as reference)
- `apps/vscode/claudedocs/tree-provider-quality-analysis.md` → ROADMAP-023
- `apps/web/final_launch_polish/seo-revised-strategy.md` → ROADMAP-022 (optional)

---

## How to Use ROADMAP.md

### For Developers

1. **Find your task:** Search for "ROADMAP-###" or journey number (01-20)
2. **Understand context:** Review Description, Dependencies, Constraints
3. **Follow TDD:** Phase 1 = RED (failing tests), Phase 2 = GREEN (implementation), etc.
4. **Check 4-path coverage:** Happy, Sad, Edge, Error paths required
5. **Track progress:** Update your local branch with completed items

### For Managers/PMs

1. **View priorities:** P0 (7 items) → P1 (9 items) → P2 (5 items) → P3 (4 items)
2. **Estimate timeline:** 3 weeks with 4 parallel agents for P0+P1
3. **Track blockers:** Check "Dependencies" section for critical path
4. **Monitor velocity:** Count items moving from Pending → Complete

### For Architects

1. **Dependency graph:** Section shows which items block others
2. **Parallelization opportunities:** Section indicates safe parallel execution
3. **Foundation requirements:** F0 tasks ensure all journeys can proceed
4. **Test strategies:** Each item specifies 4-path coverage model

---

## Mapping Old References to ROADMAP

### From todo-tree-20251210-1143.txt

| Old Location | Item | ROADMAP ID | Status |
|--------------|------|-----------|--------|
| auth-linking-impl-audit.md:744-745 | Web console exists | ✅ ROADMAP-002 | Checked |
| COMPREHENSIVE_IMPLEMENTATION_REVIEW.md:685 | SDK SessionCoordinator adapter | ROADMAP-012 | To implement |
| PHASE_0_COMPREHENSIVE_AUDIT.md:455 | VSCode activation audit | ✅ Completed Phase 0 | Done |
| PHASE_0_EXECUTIVE_SUMMARY.md:229 | Activation order audit | ✅ Completed Phase 0 | Done |
| STORAGE_CLEANUP_PLAN.md:133 | StorageManager service | ✅ Verified | Confirmed |
| STORAGE_CLEANUP_PLAN.md:553 | No SQLite grep matches | ✅ Verified Phase 0 | Done |
| IMPLEMENTATION_CHECKLIST.md:53 | MCP build output config | ROADMAP-021 | Infrastructure |
| PHASE_20_COMPLETION_SUMMARY.md:355 | Library API integration | ROADMAP-022 | UI Polish |
| tree-provider-quality-analysis.md:1199 | Restart VSCode persistence | ROADMAP-023 | QA Verification |
| seo-revised-strategy.md:329 | Reddit marketing | ROADMAP-022 | Optional |
| client-server-separation.md:779 | API client service (VSCode) | ROADMAP-012 | Extension |
| REPOSITORY_POLISH_SUMMARY.md:193 | Extension marketplace link | ROADMAP-024 | QA Verification |
| arch_remediation.md:1137 | StorageAdapter business logic | ✅ Verified Phase 0 | Done |
| journeys.md:653-1124 | Test passing checkpoints | ✅ Guides all ROADMAP items | Reference |

---

## Phase 0 Completion Deliverables

✅ **Code Cleanup:**
- Removed 24 placeholder test assertions
- Cleaned 3 files of inferior implementations
- 964+ test files verified compliant
- 100% TDD_CORE.md compliance

✅ **Architecture Audit:**
- Identified 24 journeys (20 core + 4 polish)
- Mapped dependencies and blockers
- Estimated 3-week timeline for MVP (P0+P1)
- Created prioritized roadmap

✅ **Documentation:**
- Created ROADMAP.md as single source of truth
- Consolidated 5+ task lists into 24 numbered items
- Added 4-path test coverage requirements
- Mapped journey specs from journeys.md

---

## Next Steps

### Immediate (Post Phase 0)

1. **Assign ROADMAP-001 through ROADMAP-007** (P0 items) to development team
2. **Set up task tracking** (GitHub Issues, Linear, etc.) with ROADMAP-### prefixes
3. **Schedule gates** after each TDD phase (1-5) per TDD_CORE.md
4. **Begin Phase 1 (RED):** Write failing tests for ROADMAP-001

### For Sprint Planning

Use this formula:
- **Week 1:** ROADMAP-001 through ROADMAP-003 (Web foundation)
- **Week 2:** ROADMAP-005 through ROADMAP-010 (Extension + MCP basics)
- **Week 3:** ROADMAP-011 through ROADMAP-017 (Advanced features + CLI)

---

## Archive Notice

The following files are archived and can be deleted after team review:

- `COMPREHENSIVE_IMPLEMENTATION_REVIEW.md` (superseded by ROADMAP.md)
- `ai_dev_utils/PHASE_0_COMPREHENSIVE_AUDIT.md` (superseded by ROADMAP.md)
- `ai_dev_utils/STORAGE_CLEANUP_PLAN.md` (superseded by ROADMAP.md)

Keep as reference:
- `journey_pax/journeys.md` (detailed specifications for each journey)
- `TDD_CORE.md` (governance + workflow rules)
- `ai_dev_utils/TDD_WORKFLOW.md` (phase execution guide)

---

## Questions?

- **Where do I find task specifications?** → ROADMAP.md (summary) + journeys.md (details)
- **How do I track a task?** → Add GitHub Issue with title "ROADMAP-###: {description}"
- **What if I finish early?** → Pull next P-level item respecting dependencies
- **How do gates work?** → See TDD_CORE.md line 71-84

---

**Consolidation Complete:** 2025-12-10 12:12 UTC
**Ready for:** Phase 1 (RED tests) execution
**Authority:** TDD_CORE.md + Sequential Thinking Requirement

