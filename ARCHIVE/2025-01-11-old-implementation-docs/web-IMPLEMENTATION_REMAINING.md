# SnapBack Web App - Analytics & Auth Implementation Status

## ✅ Completed (Phase 0 & 1)

### Analytics Setup
- [x] PostHog client configured with proper settings
  - `apps/web/modules/analytics/provider/posthog/index.tsx`
  - Autocapture enabled
  - Pageview tracking via Next.js router events
  - `identifyUser()` and `resetUser()` helpers exported
- [x] PostHog enabled in ClientProviders
  - `apps/web/modules/shared/components/ClientProviders.tsx`
- [x] Vercel Analytics added to root layout
  - `apps/web/app/layout.tsx` includes `<Analytics />`
- [x] Vercel Speed Insights already present
- [x] Environment variables documented
  - `apps/web/.env.example` updated with all analytics + auth vars

### Package Installation
- [x] `@vercel/analytics` installed
- [x] `msw` installed (dev dependency)
- [x] `posthog-js` installed (dev dependency)

### Auth Discovery
- [x] Better Auth fully configured in `packages/auth/src/auth.ts`
- [x] Google & GitHub OAuth providers already wired (lines 232-243)
- [x] Social sign-in UI components exist
- [x] Environment variables added to `.env.example`

---

## 🔨 Remaining Work

### Phase 2: Auth - PostHog Integration & Error Handling

#### 2.1 Add PostHog Identify on Login
**File**: `apps/web/modules/saas/auth/hooks/use-session.ts` (or create if missing)

Create a hook that identifies users with PostHog after successful login:

```typescript
// apps/web/modules/saas/auth/hooks/use-posthog-auth.ts
"use client";

import { useEffect } from "react";
import { posthog } from "@analytics/provider/posthog";
import { useSession } from "./use-session";

export function usePostHogAuth() {
  const { user } = useSession();

  useEffect(() => {
    if (user) {
      // Identify user in PostHog
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
    } else {
      // Reset on logout
      posthog.reset();
    }
  }, [user]);
}
```

Then add to `ClientProviders.tsx`:

```typescript
import { usePostHogAuth } from "@saas/auth/hooks/use-posthog-auth";

export function ClientProviders({ children }: PropsWithChildren) {
  usePostHogAuth(); // Add this line

  return (
    // ... existing code
  );
}
```

#### 2.2 Enhanced OAuth Error Handling
**Files to update**:
- `apps/web/modules/saas/auth/components/LoginForm.tsx`
- `apps/web/modules/saas/auth/components/SocialSigninButton.tsx`

Add comprehensive error handling for:
1. Cancelled consent at provider
2. OAuth state mismatch
3. Token exchange failure / provider 5xx
4. Email not verified (Google)
5. Private email (GitHub) with fallback
6. Duplicate account linking prevention

**Example error handler**:

```typescript
// apps/web/modules/saas/auth/lib/oauth-error-handler.ts
export function getOAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred';

  const err = error as { code?: string; message?: string };

  const errorMessages: Record<string, string> = {
    'oauth_cancelled': 'Sign-in was cancelled. Please try again.',
    'oauth_state_mismatch': 'Security validation failed. Please try again.',
    'token_exchange_failed': 'Failed to complete sign-in. Please try again.',
    'email_not_verified': 'Please verify your email with the provider first.',
    'private_email': 'Your email is private. Please allow email access in your account settings.',
    'account_already_linked': 'This account is already linked to another user.',
    'provider_error': 'The authentication provider is temporarily unavailable.',
  };

  return errorMessages[err.code || ''] || err.message || 'Authentication failed';
}
```

---

### Phase 3: MSW Test Infrastructure

#### 3.1 Create MSW Setup Files

**File**: `apps/web/tests/msw/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

// GitHub OAuth handlers
export const githubHandlers = [
  http.post('https://github.com/login/oauth/access_token', () =>
    HttpResponse.json({
      access_token: 'gh_test_token',
      token_type: 'bearer',
      scope: 'user:email'
    })
  ),
  http.get('https://api.github.com/user', () =>
    HttpResponse.json({
      id: 12345,
      login: 'testuser',
      email: null  // Test private email scenario
    })
  ),
  http.get('https://api.github.com/user/emails', () =>
    HttpResponse.json([
      { email: 'test@example.com', primary: true, verified: true }
    ])
  ),
];

// Google OAuth handlers
export const googleHandlers = [
  http.post('https://oauth2.googleapis.com/token', () =>
    HttpResponse.json({
      access_token: 'google_test_token',
      token_type: 'Bearer',
      expires_in: 3600
    })
  ),
  http.get('https://www.googleapis.com/oauth2/v3/userinfo', () =>
    HttpResponse.json({
      sub: 'google123',
      email: 'test@example.com',
      email_verified: true
    })
  ),
];

export const handlers = [...githubHandlers, ...googleHandlers];
```

**File**: `apps/web/tests/msw/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**File**: `apps/web/tests/setup.ts`

```typescript
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**File**: `apps/web/vitest.config.ts` (update or create)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

---

### Phase 4: Integration Tests

