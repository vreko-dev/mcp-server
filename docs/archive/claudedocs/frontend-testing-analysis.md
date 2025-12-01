# Frontend Testing Analysis Report

**Generated:** October 1, 2025
**App:** SnapBack.dev - Next.js 15 with React 19
**Testing Stack:** Vitest (unit/integration) + Playwright (E2E)

---

## Executive Summary

**Overall Frontend Test Health:** 🔴 **CRITICAL ISSUES DETECTED**

| Test Category              | Status         | Pass Rate  | Issues                                                |
| -------------------------- | -------------- | ---------- | ----------------------------------------------------- |
| **Unit Tests (Vitest)**    | 🔴 **FAILING** | 0/4 (0%)   | Jest/Vitest API confusion, import errors, mock issues |
| **E2E Tests (Playwright)** | 🟡 **MIXED**   | Unknown    | Wrong test runner, some passing                       |
| **Integration Tests**      | 🔴 **FAILING** | 0/1 (0%)   | Missing dependencies (bcrypt)                         |
| **Load Tests**             | 🟢 **PASSING** | 1/1 (100%) | No issues                                             |

**Critical Finding:** Tests are using **Jest API with Vitest runner**, causing systematic failures.

---

## 1. Failing Tests - Detailed Analysis

### 1.1 Unit Test Failures (Vitest)

#### **Test:** `rate-limiter.test.ts` (2/2 failures)

**Location:** `/apps/web/tests/unit/rate-limiter.test.ts`

**Error:**

```
Cannot read properties of undefined (reading 'useFakeTimers')
Cannot read properties of undefined (reading 'useRealTimers')
```

**Root Cause:** Jest/Vitest API Mismatch

```typescript
// Line 1: INCORRECT - imports jest from vitest
import { describe, expect, test, jest } from "vitest";

// Lines 30, 34: Using Jest API with Vitest
jest.useFakeTimers(); // ❌ jest is undefined in Vitest
jest.useRealTimers(); // ❌ jest is undefined in Vitest
jest.advanceTimersByTime(5000); // ❌ Not available
```

**Fix Required:**

```typescript
// Use Vitest API instead
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

test("token bucket refills correctly", () => {
	const bucket = rateLimiter.createBucket({
		capacity: 10,
		refillRate: 1,
		tokens: 0,
	});

	vi.advanceTimersByTime(5000); // ✅ Vitest API
	expect(bucket.getAvailableTokens()).toBe(5);
});
```

#### **Test:** `NavBar.test.tsx` (2/2 failures)

**Location:** `/apps/web/__tests__/components/NavBar.test.tsx`

**Error 1: Multiple Elements Found**

```
Found multiple elements with the text: Features
```

**Root Cause:** NavBar renders twice (desktop + mobile menu)

```typescript
// Line 60: FAILS - both desktop and mobile nav contain "Features"
expect(screen.getByText("Features")).toBeInTheDocument();
```

**NavBar Structure:**

-   Desktop menu (`.lg:flex` - visible on large screens)
-   Mobile menu (`Sheet` component - hidden on desktop)
-   Both contain identical "Features" links

**Fix Required:**

```typescript
// Option 1: Use getAllByText for multiple instances
expect(screen.getAllByText("Features")).toHaveLength(2); // Desktop + Mobile

// Option 2: Query specific menu
const desktopNav = screen.getByRole("navigation");
expect(within(desktopNav).getByText("Features")).toBeInTheDocument();

// Option 3: Use more specific selectors
expect(screen.getByRole("link", { name: "Features" })).toBeInTheDocument();
```

**Error 2: Translation Keys Not Rendered**

```
Unable to find an element with the text: common.menu.dashboard
```

**Root Cause:** Mock returns translation key instead of translated text

```typescript
// Line 44: Mock returns the key, not translated text
(useTranslations as jest.Mock).mockReturnValue((key: string) => key);

// Test expects translated text "Dashboard" but mock returns "common.menu.dashboard"
```

**NavBar Implementation:**

```typescript
// NavBar.tsx doesn't use these translation keys
// It uses hardcoded labels: "Features", "Pricing", "Docs", "Sign in", "Get Started"
// The test expectations don't match actual implementation
```

**Fix Required:**

