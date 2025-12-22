# SnapBack Development Roadmap

**Last Updated:** 2025-12-10
**Status:** Phase 0 Complete - Baseline Clean ✅
**Authority:** Synthesized from TDD_CORE.md + Journey-Driven Development
**Total Items:** 28 development tasks across 4 priority levels

---

## Overview

This roadmap consolidates all remaining development work for SnapBack after Phase 0 (Architecture Audit) completion. Items are organized by:
1. **Priority Level** (P0-P3: Demo Blockers → Post-Launch Enhancements)
2. **Implementation Phase** (1-5 per TDD_CORE.md)
3. **Surface** (Web, Extension, API, MCP, CLI)
4. **Dependencies** (blocking relationships)

---

## Priority Classification

### 🔴 P0 - Demo Blockers (Must complete for YC demo)

These 7 items are critical for the demo and block the ability to show core functionality.

#### ROADMAP-001: Waitlist Signup (Web)
**Journey:** 01-waitlist-signup | **Surface:** Web | **Phase:** 1-2
**Description:** Unauthenticated users can join waitlist via email
**Files:** apps/web/app/(marketing)/waitlist/
**Dependencies:** F0.4 Analytics consolidation
**Tests Required:**
- [ ] Email validation
- [ ] Duplicate email handling (return existing position)
- [ ] Rate limiting (10 per IP per hour)
- [ ] Welcome email triggered (Resend integration)
**Acceptance:** `pnpm test:e2e apps/web/test/e2e/waitlist-signup.spec.ts` passes

---

#### ROADMAP-002: OAuth Activation (Web)
**Journey:** 02-oauth-activation | **Surface:** Web | **Phase:** 1-2
**Description:** Invited users can sign up with GitHub/Google OAuth
**Files:** apps/web/app/auth/, packages/auth/
**Dependencies:** ROADMAP-001, Better Auth configured
**Tests Required:**
- [ ] GitHub OAuth flow
- [ ] Google OAuth flow
- [ ] Session persistence (7-day expiry)
- [ ] Invalid/expired token handling
**Acceptance:** `pnpm test:e2e apps/web/test/e2e/oauth-signup.spec.ts` passes

---

#### ROADMAP-003: API Key Generation (Web Dashboard)
**Journey:** 03-api-key-generation | **Surface:** Web | **Phase:** 1-2
**Description:** Pro+ users create API keys from dashboard
**Files:** apps/web/app/(saas)/app/api-keys/, packages/api/modules/apikeys/
**Dependencies:** ROADMAP-002, Tier system implemented
**Constraints:**
- Free tier: Rejected (show upgrade prompt)
- Key shown ONCE, never retrievable
- Max: 5 (Pro), 10 (Team), 20 (Enterprise)
**Tests Required:**
- [ ] Key generation (sk_live_{32 chars})
- [ ] Key hash stored (SHA-256)
- [ ] Free user rejection
- [ ] Limit enforcement
**Acceptance:** `pnpm test:e2e apps/web/test/e2e/api-key-lifecycle.spec.ts` passes

---

#### ROADMAP-004: Dashboard Metrics (Web)
**Journey:** 04-dashboard-metrics | **Surface:** Web | **Phase:** 1-2
**Description:** Authenticated users see protection metrics on dashboard
**Files:** apps/web/modules/saas/dashboard/, packages/api/modules/dashboard/
**Dependencies:** ROADMAP-002
**Metrics:** Total snapshots, Recoveries, Files protected, AI detection rate
**Tests Required:**
- [ ] Metrics aggregation (correct counts)
- [ ] Empty state (new users)
- [ ] 60-second cache stale time
- [ ] Data refresh every 60s
**Acceptance:** `pnpm test apps/web/modules/saas/dashboard` passes

---

