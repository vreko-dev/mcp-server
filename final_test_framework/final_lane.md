# SnapBack Final Testing Lane

**Version**: 1.0  
**Purpose**: Consolidated testing strategy with centralized utilities  
**Last Updated**: December 2024

---

## Overview

This document describes the final testing architecture for SnapBack, with all utilities centralized in `@snapback/testing`.

---

## Testing Package Structure

```
packages/testing/
├── src/
│   ├── index.ts                 # Main exports
│   ├── vitest-config.ts         # Vitest presets (node, jsdom, integration, e2e)
│   ├── fixtures/
│   │   ├── index.ts
│   │   └── factories.ts         # Test data factories
│   ├── mocks/
│   │   ├── auth.ts              # Authentication mocks
│   │   └── vscode.ts            # VS Code API mocks
│   ├── msw/
│   │   ├── index.ts             # MSW handlers
│   │   ├── server.ts            # MSW server setup
│   │   └── handlers/
│   │       ├── oauth.ts         # OAuth handlers
│   │       ├── posthog.ts       # Analytics handlers
│   │       └── resend.ts        # Email handlers
│   ├── setup/
│   │   └── hooks.ts             # beforeEach/afterEach hooks
│   ├── matchers/
│   │   └── index.ts             # Custom vitest matchers
│   └── utils/
│       ├── console.ts           # Console control utilities
│       ├── DeterministicTime.ts # Time mocking
│       ├── TestCleanupManager.ts # Resource cleanup
│       └── performance.ts       # Performance testing
└── package.json
```

---

## How to Use

### 1. Add Dependency

```json
{
  "devDependencies": {
    "@snapback/testing": "workspace:*"
  }
}
```

### 2. Configure Vitest

```typescript
// vitest.config.ts
import { mergeConfig } from 'vitest/config';
import { nodePreset } from '@snapback/testing/vitest-config';

export default mergeConfig(nodePreset, {
  test: {
    setupFiles: ['./test/setup.ts'],
  },
});
```

### 3. Create Setup File

```typescript
// test/setup.ts
import { setupTestHooks } from '@snapback/testing/setup/hooks';
import '@snapback/testing/matchers';

setupTestHooks({
  useFakeTimers: false,
  silenceConsole: true,
});
```

### 4. Use in Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createTestUser, createTestSnapshot } from '@snapback/testing/fixtures/factories';
import { captureConsole, withSilentConsole } from '@snapback/testing/utils/console';

describe('MyComponent', () => {
  it('should work', async () => {
    const user = createTestUser({ tier: 'pro' });
    const snapshot = createTestSnapshot({ userId: user.id });
    
    expect(snapshot.userId).toBe(user.id);
  });

  it('should handle console output', async () => {
    const capture = captureConsole();
    
    console.log('test message');
    
    expect(capture.logs).toContain('test message');
    capture.restore();
  });
});
```

---

## VS Code Extension Testing

For VS Code extension tests, use the centralized mocks:

```typescript
// test/setup.ts
import { vi } from 'vitest';
import { 
  mockVscode, 
  MockEventEmitter,
  createMockOutputChannel 
} from '@snapback/testing/mocks/vscode';

vi.mock('vscode', () => mockVscode);

// For custom mocks
import { createVscodeMock } from '@snapback/testing/mocks/vscode';

const customMock = createVscodeMock({
  window: {
    showInformationMessage: vi.fn().mockResolvedValue('Yes'),
  },
});
```

---

## Custom Matchers

The testing package provides custom matchers:

```typescript
// Import for side effects
import '@snapback/testing/matchers';

// Now available in tests:
expect(50).toBeWithinRange(0, 100);           // Number range check
expect(result).toMatchResult({ success: true }); // Result<T,E> matching
expect('snap_abc123').toBeValidSnapshotId();  // Snapshot ID format
expect('sess_xyz789').toBeValidSessionId();   // Session ID format
expect(0.75).toBeRiskScore();                 // Risk score 0-1
expect('watch').toBeProtectionLevel();        // Protection level enum
expect(files).toContainFile('/src/index.ts'); // File array contains
```

---

## Performance Testing

```typescript
import { createBenchmark, checkBudget, ALPHA_BUDGETS } from '@snapback/testing/utils/performance';

