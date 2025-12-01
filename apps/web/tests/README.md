# Web Application Test Harness

This directory contains a comprehensive test harness for the SnapBack web application, built with Playwright and following best practices for modern web testing.

## Directory Structure

```
tests/
├── e2e/                 # End-to-end tests
├── integration/         # Integration tests
├── load/                # Load/performance tests
├── unit/                # Unit tests
├── utils/               # Test utilities and helpers
│   ├── fixtures/        # Playwright fixtures
│   ├── pages/           # Page Object Models
│   ├── data/            # Test data factories
│   └── helpers/         # Helper functions
├── auth.setup.ts        # Authentication setup
└── setup.ts             # Global test setup
```

## Key Components

### 1. Authentication Fixtures (`utils/fixtures/auth.ts`)

Provides reusable authentication contexts for different user roles:

-   `authenticatedPage` - Generic authenticated page
-   `adminPage` - Pre-authenticated admin page
-   `userPage` - Pre-authenticated regular user page
-   `newUserPage` - Pre-authenticated new user page

### 2. Page Object Models

Encapsulate page interactions for better maintainability:

-   `LoginPage` - Login page interactions
-   `DashboardPage` - Dashboard page interactions

### 3. Test Data Factories (`utils/data/factories.ts`)

Generate consistent test data:

-   `createUser()` - Create test users
-   `createApiKey()` - Create test API keys
-   `createOrganization()` - Create test organizations
-   `createCheckpoint()` - Create test checkpoints
-   `createDevice()` - Create test devices

### 4. Helper Functions

Utility functions for common testing scenarios:

#### Accessibility Testing (`utils/helpers/accessibility.ts`)

-   `checkAccessibility()` - Basic accessibility checks
-   `checkHeadingStructure()` - Validate heading hierarchy

#### API Mocking (`utils/helpers/api-mocking.ts`)

-   `mockApiResponses()` - Mock API responses for testing
-   `mockNetworkError()` - Simulate network errors
-   `mockSlowResponse()` - Simulate slow API responses

#### Performance Testing (`utils/helpers/performance.ts`)

-   `measurePageLoadPerformance()` - Measure page load times
-   `assertPageLoadTime()` - Assert page load time limits
-   `simulateNetworkConditions()` - Simulate different network conditions

#### Visual Regression Testing (`utils/helpers/visual-regression.ts`)

-   `compareScreenshot()` - Compare full page screenshots
-   `compareElementScreenshot()` - Compare specific element screenshots
-   `compareResponsiveScreenshots()` - Test responsive designs

## Usage Examples

### Writing Authenticated Tests

```typescript
import { test } from "../utils/fixtures/auth";
import { DashboardPage } from "../utils/pages/dashboard";

test("can view dashboard metrics", async ({ authenticatedPage }) => {
	const dashboardPage = new DashboardPage(authenticatedPage);

	await dashboardPage.goto();
	await dashboardPage.expectMetricCardVisible("api-calls");
});
```

### Using Test Data Factories

```typescript
import { createUser, createApiKey } from "../utils/data/factories";

test("can create user and API key", async () => {
	const user = createUser({ name: "Test User" });
	const apiKey = createApiKey({ name: "Test Key" });

	// Use the test data in your tests
});
```

### Mocking API Responses

```typescript
import { mockApiResponses } from "../utils/helpers/api-mocking";

test("handles API errors gracefully", async ({ page }) => {
	await mockApiResponses(page);
	// Test behavior with mocked responses
});
```

## Authentication Setup

The test harness includes a setup project (`auth.setup.ts`) that creates authenticated sessions for different user roles. These sessions are saved and reused by tests that depend on the setup project.

To run tests with authentication:

```bash
pnpm exec playwright test
```

## Best Practices

1. **Use Page Object Models** for encapsulating page interactions
2. **Leverage fixtures** for reusable test setup
3. **Generate test data** with factories for consistency
4. **Mock external dependencies** for reliable tests
5. **Check accessibility** as part of your test suite
6. **Measure performance** to catch regressions
7. **Use visual regression** for UI consistency

## Running Tests

```bash
# Run all tests
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test tests/e2e/authenticated-user.spec.ts

# Run tests with trace recording
pnpm exec playwright test --trace on
```