#### ROADMAP-005: Extension Install + First Run (Extension)
**Journey:** 05-extension-install | **Surface:** VSCode | **Phase:** 1-2
**Description:** Extension activates seamlessly on install with welcome webview
**Files:** apps/vscode/src/welcomeView.ts, src/extension.ts
**Dependencies:** F0.2 Bundle size optimization (<2MB)
**Constraints:**
- Extension works WITHOUT auth (local-only mode)
- No blocking modals
- Activation time: <500ms
- Welcome: Single screen, not wizard
**Tests Required:**
- [ ] Activation time <500ms (perf test)
- [ ] Bundle size <2MB (CI check)
- [ ] Welcome webview opens
- [ ] Connection flow works
**Acceptance:**
- [ ] `pnpm test apps/vscode/test/unit/welcome` passes
- [ ] Bundle size check in CI

---

#### ROADMAP-006: First Protected Save (Extension)
**Journey:** 06-first-protected-save | **Surface:** VSCode | **Phase:** 1-2
**Description:** File saves create snapshots automatically
**Files:** apps/vscode/src/handlers/SaveHandler.ts, src/snapshot/SnapshotManager.ts
**Dependencies:** ROADMAP-005
**Constraints:**
- Save handler: <50ms without snapshot, <100ms with
- No blocking dialogs (toast only)
- Works offline (local storage)
**Tests Required:**
- [ ] Save triggers snapshot
- [ ] Toast notification shown
- [ ] Status bar updates (checkpoint count)
- [ ] Latency <100ms
**Acceptance:** `pnpm test apps/vscode/test/unit/handlers/save-handler.test.ts` passes

---

#### ROADMAP-007: First AI Detection (Extension)
**Journey:** 07-first-ai-detection | **Surface:** VSCode | **Phase:** 1-2
**Description:** Extension detects AI-assisted changes (Cursor, Copilot, Claude)
**Files:** apps/vscode/src/detection/AIDetector.ts, BurstDetector.ts
**Dependencies:** ROADMAP-006
**Constraints:**
- Basic detection works offline (pattern matching)
- Confidence threshold: 70%+
- No false positives on small typos
**Tests Required:**
- [ ] Pattern matching (Cursor, Copilot, Claude)
- [ ] Burst detection (rapid changes)
- [ ] Confidence scoring
- [ ] False positive prevention
**Acceptance:** `pnpm test apps/vscode/test/unit/detection` passes

---

#### ROADMAP-010: First Recovery (Extension)
**Journey:** 10-first-recovery | **Surface:** VSCode | **Phase:** 1-2
**Description:** Users restore files from snapshots
**Files:** apps/vscode/src/restore/RestoreManager.ts, src/commands/restoreCommands.ts
**Dependencies:** ROADMAP-006
**Constraints:**
- Multi-file restore supported
- Confirmation required
- Undo available (new snapshot before restore)
**Tests Required:**
- [ ] Snapshot selection (QuickPick)
- [ ] Confirmation dialog
- [ ] File restoration
- [ ] Success notification
**Acceptance:** `pnpm test apps/vscode/test/unit/restore` passes

---

### 🟠 P1 - Core Value (Complete for launch)

These 9 items complete the core platform functionality. Can launch product with P0+P1.

#### ROADMAP-008: MCP analyze_risk (Basic)
**Journey:** 08-mcp-analyze-risk | **Surface:** MCP | **Phase:** 1-2
**Description:** AI assistants analyze code risk via snapback.analyze_risk tool
**Files:** apps/mcp-server/src/tools/analyze-risk.ts, src/analysis/LocalAnalyzer.ts
**Dependencies:** None (parallel-safe with all)
**Constraints:**
- Free tier: Local analysis only
- Response time: <200ms
- No code sent to server
**Tests Required:**
- [ ] Tool registration
- [ ] Schema validation
- [ ] Local analysis execution
- [ ] Response format
**Acceptance:** `pnpm test apps/mcp-server/test/unit/tools/analyze-risk.test.ts` passes

---

#### ROADMAP-009: MCP Checkpoints (Pro)
**Journey:** 09-mcp-checkpoints | **Surface:** MCP | **Phase:** 1-2
**Description:** Pro users can create/restore checkpoints via MCP
**Files:** apps/mcp-server/src/tools/{create,list,restore}-checkpoint.ts
**Dependencies:** ROADMAP-003 (Pro key needed), ROADMAP-008
**Tools:**
- snapback.create_checkpoint
- snapback.list_checkpoints
- snapback.restore_checkpoint (with dryRun safety)
**Tests Required:**
- [ ] Tier validation (403 for free)
- [ ] Checkpoint creation
- [ ] Dry-run preview
- [ ] File restoration
**Acceptance:** `pnpm test apps/mcp-server/test/unit/tools/checkpoints.test.ts` passes

