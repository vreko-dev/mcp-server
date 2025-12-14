# Script Consolidation & Simplification Design

## Executive Summary

This design document analyzes 100+ scripts across the SnapBack repository and identifies opportunities for consolidation, simplification, and standardization while maintaining the same functionality.

**Key Findings:**
- 25 shell scripts and 61 TypeScript/JavaScript scripts reviewed
- Identified 12 high-priority consolidation opportunities
- Potential reduction: ~40% of script files through merging similar functionality
- Recommended approach: Unified CLI tool for common operations

---

## Current Script Inventory

### Location Distribution

| Directory | Shell Scripts | JS/TS Scripts | Total |
|-----------|--------------|---------------|-------|
| scripts/ | 14 | 47 | 61 |
| ops/scripts/ | 5 | 0 | 5 |
| ai_dev_utils/scripts/ | 10 | 0 | 10 |
| apps/vscode/scripts/ | 8 | 0 | 8 |
| apps/web/scripts/ | 3 | 0 | 3 |
| root | 6 | 0 | 6 |
| tooling/scripts/ | 0 | 7 | 7 |

### Critical CI/CD Dependencies

These scripts are invoked by GitHub Actions workflows and cannot be modified without CI coordination:

| Script | Workflow | Usage | Risk |
|--------|----------|-------|------|
| tooling/scripts/config-drift-check.mjs | .lefthook.yml (pre-commit) | Configuration validation | **CRITICAL** |
| tooling/scripts/validate-tsup-config.mjs | .lefthook.yml (pre-commit) | Build config validation | **HIGH** |
| tooling/scripts/validate-tsconfig-paths.mjs | .lefthook.yml (pre-commit) | TS path validation | **HIGH** |
| tooling/scripts/validate-relative-imports.mjs | .lefthook.yml (pre-commit) | Import boundary check | **HIGH** |
| tooling/scripts/validate-workspace-deps.mjs | .lefthook.yml (pre-commit) | Dependency validation | **HIGH** |
| tooling/scripts/validate-catalog-deps.mjs | .lefthook.yml (pre-commit) | Catalog deps check | **MEDIUM** |
| ops/scripts/run-migrations.sh | 4 docker-compose files | Database migrations | **CRITICAL** |
| scripts/add-licenses.sh | validate-architecture.yml | License enforcement | **LOW** |

**⚠️ WARNING:** These scripts run on **every commit** via Lefthook. Breaking them blocks all development.

### Demo-Critical Scripts

Scripts referenced in demo workflows that must remain stable:

| Script | Purpose | Last Modified | Demo Blocker? |
|--------|---------|---------------|---------------|
| apps/vscode/scripts/test-vsix.sh | Package validation | Unknown | **YES** |
| apps/vscode/scripts/launch-demo-vscode.sh | Demo launcher | Unknown | **YES** |
| apps/vscode/scripts/pre-demo.sh | Pre-demo setup | Unknown | **YES** |
| scripts/demo-readiness-check.sh | Demo validation | Unknown | **NO** (check only) |

**Recommendation:** Freeze these scripts until post-demo (Phase 2+)

---

## Consolidation Opportunities

### Priority 1: High-Impact Mergers

#### 1. Environment Validation Scripts

**Current State:**
- scripts/validate-env.sh (131 lines)
- scripts/validate-env.js (18 lines)
- scripts/validate-env.ts (20 lines)

**Analysis:**
All three scripts validate environment variables but use different approaches:
- Shell script: Manual validation with environment-specific rules
- JS/TS scripts: Import from centralized config package

**Consolidation Strategy:**
Merge into single TypeScript implementation with CLI interface

**Proposed Structure:**
```
scripts/validate-env.ts (consolidated)
├── CLI entry point with --environment flag
├── Imports from @snapback/config
├── Supports development/staging/production modes
└── Colored terminal output
```

**Benefits:**
- Single source of truth
- Type-safe validation
- Centralized config schema
- Reduced maintenance overhead

**Effort:** Low | **Impact:** Medium | **Risk:** Low

---

#### 2. Build Validation Scripts

