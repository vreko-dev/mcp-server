# SnapBack Web Playwright Test Strategy

**Version**: 1.0
**Status**: Implementation Ready
**Surfaces**: snapback.dev | console.snapback.dev | docs.snapback.dev
**Target Coverage**: Enterprise-grade confidence without over-engineering

---

## Executive Summary

This document defines the comprehensive Playwright test strategy for SnapBack's web surfaces, covering critical user journeys across marketing, console, and documentation. Tests are organized by domain and path type (happy/sad/edge/error) to ensure robust coverage with maintainable test suites.

---

## Test Architecture Overview

```
tests/
├── e2e/
│   ├── marketing/           # snapback.dev tests
│   │   ├── landing.spec.ts
│   │   ├── pricing.spec.ts
│   │   ├── waitlist.spec.ts
│   │   └── navigation.spec.ts
│   ├── console/             # console.snapback.dev tests
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── logout.spec.ts
│   │   │   └── oauth.spec.ts
│   │   ├── dashboard/
│   │   │   ├── metrics.spec.ts
│   │   │   ├── activity-feed.spec.ts
│   │   │   └── ai-stats.spec.ts
│   │   ├── api-keys/
│   │   │   ├── create.spec.ts
│   │   │   ├── rotate.spec.ts
│   │   │   └── revoke.spec.ts
│   │   ├── settings/
│   │   │   ├── profile.spec.ts
│   │   │   └── preferences.spec.ts
│   │   └── billing/
│   │       ├── subscription.spec.ts
│   │       └── upgrade.spec.ts
│   ├── docs/                # docs.snapback.dev tests
│   │   ├── navigation.spec.ts
│   │   ├── search.spec.ts
│   │   └── content.spec.ts
│   └── cross-domain/        # Multi-surface flows
│       ├── activation-funnel.spec.ts
│       └── onboarding-complete.spec.ts
├── performance/             # Web Vitals & load tests
│   ├── core-web-vitals.spec.ts
│   ├── api-load.spec.ts
│   └── bundle-size.spec.ts
├── security/                # Security validation
│   ├── auth-bypass.spec.ts
│   ├── csrf.spec.ts
│   ├── xss.spec.ts
│   └── rate-limiting.spec.ts
├── accessibility/           # A11y validation
│   └── wcag.spec.ts
└── fixtures/                # Shared utilities
    ├── auth.fixture.ts
    ├── api.fixture.ts
    ├── test-data.ts
    └── custom-matchers.ts
```

---

## Surface 1: Marketing Site (snapback.dev)

### Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| MKT-H01 | Landing Page Load | Navigate to / | Hero visible, CTA buttons functional, trust bar loads |
| MKT-H02 | How It Works Section | Scroll to how-it-works | Animation triggers, content visible, demo accessible |
| MKT-H03 | Waitlist Signup | Enter email → Submit | Confirmation shown, email captured, analytics fired |
| MKT-H04 | Navigation Flow | Click each nav item | Smooth scroll or page transition, correct section |
| MKT-H05 | Pricing View | Navigate to /pricing | Plans displayed, feature comparison visible |
| MKT-H06 | CTA to Console | Click "Get Started" | Redirect to console.snapback.dev/auth |
| MKT-H07 | Interactive Demo | Engage with demo | Demo responds correctly, no console errors |
| MKT-H08 | Mobile Responsive | Viewport 375px | Menu collapses, content readable, CTA accessible |

### Sad Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| MKT-S01 | Invalid Email Waitlist | Submit malformed email | Validation error shown, form not submitted |
| MKT-S02 | Duplicate Email | Submit already-registered email | Graceful handling, appropriate message |
| MKT-S03 | Empty Form Submit | Click submit without input | Validation fires, required fields highlighted |
| MKT-S04 | Broken Anchor Links | Click anchor to removed section | 404 or graceful fallback, not blank scroll |

### Edge Cases

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| MKT-E01 | Slow Network (3G) | Load page on throttled connection | Content loads progressively, no timeout |
| MKT-E02 | JS Disabled | View page without JS | Core content visible (SSR), graceful degradation |
| MKT-E03 | Large Viewport | Viewport 2560px | No layout breaking, content centered |
| MKT-E04 | Browser Back/Forward | Navigate then use history | Correct state restored, no flash |
| MKT-E05 | Tab Focus Order | Tab through page | Logical focus order, visible focus indicators |