```typescript
// Update test to match actual NavBar implementation
it("renders correctly", () => {
	render(<NavBar />);

	// NavBar uses hardcoded labels, not translation keys
	expect(screen.getAllByText("Features")[0]).toBeInTheDocument();
	expect(screen.getAllByText("Pricing")[0]).toBeInTheDocument();
	expect(screen.getAllByText("Docs")[0]).toBeInTheDocument();
	expect(screen.getAllByText("Sign in")[0]).toBeInTheDocument();
	expect(screen.getAllByText("Get Started")[0]).toBeInTheDocument();
});
```

**Error 3: Jest Mock Type Assertion**

```typescript
// Lines 43, 72: Using Jest types with Vitest
(useSession as jest.Mock).mockReturnValue({ user: null }); // ❌ Should use vi.Mock
```

**Fix Required:**

```typescript
import { Mock } from "vitest";

(useSession as Mock).mockReturnValue({ user: null });
```

#### **Test:** `InfiniteMovingCards.test.tsx` (1/1 failure)

**Location:** `/apps/web/__tests__/components/InfiniteMovingCards.test.tsx`

**Error:**

```
Failed to resolve import "../../modules/ui/components/aceternity/infinite-moving-cards"
Does the file exist?
```

**Root Cause:** Component file moved/deleted

-   Test imports from: `modules/ui/components/aceternity/infinite-moving-cards.tsx`
-   Actual location: `modules/marketing/components/ui/infinite-moving-cards.tsx`
-   Git status shows: `D apps/web/modules/ui/components/aceternity/infinite-moving-cards.tsx` (deleted)

**Fix Required:**

```typescript
// Update import path
import { InfiniteMovingCards } from "../../modules/marketing/components/ui/infinite-moving-cards";
```

---

### 1.2 Integration Test Failures

#### **Test:** `api-keys.test.ts` (1/1 failure)

**Location:** `/apps/web/tests/integration/api-keys.test.ts`

**Error:**

```
Failed to resolve import "bcrypt" from "tests/integration/api-keys.test.ts"
Does the file exist?
```

**Root Cause:** Missing dependency in package.json

```typescript
// Line 5: Imports bcrypt which is not installed
import bcrypt from "bcrypt";
```

**Fix Required:**

```bash
# Install bcrypt
pnpm add -D bcrypt @types/bcrypt

# Or use existing @node-rs/argon2 which is already installed
import { hash, verify } from '@node-rs/argon2';
```

**Additional Issues in This Test:**

-   Uses `jest.Mock` type instead of Vitest's `Mock` (Line 119)
-   Mocks don't match actual API structure
-   Test expects API endpoints that may not exist

---

### 1.3 E2E Test Issues (Playwright)

#### **Test:** `home.spec.ts` (1/1 failure)

**Location:** `/apps/web/tests/home.spec.ts`

**Error:**

```
Playwright Test did not expect test.describe() to be called here.
Most common reasons include:
- You are calling test.describe() in a file that is imported by the configuration file.
- You have two different versions of @playwright/test.
```

**Root Cause:** File location conflict

-   Located in `tests/home.spec.ts` (should be in `tests/e2e/`)
-   Vitest config includes: `include: ['**/*.{test,spec}.{js,ts,jsx,tsx}']`
-   Playwright config includes: `testMatch: /.*\.spec\.ts/`
-   **Both test runners are trying to execute this file**

**Fix Required:**

```bash
# Move to correct location
mv apps/web/tests/home.spec.ts apps/web/tests/e2e/home.spec.ts

# Or update Vitest config to exclude Playwright tests (already done)
# vitest.config.ts already has: exclude: ['**/tests/e2e/**']
```

---

## 2. Root Cause Analysis

### 2.1 Primary Issues

#### **Issue 1: Jest/Vitest API Confusion** 🔴 CRITICAL

**Impact:** 100% of unit tests failing

**Problem:**

-   Tests import `jest` from `vitest` package (incorrect)
-   Use Jest timer API (`jest.useFakeTimers()`) instead of Vitest API (`vi.useFakeTimers()`)
-   Use `jest.Mock` type instead of Vitest's `Mock` type

**Evidence:**

```typescript
// ❌ WRONG - vitest doesn't export 'jest'
import { describe, expect, test, jest } from "vitest";

// ✅ CORRECT
import { describe, expect, test, vi } from "vitest";
```

**Why This Happened:**

