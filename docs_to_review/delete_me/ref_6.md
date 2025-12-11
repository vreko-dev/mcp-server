Here is the implementation for **Phase 2: Unified Config Structure**.

This moves you away from the fragile "multiple config files" setup to a single, robust `playwright.config.ts` that strictly separates your **Extension (Electron)** tests from your **Web (Browser)** tests.

### 1\. The Unified Configuration

**File:** `playwright.config.ts` (in the root of your repo)

This config uses **Projects** to create isolated environments. It prevents the "Context Trap" where Playwright accidentally tries to run VS Code tests in a standard Chrome browser.

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 1. Load Environment Variables
// Prioritize local env vars for testing (e.g., API keys, Test User Auth)
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e', // Root folder for all E2E tests
  fullyParallel: false, // VS Code tests struggle in parallel due to single instance limits
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : 1, // Serial execution is safer for VS Code Extension tests
  reporter: 'html',

  // 2. Global Timeout
  // Extension activation can take time; 60s is a safe buffer.
  timeout: 60 * 1000,

  use: {
    // Base URL for your Web Dashboard tests
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // ============================================================
    // PROJECT A: VS Code Extension (Electron)
    // ============================================================
    {
      name: 'ext-smoke',
      testDir: './e2e/extension',
      testMatch: '**/*.smoke.spec.ts', // Only run quick smoke tests
      use: {
        // Inject special flags to let the Extension know it's being tested
        // (Used in your activation.spec.ts to mock Auth)
        extraHTTPHeaders: {
          'x-test-mode': 'vscode-smoke',
        },
      },
    },
    {
      name: 'ext-full',
      testDir: './e2e/extension',
      testMatch: '**/*.spec.ts', // Run all extension tests
    },

    // ============================================================
    // PROJECT B: Web Dashboard (Standard Browser)
    // ============================================================
    {
      name: 'web-chrome',
      testDir: './e2e/web',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web-firefox',
      testDir: './e2e/web',
      use: { ...devices['Desktop Firefox'] },
    },

    // ============================================================
    // PROJECT C: Cross-Surface Integration
    // ============================================================
    {
      name: 'integration',
      testDir: './e2e/integration',
      // This project likely needs the Electron launcher but interacts with Web
      // We keep it separate to allow custom setup/teardown
    },
  ],

  // 3. Web Server (Optional but Recommended)
  // Automatically starts your Next.js app before running Web tests
  /*
  webServer: {
    command: 'npm run dev --filter=@snapback/web',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
  },
  */
});
```

### 2\. File Cleanup (Action Required)

You must now reorganize your folders to match the config.

1.  **Delete** the old config: `e2e/extension/playwright.extension.config.ts` (We don't need it anymore).
2.  **Move** tests into their specific domains:
      * Move VS Code tests to: `e2e/extension/`
      * Move Web Dashboard tests to: `e2e/web/`
      * Move Integration tests to: `e2e/integration/`

### 3\. NPM Scripts (The Developer Experience)

**File:** `package.json` (Root)

Add these scripts to make running tests easy for your team.

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ext": "playwright test --project=ext-full",
  "test:e2e:web": "playwright test --project=web-chrome",
  "test:e2e:smoke": "playwright test --project=ext-smoke",
  "test:e2e:ui": "playwright test --ui"
}
```

### 4\. Integration Check

Now that we have the **Config**, the **Telemetry**, and the **VS Code Connect Code**, we can verify the full loop.

**Run the Smoke Test:**

```bash
npm run test:e2e:smoke
```

If this passes (it runs your `activation.spec.ts` using the new unified config), we are ready for **Phase 3: Cross-Surface Integration**, where we write the test that proves VS Code creates data that the Web Dashboard can see.

Would you like the **Cross-Surface Test Spec** (`e2e/integration/cross-surface.spec.ts`) next?