#### 4.1 Analytics Init Test
**File**: `apps/web/__tests__/integration/analytics/init.spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import posthog from 'posthog-js';

describe('Analytics Initialization', () => {
  it('should initialize PostHog exactly once', () => {
    const initSpy = vi.spyOn(posthog, 'init');

    // Simulate app initialization
    // render(<ClientProviders>...</ClientProviders>);

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        autocapture: true,
        person_profiles: 'identified_only',
      })
    );
  });

  it('should not capture manual pageviews', () => {
    const captureSpy = vi.spyOn(posthog, 'capture');

    // Test that manual pageview capture is not called
    expect(captureSpy).not.toHaveBeenCalledWith('$pageview');
  });
});
```

#### 4.2 Analytics Identify Test
**File**: `apps/web/__tests__/integration/analytics/identify.spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import posthog from 'posthog-js';

describe('PostHog User Identification', () => {
  it('should identify user after login', () => {
    const identifySpy = vi.spyOn(posthog, 'identify');

    // Simulate login
    const mockUser = { id: 'user123', email: 'test@example.com' };
    // Trigger login flow...

    expect(identifySpy).toHaveBeenCalledWith('user123', {
      email: 'test@example.com',
    });
  });

  it('should reset PostHog on logout', () => {
    const resetSpy = vi.spyOn(posthog, 'reset');

    // Simulate logout
    // Trigger logout flow...

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});
```

---

### Phase 5: E2E Tests (Playwright)

#### 5.1 Setup Playwright (if not installed)

```bash
cd apps/web
pnpm add -D @playwright/test
npx playwright install
```

**File**: `apps/web/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 5.2 OAuth E2E Tests
**File**: `apps/web/tests/e2e/auth/signin-google.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Google OAuth Sign-In', () => {
  test('should complete Google sign-in flow', async ({ page }) => {
    // Intercept OAuth endpoints
    await page.route('https://accounts.google.com/o/oauth2/**', route => {
      route.fulfill({ status: 302, headers: { Location: '/auth/callback?code=test' } });
    });

    await page.route('https://oauth2.googleapis.com/token', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ access_token: 'test_token' }),
      });
    });

    await page.route('https://www.googleapis.com/oauth2/v3/userinfo', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          sub: 'google123',
          email: 'test@example.com',
          email_verified: true,
        }),
      });
    });

    await page.goto('/auth/login');
    await page.click('button:has-text("Google")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/app/dashboard');

    // Should persist session on refresh
    await page.reload();
    await expect(page).toHaveURL('/app/dashboard');
  });
});
```

**File**: `apps/web/tests/e2e/auth/error-flows.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('OAuth Error Handling', () => {
  test('should show friendly error on token exchange failure', async ({ page }) => {
    await page.route('https://oauth2.googleapis.com/token', route => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/auth/login');
    await page.click('button:has-text("Google")');

    // Should show error message
    await expect(page.locator('text=authentication failed')).toBeVisible();

    // Should have "Try again" CTA
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();
  });

  test('should handle cancelled OAuth consent', async ({ page }) => {
    await page.route('https://accounts.google.com/o/oauth2/**', route => {
      route.fulfill({
        status: 302,
        headers: { Location: '/auth/callback?error=access_denied' }
      });
    });

    await page.goto('/auth/login');
    await page.click('button:has-text("Google")');

    await expect(page.locator('text=cancelled')).toBeVisible();
  });
});
```

---

## 🚀 Deployment Checklist

### Vercel Environment Variables

Set these in Vercel Project Settings → Environment Variables:

#### Analytics
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

#### Authentication
```
BETTER_AUTH_SECRET=<openssl rand -base64 32>
GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### OAuth Redirect URLs

Update in OAuth provider dashboards:

**GitHub**: `https://yourdomain.com/api/auth/callback/github`
**Google**: `https://yourdomain.com/api/auth/callback/google`

---

## 📊 Testing Commands

```bash
# Unit + Integration tests
pnpm test

# Watch mode
pnpm test:watch

# E2E tests (local)
pnpm test:e2e

# E2E tests (production smoke test)
BASE_URL=https://your-vercel-url.vercel.app pnpm test:e2e
```

---

## 📝 Next Steps Summary

1. **Auth Integration** (30 min)
   - Add PostHog identify hook
   - Wire into ClientProviders

2. **Error Handling** (1 hour)
   - Create OAuth error handler
   - Update LoginForm and SocialSigninButton
   - Add error UI states

3. **MSW Setup** (30 min)
   - Create handlers, server, setup files
   - Update vitest.config

4. **Integration Tests** (1 hour)
   - Write analytics init test
   - Write analytics identify test
   - Run and validate

5. **E2E Tests** (2 hours)
   - Install Playwright
   - Write OAuth success flows
   - Write OAuth error flows
   - Run and validate

6. **Deploy** (15 min)
   - Set Vercel env vars
   - Update OAuth redirect URLs
   - Run prod smoke tests

**Total Estimated Time**: ~5 hours

---

## 🎯 Success Criteria

- [ ] PostHog tracks pageviews automatically
- [ ] User identified in PostHog after login
- [ ] PostHog reset on logout
- [ ] Vercel Analytics tracking web vitals
- [ ] All OAuth error scenarios handled gracefully
- [ ] MSW mocking OAuth providers
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Deployed to Vercel with env vars set
- [ ] OAuth flows working in production