-   Tests were written for Jest, then project migrated to Vitest
-   Migration script at `/scripts/migrate-to-vitest.ts` exists but may not have been run
-   Some files in git status: `scripts/update-jest-imports.js`, `scripts/migrate-to-vitest.ts`

#### **Issue 2: Component Structure Mismatches** 🔴 CRITICAL

**Impact:** Component tests don't reflect actual implementation

**Problems:**

1. **NavBar Test Assumptions:**

    - Tests expect translation keys to be rendered as-is
    - Actual implementation uses hardcoded labels
    - Tests don't account for responsive design (desktop + mobile menus)

2. **Import Path Mismatch:**
    - InfiniteMovingCards moved from `aceternity` to `marketing/components`
    - Test imports not updated

#### **Issue 3: Test File Organization** 🟡 MEDIUM

**Impact:** Test runner conflicts, failed test execution

**Problems:**

-   `home.spec.ts` in wrong directory (should be in `e2e/`)
-   Both Vitest and Playwright trying to run the same file
-   No clear separation between unit and E2E test patterns

#### **Issue 4: Missing Dependencies** 🟡 MEDIUM

**Impact:** Integration tests can't run

**Problems:**

-   `bcrypt` not in package.json but imported in tests
-   Should use `@node-rs/argon2` which is already installed

---

### 2.2 Configuration Issues

#### **Vitest Setup (`vitest.setup.ts`)**

```typescript
// Line 11: Mocks Next.js navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
	}),
	useSearchParams: () => ({ get: vi.fn() }),
	usePathname: () => "/",
}));
```

**Issues:**

-   Basic mocks may not cover all Next.js 15 APIs
-   No mock for `useLocalePathname` from `@i18n/routing` (used in NavBar)
-   Missing `motion/react` mock for animation libraries

#### **Playwright Configuration (`playwright.config.ts`)**

```typescript
testMatch: /.*\.spec\.ts/,  // Matches ALL .spec.ts files
testDir: "./tests",         // Starts from tests/ directory
```

**Issues:**

-   Will try to run `tests/home.spec.ts` (should be E2E only)
-   Vitest exclusion may not be enough if file is in root `tests/`

---

## 3. Patterns of Failures

### 3.1 Common Anti-Patterns

#### **Pattern 1: Jest to Vitest Migration Incomplete**

**Occurrence:** 3/4 test files

```typescript
// Found in:
// - tests/unit/rate-limiter.test.ts (line 1)
// - __tests__/components/NavBar.test.tsx (lines 43, 72)
// - tests/integration/api-keys.test.ts (line 119)

import { jest } from "vitest"; // ❌
useSession as jest.Mock; // ❌
jest.useFakeTimers(); // ❌
```

#### **Pattern 2: Stale Import Paths**

**Occurrence:** 1/4 test files

```typescript
// Component moved but test not updated
import from "../../modules/ui/components/aceternity/infinite-moving-cards"  // ❌
// Should be:
import from "../../modules/marketing/components/ui/infinite-moving-cards"   // ✅
```

#### **Pattern 3: Incomplete Mocking**

**Occurrence:** 2/4 test files

```typescript
// NavBar uses LocaleLink, Logo, Sheet, etc. but mocks are incomplete
// Missing mocks for:
// - motion/react (framer-motion)
// - @i18n/routing exports
```

#### **Pattern 4: Test-Implementation Mismatch**

**Occurrence:** 1/4 test files

```typescript
// Test expects translation keys, component uses hardcoded text
expect(screen.getByText("common.menu.dashboard"))  // ❌
// Component actually renders:
<NextLink href="/app">Get Started</NextLink>       // Hardcoded
```

---

### 3.2 Testing Anti-Patterns Detected

1. **Hard-coded waits instead of proper queries**

    ```typescript
    // marketing-hero.spec.ts line 45
    await page.waitForTimeout(1000); // ❌ Flaky
    ```

2. **Brittle selectors**

    ```typescript
    // Using data-testid without fallback
    await expect(page.locator('[data-testid="terminal"]')).toBeVisible();
    ```

3. **No accessibility testing utilities**

    - accessibility.spec.ts has placeholder code (line 56: `expect(true).toBe(true)`)
    - Should use `@axe-core/playwright` or `jest-axe`

4. **Mock pollution between tests**
    - NavBar test doesn't reset mocks between test cases
    - Config object mutation (line 45: `(config as any) = {...}`)