**Current State:**
- scripts/validate-build.sh (79 lines) - Validates TypeScript builds
- scripts/verify-build.js (36 lines) - Checks individual package builds
- scripts/clean-build.js (73 lines) - Cleans build artifacts
- scripts/force-rebuild.js (30 lines) - Forces clean rebuild

**Analysis:**
These scripts form a build lifecycle but are disconnected:
- validate-build.sh: Checks all packages for dist/ output
- verify-build.js: Package-level verification
- clean-build.js: Removes dist/ and tsbuildinfo
- force-rebuild.js: Orchestrates clean + build + verify

**Consolidation Strategy:**
Create unified build utility with subcommands

**Proposed Structure:**
```
scripts/build-tools.ts
├── validate    - Validate all package builds
├── verify      - Verify specific package
├── clean       - Clean artifacts (--deep flag)
└── rebuild     - Force clean rebuild
```

**Benefits:**
- Single entry point for build operations
- Consistent error handling
- Shared package list configuration
- Easier to extend with new build operations

**Effort:** Low | **Impact:** High | **Risk:** Low

---

#### 3. Docker Management Scripts

**Current State:**
- scripts/docker-build.sh (179 lines)
- scripts/docker-deploy.sh (325 lines)
- scripts/docker-validate.sh (348 lines)
- ops/scripts/docker-start.sh (223 lines)
- ops/scripts/docker-stop.sh (67 lines)
- ops/scripts/docker-debug.sh (166 lines)

**Analysis:**
Six separate Docker scripts with overlapping functionality:
- Duplicate environment validation logic
- Duplicate Docker daemon checks
- Duplicate colored output functions
- Duplicate health check logic

**Consolidation Strategy:**
Create modular Docker CLI with shared utilities

**Proposed Structure:**
```
scripts/docker.ts (unified CLI)
├── Subcommands:
│   ├── build      - Build images (prod/dev/both)
│   ├── deploy     - Deploy services with health checks
│   ├── validate   - Validate configuration
│   ├── start      - Start services
│   ├── stop       - Stop services
│   └── debug      - Collect debug information
└── Shared Modules:
    ├── validate-env.ts
    ├── check-docker.ts
    ├── health-check.ts
    └── logger.ts (colored output)
```

**Benefits:**
- Eliminate 800+ lines of duplicate code
- Consistent user experience
- Single point of maintenance
- Shared validation logic

**Effort:** Medium | **Impact:** High | **Risk:** Medium

---

#### 4. Test User Creation Scripts

**Current State:**
- scripts/create-test-user.ts (59 lines)
- scripts/create-test-user.js (52 lines)
- scripts/create-test-user-simple.ts (84 lines)
- scripts/create-test-user-simple.js (73 lines)

**Analysis:**
Four scripts doing essentially the same task:
- Two pairs of identical TS/JS versions
- "Simple" version uses direct DB, regular uses Auth API
- All create same test user with same credentials

**Consolidation Strategy:**
Single TypeScript script with strategy flag

**Proposed Structure:**
```
scripts/create-test-user.ts
├── --method=auth  (Better Auth API)
└── --method=db    (Direct database)
```

**Benefits:**
- Eliminate 268 lines of duplicate code
- Single maintenance point
- Unified error handling
- Better testing coverage

**Effort:** Low | **Impact:** Low | **Risk:** Low

---

#### 5. Publishing Validation Scripts

**Current State:**
- scripts/validate-publish.ts (109 lines)
- scripts/validate-publish.js (101 lines)

**Analysis:**
Identical functionality in TS and JS formats

**Consolidation Strategy:**
Keep TypeScript version only (more maintainable)

**Benefits:**
- Eliminate 101 lines
- Type safety for package.json manipulation
- Single source of truth

**Effort:** Low | **Impact:** Low | **Risk:** Low

---

#### 6. OSS Package Extraction Scripts

**Current State:**
- scripts/extract-cli.sh (164 lines)
- scripts/extract-sdk.sh (138 lines)
- scripts/extract-contracts.sh (84 lines)
- scripts/extract-events.sh (99 lines)
- scripts/extract-todos.sh (likely similar pattern)

**Analysis:**
All scripts follow identical pattern:
1. Check OSS repo exists
2. rsync package files (excluding build artifacts)
3. Update package.json (set private=false, add publish config)
4. Generate README.md
5. Print manual review instructions

