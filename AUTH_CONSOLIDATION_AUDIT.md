# SnapBack Auth Audit Report
**Date**: 2025-11-07
**Scope**: Complete authentication architecture audit
**Focus**: Import patterns, dependencies, and consolidation opportunities

## Executive Summary

The SnapBack monorepo has **fragmented authentication architecture** spread across 4 locations with significant duplication and maintenance burden:

- **75 files** across codebase import from `@snapback/auth`
- **3 separate auth modules** with overlapping responsibilities
- **Better Auth** library as single source of truth (v1.3.26)
- **Missing centralized client** - each consumer builds their own

**Risk**: Inconsistent patterns, type safety issues, difficult to update auth logic globally

---

## 1. DIRECTORY MAPPING

### A. `packages/auth` (Core Package) ✅ PRIMARY
**Purpose**: Better Auth wrapper + API key management system
**Status**: Actively maintained, production-critical
**Language**: TypeScript + better-auth plugins

**Structure**:
```
packages/auth/
├── src/
│   ├── auth.ts                 ✅ Better Auth config (1,047 lines)
│   │   └── Exports: auth object, Session/ActiveOrganization types
│   ├── index.ts                ✅ API key + rate limiting (1,023 lines)
│   │   └── API key generation, validation, rate limiting, usage tracking
│   ├── lib/
│   │   ├── helper.ts           ✅ Organization helpers (26 lines)
│   │   │   └── isMemberOfOrganization, isOrganizationAdmin
│   │   └── organization.ts      ✅ Stripe seat sync (34 lines)
│   │       └── updateSeatsInOrganizationSubscription
│   └── plugins/
│       └── invitation-only/    ✅ Custom plugin (Better Auth extension)
├── __tests__/                  ✅ Comprehensive tests
│   ├── auth-flow.test.ts
│   ├── authentication-flow.test.ts
│   ├── scopes-implementation.test.ts
│   ├── security/
│   │   ├── api-keys.test.ts
│   │   ├── brute-force-protection.test.ts
│   │   └── token-validation.test.ts
│   ├── utils/
│   ├── fixtures/
│   └── simple-auth.test.ts
└── dist/
    └── client.d.ts             ⚠️ Built from better-auth (auto-generated)

**Key Exports**:
- auth: Better Auth instance
- Session, ActiveOrganization, OrganizationMemberRole: Types
- generateApiKey, hashApiKey, verifyApiKey, createApiKey, validateApiKey, revokeApiKey, listApiKeys
- getRateLimitByTier, trackUsage, getUsageStats, checkUsageLimits
- validateSubscription, checkFeatureAccess
- InMemoryRateLimiter, RedisRateLimiter
- requireApiKey: Express/Next.js middleware
- authClient: ✅ Generated from better-auth config
```

**Dependencies**:
- better-auth ^1.3.26
- bcrypt (API key hashing)
- @snapback/platform (database access)
- @snapback/integrations (email, Stripe)
- drizzle-orm (database queries)

**Issues**:
- ❌ `client.d.ts` is auto-generated, not type-safe wrapper
- ❌ authClient imported from dist, not source
- ✅ Type annotations use `any` (temporary, acknowledged in code)

---

### B. `packages/api/modules/auth` ⚠️ MINIMAL WRAPPER
**Purpose**: tRPC procedures for API layer
**Status**: Minimal implementation
**Language**: TypeScript

**Structure**:
```
packages/api/modules/auth/
├── router.ts                   ✅ (7 lines)
│   └── Exports: authRouter { verifyApiKey, trackApiUsage }
└── procedures/
    ├── verify-api-key.ts       ✅ Wrapper around @snapback/auth validation
    └── track-api-usage.ts      ✅ Wrapper around @snapback/auth tracking
```

**Key Role**: Exposes core auth functions as tRPC procedures

**Dependencies**:
- @snapback/auth (for validation logic)

**Issues**:
- ⚠️ Very thin wrapper - just delegates to @snapback/auth
- ⚠️ No added value vs direct imports
- ⚠️ Could be merged into @snapback/auth as `orpc/` procedures

---

### C. `apps/web/modules/saas/auth` ⚠️ CLIENT-SIDE WRAPPER
**Purpose**: React components + hooks for SaaS auth UI
**Status**: Actively used
**Language**: TypeScript + React

**Structure**:
```
apps/web/modules/saas/auth/
├── components/
│   ├── ForgotPasswordForm.tsx      ✅ Uses authClient
│   ├── LoginForm.tsx               ✅ Uses authClient
│   ├── LoginModeSwitch.tsx         ✅ UI toggle
│   ├── OtpForm.tsx                 ✅ Uses authClient
│   ├── ResetPasswordForm.tsx        ✅ Uses authClient
│   ├── SessionProvider.tsx          ✅ Context provider (React)
│   ├── SignupForm.tsx              ✅ Uses authClient
│   └── SocialSigninButton.tsx       ✅ Uses authClient
├── constants/
│   └── oauth-providers.tsx         ✅ Google, GitHub config
├── hooks/
│   ├── errors-messages.ts          ✅ Error translation
│   └── use-session.ts              ✅ Custom hook via context
├── lib/
│   ├── api.ts                      ✅ React Query hooks (useSessionQuery, etc.)
│   ├── server.ts                   ✅ Server-side helpers (getSession, etc.)
│   └── session-context.ts          ✅ React Context definition
└── (NO DIRECT TESTS)               ❌ MISSING
```