---

#### ROADMAP-011: Snapshot Creation (Extension)
**Journey:** 11-snapshot-creation | **Surface:** VSCode | **Phase:** 1-2
**Description:** Orchestrated snapshot creation with rate limiting & deduplication
**Files:** apps/vscode/src/snapshot/SnapshotOrchestrator.ts, RateLimiter.ts
**Dependencies:** ROADMAP-006
**Constraints:**
- Rate limit: Max 1 per file per 5 seconds
- Deduplication: Skip if content hash matches
- Max file size: 10MB per file
- Latency budget: <100ms
**Tests Required:**
- [ ] Rate limiting enforcement
- [ ] Content deduplication
- [ ] File size validation
- [ ] Latency measurement
**Acceptance:** `pnpm test apps/vscode/test/unit/snapshot/orchestrator.test.ts` passes

---

#### ROADMAP-012: Session Management (Extension)
**Journey:** 12-session-management | **Surface:** VSCode | **Phase:** 1-2
**Description:** Group related changes into logical sessions
**Files:** apps/vscode/src/storage/SessionStore.ts, src/session/SessionCoordinator.ts
**Dependencies:** ROADMAP-011
**Constraints:**
- Idle timeout: 5 minutes (configurable)
- Max session duration: 4 hours
- (Pro) DBSCAN grouping for related changes
**Tests Required:**
- [ ] Session start/end
- [ ] Idle timeout
- [ ] Snapshot tagging
- [ ] Summary generation
**Acceptance:** `pnpm test apps/vscode/test/unit/session/session-store.test.ts` passes

---

#### ROADMAP-014: CLI snapshot
**Journey:** 14-cli-snapshot | **Surface:** CLI | **Phase:** 1-2
**Description:** `snapback snapshot` creates manual checkpoints
**Files:** apps/cli/src/commands/snapshot.ts, packages/sdk/src/snapshot.ts
**Dependencies:** None (works offline)
**Constraints:**
- Works offline (local storage)
- Respects .snapbackignore
- Max 1000 files per snapshot
**Tests Required:**
- [ ] Config loading
- [ ] File collection
- [ ] Snapshot creation
- [ ] Ignore pattern respect
**Acceptance:** `pnpm test apps/cli/test/commands/snapshot.test.ts` passes

---

#### ROADMAP-015: CLI restore
**Journey:** 15-cli-restore | **Surface:** CLI | **Phase:** 1-2
**Description:** `snapback restore` interactively restores snapshots
**Files:** apps/cli/src/commands/restore.ts, packages/sdk/src/restore.ts
**Dependencies:** ROADMAP-014
**Constraints:**
- Confirmation required (--yes to skip)
- Creates backup snapshot before restore
- Works offline
**Tests Required:**
- [ ] Snapshot listing
- [ ] File preview
- [ ] Confirmation flow
- [ ] File restoration
**Acceptance:** `pnpm test apps/cli/test/commands/restore.test.ts` passes

---

#### ROADMAP-016: CLI status
**Journey:** 16-cli-status | **Surface:** CLI | **Phase:** 1-2
**Description:** `snapback status` shows protection state
**Files:** apps/cli/src/commands/status.ts
**Dependencies:** None
**Constraints:**
- Works offline
- Fast execution (<500ms)
- Optional --json output
**Tests Required:**
- [ ] Status display
- [ ] JSON format
- [ ] Execution time
**Acceptance:** `pnpm test apps/cli/test/commands/status.test.ts` passes

---

#### ROADMAP-017: CLI scan (CI/CD)
**Journey:** 17-cli-scan | **Surface:** CLI | **Phase:** 1-2
**Description:** `snapback scan` validates changes in CI/CD pipelines
**Files:** apps/cli/src/commands/scan.ts
**Dependencies:** None (Free) / ROADMAP-003 (Pro)
**Constraints:**
- Pro: Full rule set
- Free: Open rules only
- SARIF output for GitHub integration
- Exit code based on severity threshold
**Tests Required:**
- [ ] Git diff analysis
- [ ] Risk scoring
- [ ] SARIF output
- [ ] Exit code logic
**Acceptance:** `pnpm test apps/cli/test/commands/scan.test.ts` passes