---

## 4. Recommendations for Fixing

### 4.1 Immediate Fixes (Critical Path) - 2-4 hours

#### **Fix 1: Run Jest to Vitest Migration** (30 min)

```bash
# Script already exists
node scripts/update-jest-imports.js
# OR
ts-node scripts/migrate-to-vitest.ts

# Manual verification needed after
```

#### **Fix 2: Fix Timer API Usage** (15 min)

```typescript
// File: tests/unit/rate-limiter.test.ts
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

test("token bucket refills correctly", () => {
	// ... test code
	vi.advanceTimersByTime(5000); // Replace all jest.advanceTimersByTime
});
```

#### **Fix 3: Fix NavBar Component Test** (30 min)

```typescript
// File: __tests__/components/NavBar.test.tsx
import { render, screen, within } from "@testing-library/react";
import { Mock } from "vitest";

// Fix mocks
vi.mock("@saas/auth/hooks/use-session");
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// Fix mock for i18n routing
vi.mock("@i18n/routing", () => ({
	LocaleLink: ({ children, href }: any) => <a href={href}>{children}</a>,
	useLocalePathname: () => "/",
}));

// Fix mock for motion
vi.mock("motion/react", () => ({
	motion: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
		nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
	},
}));

describe("NavBar", () => {
	beforeEach(() => {
		(useSession as Mock).mockReturnValue({ user: null });
	});

	it("renders navigation items", () => {
		render(<NavBar />);

		// Use getAllByText for items that appear in both desktop and mobile
		const featuresLinks = screen.getAllByText("Features");
		expect(featuresLinks).toHaveLength(2); // Desktop + mobile

		// Or query specific container
		const desktopNav = screen.getByRole("navigation");
		expect(within(desktopNav).getByText("Pricing")).toBeInTheDocument();
	});

	it("renders authenticated state", () => {
		(useSession as Mock).mockReturnValue({ user: { id: 1 } });
		render(<NavBar />);

		// NavBar shows "Get Started" -> "/app" when logged in
		const ctaLinks = screen.getAllByText("Get Started");
		expect(ctaLinks[0]).toHaveAttribute("href", "/app");
	});
});
```

#### **Fix 4: Fix Import Paths** (15 min)

```typescript
// File: __tests__/components/InfiniteMovingCards.test.tsx
import { InfiniteMovingCards } from "@marketing/components/ui/infinite-moving-cards";

// Or use path alias from vitest.config.ts
import { InfiniteMovingCards } from "../../modules/marketing/components/ui/infinite-moving-cards";
```

#### **Fix 5: Move Misplaced Test File** (5 min)

```bash
mv apps/web/tests/home.spec.ts apps/web/tests/e2e/home.spec.ts
```

#### **Fix 6: Fix Dependencies** (10 min)

```typescript
// File: tests/integration/api-keys.test.ts
// Remove bcrypt, use existing argon2
import { hash, verify } from "@node-rs/argon2";

// Update test
expect(await verify(stored.key, data.key)).toBe(true);
```

---

### 4.2 Short-Term Improvements (Quality) - 4-8 hours

#### **Improvement 1: Add Missing Test Utilities**

```bash
pnpm add -D @axe-core/playwright
pnpm add -D @testing-library/user-event  # Already installed
```

```typescript
// Update accessibility.spec.ts
import { injectAxe, checkA11y } from "@axe-core/playwright";

test("should have no accessibility violations", async ({ page }) => {
	await page.goto("/");
	await injectAxe(page);
	await checkA11y(page);
});
```

#### **Improvement 2: Enhance Vitest Setup**

```typescript
// vitest.setup.ts - add motion mock
vi.mock("motion/react", () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      return ({ children, ...props }: any) => {
        const Tag = prop as string;
        return createElement(Tag, props, children);
      };
    }
  }),
  AnimatePresence: ({ children }: any) => children,
  useReducedMotion: () => false,
}));

// Mock framer-motion for legacy components
vi.mock("framer-motion", () => ({
  motion: /* same as above */,
  AnimatePresence: ({ children }: any) => children,
}));
```

#### **Improvement 3: Create Test Helpers**

