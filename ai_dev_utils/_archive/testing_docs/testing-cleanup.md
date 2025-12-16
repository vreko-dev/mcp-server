# SnapBack Testing Strategy & Remediation Plan

**Version**: 1.0
**Status**: Action Plan
**Date**: December 2025
**Priority**: Demo-Critical

---

## Executive Summary

Your codebase has **818+ placeholder tests**, **40+ skipped suites**, and **221+ TODO markers**—a significant technical debt that undermines confidence. This document provides:

1. **Triage Matrix**: What to delete, what to implement, what to defer
2. **Test Scenario Framework**: Happy/Sad/Edge/Error patterns
3. **Prevention Strategy**: Guardrails to prevent future accumulation
4. **Implementation Roadmap**: Prioritized by demo-criticality

---

## Part 1: Triage Matrix — What's Dead, What's Alive

### 🗑️ DELETE: Tests for Abandoned Features

Given your **pivot to file-based storage** (eliminating SQLite), the following tests are **obsolete**:

| Test File/Category | Reason for Deletion | Action |
|-------------------|---------------------|--------|
| `StorageBroker.test.ts` | SQLite-based storage broker replaced | DELETE |
| `StorageBrokerAdapter.test.ts` | SQLite adapter no longer used | DELETE |
| `better-sqlite3` related tests | Native module eliminated | DELETE |
| `sql.js` fallback tests | WASM fallback no longer needed | DELETE |
| Database performance tests (`plane-b.perf.spec.ts`) | Local SQLite performance irrelevant | DELETE |
| `validate-api-key-performance.test.ts` (local DB) | If testing local SQLite validation | REVIEW |

### 🗑️ DELETE: Analytics Provider Tests (Consolidation to PostHog)

Given your **consolidation to PostHog only**, delete tests for:

| Provider | File Pattern | Action |
|----------|-------------|--------|
| Google Analytics | `**/google/**/*.test.ts` | DELETE |
| Vercel Analytics | `**/vercel/**/*.test.ts` | DELETE |
| Mixpanel | `**/mixpanel/**/*.test.ts` | DELETE |
| Plausible | `**/plausible/**/*.test.ts` | DELETE |
| Umami | `**/umami/**/*.test.ts` | DELETE |
| Pirsch | `**/pirsch/**/*.test.ts` | DELETE |

### 🗑️ DELETE: OSS Migration Tests (One-Time Validators)

| Test File | Reason | Action |
|-----------|--------|--------|
| `validate-oss-structure.test.ts` | Migration complete | DELETE or ARCHIVE |
| `infrastructure-split.test.ts` | Migration complete | DELETE or ARCHIVE |
| `sdk-migration.test.ts` | Migration complete | DELETE or ARCHIVE |
| `contracts-filter.test.ts` | Migration complete | DELETE or ARCHIVE |

### ⏸️ DEFER: Tests Requiring Complex Infrastructure

Move to `__deferred__/` folder with documented unblock criteria:

| Test Category | Unblock Criteria | Target Phase |
|---------------|------------------|--------------|
| Database-conditional tests (23 suites) | CI database setup | Post-Demo |
| FS Guard integration (6 tests) | VS Code mock utilities | Post-Demo |
| E2E security tests | Auth infrastructure | Post-Demo |

### ✅ IMPLEMENT: Demo-Critical Tests

**Highest priority—must implement before demo:**

| Feature Area | Test Count | Criticality | Est. Hours |
|--------------|------------|-------------|------------|
| Activation Funnel (install→auth→save) | ~15 | P0 | 8h |
| New File-Based Storage | ~20 | P0 | 6h |
| Core Event Tracking (7 events) | ~14 | P0 | 4h |
| Extension Activation/Deactivation | ~8 | P0 | 3h |
| API Key Lifecycle | ~10 | P1 | 4h |
| Snapshot Create/Restore | ~12 | P1 | 5h |

---

## Part 2: Test Scenario Framework

### The 4-Path Coverage Model

Every feature must have tests covering **4 paths**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEST SCENARIO MATRIX                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ HAPPY PATH          │  ❌ SAD PATH                          │
│  ─────────────────────  │  ─────────────────────                │
│  • Valid inputs         │  • Invalid inputs                     │
│  • Expected flow        │  • Business rule violations           │
│  • Success outcomes     │  • Validation failures                │
│  • Normal state         │  • Recoverable errors                 │
│                                                                 │
│  ⚠️ EDGE CASES          │  💥 ERROR CASES                       │
│  ─────────────────────  │  ─────────────────────                │
│  • Boundary values      │  • System failures                    │
│  • Empty/null states    │  • Network errors                     │
│  • Max/min limits       │  • Timeout scenarios                  │
│  • Concurrent access    │  • Unrecoverable states               │
│  • Race conditions      │  • Crash recovery                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Template: Test File Structure

