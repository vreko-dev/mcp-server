# E2E Testing Guide

This guide explains how to run, write, and debug End-to-End (E2E) tests for the SnapBack platform using Playwright.

## Running E2E Tests

### Prerequisites

Ensure the development environment is running:
```bash
make dev
```

### Test Commands

- **Run all E2E tests**:
  ```bash
  pnpm test:e2e
  ```

- **Run E2E tests with UI**:
  ```bash
  pnpm test:e2e:ui
  ```

- **Run specific test file**:
  ```bash
  pnpm test:e2e tests/e2e/01-health.spec.ts
  ```

- **Run tests in headed mode**:
  ```bash
  pnpm playwright test --headed
  ```

### Test Environment

Tests run against the local development environment:
- Base URL: http://snapback.dev
- API: http://api.snapback.dev:8080
- MCP: http://mcp.snapback.dev:8081

## Writing New Tests

### Test Structure

Tests are located in `tests/e2e/` and follow this naming convention:
- `01-health.spec.ts` - Health checks
- `02-subdomain-routing.spec.ts` - Subdomain routing
- `03-cross-service.spec.ts` - Cross-service integration
- `04-auth-flow.spec.ts` - Authentication flows
- `05-api-integration.spec.ts` - API integration
- `06-mcp-tools.spec.ts` - MCP tool testing
- `07-docs-search.spec.ts` - Documentation search
- `08-full-user-journey.spec.ts` - Complete user journeys
- `09-performance.spec.ts` - Performance tests

### Test Helpers

Several helper utilities are available in `tests/e2e/helpers/`:

#### Docker Helpers (`docker.ts`)
- `waitForServices()` - Wait for all services to be healthy
- `resetDatabase()` - Truncate test data

#### Authentication Helpers (`auth.ts`)
- `createTestUser()` - Register a test user
- `loginUser()` - Login a user
- `getAuthToken()` - Get JWT token

#### API Helpers (`api.ts`)
- `ApiClient` - Class for making authenticated API requests

### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { createTestUser, loginUser } from '../helpers/auth';

test.describe('Authentication Flow', () => {
  test('user can sign up and login', async ({ page }) => {
    // Create a test user
    const user = await createTestUser();

    // Navigate to login page
    await page.goto('http://console.snapback.dev/login');

    // Fill login form
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify successful login
    await expect(page).toHaveURL('http://console.snapback.dev/dashboard');
  });
});
```

## Debugging Test Failures

### Viewing Test Results

After running tests, view the HTML report:
```bash
pnpm playwright show-report
```

### Recording Videos

Videos are automatically recorded on test failure. View them in the HTML report.

### Taking Screenshots

Add screenshots to your tests:
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

### Debugging with Playwright Inspector

Run tests with the inspector:
```bash
pnpm playwright test --debug
```

### Console Logs

View console logs in tests:
```typescript
page.on('console', msg => console.log(msg.text()));
```

## CI/CD Integration

E2E tests run automatically in GitHub Actions:

1. On pull requests to `main` branch
2. On pushes to `main` branch

The workflow is defined in `.github/workflows/e2e.yml`.

### Test Results

Test results are uploaded as artifacts and can be viewed in the GitHub Actions summary.

## Best Practices

### Test Isolation

- Use unique test data for each test
- Reset database state between tests
- Avoid shared state between tests

### selectors

- Use `data-testid` attributes for reliable selectors
- Avoid brittle CSS selectors
- Prefer user-facing attributes (labels, text content)

### Performance

- Use `test.slow()` for long-running tests
- Set appropriate timeouts
- Parallelize tests where possible

### Error Handling

- Expect specific error messages
- Handle network failures gracefully
- Use retries for flaky tests

## Adding New Test Files

1. Create a new file in `tests/e2e/` with `.spec.ts` extension
2. Follow the naming convention (`0X-description.spec.ts`)
3. Import necessary helpers from `tests/e2e/helpers/`
4. Structure tests with `test.describe` blocks
5. Add appropriate assertions with `expect`

## Test Configuration

The Playwright configuration is in `playwright.config.ts`:

- Tests run in Chromium, Firefox, and WebKit
- Parallel execution with 6 workers
- Retries on CI (2 attempts)
- HTML, JUnit, and list reporters
- Automatic service startup with `make dev`

## Troubleshooting

### Tests Failing Locally but Passing in CI

1. Ensure all services are running: `make dev`
2. Check environment variables in `.env.docker`
3. Reset database: `make db-reset`

### Tests Timing Out

1. Increase test timeout:
   ```typescript
   test.setTimeout(60000); // 60 seconds
   ```

2. Increase action timeout in `playwright.config.ts`

### Authentication Issues

1. Verify `BETTER_AUTH_SECRET` in `.env.docker`
2. Check that auth services are healthy
3. Clear test user data

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Local Development Guide](../local-development.md)
- [Docker Architecture](../architecture/docker.md)