```typescript
// File: apps/web/__tests__/helpers/render.tsx
import { render as rtlRender } from "@testing-library/react";
import { Mock } from "vitest";

export function renderWithMocks(
	ui: React.ReactElement,
	{ session = null, locale = "en", ...options } = {}
) {
	// Auto-setup common mocks
	const { useSession } = await import("@saas/auth/hooks/use-session");
	(useSession as Mock).mockReturnValue({ user: session });

	return rtlRender(ui, options);
}
```

#### **Improvement 4: Fix E2E Test Patterns**

```typescript
// marketing-hero.spec.ts - remove hard waits
test("should animate terminal commands", async ({ page }) => {
	await page.goto("/");

	const terminalContent = page.locator('[data-testid="terminal-content"]');

	// ❌ BEFORE: Hard wait
	// await page.waitForTimeout(500);

	// ✅ AFTER: Wait for content
	await terminalContent.waitFor({ state: "visible" });
	await expect(terminalContent).not.toBeEmpty();

	// Wait for animation to progress
	await expect(terminalContent).toContainText("npm install", {
		timeout: 3000,
	});
});
```

---

### 4.3 Long-Term Best Practices - 8-16 hours

#### **Practice 1: Implement Visual Regression Testing**

```typescript
// tests/e2e/visual-regression.spec.ts
import { test, expect } from "@playwright/test";

test("homepage visual consistency", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveScreenshot("homepage.png", {
		maxDiffPixels: 100,
	});
});
```

#### **Practice 2: Add Component Integration Tests**

```typescript
// __tests__/integration/navbar-auth-flow.test.tsx
test("navbar updates when user logs in", async () => {
	const { rerender } = renderWithMocks(<NavBar />, { session: null });

	expect(screen.getByText("Sign in")).toBeInTheDocument();

	// Simulate login
	const { useSession } = await import("@saas/auth/hooks/use-session");
	(useSession as Mock).mockReturnValue({ user: { id: 1 } });

	rerender(<NavBar />);

	expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
	expect(screen.getByText("Get Started")).toHaveAttribute("href", "/app");
});
```

#### **Practice 3: Implement Accessibility Testing**

```typescript
// __tests__/accessibility/navbar.test.tsx
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

test("NavBar is accessible", async () => {
	const { container } = render(<NavBar />);
	const results = await axe(container);
	expect(results).toHaveNoViolations();
});
```

#### **Practice 4: Add Performance Testing**

```typescript
// tests/e2e/frontend-performance.spec.ts
test("Core Web Vitals meet thresholds", async ({ page }) => {
	await page.goto("/");

	const metrics = await page.evaluate(() => {
		return new Promise((resolve) => {
			new PerformanceObserver((list) => {
				const entries = list.getEntries();
				resolve(entries);
			}).observe({ entryTypes: ["navigation", "paint"] });
		});
	});

	const fcp = metrics.find((m) => m.name === "first-contentful-paint");
	expect(fcp.startTime).toBeLessThan(1800); // 1.8s threshold
});
```

---

## 5. Test Build Pipeline Integration

### 5.1 Current Pipeline Issues

#### **Issue: No Pre-commit Hooks**

```bash
# .husky/pre-commit (doesn't exist)
#!/bin/sh
pnpm test:changed  # Run tests for changed files only
```

#### **Issue: No CI/CD Test Automation**

```yaml
# .github/workflows/test.yml (should exist)
name: Test
on: [push, pull_request]
jobs:
    unit:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - run: pnpm install
            - run: pnpm --filter web run test

    e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - run: pnpm install
            - run: pnpm --filter web run e2e:ci
```

### 5.2 Recommended Pipeline

#### **Stage 1: Pre-commit (Local)**

```json
// package.json
{
	"scripts": {
		"test:changed": "vitest run --changed --reporter=dot",
		"test:related": "vitest related --run"
	}
}
```

```bash
# Install husky
pnpm add -D husky lint-staged

# Setup pre-commit
npx husky init
```

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
pnpm test:changed
pnpm biome check --changed
```

#### **Stage 2: PR Checks (CI)**

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on: pull_request

jobs:
    unit-tests:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - run: pnpm install
            - run: pnpm --filter web run test:coverage
            - uses: codecov/codecov-action@v3
              with:
                  files: ./apps/web/coverage/coverage-final.json

    component-tests:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - run: pnpm install
            - run: pnpm --filter web run test -- __tests__/components
```

#### **Stage 3: Integration Tests (CI)**