```typescript
// feature.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('FeatureName', () => {
  // Setup/teardown
  beforeEach(() => { /* reset state */ });
  afterEach(() => { vi.clearAllMocks(); });

  // ========================================
  // ✅ HAPPY PATH
  // ========================================
  describe('Happy Path', () => {
    it('should [primary success scenario]', () => {});
    it('should [secondary success scenario]', () => {});
    it('should [state after success]', () => {});
  });

  // ========================================
  // ❌ SAD PATH
  // ========================================
  describe('Sad Path - Validation', () => {
    it('should reject [invalid input type]', () => {});
    it('should reject [business rule violation]', () => {});
    it('should provide [helpful error message]', () => {});
  });

  // ========================================
  // ⚠️ EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('should handle empty input', () => {});
    it('should handle maximum size input', () => {});
    it('should handle concurrent operations', () => {});
    it('should handle first-time vs returning user', () => {});
  });

  // ========================================
  // 💥 ERROR CASES
  // ========================================
  describe('Error Handling', () => {
    it('should recover from [network failure]', () => {});
    it('should handle [timeout scenario]', () => {});
    it('should not corrupt state on [crash]', () => {});
    it('should emit [error telemetry]', () => {});
  });
});
```

---

## Part 3: Feature-Specific Test Scenarios

### 3.1 File-Based Storage (NEW - Replaces SQLite)

Based on `snapback-storage-implementation-guide.md`:

```typescript
// apps/vscode/test/unit/storage/CooldownCache.test.ts

describe('CooldownCache', () => {
  // ✅ HAPPY PATH
  describe('Happy Path', () => {
    it('stores and retrieves active cooldown', () => {});
    it('returns null for non-existent cooldown', () => {});
    it('removes cooldown after manual clear', () => {});
  });

  // ❌ SAD PATH
  describe('Sad Path', () => {
    it('returns null for expired cooldown', () => {});
    it('handles invalid file path gracefully', () => {});
  });

  // ⚠️ EDGE CASES
  describe('Edge Cases', () => {
    it('handles cooldown at exact expiry boundary', () => {});
    it('handles multiple cooldowns for same file, different levels', () => {});
    it('handles 10,000+ concurrent cooldowns', () => {});
    it('handles cooldown set during cleanup cycle', () => {});
  });

  // 💥 ERROR CASES
  describe('Error Cases', () => {
    it('continues operation if cleanup fails', () => {});
    it('handles clock skew gracefully', () => {});
  });
});
```

```typescript
// apps/vscode/test/unit/storage/BlobStore.test.ts

describe('BlobStore', () => {
  // ✅ HAPPY PATH
  describe('Happy Path', () => {
    it('stores content and returns SHA-256 hash', () => {});
    it('retrieves stored content by hash', () => {});
    it('deduplicates identical content', () => {});
    it('creates correct directory structure (2-level)', () => {});
  });

  // ❌ SAD PATH
  describe('Sad Path', () => {
    it('returns null for non-existent hash', () => {});
    it('rejects content exceeding 10MB limit', () => {});
  });

  // ⚠️ EDGE CASES
  describe('Edge Cases', () => {
    it('handles empty string content', () => {});
    it('handles content with null bytes', () => {});
    it('handles unicode content correctly', () => {});
    it('concurrent stores of same content return same hash', () => {});
    it('concurrent stores of different content are isolated', () => {});
  });

  // 💥 ERROR CASES
  describe('Error Cases', () => {
    it('throws descriptive error on disk full', () => {});
    it('handles permission denied gracefully', () => {});
    it('atomic write prevents corruption on crash', () => {});
    it('recovers from partial write on restart', () => {});
  });
});
```