**Consolidation Strategy:**
Single parameterized extraction script

**Proposed Structure:**
```
scripts/extract-oss-package.ts
├── --package=cli|sdk|contracts|events
├── Package-specific configuration in JSON/YAML
├── Template-based README generation
└── Automated validation checks
```

**Benefits:**
- Eliminate 400+ lines of duplicate code
- Consistent extraction process
- Easier to add new packages
- Single point for OSS publishing rules

**Effort:** Medium | **Impact:** Medium | **Risk:** Low

---

### Priority 2: Medium-Impact Consolidations

#### 7. Package.json Script Simplification

**Current package.json scripts (176 total)** have several areas for consolidation:

**Build Scripts (12 variations):**
```json
Current:
"build": "turbo build"
"build:pre-check": "./ai_dev_utils/scripts/pre-build-check.sh"
"build:verify": "./ai_dev_utils/scripts/build-verify.sh"
"build:safe": "./ai_dev_utils/scripts/pre-build-check.sh --fix && pnpm build"
"build:mcp": "pnpm -w --filter @snapback/mcp-server run build"
"build:oss": "pnpm --filter '@snapback/contracts' ... run build"
"build:affected": "turbo run build --filter=...[origin/main]"

Proposed:
"build": "tsx scripts/build.ts"
"build:check": "tsx scripts/build.ts --check"
"build:safe": "tsx scripts/build.ts --safe"
"build:filter": "tsx scripts/build.ts --filter"
```

**Publishing Scripts (14 variations):**
All `publish:*` scripts could be consolidated into:
```json
"publish": "tsx scripts/publish.ts"
"publish:oss": "tsx scripts/publish.ts --target=oss"
"publish:mcp": "tsx scripts/publish.ts --package=mcp-server"
```

**Benefits:**
- Reduce script count from 176 to ~100
- Consistent interface
- Easier discoverability
- Better error handling

---

#### 8. AI Dev Utils Scripts

**Current State:**
10 scripts in ai_dev_utils/scripts/:
- build-verify.sh
- clean-build.sh
- execute-cleanup.sh
- pre-build-check.sh
- tdd-gate.sh
- tdd-report-violation.sh
- tdd-start.sh
- validate-rollout-prerequisites.sh
- validate-state.sh

**Analysis:**
These appear to be workflow automation scripts. Several could be merged:
- TDD scripts (tdd-gate.sh, tdd-report-violation.sh, tdd-start.sh)
- Build scripts (build-verify.sh, pre-build-check.sh, clean-build.sh)
- Validation scripts (validate-rollout-prerequisites.sh, validate-state.sh)

**Consolidation Strategy:**
Group into three main workflows:
```
ai_dev_utils/scripts/
├── tdd-workflow.sh      (merged from 3 TDD scripts)
├── build-workflow.sh    (merged from 3 build scripts)
└── validate-workflow.sh (merged from 2 validation scripts)
```

**Benefits:**
- Reduce from 10 to 3 scripts
- Clear workflow boundaries
- Easier to understand relationships

**Effort:** Low | **Impact:** Medium | **Risk:** Low

---

### Priority 3: Low-Impact Optimizations

#### 9. VSCode Extension Scripts

**Current State:**
8 scripts in apps/vscode/scripts/:
- consolidate.sh
- demo-readiness.sh
- launch-demo-vscode.sh
- pre-demo.sh
- run-with-timeline-api.sh
- stability-gate.sh
- test-vsix-package.sh
- test-vsix.sh

**Analysis:**
Demo and testing scripts could be consolidated:
- Demo scripts: demo-readiness.sh, launch-demo-vscode.sh, pre-demo.sh
- VSIX testing: test-vsix-package.sh, test-vsix.sh

**Consolidation Strategy:**
```
apps/vscode/scripts/
├── demo.sh --prepare|--launch|--check
└── test-vsix.sh --package|--install
```

**Benefits:**
- Reduce from 8 to 4 scripts
- Clearer demo workflow
- Unified VSIX testing

**Effort:** Low | **Impact:** Low | **Risk:** Low

---

#### 10. Web App Scripts

