# Documentation Cleanup Report

**Date**: December 2, 2025
**Status**: Analysis Complete - Ready for Action

---

## Executive Summary

Identified **25+ outdated files** that contradict current architecture decisions or are no longer relevant to active development. The primary issue is an **ADR (Architecture Decision Record) document in `/claudedocs/` that conflicts with the hybrid storage architecture** recently established.

**Critical files requiring deletion or modification**: 6
**Files requiring archival/consolidation**: 8
**Configuration files needing review**: 3

---

## Critical Issues

### 1. ⚠️ **MAJOR: ADR Document Conflicts (MUST UPDATE/DELETE)**

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/claudedocs/sdk-architecture-decisions.md`
**Status**: Contains 15 ADRs that conflict with current implementation
**Impact**: HIGH - Misleads developers about architecture decisions

#### Conflicting ADRs:

**ADR-002: SQLite as Local Storage**
- **Current State**: Says SQLite is standard across SDK
- **Reality**: Hybrid architecture - SDK uses SQLite, VS Code extension uses file-based storage
- **Line 40-81**: Needs complete revision or deletion

**ADR-003: Content Deduplication Strategy**
- **Current State**: Documents SHA-256 based deduplication with separate `snapshot_contents` table
- **Reality**: NO deduplication currently implemented (confirmed in `docs/architecture/storage-layer.md` lines 349-370)
- **Line 81-127**: Needs deletion or marked as "Rejected"

**ADR-014: Reference Counting for Garbage Collection**
- **Current State**: Documents `ref_count` field in `snapshot_contents` table with automatic GC
- **Reality**: Actual schema uses snapshots/file_changes/sessions with NO reference counting
- **Line 617-675**: Needs deletion - describes non-existent feature

**ADR-013: Platform Context and Capabilities**
- **Current State**: Documents PlatformContext interface with capability detection
- **Reality**: No evidence this pattern is actually used in codebase
- **Line 565-614**: Verify if implemented or delete

#### Action Items:
- [ ] **DELETE or DEPRECATE** ADR-003, ADR-014
- [ ] **REVISE** ADR-002 to document hybrid architecture clearly
- [ ] **VERIFY** ADR-013 is actually used in code
- [ ] Update document header to mark status: "⚠️ OUTDATED - See docs/architecture/storage-layer.md for current schema"

---

### 2. ⚠️ **Guardian Lite Documentation (OUTDATED)**

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/docs/architecture/README_GUARDIAN_LITE.md`
**Status**: Documents planned feature as "Phase 2" but focus has shifted
**Impact**: MEDIUM - Confuses developers about project priorities

**Issue**:
- Lines 162-173: States "Status: 🚧 Not yet implemented (planning phase)"
- References 4-week implementation timeline from previous planning
- Does NOT align with current testing focus (SessionManager, QoSService, EncryptionService)

**Similar Issues**:
- `docs/architecture/guardian-lite-interface.md` (lines 589-611): Also marked "Not yet implemented"
- `docs/architecture/guardian-lite-quick-ref.md`: Supporting doc for unimplemented feature

#### Action Items:
- [ ] **DELETE** all three Guardian Lite files if no current prioritization
- [ ] **OR MOVE** to ARCHIVE if documenting future feature roadmap
- [ ] Update related documentation that references Guardian Lite

---

## Secondary Issues