```typescript
// apps/vscode/test/unit/storage/SnapshotStore.test.ts

describe('SnapshotStore', () => {
  // ✅ HAPPY PATH
  describe('Happy Path', () => {
    it('creates snapshot with multiple files', () => {});
    it('retrieves snapshot by ID', () => {});
    it('retrieves snapshot with resolved content', () => {});
    it('lists snapshots in reverse chronological order', () => {});
    it('deletes snapshot manifest', () => {});
  });

  // ❌ SAD PATH
  describe('Sad Path', () => {
    it('returns null for non-existent snapshot ID', () => {});
    it('rejects snapshot with no files', () => {});
  });

  // ⚠️ EDGE CASES
  describe('Edge Cases', () => {
    it('handles snapshot with 1000+ files', () => {});
    it('filters by date range correctly', () => {});
    it('filters by trigger type correctly', () => {});
    it('handles snapshots created at same millisecond', () => {});
    it('getForFile returns only relevant snapshots', () => {});
  });

  // 💥 ERROR CASES
  describe('Error Cases', () => {
    it('returns partial content if some blobs missing', () => {});
    it('handles corrupted manifest JSON', () => {});
    it('create is atomic - no partial snapshots', () => {});
  });
});
```

### 3.2 Activation Funnel (Demo-Critical)

```typescript
// apps/vscode/test/integration/activation-funnel.test.ts

describe('Activation Funnel', () => {
  // ✅ HAPPY PATH
  describe('Install → Auth → First Save', () => {
    it('extension activates on VS Code startup', () => {});
    it('welcome view appears for new user', () => {});
    it('OAuth flow opens browser correctly', () => {});
    it('API key is stored securely after auth', () => {});
    it('first protected save creates snapshot', () => {});
    it('telemetry tracks each funnel step', () => {});
  });

  // ❌ SAD PATH
  describe('Funnel Interruptions', () => {
    it('handles auth cancellation gracefully', () => {});
    it('handles auth timeout (>5 min)', () => {});
    it('handles invalid API key response', () => {});
    it('prompts retry on auth failure', () => {});
  });

  // ⚠️ EDGE CASES
  describe('Edge Cases', () => {
    it('handles existing user re-authenticating', () => {});
    it('handles workspace with .snapbackrc already', () => {});
    it('handles multiple VS Code windows', () => {});
    it('handles offline during auth attempt', () => {});
  });

  // 💥 ERROR CASES
  describe('Error Cases', () => {
    it('recovers from keytar storage failure', () => {});
    it('shows helpful error on network failure', () => {});
    it('does not lose progress on extension crash', () => {});
  });
});
```

### 3.3 Core Events (PostHog Consolidation)

Based on `event-cataloging.json` - the 7 core events:

```typescript
// packages/contracts/test/telemetry/core-events.test.ts

describe('Core Events', () => {
  // ✅ HAPPY PATH - Each of 7 core events
  describe('save_attempt', () => {
    it('emits with correct properties', () => {});
    it('sanitizes file path (no PII)', () => {});
  });

  describe('snapshot_created', () => {
    it('includes session_id and snapshot_id', () => {});
    it('includes dedup_hit and latency_ms', () => {});
  });

  describe('session_finalized', () => {
    it('includes file count and duration', () => {});
    it('includes highest_severity', () => {});
  });

  describe('issue_created', () => {
    it('includes issue_id and severity', () => {});
  });

  describe('issue_resolved', () => {
    it('includes resolution type', () => {});
  });

  describe('session_restored', () => {
    it('includes files_restored and reason', () => {});
  });

  describe('policy_changed', () => {
    it('includes from/to and source', () => {});
  });

  // ❌ SAD PATH
  describe('Event Validation', () => {
    it('rejects event with missing required property', () => {});
    it('rejects event with invalid type', () => {});
    it('rejects event not in allowlist', () => {});
  });

  // ⚠️ EDGE CASES
  describe('Edge Cases', () => {
    it('handles high event volume (1000/sec)', () => {});
    it('maps legacy events to core events', () => {});
    it('batches events correctly', () => {});
  });

  // 💥 ERROR CASES
  describe('Error Cases', () => {
    it('queues events when offline', () => {});
    it('retries on transient failure', () => {});
    it('drops malformed events silently', () => {});
    it('does not block main thread', () => {});
  });
});
```

### 3.4 Snapshot Create/Restore