### Error Handling

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| MKT-ER01 | API Timeout | Mock waitlist API timeout | User-friendly error, retry option |
| MKT-ER02 | Network Failure | Disconnect mid-submission | Error boundary catches, recovery message |
| MKT-ER03 | 500 Error Response | Mock server error | Graceful error UI, no raw error exposed |

---

## Surface 2: Console Dashboard (console.snapback.dev)

### Authentication Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-AH01 | GitHub OAuth Login | Click GitHub → Authorize | Redirected to dashboard, session created |
| CON-AH02 | Google OAuth Login | Click Google → Authorize | Redirected to dashboard, session created |
| CON-AH03 | Session Persistence | Close tab → Reopen | Still authenticated, no re-login |
| CON-AH04 | Logout Flow | Click logout | Session cleared, redirected to login |
| CON-AH05 | Auth Redirect | Access protected route unauthed | Redirect to login, return URL preserved |

### Authentication Sad Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-AS01 | OAuth Denial | Deny OAuth permission | Return to login with error message |
| CON-AS02 | Invalid State | Tamper with OAuth state | Error shown, no auth bypass |
| CON-AS03 | Expired Session | Use expired session token | Graceful logout, re-auth prompted |
| CON-AS04 | Concurrent Sessions | Login from two browsers | Both valid, or appropriate handling |

### Dashboard Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-DH01 | Dashboard Load | Navigate to /app/dashboard | All metrics cards render, data populated |
| CON-DH02 | Metrics Display | View MetricsGrid | Snapshot count, recoveries, files, AI rate shown |
| CON-DH03 | AI Detection Stats | View AIDetectionStats | Tool breakdown with confidence percentages |
| CON-DH04 | Activity Feed | View ActivityFeed | Recent events listed with timestamps |
| CON-DH05 | Refresh Data | Click refresh/reload | Data updated, loading states shown |
| CON-DH06 | Date Range Filter | Change date range | Data filtered appropriately |

### Dashboard Sad Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-DS01 | No Data State | New user with no activity | Empty states with helpful CTAs |
| CON-DS02 | Partial Data Load | One API fails | Working components display, failed shows error |
| CON-DS03 | Stale Data Warning | Data older than threshold | Warning indicator, refresh prompt |

### API Key Management Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-KH01 | Create API Key | Click create → Name → Generate | Key displayed once, copy functionality works |
| CON-KH02 | List API Keys | View keys page | All keys listed with metadata |
| CON-KH03 | Rotate Key | Click rotate on existing key | New key generated, old invalidated |
| CON-KH04 | Revoke Key | Click revoke → Confirm | Key deleted, confirmation shown |
| CON-KH05 | Copy Key to Clipboard | Click copy icon | Key copied, toast confirmation |

### API Key Management Sad Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-KS01 | Empty Key Name | Submit without name | Validation error shown |
| CON-KS02 | Duplicate Key Name | Use existing name | Warning or auto-increment |
| CON-KS03 | Revoke Confirmation Cancel | Start revoke → Cancel | Key preserved, action cancelled |
| CON-KS04 | Max Keys Reached | Try to create beyond limit | Upgrade prompt or clear error |

### API Key Edge Cases

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-KE01 | Key Display Timeout | Dismiss key modal quickly | Key no longer retrievable (security) |
| CON-KE02 | Concurrent Key Creation | Rapid double-click create | Only one key created (debounce) |
| CON-KE03 | Key with Special Chars | Name with unicode/special chars | Handled correctly, no injection |

### Settings & Profile Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-SH01 | View Profile | Navigate to settings | Profile info displayed correctly |
| CON-SH02 | Update Display Name | Change name → Save | Name updated, confirmation shown |
| CON-SH03 | Toggle Notifications | Enable/disable notification types | Preferences saved, reflected in UI |
| CON-SH04 | Export Data | Click export → Download | Data exported in expected format |
| CON-SH05 | Delete Account | Initiate deletion flow | Confirmation required, data removed |

### Billing Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-BH01 | View Current Plan | Navigate to billing | Plan details, usage shown |
| CON-BH02 | Upgrade to Pro | Click upgrade → Complete checkout | Plan upgraded, features unlocked |
| CON-BH03 | View Invoice History | Click invoices | Invoice list with download links |
| CON-BH04 | Update Payment Method | Change card details | Payment method updated |
| CON-BH05 | Cancel Subscription | Initiate cancellation | Confirmation, retention offer, cancel |

### Billing Sad Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| CON-BS01 | Payment Declined | Submit invalid card | Error shown, no charge, retry option |
| CON-BS02 | Expired Card | Attempt with expired card | Clear error, update prompt |
| CON-BS03 | Insufficient Funds | Card declined for funds | Appropriate error message |

