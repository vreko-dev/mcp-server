# Script Usage Frequency Audit

**Generated:** $(date +"%Y-%m-%d %H:%M:%S")  
**Purpose:** Identify unused/stale scripts for Phase 1 consolidation

---

## Methodology

1. Check git history for last modification date
2. Check invocations in CI workflows (.github/workflows/*.yml)
3. Check invocations in package.json scripts
4. Check cross-script dependencies
5. Categorize by usage frequency

---

## Results

### Script Inventory with Metadata

| Script | Last Modified | Days Ago | CI Usage | package.json | Lefthook | Risk Level |
|--------|---------------|----------|----------|--------------|----------|------------|
| `scripts/validate-oss-builds.js` | 2025-12-07 | 6 | NO | YES | NO | **MEDIUM** |
| `scripts/fixes/fix-router-paths.js` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/fixes/fix-syntax.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/fixes/fix-import-paths.js` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/fixes/fix-multiline.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/test-auth.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/verify-docs-migration.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-docker-turbo.js` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/validate-seo.js` | 2025-12-05 | 8 | NO | NO | NO | **LOW** |
| `scripts/force-rebuild.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-exports-integrity.mjs` | 2025-12-07 | 6 | NO | YES | NO | **MEDIUM** |
| `scripts/validate-env.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/improve-test-coverage.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-publish-no-ip-leak.mjs` | 2025-12-07 | 6 | NO | YES | NO | **MEDIUM** |
| `scripts/validate-publish.js` | 2025-12-07 | 6 | NO | YES | NO | **MEDIUM** |
| `scripts/docker/local-deploy-test.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/create-test-user-simple.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/types/diff.d.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/update-platform-imports.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/clean-build.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/create-todo-issues.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/archive/cleanup-docs.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/migrate-to-vitest.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/create-oss-app-repos.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/auto-group-commits.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/merge-packages.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/cleanup-unused-deps.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/replace-repo-references.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/flatten-monorepo.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/cleanup-documentation.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/fix-imports.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/setup-environments.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/package-changes.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/update-oss-readmes.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/replace-console-log.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/fix-oss-issues.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/initial-oss-sync.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/fix-lefthook.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/flatten-monorepo.ts` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/setup-oss-repo.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/sync-apps-to-oss.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/analyze-commits.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/reset-oss-history.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/migrate-to-vitest.ts` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/fix-barrel-exports.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/cleanup-repo.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/fix-esm-imports.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/create-oss-repos.sh` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/update-jest-imports.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/archive/fix-dollar-one.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/docker-validate.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-build.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/extract-contracts.sh` | 2025-12-02 | 11 | NO | NO | NO | **LOW** |
| `scripts/db-assert.ts` | 2025-12-01 | 12 | YES | YES | NO | **HIGH** |
| `scripts/extract-events.sh` | 2025-12-02 | 11 | NO | NO | NO | **LOW** |
| `scripts/ci/guard.sh` | 2025-12-01 | 12 | YES | NO | NO | **HIGH** |
| `scripts/ci/guard.test.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/fix-infrastructure-errors.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/quarantine-replay.ts` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/test-auth-flow.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/project-health-check.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/verify-build.js` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `scripts/check-framer-motion.js` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/extract-cli.sh` | 2025-12-02 | 11 | NO | NO | NO | **LOW** |
| `scripts/demo-readiness-check.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/docker-deploy.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-turbo-optimization.js` | 2025-12-07 | 6 | NO | NO | NO | **LOW** |
| `scripts/version.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/create-test-user.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/sync-oss-versions.ts` | 2025-12-05 | 8 | NO | YES | NO | **MEDIUM** |
| `scripts/remove-js-extensions.sh` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/create-test-user-simple.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/add-licenses.sh` | 2025-12-01 | 12 | YES | NO | NO | **HIGH** |
| `scripts/validate-infrastructure.ts` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/audit/script-usage-audit.sh` | 2025-12-13 | 0 | NO | NO | NO | **LOW** |
| `scripts/audit/analyze-mocks.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/audit/check-api-changes.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/audit/generate-mapping.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/audit/run-audit.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/audit/detect-test-smells.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/audit/analyze-coverage.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/__tests__/pre-publish.test.ts` | 2025-12-05 | 8 | NO | NO | NO | **LOW** |
| `scripts/check-api-boundary.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/recover-pre-publish.ts` | 2025-12-05 | 8 | NO | YES | NO | **MEDIUM** |
| `scripts/test-auth.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/quick-audit-demo.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/verify-migration-setup.sh` | 2025-12-04 | 9 | NO | NO | NO | **LOW** |
| `scripts/test-regex.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/generate-changesets-from-commits.mjs` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/session-gc.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-env.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-publish.ts` | 2025-12-07 | 6 | NO | NO | NO | **LOW** |
| `scripts/fix-biome.sh` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/docker-build.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-project.ts` | 2025-12-03 | 10 | NO | YES | NO | **MEDIUM** |
| `scripts/check-sqlite.ts` | 2025-12-04 | 9 | NO | YES | NO | **MEDIUM** |
| `scripts/posthog/__tests__/verify-posthog-setup.test.ts` | 2025-12-05 | 8 | NO | NO | NO | **LOW** |
| `scripts/posthog/src/setup-posthog-alerts.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/posthog/src/setup-posthog-cohorts.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/posthog/src/verify-posthog-setup.ts` | 2025-12-05 | 8 | NO | NO | NO | **LOW** |
| `scripts/posthog/src/run-correlation-analysis.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/extract-sdk.sh` | 2025-12-02 | 11 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/setup-oss-packages.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/migrate-sdk.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/migration-rollback.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/split-infrastructure.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/__tests__/infrastructure-split.test.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/__tests__/validate-oss-structure.test.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/__tests__/contracts-filter.test.ts` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/__tests__/sdk-migration.test.ts` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/run-migration.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/oss-migration/filter-contracts.sh` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/create-test-user.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/pre-publish.ts` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/validate-env.sh` | 2025-12-04 | 9 | NO | NO | NO | **LOW** |
| `scripts/publish-oss-packages.mjs` | 2025-12-06 | 7 | NO | YES | NO | **MEDIUM** |
| `scripts/run-full-audit.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validate-docs.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/track-todos.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/test-auth-flow.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `scripts/validation/docker-config-red-tests.mjs` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/validation/docker-config.test.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `scripts/audit-session-layer.sh` | 2025-12-01 | 12 | YES | NO | NO | **HIGH** |
| `scripts/debug/debug-imports.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/debug/debug-env.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/debug/test-env.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/debug/debug-next-env.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/debug/test-lefthook.ts` | 2025-12-03 | 10 | NO | NO | NO | **LOW** |
| `scripts/debug/debug-false-positives.ts` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/debug/debug-env2.js` |  | 20436 | NO | NO | NO | **LOW** |
| `scripts/extract-todos.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `ops/scripts/docker-debug.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `ops/scripts/setup-hosts.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `ops/scripts/run-migrations.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `ops/scripts/docker-stop.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `ops/scripts/docker-start.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/tdd-gate.sh` | 2025-12-09 | 4 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/validate-rollout-prerequisites.sh` | 2025-12-13 | 0 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/validate-refactor-state.mjs` | 2025-12-11 | 2 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/pre-build-check.sh` | 2025-12-11 | 2 | NO | YES | NO | **MEDIUM** |
| `ai_dev_utils/scripts/execute-cleanup.sh` | 2025-12-13 | 0 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/tdd-report-violation.sh` | 2025-12-09 | 4 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/update-refactor-state.mjs` | 2025-12-11 | 2 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/validate-state.sh` | 2025-12-11 | 2 | NO | NO | NO | **LOW** |
| `ai_dev_utils/scripts/build-verify.sh` | 2025-12-11 | 2 | NO | YES | NO | **MEDIUM** |
| `ai_dev_utils/scripts/clean-build.sh` | 2025-12-11 | 1 | NO | YES | NO | **MEDIUM** |
| `ai_dev_utils/scripts/tdd-start.sh` | 2025-12-09 | 4 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/monitor-vsix-size.js` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/launch-demo-vscode.sh` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/test-vsix-package.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/test-vsix.sh` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/verify-s1-tests.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/validate-manifest.js` | 2025-12-10 | 3 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/test-timeline-api.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/add-test-scripts.js` | 2025-12-04 | 9 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/build-package-json.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/build-package-json.mjs` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/run-e2e-tests.js` | 2025-12-04 | 9 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/stability-gate.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/pre-demo.sh` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/demo-readiness.sh` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/collect-load-metrics.js` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/check-bundle-size.js` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/audit-dependencies.js` | 2025-12-08 | 5 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/setup-git-hooks.js` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/enforce-performance-budget.js` | 2025-12-01 | 12 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/execute-runlist.js` | 2025-12-04 | 9 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/run-with-timeline-api.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/validate-recovery.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/vscode/scripts/validate-commands.js` | 2025-12-04 | 9 | NO | YES | NO | **MEDIUM** |
| `apps/vscode/scripts/run-e2e-tests.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/web/scripts/init-test-env.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/web/scripts/test-posthog-proxy.sh` | 2025-12-08 | 5 | NO | NO | NO | **LOW** |
| `apps/web/scripts/setup-local-subdomains.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/web/scripts/fix-typecheck-errors.sh` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `apps/web/scripts/fix-typecheck-errors.ts` | 2025-12-06 | 7 | NO | NO | NO | **LOW** |
| `tooling/scripts/config-drift-update.mjs` | 2025-12-09 | 4 | NO | YES | NO | **MEDIUM** |
| `tooling/scripts/scan-config-patterns.mjs` | 2025-12-13 | 0 | NO | NO | NO | **LOW** |
| `tooling/scripts/validate-catalog-deps.mjs` | 2025-12-09 | 4 | NO | YES | YES | **CRITICAL** |
| `tooling/scripts/check-package-versions.js` | 2025-12-08 | 5 | NO | NO | NO | **LOW** |
| `tooling/scripts/config-drift-check.mjs` | 2025-12-09 | 4 | NO | YES | YES | **CRITICAL** |
| `tooling/scripts/validate-workspace-deps.mjs` | 2025-12-09 | 4 | NO | NO | YES | **CRITICAL** |
| `tooling/scripts/validate-tsconfig-paths.mjs` | 2025-12-09 | 4 | NO | NO | YES | **CRITICAL** |
| `tooling/scripts/validate-tsup-config.mjs` | 2025-12-08 | 5 | NO | NO | YES | **CRITICAL** |
| `tooling/scripts/validate-relative-imports.mjs` | 2025-12-09 | 4 | NO | NO | YES | **CRITICAL** |
| `tooling/scripts/src/create-user.js` | 2025-12-08 | 5 | NO | NO | NO | **LOW** |
| `tooling/scripts/src/create-user.d.ts` | 2025-12-01 | 12 | NO | NO | NO | **LOW** |
| `tooling/scripts/src/create-user.ts` | 2025-12-08 | 5 | NO | NO | NO | **LOW** |

---

## Statistics Summary

- **Total Scripts:** 0
- **CI-Critical Scripts:** 0 (in GitHub workflows)
- **Package.json Scripts:** 0
- **Lefthook Scripts:** 0 (runs every commit)
- **Stale Scripts (>180 days):** 0
- **Potential Dead Code:** 0 (stale + low risk)

---

## Categorization

### CRITICAL Risk (Cannot Touch During Demo)
Scripts in Lefthook hooks - breaking these blocks all commits.

**Count:** 0

### HIGH Risk (CI Dependencies)
Scripts called by GitHub Actions workflows.

**Count:** 0

### MEDIUM Risk (Developer Workflows)
Scripts in package.json - breaking these disrupts dev experience.

**Count:** 0

### LOW Risk (Safe to Consolidate)
Manual/ad-hoc scripts with no automation dependencies.

**Candidates for Phase 1 removal:** 0

---

## Recommendations

### Immediate Actions (Phase 0)
1. **Freeze all CRITICAL and HIGH risk scripts** until post-demo
2. **Document demo-critical paths** (4 VSCode scripts identified)
3. **Create detailed dependency matrix** (see below)

### Phase 1 Post-Demo (Quick Wins)
1. **Remove 0 dead scripts** (stale + unused)
2. **Consolidate duplicate TS/JS pairs** (LOW risk only)
3. **Update documentation** for remaining scripts

### Phase 2+ (Systematic Consolidation)
1. Build system consolidation
2. Docker script unification
3. OSS extraction parameterization

---

## Next Steps

1. Review this audit with team
2. Verify demo-critical scripts are frozen
3. Generate cross-script dependency graph
4. Create migration plan for Phase 1

**Audit Location:** `/Users/user1/WebstormProjects/SnapBack-Site/.qoder/quests/audit/script-usage-frequency-20251213.md`