### 3. 📋 **Legacy Task Tracking Documents (ARCHIVE)**

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/DOC_CONSOLIDATION_STATUS.md`
**Status**: 322-line task tracking document from previous consolidation effort
**Impact**: LOW - Not actively used but takes up space

**Issue**:
- Lines 156-211: Contains "Remaining Phases" with tasks marked "NOT STARTED"
- Tracks archival work completed 2+ months ago
- No longer actionable

#### Action Items:
- [ ] **ARCHIVE** to `/ARCHIVE/2025-12-02/legacy-task-tracking/`
- [ ] Remove from root directory

---

### 4. 📁 **Outdated Root Directory Documentation**

**Files to Evaluate for Archival** (60+ files in root):

| File | Status | Action |
|------|--------|--------|
| `ARCHITECTURE.md` | Outdated | REVIEW - May be superseded by `docs/architecture/` |
| `ARCHITECTURE_REVIEW_FINDINGS.md` | Old audit | ARCHIVE |
| `AUTH_AUDIT_INDEX.md` | Old audit | ARCHIVE |
| `AUTH_CONSOLIDATION_AUDIT.md` | Old audit | ARCHIVE (41KB) |
| `BRANCH_CONSOLIDATION_REPORT.md` | Old task report | ARCHIVE |
| `COMPLETE_BRANCH_INTEGRATION_REPORT.md` | Old task report | ARCHIVE |
| `COMPLETE_PERFORMANCE_OPTIMIZATION_REPORT.md` | Old task report | ARCHIVE |
| `DEAD_CODE.md` | Analysis doc | VERIFY if still relevant |
| `DOCKER_ENV_AUDIT.md` | Old audit | ARCHIVE |
| `DOC_CONSOLIDATION_STATUS.md` | Task tracking | ARCHIVE |
| `ERROR_HANDLING_AUDIT.md` | Old audit (32KB) | ARCHIVE |
| `ERROR_HANDLING_INDEX.md` | Old index | ARCHIVE |
| `ERROR_HANDLING_OVERVIEW.md` | Old overview (31KB) | ARCHIVE |
| `ERROR_HANDLING_PROPOSAL.md` | Old proposal (51KB) | ARCHIVE |
| `EXTENSION_FIX_GUIDE.md` | Old guide | VERIFY/DELETE |
| `IMPLEMENTATION_COMPLETE.md` | Task marker | ARCHIVE |
| `IMPLEMENTATION_GAPS_ANALYSIS.md` | Old analysis | ARCHIVE |
| `IMPLEMENTATION_GAPS_QUICK_REF.md` | Old quick ref | ARCHIVE |
| `NOTIFICATION_EVALUATION_COMPLETION_REPORT.txt` | Old report | ARCHIVE |
| `NOTIFICATION_EVALUATION_INDEX.md` | Old index | ARCHIVE |
| `NOTIFICATION_MIGRATION_TECHNICAL_GUIDE.md` | Old guide (22KB) | ARCHIVE |
| `NOTIFICATION_SYSTEM_MATURITY_EVALUATION.md` | Old evaluation | ARCHIVE |
| `PACKAGE_ANALYSIS.md` | Old analysis | ARCHIVE |
| `PACKAGES_CONFIG_ANALYSIS.md` | Old analysis (28KB) | ARCHIVE |
| `PATCHWORK_FIXES_ROADMAP.md` | Old roadmap | ARCHIVE |
| `PROTECTION_ARCHITECTURE_INVESTIGATION.md` | Old investigation (37KB) | ARCHIVE |
| `SDK-MIGRATION-BRUTAL-ASSESSMENT.md` | Old assessment (31KB) | ARCHIVE |
| `SDK-MIGRATION-FINAL-SCORECARD.md` | Old scorecard | ARCHIVE |
| `SDK_ARCHITECTURE_AUDIT_PHASE12_COMPLETE.md` | Old phase report | ARCHIVE |
| `SDK_ARCHITECTURE_AUDIT_PHASE13_COMPLETE.md` | Old phase report | ARCHIVE |
| `SDK_ARCHITECTURE_AUDIT_PHASE14_COMPLETE.md` | Old phase report | ARCHIVE |
| `SDK_MIGRATION_AUDIT.md` | Old audit (35KB) | ARCHIVE |
| `STORAGE_REVIEW_FINAL_STATUS.md` | Old review | ARCHIVE |
| `STORAGE_REVIEW_REPORT.md` | Old report (31KB) | ARCHIVE |
| `TODO_*.md` (6 files) | Old TODO tracking | ARCHIVE |
| `VSCODE_EXTENSION_DUE_DILIGENCE_AUDIT.md` | Old audit (39KB) | ARCHIVE |
| `WHEEL_ANALYSIS_INDEX.md` | Old analysis | ARCHIVE |

**Total size for potential archival**: ~500KB+

---

### 5. 🗂️ **Legacy Directories (Already Scheduled for Archival)**

Per `DOC_CONSOLIDATION_STATUS.md` (which itself is outdated):

**Status**: Already identified but not yet removed

- `/claudedocs/` - ~30 files, mostly SDK documentation
- `/builder_pack/` - ~15 files, mostly builder utilities

**Action Items**:
- [ ] Delete `/claudedocs/` directory (archive content first if needed)
- [ ] Delete `/builder_pack/` directory (archive content first if needed)

---

### 6. ⚙️ **Config Files Review**

**Possibly Obsolete Configurations**:

| File | Usage | Action |
|------|-------|--------|
| `apps/web/playwright.config.js` | Duplicate? | CHECK - also has `.ts` version |
| `apps/web/playwright.smoke.config.js` | Duplicate? | CHECK - also has `.ts` version |
| `apps/vscode/playwright.config.js` | Duplicate? | CHECK - also has `.ts` version |
| `apps/vscode/svgo.config.js` | Duplicate? | CHECK - also has `.mjs` version |

**Action Items**:
- [ ] Verify `.js` files are not redundant copies of `.ts`/`.mjs` versions
- [ ] Delete duplicates if confirmed

---

## Detailed Recommendations

### Priority 1: DELETE/MODIFY (This Week)

1. **claudedocs/sdk-architecture-decisions.md**
   - Options:
     - A) DELETE entirely (information is outdated/wrong)
     - B) MARK as deprecated and move to archive
     - C) REVISE all 15 ADRs to match current implementation
   - **Recommendation**: Move to archive, keep as historical record

2. **docs/architecture/README_GUARDIAN_LITE.md**
   - **docs/architecture/guardian-lite-interface.md**
   - **docs/architecture/guardian-lite-quick-ref.md**
   - **Recommendation**: DELETE all three unless Guardian Lite is actively being developed
   - **Or**: Move to ARCHIVE/roadmap/ if these are future plans

### Priority 2: ARCHIVE (Next Week)

Create `/ARCHIVE/2025-12-02/documentation-cleanup/` and move:
- All 60+ outdated markdown files from root directory
- DOC_CONSOLIDATION_STATUS.md (ironically, this document tracks archival)
- claudedocs/ directory contents (if not deleted)

### Priority 3: VERIFY (Before Next Phase)

Review these files to confirm they're still accurate:
- `ARCHITECTURE.md` (may duplicate `docs/architecture/` content)
- `DEAD_CODE.md` (verify findings are still valid)
- `EXTENSION_FIX_GUIDE.md` (verify VS Code extension still uses these fixes)
- Any file referencing Guardian Lite or removed features

---

## Files to Keep (Essential)

**Root Directory** (9 essential files):
- ✅ `README.md` - Project overview
- ✅ `CONTRIBUTING.md` - Development guide (70KB)
- ✅ `CLAUDE.md` - Architecture overview
- ✅ `PROJECT_MAINTENANCE_GUIDE.md` - Operations
- ✅ `QUICKSTART.md` - Quick start guide
- ✅ `Makefile` - Build automation
- ✅ `.snapbackrc` - Configuration
- ✅ `.gitignore` - Git configuration
- ✅ `renovate.json` - Dependency updates

**docs/architecture/** (Currently useful):
- ✅ `README.md` - Architecture index
- ✅ `authentication.md` - Auth architecture
- ✅ `better-auth-api-key-integration.md` - API key details
- ✅ `storage-layer.md` - Storage architecture (CANONICAL - references to keep)
- ✅ `event-bus.md` - Event system
- ✅ `detection-engine.md` - Detection logic
- ⚠️ `client-server-separation.md` - Verify if current
- ⚠️ `bundling-architecture-diagram.md` - Verify if current
- ⚠️ `mcp-bundling-strategy.md` - Verify if current

---

## Immediate Action Items

### Before Next Session:

```
[ ] 1. Decision: Guardian Lite docs - DELETE or ARCHIVE?
[ ] 2. Decision: ADR document - UPDATE, ARCHIVE, or DELETE?
[ ] 3. Move DOC_CONSOLIDATION_STATUS.md to archive (no longer needed)
[ ] 4. Create ARCHIVE/2025-12-02/ structure for old documentation
```

### For Next Week:

```
[ ] 5. Audit all remaining /docs/architecture/ files for accuracy
[ ] 6. Consolidate root .md files - keep only 9 essential
[ ] 7. Delete /claudedocs/ and /builder_pack/ directories
[ ] 8. Remove duplicate .js config files
[ ] 9. Update CONTRIBUTING.md to reference new documentation structure
[ ] 10. Run link checker to verify no broken references
```

---

## Related Memories

- **Testing Completed**: SessionManager, QoSService, EncryptionService test files created
- **Architecture Decision**: Hybrid storage (SDK=SQLite, VSCode=file-based)
- **Current Focus**: Test infrastructure cleanup, not feature development

---

**Generated**: 2025-12-02
**Recommendation**: Begin with Priority 1 items
**Estimated cleanup time**: 2-3 hours for deletion, 4-6 hours for archival + verification