---

## Surface 3: Documentation (docs.snapback.dev)

### Happy Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| DOC-H01 | Landing Load | Navigate to docs root | TOC visible, getting started prominent |
| DOC-H02 | Navigate TOC | Click TOC items | Content loads, URL updates |
| DOC-H03 | Search Documentation | Search for "API key" | Relevant results, click navigates |
| DOC-H04 | Code Copy | Click copy on code block | Code copied to clipboard |
| DOC-H05 | Next/Previous | Use pagination controls | Navigate sequentially through docs |
| DOC-H06 | Deep Link | Access specific section via URL | Scrolls to section, highlights |
| DOC-H07 | Dark Mode Toggle | Toggle theme | Theme persists across pages |

### Sad Paths

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| DOC-S01 | 404 Page | Navigate to non-existent page | Custom 404, search suggestion |
| DOC-S02 | Empty Search | Search with no results | Empty state with suggestions |
| DOC-S03 | Broken Link | Click link to removed page | 404 or redirect to replacement |

### Edge Cases

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| DOC-E01 | Long Code Block | View page with extensive code | Scrollable, no layout break |
| DOC-E02 | Table Overflow | View wide tables on mobile | Horizontal scroll, readable |
| DOC-E03 | Nested TOC | Deep nested documentation | Collapsible, navigable |

---

## Cross-Domain Flows

### Activation Funnel (Critical Path)

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| XD-AF01 | Full Activation | Marketing → Signup → Auth → Dashboard → API Key | Complete funnel tracked, all steps succeed |
| XD-AF02 | Funnel Abandonment | Start signup → Abandon | Partial progress saved, recoverable |
| XD-AF03 | Return Visitor | Leave mid-funnel → Return | Progress restored, continue from last step |

### Extension Integration

| Test ID | Journey | Steps | Expected Outcome |
|---------|---------|-------|------------------|
| XD-EI01 | Extension Grant Flow | Extension opens browser → Auth → Grant | Token returned to extension |
| XD-EI02 | Extension Re-auth | Expired token → Re-auth | Seamless re-authentication |

---

## Performance Tests

### Core Web Vitals

| Test ID | Metric | Target | Budget | Device |
|---------|--------|--------|--------|--------|
| PERF-01 | FCP | 1000ms | 1500ms | Desktop |
| PERF-02 | FCP | 1800ms | 2400ms | Mobile |
| PERF-03 | LCP | 1500ms | 2500ms | Desktop |
| PERF-04 | LCP | 2500ms | 4000ms | Mobile |
| PERF-05 | CLS | 0.05 | 0.1 | Desktop |
| PERF-06 | CLS | 0.1 | 0.25 | Mobile |
| PERF-07 | FID | 50ms | 100ms | Desktop |
| PERF-08 | FID | 100ms | 300ms | Mobile |
| PERF-09 | INP | 200ms | 500ms | Both |

### API Response Times

| Test ID | Endpoint | Target | Budget |
|---------|----------|--------|--------|
| API-01 | getUserMetrics | 100ms | 200ms |
| API-02 | getAIDetectionStats | 100ms | 200ms |
| API-03 | getRecentActivity | 150ms | 300ms |
| API-04 | createApiKey | 200ms | 500ms |
| API-05 | listApiKeys | 100ms | 200ms |

### Bundle Size

| Test ID | Metric | Budget |
|---------|--------|--------|
| BUNDLE-01 | Initial JS | 500KB |
| BUNDLE-02 | Initial CSS | 100KB |
| BUNDLE-03 | Largest Chunk | 250KB |

---

## Security Tests

### Authentication Security

| Test ID | Scenario | Expected Outcome |
|---------|----------|------------------|
| SEC-A01 | Session Fixation | New session on auth, old invalidated |
| SEC-A02 | CSRF Token Validation | Invalid token rejected, 403 returned |
| SEC-A03 | Session Hijacking | Stolen session ID rejected |
| SEC-A04 | Brute Force Login | Rate limiting kicks in after N attempts |
| SEC-A05 | Auth Bypass via Direct URL | Redirect to login, no data exposed |

### Input Validation

| Test ID | Scenario | Expected Outcome |
|---------|----------|------------------|
| SEC-I01 | XSS in Form Fields | Script sanitized, not executed |
| SEC-I02 | SQL Injection (Name fields) | Input escaped, no DB impact |
| SEC-I03 | CRLF Injection | Headers sanitized |
| SEC-I04 | Path Traversal | Paths normalized, no access |