---

### 🟡 P2 - Full Platform (Complete for GA)

These 5 items complete the full platform experience. Needed for general availability.

#### ROADMAP-013: CLI init
**Journey:** 13-cli-init | **Surface:** CLI | **Phase:** 1-2
**Description:** `snapback init` configures workspace
**Files:** apps/cli/src/commands/init.ts, src/templates/snapbackrc.ts
**Dependencies:** None
**Constraints:**
- Non-destructive by default
- Works offline
- Respects existing .gitignore
**Tests Required:**
- [ ] Config generation
- [ ] .gitignore integration
- [ ] Overwrite prompts
**Acceptance:** `pnpm test apps/cli/test/commands/init.test.ts` passes

---

#### ROADMAP-018: Web Settings Management
**Journey:** 18-web-settings-management | **Surface:** Web | **Phase:** 1-2
**Description:** Users manage account settings (profile, notifications, billing, team)
**Files:** apps/web/app/(saas)/app/settings/
**Dependencies:** ROADMAP-002
**Sections:**
- Profile (name, email, avatar)
- Notifications (email preferences)
- Billing (subscription, usage)
- Team (Pro+ only)
**Tests Required:**
- [ ] Setting updates
- [ ] Auto-save / explicit save
- [ ] Success notifications
- [ ] Validation
**Acceptance:** `pnpm test apps/web/app/(saas)/app/settings` passes

---

#### ROADMAP-019: MCP check_dependencies
**Journey:** 19-mcp-check_dependencies | **Surface:** MCP | **Phase:** 1-2
**Description:** AI assistants check dependency changes for risks
**Files:** apps/mcp-server/src/tools/check-dependencies.ts
**Dependencies:** ROADMAP-008
**Constraints:**
- Free tier tool
- Works offline (local analysis)
- No network calls to npm registry
**Tests Required:**
- [ ] Dependency diff analysis
- [ ] Vulnerability detection
- [ ] Recommendation generation
**Acceptance:** `pnpm test apps/mcp-server/test/tools/check-dependencies.test.ts` passes

---

#### ROADMAP-020: MCP Context7 Integration
**Journey:** 20-mcp-context7 | **Surface:** MCP | **Phase:** 1-2
**Description:** AI assistants fetch library documentation via Context7
**Files:** apps/mcp-server/src/tools/context7-*.ts
**Dependencies:** None
**Tools:**
- ctx7.resolve-library-id
- ctx7.get-library-docs
**Constraints:**
- Free tier
- Cached for 1 hour
- Retry with exponential backoff
**Tests Required:**
- [ ] Library resolution
- [ ] Documentation fetching
- [ ] Caching behavior
- [ ] Retry logic
**Acceptance:** `pnpm test apps/mcp-server/test/tools/context7.test.ts` passes

---

### 🟢 P3 - Polish & Optimizations (Post-Launch)

These 4 items are improvements discovered during demo/testing. Can defer beyond launch.

#### ROADMAP-021: VSCode Build Output Configuration
**Priority:** P3 - Infrastructure | **Phase:** 3 (Refactor)
**Description:** Configure build output to apps/vscode/dist/mcp-server.js
**Context:** From IMPLEMENTATION_CHECKLIST.md line 53
**Dependencies:** None (independent)
**Verification:**
- [ ] `pnpm build` completes without errors
- [ ] dist/mcp-server.js exists with correct size
- [ ] Import paths resolve correctly

---

#### ROADMAP-022: VSCode Window Message API Integration
**Priority:** P3 - UI | **Phase:** 2 (Green)
**Description:** Library integration for `vscode.window.show*Message()` API
**Context:** From PHASE_20_COMPLETION_SUMMARY.md line 17
**Dependencies:** ROADMAP-005
**Verification:**
- [ ] Message notifications display
- [ ] User interactions handled
- [ ] No console errors

---