```yaml
# .github/workflows/integration.yml
name: Integration Tests
on:
    push:
        branches: [main, develop]

jobs:
    e2e-critical:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - run: pnpm install
            - run: pnpm --filter web run e2e:critical
            - uses: actions/upload-artifact@v3
              if: failure()
              with:
                  name: playwright-report
                  path: apps/web/playwright-report/
```

#### **Stage 4: Nightly Full Suite (Scheduled)**

```yaml
# .github/workflows/nightly.yml
name: Nightly Tests
on:
    schedule:
        - cron: "0 2 * * *" # 2 AM daily

jobs:
    full-e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - run: pnpm install
            - run: pnpm --filter web run e2e:ci
            - run: pnpm --filter web run test:coverage
```

### 5.3 Test Organization Strategy

#### **Recommended Structure**

```
apps/web/
├── __tests__/              # Unit tests (co-located with code in future)
│   ├── components/         # Component unit tests
│   ├── hooks/             # Hook unit tests
│   ├── utils/             # Utility function tests
│   └── helpers/           # Test helpers and utilities
├── tests/
│   ├── unit/              # Isolated unit tests
│   ├── integration/       # Integration tests (API + DB)
│   ├── e2e/               # End-to-end tests (Playwright)
│   │   ├── critical/      # Critical path tests (run on every PR)
│   │   ├── marketing/     # Marketing page tests
│   │   ├── dashboard/     # Dashboard feature tests
│   │   └── accessibility/ # A11y tests
│   └── load/              # Performance/load tests
```

#### **Test Execution Strategy**

```json
// package.json scripts
{
	"test": "vitest run",
	"test:watch": "vitest",
	"test:ui": "vitest --ui",
	"test:coverage": "vitest run --coverage",
	"test:unit": "vitest run __tests__ tests/unit",
	"test:integration": "vitest run tests/integration",
	"test:changed": "vitest run --changed",

	"e2e": "playwright test --ui",
	"e2e:ci": "playwright test",
	"e2e:critical": "playwright test tests/e2e/critical",
	"e2e:headed": "playwright test --headed",
	"e2e:debug": "playwright test --debug"
}
```

---

## 6. Testing Best Practices for Next.js 15 + React 19

### 6.1 Component Testing Patterns

#### **Pattern 1: Test User Interactions, Not Implementation**

```typescript
// ❌ BAD - Testing implementation details
test("calls onClick when button clicked", () => {
	const onClick = vi.fn();
	render(<Button onClick={onClick} />);
	fireEvent.click(screen.getByRole("button"));
	expect(onClick).toHaveBeenCalled();
});

// ✅ GOOD - Testing user behavior
test("submits form when button clicked", async () => {
	const user = userEvent.setup();
	render(<LoginForm />);

	await user.type(screen.getByLabelText("Email"), "test@example.com");
	await user.type(screen.getByLabelText("Password"), "password123");
	await user.click(screen.getByRole("button", { name: /sign in/i }));

	expect(await screen.findByText("Welcome back!")).toBeInTheDocument();
});
```

#### **Pattern 2: Handle Async Components (React 19)**

```typescript
// React 19 Server Components require special handling
test("renders async server component", async () => {
	const { container } = render(await AsyncComponent({ id: "123" }));
	expect(container).toHaveTextContent("Data loaded");
});
```

#### **Pattern 3: Test Accessibility**

```typescript
test("component is keyboard navigable", async () => {
	const user = userEvent.setup();
	render(<NavBar />);

	await user.tab();
	expect(screen.getByText("Features")).toHaveFocus();

	await user.keyboard("{Enter}");
	expect(window.location.hash).toBe("#features");
});
```

### 6.2 E2E Testing Patterns

#### **Pattern 1: Use Page Object Model**

```typescript
// tests/e2e/pages/dashboard.page.ts
export class DashboardPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/app/dashboard");
	}

	async generateApiKey(name: string) {
		await this.page.click('[data-testid="generate-key-btn"]');
		await this.page.fill('[name="keyName"]', name);
		await this.page.click('button:has-text("Create")');
		return await this.page.textContent('[data-testid="api-key"]');
	}
}

// tests/e2e/dashboard.spec.ts
test("can generate API key", async ({ page }) => {
	const dashboard = new DashboardPage(page);
	await dashboard.goto();
	const apiKey = await dashboard.generateApiKey("Test Key");
	expect(apiKey).toMatch(/^snap_/);
});
```