**Key Role**: React UI layer for authentication

**Dependencies**:
- @snapback/auth (server-only helpers: getSession, etc.)
- @snapback/auth/client (authClient)
- React Query (@tanstack/react-query)
- React Context API

**Issues**:
- ❌ No tests for components
- ⚠️ SessionProvider is app-wide, loaded in 3 layouts
- ⚠️ useSession hook couples consumers to this specific module
- ⚠️ lib/api.ts imports from config (creates coupling)

---

### D. `apps/web/app/auth` ✅ NEXT.JS ROUTES (NOT A MODULE)
**Purpose**: Next.js route handlers for auth pages
**Status**: Actively used
**Language**: TypeScript + React

**Structure**:
```
apps/web/app/auth/
├── layout.tsx                  ✅ Wraps SessionProvider
├── login/page.tsx              ✅ Uses LoginForm component
├── signup/page.tsx             ✅ Uses SignupForm component
├── forgot-password/page.tsx     ✅ Uses ForgotPasswordForm
├── reset-password/page.tsx      ✅ Uses ResetPasswordForm
└── verify/page.tsx             ✅ Email verification page
```

**Key Role**: URL routing for authentication pages

**Dependencies**:
- Components from `/modules/saas/auth`
- Next.js 14 App Router

**Issues**:
- ✅ Thin, well-designed routing layer
- ✅ Proper separation of concerns

---

### E. `packages/auth-mock` 📦 TEST UTILITY
**Purpose**: Mock authentication for testing
**Status**: Minimal
**Language**: TypeScript

**Structure**:
```
packages/auth-mock/
└── src/
    └── index.ts                ✅ Mock authenticate function
```

**Dependencies**:
- @snapback/auth (for types)

---

## 2. IMPORT PATTERNS (75 FILES TOTAL)

### Pattern Analysis

#### Pattern 1: Server-side session
```typescript
import { auth } from "@snapback/auth";
// Used in: middleware, API routes, server components
const session = await auth.api.getSession({ headers: ... });
```
**Count**: ~20 files
**Files**: API routes, middleware, server actions

#### Pattern 2: Client-side auth
```typescript
import { authClient } from "@snapback/auth/client";
// Used in: React components, client-side logic
await authClient.signIn.email({ email, password });
```
**Count**: ~35 files
**Files**: Form components, settings, organizations

#### Pattern 3: API key management
```typescript
import { validateApiKey, createApiKey } from "@snapback/auth";
// Used in: API middleware, user actions
const validation = await validateApiKey(key);
```
**Count**: ~8 files
**Files**: API routes, procedures

#### Pattern 4: Type imports
```typescript
import type { Session, ActiveOrganization, User } from "@snapback/auth";
// Used in: Type definitions, component props
```
**Count**: ~12 files
**Files**: Component prop types, server functions

#### Pattern 5: Organization helpers
```typescript
import { isOrganizationAdmin } from "@snapback/auth/lib/helper";
// Used in: Authorization checks
```
**Count**: ~3 files
**Files**: Settings pages, admin routes

---

## 3. COMPONENT & UTILITY CATALOG

### Authentication Components
| Component | Location | Type | Purpose | Tests |
|-----------|----------|------|---------|-------|
| LoginForm | saas/auth/components | React | Email/password login | ❌ |
| SignupForm | saas/auth/components | React | User registration | ❌ |
| ForgotPasswordForm | saas/auth/components | React | Password reset flow | ❌ |
| ResetPasswordForm | saas/auth/components | React | Password confirmation | ❌ |
| OtpForm | saas/auth/components | React | 2FA/OTP input | ❌ |
| SocialSigninButton | saas/auth/components | React | OAuth button | ❌ |
| SessionProvider | saas/auth/components | React | Context provider | ❌ |
| LoginModeSwitch | saas/auth/components | React | Mode toggle | ❌ |

### Hooks
| Hook | Location | Type | Purpose | Tests |
|------|----------|------|---------|-------|
| useSession | saas/auth/hooks | React | Get current session | ❌ |
| useSessionQuery | saas/auth/lib | React Query | Fetch session async | ❌ |
| useUserAccountsQuery | saas/auth/lib | React Query | Fetch connected accounts | ❌ |
| useUserPasskeysQuery | saas/auth/lib | React Query | Fetch passkeys | ❌ |

### Server Functions
| Function | Location | Type | Purpose | Tests |
|----------|----------|------|---------|-------|
| getSession | saas/auth/lib/server | Server | Cache-wrapped session getter | ✅ |
| getActiveOrganization | saas/auth/lib/server | Server | Get current org | ✅ |
| getOrganizationList | saas/auth/lib/server | Server | List user orgs | ✅ |
| getUserAccounts | saas/auth/lib/server | Server | List connected accounts | ✅ |
| getUserPasskeys | saas/auth/lib/server | Server | List passkeys | ✅ |
| getInvitation | saas/auth/lib/server | Server | Get invitation by ID | ✅ |

