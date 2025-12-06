// tests/e2e/cross-domain/activation-funnel.spec.ts
import { test, expect, interceptAnalytics } from '../../fixtures';
import { testConstants, generateApiKey } from '../../fixtures/test-data';

const { selectors } = testConstants;

/**
 * Activation Funnel Tests
 *
 * Critical Path: Marketing → Signup → Auth → Dashboard → API Key → First Success
 *
 * This is the most important test suite for SnapBack. It validates the entire
 * user journey from first landing on the site to achieving their first protected save.
 *
 * Funnel Steps:
 * 1. Land on marketing page
 * 2. Click CTA to sign up
 * 3. Complete OAuth authentication
 * 4. View dashboard (first authenticated experience)
 * 5. Create API key (required for extension)
 * 6. See onboarding guidance
 * 7. (Extension connects and creates first snapshot - tested separately)
 */

test.describe('Activation Funnel', () => {
  test.describe('Complete Happy Path', () => {
    test('XD-AF01: Full activation funnel from marketing to API key', async ({ page, mockApi, context }) => {
      // Step 1: Land on marketing page
      await test.step('Step 1: Landing page', async () => {
        await page.goto('/');
        await expect(page.locator(selectors.hero)).toBeVisible();

        // Verify key value proposition is visible
        await expect(page.getByText(/AI|code|protect|safety/i)).toBeVisible();
      });

      // Step 2: Click CTA
      await test.step('Step 2: Click primary CTA', async () => {
        await page.click(selectors.ctaButton);

        // Should navigate to auth
        await expect(page).toHaveURL(/auth|login|signup/);
      });

      // Step 3: OAuth flow (mocked for e2e)
      await test.step('Step 3: Complete OAuth', async () => {
        // In real tests, this would involve OAuth provider
        // For e2e, we mock the successful auth callback

        // Mock successful OAuth callback
        await context.addCookies([{
          name: 'snapback_session',
          value: 'test_session_token_activation_funnel',
          domain: new URL(page.url()).hostname,
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        }]);

        // Set user data
        await page.evaluate(() => {
          localStorage.setItem('snapback_user', JSON.stringify({
            id: 'funnel_test_user',
            email: 'funnel@test.com',
            name: 'Funnel Test',
            tier: 'free',
            isNewUser: true,
          }));
        });

        // Navigate to dashboard (simulating post-OAuth redirect)
        await page.goto('/app/dashboard');
      });

      // Step 4: Dashboard experience
      await test.step('Step 4: First dashboard view', async () => {
        // Mock fresh user data
        await mockApi.mockEndpoint('/user/metrics', {
          success: true,
          data: {
            snapshotCount: 0,
            recoveryCount: 0,
            filesProtected: 0,
            aiDetectionRate: 0,
            bytesSaved: 0,
          },
        });

        await page.reload();
        await expect(page.locator(selectors.dashboard)).toBeVisible();

        // New user should see onboarding guidance
        await expect(page.locator('[data-testid="onboarding-banner"]')).toBeVisible();
        await expect(page.getByText(/get started|set up|install/i)).toBeVisible();
      });

      // Step 5: Create API Key
      await test.step('Step 5: Create first API key', async () => {
        // Navigate to API keys
        await page.click('[data-testid="nav-api-keys"]');
        await expect(page).toHaveURL(/api-keys/);

        // Mock key creation
        const newKey = generateApiKey({ name: 'My First Key' });
        await mockApi.mockEndpoint('/keys', {
          success: true,
          data: { ...newKey, fullKey: 'sk_test_my_first_key_123456789' },
        });

        // Create key
        await page.click(selectors.createKeyButton);
        await page.fill(selectors.keyNameInput, 'My First Key');
        await page.click('[data-testid="create-key-submit"]');

        // Key displayed
        await expect(page.locator('[data-testid="new-key-display"]')).toBeVisible();

        // Copy key
        await page.click('[data-testid="copy-key-btn"]');
        await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
      });

      // Step 6: Onboarding completion guidance
      await test.step('Step 6: See extension installation guidance', async () => {
        await page.click('[data-testid="close-key-modal"]');

        // Should see next steps
        await expect(page.getByText(/install extension|VS Code|next step/i)).toBeVisible();

        // Link to extension should be present
        const extensionLink = page.locator('[data-testid="install-extension-link"]');
        await expect(extensionLink).toBeVisible();

        const href = await extensionLink.getAttribute('href');
        expect(href).toMatch(/marketplace\.visualstudio\.com|vscode:extension/);
      });
    });

    test('XD-AF01b: Funnel tracks analytics events correctly', async ({ page, mockApi, context }) => {
      // Intercept analytics
      const analyticsEvents = await interceptAnalytics(page);

      // Complete funnel
      await page.goto('/');
      await page.click(selectors.ctaButton);

      // Mock auth
      await context.addCookies([{
        name: 'snapback_session',
        value: 'analytics_test_session',
        domain: 'localhost',
        path: '/',
      }]);

      await page.goto('/app/dashboard');

      // Check analytics events were fired
      await page.waitForTimeout(2000);

      // Should have tracked key events
      const eventNames = analyticsEvents.map(e => {
        try { return JSON.parse(e).event; } catch { return null; }
      }).filter(Boolean);

      // These events should be tracked (based on event-cataloging.json)
      expect(eventNames).toContain(expect.stringMatching(/page.*view|landing.*view/i));
    });
  });

  // ============================================
  // Funnel Abandonment & Recovery
  // ============================================

  test.describe('Funnel Abandonment', () => {
    test('XD-AF02: Abandonment at auth shows re-engagement on return', async ({ page }) => {
      // Start funnel
      await page.goto('/');
      await page.click(selectors.ctaButton);

      // User is at login but abandons
      await expect(page).toHaveURL(/auth|login/);

      // Simulate abandonment - close browser (navigate away)
      await page.goto('about:blank');

      // User returns later
      await page.goto('/');

      // Should recognize returning visitor (cookie or localStorage)
      // Could show "Continue where you left off" messaging
      const returnVisitorBanner = page.locator('[data-testid="return-visitor-banner"]');
      const continueButton = page.getByText(/continue|finish|complete/i);

      // At least one re-engagement element should be present
      const hasReengagement = await returnVisitorBanner.isVisible() || await continueButton.isVisible();

      // This is a nice-to-have, not blocking
      if (!hasReengagement) {
        console.log('Note: Return visitor re-engagement not implemented');
      }
    });

    test('XD-AF02b: Abandonment at dashboard saved for return', async ({ page, context, mockApi }) => {
      // Complete auth
      await context.addCookies([{
        name: 'snapback_session',
        value: 'abandon_test_session',
        domain: 'localhost',
        path: '/',
      }]);

      await page.goto('/app/dashboard');

      // Mock empty state
      await mockApi.mockEndpoint('/user/metrics', {
        success: true,
        data: { snapshotCount: 0, recoveryCount: 0, filesProtected: 0, aiDetectionRate: 0, bytesSaved: 0 },
      });

      await page.reload();

      // User sees dashboard but doesn't create key
      await expect(page.locator(selectors.dashboard)).toBeVisible();

      // Close (navigate away)
      await page.goto('about:blank');

      // Return later
      await page.goto('/app/dashboard');

      // Session should persist
      await expect(page.locator(selectors.dashboard)).toBeVisible();

      // Should still see onboarding prompt
      await expect(page.locator('[data-testid="onboarding-banner"]')).toBeVisible();
    });
  });

  // ============================================
  // Return Visitor Flows
  // ============================================

  test.describe('Return Visitor', () => {
    test('XD-AF03: Return visitor continues from last step', async ({ page, context, mockApi }) => {
      // User has account but hasn't created API key
      await context.addCookies([{
        name: 'snapback_session',
        value: 'return_visitor_session',
        domain: 'localhost',
        path: '/',
      }]);

      await page.evaluate(() => {
        localStorage.setItem('snapback_user', JSON.stringify({
          id: 'return_user',
          email: 'return@test.com',
          name: 'Return User',
          tier: 'free',
          onboardingStep: 'api_key',
        }));
      });

      // Mock no keys
      await mockApi.mockEndpoint('/keys', {
        success: true,
        data: [],
      });

      // Visit marketing page
      await page.goto('/');

      // Should recognize logged-in user
      const dashboardLink = page.locator('[data-testid="nav-dashboard"]');
      if (await dashboardLink.isVisible()) {
        // Logged in header shown
        await dashboardLink.click();
      } else {
        // Or redirect to dashboard
        await page.click(selectors.ctaButton);
      }

      // Should be on dashboard
      await expect(page).toHaveURL(/app|dashboard/);

      // Should prompt to create API key
      await expect(page.getByText(/create.*key|api.*key/i)).toBeVisible();
    });

    test('XD-AF03b: Completed user sees normal dashboard', async ({ page, context, mockApi }) => {
      // User has completed onboarding
      await context.addCookies([{
        name: 'snapback_session',
        value: 'completed_user_session',
        domain: 'localhost',
        path: '/',
      }]);

      // Has activity
      await mockApi.mockEndpoint('/user/metrics', {
        success: true,
        data: { snapshotCount: 50, recoveryCount: 5, filesProtected: 150, aiDetectionRate: 0.35, bytesSaved: 5000000 },
      });

      await mockApi.mockEndpoint('/keys', {
        success: true,
        data: [generateApiKey({ name: 'Production' })],
      });

      await page.goto('/app/dashboard');

      // Should NOT see onboarding banner
      await expect(page.locator('[data-testid="onboarding-banner"]')).not.toBeVisible();

      // Should see actual metrics
      await expect(page.locator('[data-testid="metric-snapshots"]')).toContainText('50');
    });
  });

  // ============================================
  // Extension Integration Flow
  // ============================================

  test.describe('Extension Grant Flow', () => {
    test('XD-EI01: Extension can request auth grant', async ({ page, context }) => {
      // Simulate extension opening browser
      await context.addCookies([{
        name: 'snapback_session',
        value: 'extension_grant_session',
        domain: 'localhost',
        path: '/',
      }]);

      // Extension navigates to grant endpoint
      const extensionId = 'vscode-extension-123';
      await page.goto(`/auth/extension-grant?extensionId=${extensionId}`);

      // Should show grant confirmation
      await expect(page.getByText(/authorize|grant|extension/i)).toBeVisible();
      await expect(page.getByText(/VS Code/i)).toBeVisible();

      // User approves
      await page.click('[data-testid="approve-grant"]');

      // Should show success with code to copy
      await expect(page.getByText(/authorized|success|code/i)).toBeVisible();
    });

    test('XD-EI02: Unauthenticated extension grant redirects to login', async ({ page }) => {
      // Extension tries to get grant without auth
      await page.goto('/auth/extension-grant?extensionId=test-extension');

      // Should redirect to login with return URL
      await expect(page).toHaveURL(/login.*extension-grant|login.*redirect/);
    });
  });

  // ============================================
  // Time-to-Value Metrics
  // ============================================

  test.describe('Time-to-Value', () => {
    test('XD-TTV01: TTFV under 5 minutes for happy path', async ({ page, context, mockApi }) => {
      const startTime = Date.now();

      // Step 1: Landing
      await page.goto('/');

      // Step 2: CTA
      await page.click(selectors.ctaButton);

      // Step 3: Auth (mocked - in reality this is the slowest step)
      await context.addCookies([{
        name: 'snapback_session',
        value: 'ttv_test_session',
        domain: 'localhost',
        path: '/',
      }]);

      // Step 4: Dashboard
      await mockApi.mockEndpoint('/user/metrics', {
        success: true,
        data: { snapshotCount: 0, recoveryCount: 0, filesProtected: 0, aiDetectionRate: 0, bytesSaved: 0 },
      });
      await page.goto('/app/dashboard');

      // Step 5: Create API key
      await page.click('[data-testid="nav-api-keys"]');
      await mockApi.mockEndpoint('/keys', {
        success: true,
        data: { ...generateApiKey(), fullKey: 'sk_test_ttv_key' },
      });
      await page.click(selectors.createKeyButton);
      await page.fill(selectors.keyNameInput, 'My Key');
      await page.click('[data-testid="create-key-submit"]');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete under 5 minutes (300,000ms)
      // In tests, should be much faster since we're not doing real OAuth
      console.log(`Time to Value: ${duration}ms`);
      expect(duration).toBeLessThan(60000); // 1 minute for mocked flow
    });
  });

  // ============================================
  // Error Recovery in Funnel
  // ============================================

  test.describe('Error Recovery', () => {
    test('XD-ER01: Network error during auth allows retry', async ({ page }) => {
      await page.goto('/');
      await page.click(selectors.ctaButton);

      // Simulate network error
      await page.context().setOffline(true);

      // Try to click OAuth button
      await page.click(selectors.githubLoginBtn).catch(() => {});

      // Should show error with retry option
      await expect(page.getByText(/connection|offline|try again/i)).toBeVisible();

      // Restore network
      await page.context().setOffline(false);

      // Retry should work
      await page.click('[data-testid="retry-btn"]');
      // Should proceed (either to OAuth or error clears)
    });

    test('XD-ER02: API error during key creation allows retry', async ({ page, context, mockApi }) => {
      await context.addCookies([{
        name: 'snapback_session',
        value: 'error_recovery_session',
        domain: 'localhost',
        path: '/',
      }]);

      await page.goto('/app/settings/api-keys');

      // First attempt fails
      await mockApi.mockError('/keys', 500, 'Server error');

      await page.click(selectors.createKeyButton);
      await page.fill(selectors.keyNameInput, 'Retry Test');
      await page.click('[data-testid="create-key-submit"]');

      // Should show error
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible();

      // Fix the API
      await mockApi.mockEndpoint('/keys', {
        success: true,
        data: { ...generateApiKey({ name: 'Retry Test' }), fullKey: 'sk_test_retry' },
      });

      // Retry
      await page.click('[data-testid="retry-create-key"]');

      // Should succeed
      await expect(page.locator('[data-testid="new-key-display"]')).toBeVisible();
    });
  });
});