**Current State:**
4 scripts in apps/web/scripts/:
- fix-typecheck-errors.sh
- setup-local-subdomains.sh
- test-posthog-proxy.sh
- run-tests.sh (in parent directory)

**Analysis:**
These are app-specific utilities and don't have obvious consolidation targets. However, they could benefit from:
- Consistent error handling
- Shared logging utilities
- TypeScript migration for better maintainability

**Recommendation:**
Keep separate but standardize with shared utilities library

---

## Recommended Implementation Plan

### ⚠️ CRITICAL: Demo Timeline Alignment

**Current Situation:**
- Original plan: 10-week rollout
- Your demo sprint: Imminent
- **Conflict:** Cannot consolidate demo-critical scripts before demo

**Revised Timeline:**

### Phase 0: Pre-Demo Freeze (Now - Demo Day)
**Duration:** Until demo completed
**Goal:** Zero risk to demo workflow

**Allowed Changes:**
- ✅ Documentation updates only
- ✅ Dead code identification (no deletion)
- ✅ Detailed dependency mapping
- ❌ NO script consolidation
- ❌ NO CI/CD workflow changes
- ❌ NO package.json script changes

**Deliverables:**
1. Script dependency matrix (see below)
2. Usage frequency audit
3. Demo-critical path documentation
4. Post-demo consolidation backlog

### Phase 1: Post-Demo Quick Wins (Demo Day + 1 week)
**Risk Level:** LOW
**Goal:** High-value, zero-impact consolidations

1. **Duplicate File Removal** (2 days)
   - validate-env.ts (remove .js - not in CI)
   - validate-publish.ts (remove .js - not in CI)
   - create-test-user.ts (merge 4 versions - dev-only)

2. **Dead Script Cleanup** (1 day)
   - Remove scripts with no git history in last 6 months
   - Remove scripts not called by CI/package.json/other scripts

3. **Documentation** (2 days)
   - Update script inventory
   - Document entry points
   - Add deprecation warnings to old scripts

**Expected Reduction:** ~400 lines
**CI Risk:** ZERO (no CI dependencies touched)

### Phase 2: Build System (Week 3-4)
**Risk Level:** MEDIUM
**Goal:** Consolidate build utilities

1. Create unified build-tools.ts
2. Consolidate clean/verify/rebuild scripts
3. Create wrapper aliases for backward compatibility
4. Update package.json scripts (with team notice)
5. Parallel run period (1 week)

**Expected Reduction:** ~150 lines
**CI Risk:** LOW (build scripts not in critical path)

### Phase 3: Docker Consolidation (Week 5-7)
**Risk Level:** HIGH
**Goal:** Unified Docker operations

**Prerequisites:**
- All demo workflows complete
- Staging environment available for testing
- Rollback procedure documented

**Steps:**
1. Create shared Docker utilities module (week 5)
2. Migrate scripts to TypeScript CLI (week 6)
3. Add comprehensive testing (week 6)
4. Parallel run in staging (week 7)
5. Production deployment (week 7 end)

**Expected Reduction:** ~600 lines
**CI Risk:** MEDIUM (Docker used in deploy workflows)

### Phase 4: OSS Extraction (Week 8-9)
**Risk Level:** LOW
**Goal:** Parameterized OSS package extraction

1. Create template-based extraction script
2. Move package configs to JSON/YAML
3. Add validation checks
4. Deprecate old extraction scripts

**Expected Reduction:** ~400 lines
**CI Risk:** LOW (manual process, not in CI)

---

## Shared Utilities Library

Create `scripts/lib/` with reusable components:

### Directory Structure
```
scripts/
├── lib/
│   ├── logger.ts           - Colored console output
│   ├── docker-utils.ts     - Docker daemon checks
│   ├── env-validator.ts    - Environment validation
│   ├── health-check.ts     - Service health checking
│   ├── file-system.ts      - File operations
│   └── package-manager.ts  - pnpm/npm operations
├── build-tools.ts          - Unified build commands
├── docker.ts               - Unified Docker commands
├── publish.ts              - Unified publishing
├── validate-env.ts         - Environment validation
└── create-test-user.ts     - Test user creation
```

### Benefits of Shared Library
- Eliminate duplicate code across scripts
- Consistent error handling
- Easier testing
- Type-safe operations
- Better developer experience