### API Key Utilities
| Function | Location | Type | Purpose | Tests |
|----------|----------|------|---------|-------|
| generateApiKey | @snapback/auth | Utility | Generate key | ✅ |
| hashApiKey | @snapback/auth | Utility | Hash with bcrypt | ✅ |
| verifyApiKey | @snapback/auth | Utility | Validate key | ✅ |
| createApiKey | @snapback/auth | Utility | Create + store | ✅ |
| validateApiKey | @snapback/auth | Utility | Validate + get user | ✅ |
| revokeApiKey | @snapback/auth | Utility | Revoke key | ✅ |
| listApiKeys | @snapback/auth | Utility | List all keys | ✅ |

### Rate Limiting
| Function | Location | Type | Purpose | Tests |
|----------|----------|------|---------|-------|
| InMemoryRateLimiter | @snapback/auth | Class | Dev rate limiter | ✅ |
| RedisRateLimiter | @snapback/auth | Class | Prod rate limiter | ✅ |
| getRateLimitByTier | @snapback/auth | Utility | Tier-based limits | ✅ |

### Middleware
| Function | Location | Type | Purpose | Tests |
|----------|----------|------|---------|-------|
| requireApiKey | @snapback/auth | Middleware | Express/Next.js middleware | ❌ |

### Organization Helpers
| Function | Location | Type | Purpose | Tests |
|----------|----------|------|---------|-------|
| isMemberOfOrganization | @snapback/auth/lib | Utility | Check org membership | ❌ |
| isOrganizationAdmin | @snapback/auth/lib | Utility | Check admin role | ❌ |
| updateSeatsInOrganizationSubscription | @snapback/auth/lib | Async | Sync Stripe seats | ❌ |

---

## 4. DEPENDENCY ANALYSIS

### What Depends on `@snapback/auth`

**Direct Imports** (75 files total):
- `apps/web/`: 50 files
  - Components (auth, settings, organizations): 30
  - API routes: 12
  - Hooks/utilities: 5
  - Tests: 3
- `packages/api/`: 15 files
  - Procedures: 3
  - Middleware: 3
  - Routes: 8
  - Tests: 1
- `apps/mcp-server/`: 1 file (mock auth)
- Tooling/scripts: 1 file

**Type Dependencies**:
- Session, ActiveOrganization, OrganizationMemberRole imported in ~12 files
- User type imported in ~2 files

### What `@snapback/auth` Depends On

**Internal**:
- @snapback/platform (database: db, user, apiKeys, apiUsage, subscriptions)
- @snapback/infrastructure (logger)
- @snapback/integrations (email, Stripe)
- @snapback/config (environment)

**External**:
- better-auth ^1.3.26 (core auth engine)
- bcrypt (key hashing)
- drizzle-orm (database queries)
- cookie (parsing)

### Cross-Module Dependencies

**Web App Internal**:
- `/modules/saas/auth` imports from `/modules/saas/auth` ✅ (internal)
- `/modules/saas/auth` imports from `@snapback/auth` ✅ (package)
- `/app/auth` imports from `/modules/saas/auth` ✅ (pattern OK)
- `/app/api` imports from `@snapback/auth` ✅ (direct, OK)

---

## 5. CONSOLIDATION BLOCKERS

### A. Server vs Client Code
**Blocker**: Some files are `"use server"` (Next.js server components)

**Examples**:
- `saas/auth/lib/server.ts` imports `@snapback/auth` (uses Better Auth server API)
- Cannot be bundled with client code
- Uses Next.js `cache()` and `headers()` (server-only APIs)

**Impact**:
- ✅ Can consolidate with other server functions
- ❌ Cannot mix with client hooks/components in same file

### B. Next.js Specific Wrappers
**Blocker**: Next.js-specific imports like `cache()`, `headers()`

**Examples**:
```typescript
import { cache } from "react";
import { headers } from "next/headers";

export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
});
```

**Impact**:
- ✅ Can move to `saas/auth/lib/server.ts` consolidation
- ❌ Cannot use in non-Next.js contexts (CLI, MCP server)
- ⚠️ Tight coupling to Next.js App Router

### C. React Context & Hooks
**Blocker**: React-only components

**Examples**:
- SessionProvider.tsx uses createContext, useContext
- useSession hook relies on SessionProvider context
- Must stay in React layer, cannot merge with server code

**Impact**:
- ✅ Can consolidate with other React components
- ❌ Cannot directly call from server components without wrapper
- ⚠️ Requires context at layout level

### D. Environment-Specific Logic
**Blocker**: Some logic differs by environment

**Examples**:
```typescript
// In auth.ts
const isDevelopment = env.NODE_ENV !== "production";
const trustedOrigins = isDevelopment ? [...localhost urls...] : [appUrl];
```

**Impact**:
- ✅ Can keep as is with env checks
- ❌ Cannot compile down to single JS file for all environments

### E. Form/UI Implementation Details
**Blocker**: Component implementation is Next.js + shadcn/ui specific

**Examples**:
- LoginForm uses React Hook Form + shadcn/ui Button/Input
- Cannot generalize without losing styling
- Could extract logic to custom hooks

**Impact**:
- ✅ Can extract form logic to custom hooks
- ✅ Can share useFormState, error handling
- ❌ UI framework coupling (shadcn/ui is specific choice)

---

## 6. CURRENT STATE ISSUES

### Critical Issues 🔴