```typescript
// apps/vscode/test/integration/snapshot-lifecycle.test.ts

describe('Snapshot Lifecycle', () => {
  // ✅ HAPPY PATH
  describe('Create Snapshot', () => {
    it('creates snapshot on protected file save', () => {});
    it('creates manual snapshot via command', () => {});
    it('creates AI-detected snapshot when burst detected', () => {});
    it('snapshot includes all open files', () => {});
    it('records audit trail entry', () => {});
  });

  describe('Restore Snapshot', () => {
    it('restores all files from snapshot', () => {});
    it('restores single file from snapshot', () => {});
    it('shows confirmation before restore', () => {});
    it('records restore in audit trail', () => {});
    it('emits session_restored event', () => {});
  });

  // ❌ SAD PATH
  describe('Restore Failures', () => {
    it('handles missing snapshot gracefully', () => {});
    it('handles corrupted snapshot data', () => {});
    it('handles file permission issues', () => {});
    it('provides rollback if restore fails mid-way', () => {});
  });

  // ⚠️ EDGE CASES
  describe('Edge Cases', () => {
    it('handles file renamed since snapshot', () => {});
    it('handles file deleted since snapshot', () => {});
    it('handles very large files (>10MB)', () => {});
    it('handles binary files correctly', () => {});
    it('handles symlinks appropriately', () => {});
  });

  // 💥 ERROR CASES
  describe('Error Cases', () => {
    it('snapshot creation under <500ms budget', () => {});
    it('handles disk full during snapshot', () => {});
    it('handles concurrent snapshot requests', () => {});
    it('corrupted file does not crash extension', () => {});
  });
});
```

---

## Part 4: Prevention Strategy — Never Again

### 4.1 CI Guardrails

```yaml
# .github/workflows/test-quality.yml
name: Test Quality Gates

on: [push, pull_request]

jobs:
  test-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Block placeholder tests
      - name: Check for placeholder assertions
        run: |
          if grep -r "expect(true).toBe(true)" --include="*.test.ts" --include="*.spec.ts"; then
            echo "❌ Placeholder tests detected! Replace with real assertions."
            exit 1
          fi

      # Block excessive skips
      - name: Check skip count
        run: |
          SKIP_COUNT=$(grep -r "it.skip\|describe.skip\|test.skip" --include="*.test.ts" --include="*.spec.ts" | wc -l)
          if [ "$SKIP_COUNT" -gt 10 ]; then
            echo "❌ Too many skipped tests ($SKIP_COUNT). Max allowed: 10"
            exit 1
          fi

      # Require test coverage
      - name: Coverage threshold
        run: pnpm test:coverage
        env:
          COVERAGE_THRESHOLD: 80

      # Block TODO tests in main
      - name: Check for TODO tests
        if: github.ref == 'refs/heads/main'
        run: |
          TODO_COUNT=$(grep -r "// TODO:" --include="*.test.ts" --include="*.spec.ts" | wc -l)
          if [ "$TODO_COUNT" -gt 0 ]; then
            echo "❌ TODO markers in tests not allowed on main ($TODO_COUNT found)"
            exit 1
          fi
```

### 4.2 Pre-Commit Hooks

```yaml
# .lefthook.yml
pre-commit:
  commands:
    no-placeholder-tests:
      glob: "**/*.test.ts"
      run: |
        if grep -l "expect(true).toBe(true)" {staged_files}; then
          echo "❌ Placeholder test detected. Implement real assertions."
          exit 1
        fi

    no-it-skip:
      glob: "**/*.test.ts"
      run: |
        if grep -l "it.skip\|test.skip" {staged_files}; then
          echo "⚠️ Skipped test detected. Add JIRA ticket in comment or implement."
          # Warning only, not blocking
        fi
```

### 4.3 Test File Linting (ESLint Plugin)

```javascript
// eslint-plugin-snapback-tests/rules/no-placeholder-tests.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow placeholder test assertions',
    },
    fixable: null,
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'expect' &&
          node.arguments[0]?.value === true &&
          node.parent?.callee?.property?.name === 'toBe' &&
          node.parent?.arguments[0]?.value === true
        ) {
          context.report({
            node,
            message: 'Placeholder assertion detected. Implement real test logic.',
          });
        }
      },
    };
  },
};
```

### 4.4 Test Coverage Report in PRs

```yaml
# .github/workflows/pr-coverage.yml
- name: Coverage Report
  uses: davelosert/vitest-coverage-report-action@v2
  with:
    json-summary-path: coverage/coverage-summary.json
    vite-config-path: vitest.config.ts
    file-coverage-mode: all

- name: Comment coverage diff
  uses: actions/github-script@v6
  with:
    script: |
      const coverage = require('./coverage/coverage-summary.json');
      const { lines, functions, branches } = coverage.total;

      let status = '✅';
      if (lines.pct < 80 || functions.pct < 80 || branches.pct < 75) {
        status = '❌';
      }

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## ${status} Test Coverage Report
        | Metric | Coverage | Threshold |
        |--------|----------|-----------|
        | Lines | ${lines.pct}% | 80% |
        | Functions | ${functions.pct}% | 80% |
        | Branches | ${branches.pct}% | 75% |
        `
      });
