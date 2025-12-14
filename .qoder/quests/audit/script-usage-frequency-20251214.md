# Script Usage Frequency Audit

**Generated:** 2025-12-14T03:24:05.704Z  
**Purpose:** Identify unused/stale scripts for Phase 1 consolidation

---

## Methodology

1. Check git history for last modification date
2. Check invocations in CI workflows (.github/workflows/*.yml)
3. Check invocations in package.json scripts
4. Check cross-script dependencies (Lefthook)
5. Categorize by usage frequency and risk level

---

## Results

### Script Inventory with Metadata

| Script | Last Modified | Days Ago | CI | package.json | Lefthook | Risk |
|--------|---------------|----------|----|--------------|---------
|------|
| `tooling/scripts/validate-tsup-config.mjs` | 2025-12-08 | 6 | ✗ | ✗ | ✓ | **CRITICAL** |
| `tooling/scripts/validate-workspace-deps.mjs` | 2025-12-09 | 5 | ✗ | ✗ | ✓ | **CRITICAL** |
| `tooling/scripts/validate-tsconfig-paths.mjs` | 2025-12-09 | 5 | ✗ | ✗ | ✓ | **CRITICAL** |
| `tooling/scripts/validate-relative-imports.mjs` | 2025-12-09 | 5 | ✗ | ✗ | ✓ | **CRITICAL** |
| `tooling/scripts/validate-catalog-deps.mjs` | 2025-12-09 | 5 | ✗ | ✓ | ✓ | **CRITICAL** |
| `tooling/scripts/config-drift-check.mjs` | 2025-12-09 | 5 | ✗ | ✓ | ✓ | **CRITICAL** |
| `scripts/db-assert.ts` | 2025-12-01 | 13 | ✓ | ✓ | ✗ | **HIGH** |
| `scripts/audit-session-layer.sh` | 2025-12-01 | 13 | ✓ | ✗ | ✗ | **HIGH** |
| `scripts/add-licenses.sh` | 2025-12-01 | 13 | ✓ | ✗ | ✗ | **HIGH** |
| `scripts/ci/guard.sh` | 2025-12-01 | 13 | ✓ | ✗ | ✗ | **HIGH** |
| `scripts/posthog/node_modules/@types/node/url.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/posthog/node_modules/@types/node/index.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/posthog/node_modules/@types/node/console.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `tooling/scripts/node_modules/nanoid/index.js` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `tooling/scripts/node_modules/nanoid/index.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `tooling/scripts/node_modules/@types/node/url.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `tooling/scripts/node_modules/@types/node/index.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `tooling/scripts/node_modules/@types/node/console.d.ts` | never | 9999 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/verify-build.js` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/test-vsix.sh` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/pre-demo.sh` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/monitor-vsix-size.js` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/launch-demo-vscode.sh` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/enforce-performance-budget.js` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/demo-readiness.sh` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/collect-load-metrics.js` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/check-bundle-size.js` | 2025-12-01 | 13 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/validate-project.ts` | 2025-12-03 | 11 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/check-sqlite.ts` | 2025-12-04 | 10 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/validate-commands.js` | 2025-12-04 | 10 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/execute-runlist.js` | 2025-12-04 | 10 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/sync-oss-versions.ts` | 2025-12-05 | 9 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/recover-pre-publish.ts` | 2025-12-05 | 9 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/validate-infrastructure.ts` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/quarantine-replay.ts` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/publish-oss-packages.mjs` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/pre-publish.ts` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/generate-changesets-from-commits.mjs` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/fix-biome.sh` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/check-framer-motion.js` | 2025-12-06 | 8 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/validate-publish.js` | 2025-12-07 | 7 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/validate-publish-no-ip-leak.mjs` | 2025-12-07 | 7 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/validate-oss-builds.js` | 2025-12-07 | 7 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/validate-exports-integrity.mjs` | 2025-12-07 | 7 | ✗ | ✓ | ✗ | **MEDIUM** |
| `apps/vscode/scripts/audit-dependencies.js` | 2025-12-08 | 6 | ✗ | ✓ | ✗ | **MEDIUM** |
| `tooling/scripts/config-drift-update.mjs` | 2025-12-09 | 5 | ✗ | ✓ | ✗ | **MEDIUM** |
| `ai_dev_utils/scripts/pre-build-check.sh` | 2025-12-11 | 3 | ✗ | ✓ | ✗ | **MEDIUM** |
| `ai_dev_utils/scripts/clean-build.sh` | 2025-12-11 | 3 | ✗ | ✓ | ✗ | **MEDIUM** |
| `ai_dev_utils/scripts/build-verify.sh` | 2025-12-11 | 3 | ✗ | ✓ | ✗ | **MEDIUM** |
| `scripts/posthog/node_modules/@types/node/zlib.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/worker_threads.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/wasi.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/vm.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/v8.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/util.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/tty.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/trace_events.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/tls.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/timers.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/test.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/string_decoder.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/stream.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/sqlite.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/sea.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/repl.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/readline.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/querystring.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/punycode.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/process.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/perf_hooks.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/path.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/os.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/net.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/module.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/inspector.generated.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/inspector.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/https.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/http2.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/http.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/globals.typedarray.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/globals.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/fs.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/events.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/domain.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/dns.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/diagnostics_channel.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/dgram.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/crypto.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/constants.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/cluster.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/child_process.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/buffer.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/buffer.buffer.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/async_hooks.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@types/node/assert.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@snapback/api-service/vitest.setup.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@snapback/api-service/vitest.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@snapback/api-service/tsup.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@snapback/api-service/test-paths.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/node_modules/@snapback/api-service/docker-entrypoint.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/test-env.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/debug-next-env.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/debug-imports.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/debug-false-positives.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/debug-env2.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/debug-env.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/script-usage-audit.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/update-oss-readmes.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/update-jest-imports.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/sync-apps-to-oss.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/setup-oss-repo.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/setup-environments.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/reset-oss-history.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/replace-repo-references.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/replace-console-log.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/package-changes.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/migrate-to-vitest.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/migrate-to-vitest.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/merge-packages.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/initial-oss-sync.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/flatten-monorepo.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/flatten-monorepo.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/fix-oss-issues.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/fix-lefthook.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/fix-imports.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/fix-esm-imports.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/fix-dollar-one.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/fix-barrel-exports.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/create-oss-repos.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/create-oss-app-repos.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/cleanup-unused-deps.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/cleanup-repo.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/cleanup-documentation.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/cleanup-docs.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/auto-group-commits.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/archive/analyze-commits.sh` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/nanoid/nanoid.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/nanoid/index.browser.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/zlib.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/worker_threads.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/wasi.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/vm.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/v8.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/util.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/tty.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/trace_events.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/tls.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/timers.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/test.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/string_decoder.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/stream.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/sqlite.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/sea.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/repl.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/readline.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/querystring.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/punycode.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/process.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/perf_hooks.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/path.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/os.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/net.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/module.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/inspector.generated.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/inspector.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/https.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/http2.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/http.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/globals.typedarray.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/globals.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/fs.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/events.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/domain.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/dns.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/diagnostics_channel.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/dgram.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/crypto.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/constants.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/cluster.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/child_process.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/buffer.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/buffer.buffer.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/async_hooks.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@types/node/assert.d.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/vitest.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/tsup.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/test-snapshots.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/test-simple.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/test-schema-direct.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/test-auth.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/platform/drizzle.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/infrastructure/vitest.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/infrastructure/tsup.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/config/vitest.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/config/tsup.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/auth/vitest.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/auth/tsup.config.ts` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/node_modules/@snapback/auth/tsup.config.js` | never | 9999 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/version.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/verify-docs-migration.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-env.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-env.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-docs.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-build.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/update-platform-imports.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/track-todos.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/test-regex.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/test-auth.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/test-auth.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/test-auth-flow.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/test-auth-flow.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/session-gc.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/run-full-audit.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/quick-audit-demo.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/project-health-check.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/improve-test-coverage.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/force-rebuild.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/extract-todos.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/docker-validate.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/docker-deploy.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/docker-build.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/demo-readiness-check.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/create-todo-issues.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/create-test-user.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/create-test-user.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/create-test-user-simple.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/create-test-user-simple.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/clean-build.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/check-api-boundary.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/types/diff.d.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/docker/local-deploy-test.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/ci/guard.test.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/run-audit.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/generate-mapping.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/detect-test-smells.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/check-api-changes.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/analyze-mocks.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/analyze-coverage.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `ops/scripts/setup-hosts.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `ops/scripts/run-migrations.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `ops/scripts/docker-stop.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `ops/scripts/docker-start.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `ops/scripts/docker-debug.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/verify-s1-tests.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/validate-recovery.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/test-vsix-package.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/test-timeline-api.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/stability-gate.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/setup-git-hooks.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/run-with-timeline-api.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/run-e2e-tests.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/build-package-json.mjs` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/build-package-json.js` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/web/scripts/setup-local-subdomains.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/web/scripts/init-test-env.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `apps/web/scripts/fix-typecheck-errors.sh` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/src/create-user.d.ts` | 2025-12-01 | 13 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/extract-sdk.sh` | 2025-12-02 | 12 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/extract-events.sh` | 2025-12-02 | 12 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/extract-contracts.sh` | 2025-12-02 | 12 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/extract-cli.sh` | 2025-12-02 | 12 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/split-infrastructure.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/setup-oss-packages.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/run-migration.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/migration-rollback.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/migrate-sdk.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/filter-contracts.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/__tests__/sdk-migration.test.ts` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/__tests__/contracts-filter.test.ts` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/fixes/fix-syntax.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/fixes/fix-router-paths.js` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/fixes/fix-multiline.sh` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/fixes/fix-import-paths.js` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/debug/test-lefthook.ts` | 2025-12-03 | 11 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/verify-migration-setup.sh` | 2025-12-04 | 10 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-env.sh` | 2025-12-04 | 10 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/run-e2e-tests.js` | 2025-12-04 | 10 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/add-test-scripts.js` | 2025-12-04 | 10 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-seo.js` | 2025-12-05 | 9 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/src/verify-posthog-setup.ts` | 2025-12-05 | 9 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/__tests__/verify-posthog-setup.test.ts` | 2025-12-05 | 9 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/__tests__/pre-publish.test.ts` | 2025-12-05 | 9 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-docker-turbo.js` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/remove-js-extensions.sh` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/fix-infrastructure-errors.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validation/docker-config.test.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validation/docker-config-red-tests.mjs` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/src/setup-posthog-cohorts.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/src/setup-posthog-alerts.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/posthog/src/run-correlation-analysis.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/__tests__/validate-oss-structure.test.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/oss-migration/__tests__/infrastructure-split.test.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `apps/web/scripts/fix-typecheck-errors.ts` | 2025-12-06 | 8 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-turbo-optimization.js` | 2025-12-07 | 7 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/validate-publish.ts` | 2025-12-07 | 7 | ✗ | ✗ | ✗ | **LOW** |
| `apps/web/scripts/test-posthog-proxy.sh` | 2025-12-08 | 6 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/check-package-versions.js` | 2025-12-08 | 6 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/src/create-user.ts` | 2025-12-08 | 6 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/src/create-user.js` | 2025-12-08 | 6 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/tdd-start.sh` | 2025-12-09 | 5 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/tdd-report-violation.sh` | 2025-12-09 | 5 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/tdd-gate.sh` | 2025-12-09 | 5 | ✗ | ✗ | ✗ | **LOW** |
| `apps/vscode/scripts/validate-manifest.js` | 2025-12-10 | 4 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/validate-state.sh` | 2025-12-11 | 3 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/validate-refactor-state.mjs` | 2025-12-11 | 3 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/update-refactor-state.mjs` | 2025-12-11 | 3 | ✗ | ✗ | ✗ | **LOW** |
| `scripts/audit/script-usage-audit.sh` | 2025-12-13 | 1 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/validate-rollout-prerequisites.sh` | 2025-12-13 | 1 | ✗ | ✗ | ✗ | **LOW** |
| `ai_dev_utils/scripts/execute-cleanup.sh` | 2025-12-13 | 1 | ✗ | ✗ | ✗ | **LOW** |
| `tooling/scripts/scan-config-patterns.mjs` | 2025-12-13 | 1 | ✗ | ✗ | ✗ | **LOW** |


---

## Statistics Summary

- **Total Scripts:** 310
- **CRITICAL (Lefthook):** 6 - runs every commit, blocks if broken
- **HIGH (CI):** 4 - in GitHub workflows, breaks builds
- **MEDIUM (package.json):** 39 - developer workflows affected
- **LOW (Manual):** 261 - safe to consolidate
- **Stale Scripts (>180 days):** 157
- **Potential Dead Code:** 149 (stale + low risk)

---

## Detailed Breakdown

### 🔴 CRITICAL Risk (6 scripts)

**Cannot touch during demo** - Breaking these blocks all commits via Lefthook.

- `tooling/scripts/validate-tsup-config.mjs` (modified 6 days ago)
- `tooling/scripts/validate-workspace-deps.mjs` (modified 5 days ago)
- `tooling/scripts/validate-tsconfig-paths.mjs` (modified 5 days ago)
- `tooling/scripts/validate-relative-imports.mjs` (modified 5 days ago)
- `tooling/scripts/validate-catalog-deps.mjs` (modified 5 days ago)
- `tooling/scripts/config-drift-check.mjs` (modified 5 days ago)

### 🟠 HIGH Risk (4 scripts)

**CI Dependencies** - Breaking these fails GitHub Actions workflows.

- `scripts/db-assert.ts` (modified 13 days ago)
- `scripts/audit-session-layer.sh` (modified 13 days ago)
- `scripts/add-licenses.sh` (modified 13 days ago)
- `scripts/ci/guard.sh` (modified 13 days ago)

### 🟡 MEDIUM Risk (39 scripts)

**Developer Workflows** - Breaking these disrupts local development.

- `scripts/posthog/node_modules/@types/node/url.d.ts` (modified 9999 days ago)
- `scripts/posthog/node_modules/@types/node/index.d.ts` (modified 9999 days ago)
- `scripts/posthog/node_modules/@types/node/console.d.ts` (modified 9999 days ago)
- `tooling/scripts/node_modules/nanoid/index.js` (modified 9999 days ago)
- `tooling/scripts/node_modules/nanoid/index.d.ts` (modified 9999 days ago)
- `tooling/scripts/node_modules/@types/node/url.d.ts` (modified 9999 days ago)
- `tooling/scripts/node_modules/@types/node/index.d.ts` (modified 9999 days ago)
- `tooling/scripts/node_modules/@types/node/console.d.ts` (modified 9999 days ago)
- `scripts/verify-build.js` (modified 13 days ago)
- `apps/vscode/scripts/test-vsix.sh` (modified 13 days ago)
- `apps/vscode/scripts/pre-demo.sh` (modified 13 days ago)
- `apps/vscode/scripts/monitor-vsix-size.js` (modified 13 days ago)
- `apps/vscode/scripts/launch-demo-vscode.sh` (modified 13 days ago)
- `apps/vscode/scripts/enforce-performance-budget.js` (modified 13 days ago)
- `apps/vscode/scripts/demo-readiness.sh` (modified 13 days ago)
- `apps/vscode/scripts/collect-load-metrics.js` (modified 13 days ago)
- `apps/vscode/scripts/check-bundle-size.js` (modified 13 days ago)
- `scripts/validate-project.ts` (modified 11 days ago)
- `scripts/check-sqlite.ts` (modified 10 days ago)
- `apps/vscode/scripts/validate-commands.js` (modified 10 days ago)
- `apps/vscode/scripts/execute-runlist.js` (modified 10 days ago)
- `scripts/sync-oss-versions.ts` (modified 9 days ago)
- `scripts/recover-pre-publish.ts` (modified 9 days ago)
- `scripts/validate-infrastructure.ts` (modified 8 days ago)
- `scripts/quarantine-replay.ts` (modified 8 days ago)
- `scripts/publish-oss-packages.mjs` (modified 8 days ago)
- `scripts/pre-publish.ts` (modified 8 days ago)
- `scripts/generate-changesets-from-commits.mjs` (modified 8 days ago)
- `scripts/fix-biome.sh` (modified 8 days ago)
- `scripts/check-framer-motion.js` (modified 8 days ago)
- `scripts/validate-publish.js` (modified 7 days ago)
- `scripts/validate-publish-no-ip-leak.mjs` (modified 7 days ago)
- `scripts/validate-oss-builds.js` (modified 7 days ago)
- `scripts/validate-exports-integrity.mjs` (modified 7 days ago)
- `apps/vscode/scripts/audit-dependencies.js` (modified 6 days ago)
- `tooling/scripts/config-drift-update.mjs` (modified 5 days ago)
- `ai_dev_utils/scripts/pre-build-check.sh` (modified 3 days ago)
- `ai_dev_utils/scripts/clean-build.sh` (modified 3 days ago)
- `ai_dev_utils/scripts/build-verify.sh` (modified 3 days ago)

### 🟢 LOW Risk (261 scripts)

**Safe to Consolidate** - No automation dependencies detected.

- `scripts/posthog/node_modules/@types/node/zlib.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/worker_threads.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/wasi.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/vm.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/v8.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/util.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/tty.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/trace_events.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/tls.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/timers.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/test.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/string_decoder.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/stream.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/sqlite.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/sea.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/repl.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/readline.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/querystring.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/punycode.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/process.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/perf_hooks.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/path.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/os.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/net.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/module.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/inspector.generated.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/inspector.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/https.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/http2.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/http.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/globals.typedarray.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/globals.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/fs.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/events.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/domain.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/dns.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/diagnostics_channel.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/dgram.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/crypto.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/constants.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/cluster.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/child_process.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/buffer.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/buffer.buffer.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/async_hooks.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@types/node/assert.d.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@snapback/api-service/vitest.setup.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@snapback/api-service/vitest.config.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@snapback/api-service/tsup.config.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@snapback/api-service/test-paths.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/posthog/node_modules/@snapback/api-service/docker-entrypoint.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/debug/test-env.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/debug/debug-next-env.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/debug/debug-imports.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/debug/debug-false-positives.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/debug/debug-env2.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/debug/debug-env.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/audit/script-usage-audit.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/update-oss-readmes.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/update-jest-imports.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/sync-apps-to-oss.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/setup-oss-repo.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/setup-environments.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/reset-oss-history.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/replace-repo-references.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/replace-console-log.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/package-changes.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/migrate-to-vitest.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/migrate-to-vitest.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/merge-packages.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/initial-oss-sync.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/flatten-monorepo.ts` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/flatten-monorepo.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/fix-oss-issues.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/fix-lefthook.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/fix-imports.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/fix-esm-imports.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/fix-dollar-one.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/fix-barrel-exports.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/create-oss-repos.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/create-oss-app-repos.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/cleanup-unused-deps.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/cleanup-repo.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/cleanup-documentation.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/cleanup-docs.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/auto-group-commits.sh` (modified 9999 days ago) ⚠️ STALE
- `scripts/archive/analyze-commits.sh` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/nanoid/nanoid.js` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/nanoid/index.browser.js` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/zlib.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/worker_threads.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/wasi.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/vm.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/v8.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/util.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/tty.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/trace_events.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/tls.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/timers.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/test.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/string_decoder.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/stream.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/sqlite.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/sea.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/repl.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/readline.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/querystring.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/punycode.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/process.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/perf_hooks.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/path.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/os.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/net.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/module.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/inspector.generated.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/inspector.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/https.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/http2.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/http.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/globals.typedarray.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/globals.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/fs.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/events.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/domain.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/dns.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/diagnostics_channel.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/dgram.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/crypto.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/constants.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/cluster.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/child_process.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/buffer.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/buffer.buffer.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/async_hooks.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@types/node/assert.d.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/vitest.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/tsup.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/test-snapshots.js` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/test-simple.js` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/test-schema-direct.js` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/test-auth.js` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/platform/drizzle.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/infrastructure/vitest.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/infrastructure/tsup.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/config/vitest.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/config/tsup.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/auth/vitest.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/auth/tsup.config.ts` (modified 9999 days ago) ⚠️ STALE
- `tooling/scripts/node_modules/@snapback/auth/tsup.config.js` (modified 9999 days ago) ⚠️ STALE
- `scripts/version.js` (modified 13 days ago)
- `scripts/verify-docs-migration.sh` (modified 13 days ago)
- `scripts/validate-env.ts` (modified 13 days ago)
- `scripts/validate-env.js` (modified 13 days ago)
- `scripts/validate-docs.ts` (modified 13 days ago)
- `scripts/validate-build.sh` (modified 13 days ago)
- `scripts/update-platform-imports.sh` (modified 13 days ago)
- `scripts/track-todos.js` (modified 13 days ago)
- `scripts/test-regex.js` (modified 13 days ago)
- `scripts/test-auth.ts` (modified 13 days ago)
- `scripts/test-auth.js` (modified 13 days ago)
- `scripts/test-auth-flow.ts` (modified 13 days ago)
- `scripts/test-auth-flow.js` (modified 13 days ago)
- `scripts/session-gc.ts` (modified 13 days ago)
- `scripts/run-full-audit.ts` (modified 13 days ago)
- `scripts/quick-audit-demo.ts` (modified 13 days ago)
- `scripts/project-health-check.js` (modified 13 days ago)
- `scripts/improve-test-coverage.js` (modified 13 days ago)
- `scripts/force-rebuild.js` (modified 13 days ago)
- `scripts/extract-todos.sh` (modified 13 days ago)
- `scripts/docker-validate.sh` (modified 13 days ago)
- `scripts/docker-deploy.sh` (modified 13 days ago)
- `scripts/docker-build.sh` (modified 13 days ago)
- `scripts/demo-readiness-check.sh` (modified 13 days ago)
- `scripts/create-todo-issues.js` (modified 13 days ago)
- `scripts/create-test-user.ts` (modified 13 days ago)
- `scripts/create-test-user.js` (modified 13 days ago)
- `scripts/create-test-user-simple.ts` (modified 13 days ago)
- `scripts/create-test-user-simple.js` (modified 13 days ago)
- `scripts/clean-build.js` (modified 13 days ago)
- `scripts/check-api-boundary.sh` (modified 13 days ago)
- `scripts/types/diff.d.ts` (modified 13 days ago)
- `scripts/docker/local-deploy-test.sh` (modified 13 days ago)
- `scripts/ci/guard.test.sh` (modified 13 days ago)
- `scripts/audit/run-audit.ts` (modified 13 days ago)
- `scripts/audit/generate-mapping.ts` (modified 13 days ago)
- `scripts/audit/detect-test-smells.ts` (modified 13 days ago)
- `scripts/audit/check-api-changes.ts` (modified 13 days ago)
- `scripts/audit/analyze-mocks.ts` (modified 13 days ago)
- `scripts/audit/analyze-coverage.ts` (modified 13 days ago)
- `ops/scripts/setup-hosts.sh` (modified 13 days ago)
- `ops/scripts/run-migrations.sh` (modified 13 days ago)
- `ops/scripts/docker-stop.sh` (modified 13 days ago)
- `ops/scripts/docker-start.sh` (modified 13 days ago)
- `ops/scripts/docker-debug.sh` (modified 13 days ago)
- `apps/vscode/scripts/verify-s1-tests.ts` (modified 13 days ago)
- `apps/vscode/scripts/validate-recovery.sh` (modified 13 days ago)
- `apps/vscode/scripts/test-vsix-package.sh` (modified 13 days ago)
- `apps/vscode/scripts/test-timeline-api.js` (modified 13 days ago)
- `apps/vscode/scripts/stability-gate.sh` (modified 13 days ago)
- `apps/vscode/scripts/setup-git-hooks.js` (modified 13 days ago)
- `apps/vscode/scripts/run-with-timeline-api.sh` (modified 13 days ago)
- `apps/vscode/scripts/run-e2e-tests.ts` (modified 13 days ago)
- `apps/vscode/scripts/build-package-json.mjs` (modified 13 days ago)
- `apps/vscode/scripts/build-package-json.js` (modified 13 days ago)
- `apps/web/scripts/setup-local-subdomains.sh` (modified 13 days ago)
- `apps/web/scripts/init-test-env.ts` (modified 13 days ago)
- `apps/web/scripts/fix-typecheck-errors.sh` (modified 13 days ago)
- `tooling/scripts/src/create-user.d.ts` (modified 13 days ago)
- `scripts/extract-sdk.sh` (modified 12 days ago)
- `scripts/extract-events.sh` (modified 12 days ago)
- `scripts/extract-contracts.sh` (modified 12 days ago)
- `scripts/extract-cli.sh` (modified 12 days ago)
- `scripts/oss-migration/split-infrastructure.sh` (modified 11 days ago)
- `scripts/oss-migration/setup-oss-packages.sh` (modified 11 days ago)
- `scripts/oss-migration/run-migration.sh` (modified 11 days ago)
- `scripts/oss-migration/migration-rollback.sh` (modified 11 days ago)
- `scripts/oss-migration/migrate-sdk.sh` (modified 11 days ago)
- `scripts/oss-migration/filter-contracts.sh` (modified 11 days ago)
- `scripts/oss-migration/__tests__/sdk-migration.test.ts` (modified 11 days ago)
- `scripts/oss-migration/__tests__/contracts-filter.test.ts` (modified 11 days ago)
- `scripts/fixes/fix-syntax.sh` (modified 11 days ago)
- `scripts/fixes/fix-router-paths.js` (modified 11 days ago)
- `scripts/fixes/fix-multiline.sh` (modified 11 days ago)
- `scripts/fixes/fix-import-paths.js` (modified 11 days ago)
- `scripts/debug/test-lefthook.ts` (modified 11 days ago)
- `scripts/verify-migration-setup.sh` (modified 10 days ago)
- `scripts/validate-env.sh` (modified 10 days ago)
- `apps/vscode/scripts/run-e2e-tests.js` (modified 10 days ago)
- `apps/vscode/scripts/add-test-scripts.js` (modified 10 days ago)
- `scripts/validate-seo.js` (modified 9 days ago)
- `scripts/posthog/src/verify-posthog-setup.ts` (modified 9 days ago)
- `scripts/posthog/__tests__/verify-posthog-setup.test.ts` (modified 9 days ago)
- `scripts/__tests__/pre-publish.test.ts` (modified 9 days ago)
- `scripts/validate-docker-turbo.js` (modified 8 days ago)
- `scripts/remove-js-extensions.sh` (modified 8 days ago)
- `scripts/fix-infrastructure-errors.ts` (modified 8 days ago)
- `scripts/validation/docker-config.test.ts` (modified 8 days ago)
- `scripts/validation/docker-config-red-tests.mjs` (modified 8 days ago)
- `scripts/posthog/src/setup-posthog-cohorts.ts` (modified 8 days ago)
- `scripts/posthog/src/setup-posthog-alerts.ts` (modified 8 days ago)
- `scripts/posthog/src/run-correlation-analysis.ts` (modified 8 days ago)
- `scripts/oss-migration/__tests__/validate-oss-structure.test.ts` (modified 8 days ago)
- `scripts/oss-migration/__tests__/infrastructure-split.test.ts` (modified 8 days ago)
- `apps/web/scripts/fix-typecheck-errors.ts` (modified 8 days ago)
- `scripts/validate-turbo-optimization.js` (modified 7 days ago)
- `scripts/validate-publish.ts` (modified 7 days ago)
- `apps/web/scripts/test-posthog-proxy.sh` (modified 6 days ago)
- `tooling/scripts/check-package-versions.js` (modified 6 days ago)
- `tooling/scripts/src/create-user.ts` (modified 6 days ago)
- `tooling/scripts/src/create-user.js` (modified 6 days ago)
- `ai_dev_utils/scripts/tdd-start.sh` (modified 5 days ago)
- `ai_dev_utils/scripts/tdd-report-violation.sh` (modified 5 days ago)
- `ai_dev_utils/scripts/tdd-gate.sh` (modified 5 days ago)
- `apps/vscode/scripts/validate-manifest.js` (modified 4 days ago)
- `ai_dev_utils/scripts/validate-state.sh` (modified 3 days ago)
- `ai_dev_utils/scripts/validate-refactor-state.mjs` (modified 3 days ago)
- `ai_dev_utils/scripts/update-refactor-state.mjs` (modified 3 days ago)
- `scripts/audit/script-usage-audit.sh` (modified 1 days ago)
- `ai_dev_utils/scripts/validate-rollout-prerequisites.sh` (modified 1 days ago)
- `ai_dev_utils/scripts/execute-cleanup.sh` (modified 1 days ago)
- `tooling/scripts/scan-config-patterns.mjs` (modified 1 days ago)

---

## Recommendations

### Phase 0: Immediate Actions (Now)

1. ✅ **Freeze CRITICAL and HIGH risk scripts** - No changes until post-demo
2. ✅ **Document demo-critical paths** - 4 VSCode scripts identified in design doc
3. ✅ **This audit completed** - Dependency matrix generated

### Phase 1: Post-Demo Quick Wins (Week 1)

**Target: 149 dead scripts for removal**

Stale LOW-risk scripts (>180 days, no automation dependencies):
- `scripts/posthog/node_modules/@types/node/zlib.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/worker_threads.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/wasi.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/vm.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/v8.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/util.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/tty.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/trace_events.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/tls.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/timers.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/test.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/string_decoder.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/stream.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/sqlite.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/sea.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/repl.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/readline.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/querystring.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/punycode.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/process.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/perf_hooks.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/path.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/os.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/net.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/module.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/inspector.generated.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/inspector.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/https.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/http2.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/http.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/globals.typedarray.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/globals.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/fs.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/events.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/domain.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/dns.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/diagnostics_channel.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/dgram.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/crypto.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/constants.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/cluster.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/child_process.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/buffer.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/buffer.buffer.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/async_hooks.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@types/node/assert.d.ts` (9999 days old)
- `scripts/posthog/node_modules/@snapback/api-service/vitest.setup.ts` (9999 days old)
- `scripts/posthog/node_modules/@snapback/api-service/vitest.config.ts` (9999 days old)
- `scripts/posthog/node_modules/@snapback/api-service/tsup.config.ts` (9999 days old)
- `scripts/posthog/node_modules/@snapback/api-service/test-paths.ts` (9999 days old)
- `scripts/posthog/node_modules/@snapback/api-service/docker-entrypoint.sh` (9999 days old)
- `scripts/debug/test-env.js` (9999 days old)
- `scripts/debug/debug-next-env.js` (9999 days old)
- `scripts/debug/debug-imports.js` (9999 days old)
- `scripts/debug/debug-false-positives.ts` (9999 days old)
- `scripts/debug/debug-env2.js` (9999 days old)
- `scripts/debug/debug-env.js` (9999 days old)
- `scripts/audit/script-usage-audit.ts` (9999 days old)
- `scripts/archive/update-oss-readmes.sh` (9999 days old)
- `scripts/archive/update-jest-imports.js` (9999 days old)
- `scripts/archive/sync-apps-to-oss.sh` (9999 days old)
- `scripts/archive/setup-oss-repo.sh` (9999 days old)
- `scripts/archive/setup-environments.sh` (9999 days old)
- `scripts/archive/reset-oss-history.sh` (9999 days old)
- `scripts/archive/replace-repo-references.js` (9999 days old)
- `scripts/archive/replace-console-log.js` (9999 days old)
- `scripts/archive/package-changes.sh` (9999 days old)
- `scripts/archive/migrate-to-vitest.ts` (9999 days old)
- `scripts/archive/migrate-to-vitest.js` (9999 days old)
- `scripts/archive/merge-packages.sh` (9999 days old)
- `scripts/archive/initial-oss-sync.sh` (9999 days old)
- `scripts/archive/flatten-monorepo.ts` (9999 days old)
- `scripts/archive/flatten-monorepo.js` (9999 days old)
- `scripts/archive/fix-oss-issues.sh` (9999 days old)
- `scripts/archive/fix-lefthook.sh` (9999 days old)
- `scripts/archive/fix-imports.js` (9999 days old)
- `scripts/archive/fix-esm-imports.sh` (9999 days old)
- `scripts/archive/fix-dollar-one.js` (9999 days old)
- `scripts/archive/fix-barrel-exports.js` (9999 days old)
- `scripts/archive/create-oss-repos.sh` (9999 days old)
- `scripts/archive/create-oss-app-repos.sh` (9999 days old)
- `scripts/archive/cleanup-unused-deps.js` (9999 days old)
- `scripts/archive/cleanup-repo.sh` (9999 days old)
- `scripts/archive/cleanup-documentation.sh` (9999 days old)
- `scripts/archive/cleanup-docs.sh` (9999 days old)
- `scripts/archive/auto-group-commits.sh` (9999 days old)
- `scripts/archive/analyze-commits.sh` (9999 days old)
- `tooling/scripts/node_modules/nanoid/nanoid.js` (9999 days old)
- `tooling/scripts/node_modules/nanoid/index.browser.js` (9999 days old)
- `tooling/scripts/node_modules/@types/node/zlib.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/worker_threads.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/wasi.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/vm.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/v8.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/util.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/tty.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/trace_events.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/tls.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/timers.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/test.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/string_decoder.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/stream.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/sqlite.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/sea.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/repl.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/readline.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/querystring.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/punycode.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/process.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/perf_hooks.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/path.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/os.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/net.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/module.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/inspector.generated.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/inspector.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/https.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/http2.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/http.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/globals.typedarray.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/globals.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/fs.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/events.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/domain.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/dns.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/diagnostics_channel.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/dgram.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/crypto.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/constants.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/cluster.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/child_process.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/buffer.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/buffer.buffer.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/async_hooks.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@types/node/assert.d.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/vitest.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/tsup.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/test-snapshots.js` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/test-simple.js` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/test-schema-direct.js` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/test-auth.js` (9999 days old)
- `tooling/scripts/node_modules/@snapback/platform/drizzle.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/infrastructure/vitest.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/infrastructure/tsup.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/config/vitest.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/config/tsup.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/auth/vitest.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/auth/tsup.config.ts` (9999 days old)
- `tooling/scripts/node_modules/@snapback/auth/tsup.config.js` (9999 days old)

### Phase 2+: Systematic Consolidation

1. Build system consolidation (identified in design doc)
2. Docker script unification (6 scripts, 1308 total lines)
3. OSS extraction parameterization (5 scripts)

---

## Demo-Critical Scripts (From Design Doc)

These must remain frozen until post-demo:

1. `apps/vscode/scripts/test-vsix.sh` - Package validation
2. `apps/vscode/scripts/launch-demo-vscode.sh` - Demo launcher
3. `apps/vscode/scripts/pre-demo.sh` - Pre-demo setup
4. `scripts/demo-readiness-check.sh` - Demo validation

**Status:** `apps/vscode/scripts/test-vsix.sh`, `apps/vscode/scripts/pre-demo.sh`, `apps/vscode/scripts/monitor-vsix-size.js`, `apps/vscode/scripts/launch-demo-vscode.sh`, `apps/vscode/scripts/demo-readiness.sh`, `scripts/quick-audit-demo.ts`, `scripts/demo-readiness-check.sh`, `apps/vscode/scripts/test-vsix-package.sh`

---

## Next Steps

1. ✅ Review this audit with team
2. ⬜ Verify demo-critical scripts are frozen
3. ⬜ Create Phase 1 consolidation plan for dead scripts
4. ⬜ Schedule Phase 2 planning session (post-demo)

**Audit Location:** `/Users/user1/WebstormProjects/SnapBack-Site/.qoder/quests/audit/script-usage-frequency-20251214.md`
**Generated:** 12/13/2025, 10:24:05 PM