#### ROADMAP-023: VSCode Extension Persistence
**Priority:** P3 - QA | **Phase:** 4 (Quality)
**Description:** Restart VSCode and verify persistence of state
**Context:** From tree-provider-quality-analysis.md line 1199
**Dependencies:** ROADMAP-006, ROADMAP-011
**Verification:**
- [ ] Restart VSCode
- [ ] Snapshots persist in storage
- [ ] Tree view state restored

---

#### ROADMAP-024: VSCode Extension Link Verification
**Priority:** P3 - QA | **Phase:** 4 (Quality)
**Description:** Check VSCode extension marketplace link
**Context:** From REPOSITORY_POLISH_SUMMARY.md line 25
**Link:** MarcelleLabs.snapback-vscode
**Verification:**
- [ ] Marketplace link works
- [ ] Extension details page loads
- [ ] Installation instructions accurate

---

## Foundation Tasks (F0 - Must be complete before any journeys)

These were completed during Phase 0:

- ✅ **F0.1:** TypeScript fixes
- ✅ **F0.2:** Bundle size optimization (<2MB)
- ✅ **F0.3:** Token validation middleware
- ✅ **F0.4:** Analytics consolidation (PostHog)
- ✅ **PHASE 0:** Architecture audit (TODO cleanup, TDD compliance)

---

## Implementation Guidance

### Workflow per TDD_CORE.md

Each ROADMAP item follows strict TDD phases:

1. **Phase 0:** Architecture Audit (context, dependencies, blockers)
2. **Phase 1 (RED):** Write failing tests (4-path coverage: happy, sad, edge, error)
3. **Phase 2 (GREEN):** Implement code to pass tests
4. **Phase 3 (REFACTOR):** Improve code quality, consolidate
5. **Phase 4 (QUALITY):** Verification & integration tests
6. **Phase 5 (CERTIFY):** Gate passing + documentation

### Test Coverage Requirement (4-Path Model)

Every test suite must include:
- **Happy Path:** Feature works as designed
- **Sad Path:** Expected failures handled gracefully
- **Edge Cases:** Boundary conditions
- **Error Path:** Unexpected failures don't crash system

### Canonical Utilities (DRY)

Before implementing, check:
- Error Handling: `@snapback-oss/sdk/utils/errorHelpers.ts`
- Retry Logic: `@snapback-oss/sdk/utils/retry.ts`
- Logger: `@snapback/infrastructure/logging/logger.ts`
- Auth: `@snapback/auth`
- Types: `@snapback/contracts`

---

## Dependency Graph

```
FOUNDATION (F0.1-F0.4)
        ↓
    PHASE 0 ✅
        ↓
P0 BLOCKERS (ROADMAP-001 to 007, 010)
        ↓
P1 CORE VALUE (ROADMAP-008, 009, 011-017)
        ↓
P2 PLATFORM (ROADMAP-013, 018-020)
        ↓
P3 POLISH (ROADMAP-021 to 024)
```

### Parallelization

The following can execute in parallel (no shared write files):
- Web journeys (different components)
- Extension journeys (after 05 completes)
- MCP journeys (independent tools)
- CLI journeys (no client dependencies)

Suggested: 4 agents, 3-week timeline for P0+P1 completion.

---

## Verification Checklist

Before marking item complete:
- [ ] All tests passing: `pnpm test apps/[module]`
- [ ] Type checking: `pnpm typecheck`
- [ ] Linting: `pnpm lint`
- [ ] E2E tests (if applicable): `pnpm test:e2e`
- [ ] TDD gate passed: `./ai_dev_utils/scripts/tdd-gate.sh [phase]`
- [ ] No TODOs without GitHub issue tracking
- [ ] No placeholder tests (`expect(true).toBe(true)`)
- [ ] No skipped tests without `[GH-####]`

---

## Contact & Issues

- **Questions about specific journey?** Reference the journey ID (01-20)
- **Found a blocker?** Document in ROADMAP-BLOCKED.md
- **Completed an item?** Move to ROADMAP-COMPLETE.md

---

**Last Updated:** 2025-12-10
**Authority:** TDD_CORE.md + journeys.md synthesis
**Next Review:** After P0 (ROADMAP-001 through ROADMAP-007) completion