1. **authClient sourced from dist/**
   - Imports: `import { authClient } from "@snapback/auth/client"`
   - Problem: `client.d.ts` is auto-generated from better-auth
   - Risk: Not type-safe wrapper, could break on better-auth upgrades
   - Files affected: ~35 (all React components)

2. **Type annotation gaps**
   - Session, ActiveOrganization use `any` types
   - Acknowledged in code as temporary
   - Example: `export type Session = any;`
   - Files affected: session-context.ts, type imports

3. **Duplicate session fetching**
   - Multiple files call `auth.api.getSession()` independently
   - No consistent caching mechanism across app
   - Potential performance issue
   - Example: saas/auth/lib/api.ts vs lib/server.ts

### Major Issues 🟠

1. **Missing test coverage for UI components**
   - All components in saas/auth/components have ❌ tests
   - Better Auth changes could break components silently
   - Files affected: 8 components, 4 hooks, 1 middleware

2. **Thin wrapper layers adding complexity**
   - packages/api/modules/auth just delegates to @snapback/auth
   - No added logic, just procedure wrappers
   - Creates extra import path confusion
   - Files affected: verify-api-key, track-api-usage procedures

3. **Organization helpers scattered**
   - isOrganizationAdmin in lib/helper.ts
   - Used in ~3 files with imports from deep path
   - Could be more discoverable
   - Files affected: settings pages, admin pages

4. **Client library not properly exported**
   - authClient is from better-auth, not @snapback/auth wrapper
   - No documentation on what methods are available
   - Type hints incomplete (any types)

### Minor Issues 🟡

1. **Session context pattern inconsistency**
   - SessionProvider wraps entire app in 3 layouts
   - Alternative useSession hook couples to context
   - Could use more flexible composition

2. **Error message extraction**
   - Error handling in hooks/errors-messages.ts
   - Could be standardized across auth
   - No global error boundary

3. **Configuration in multiple places**
   - oauth-providers.tsx in constants
   - Email templates in auth.ts
   - Could be more centralized

---

## 7. MIGRATION ROADMAP

### Target State Design

**Single Source of Truth (SSoT) Pattern**:
```
packages/auth/
├── core/
│   ├── better-auth-config.ts        (Better Auth instance)
│   ├── api-keys.ts                  (API key logic)
│   ├── rate-limiting.ts             (Rate limits)
│   └── organization.ts              (Org helpers)
├── server/
│   ├── session.ts                   (Server session fetching)
│   ├── organization.ts              (Server org queries)
│   └── middleware.ts                (API middleware)
├── client/
│   ├── index.ts                     (Re-export authClient)
│   ├── hooks.ts                     (useSession hook)
│   └── provider.tsx                 (SessionProvider)
├── types/
│   └── index.ts                     (Consolidated types)
└── errors/
    └── index.ts                     (Error messages & codes)

apps/web/
├── app/auth/
│   ├── login/page.tsx               (Thin routing)
│   ├── signup/page.tsx
│   └── ... (other pages)
└── modules/saas/
    └── forms/                       (UI components only)
        ├── LoginForm.tsx
        ├── SignupForm.tsx
        └── ... (other forms)
```

### Phase 1: Foundation (4 hours)
**Goal**: Establish proper TypeScript types & exports

#### 1.1 Create type definitions module (2 hours)
- File: `packages/auth/src/types.ts` (NEW)
- Move Session, ActiveOrganization from auth.ts
- Replace `any` types with proper definitions
- Export all auth types from single location

**Effort**: 2 hours
**Risk**: Medium (type changes could affect consumers)
**PR Size**: Medium (add new file, update 15 imports)

#### 1.2 Create client wrapper (2 hours)
- File: `packages/auth/src/client.ts` (NEW)
- Re-export authClient from better-auth
- Add type definitions for all methods
- Document available methods

**Effort**: 2 hours
**Risk**: Low (wrapper, no behavior change)
**PR Size**: Small (add new file, change 1 export)

**Dependencies**: 1.1

**Validation**: 
```bash
pnpm test -F @snapback/auth
grep "authClient" packages/auth/src/client.ts
```

---

### Phase 2: Consolidate Server Code (3 hours)
**Goal**: Single location for all server auth functions

#### 2.1 Consolidate server functions (2 hours)
- File: `packages/auth/src/server.ts` (NEW)
- Move from saas/auth/lib/server.ts
- Move from saas/auth/lib/session-context.ts
- Keep React Context separate (Next.js app only)

**Effort**: 2 hours
**Risk**: High (many consumers, server-only APIs)
**PR Size**: Medium (add file, update 10 imports)

**Changes**:
- getSession (keep cache wrapper in Next.js)
- getActiveOrganization
- getOrganizationList
- getUserAccounts
- getUserPasskeys
- getInvitation

**Migration Path**:
```typescript
// Before
import { getSession } from "@saas/auth/lib/server";

// After
import { getSession } from "@snapback/auth/server";
```

**Validation**:
```bash
pnpm build -F @snapback/auth
grep "import.*getSession" apps/web -r | wc -l  # Should decrease
```

#### 2.2 Update web app imports (1 hour)
- Update all 12 API routes using auth
- Update all middleware files
- Update all server components importing auth functions

**Effort**: 1 hour
**Risk**: Medium (widespread changes)
**PR Size**: Large (touch 12 files)

**Dependencies**: 2.1

---

### Phase 3: Consolidate Client Code (4 hours)
**Goal**: Single location for React components & hooks

#### 3.1 Consolidate React components (3 hours)
- Move from saas/auth/components → packages/auth/src/react/components/
- LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm
- OtpForm, SocialSigninButton, SessionProvider, LoginModeSwitch

**Effort**: 3 hours
**Risk**: Low (self-contained components)
**PR Size**: Medium (move 8 files, delete from saas)

**Structure**:
```
packages/auth/src/react/
├── components/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── ... (other forms)
├── hooks/
│   ├── useSession.ts
│   ├── useSessionQuery.ts
│   └── ... (other hooks)
├── provider.tsx         (SessionProvider)
└── context.ts           (SessionContext)
```

**Breaking Changes**:
```typescript
// Before
import { LoginForm } from "@saas/auth/components";
import { useSession } from "@saas/auth/hooks";

// After
import { LoginForm } from "@snapback/auth/react/components";
import { useSession } from "@snapback/auth/react/hooks";
```

**Validation**:
```bash
pnpm build -F @snapback/auth
grep "@saas/auth/components" apps/web -r  # Should be 0
```

#### 3.2 Consolidate hooks & context (1 hour)
- Move React Query hooks from saas/auth/lib/api.ts
- Keep with React components
- Add proper tests for hooks

**Effort**: 1 hour
**Risk**: Medium (hook dependencies)
**PR Size**: Small (move code, delete api.ts)

**Dependencies**: 3.1

---

### Phase 4: Consolidate API Layer (2 hours)
**Goal**: Reduce wrapper layers

#### 4.1 Merge API procedures (1 hour)
- Move packages/api/modules/auth/ procedures into @snapback/auth
- Create packages/auth/src/orpc/procedures.ts
- Export from root

**Effort**: 1 hour
**Risk**: Low (thin wrappers)
**PR Size**: Small (consolidate 3 files)

**Changes**:
```typescript
// packages/auth/src/orpc/procedures.ts (NEW)
import { publicProcedure } from "@snapback/api/procedures";
import { validateApiKey, trackUsage } from "../index.js";

export const verifyApiKeyProcedure = publicProcedure...
export const trackApiUsageProcedure = publicProcedure...
```

**Validation**:
```bash
grep "packages/api/modules/auth" pnpm-lock.yaml | wc -l  # Should be 0
```

#### 4.2 Update API router (1 hour)
- Update packages/api/orpc/router.ts
- Point to new @snapback/auth/orpc location
- Delete packages/api/modules/auth/

**Effort**: 1 hour
**Risk**: Low (just import path change)
**PR Size**: Small (1 file change, delete directory)

**Dependencies**: 4.1

---

### Phase 5: Add Test Coverage (3 hours)
**Goal**: Ensure auth components tested

#### 5.1 Add component tests (2 hours)
- Create packages/auth/__tests__/react/components/
- Test: LoginForm, SignupForm, ForgotPasswordForm, etc.
- Use Vitest + React Testing Library

**Effort**: 2 hours
**Risk**: Low (new tests, no behavior change)
**PR Size**: Small (add test directory)

**Coverage Target**: >80% for component logic

#### 5.2 Add integration tests (1 hour)
- Test SessionProvider + useSession integration
- Test form submission flows with mock authClient
- Test error handling

**Effort**: 1 hour
**Risk**: Low (test improvements)
**PR Size**: Small (add tests)

**Dependencies**: None (can run in parallel)

---

### Phase 6: Documentation (2 hours)
**Goal**: Document new auth module structure

#### 6.1 Create auth package CLAUDE.md (1 hour)
- Document module structure
- Document all exports
- Document import patterns
- Provide migration guide

**Effort**: 1 hour
**Risk**: None
**PR Size**: Small (add 1 file)

#### 6.2 Update web app CLAUDE.md (1 hour)
- Update authentication section
- Link to new auth module docs
- Remove references to old structure

**Effort**: 1 hour
**Risk**: None
**PR Size**: Small (update 1 file)

---

## 8. MIGRATION STEPS (ORDERED BY DEPENDENCY)

### Critical Path

```
Phase 1 (Foundation) ──┐
                       ├─→ Phase 2 (Server) ──┐
                                              ├─→ Phase 3 (Client) ──┐
                                                                      ├─→ Phase 4 (API)
                                                                      │
                       Phase 5 (Tests) ──────────────────────────────┘
                                              ├─→ Phase 6 (Docs)
```

### Sequential Execution Plan

| Phase | Hours | Risk | Complexity | Dependencies |
|-------|-------|------|-----------|--------------|
| 1: Foundation | 4 | Medium | Medium | None |
| 2: Server Code | 3 | High | Medium | Phase 1 |
| 3: Client Code | 4 | Low | Medium | Phase 1 |
| 4: API Layer | 2 | Low | Low | Phase 1, 3 |
| 5: Tests | 3 | Low | Medium | Phase 3, 4 |
| 6: Documentation | 2 | None | Low | All Phases |
| **TOTAL** | **18 hours** | | | |

### Parallel Opportunities

- Phase 5 (Tests) can start after Phase 3 completes (don't need Phase 4)
- Phase 6 (Documentation) can start after Phase 4 completes

**Optimized Timeline**: 18 hours → 14 hours with parallelization

---

## 9. RISK ASSESSMENT

### High Risk Changes 🔴

**2.1 - Consolidate Server Functions** (HIGH)
- **Risk**: 10 files import from saas/auth/lib
- **Impact**: If fails, breaks server-side auth
- **Mitigation**: 
  - Comprehensive tests for each function
  - Gradual import migration (dual imports for 1 cycle)
  - Extensive testing in staging

**3.1 - Consolidate Components** (HIGH)
- **Risk**: UI components widely used (30+ files)
- **Impact**: If breaks, UI won't render auth forms
- **Mitigation**:
  - Add tests before migration
  - Use import aliases during transition
  - Tag PR as "breaking change"

### Medium Risk Changes 🟠

**1.1 - Type Definitions** (MEDIUM)
- **Risk**: Type changes could break consumers
- **Impact**: TypeScript compilation errors in 15 files
- **Mitigation**:
  - Start with interfaces, not implementations
  - Run full type check after each change
  - Be backward compatible initially

**1.2 - Client Wrapper** (MEDIUM)
- **Risk**: Better Auth updates could invalidate wrapper
- **Impact**: authClient methods might change
- **Mitigation**:
  - Document better-auth version requirement
  - Pin better-auth version during rollout
  - Add integration tests

### Low Risk Changes 🟢

**4.1 - Merge API Procedures** (LOW)
- **Risk**: Just moving code
- **Impact**: Import paths change (easily fixable)
- **Mitigation**: Simple find/replace

**4.2 - Update Router** (LOW)
- **Risk**: Just import path
- **Impact**: Build fails if wrong
- **Mitigation**: Build test after change

**5.x - Tests** (LOW)
- **Risk**: Adding new tests
- **Impact**: None if already passing
- **Mitigation**: Simple additions

**6.x - Documentation** (NONE)
- **Risk**: None
- **Impact**: Developer clarity only
- **Mitigation**: Peer review

---

## 10. WHAT COULD BREAK

### Breaking Changes to Consumers

#### If Phase 1 not done first:
- Types still use `any`
- authClient import might fail
- Consumer code gets bad type hints

#### If Phase 2 skipped:
- Duplicate server functions
- Inconsistent session caching
- Performance issues remain

#### If Phase 3 not done properly:
- Components stop working
- SessionProvider missing from layout
- Context errors at runtime

#### If Phase 4 incomplete:
- API procedures have inconsistent imports
- Hard to find auth functions
- Maintenance burden remains

#### If Phase 5 skipped:
- Component changes go untested
- Better Auth upgrades break silently
- No regression detection

### Mitigation Strategy

1. **Run full test suite after each phase**
   ```bash
   pnpm test  # All tests
   pnpm build  # All builds
   pnpm type-check  # Type validation
   ```

2. **Use feature flags for gradual rollout**
   - Keep old imports working during transition
   - Gradual migration of consumers

3. **Staged deployment**
   - Merge to feature branch first
   - Run in staging environment
   - Monitor for issues

4. **Rollback plan**
   - Git revert prepared
   - Database migrations reversible
   - Keep old code around temporarily

---

## 11. EFFORT ESTIMATES (DETAILED)

### Per-File Breakdown

**Phase 1.1 - Create types.ts**
- Create file: 30 min
- Extract types: 30 min
- Update imports in auth.ts: 30 min
- Test: 30 min
- **Total**: 2 hours

**Phase 1.2 - Create client.ts**
- Create file: 15 min
- Add authClient re-export: 15 min
- Add type definitions: 30 min
- Test: 30 min
- Document: 30 min
- **Total**: 2 hours

**Phase 2.1 - Consolidate server functions**
- Create server.ts: 30 min
- Move getSession: 15 min
- Move getActiveOrganization: 15 min
- Move getOrganizationList: 15 min
- Move getUserAccounts: 15 min
- Move getUserPasskeys: 15 min
- Move getInvitation: 10 min
- Adapt for Next.js cache/headers: 30 min
- Test: 45 min
- **Total**: 3 hours (split 2 hours code, 1 hour test)

**Phase 2.2 - Update web app imports**
- Find all usages: 15 min
- Update 12 API routes: 20 min
- Update middleware: 10 min
- Update server components: 15 min
- Verify builds: 20 min
- **Total**: 1 hour

**Phase 3.1 - Consolidate components**
- Create react/components dir: 10 min
- Move 8 components: 30 min (5 min each)
- Update internal imports: 30 min
- Update constants/oauth: 10 min
- Adjust for monorepo paths: 20 min
- Test: 60 min
- Update documentation: 20 min
- **Total**: 3 hours

**Phase 3.2 - Consolidate hooks**
- Move useSession: 15 min
- Move React Query hooks: 15 min
- Update context: 15 min
- Update imports in components: 10 min
- Test: 15 min
- **Total**: 1 hour

**Phase 4.1 - Merge API procedures**
- Create orpc/procedures.ts: 15 min
- Move verifyApiKey procedure: 10 min
- Move trackApiUsage procedure: 10 min
- Update exports: 10 min
- Test: 15 min
- **Total**: 1 hour

**Phase 4.2 - Update API router**
- Update orpc/router.ts: 10 min
- Update package references: 10 min
- Delete old directory: 5 min
- Test: 15 min
- **Total**: 40 minutes (round to 1 hour with buffer)

**Phase 5.1 - Component tests**
- Test setup: 30 min
- LoginForm test: 30 min
- SignupForm test: 30 min
- Other component tests: 30 min
- **Total**: 2 hours

**Phase 5.2 - Integration tests**
- SessionProvider integration test: 20 min
- useSession hook test: 20 min
- Form submission flow: 20 min
- **Total**: 1 hour

**Phase 6.1 - Auth CLAUDE.md**
- Research & structure: 20 min
- Write documentation: 40 min
- **Total**: 1 hour

**Phase 6.2 - Update web CLAUDE.md**
- Update auth section: 30 min
- Link to new docs: 15 min
- **Total**: 45 minutes (round to 1 hour with buffer)

---

### Summary by Phase

| Phase | Component | Hours | Reality Check |
|-------|-----------|-------|----------------|
| 1 | types.ts + client.ts | 4 | Small but important |
| 2 | Server consolidation + imports | 4 | High touch count |
| 3 | Component consolidation + hooks | 4 | Many files to move |
| 4 | API layer | 2 | Thin wrapper |
| 5 | Tests | 3 | Comprehensive coverage |
| 6 | Documentation | 2 | Clear and concise |
| | TOTAL | 18 | Reasonable for refactor |

**Reality Adjustment**: +20% for unknowns = **~22 hours**

---

## 12. ALTERNATIVE APPROACHES

### Option A: No Consolidation (Status Quo)
**Pros**:
- Zero effort
- No risk of breaking changes

**Cons**:
- 75 import patterns to maintain
- Duplicate code in UI + server layers
- Type safety issues remain (any types)
- Harder to update auth globally
- Poor discoverability

**Recommended**: ❌ Not sustainable long-term

---

### Option B: Consolidate Only Package (Phases 1-2, skip 3-4)
**Pros**:
- 8 hours of work
- Reduces import confusion for server code
- Fixes type safety
- Easier to maintain API keys

**Cons**:
- UI components remain scattered
- Still 30+ component imports to maintain
- SessionProvider location still confusing
- API layer still has thin wrappers

**Recommended**: ⚠️ Partial improvement, not ideal

---

### Option C: Full Consolidation (Phases 1-6) - RECOMMENDED
**Pros**:
- Single source of truth for auth
- Clear import paths
- Type safety fixes
- Test coverage
- Documented
- Easier to maintain long-term
- Easier to upgrade better-auth
- Reduced cognitive load on developers

**Cons**:
- 22 hours of work
- Medium-high risk
- Requires careful execution
- Need feature branch testing

**Recommended**: ✅ Best long-term approach

---

### Option D: Publish @snapback/auth as Public Package
**Effort**: Would add 5-10 hours (beyond consolidation)
**Scope**: Out of scope for this audit

---

## 13. IMPLEMENTATION CHECKLIST

### Pre-Migration
- [ ] Branch created: `refactor/auth-consolidation`
- [ ] Staging environment ready
- [ ] Full test suite passing on main
- [ ] Team aligned on approach
- [ ] Documentation for rollback prepared

### Phase 1 (Types & Client)
- [ ] types.ts created and tested
- [ ] client.ts created and re-exports authClient
- [ ] All imports from @snapback/auth in sync
- [ ] TypeScript build passes
- [ ] Component type hints work correctly

### Phase 2 (Server Functions)
- [ ] server.ts created with all server functions
- [ ] 12 API routes updated
- [ ] Middleware updated
- [ ] Server components updated
- [ ] Cache and headers working correctly
- [ ] Full test pass
- [ ] Staging environment test complete

### Phase 3 (Components & Hooks)
- [ ] React components moved to packages/auth/src/react/
- [ ] All hooks consolidated
- [ ] SessionProvider accessible
- [ ] All 30+ consumers updated to new imports
- [ ] Component tests added
- [ ] Integration tests added
- [ ] Build passes
- [ ] UI tests in staging

### Phase 4 (API Layer)
- [ ] API procedures moved to @snapback/auth/orpc
- [ ] API router updated
- [ ] Old modules/auth directory deleted
- [ ] All API routes working
- [ ] API tests pass

### Phase 5 (Test Coverage)
- [ ] Component test suite complete (>80% coverage)
- [ ] Integration tests added
- [ ] All auth-related tests green
- [ ] GitHub Actions passing

### Phase 6 (Documentation)
- [ ] CLAUDE.md for @snapback/auth created
- [ ] Web app CLAUDE.md updated
- [ ] README examples updated
- [ ] PR description explains changes

### Post-Migration
- [ ] Merge to main
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Gather team feedback
- [ ] Document lessons learned

---

## 14. RECOMMENDATIONS

### Immediate Actions (Next Sprint)
1. **Create types.ts** (Phase 1.1) - 2 hours
   - Establishes foundation
   - Low risk
   - Improves DX immediately

2. **Create client.ts** (Phase 1.2) - 2 hours
   - Completes foundation
   - Enables next phases
   - Low risk

3. **Add component tests** (Phase 5.1) - 2 hours
   - While code is fresh
   - Reduces risk of later phases
   - Catches regressions early

### Medium-Term (Sprint +2)
4. **Consolidate server functions** (Phase 2) - 3 hours
   - Build on Phase 1
   - Medium risk but well-contained
   - Reduces duplicate session fetching

5. **Update imports** (Phase 2.2) - 1 hour
   - Mechanical change
   - Must follow Phase 2.1

### Long-Term (Sprint +3)
6. **Consolidate components** (Phase 3) - 4 hours
   - After server consolidation stable
   - More confident in patterns
   - Largest consumer impact

7. **Consolidate API layer** (Phase 4) - 2 hours
   - Clean up thin wrappers
   - Simplify import paths

8. **Complete documentation** (Phase 6) - 2 hours
   - Document new patterns
   - Help other developers

---

## 15. FINAL SUMMARY

### Current State
- ✅ 75 files importing from @snapback/auth
- ❌ 4 separate auth-related locations
- ⚠️ Type safety issues (any types)
- ⚠️ authClient imported from dist (not wrapped)
- ❌ Missing component test coverage
- ❌ Duplicate server functions
- ⚠️ Thin API wrapper layers

### Target State (Post-Consolidation)
- ✅ Single @snapback/auth package as source of truth
- ✅ Clear server/ (server-only) and react/ (client/React) sub-modules
- ✅ Proper TypeScript types throughout
- ✅ Wrapped authClient with type hints
- ✅ >80% test coverage on auth components
- ✅ No duplicate auth logic
- ✅ Clean, thin API layers

### Effort
- **Total**: 22 hours (18 hours base + 20% buffer)
- **Critical Path**: 14 hours (with parallelization)
- **Risk Level**: Medium-High (due to widespread impact)
- **Timeline**: 3-4 sprints to implement fully

### ROI
- **Reduced bugs**: Better type safety
- **Easier upgrades**: Centralized better-auth config
- **Developer happiness**: Clear patterns, better discoverability
- **Maintenance**: Single location to update auth logic
- **Onboarding**: New developers understand auth immediately

---

## APPENDIX A: Import Pattern Reference

### Server-Side Session (20 files)
```typescript
import { auth } from "@snapback/auth";
const session = await auth.api.getSession({ headers: ... });
```

### Client-Side Auth (35 files)
```typescript
import { authClient } from "@snapback/auth/client";
await authClient.signIn.email({ email, password });
```

### API Key Management (8 files)
```typescript
import { validateApiKey, createApiKey } from "@snapback/auth";
const result = await validateApiKey(apiKey);
```

### Type Imports (12 files)
```typescript
import type { Session, ActiveOrganization } from "@snapback/auth";
```

### Organization Helpers (3 files)
```typescript
import { isOrganizationAdmin } from "@snapback/auth/lib/helper";
```

---

## APPENDIX B: File Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│                   @snapback/auth                     │
│  (auth.ts + index.ts + lib/ + plugins/)              │
│  ├─ auth config (better-auth)                        │
│  ├─ API keys (generation, validation)                │
│  ├─ Rate limiting                                     │
│  └─ Organization helpers                             │
└────────────────────────────────────────────────────┬─┘
                                                      │
                    ┌─────────────────────────────────┴──────────────┐
                    │                                                 │
        ┌───────────▼──────────────┐         ┌───────────────────────▼──────┐
        │  packages/api/modules/   │         │   apps/web/modules/saas/    │
        │  auth/                   │         │   auth/                      │
        │  └─ procedures (wrapper)  │         │   ├─ components/ (UI)        │
        │                           │         │   ├─ hooks/ (React)          │
        │                           │         │   ├─ lib/ (Server+Client)    │
        └───────────┬──────────────┘         │   └─ constants/              │
                    │                        └───────────┬──────────────────┘
                    │                                    │
        ┌───────────▼──────────────┐         ┌───────────▼──────────────┐
        │  packages/api/orpc/      │         │   apps/web/app/auth/    │
        │  router.ts               │         │   └─ routes (pages)      │
        │  (routes auth procedures)│         │                          │
        └──────────────────────────┘         └──────────────────────────┘
                    │                                    │
        ┌───────────▼──────────────┐         ┌───────────▼──────────────┐
        │  API consumers           │         │  auth page consumers     │
        │  (15 routes)             │         │  (50 components)         │
        └──────────────────────────┘         └──────────────────────────┘
```

---

## APPENDIX C: Test Coverage Status

| Category | Component/Function | Type | Current | Target | Priority |
|----------|-------------------|------|---------|--------|----------|
| Components | LoginForm | Unit | ❌ | ✅ | High |
| | SignupForm | Unit | ❌ | ✅ | High |
| | ForgotPasswordForm | Unit | ❌ | ✅ | High |
| | ResetPasswordForm | Unit | ❌ | ✅ | High |
| | OtpForm | Unit | ❌ | ✅ | Medium |
| | SocialSigninButton | Unit | ❌ | ✅ | Low |
| | SessionProvider | Unit | ❌ | ✅ | High |
| | LoginModeSwitch | Unit | ❌ | ✅ | Low |
| Hooks | useSession | Unit | ❌ | ✅ | High |
| | useSessionQuery | Unit | ❌ | ✅ | Medium |
| | useUserAccountsQuery | Unit | ❌ | ✅ | Medium |
| | useUserPasskeysQuery | Unit | ❌ | ✅ | Medium |
| Integration | SessionProvider + useSession | Integration | ❌ | ✅ | High |
| | Form submissions | Integration | ❌ | ✅ | High |
| | Auth flows | E2E | ❌ | ✅ | Medium |
| Core | API keys | Unit | ✅ | ✅ | - |
| | Rate limiting | Unit | ✅ | ✅ | - |
| | Session handling | Unit | ✅ | ✅ | - |

**Overall Coverage**: ~65% → Target: >85%

