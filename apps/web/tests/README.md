# E2E Tests - SnapBack Web

Industry-standard Playwright test suite for the SnapBack web application.

---

## 🚀 Quick Start

### **Simplest Way (Recommended)**

```bash
# From project root
./apps/web/run-tests.sh

# Or from apps/web
./run-tests.sh
```

**Available modes**:
```bash
./run-tests.sh headless    # Default (CI mode)
./run-tests.sh ui          # Interactive UI mode
./run-tests.sh headed      # Watch browser
./run-tests.sh debug       # Step-through debugging
./run-tests.sh auth        # Auth tests only
```

---

### **Manual Way**

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Run tests
pnpm test:e2e              # All tests
pnpm test:e2e:ui           # UI mode
pnpm test:e2e:headed       # Headed mode
pnpm test:e2e:debug        # Debug mode
pnpm test:e2e:auth         # Auth only

# View report
pnpm test:e2e:report
```

---

## 📁 Directory Structure

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login-ui-complete.spec.ts        # 45 login UI tests
│   │   ├── auth-integration-complete.spec.ts # 5 integration tests
│   │   └── README.md                         # Auth test documentation
│   └── ... (other test suites)
│
├── fixtures/
│   └── index.ts                              # Test fixtures (authenticatedPage, mockApi)
│
├── utils/
│   ├── pages/
│   │   └── login.ts                          # LoginPage helper (POM)
│   └── test-data.ts                          # Data generators & utilities
│
├── auth.setup.ts                             # Auth setup (runs before tests)
└── TEST_INFRASTRUCTURE_SETUP.md              # Complete documentation
```

---

## 📊 Test Coverage

| Suite | Tests | What It Tests |
|-------|-------|---------------|
| **Login UI** | 45 | Copy, animations, accessibility, forms |
| **Auth Integration** | 5 | Complete user journeys, cross-system |
| **TOTAL** | **50** | Full auth flow coverage |

---

## 🏗️ Architecture

### **Page Object Model (POM)**

Encapsulates page interactions:

```typescript
import { LoginPage } from './utils/pages/login';

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'password123');
});
```

### **Fixtures**

Reusable test context:

```typescript
import { test } from './fixtures';

test('authenticated flow', async ({ authenticatedPage }) => {
  // Page is already logged in
  await authenticatedPage.goto('/app/dashboard');
});
```

### **MSW for API Mocking**

Use existing MSW handlers from `@snapback/testing/msw`:

```typescript
import { authErrorHandlers } from '@snapback/testing/msw/handlers/auth';

// E2E tests hit real dev server APIs
// For mocked integration tests, see:
// apps/web/test/integration/api-key-flow-msw.test.ts
```

### **Test Data Generators**

Unique, collision-free test data:

```typescript
import { generateTestUser } from './utils/test-data';

test('signup', async ({ page }) => {
  const user = generateTestUser(); // Unique every time
  // user.email, user.password, user.name
});
```

---

## 🧪 Writing Tests

### **Basic Test**

```typescript
import { test, expect } from '@playwright/test';

test('page loads', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading')).toContainText('Welcome back');
});
```

### **Using Fixtures**

```typescript
import { test, expect } from '../fixtures';

test('protected page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/app/dashboard');
  await expect(authenticatedPage).toHaveURL(/\/app\//);
});
```

### **Using Page Objects**

```typescript
import { test } from '@playwright/test';
import { LoginPage } from '../utils/pages/login';

test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
});
```

---

## 🐛 Debugging

### **UI Mode** (Recommended)

```bash
pnpm test:e2e:ui
```

- Time-travel debugging
- Watch mode
- DOM snapshots
- Network inspector

### **Debug Mode**

```bash
pnpm test:e2e:debug
```

- Playwright Inspector
- Step-through execution
- Element picker

### **Headed Mode**

```bash
pnpm test:e2e:headed
```

- Watch browser execute tests
- See what's happening

---

## 📝 Best Practices

1. **Use Page Objects** - Encapsulate page logic
2. **Use Fixtures** - Share setup logic
3. **Generate Test Data** - Avoid hardcoded values
4. **Test User Flows** - Not just page loads
5. **Mock External APIs** - Use `mockApi` fixture
6. **Check Accessibility** - Use `getByRole`, ARIA labels
7. **Verify Performance** - `performance.assertFasterThan()`

---

## 🚨 Troubleshooting

### Port 3000 in use

```bash
lsof -ti:3000 | xargs kill -9
```

### Turbopack cache corrupted

```bash
rm -rf .next
pnpm dev
```

### Tests timing out

Increase timeout in [`playwright.config.ts`](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/web/playwright.config.ts):

```typescript
use: {
  actionTimeout: 15 * 1000,
  navigationTimeout: 45 * 1000,
}
```

### Auth setup failing

Skip setup tests (use mocked auth):

```bash
pnpm exec playwright test --project=chromium tests/e2e/auth/login-ui-complete.spec.ts
```

---

## 📚 Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Testing Blueprint**: [`/demo_prep/testing_blueprint.md`](file:///Users/user1/WebstormProjects/SnapBack-Site/demo_prep/testing_blueprint.md)
- **Infrastructure Setup**: [`TEST_INFRASTRUCTURE_SETUP.md`](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/web/tests/TEST_INFRASTRUCTURE_SETUP.md)

---

**Need Help?** Check [`TEST_INFRASTRUCTURE_SETUP.md`](file:///Users/user1/WebstormProjects/SnapBack-Site/apps/web/tests/TEST_INFRASTRUCTURE_SETUP.md) for complete documentation.
