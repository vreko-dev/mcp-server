Here is the implementation for **Phase 3: Cross-Surface Integration**.

This is the "Crown Jewel" of your test suite. It runs a **Single Test** that controls **Two Applications** (VS Code Electron + Chrome Browser) simultaneously. It verifies that data created in the IDE successfully syncs to the Dashboard.

### 1\. The Cross-Surface Test

**File:** `e2e/integration/cross-surface.spec.ts`

```typescript
import { test, expect, _electron as electron, chromium } from '@playwright/test';
import * as path from 'path';

// Point to your compiled extension (usually the root of the workspace)
const extensionPath = path.resolve(__dirname, '../../');

test.describe('Cross-Surface Sync', () => {
  let electronApp: any;
  let vscodeWindow: any;
  let browser: any;
  let webPage: any;

  test.beforeAll(async () => {
    // ---------------------------------------------------------
    // 1. Launch VS Code (The "Writer")
    // ---------------------------------------------------------
    console.log('Launch: Starting VS Code...');
    electronApp = await electron.launch({
      args: [
        `--extensionDevelopmentPath=${extensionPath}`,
        // Mock Auth in Test Mode so we don't hit real GitHub Login
        '--env=VSCODE_SNAPSHOT_TEST_MODE=true'
      ],
      // Ensure we point to the VS Code executable
      executablePath: process.env.VSCODE_EXECUTABLE_PATH,
    });

    vscodeWindow = await electronApp.firstWindow();
    await vscodeWindow.waitForLoadState('domcontentloaded');

    // ---------------------------------------------------------
    // 2. Launch Web Dashboard (The "Reader")
    // ---------------------------------------------------------
    console.log('Launch: Starting Chrome...');
    browser = await chromium.launch();
    const context = await browser.newContext();
    webPage = await context.newPage();
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
    if (browser) await browser.close();
  });

  test('Create Snapshot in VS Code -> Appears on Web Dashboard', async () => {
    const snapshotName = `Integration Test ${Date.now()}`;

    // =========================================================
    // STEP 1: VS Code Actions (Create Data)
    // =========================================================
    console.log('Step 1: Creating Snapshot in VS Code...');

    // 1. Focus the SnapBack View (using the Activity Bar icon)
    const activityBarIcon = vscodeWindow.getByRole('tab', { name: 'SnapBack' });
    await activityBarIcon.click();

    // 2. Click "Create Snapshot"
    // (Assuming user is simulated logged-in via VSCODE_SNAPSHOT_TEST_MODE)
    const createBtn = vscodeWindow.getByRole('treeitem', { name: 'Create Snapshot' });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 3. Handle Input Box
    const inputBox = vscodeWindow.getByPlaceholder('Snapshot Name');
    await inputBox.waitFor({ state: 'visible' });
    await inputBox.fill(snapshotName);
    await inputBox.press('Enter');

    // 4. Verify Local Success (Notification Toast)
    // Note: VS Code notifications can be tricky; checking the Tree View update is more robust
    const newTreeItem = vscodeWindow.getByRole('treeitem', { name: snapshotName });
    await expect(newTreeItem).toBeVisible({ timeout: 5000 });


    // =========================================================
    // STEP 2: Web Dashboard Actions (Verify Data)
    // =========================================================
    console.log('Step 2: Verifying in Web Dashboard...');

    // 1. Navigate to Dashboard
    await webPage.goto('http://localhost:3000/dashboard');

    // 2. Login (Or Mock Session)
    // For speed, force a session cookie if possible, otherwise fill form:
    // await webPage.getByLabel('Email').fill('test-user@snapback.io');
    // await webPage.getByRole('button', { name: 'Sign In' }).click();

    // 3. Verify Snapshot Exists
    // We expect the row to appear. Polling is built-in to expect()
    const snapshotRow = webPage.getByRole('row', { name: snapshotName });

    await expect(snapshotRow).toBeVisible({ timeout: 15000 });

    console.log(`Success: Snapshot "${snapshotName}" synced correctly!`);
  });
});
```

### 2\. Supporting Mock Logic

To make the test above work reliably (skipping the GitHub OAuth flow), you need to handle the `VSCODE_SNAPSHOT_TEST_MODE` env var we passed in the launch args.

**Update:** `apps/vscode/src/managers/AuthManager.ts`

```typescript
// Inside AuthManager.getSession()
async getSession(): Promise<vscode.AuthenticationSession | undefined> {
  // 1. CHECK FOR TEST MODE
  if (process.env.VSCODE_SNAPSHOT_TEST_MODE === 'true') {
    return {
      id: 'test-session-id',
      accessToken: 'mock-token',
      account: {
        id: 'test-user-id',
        label: 'Test User',
      },
      scopes: ['user:email'],
    };
  }

  // 2. Normal Flow
  if (this.session) return this.session;
  this.session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: false });
  return this.session;
}
```

### 3\. How to Run It

Because this test is in the `integration` folder and likely requires `xvfb` on Linux (CI), use the specific project command we defined in the Unified Config.

```bash
# Run locally (watch mode recommended for debugging)
npm run test:e2e:integration -- --headed

# OR via the project name
npx playwright test --project=integration
```

### 4\. Implementation Checklist

  * [ ] Created `e2e/integration/cross-surface.spec.ts`.
  * [ ] Updated `AuthManager.ts` to mock session when env var is present.
  * [ ] Verified `VSCODE_EXECUTABLE_PATH` is set in your local `.env` (Playwright needs to know where VS Code is installed on your machine to launch it).

### Next Step

This concludes the **Architecture & Instrumentation** phase\! You now have a unified test config, robust telemetry, and a cross-surface integration test.

Would you like me to pivot to **Phase 4: Web Authentication Flows** and write the specific `e2e/web/flows/auth.spec.ts` to verify the "Waitlist" and "Login" scenarios on the dashboard side?