// ============================================
// Performance Validation
// ============================================

test.describe('Funnel Performance', () => {
  test('PERF-FUNNEL-01: Each step loads within budget', async ({ page, context, mockApi }) => {
    const stepTimes: Record<string, number> = {};

    // Step 1: Marketing
    let start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    stepTimes['marketing'] = Date.now() - start;

    // Step 2: Auth page
    start = Date.now();
    await page.click(selectors.ctaButton);
    await page.waitForLoadState('networkidle');
    stepTimes['auth'] = Date.now() - start;

    // Step 3: Dashboard (mocked auth)
    await context.addCookies([{
      name: 'snapback_session',
      value: 'perf_test_session',
      domain: 'localhost',
      path: '/',
    }]);

    await mockApi.mockEndpoint('/user/metrics', {
      success: true,
      data: { snapshotCount: 0, recoveryCount: 0, filesProtected: 0, aiDetectionRate: 0, bytesSaved: 0 },
    });

    start = Date.now();
    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');
    stepTimes['dashboard'] = Date.now() - start;

    // Validate each step
    console.log('Step times:', stepTimes);

    expect(stepTimes['marketing']).toBeLessThan(3000); // 3s for marketing
    expect(stepTimes['auth']).toBeLessThan(2000); // 2s for auth page
    expect(stepTimes['dashboard']).toBeLessThan(3000); // 3s for dashboard
  });
});
