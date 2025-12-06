# SnapBack Test Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the 78 test files specified in [test_coverage.md](./test_coverage.md) to achieve 95% meaningful coverage.

**Total Effort**: ~150 hours (6 weeks)
**Test Files**: 78 files
**Test Cases**: ~500 scenarios

---

## Quick Start

### 1. Install Dependencies

```bash
# Install MSW for HTTP mocking (new dependency)
pnpm add -D msw@latest

# Verify existing test dependencies
pnpm list vitest @testing-library/react @testing-library/user-event
```

### 2. Setup MSW Infrastructure

**Create `test/helpers/msw-setup.ts`:**

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Default handlers for common API endpoints
export const defaultHandlers = [
  http.post('/api/snapshots/create', () => {
    return HttpResponse.json({
      id: 'snap_test_123',
      timestamp: Date.now()
    });
  }),

  http.get('/api/snapshots/list', () => {
    return HttpResponse.json([]);
  }),

  http.post('/api/auth/session', () => {
    return HttpResponse.json({
      userId: 'user_test',
      tier: 'pro'
    });
  }),
];

// Create global MSW server
export const server = setupServer(...defaultHandlers);

// Setup hooks for all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

**Create `test/helpers/fixtures.ts`:**

```typescript
import type { Snapshot, SaveContext, TierContext } from '@snapback/contracts';

/**
 * Fixture factory for Snapshot entities
 */
export const createTestSnapshot = (overrides?: Partial<Snapshot>): Snapshot => ({
  id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  userId: 'user_test',
  repoId: 'repo_test',
  timestamp: Date.now(),
  fileCount: 1,
  totalSizeBytes: 1024,
  fileHashes: ['hash1'],
  trigger: 'manual',
  riskScore: 30,
  ...overrides,
});

/**
 * Fixture factory for SaveContext (AutoDecisionEngine input)
 */
export const createTestSaveContext = (overrides?: Partial<SaveContext>): SaveContext => ({
  repoId: 'repo_test',
  timestamp: Date.now(),
  files: [{ path: 'test.ts', hash: 'abc123' }],
  aiDetected: false,
  sessionId: 'sess_test',
  sessionFileCount: 1,
  sessionDurationMs: 5000,
  riskScore: 20,
  burstDetected: false,
  containsCriticalFiles: false,
  criticalFileCount: 0,
  ...overrides,
});

/**
 * Fixture factory for TierContext (tier gating)
 */
export const createTestTierContext = (overrides?: Partial<TierContext>): TierContext => ({
  userId: 'user_test',
  tier: 'free',
  features: ['basic_protection', 'local_snapshots'],
  limits: {
    snapshotsPerMonth: 100,
    apiRequestsPerMinute: 100,
  },
  usage: {
    snapshotsUsed: 10,
    apiRequestsUsed: 50,
  },
  ...overrides,
});
```

### 3. Verify Test Infrastructure

```bash
# Run existing tests to verify setup
pnpm test:unit

# Check coverage
pnpm test:coverage
```

---

## Phase 1: P0 - Demo Critical (Weeks 1-2)

**Goal**: 95%+ coverage on core flows for demo readiness

### Week 1: AutoDecisionEngine & SaveHandler

#### Task 1: AutoDecisionEngine Core Tests

**File**: `apps/vscode/test/unit/domain/engine.test.ts` (already exists, needs completion)

**Status**: PARTIAL - Only basic assertion tests exist, missing actual engine implementation tests

**Implementation**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AutoDecisionEngine } from '@/domain/engine';
import { createTestSaveContext } from '@test/helpers/fixtures';
import type { ProtectionDecision } from '@/domain/types';

