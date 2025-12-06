# @snapback/testing

Centralized testing utilities for the SnapBack monorepo.

## Purpose

This package consolidates all testing utilities, mock handlers, and test fixtures to:
- Eliminate duplication across apps
- Provide consistent testing patterns
- Share test infrastructure across the monorepo

## Structure

```
@snapback/testing/
├── msw/              # MSW (Mock Service Worker) network mocking
│   ├── handlers/     # HTTP request handlers
│   └── server.ts     # MSW server setup
├── mocks/            # Function mocks (not network-based)
│   └── auth.ts       # Authentication mocks
├── utils/            # Testing utilities
│   └── performance.ts # Performance testing harness
└── fixtures/         # Shared test data
```

## Usage

### MSW Handlers

```typescript
import { server } from "@snapback/testing/msw/server";
import { githubHandlers, googleHandlers } from "@snapback/testing/msw/handlers/oauth";

// In test setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Authentication Mocks

```typescript
import { authenticate, getUserInfo } from "@snapback/testing/mocks/auth";

// In tests
const result = await authenticate("sb_live_test123");
expect(result.valid).toBe(true);
expect(result.tier).toBe("pro");
```

### Performance Testing

```typescript
import { measurePerformance } from "@snapback/testing/utils/performance";

const metrics = await measurePerformance(() => {
  // Your code to measure
});
```

## Exports

- `@snapback/testing/msw` - MSW server and utilities
- `@snapback/testing/msw/handlers/oauth` - OAuth handlers (GitHub, Google)
- `@snapback/testing/msw/handlers/resend` - Resend email API handlers
- `@snapback/testing/msw/handlers/posthog` - PostHog analytics handlers
- `@snapback/testing/mocks/auth` - Authentication function mocks
- `@snapback/testing/utils/performance` - Performance testing utilities
- `@snapback/testing/fixtures` - Shared test fixtures

## Migration Notes

This package consolidates:
- `@snapback/auth-mock` → `@snapback/testing/mocks/auth`
- `@snapback/perf` → `@snapback/testing/utils/performance`
- `apps/web/tests/msw` → `@snapback/testing/msw`
- `apps/api/src/test-utils/msw-server.ts` → `@snapback/testing/msw`