---

## Migration Strategy

### Safety Measures
1. Keep old scripts during transition period
2. Add deprecation warnings to old scripts
3. Run both old and new versions in parallel initially
4. Comprehensive testing before removal

### Rollout Process
```
Week 1-2: Implement new consolidated scripts
Week 3-4: Test in development environment
Week 5-6: Deploy to CI/CD pipeline
Week 7-8: Monitor and collect feedback
Week 9:   Deprecate old scripts
Week 10:  Remove deprecated scripts
```

### Testing Requirements
- Unit tests for all shared utilities
- Integration tests for CLI commands
- E2E tests for critical workflows (build, deploy, publish)
- CI pipeline verification

---

## Risk Assessment

### High Risk Areas
1. **Docker scripts**: Critical for deployment
   - **Mitigation**: Extensive testing, parallel run period

2. **Publishing scripts**: Financial/legal impact
   - **Mitigation**: Dry-run mode, manual approval gates

3. **Build scripts**: Affects all developers
   - **Mitigation**: Gradual rollout, clear documentation

### Low Risk Areas
1. Test user creation (dev-only)
2. Environment validation (read-only)
3. OSS extraction (manual process)

---

## Expected Benefits

### Quantitative
- **Lines of Code Reduction:** ~1,500 lines (40% reduction)
- **Script Count Reduction:** 86 → ~50 scripts
- **Maintenance Time Saved:** ~20% (fewer files to update)
- **Build Time Impact:** Neutral (same operations, different interface)

### Qualitative
- **Developer Experience:** Improved discoverability and consistency
- **Onboarding:** Easier for new developers to understand
- **Reliability:** Better error handling and validation
- **Testing:** More comprehensive test coverage
- **Documentation:** Centralized command reference

---

## Alternative Approaches Considered

### Alternative 1: Keep All Scripts Separate
**Pros:** No migration risk, familiar to current team
**Cons:** Continued duplication, maintenance burden
**Verdict:** Not recommended

### Alternative 2: Use External Task Runner (Make/Just)
**Pros:** Industry standard, powerful features
**Cons:** Learning curve, another tool to manage
**Verdict:** Could complement TypeScript CLI

### Alternative 3: Migrate All to Package.json Scripts
**Pros:** No separate script files
**Cons:** Poor readability, limited functionality
**Verdict:** Not suitable for complex operations

---

## Success Metrics

### Phase 1 Success Criteria
- All duplicate TS/JS scripts removed
- CI pipeline still passing
- No developer complaints about missing functionality

### Phase 2 Success Criteria
- Build scripts consolidated and tested
- Documentation updated
- Team training completed

### Phase 3 Success Criteria
- Docker operations working in production
- Rollback procedure tested
- Monitoring confirms no issues

### Final Success Criteria
- Script count reduced by 40%
- Developer survey shows improved satisfaction
- Maintenance incidents reduced
- Test coverage increased

---

## Script Dependency Matrix

### Entry Point Analysis

All scripts categorized by invocation method:

#### 1. CI/CD Invoked (CRITICAL - Cannot break)
```
✓ tooling/scripts/* (7 scripts) → Lefthook pre-commit hooks
✓ ops/scripts/run-migrations.sh → Docker entrypoints
✓ scripts/add-licenses.sh → validate-architecture.yml
```

#### 2. Package.json Invoked (HIGH - Developer workflows)
```
✓ scripts/validate-project.ts → pnpm validate
✓ scripts/validate-infrastructure.ts → pnpm validate:infrastructure
✓ scripts/publish-oss-packages.mjs → pnpm publish:oss
✓ scripts/pre-publish.ts → pnpm pre-publish
✓ scripts/sync-oss-versions.ts → pnpm sync-oss-versions
(See package.json for 20+ more references)
```

#### 3. Demo Scripts (HIGH - Until demo complete)
```
⚠️ apps/vscode/scripts/test-vsix.sh
⚠️ apps/vscode/scripts/launch-demo-vscode.sh
⚠️ apps/vscode/scripts/pre-demo.sh
⚠️ scripts/demo-readiness-check.sh
```