describe('AutoDecisionEngine', () => {
  let engine: AutoDecisionEngine;

  beforeEach(() => {
    engine = new AutoDecisionEngine();
  });

  describe('evaluate() - Protection Decisions', () => {
    it('should PROTECT when AI confidence >= 80%', () => {
      const context = createTestSaveContext({
        aiDetected: true,
        aiToolName: 'Copilot',
        aiConfidence: 0.85,
      });

      const decision: ProtectionDecision = engine.evaluate(context);

      expect(decision.createSnapshot).toBe(true);
      expect(decision.showNotification).toBe(true);
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
      expect(decision.reasons).toContain('high_ai_confidence');
      expect(decision.summary).toContain('Copilot');
    });

    it('should PROTECT when risk score >= 70', () => {
      const context = createTestSaveContext({
        riskScore: 75,
      });

      const decision = engine.evaluate(context);

      expect(decision.createSnapshot).toBe(true);
      expect(decision.reasons).toContain('high_risk_score');
    });

    it('should PROTECT when burst detected with 3+ files', () => {
      const context = createTestSaveContext({
        burstDetected: true,
        sessionFileCount: 5,
        sessionDurationMs: 1000,
      });

      const decision = engine.evaluate(context);

      expect(decision.createSnapshot).toBe(true);
      expect(decision.reasons).toContain('burst_detected');
    });

    it('should PROTECT when critical files modified', () => {
      const context = createTestSaveContext({
        containsCriticalFiles: true,
        criticalFileCount: 1,
        files: [{ path: 'package.json', hash: 'abc123' }],
      });

      const decision = engine.evaluate(context);

      expect(decision.createSnapshot).toBe(true);
      expect(decision.reasons).toContain('critical_file');
    });
  });

  describe('evaluate() - Notification Decisions', () => {
    it('should NOTIFY when risk score 40-69', () => {
      const context = createTestSaveContext({
        riskScore: 50,
      });

      const decision = engine.evaluate(context);

      expect(decision.createSnapshot).toBe(false);
      expect(decision.showNotification).toBe(true);
      expect(decision.reasons).toContain('elevated_risk');
    });

    it('should NOTIFY when AI confidence 50-79%', () => {
      const context = createTestSaveContext({
        aiDetected: true,
        aiConfidence: 0.65,
      });

      const decision = engine.evaluate(context);

      expect(decision.showNotification).toBe(true);
    });
  });

  describe('evaluate() - Ignore Decisions', () => {
    it('should IGNORE when all signals clean', () => {
      const context = createTestSaveContext({
        riskScore: 10,
        aiDetected: false,
      });

      const decision = engine.evaluate(context);

      expect(decision.createSnapshot).toBe(false);
      expect(decision.showNotification).toBe(false);
    });
  });
});
```

**Checklist**:
- [ ] All protection threshold tests passing
- [ ] Notification threshold tests passing
- [ ] Ignore/clean path tests passing
- [ ] Coverage >= 95% for `engine.ts`

---

#### Task 2: RulesEvaluator Tests

**File**: `apps/vscode/test/unit/domain/rules-evaluator.test.ts` (NEW FILE)

**Implementation**:

```typescript
import { describe, it, expect } from 'vitest';
import { RulesEvaluator } from '@/domain/rules-evaluator';
import type { ProtectionRule } from '@/domain/types';

describe('RulesEvaluator', () => {
  const rules: ProtectionRule[] = [
    { pattern: 'src/auth.ts', level: 'block' },
    { pattern: 'src/**/*.ts', level: 'warn' },
    { pattern: '**/*.json', level: 'protect' },
  ];

  const evaluator = new RulesEvaluator(rules);

  describe('matchRule()', () => {
    it('should match exact path with highest priority', () => {
      const rule = evaluator.matchRule('src/auth.ts');

      expect(rule?.level).toBe('block');
    });

    it('should match glob pattern', () => {
      const rule = evaluator.matchRule('src/utils/helper.ts');

      expect(rule?.level).toBe('warn');
    });

    it('should match file extension', () => {
      const rule = evaluator.matchRule('package.json');

      expect(rule?.level).toBe('protect');
    });

    it('should return default when no match', () => {
      const rule = evaluator.matchRule('README.md');

      expect(rule).toBeUndefined();
    });
  });

  describe('evaluateRules()', () => {
    it('should apply rules in correct precedence order', () => {
      const results = evaluator.evaluateRules([
        'src/auth.ts',      // block
        'src/utils.ts',     // warn
        'package.json',     // protect
      ]);

      expect(results).toEqual([
        { path: 'src/auth.ts', level: 'block' },
        { path: 'src/utils.ts', level: 'warn' },
        { path: 'package.json', level: 'protect' },
      ]);
    });
  });
});
```

---

### Week 2: MCP Server Tools & Security

#### Task 3: MCP analyze_risk Tool Tests

**File**: `apps/mcp-server/test/unit/tools/analyze-risk.test.ts` (NEW FILE)

**Implementation**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { analyzeRisk } from '@mcp/tools/analyze-risk';

describe('analyzeRisk Tool', () => {
  it('should return risk analysis for valid diff', async () => {
    const result = await analyzeRisk({
      changes: [
        { value: '+ const apiKey = "sk_live_abc123";' }
      ]
    });

    expect(result.riskScore).toBeGreaterThan(70);
    expect(result.factors).toContainEqual(
      expect.objectContaining({
        type: 'api_key_exposure',
        severity: 'high',
      })
    );
  });

  it('should detect credential patterns', async () => {
    const result = await analyzeRisk({
      changes: [
        { value: '+ password: "admin123"' }
      ]
    });

    expect(result.riskScore).toBeGreaterThan(60);
  });

  it('should handle empty diff gracefully', async () => {
    const result = await analyzeRisk({ changes: [] });

    expect(result.riskScore).toBe(0);
    expect(result.factors).toEqual([]);
  });
});
```