#### **Pattern 2: Visual Regression with Percy/Playwright**

```typescript
test("visual consistency", async ({ page }) => {
	await page.goto("/");
	await page.waitForLoadState("networkidle");
	await expect(page).toHaveScreenshot("homepage.png", {
		fullPage: true,
		mask: [page.locator('[data-testid="dynamic-content"]')],
	});
});
```

---

## 7. Action Plan Summary

### Immediate Actions (Today - 4 hours)

-   [ ] Run Jest to Vitest migration script
-   [ ] Fix timer API in rate-limiter.test.ts
-   [ ] Fix NavBar test with correct assertions
-   [ ] Update InfiniteMovingCards import path
-   [ ] Move home.spec.ts to e2e directory
-   [ ] Replace bcrypt with argon2 in api-keys test

### Short-Term (This Week - 8 hours)

-   [ ] Add motion/react mock to vitest.setup.ts
-   [ ] Create test helper utilities
-   [ ] Add @axe-core/playwright for a11y testing
-   [ ] Update E2E tests to use proper waiting strategies
-   [ ] Add visual regression baseline screenshots
-   [ ] Document testing patterns in TESTING.md

### Medium-Term (Next Sprint - 16 hours)

-   [ ] Setup pre-commit hooks with husky
-   [ ] Configure CI/CD test pipeline
-   [ ] Add component integration tests
-   [ ] Implement accessibility test suite
-   [ ] Add performance testing with Core Web Vitals
-   [ ] Increase test coverage to 80%+

---

## 8. Success Metrics

### Current State

-   ✅ Load Tests: 1/1 passing (100%)
-   🔴 Unit Tests: 0/4 passing (0%)
-   🔴 Component Tests: 0/2 passing (0%)
-   🔴 Integration Tests: 0/1 passing (0%)
-   🟡 E2E Tests: Some passing, some in wrong location

### Target State (After Fixes)

-   ✅ Unit Tests: 4/4 passing (100%)
-   ✅ Component Tests: 2/2 passing (100%)
-   ✅ Integration Tests: 1/1 passing (100%)
-   ✅ E2E Critical Path: 5/5 passing (100%)
-   ✅ E2E Full Suite: 15/15 passing (100%)
-   ✅ Accessibility: No violations
-   ✅ Visual Regression: No unexpected changes

### Quality Gates

-   [ ] All critical user journeys covered by E2E tests
-   [ ] Component test coverage >80%
-   [ ] No accessibility violations (WCAG 2.1 AA)
-   [ ] Core Web Vitals meet thresholds (LCP <2.5s, FID <100ms, CLS <0.1)
-   [ ] Test execution time <5 min for unit, <10 min for E2E

---

## 9. Related Files

### Test Files Requiring Fixes

-   `/apps/web/tests/unit/rate-limiter.test.ts` - Jest API usage
-   `/apps/web/__tests__/components/NavBar.test.tsx` - Multiple issues
-   `/apps/web/__tests__/components/InfiniteMovingCards.test.tsx` - Import path
-   `/apps/web/tests/integration/api-keys.test.ts` - Missing dependency
-   `/apps/web/tests/home.spec.ts` - Wrong location

### Configuration Files

-   `/apps/web/vitest.config.ts` - Vitest configuration
-   `/apps/web/vitest.setup.ts` - Test setup and mocks
-   `/apps/web/playwright.config.ts` - E2E configuration
-   `/apps/web/package.json` - Test scripts

### Migration Scripts

-   `/scripts/migrate-to-vitest.ts` - Jest to Vitest migration
-   `/scripts/update-jest-imports.js` - Import updater

---

## Appendix: Quick Reference Commands

```bash
# Run all tests
pnpm --filter web run test

# Run specific test file
pnpm --filter web run test __tests__/components/NavBar.test.tsx

# Run with UI
pnpm --filter web run test:ui

# Run with coverage
pnpm --filter web run test:coverage

# Run E2E tests
pnpm --filter web run e2e

# Run E2E in CI mode
pnpm --filter web run e2e:ci

# Run critical E2E only
pnpm --filter web run e2e:critical

# Debug E2E test
pnpm --filter web run e2e:debug tests/e2e/marketing-hero.spec.ts
```
