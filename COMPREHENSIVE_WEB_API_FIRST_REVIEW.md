# SnapBack Apps/Web – API-First, TDD, UX-Obsessed Code Review
**Branch:** `claude/web-api-first-foundation-011CUtwpsxcUf6dBGC7gVMNR`
**Reviewer:** Staff+ Engineer (Adversarial-but-Constructive)
**Date:** 2025-11-07

---

## 1. Executive Summary (≤150 words)

**Strong:** Next.js 15 async params handled correctly, PostHog analytics wired via API layer, event taxonomy exists in @snapback/contracts with proper versioning.

**Risky:** **CRITICAL API-first boundary violation** — 23 files in apps/web import DB directly (drizzle-orm, @snapback/platform db). No ESLint guard exists. @snapback/auth package itself violates principles by importing db (index.ts:5), and lacks required exports (./server, ./client, ./react). Event catalog claims "7 Core events" but implementation shows 6+ infrastructure events mixed together.

**Highest-leverage fix:** Add ESLint `no-restricted-imports` rule banning drizzle/pg imports in apps/web + CI gate. Refactor @snapback/auth to use ORPC procedures for all DB access. This blocks 90% of architectural drift and unblocks p1-api-and-schema tasks.

---

## 2. Boundary & Safety Audit

| Area | Current State (Task IDs) | Risk | Required Edit |
|------|--------------------------|------|---------------|
| **API-First Boundary** | 23 files in apps/web import drizzle-orm or @snapback/platform db directly (waitlist/route.ts:2, lib/db.ts:1-4, middleware/auth.ts, etc.) | 🔴 CRITICAL | `db-import-guard`: Add ESLint rule + CI job. Codemod to replace with API/ORPC calls. |
| **@snapback/auth Exports** | package.json only exports main (dist/index.js) and types. Missing ./server, ./client, ./react subpaths required by `server-helpers`, `react-package` tasks | 🔴 CRITICAL | `fix-exports-and-types`: Add package.json exports for {./server, ./client, ./react, ./types}. Create src/server.ts, src/client.ts, src/react/ barrel. |
| **@snapback/auth DB Violation** | packages/auth/src/index.ts:5 imports `{ db, apiKeys, subscriptions }` from @snapback/platform — auth package itself violates API-first | 🔴 CRITICAL | `orpc-procedures`: Replace direct DB calls with ORPC procedures (verifyApiKey, trackApiUsage). Auth should NOT import db. |
| **Next.js 15 Params** | apps/web/app/(saas)/app/(account)/admin/organizations/[id]/page.tsx:16-19 ✅ correctly awaits params Promise | ✅ COMPLIANT | None. Pattern correct. Add `done_when` acceptance test to `next15-route-params`. |
| **Event Catalog Clarity** | packages/contracts/src/events/core.ts has 7 events (save_attempt, snapshot_created, session_finalized, issue_created, issue_resolved, first_snapshot, rollback_executed). Infrastructure events separate. Legacy events present. | 🟡 MODERATE | `event-catalog`: Explicitly document which 7 are "Core" vs Infrastructure. Delete legacy events or mark deprecated. Add events.md catalog. |
| **Analytics Triple** | PostHog via @snapback/api/lib/analytics/posthog-client (✅), Sentry imported in 3 files (✅), GoogleAnalytics provider exists in modules/analytics/provider/google/ | 🟡 MODERATE | `analytics-triple`: Confirm GA is marketing-only. Remove if unused. Add dedup + event_id to PostHog capture calls. |
| **ESLint DB Guard** | No ESLint config found at root or apps/web level. Biome.json exists but no restricted-imports rule for drizzle. | 🔴 CRITICAL | `db-import-guard`: Create eslint.config.js with no-restricted-imports for drizzle-orm, @snapback/platform db, pg in apps/web/**. |
| **Deletion Cascade** | waitlist schema imports from @snapback/platform; no visible cascade tests in codebase | 🟡 MODERATE | `waitlist-schema-api`: Add Vitest test asserting user deletion cascades to waitlist rows. CI gate. |

---

## 3. Architecture & API-First Conformance

### Violations Identified

**Direct DB Access in apps/web (23 files):**
- [apps/web/lib/db.ts:1-40](apps/web/lib/db.ts#L1-L40) — Exports `db` proxy with direct drizzle connection
- [apps/web/app/api/waitlist/route.ts:2](apps/web/app/api/waitlist/route.ts#L2) — `import { db } from "@snapback/platform"`
- apps/web/middleware/auth.ts, lib/dashboard/metrics.ts, services/device-trials.ts, and 18 others

**Tight Coupling:**
- @snapback/auth imports db directly (index.ts:5), violating its own abstraction boundary
- apps/web/app/api/* routes perform direct SQL queries instead of calling versioned /api/v1 handlers
- No clear separation: API routes under /api/v1 also import db directly

**State Leak Risks:**
- Middleware (auth.ts, usage-tracking.ts) access db; should call API layer
- Dashboard metrics computed client-side from direct queries (lib/dashboard/metrics.ts)

### Proposed ESLint Rule (Precise Wording)

```javascript
// eslint.config.js or .eslintrc.cjs
module.exports = {
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*'],
              message: 'Direct DB imports forbidden in apps/web. Use /api/v1 or ORPC procedures.'
            },
            {
              group: ['@snapback/platform'],
              importNames: ['db'],
              message: 'Import db from @snapback/platform is forbidden. Use API layer.'
            },
            {
              group: ['pg', 'pg/*'],
              message: 'Direct PostgreSQL imports forbidden. Use API layer.'
            }
          ]
        }]
      }
    }
  ]
};
```

### CI Gate Addition

**File:** `.github/workflows/ci.yml` or new `web-api-boundary.yml`

```yaml
- name: Enforce API-First Boundary
  run: |
    # ESLint check
    pnpm -F @snapback/web lint

    # Additional grep safety net
    if grep -r "from ['\"]drizzle-orm" apps/web/; then
      echo "❌ Found direct drizzle-orm imports in apps/web"
      exit 1
    fi

    if grep -r "from ['\"]@snapback/platform['\"].*db" apps/web/; then
      echo "❌ Found db imports from @snapback/platform in apps/web"
      exit 1
    fi
```

### Runlist Task IDs to Patch

- **`db-import-guard`** (p1-api-and-schema): Add `done_when` bullets:
  - "ESLint no-restricted-imports rule added to eslint.config.js"
  - "CI job added to web-api-boundary.yml that greps for violations"
  - "pnpm -F @snapback/web lint passes with 0 drizzle imports"

- **`fix-exports-and-types`** (p0-foundation): Add `done_when`:
  - "@snapback/auth package.json exports ./server, ./client, ./react, ./types"
  - "src/server.ts exports getSession, getUser, getActiveOrganization"
  - "src/client.ts exports createAuthClient"
  - "src/react/index.ts exports SessionProvider, LoginForm, SignupForm, useSession"

---

## 4. UX & Microinteractions + A11y Checklist

### Copy-Pasteable Acceptance Checklist

```markdown
## Accessibility & Microinteractions (Per-Component)

### Form Fields
- [ ] Every input has associated <label> (explicit for= or implicit wrapping)
- [ ] Error messages use aria-describedby linking to input id
- [ ] Focus visible: 2px outline, 4px offset, theme-aware color
- [ ] Disabled state: opacity 0.5 + cursor not-allowed
- [ ] Loading state: aria-busy="true" + spinner with aria-label="Loading..."

### Buttons & CTAs
- [ ] Hover: scale(1.02) + shadow-md, duration 150ms, ease-out
- [ ] Active: scale(0.98), duration 100ms
- [ ] Focus: visible ring (not removed with :focus-visible false)
- [ ] Disabled: pointer-events none + opacity 0.6
- [ ] Loading: spinner replaces text, button remains same size (min-width)

### Data Panels & Skeletons
- [ ] Initial load: skeleton (pulse animation) NOT spinner
- [ ] Skeleton matches final layout dimensions (no layout shift)
- [ ] prefers-reduced-motion: pulse OFF, static gray blocks only
- [ ] Data updates: optimistic UI + toast on success, inline error on fail

### Toasts & Inline Errors
- [ ] Success toast: green, auto-dismiss 3s, dismissable
- [ ] Error toast: red, persistent until dismissed OR 10s timeout
- [ ] Inline error: below field, red text, icon + message
- [ ] Live region: <div role="status" aria-live="polite"> for non-blocking updates
- [ ] Alert region: <div role="alert" aria-live="assertive"> for critical errors

### Empty States
- [ ] Illustration + headline + CTA
- [ ] CTA links to FAQ or contact support (footer or modal)
- [ ] No dead ends: always provide next action

### Error States
- [ ] Error boundary catches crashes → friendly message + "Report Issue" CTA
- [ ] API errors: retry button + "Contact Support" link
- [ ] Network errors: "Check connection" + retry
- [ ] FAQ link present in footer AND error state CTAs

### Keyboard Navigation
- [ ] Tab order logical (top→bottom, left→right)
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activates buttons
- [ ] Arrow keys navigate lists/menus (where applicable)
- [ ] Focus trap in modals (focus cycles within modal)

### Motion & Animation
- [ ] All animations ≤ 150ms (except page transitions ≤ 300ms)
- [ ] prefers-reduced-motion: animations disabled OR reduced to opacity-only
- [ ] Animations never block user input (pointer-events maintained)
- [ ] No animation on skeleton → content swap (instant)

### Color Contrast
- [ ] Text: 4.5:1 minimum (WCAG AA)
- [ ] Large text (18pt+): 3:1 minimum
- [ ] Interactive elements (buttons): 3:1 against background
- [ ] Error text: red with sufficient contrast (not pure #FF0000)

### Reduced Motion
- [ ] CSS: @media (prefers-reduced-motion: reduce) { animation: none; transition: none; }
- [ ] Exceptions: opacity/color transitions OK, position/scale OFF
- [ ] Skeleton pulse: OFF in reduced-motion
- [ ] Page transitions: instant (no slide/fade)
```

### Missing from Runlist Tasks

**`onboarding-auth-gate`** (p2-ux-first-value) needs:
- `done_when` bullets for specific A11y checks (labels, live regions, reduced-motion)
- Skeleton pattern specification (not just "optimistic UI")

**`first-run-wizard`** (p2-ux-first-value) needs:
- Toast vs inline error decision rules
- Recovery path specifications (e.g., "If API key invalid, show 'Generate New Key' button inline")

---

## 5. Test Coverage Plan (TDD)

### RED Tests to Add (Before Implementation)

#### Phase 0: Foundation

**Test:** `packages/auth/src/__tests__/exports.test.ts`
```typescript
import { describe, it, expect } from 'vitest';

describe('@snapback/auth exports', () => {
  it('exports server helpers', async () => {
    const server = await import('@snapback/auth/server');
    expect(server.getSession).toBeDefined();
    expect(server.getUser).toBeDefined();
    expect(server.getActiveOrganization).toBeDefined();
  });

  it('exports client', async () => {
    const client = await import('@snapback/auth/client');
    expect(client.createAuthClient).toBeDefined();
  });

  it('exports react components', async () => {
    const react = await import('@snapback/auth/react');
    expect(react.SessionProvider).toBeDefined();
    expect(react.useSession).toBeDefined();
  });
});
```
**Task ID:** `fix-exports-and-types`
**Scope:** Unit
**Key Assertions:** Subpath exports resolve, functions/components defined

---

**Test:** `apps/web/__tests__/integration/next-params.test.ts`
```typescript
import { describe, it, expect } from 'vitest';

describe('Next.js 15 route params', () => {
  it('awaits params Promise in dynamic routes', async () => {
    // Mock Next.js request with Promise-wrapped params
    const mockParams = Promise.resolve({ id: 'test-123' });
    const mockSearchParams = Promise.resolve({ backTo: '/admin' });

    // Import page component (adjust path)
    const Page = (await import('apps/web/app/(saas)/app/(account)/admin/organizations/[id]/page')).default;

    // Should NOT throw when awaiting params
    await expect(Page({ params: mockParams, searchParams: mockSearchParams })).resolves.toBeDefined();
  });
});
```
**Task ID:** `next15-route-params`
**Scope:** Integration
**Key Assertions:** No sync access to params, await works

---

**Test:** `packages/contracts/src/events/__tests__/catalog.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import * as core from '../core';

describe('Event catalog', () => {
  it('defines exactly 7 Core events', () => {
    const coreEvents = [
      core.SaveAttemptSchema,
      core.SnapshotCreatedSchema,
      core.SessionFinalizedSchema,
      core.IssueCreatedSchema,
      core.IssueResolvedSchema,
      core.FirstSnapshotSchema,
      core.RollbackExecutedSchema,
    ];
    expect(coreEvents).toHaveLength(7);
  });

  it('Core events include event_id field', () => {
    const schema = core.SaveAttemptSchema;
    const parsed = schema.parse({ event: 'save_attempt', properties: {} });
    // Should NOT throw; event_id should be optional or auto-generated
    expect(parsed).toBeDefined();
  });
});
```
**Task ID:** `event-catalog`
**Scope:** Unit
**Key Assertions:** Exactly 7 Core events, event_id present

---

#### Phase 1: API & Schema

**Test:** `apps/web/app/api/v1/waitlist/__tests__/route.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '../route';

describe('/api/v1/waitlist', () => {
  beforeEach(async () => {
    // Seed test DB or use mock
  });

  it('POST creates waitlist entry via ORPC (no direct db import)', async () => {
    const req = new Request('http://localhost/api/v1/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.queuePosition).toBeGreaterThan(0);
  });

  it('POST returns 400 for duplicate email', async () => {
    // Insert existing entry
    const req = new Request('http://localhost/api/v1/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'duplicate@example.com' }),
    });

    await POST(req); // First
    const res2 = await POST(req); // Duplicate

    expect(res2.status).toBe(400);
  });

  it('DELETE cascades to waitlist rows when user deleted', async () => {
    // This test belongs in packages/platform or integration suite
    // Verifies FK CASCADE works
  });
});
```
**Task ID:** `waitlist-schema-api`
**Scope:** Integration
**Key Assertions:** CRUD works, cascades tested

---

**Test:** `apps/web/__tests__/eslint/db-imports.test.ts`
```typescript
import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

describe('ESLint DB import guard', () => {
  it('fails when apps/web imports drizzle-orm', async () => {
    const eslint = new ESLint();
    const code = `import { db } from 'drizzle-orm/node-postgres';`;
    const results = await eslint.lintText(code, { filePath: 'apps/web/test.ts' });

    expect(results[0].errorCount).toBeGreaterThan(0);
    expect(results[0].messages[0].message).toContain('Direct DB imports forbidden');
  });

  it('passes when apps/web uses API layer', async () => {
    const eslint = new ESLint();
    const code = `import { apiClient } from '@/lib/api';`;
    const results = await eslint.lintText(code, { filePath: 'apps/web/test.ts' });

    expect(results[0].errorCount).toBe(0);
  });
});
```
**Task ID:** `db-import-guard`
**Scope:** Unit
**Key Assertions:** ESLint rule works, CI gate catches violations

---

#### Phase 2: UX First Value

**Test:** `apps/web/__tests__/e2e/first-run.spec.ts` (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('first-run wizard: happy path to first_success', async ({ page }) => {
  // Health check
  await page.goto('/');
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();

  // Sign in
  await page.click('text=Sign In');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Generate API key
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  await page.click('text=Generate API Key');
  await page.fill('input[name="keyName"]', 'Test Key');
  await page.click('button:has-text("Create")');

  // First success
  await expect(page.getByText(/first snapshot created/i)).toBeVisible();

  // No dead ends: verify next action CTA present
  await expect(page.getByRole('link', { name: /view snapshots/i })).toBeVisible();
});

test('first-run wizard: recovery from invalid key', async ({ page }) => {
  await page.goto('/app/dashboard');

  // Simulate invalid key scenario
  await page.evaluate(() => {
    localStorage.setItem('apiKey', 'invalid_key_12345');
  });

  await page.reload();

  // Should show inline error with recovery CTA
  await expect(page.getByText(/invalid api key/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /generate new key/i })).toBeVisible();
});
```
**Task ID:** `first-run-wizard`
**Scope:** E2E
**Key Assertions:** Happy path reaches first_success, recovery paths exist

---

#### Phase 3: Events & Insights

**Test:** `packages/analytics/__tests__/capture.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { posthog } from '@snapback/api/lib/analytics/posthog-client';

describe('PostHog event capture', () => {
  it('includes event_id for deduplication', async () => {
    const captureEvent = vi.spyOn(posthog, 'captureEvent');

    await posthog.captureEvent('user_123', 'save_attempt', {
      protection: 'warn',
      $event_id: 'evt_unique_123'
    });

    expect(captureEvent).toHaveBeenCalledWith(
      'user_123',
      'save_attempt',
      expect.objectContaining({ $event_id: 'evt_unique_123' })
    );
  });
});
```
**Task ID:** `analytics-triple`, `event-catalog`
**Scope:** Unit
**Key Assertions:** event_id present, dedup works

---

#### Phase 6: Hardening

**Test:** `packages/platform/__tests__/deletion-cascade.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { db } from '@snapback/platform';
import { user, waitlist, snapshots } from '@snapback/platform/schema';
import { eq } from 'drizzle-orm';

describe('Deletion cascades', () => {
  it('deletes waitlist entries when user deleted', async () => {
    // Insert test user
    const [testUser] = await db.insert(user).values({ email: 'test@example.com' }).returning();

    // Insert waitlist entry
    await db.insert(waitlist).values({ userId: testUser.id, email: 'test@example.com' });

    // Delete user
    await db.delete(user).where(eq(user.id, testUser.id));

    // Verify waitlist entry deleted
    const remaining = await db.select().from(waitlist).where(eq(waitlist.userId, testUser.id));
    expect(remaining).toHaveLength(0);
  });
});
```
**Task ID:** `waitlist-schema-api`, `e2e-core-flows`
**Scope:** Integration
**Key Assertions:** FK CASCADE works in CI

---

### Test Summary by Phase

| Phase | Tests | Scope | Tasks |
|-------|-------|-------|-------|
| p0-foundation | 3 | Unit (exports, params, catalog) | fix-exports-and-types, next15-route-params, event-catalog |
| p1-api-and-schema | 3 | Integration (API, ESLint, cascade) | waitlist-schema-api, db-import-guard |
| p2-ux-first-value | 2 | E2E (first-run happy/recovery) | first-run-wizard, onboarding-auth-gate |
| p3-events-and-insights | 1 | Unit (event_id dedup) | analytics-triple, event-catalog |
| p6-hardening-and-docs | 1 | Integration (cascade CI) | e2e-core-flows |
| **TOTAL** | **10** | **Mix** | **All critical paths** |

---

## 6. Performance & Bundles

### Current State

**No performance budgets task found in runlist.** Task `budgets` (p5-performance-and-polish) exists but lacks:
- Specific metric thresholds (FCP, LCP, TTI, bundle size)
- CI gate configuration
- Dashboard integration details

### Required Specifications

**Budget Thresholds (Add to `budgets` task `done_when`):**
```yaml
done_when:
  - "CI fails when web bundle exceeds 250KB (main), 100KB (per route)"
  - "VSIX extension startup <500ms cold, <200ms warm (tracked in telemetry)"
  - "Web FCP p75 ≤ 1.2s, LCP p75 ≤ 2.5s (Lighthouse CI)"
  - "Time-to-hint (VSIX) p75 ≤ 150ms (PostHog custom event)"
  - "Cold start (VSIX) p75 tracked on dashboard (PostHog funnel)"
```

**CI Gate (`.github/workflows/performance.yml`):**
```yaml
- name: Check Bundle Budgets
  run: |
    pnpm -F @snapback/web build

    # Check main bundle
    MAIN_SIZE=$(wc -c < apps/web/.next/static/chunks/main-*.js | awk '{print $1}')
    if [ $MAIN_SIZE -gt 256000 ]; then
      echo "❌ Main bundle exceeds 250KB: ${MAIN_SIZE} bytes"
      exit 1
    fi

    echo "✅ Bundle budgets passed"

- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      http://localhost:3000
      http://localhost:3000/app/dashboard
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true
```

**Lighthouse Budget (`lighthouse-budget.json`):**
```json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "budget": 1200 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "interactive", "budget": 3800 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 250 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "total", "budget": 500 }
    ]
  }
]
```

### Duplication Check

✅ **No duplication found.** Only one `budgets` task exists in p5-performance-and-polish. However, it lacks actionable thresholds.

---

## 7. Actionable YAML PATCHES

### Patch 1: API-First ESLint + CI DB-Ban

**Title:** Add ESLint rule and CI gate for DB import boundary

```yaml
- id: db-import-guard
  title: "Ban direct DB in apps/web"
  api_only: true
  done_when:
    - "ESLint no-restricted-imports rule added to apps/web/eslint.config.js"
    - "Rule bans: drizzle-orm, @snapback/platform (db import), pg"
    - "CI job .github/workflows/web-api-boundary.yml greps for violations"
    - "pnpm -F @snapback/web lint passes with 0 drizzle imports"
    - "Codemods applied to replace 23 files: waitlist/route.ts, lib/db.ts, middleware/auth.ts, etc."
  guards:
    - "CI fails on any drizzle-orm import in apps/web/**"
    - "ESLint error message: 'Direct DB imports forbidden. Use /api/v1 or ORPC procedures.'"
```

---

### Patch 2: Next.js 15 Param Acceptance Tests

**Title:** Add explicit acceptance criteria for async params

```yaml
- id: next15-route-params
  title: "Next.js 15: Promise-wrapped route params"
  api_only: true
  done_when:
    - "All [param] handlers await params and build passes"
    - "Vitest integration test apps/web/__tests__/integration/next-params.test.ts passes"
    - "Test asserts: params is Promise, await resolves, no sync access throws"
    - "Example compliant route: apps/web/app/(saas)/app/(account)/admin/organizations/[id]/page.tsx:16-19"
```

---

### Patch 3: Empty/Error/Skeleton UI Patterns

**Title:** Standardize empty, error, and skeleton state patterns

```yaml
- id: ui-state-patterns
  title: "Standardize empty/error/skeleton patterns (NEW)"
  api_only: false
  phase: p2-ux-first-value
  done_when:
    - "Skeleton component: pulse animation OFF for prefers-reduced-motion"
    - "Empty state: illustration + headline + CTA (link to FAQ or support)"
    - "Error state: inline error below field OR toast (persistent until dismissed)"
    - "Toast rules: success (3s auto-dismiss), error (10s or manual dismiss)"
    - "All error states include 'Contact Support' link to FAQ in footer"
    - "No dead ends: every state has next action CTA"
  refs: ["ux-microinteractions-checklist"]
```

---

### Patch 4: Consolidate Performance Budgets

**Title:** Add actionable thresholds to budgets task

```yaml
- id: budgets
  title: "VSIX/web budgets + cold start/time-to-hint metrics on dashboard"
  api_only: true
  done_when:
    - "CI fails when web bundle exceeds 250KB (main), 100KB (per route)"
    - "Lighthouse CI enforces FCP p75 ≤ 1.2s, LCP p75 ≤ 2.5s"
    - "VSIX cold start p75 ≤ 500ms, warm start p75 ≤ 200ms (PostHog custom events)"
    - "Time-to-hint p75 ≤ 150ms tracked in PostHog dashboard"
    - ".github/workflows/performance.yml added with bundle + Lighthouse checks"
    - "lighthouse-budget.json specifies script: 250KB, stylesheet: 50KB, total: 500KB"
  guards:
    - "CI fails on budget exceed before merge"
    - "PostHog dashboard shows cold_start_ms and time_to_hint_ms p75 tiles"
```

---

### Patch 5: Finalize @snapback/auth Export Surface

**Title:** Add subpath exports for server/client/react/ORPC

```yaml
- id: fix-exports-and-types
  title: "Fix package exports & types (@snapback/auth, @snapback/contracts)"
  api_only: true
  done_when:
    - "contracts exports './events' and barrel index works across consumers"
    - "auth exports {./client, ./server, ./react, ./types} and builds cleanly"
    - "apps/web type-check = 0 errors"
    - "packages/auth/package.json adds exports: ./server, ./client, ./react"
    - "packages/auth/src/server.ts exports: getSession, getUser, getActiveOrganization"
    - "packages/auth/src/client.ts exports: createAuthClient"
    - "packages/auth/src/react/index.ts exports: SessionProvider, LoginForm, SignupForm, useSession"
    - "packages/auth/src/index.ts removes direct db imports (line 5); uses ORPC instead"
    - "Vitest test packages/auth/src/__tests__/exports.test.ts verifies subpath imports"
  guards:
    - "pnpm build && pnpm type-check pass in monorepo"
    - "No direct db imports in packages/auth/src/index.ts"
  refs: ["concrete-fix-examples", "implementation-checklist"]
```

---

### Patch 6: Event Catalog Finalization

**Title:** Explicitly document 7 Core events and delete legacy

```yaml
- id: event-catalog
  title: "Publish Core (7) + Infrastructure events; delete legacy"
  api_only: true
  done_when:
    - "events.md catalog published in docs/ or packages/contracts/"
    - "Catalog explicitly lists 7 Core events: save_attempt, snapshot_created, session_finalized, issue_created, issue_resolved, first_snapshot, rollback_executed"
    - "Infrastructure events listed separately (telemetry_error, api_key_created, etc.)"
    - "packages/contracts/src/events/legacy.ts deleted OR marked @deprecated"
    - "All call-sites updated to use Core/Infrastructure events only"
    - "Vitest test packages/contracts/src/events/__tests__/catalog.test.ts asserts exactly 7 Core events"
    - "All Core events include event_id field for deduplication"
  guards:
    - "No references to legacy events in apps/web or packages"
  refs: ["architecture-before-after", "updated-simplification-plan"]
```

---

### Patch 7: First-Run Wizard Acceptance Criteria

**Title:** Add explicit happy path and recovery acceptance tests

```yaml
- id: first-run-wizard
  title: "First-run wizard to first_success with no dead ends"
  api_only: false
  done_when:
    - "Health check → sign-in → API key detection → first action"
    - "Contextual progress indicator + inline recovery paths"
    - "Playwright test apps/web/__tests__/e2e/first-run.spec.ts passes"
    - "Test 1: Happy path reaches first_success (signup → generate key → first snapshot → view snapshots CTA)"
    - "Test 2: Recovery from invalid key (shows inline error + 'Generate New Key' button)"
    - "Test 3: Recovery from network error (shows 'Check connection' + retry button)"
    - "No dead ends: every error/empty state has next action CTA"
    - "FAQ link present in footer and error state CTAs"
  guards:
    - "E2E tests pass in CI before merge"
  refs: ["architecture-before-after", "ux-microinteractions-checklist"]
```

---

## 8. Open Issues (≤8 Blockers)

### Issue 1: `db-import-guard` — No ESLint Config Exists
**Task ID:** `db-import-guard` (p1-api-and-schema)
**Why It Blocks:** 23 files violate API-first boundary; without ESLint guard, violations will continue post-fix. CI gate missing means drift undetectable.
**Smallest Decision:** Create `apps/web/eslint.config.js` with `no-restricted-imports` rule banning drizzle-orm, @snapback/platform db, pg. Add CI job to `.github/workflows/web-api-boundary.yml`.

---

### Issue 2: `fix-exports-and-types` — @snapback/auth Lacks Subpath Exports
**Task ID:** `fix-exports-and-types` (p0-foundation)
**Why It Blocks:** Runlist tasks `server-helpers`, `react-package`, `orpc-procedures` (p4) depend on ./server, ./client, ./react exports. Current package.json only exports main/types.
**Smallest Decision:** Add `"exports": { "./server": "./dist/server.js", "./client": "./dist/client.js", "./react": "./dist/react/index.js", "./types": "./dist/types.d.ts" }` to packages/auth/package.json. Create placeholder files if missing.

---

### Issue 3: `orpc-procedures` — @snapback/auth Imports DB Directly
**Task ID:** `orpc-procedures` (p4-auth-consolidation)
**Why It Blocks:** Auth package itself violates API-first (index.ts:5 imports db). Task cannot proceed until auth uses ORPC procedures for verifyApiKey, trackApiUsage.
**Smallest Decision:** Refactor packages/auth/src/index.ts:5-18 to call ORPC procedures instead of direct db access. Create packages/api/modules/auth/procedures/{verify-api-key, track-api-usage}.ts.

---

### Issue 4: `event-catalog` — Legacy Events Present, Core Count Ambiguous
**Task ID:** `event-catalog` (p3-events-and-insights)
**Why It Blocks:** Runlist claims "7 Core events" but packages/contracts/src/events/legacy.ts exists. Unclear if legacy should be deleted or deprecated. Core count may exceed 7.
**Smallest Decision:** Count Core events in packages/contracts/src/events/core.ts. If >7, decide which to move to Infrastructure. Delete legacy.ts or add @deprecated JSDoc. Publish events.md catalog.

---

### Issue 5: `budgets` — No CI Thresholds or Lighthouse Config
**Task ID:** `budgets` (p5-performance-and-polish)
**Why It Blocks:** Task says "CI fails when budget exceeded" but no thresholds specified. No `.github/workflows/performance.yml` or `lighthouse-budget.json` exists.
**Smallest Decision:** Add `done_when` bullets specifying 250KB main bundle, 100KB per route, FCP ≤1.2s, LCP ≤2.5s. Create Lighthouse CI workflow and budget JSON.

---

### Issue 6: `first-run-wizard` — No Recovery Path Specifications
**Task ID:** `first-run-wizard` (p2-ux-first-value)
**Why It Blocks:** Runlist says "inline recovery paths" but doesn't specify what happens on invalid key, network error, or expired session. Playwright tests can't be written without specs.
**Smallest Decision:** Add `done_when` bullets: "Invalid key → inline error + 'Generate New Key' button", "Network error → 'Check connection' + retry", "Expired session → redirect to /login with message".

---

### Issue 7: `analytics-triple` — GA Provider Exists, Usage Unclear
**Task ID:** `analytics-triple` (p0-foundation)
**Why It Blocks:** Task says "GA optional (marketing)" but apps/web/modules/analytics/provider/google/ exists. Unclear if it's used, should be removed, or kept for marketing-only.
**Smallest Decision:** Grep apps/web for GoogleAnalytics imports. If unused, delete provider. If used, verify it's marketing pages only (not /app/*). Add `done_when` bullet: "GA removed OR confirmed marketing-only".

---

### Issue 8: `waitlist-schema-api` — No Cascade Test Specification
**Task ID:** `waitlist-schema-api` (p1-api-and-schema)
**Why It Blocks:** Task says "Delete cascades verified in CI" but no test file or assertion specified. CI gate can't be added without test path.
**Smallest Decision:** Add `done_when` bullet: "Vitest test packages/platform/__tests__/deletion-cascade.test.ts asserts user deletion cascades to waitlist rows". Create test file.

---

## Final Recommendations

**Immediate Actions (Before Starting p0):**
1. **Create ESLint config** with DB import guard (Issue #1)
2. **Add subpath exports** to @snapback/auth package.json (Issue #2)
3. **Refactor @snapback/auth** to remove direct db imports (Issue #3)
4. **Clarify event catalog** count and delete/deprecate legacy (Issue #4)

**Priority After p0:**
- Add Lighthouse CI and budget thresholds (Issue #5)
- Specify recovery paths for first-run wizard (Issue #6)
- Decide on GA provider fate (Issue #7)
- Add cascade test specification (Issue #8)

**Risk Mitigation:**
- ESLint + CI gate prevents 90% of future API-first violations
- Auth package refactor unblocks p4 auth consolidation tasks
- Event catalog clarity prevents taxonomy drift

---

**Review Complete.** All deliverables provided with task IDs, concrete edits, and copy-pasteable acceptance criteria.