---

## Phase 2: P1 - Launch Critical (Weeks 3-4)

### Week 3: Tier Gating & Storage

#### Task 4: **TierResolver Service Tests** (CRITICAL - BLOCKS MONETIZATION)

**File**: `packages/api/test/unit/tiers/tier-resolver.test.ts` (NEW FILE)

**Implementation**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TierResolver } from '@/modules/tiers/services/TierResolver';
import { createTestTierContext } from '@test/helpers/fixtures';

vi.mock('@snapback/platform', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      { tier: 'pro', features: ['cloud_backup', 'smart_grouping'] }
    ]),
  }
}));

describe('TierResolver', () => {
  let resolver: TierResolver;

  beforeEach(() => {
    resolver = new TierResolver();
  });

  describe('resolve()', () => {
    it('should resolve tier context for user', async () => {
      const context = await resolver.resolve('user_123');

      expect(context.tier).toBe('pro');
      expect(context.features).toContain('cloud_backup');
    });

    it('should cache tier resolution for 5 minutes', async () => {
      await resolver.resolve('user_123');
      await resolver.resolve('user_123');

      // DB should only be called once due to cache
      expect(vi.mocked(db.select)).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkFeature()', () => {
    it('should allow free tier basic features', async () => {
      const result = await resolver.checkFeature('user_free', 'basic_protection');

      expect(result.allowed).toBe(true);
    });

    it('should deny free tier cloud features', async () => {
      const result = await resolver.checkFeature('user_free', 'cloud_backup');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('feature_requires_upgrade');
      expect(result.requiredTier).toBe('pro');
    });
  });

  describe('incrementUsage()', () => {
    it('should track usage correctly', async () => {
      await resolver.incrementUsage('user_123', 'snapshots');

      const context = await resolver.resolve('user_123');
      expect(context.usage.snapshotsUsed).toBe(11); // Was 10 in fixture
    });
  });
});
```

---

## Phase 3: P2 - Quality (Week 5)

### Week 5: Web Portal & CLI

#### Task 5: **Web Portal Test Infrastructure** (CURRENTLY 0%)

**Directory Structure**:

```
apps/web/
├── test/
│   ├── setup.ts
│   ├── helpers/
│   │   ├── msw-handlers.ts
│   │   ├── render.tsx
│   │   └── fixtures.ts
│   ├── unit/
│   │   ├── hooks/
│   │   │   ├── use-api-keys.test.ts
│   │   │   └── use-dashboard-metrics.test.ts
│   │   └── components/
│   │       ├── metrics-grid.test.tsx
│   │       ├── activity-feed.test.tsx
│   │       └── ai-detection-stats.test.tsx
│   ├── integration/
│   │   ├── auth-flow.test.ts
│   │   ├── api-keys.test.ts
│   │   └── dashboard-data.test.ts
│   └── e2e/
│       ├── onboarding.e2e.test.ts
│       ├── dashboard.e2e.test.ts
│       └── billing.e2e.test.ts
└── vitest.config.ts
```

**Create `apps/web/test/setup.ts`:**

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { server } from './helpers/msw-handlers';

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
```

**Create `apps/web/test/helpers/msw-handlers.ts`:**

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/keys/list', () => {
    return HttpResponse.json([
      { id: 'key_1', prefix: 'sk_live_abc', createdAt: Date.now() }
    ]);
  }),

  http.post('/api/keys/create', () => {
    return HttpResponse.json({
      id: 'key_new',
      key: 'sk_live_xyz123',
      prefix: 'sk_live_xyz'
    });
  }),

  http.get('/api/dashboard/metrics', () => {
    return HttpResponse.json({
      snapshotsCount: 42,
      aiDetections: 15,
      riskPrevented: 8,
    });
  }),
];

