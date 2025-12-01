# Web App Architecture Analysis Report
## apps/web - SnapBack Next.js Application

**Report Date**: November 7, 2025  
**Directory**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/web`  
**Status**: ⚠️ Multiple TypeScript errors and missing imports detected

---

## 1. APP STRUCTURE & ROUTING

### Directory Layout
```
apps/web/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Public marketing pages
│   │   ├── (home)/               # Landing page
│   │   ├── about/
│   │   ├── blog/
│   │   ├── changelog/
│   │   ├── contact/
│   │   ├── features/
│   │   ├── hats-demo/           # Interactive demo
│   │   ├── pricing/
│   │   ├── snapback-demo/       # VS Code extension demo
│   │   ├── waitlist/
│   │   ├── test-route/          # Test route
│   │   └── test/                # Test route
│   ├── (saas)/                   # Authenticated routes
│   │   ├── app/                 # Dashboard
│   │   ├── layout.tsx           # SaaS auth layout
│   │   ├── choose-plan/
│   │   ├── new-organization/
│   │   ├── onboarding/
│   │   └── organization-invitation/[invitationId]/
│   ├── auth/                     # Auth routes
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify/
│   ├── (docs)/docs/             # Documentation site (Nextra)
│   ├── api/                      # API Routes
│   │   ├── checkout/
│   │   ├── health/
│   │   ├── keys/
│   │   ├── test-sentry/
│   │   ├── waitlist/
│   │   ├── v1/                  # v1 API
│   │   │   ├── checkpoint/
│   │   │   ├── snapshots/
│   │   │   ├── checkpoints/
│   │   │   ├── user/
│   │   │   ├── device-fingerprint/
│   │   │   ├── trial-key/
│   │   │   ├── telemetry/
│   │   │   ├── billing/
│   │   │   ├── analytics/
│   │   │   └── rollbacks/      ⚠️ ERROR: params type mismatch
│   │   ├── [[...rest]]/        # Catch-all for ORPC
│   │   └── webhooks/
│   ├── layout.tsx               # Root layout
│   ├── globals.css
│   └── middleware.ts (middleware routing)
├── components/                   # React components
│   ├── layout/
│   ├── hats-demo/
│   └── ...
├── modules/                      # Feature modules
│   ├── ui/                       # Design system (shadcn/ui)
│   ├── shared/                   # Shared utilities
│   ├── marketing/                # Marketing page logic
│   ├── saas/                     # SaaS app logic
│   └── analytics/                # Analytics tracking
├── lib/                          # Utilities & helpers
│   ├── api-client.ts
│   ├── error-handler.ts
│   ├── resource.ts
│   ├── use-resource-query.ts
│   ├── dashboard/
│   ├── hats-demo/
│   ├── middleware/
│   └── supabase/
├── hooks/                        # React hooks
├── services/                     # Service layer
├── middleware/                   # Middleware handlers
├── emails/                       # React Email templates
│   └── waitlist-confirmation.tsx
├── __tests__/                    # Test files
├── public/                       # Static assets
├── docs/                         # Documentation
├── scripts/                      # Build/utility scripts
├── final_launch_polish/          # Launch tasks
└── tests/                        # E2E and integration tests
```

### Page Routes Summary

**Marketing Routes (Public)**:
- `/` - Landing page (hero, features, pricing)
- `/about` - About page
- `/blog` - Blog listing
- `/changelog` - Changelog
- `/contact` - Contact form
- `/features` - Feature showcase
- `/pricing` - Pricing tiers
- `/hats-demo` - Protection level demo
- `/snapback-demo` - VS Code extension demo
- `/waitlist` - Waitlist signup

**Auth Routes**:
- `/auth/login` - Email/password login
- `/auth/signup` - User registration
- `/auth/forgot-password` - Password reset request
- `/auth/reset-password` - Password reset form
- `/auth/verify` - Email verification

**SaaS Routes (Protected)** - require authentication:
- `/app` - Main dashboard
- `/app/settings/*` - Account settings
- `/app/admin/*` - Admin panel (role-gated)
- `/app/api-keys` - API key management
- `/choose-plan` - Plan selection
- `/new-organization` - Organization creation
- `/onboarding` - User onboarding
- `/organization-invitation/[invitationId]` - Org invite

**Docs Routes**:
- `/docs/*` - Documentation (Nextra-powered)

**API Routes** (Backend):
- `/api/health` - Health check endpoint
- `/api/waitlist` - Waitlist signup
- `/api/keys` - API key management
- `/api/checkout` - Stripe checkout
- `/api/test-sentry` - Sentry testing
- `/api/v1/*` - v1 API endpoints
- `/api/webhooks/*` - Webhook handlers (Stripe, etc.)
- `/api/[[...rest]]` - ORPC catch-all

---

## 2. DEPENDENCIES & VERSIONS

### Package.json Analysis

**Key Frameworks**:
```json
"next": "catalog:",              // Latest via catalog
"react": "catalog:",              // React 18
"typescript": "catalog:",          // TS 5.x
```

**Core UI & Components**:
- `@radix-ui/*` - Headless UI components (accordion, dialog, dropdown, tabs, etc.)
- `lucide-react` - Icon library
- `tailwindcss` - Utility-first CSS
- `framer-motion` - Animation library
- `geist` - Next.js font
- `next-themes` - Dark mode support

**Form & Validation**:
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Validation resolvers
- `zod` - Runtime type validation

**State Management & Data Fetching**:
- `@tanstack/react-query` - Data fetching/caching (with devtools)
- `@tanstack/react-table` - Table component
- `@ai-sdk/react` - Vercel AI SDK
- `ai` - AI SDK

**APIs & Communication**:
- `@trpc/client` - TypeScript RPC client
- `@trpc/next` - Next.js integration
- `@trpc/react-query` - React Query adapter
- `@orpc/client` - oRPC client
- `@orpc/tanstack-query` - React Query integration
- `hono` - Lightweight HTTP framework

**Database & Storage**:
- `@aws-sdk/client-s3` - AWS S3 client
- `dexie` - IndexedDB wrapper (local cache)

**Content & Documentation**:
- `nextra` - Documentation site builder
- `nextra-theme-docs` - Docs theme
- `gray-matter` - Front matter parser
- `@codesandbox/sandpack-react` - Code playground

**Payments & Integrations**:
- `@hubspot/api-client` - HubSpot CRM
- `resend` - Email service
- `@react-email/components` - Email templates

**Monitoring & Analytics**:
- `@sentry/nextjs` - Error tracking
- `@vercel/speed-insights` - Performance monitoring

**Code Editors**:
- `@monaco-editor/react` - Monaco editor component
- `react-cropper` - Image cropping

**Other Utilities**:
- `date-fns` - Date utilities
- `clsx` - Class concatenation
- `class-variance-authority` - CSS variants
- `nanoid` - ID generation
- `nuqs` - URL search params
- `sonner` - Toast notifications
- `react-resizable-panels` - Draggable panels
- `recharts` - Charts library
- `boring-avatars` - Avatar placeholder
- `lenis` - Smooth scrolling
- `nprogress` - Progress bar
- `es-toolkit` - Utility functions

**Development**:
- `@biomejs/biome` - Linter & formatter
- `vitest` - Unit test framework
- `jsdom` - DOM environment for tests
- `playwright` - E2E testing

---

## 3. CONFIGURATION FILES

### TypeScript Configuration (`tsconfig.json`)

✅ **Good**:
- Extends `../../tsconfig.base.json` (monorepo shared config)
- Strict mode enabled
- ES2022 target with ESNext modules
- Proper path aliases for imports

**Path Aliases**:
```json
{
  "@/*": ["./"],
  "@/orpc/*": ["../packages/api/orpc/*"],
  "@/modules/*": ["./modules/*"],
  "@/components/*": ["./components/*"],
  "@/lib/*": ["./lib/*"],
  "@/hooks/*": ["./hooks/*"],
  "@analytics/*": ["./modules/analytics/*"],
  "@marketing/*": ["./modules/marketing/*"],
  "@saas/*": ["./modules/saas/*"],
  "@ui/*": ["./modules/ui/*"],
  "@shared/*": ["./modules/shared/*"],
  "@config": ["../../config"]
}
```

⚠️ **Issues**:
- Test files explicitly excluded from compilation
- `final_launch_polish/` directory excluded (temporary cleanup needed)

### Next.js Configuration (`next.config.mjs`)

✅ **Good**:
- Webpack alias configuration for path resolution
- Sentry integration for error tracking
- Nextra for documentation
- Bundle analyzer support (optional)
- Server external packages configured for native modules

⚠️ **Issues**:
- Requires `.env` variables for Sentry (`SENTRY_ORG`, `SENTRY_PROJECT`)
- Bundle analyzer dependency not always available
- Note: Custom splitChunks removed due to "exports is not defined" errors

**Key Configuration**:
- `serverExternalPackages`: `["@node-rs/argon2", "pg"]`
- `optimizePackageImports`: Zod, React Query, Lucide, Radix UI
- Webpack IgnorePlugin for argon2 on client side

### PostCSS Configuration (`postcss.config.cjs`)

```javascript
{
  plugins: {
    "@tailwindcss/postcss": {}
  }
}
```

⚠️ **Note**: Uses the new `@tailwindcss/postcss` (Tailwind v4) instead of traditional postcss-nesting + tailwindcss

### Components Configuration (`components.json`)

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@ui/components",
    "utils": "@ui/lib",
    "ui": "@ui/components"
  }
}
```

✅ **Good**: Configured for shadcn/ui with CSS variables and React Server Components

### Vitest Configuration (`vitest.config.ts`)

✅ **Good**:
- jsdom environment (browser-like testing)
- Proper alias resolution
- Coverage reporting enabled
- E2E tests excluded (handled by Playwright)

⚠️ **Note**: Vitest aliases don't perfectly match Next.js tsconfig - slight divergence at `@snapback/infrastructure` (points to `packages/logs` instead of `packages/infrastructure`)

### Tailwind Configuration (`tailwind.config.ts`)

✅ **Good**:
- SnapBack brand colors configured
- CSS variables for semantic colors (light/dark mode)
- Proper container setup
- Custom keyframes for accordions

**Brand Colors**:
- `snapback-green`: `#00FF41` (bright neon)
- `snapback-orange`: `#FF9500` (warning)
- Semantic colors (background, foreground, card, etc.) via CSS variables

---

## 4. ENVIRONMENT VARIABLES

### Required Variables (`.env.example`)

**Site Configuration**:
```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

**Stripe Integration**:
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PROFESSIONAL_PLAN_PRICE_ID=""
STRIPE_TEAM_PLAN_PRICE_ID=""
```

**Analytics**:
```env
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=""
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

**Supabase** (Database & Auth):
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_DEFAULT_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
```

**S3 Storage**:
```env
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_ENDPOINT=""
S3_REGION=""
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```

**Sentry Monitoring**:
```env
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
SENTRY_ORG=""
SENTRY_PROJECT=""
```

**Stripe Price IDs**:
```env
NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY=""
NEXT_PUBLIC_PRICE_ID_PRO_YEARLY=""
NEXT_PUBLIC_PRICE_ID_LIFETIME=""
```

**Optional Services**:
```env
OPENAI_API_KEY=""                    # AI services
RESEND_API_KEY=""                    # Email service
HUBSPOT_ACCESS_TOKEN=""              # CRM integration
REDIS_URL=""                         # Caching
```

✅ **Status**: `.env.example` present with comprehensive documentation  
⚠️ **Alert**: `.env.local` exists (should be gitignored)

---

## 5. TYPESCRIPT ERRORS & WARNINGS

### Critical Issues (Build-Breaking)

#### 1. **Missing Module Imports** 🔴

**File**: `app/api/checkout/route.ts`
```
Cannot find module '@snapback/auth/auth' or its corresponding type declarations.
```

**Files Affected**:
- `app/api/checkout/route.ts:1`
- `app/api/keys/route.ts:1`

**Root Cause**: The `@snapback/auth` package exists but:
- Has no `auth.ts` export in main entry point
- CLAUDE.md lists it as "Placeholder for planned features"
- Source exists at `/packages/auth/src/auth.ts`

**Status**: Package not properly built/exported

---

#### 2. **Missing Email Template Import** 🔴

**File**: `app/api/waitlist/route.ts:7`
```
Cannot find module '@/emails/waitlist-confirmation' or its corresponding type declarations.
```

**Issue**: Import path uses `@/` instead of `@` root
**Actual File**: `apps/web/emails/waitlist-confirmation.tsx` (exists)
**Fix**: Change import from `@/emails/waitlist-confirmation` to `@/emails/waitlist-confirmation`

---

#### 3. **Missing Database Schema** 🔴

**File**: `app/api/waitlist/route.ts:9`
```
Property 'waitlist' does not exist on type 'typeof import(...@snapback/platform...)'
```

**Details**:
```typescript
const { waitlist: waitlistTable } = snapbackSchema;  // ❌ waitlist doesn't exist
const { waitlistTasks } = snapbackSchema;            // ❌ waitlistTasks doesn't exist
```

**Root Cause**: Database schema missing waitlist tables
**Status**: Schema incomplete in platform package

---

#### 4. **Missing @snapback/contracts/events** 🔴

**File**: `app/api/v1/telemetry/event/route.ts:2`
```
Cannot find module '@snapback/contracts/events' or its corresponding type declarations.
```

**Files Affected**:
- `app/api/v1/telemetry/event/route.ts`
- `__tests__/api/telemetry/event.test.ts`

**Root Cause**: Events module not exported from contracts package

---

#### 5. **API Route Params Type Mismatch** 🔴

**File**: `app/api/v1/rollbacks/route.ts`
```
Type '{ id: string; }' is missing the following properties from type 'Promise<any>': 
then, catch, finally, [Symbol.toStringTag]
```

**Issue**: Next.js v15 changed route params to Promise<Params>
**Current Code**: `{ params: { id: string } }`
**Expected**: `{ params: Promise<{ id: string }> }`

---

#### 6. **Missing @snapback/auth/lib/helper** 🔴

**Files Affected**:
- `app/(saas)/app/(organizations)/[organizationSlug]/settings/layout.tsx:7`
- `app/(saas)/app/(organizations)/[organizationSlug]/settings/members/page.tsx:5`

```typescript
import { isOrganizationAdmin } from "@snapback/auth/lib/helper";
```

**Issue**: Helper not exported from auth package

---

#### 7. **Nextra Layout Props Type Mismatch** 🔴

**File**: `app/(docs)/docs/layout.tsx`
```
Property 'pageOpts' is missing in type 'LayoutProps<"/docs">'
```

**Issue**: Nextra layout expects different props structure

---

### Type Errors (Non-Breaking)

#### 8. **Implicit Any Parameters** 🟡

Multiple files with untyped parameters:
- `app/(saas)/app/(account)/page.tsx:19` - `org` parameter
- `app/(saas)/app/(account)/settings/security/page.tsx:34` - `account` parameter
- `app/(saas)/app/layout.tsx:28` - `org` parameter

**Fix**: Add explicit type annotations

---

#### 9. **Sentry Property Missing** 🟡

**File**: `app/(saas)/app/sentry-test/page.tsx`
```
Property 'logger' does not exist on type 'typeof @sentry/nextjs'
```

**Lines**: 247, 269, 290, 310, 333, 356

**Issue**: Sentry API mismatch or version incompatibility

---

#### 10. **Database Instance Possibly Null** 🟡

**Files**:
- `app/(saas)/organization-invitation/[invitationId]/page.tsx:26`
- `app/api/health/route.ts` (multiple lines)

```typescript
drizzle?.getOrganizationById()  // ❌ drizzle possibly null
drizzle?.db                      // ❌ no property 'db'
```

**Issue**: Database client initialization might fail

---

#### 11. **Unknown Error Types** 🟡

Multiple files catch errors but pass `unknown` to Sentry:
- `app/(marketing)/snapback-demo/components/PolicyWatcher.tsx:53`
- `app/(marketing)/snapback-demo/hooks/useAiMonitoring.ts:107`
- `app/(marketing)/snapback-demo/hooks/usePolicyApplication.ts:54`
- `app/(saas)/app/api-keys/api-keys-client.tsx:39, 47`

```typescript
// ❌ Argument of type 'unknown' not assignable to 'Error'
Sentry.captureException(unknown);
```

**Fix**: Type assertion or error handling before passing to Sentry

---

#### 12. **Zod Error Type Mismatch** 🟡

**File**: `app/api/waitlist/route.ts:253`
```
Property 'errors' does not exist on type 'ZodError<unknown>'
```

**Issue**: Should use `.errors` property or different validation library

---

#### 13. **Content Item Type Mismatch** 🟡

**File**: `app/(marketing)/(home)/test-content/page.tsx`
```
Types of property 'content' are incompatible:
Type 'undefined' is not assignable to type 'string'
```

**Issue**: ContentItem union type has optional fields in some variants

---

### Summary of Critical Issues

| Issue | Count | Severity | Category |
|-------|-------|----------|----------|
| Missing imports/modules | 7 | 🔴 Critical | Package exports |
| Type mismatches | 6 | 🟡 High | TypeScript strict |
| Null checks | 2 | 🟡 High | Type safety |
| Type assertions needed | 4 | 🟡 Medium | Error handling |
| Parameter types | 3 | 🟡 Medium | Implicit any |

**Total Errors**: ~32 TypeScript compilation errors
**Total Warnings**: ~12 minor type issues

---

## 6. IMPORT PATTERNS & POTENTIAL ISSUES

### Working Import Patterns ✅

```typescript
// Monorepo workspace packages
import { db } from "@snapback/platform";
import { config } from "@config";
import { getSession } from "@saas/auth/lib/server";

// Local path aliases
import { Button } from "@/components/ui/button";
import { useResource } from "@/lib/use-resource-query";
import { useMarketingState } from "@marketing/hooks/useMarketingState";

// Node modules
import { NextResponse } from "next/server";
import { z } from "zod";
```

### Broken Imports ❌

```typescript
// Missing exports
import { isOrganizationAdmin } from "@snapback/auth/lib/helper";      // ❌ Not exported
import { CoreEventSchema } from "@snapback/contracts/events";        // ❌ Module doesn't exist
import { WaitlistConfirmationEmail } from "@/emails/waitlist-confirmation"; // ❌ Wrong path

// Missing files/tables
const { waitlist } = snapbackSchema;  // ❌ Table not in schema
```

### Module Resolution Issues

**Issue in `next.config.mjs`**:
```javascript
"@/orpc/procedures": path.resolve(__dirname, "../../packages/api/orpc/procedures.ts")
```

This creates a mismatch:
- TypeScript sees `@/orpc/*` → `./` (in tsconfig)
- Next.js webpack sees `@/orpc/*` → `../../packages/api/orpc/*` (in config)

---

## 7. ROUTE STRUCTURE & API ENDPOINTS

### Page Routes (Next.js App Router)

```
(marketing)/          # Layout group - public pages
├── (home)/           # Root group within marketing
│   └── page.tsx      # / landing page
├── about/
├── blog/
├── changelog/
├── contact/
├── features/
├── hats-demo/        # 3D protection level demo
├── pricing/
├── snapback-demo/    # Interactive VS Code demo
├── waitlist/
└── test* (temporary test routes)

(saas)/               # Layout group - authenticated
├── app/              # Dashboard root
├── layout.tsx        # Protects all saas routes
├── choose-plan/
├── new-organization/
├── onboarding/
└── organization-invitation/[invitationId]/

auth/                 # Authentication flows
├── login/
├── signup/
├── forgot-password/
├── reset-password/
└── verify/

(docs)/               # Documentation
└── docs/             # Nextra-powered docs

api/                  # Backend API routes
├── health/           # Health check
├── checkout/         # Stripe checkout
├── keys/             # API key management
├── test-sentry/      # Sentry testing
├── waitlist/         # Waitlist management
└── v1/               # Versioned API
    ├── checkpoint/
    ├── snapshots/
    ├── checkpoints/
    ├── user/
    ├── device-fingerprint/
    ├── trial-key/
    ├── telemetry/
    ├── billing/
    ├── analytics/
    └── rollbacks/    # ⚠️ Type error with params
```

### API Endpoints (v1)

**Snapshots**:
- `GET /api/v1/snapshots/list` - List all snapshots
- `GET /api/v1/snapshots/metadata` - Get metadata

**Checkpoints**:
- `GET /api/v1/checkpoints/list` - List checkpoints
- `GET /api/v1/checkpoints/metadata` - Get metadata

**User**:
- `GET /api/v1/user/me` - Current user info

**Rollbacks**:
- `GET /api/v1/rollbacks/[id]` - Get rollback ⚠️ Type error

**Session**:
- `POST /api/v1/checkpoint` - Create checkpoint

**Device**:
- `POST /api/v1/device-fingerprint` - Device fingerprint

**Trial**:
- `GET /api/v1/trial-key` - Trial key info

**Telemetry**:
- `POST /api/v1/telemetry/event` - Track events ⚠️ Missing schema

**Billing**:
- `POST /api/v1/billing/create-checkout` - Create checkout session

**Analytics**:
- `GET /api/v1/analytics/metrics` - Get metrics

**Utilities**:
- `GET /api/health` - Health check
- `POST /api/waitlist` - Waitlist signup
- `POST /api/waitlist/task` - Waitlist task
- `POST /api/keys` - Manage API keys

---

## 8. ARCHITECTURE OBSERVATIONS

### Strengths ✅

1. **Well-Organized Module Structure**: Clear separation between marketing, SaaS, UI, and shared modules
2. **Comprehensive Styling**: Tailwind + shadcn/ui with CSS variables for theming
3. **Type-Safe Forms**: React Hook Form + Zod validation
4. **Data Fetching**: React Query for caching + ORPC for type-safe APIs
5. **Observability**: Sentry integration for error tracking
6. **Multiple UI Demos**: Interactive demos (hats-demo, snapback-demo)
7. **Authentication Ready**: Layout structure supports protected routes
8. **Documentation**: Nextra-based docs site integrated
9. **Email Support**: React Email + Resend for transactional emails

### Areas of Concern ⚠️

1. **Broken Package Exports**: @snapback/auth and contracts not properly built
2. **Missing Database Tables**: Waitlist schema not implemented
3. **TypeScript Strict Mode Violations**: Multiple untyped parameters and implicit any
4. **Inconsistent Error Handling**: Unknown error types in try/catch blocks
5. **Test Route Pollution**: Multiple test routes in (marketing) should be removed
6. **API Type Mismatches**: Next.js v15 params protocol not followed
7. **Module Path Divergence**: Vitest aliases don't match Next.js tsconfig exactly
8. **Temporary Directories**: `final_launch_polish/` should be cleaned up
9. **Configuration Complexity**: Webpack aliases partially duplicate tsconfig paths
10. **Sentry Version Incompatibility**: Logger property missing (API mismatch)

---

## 9. POTENTIAL BREAKING ISSUES

### Before Production Deployment

#### P0 - Must Fix 🔴

- [ ] Fix @snapback/auth package exports (auth.ts, lib/helper.ts)
- [ ] Implement waitlist tables in database schema
- [ ] Export @snapback/contracts/events module
- [ ] Update API route params for Next.js v15 compatibility
- [ ] Fix email import path in waitlist route
- [ ] Resolve Sentry type compatibility issue

#### P1 - Should Fix 🟡

- [ ] Add explicit type annotations for all parameters
- [ ] Implement proper error handling (type assert before Sentry)
- [ ] Add null safety checks for database client
- [ ] Fix Zod error property access
- [ ] Update Nextra layout to match expected props

#### P2 - Nice to Have 🟢

- [ ] Remove test routes from (marketing) group
- [ ] Clean up final_launch_polish directory
- [ ] Standardize vitest aliases with Next.js config
- [ ] Consider separating webpack aliases from path resolution

---

## 10. DEVELOPMENT COMMANDS

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)

# Testing
pnpm type-check            # TypeScript validation ⚠️ Returns 32 errors
pnpm lint                  # Biome linting
pnpm test                  # Unit tests (vitest)
pnpm test:e2e              # E2E tests (playwright)

# Building
pnpm build                 # Production build
```

**Current Status**: 
- ✅ Dev server likely works (errors are type-check only)
- ❌ Production build will fail due to missing exports
- ❌ Type checking will fail with 32+ errors

---

## 11. RECOMMENDATIONS

### Immediate Actions (Before Merge)

1. **Fix Package Exports** (2-3 hours)
   - Build @snapback/auth with proper exports
   - Export events from @snapback/contracts
   - Verify all monorepo packages are built

2. **Implement Waitlist Schema** (1-2 hours)
   - Add `waitlist` and `waitlistTasks` tables to platform schema
   - Run migrations

3. **Fix API Routes** (30 min - 1 hour)
   - Update rollbacks/[id] params to Promise<Params>
   - Update all API route signatures for Next.js v15

4. **Resolve Type Errors** (2-3 hours)
   - Add parameter type annotations
   - Fix Sentry integration
   - Implement proper error handling

### Short-term Improvements (Next Sprint)

1. **Testing Coverage**:
   - Add unit tests for API routes
   - Add E2E tests for critical user flows
   - Set minimum coverage threshold (80%)

2. **Code Quality**:
   - Enable strict TypeScript in CI/CD
   - Enforce type checking in pre-commit hooks
   - Remove test routes from production paths

3. **Architecture**:
   - Standardize monorepo path resolution
   - Document package export contracts
   - Create shared types library

### Long-term Improvements (Roadmap)

1. **Observability**:
   - Implement OpenTelemetry tracing
   - Add performance monitoring dashboards
   - Set up error tracking alerts

2. **Performance**:
   - Enable ISR for marketing pages (revalidate: 3600)
   - Implement image optimization
   - Add font loading optimization

3. **Security**:
   - Implement CSRF protection
   - Add rate limiting for APIs
   - Implement API key rotation

---

## Summary

The web app has a **solid architectural foundation** with modern tooling (Next.js 14, React 18, TypeScript, Tailwind) but **requires immediate fixes** to build and deploy:

**Status**: 🔴 Not ready for production due to broken package exports and missing schema

**Timeline**: 6-8 hours to resolve P0/P1 issues

**Confidence**: High - all issues are identifiable and fixable