```

### 4.5 Skip Ticket Requirement

Require JIRA/GitHub issue link for any skip:

```typescript
// Bad - will be flagged
it.skip('should handle edge case', () => {});

// Good - acceptable
it.skip('should handle edge case [SNAP-123]', () => {
  // Blocked by: VS Code test harness setup
  // Unblock criteria: Implement VS Code mock utilities
});
```

---

## Part 5: Implementation Roadmap

### Phase 1: Cleanup (4 hours)

| Task | Est. | Output |
|------|------|--------|
| Delete SQLite-related tests | 1h | -50 test files |
| Delete analytics provider tests | 30m | -6 test files |
| Delete OSS migration tests | 30m | -4 test files |
| Move deferred tests to `__deferred__/` | 1h | Clear separation |
| Update CI to reject placeholders | 1h | Prevention active |

### Phase 2: Implement P0 Tests (16 hours)

| Feature | Happy | Sad | Edge | Error | Total | Est. |
|---------|-------|-----|------|-------|-------|------|
| CooldownCache | 3 | 2 | 4 | 2 | 11 | 2h |
| BlobStore | 4 | 2 | 5 | 4 | 15 | 3h |
| SnapshotStore | 5 | 2 | 5 | 3 | 15 | 3h |
| SessionStore | 4 | 2 | 3 | 2 | 11 | 2h |
| Activation Funnel | 6 | 4 | 4 | 3 | 17 | 4h |
| Core Events (7) | 7 | 3 | 3 | 4 | 17 | 2h |

### Phase 3: Implement P1 Tests (12 hours)

| Feature | Tests | Est. |
|---------|-------|------|
| API Key Lifecycle | 12 | 3h |
| Snapshot Create/Restore | 20 | 5h |
| Protection Levels | 15 | 4h |

### Phase 4: Ongoing Quality (Continuous)

- Weekly: Review skip count, address blockers
- Per-PR: Coverage must not decrease
- Monthly: Audit for new placeholders

---

## Part 6: Test Quality Metrics Dashboard

Track these KPIs:

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Placeholder tests | 818 | 0 | Demo |
| Skip count | 67 | <10 | Demo |
| Line coverage | ~40% | 80% | Demo +2w |
| Branch coverage | ~35% | 75% | Demo +2w |
| Test execution time | ? | <2min | Demo |
| Flaky test rate | ? | <1% | Ongoing |

---

## Appendix: Test File Naming Convention

```
tests/
├── unit/                          # Fast, isolated tests
│   ├── storage/
│   │   ├── CooldownCache.test.ts
│   │   ├── BlobStore.test.ts
│   │   └── SnapshotStore.test.ts
│   └── services/
│       └── AIDetector.test.ts
├── integration/                   # Multi-component tests
│   ├── activation-funnel.test.ts
│   ├── snapshot-lifecycle.test.ts
│   └── api-key-flow.test.ts
├── e2e/                           # Full system tests
│   ├── install-to-first-save.spec.ts
│   └── restore-workflow.spec.ts
├── performance/                   # Budget validation
│   ├── snapshot-timing.perf.ts
│   └── bundle-size.perf.ts
└── __deferred__/                  # Blocked tests with unblock criteria
    └── fs-guard.deferred.ts       # Blocked by: VS Code mock setup
```

---

## Quick Reference: Test Assertion Cheatsheet

```typescript
// ✅ Good assertions
expect(result).toEqual(expected);
expect(result).toHaveProperty('id');
expect(result.items).toHaveLength(3);
expect(asyncFn).rejects.toThrow('specific error');
expect(spy).toHaveBeenCalledWith(expectedArgs);
expect(spy).toHaveBeenCalledTimes(1);

// ❌ Bad assertions - NEVER USE
expect(true).toBe(true);
expect(1).toBe(1);
expect(result).toBeTruthy(); // Too vague
expect(result).toBeDefined(); // Insufficient
```

---

*This strategy provides the foundation for achieving >98% confidence in test quality. Execute Phase 1-2 before demo, Phase 3 immediately after.*
