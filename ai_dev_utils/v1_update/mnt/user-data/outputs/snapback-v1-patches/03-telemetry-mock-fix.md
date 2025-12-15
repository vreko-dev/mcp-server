# Telemetry Mock Fix - Pre-requisite for Phase 5

**Priority:** Must complete before Phase 5 testing begins  
**Effort:** 2-4 hours  
**Blocker for:** Phase 5 (Testing & Instrumentation)

---

## Problem Statement

Many test failures (~50-100) stem from incorrect telemetry mocking. Tests fail with errors like:
- `Cannot read properties of undefined (reading 'capture')`
- `posthog.capture is not a function`
- `Analytics provider not initialized`

This is a **systemic infrastructure issue**, not individual test bugs.

---

## Root Cause

The `@snapback/analytics` or `@/modules/analytics/provider/posthog` mock is incomplete or incorrectly structured across test files.

Current broken pattern:
```typescript
// ❌ Incomplete mock - missing methods
vi.mock('@snapback/analytics', () => ({
  track: vi.fn(),
}));
```

Tests then fail when code calls `analytics.capture()`, `analytics.identify()`, etc.

---

## Solution: Centralized Analytics Mock

### Step 1: Create shared mock file

```typescript
// apps/vscode/test/mocks/analytics.mock.ts

import { vi } from 'vitest';

/**
 * Complete analytics mock matching PostHog interface.
 * Import this in test setup, not individual test files.
 */
export const mockAnalytics = {
  // Core tracking
  capture: vi.fn(),
  track: vi.fn(), // Alias for capture
  identify: vi.fn(),
  alias: vi.fn(),
  
  // User properties
  setPersonProperties: vi.fn(),
  setPersonPropertiesForFlags: vi.fn(),
  
  // Groups
  group: vi.fn(),
  
  // Feature flags
  isFeatureEnabled: vi.fn().mockReturnValue(false),
  getFeatureFlag: vi.fn().mockReturnValue(null),
  getFeatureFlagPayload: vi.fn().mockReturnValue(null),
  onFeatureFlags: vi.fn(),
  reloadFeatureFlags: vi.fn(),
  
  // Session
  getDistinctId: vi.fn().mockReturnValue('test-distinct-id'),
  getSessionId: vi.fn().mockReturnValue('test-session-id'),
  
  // Lifecycle
  reset: vi.fn(),
  shutdown: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
  
  // Debug
  debug: vi.fn(),
  
  // Opt out
  optOut: vi.fn(),
  optIn: vi.fn(),
  hasOptedOut: vi.fn().mockReturnValue(false),
  hasOptedIn: vi.fn().mockReturnValue(true),
};

/**
 * Reset all mock call history between tests.
 */
export function resetAnalyticsMocks(): void {
  Object.values(mockAnalytics).forEach((mock) => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      (mock as ReturnType<typeof vi.fn>).mockClear();
    }
  });
}

/**
 * Get captured events for assertions.
 */
export function getCapturedEvents(): Array<{ event: string; properties: Record<string, unknown> }> {
  return mockAnalytics.capture.mock.calls.map(([event, properties]) => ({
    event,
    properties: properties ?? {},
  }));
}

/**
 * Assert that a specific event was captured.
 */
export function expectEventCaptured(eventName: string, properties?: Record<string, unknown>): void {
  const events = getCapturedEvents();
  const match = events.find((e) => e.event === eventName);
  
  if (!match) {
    throw new Error(
      `Expected event "${eventName}" to be captured. Captured events: ${events.map((e) => e.event).join(', ')}`
    );
  }
  
  if (properties) {
    expect(match.properties).toMatchObject(properties);
  }
}
```

### Step 2: Update vitest setup

```typescript
// apps/vscode/test/setup.ts (or vitest.setup.ts)

import { vi, beforeEach, afterEach } from 'vitest';
import { mockAnalytics, resetAnalyticsMocks } from './mocks/analytics.mock';

// Global mock for analytics - applies to ALL tests
vi.mock('@snapback/analytics', () => ({
  default: mockAnalytics,
  analytics: mockAnalytics,
  ...mockAnalytics,
}));

// Also mock the internal path if used
vi.mock('@/modules/analytics/provider/posthog', () => ({
  default: mockAnalytics,
  posthog: mockAnalytics,
  ...mockAnalytics,
}));

// Reset between tests
beforeEach(() => {
  resetAnalyticsMocks();
});
```

### Step 3: Update vitest.config.ts

```typescript
// apps/vscode/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'], // <-- Ensure this is present
    globals: true,
    environment: 'node',
    // ...
  },
});
```

### Step 4: Remove per-file mocks

Search and remove redundant per-file analytics mocks:

```bash
# Find files with inline analytics mocks
grep -r "vi.mock.*analytics" apps/vscode/test/ --include="*.ts"
grep -r "vi.mock.*posthog" apps/vscode/test/ --include="*.ts"
```

For each file found:
1. Remove the `vi.mock()` call
2. Import helpers if needed: `import { expectEventCaptured } from '../mocks/analytics.mock'`

---

## Verification

### Before (baseline)
```bash
cd apps/vscode
pnpm test 2>&1 | grep -c "FAIL"
# Record number: ___
```

### After (should decrease by 50+)
```bash
pnpm test 2>&1 | grep -c "FAIL"
# Record number: ___
```

### Specific check
```bash
# Should now pass:
pnpm test -- --grep "analytics|telemetry|posthog"
```

---

## Checklist

- [ ] Create `apps/vscode/test/mocks/analytics.mock.ts`
- [ ] Update `apps/vscode/test/setup.ts` with global mock
- [ ] Verify `setupFiles` in `vitest.config.ts`
- [ ] Remove redundant per-file mocks (audit with grep)
- [ ] Run full test suite, record failure count reduction
- [ ] Commit with message: `fix(tests): centralize analytics mock infrastructure`

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Test failures | ~150-200 | <100 |
| Analytics-related failures | ~50-80 | 0 |
| Time to run tests | N/A | Same |

---

## Integration with V1 Roadmap

Add this task to **Week 1 Day 3** (after Phase 1 completes) or as a **Phase 1.5**:

```markdown
### Phase 1.5: Test Infrastructure Fix (4 hours)

**Goal:** Reduce test failures from ~200 to <100 before Phase 5

**Deliverables:**
1. Centralized analytics mock in `test/mocks/analytics.mock.ts`
2. Global setup in `test/setup.ts`
3. Removal of redundant per-file mocks
4. Baseline test failure count documented

**Success Criteria:**
- [ ] Analytics-related test failures: 0
- [ ] Total test failures: <100
- [ ] No new warnings in test output
```

---

## Notes

- This does NOT fix assertion mismatches or business logic errors
- This ONLY fixes infrastructure/mock issues
- Phase 5 tests will catch actual behavior bugs after this is fixed
- Do NOT skip this - it's blocking accurate test results
