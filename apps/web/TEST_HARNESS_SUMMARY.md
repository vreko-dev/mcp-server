# SnapBack Web Application Test Harness

This document provides an overview of the comprehensive test harness created for the SnapBack web application. The harness is built on Playwright and follows industry best practices for modern web testing.

## Overview

The test harness provides a complete set of tools and utilities for testing the SnapBack web application, including:

1. **Authentication Fixtures** - Reusable authentication contexts for different user roles
2. **Page Object Models** - Encapsulated page interactions for better maintainability
3. **Test Data Factories** - Consistent test data generation
4. **Helper Functions** - Utilities for common testing scenarios
5. **Setup Projects** - Automated authentication state generation
6. **Best Practices** - Following Playwright and testing industry standards

## Directory Structure

```
tests/
├── e2e/                    # End-to-end tests
├── integration/            # Integration tests
├── load/                   # Load/performance tests
├── unit/                   # Unit tests
├── utils/                  # Test utilities and helpers
│   ├── fixtures/           # Playwright fixtures
│   ├── pages/              # Page Object Models
│   ├── data/               # Test data factories
│   └── helpers/            # Helper functions
├── test-files/             # Temporary test files
├── playwright/.auth/       # Authentication states
├── auth.setup.ts           # Authentication setup
└── setup.ts                # Global test setup
```

## Key Components

### 1. Authentication Fixtures (`tests/utils/fixtures/auth.ts`)

Provides reusable authentication contexts for different user roles:

-   `authenticatedPage` - Generic authenticated page
-   `adminPage` - Pre-authenticated admin page
-   `userPage` - Pre-authenticated regular user page
-   `newUserPage` - Pre-authenticated new user page

### 2. Page Object Models

Encapsulate page interactions for better maintainability:

-   `LoginPage` - Login page interactions (`tests/utils/pages/login.ts`)
-   `DashboardPage` - Dashboard page interactions (`tests/utils/pages/dashboard.ts`)

### 3. Test Data Factories (`tests/utils/data/factories.ts`)

Generate consistent test data:

-   `createUser()` - Create test users
-   `createApiKey()` - Create test API keys
-   `createOrganization()` - Create test organizations
-   `createCheckpoint()` - Create test checkpoints
-   `createDevice()` - Create test devices

### 4. Helper Functions

Utility functions for common testing scenarios:

#### Accessibility Testing (`tests/utils/helpers/accessibility.ts`)

-   `checkAccessibility()` - Basic accessibility checks
-   `checkHeadingStructure()` - Validate heading hierarchy

#### API Mocking (`tests/utils/helpers/api-mocking.ts`)

-   `mockApiResponses()` - Mock API responses for testing
-   `mockNetworkError()` - Simulate network errors
-   `mockSlowResponse()` - Simulate slow API responses

#### Performance Testing (`tests/utils/helpers/performance.ts`)

-   `measurePageLoadPerformance()` - Measure page load times
-   `assertPageLoadTime()` - Assert page load time limits
-   `simulateNetworkConditions()` - Simulate different network conditions

#### Visual Regression Testing (`tests/utils/helpers/visual-regression.ts`)

-   `compareScreenshot()` - Compare full page screenshots
-   `compareElementScreenshot()` - Compare specific element screenshots
-   `compareResponsiveScreenshots()` - Test responsive designs

#### File Upload Testing (`tests/utils/helpers/file-upload.ts`)

-   `createTestFile()` - Create temporary test files
-   `uploadFile()` - Upload files using Playwright
-   `uploadMultipleFiles()` - Upload multiple files

#### Form Validation (`tests/utils/helpers/forms.ts`)

-   `fillForm()` - Fill form fields
-   `submitForm()` - Submit forms
-   `expectFormErrors()` - Check form validation errors

#### Date/Time Testing (`tests/utils/helpers/datetime.ts`)

-   `formatDateForInput()` - Format dates for input fields
-   `getDateInFuture()` - Get future dates
-   `fillDateInput()` - Fill date input fields

#### Search Functionality (`tests/utils/helpers/search.ts`)

-   `performSearch()` - Perform searches
-   `expectSearchResultsCount()` - Assert search results count
-   `expectSearchSuggestions()` - Test search suggestions

### 5. Setup Projects (`tests/auth.setup.ts`)

Automated authentication state generation for different user roles:

-   Regular user authentication
-   Admin user authentication
-   New user authentication

### 6. Easy Imports (`tests/utils/index.ts`)

Centralized export file for easy importing of all utilities.

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

## Best Practices Implemented

1. **Page Object Models** - Encapsulate page interactions for better maintainability
2. **Fixtures** - Reusable test setup and teardown
3. **Test Data Factories** - Generate consistent, realistic test data
4. **API Mocking** - Reliable tests that don't depend on external services
5. **Accessibility Testing** - Ensure applications are accessible
6. **Performance Testing** - Catch performance regressions
7. **Visual Regression** - Prevent UI regressions
8. **Proper Error Handling** - Tests handle errors gracefully
9. **Clean Test Environment** - Tests don't leave artifacts
10. **Parallel Execution** - Tests can run in parallel for faster execution

## Running Tests

```bash
# Initialize test environment
pnpm run init-test-env

# Run all tests
pnpm exec playwright test

# Run tests in UI mode
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test tests/e2e/authenticated-user.spec.ts

# Run tests with trace recording
pnpm exec playwright test --trace on

# Run authentication setup
pnpm exec playwright test tests/auth.setup.ts
```

## Future Enhancements

1. **Add more Page Object Models** for other pages in the application
2. **Expand test data factories** to cover more entity types
3. **Add more helper functions** for specific application features
4. **Implement more comprehensive accessibility testing** with axe-core
5. **Add mobile testing capabilities** for responsive design
6. **Implement more complex authentication scenarios** (OAuth, SSO)
7. **Add database seeding utilities** for integration tests
8. **Create reusable test workflows** for common user journeys

This test harness provides a solid foundation for testing the SnapBack web application and can be easily extended as the application grows.