export const server = setupServer(...handlers);
```

**Create `apps/web/test/unit/hooks/use-api-keys.test.ts`:**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useApiKeys } from '@/hooks/use-api-keys';
import { server } from '@test/helpers/msw-handlers';
import { http, HttpResponse } from 'msw';

describe('useApiKeys', () => {
  it('fetches API keys on mount', async () => {
    const { result } = renderHook(() => useApiKeys());

    await waitFor(() => {
      expect(result.current.keys).toHaveLength(1);
    });

    expect(result.current.keys[0].prefix).toBe('sk_live_abc');
  });

  it('creates new API key', async () => {
    const { result } = renderHook(() => useApiKeys());

    await waitFor(() => {
      expect(result.current.keys).toHaveLength(1);
    });

    await result.current.createKey();

    expect(result.current.keys).toHaveLength(2);
  });

  it('handles errors gracefully', async () => {
    server.use(
      http.get('/api/keys/list', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useApiKeys());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

---

## Phase 4: P3 - Polish (Week 6)

### Week 6: Performance & E2E

#### Task 6: Extension Performance Tests

**File**: `apps/vscode/test/performance/activation-perf.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';

describe('Extension Performance', () => {
  it('should activate in <500ms (p95)', async () => {
    const extension = vscode.extensions.getExtension('MarcelleLabs.snapback-vscode');

    const startTime = performance.now();
    await extension?.activate();
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(500);
  });

  it('should have memory footprint <50MB after activation', async () => {
    const extension = vscode.extensions.getExtension('MarcelleLabs.snapback-vscode');
    await extension?.activate();

    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    expect(memoryUsage).toBeLessThan(50);
  });
});
```

---

## Testing Checklist

### For Each Test File

- [ ] File created in correct directory (`unit/`, `integration/`, `e2e/`)
- [ ] Imports use `@/` alias for source files
- [ ] Imports use `@test/` alias for test helpers
- [ ] Fixtures used instead of inline data
- [ ] MSW handlers for HTTP mocking (if applicable)
- [ ] `vi.mock()` for in-memory mocking (if applicable)
- [ ] All test cases from spec implemented
- [ ] Assertions follow AAA pattern (Arrange-Act-Assert)
- [ ] Coverage >= target for file (95% P0, 90% P1, 85% P2)

### Before Committing

```bash
# Run all tests
pnpm test

# Check coverage
pnpm test:coverage

# Lint test files
pnpm lint test/**/*.test.ts

# Type check
pnpm type-check
```

---

## Troubleshooting

### MSW Not Intercepting Requests

**Problem**: Tests making real HTTP requests

**Solution**: Ensure MSW server is started in `beforeAll()`:

```typescript
import { server } from '@test/helpers/msw-handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
```

### vi.mock() Not Working

**Problem**: Mocks not applied

**Solution**: Hoist `vi.mock()` to top of file:

```typescript
// ✅ CORRECT - At top of file
vi.mock('@snapback/platform', () => ({ ... }));

describe('MyTest', () => {
  // tests here
});

// ❌ WRONG - Inside describe
describe('MyTest', () => {
  vi.mock('@snapback/platform', () => ({ ... }));
});
```

### Coverage Not Meeting Target

**Problem**: Coverage below threshold

**Solution**: Check for untested branches:

```bash
# Generate HTML coverage report
pnpm test:coverage

# Open in browser
open coverage/index.html
```

---

## Completion Criteria

### P0 (Demo Critical)
- [ ] AutoDecisionEngine: 95%+ coverage
- [ ] SaveHandler: 95%+ coverage
- [ ] MCP Tools: 95%+ coverage
- [ ] Authentication: 95%+ coverage

### P1 (Launch Critical)
- [ ] StorageManager: 90%+ coverage
- [ ] TierResolver: 90%+ coverage
- [ ] Security: 90%+ coverage
- [ ] Telemetry: 90%+ coverage

### P2 (Quality)
- [ ] Web Portal: 85%+ coverage
- [ ] CLI: 85%+ coverage
- [ ] SDK: 85%+ coverage

### P3 (Polish)
- [ ] Performance tests passing
- [ ] E2E flows passing
- [ ] Overall coverage: 91%+

---

## Next Steps

1. **Week 1**: Start with `test_setup_msw` and `test_helpers_fixtures` tasks
2. **Week 1-2**: Complete all P0 tasks
3. **Week 3-4**: Complete all P1 tasks
4. **Week 5**: Complete all P2 tasks
5. **Week 6**: Complete all P3 tasks
6. **Final**: Run `test_coverage_report` task and update docs

**Total Tasks**: 48 tasks
**Estimated Effort**: 150 hours
**Timeline**: 6 weeks

Good luck! 🚀