#### 4. Manual/Ad-hoc (LOW - Safe to consolidate)
```
✓ scripts/check-sqlite.ts
✓ scripts/create-test-user*.ts/js
✓ scripts/extract-*.sh (OSS extraction)
✓ scripts/quarantine-replay.ts
✓ Most scripts in scripts/debug/
```

#### 5. Deprecated/Dead (ZERO - Can remove)
```
TBD: Requires git blame analysis
Candidates: scripts/archive/* (35 items)
```

### Usage Frequency Audit

**Methodology:**
Run this to identify unused scripts:
```bash
# 1. Check git history for recent modifications
find scripts/ -name '*.sh' -o -name '*.ts' -o -name '*.js' | while read f; do
  LAST_MOD=$(git log -1 --format=%cd --date=short "$f" 2>/dev/null || echo "never")
  echo "$LAST_MOD | $f"
done | sort

# 2. Check invocations in CI
grep -r "scripts/" .github/workflows/ --include="*.yml" | cut -d: -f2 | sort -u

# 3. Check invocations in package.json
jq -r '.scripts | to_entries[] | .value' package.json | grep 'scripts/' | sort -u

# 4. Check invocations in other scripts
find scripts/ ops/scripts/ -type f | xargs grep -h 'scripts/' | grep -v '#' | sort -u
```

**Expected Dead Scripts:** 15-20 files (based on scripts/archive/ containing 35 items)

---

## Entry Point Preservation Strategy

For any consolidated script, maintain backward compatibility:

### Pattern 1: Wrapper Aliases (Recommended)
```bash
# Old: scripts/validate-env.sh
#!/bin/bash
echo "⚠️  DEPRECATED: Use 'tsx scripts/validate-env.ts' instead"
exec tsx scripts/validate-env.ts "$@"
```

### Pattern 2: Package.json Redirects
```json
{
  "scripts": {
    "validate:env": "tsx scripts/validate-env.ts",
    "validate-env": "pnpm validate:env"
  }
}
```

### Pattern 3: Symlinks (For CI)
```bash
# Preserve old paths for CI
ln -s scripts/lib/docker/cli.ts scripts/docker-build.sh
```

### Breaking Change Communication
For scripts called by developers manually:

1. Add deprecation warning (Week 1)
2. Update documentation (Week 1)
3. Team announcement (Week 2)
4. Remove old script (Week 4+)

Example warning:
```bash
echo "⚠️  DEPRECATED: This script will be removed in 2 weeks"
echo "   New command: pnpm docker:build"
echo "   Migration guide: docs/migration/script-consolidation.md"
sleep 3
```

---

## Open Questions

1. **Is this consolidation blocking demo work or is it post-demo optimization?**
   - **Answer:** Post-demo optimization
   - **Action:** Implement Phase 0 freeze immediately

2. **Which scripts touch the 11MB bundle size issue?**
   - **Analysis Required:** Check .github/workflows/deploy.yml lines 89-136
   - Bundle size check is inline in workflow, not a separate script
   - **Action:** No script consolidation needed for bundle issue

3. **Should we standardize on shell scripts or TypeScript for operational tasks?**
   - **Recommendation:** TypeScript for new scripts, preserve shell for CI/Docker
   - **Rationale:** Shell scripts have zero build step, critical for CI reliability

4. **How do we handle backward compatibility during transition?**
   - **Recommendation:** Wrapper aliases + 4-week deprecation period
   - **Exception:** CI scripts require 8-week notice + parallel runs

5. **Should consolidated scripts live in scripts/ or a new ops-cli/ package?**
   - **Recommendation:** Keep in scripts/ but create lib/ subdirectory
   - **Structure:** `scripts/lib/` for shared code, `scripts/*.ts` for CLIs

6. **Do we need a unified CLI entry point (snapback-dev command)?**
   - **Recommendation:** Yes, but Phase 3+ only (post-demo)
   - **Reason:** Adds dependency complexity, not worth risk during demo sprint

---

## Next Steps

1. **Review this design** with engineering team
2. **Prioritize consolidations** based on team feedback
3. **Create detailed technical specs** for each consolidation
4. **Set up testing environment** for parallel runs
5. **Begin Phase 1 implementation** with quick wins
6. **Document new script interfaces** in developer guide
7. **Schedule team training** on new tools
