// tests/fixtures/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Authentication Setup
 *
 * This setup file handles authentication before running console tests.
 * It stores the authentication state so subsequent tests don't need to log in.
 *
 * For CI, we use a test account with known credentials.
 * For local development, you may need to set TEST_USER_EMAIL and TEST_USER_PASSWORD.
 */

setup('authenticate', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  // If we have test credentials, use direct login
  if (testEmail && testPassword) {
    await setup.step('Navigate to login page', async () => {
      await page.goto(`${baseUrl}/auth/login`);
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    await setup.step('Enter credentials', async () => {
      await page.fill('[data-testid="email-input"]', testEmail);
      await page.fill('[data-testid="password-input"]', testPassword);
      await page.click('[data-testid="login-submit"]');
    });

    await setup.step('Wait for authentication', async () => {
      // Wait for redirect to dashboard
      await page.waitForURL(`${baseUrl}/app/dashboard`, { timeout: 30000 });
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  } else {
    // Use mock authentication for local development
    await setup.step('Set up mock authentication', async () => {
      await page.goto(`${baseUrl}/app/dashboard`);

      // Check if we're redirected to login
      if (page.url().includes('/auth/login')) {
        console.log('⚠️  No test credentials provided. Using mock auth state.');
        console.log('   Set TEST_USER_EMAIL and TEST_USER_PASSWORD for real auth.');

        // For development, create a mock authenticated state
        // This assumes the app can handle a mock session cookie
        await page.context().addCookies([
          {
            name: 'snapback_session',
            value: 'mock_test_session_token',
            domain: new URL(baseUrl).hostname,
            path: '/',
            httpOnly: true,
            secure: baseUrl.startsWith('https'),
            sameSite: 'Lax',
          },
        ]);

        // Set any required localStorage items
        await page.evaluate(() => {
          localStorage.setItem('snapback_user', JSON.stringify({
            id: 'test_user_001',
            email: 'test@snapback.dev',
            name: 'Test User',
            tier: 'free',
          }));
        });

        // Refresh to apply the auth state
        await page.goto(`${baseUrl}/app/dashboard`);
      }
    });
  }

  // Verify we're authenticated
  await setup.step('Verify authentication', async () => {
    // Check for authenticated UI elements
    const userMenu = page.locator('[data-testid="user-menu"], [data-testid="user-avatar"]');
    await expect(userMenu).toBeVisible({ timeout: 10000 });
  });

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log(`✅ Authentication state saved to ${authFile}`);
});

/**
 * Pro User Authentication Setup
 *
 * Separate setup for testing Pro tier features
 */
setup('authenticate-pro', async ({ page }) => {
  const proAuthFile = path.join(__dirname, '../playwright/.auth/pro-user.json');
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const proEmail = process.env.TEST_PRO_USER_EMAIL;
  const proPassword = process.env.TEST_PRO_USER_PASSWORD;

  if (!proEmail || !proPassword) {
    console.log('⚠️  Pro user credentials not provided. Skipping pro auth setup.');
    // Create a mock pro user auth state
    await page.goto(`${baseUrl}/app/dashboard`);
    await page.context().addCookies([
      {
        name: 'snapback_session',
        value: 'mock_pro_session_token',
        domain: new URL(baseUrl).hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.startsWith('https'),
        sameSite: 'Lax',
      },
    ]);
    await page.evaluate(() => {
      localStorage.setItem('snapback_user', JSON.stringify({
        id: 'test_pro_user_001',
        email: 'test-pro@snapback.dev',
        name: 'Pro Test User',
        tier: 'pro',
      }));
    });
    await page.context().storageState({ path: proAuthFile });
    return;
  }

  await page.goto(`${baseUrl}/auth/login`);
  await page.fill('[data-testid="email-input"]', proEmail);
  await page.fill('[data-testid="password-input"]', proPassword);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(`${baseUrl}/app/dashboard`);

  await page.context().storageState({ path: proAuthFile });
});

/**
 * OAuth Flow Testing Setup
 *
 * Note: Real OAuth testing requires special handling:
 * 1. Mock OAuth provider responses for unit tests
 * 2. Use staging OAuth apps for integration tests
 * 3. Use real OAuth in manual testing only
 */
setup.describe.skip('oauth-flows', () => {
  setup('github-oauth', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // Navigate to login
    await page.goto(`${baseUrl}/auth/login`);

    // Click GitHub login
    await page.click('[data-testid="github-login"]');

    // This would redirect to GitHub
    // For testing, we need to mock the OAuth callback
    // or use a test GitHub account in staging

    // Example mock callback:
    await page.goto(`${baseUrl}/api/auth/callback/github?code=mock_code&state=mock_state`);

    // Verify redirect to dashboard
    await page.waitForURL(`${baseUrl}/app/dashboard`);
  });

  setup('google-oauth', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    await page.goto(`${baseUrl}/auth/login`);
    await page.click('[data-testid="google-login"]');

    // Mock callback
    await page.goto(`${baseUrl}/api/auth/callback/google?code=mock_code&state=mock_state`);
    await page.waitForURL(`${baseUrl}/app/dashboard`);
  });
});

/**
 * Unauthenticated Setup
 *
 * Clears any existing auth state for testing unauthenticated flows
 */
setup('clear-auth', async ({ page }) => {
  const unauthFile = path.join(__dirname, '../playwright/.auth/unauth.json');

  await page.goto('about:blank');
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.context().storageState({ path: unauthFile });
});