### API Security

| Test ID | Scenario | Expected Outcome |
|---------|----------|------------------|
| SEC-P01 | Unauthorized API Access | 401 returned, no data |
| SEC-P02 | Cross-User Data Access | 403 returned, isolation enforced |
| SEC-P03 | Rate Limit Exceeded | 429 returned, retry-after header |
| SEC-P04 | Invalid API Key Format | 401 returned, key not logged |

---

## Accessibility Tests

### WCAG 2.1 AA Compliance

| Test ID | Criterion | Scope |
|---------|-----------|-------|
| A11Y-01 | Color Contrast (1.4.3) | All text elements |
| A11Y-02 | Keyboard Navigation (2.1.1) | All interactive elements |
| A11Y-03 | Focus Visible (2.4.7) | All focusable elements |
| A11Y-04 | Form Labels (1.3.1) | All form inputs |
| A11Y-05 | Alt Text (1.1.1) | All images |
| A11Y-06 | Heading Structure (1.3.1) | Page hierarchy |
| A11Y-07 | ARIA Attributes | Dynamic content |
| A11Y-08 | Error Identification (3.3.1) | Form validation |

---

## Test Data Strategy

### User Personas

```typescript
const testUsers = {
  newUser: {
    // Fresh account, no activity
    email: 'test-new@snapback.dev',
    hasSnapshots: false,
    hasApiKeys: false,
    tier: 'free'
  },
  activeUser: {
    // Regular user with activity
    email: 'test-active@snapback.dev',
    hasSnapshots: true,
    hasApiKeys: true,
    tier: 'free'
  },
  proUser: {
    // Paid subscriber
    email: 'test-pro@snapback.dev',
    hasSnapshots: true,
    hasApiKeys: true,
    tier: 'pro'
  },
  teamAdmin: {
    // Organization admin
    email: 'test-admin@snapback.dev',
    hasSnapshots: true,
    hasApiKeys: true,
    tier: 'enterprise',
    role: 'admin'
  }
};
```

### Mock Data Scenarios

```typescript
const mockScenarios = {
  emptyState: {
    snapshots: [],
    apiKeys: [],
    activity: []
  },
  normalLoad: {
    snapshots: 50,
    apiKeys: 3,
    activity: 100
  },
  heavyLoad: {
    snapshots: 10000,
    apiKeys: 10,
    activity: 50000
  }
};
```

---

## CI/CD Integration

### Pipeline Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload performance results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: performance-report
          path: performance-results/
```

### Test Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Local | localhost:3000 | Development testing |
| Preview | pr-*.vercel.app | PR validation |
| Staging | staging.snapback.dev | Pre-production |
| Production | snapback.dev | Smoke tests only |

---

## Priority Matrix

### P0 - Ship Blockers (Run on every commit)
- MKT-H01, MKT-H03 (Landing, Waitlist)
- CON-AH01, CON-AH02 (OAuth Login)
- CON-DH01 (Dashboard Load)
- CON-KH01, CON-KH04 (Key Create, Revoke)
- XD-AF01 (Activation Funnel)
- SEC-A05 (Auth Bypass)

### P1 - Critical (Run on PR merge)
- All Authentication paths
- All API Key management paths
- Core Dashboard functionality
- Performance tests
- Security tests

### P2 - Important (Run nightly)
- All Marketing paths
- All Settings paths
- Billing flows
- Accessibility tests
- Edge cases

### P3 - Nice to Have (Run weekly)
- Browser compatibility
- Extensive edge cases
- Load testing
- Chaos testing

---

## Estimated Implementation Effort

| Category | Test Count | Effort |
|----------|------------|--------|
| Marketing | 16 | 4h |
| Console Auth | 9 | 6h |
| Console Dashboard | 9 | 6h |
| Console API Keys | 9 | 4h |
| Console Settings | 5 | 3h |
| Console Billing | 8 | 5h |
| Documentation | 10 | 3h |
| Cross-Domain | 4 | 4h |
| Performance | 14 | 6h |
| Security | 12 | 8h |
| Accessibility | 8 | 4h |
| **Total** | **104** | **53h** |

---

## Success Criteria

- ✅ All P0 tests pass on every commit
- ✅ P1 tests pass before merge to main
- ✅ Performance budgets enforced in CI
- ✅ No accessibility regressions
- ✅ Security tests pass with zero critical findings
- ✅ Test coverage >80% of critical paths
- ✅ Flake rate <1%