const benchmark = createBenchmark('snapshot-creation', { iterations: 10 });

const result = await benchmark.run(async () => {
  await createSnapshot(fileContent);
});

const check = checkBudget(result, {
  name: 'snapshot-creation',
  p95: 100, // 100ms budget
  variance: 0.2, // ±20%
});

expect(check.passed).toBe(true);
```

---

## MSW Integration

```typescript
import { server, handlers } from '@snapback/testing/msw';
import { http, HttpResponse } from 'msw';

// In test setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Override handlers in specific tests
it('should handle API error', async () => {
  server.use(
    http.post('https://api.snapback.dev/analyze', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );
  
  // Test error handling...
});
```

---

## Test Data Factories

```typescript
import { 
  createTestUser,
  createTestSnapshot,
  createTestApiKey,
  createTestOrganization,
  createTestRiskAnalysis,
  createMany,
} from '@snapback/testing/fixtures/factories';

// Create with defaults
const user = createTestUser();

// Create with overrides
const proUser = createTestUser({ tier: 'pro' });

// Create multiple
const users = createMany(5, createTestUser, { tier: 'pro' });

// Create related entities
const user = createTestUser();
const apiKey = createTestApiKey({ userId: user.id });
const snapshot = createTestSnapshot({ userId: user.id });
```

---

## Test Categories

### Unit Tests (70% of test count)
- Location: `test/unit/` or `src/**/__tests__/`
- Timeout: 10s
- Mock external dependencies
- Test single functions/classes

### Integration Tests (20% of test count)
- Location: `test/integration/`
- Timeout: 30s
- Use real implementations
- Test component interactions

### E2E Tests (10% of test count)
- Location: `test/e2e/`
- Timeout: 60s
- Test full user flows
- Run sequentially

---

## TDD Workflow

1. **RED**: Write failing test
   ```typescript
   it('should return snapshot when file exists', async () => {
     const snapshot = await getSnapshot('snap_123');
     expect(snapshot).toMatchResult({ success: true });
   });
   ```

2. **GREEN**: Write minimal code to pass
   ```typescript
   export function getSnapshot(id: string): Result<Snapshot, Error> {
     const snapshot = storage.get(id);
     if (!snapshot) return Err(new Error('Not found'));
     return Ok(snapshot);
   }
   ```

3. **REFACTOR**: Improve without breaking tests

---

## Coverage Requirements

| Test Type | Statements | Branches | Functions | Lines |
|-----------|------------|----------|-----------|-------|
| Unit | 80% | 75% | 80% | 80% |
| Integration | 60% | 50% | 60% | 60% |
| E2E | 40% | 30% | 40% | 40% |

---

## Test Naming Conventions

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // ...
    });
  });
});
```

Examples:
- `it('should return null when cooldown expired')`
- `it('should create snapshot when AI detected')`
- `it('should throw when invalid input provided')`

---

## Quick Reference

| Import | Purpose |
|--------|--------|
| `@snapback/testing` | Core exports |
| `@snapback/testing/mocks/vscode` | VS Code API mocks |
| `@snapback/testing/mocks/auth` | Auth mocks |
| `@snapback/testing/msw` | MSW handlers |
| `@snapback/testing/setup/hooks` | Test lifecycle hooks |
| `@snapback/testing/matchers` | Custom vitest matchers |
| `@snapback/testing/fixtures/factories` | Test data factories |
| `@snapback/testing/utils/performance` | Performance benchmarks |
| `@snapback/testing/utils/console` | Console control |
| `@snapback/testing/vitest-config` | Vitest presets |

---

## Related Documents

- [Testing Blueprint](../demo_prep/testing_blueprint.md) - Complete test scenarios
- [High ROI Test Strategy](./high_roi_test_strategy.md) - Contract & trust tests
- [@snapback/testing README](../packages/testing/README.md) - Package documentation