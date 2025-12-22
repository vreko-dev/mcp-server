# Implementation Guides & Phase 2-3 Roadmap
**Consolidated from**: implementation_guides directory | **Date**: December 2025
**Purpose**: Design phase specifications and migration implementation plans

---

## Part 1: Next.js 16 Upgrade Implementation

### Prerequisites
- ✅ All dependencies aligned (React 19.1.2, Next.js 16.0.3)
- ✅ RSC compliance verified
- ✅ Docker configuration ready
- ✅ Build system validated

### Phase 1: Configuration Setup (Week 1)

**Task 1A: Enable Native Next.js Caching**
```typescript
// app/layout.tsx - Server Component
'use cache'
export default async function RootLayout() {
  const data = await fetchData();
  return <html>...</html>;
}

// app/dashboard/page.tsx - Server Component with cache tag
'use cache'
import { cacheTag, cacheLife } from 'next/cache';

export default async function Dashboard() {
  cacheTag('dashboard');
  cacheLife('hours');
  const data = await fetchData();
  return <div>...</div>;
}
```

**Task 1B: Update Turbo Configuration**
- Add next.config.mjs to globalDependencies (5 min)
- Document cache layer strategy
- Update turbo.json with explicit Next.js app tasks

**Task 1C: Component Organization**
- ✅ Already compliant (all interactive components marked "use client")
- ✅ No RSC boundary violations detected
- Optional: Add server-side error.tsx for enhanced RSC error handling

### Phase 2: Migration (Week 2-3)

**Task 2A: Replace Manual Cache Management**
Replace:
```typescript
// OLD: Manual revalidatePath
import { revalidatePath } from 'next/cache';
export const clearCache = async (path?: string) => {
  revalidatePath(path);
}
```

With:
```typescript
// NEW: Native 'use cache' directive
'use cache'
cacheTag('dashboard');
cacheLife('1 hour');
```

**Task 2B: Implement Cache Layer Strategy**
```
┌─────────────────────────────────┐
│ Turbo Build Cache (CI/CD)        │ (artifacts)
├─────────────────────────────────┤
│ Next.js Data Cache (Server)      │ ('use cache' directive)
├─────────────────────────────────┤
│ Next.js Full Route Cache (HTML)  │ (cacheTag, cacheLife)
├─────────────────────────────────┤
│ Browser Cache (Client)           │ (TanStack Query, localStorage)
└─────────────────────────────────┘
```

### Phase 3: Testing & Rollout (Week 4)

**Task 3A: Validation**
```bash
pnpm build
docker build -f apps/web/Dockerfile.prod -t snapback-web:prod .
pnpm test
pnpm type-check
```

**Task 3B: Performance Verification**
- ✅ FCP <1.8s mobile, <1s desktop
- ✅ LCP <2.5s mobile, <1.5s desktop
- ✅ Bundle size <2MB

**Task 3C: Gradual Rollout**
- Stage 1: Internal testing
- Stage 2: Beta users (10%)
- Stage 3: 50% → 100% rollout
- 7-day cooldown period for monitoring

---

## Part 2: Fix Priority 1 Items (BLOCKING)

### FIX 1: Dockerfile.dev Database Reference (P1.1)

**Status**: BLOCKING - Docker dev image fails to build

**Identified Issue**:
```dockerfile
# Line 79 - FAILS
RUN pnpm --filter database run generate
```

**Root Cause**: Package `database` doesn't exist in monorepo

**Resolution Steps**:
1. Identify correct package name:
   ```bash
   # Check available packages
   ls packages/
   grep -r "generate" packages/*/package.json | grep scripts
   ```
2. Update Dockerfile.dev with correct package name
3. Test:
   ```bash
   docker build -f apps/web/Dockerfile.dev -t snapback-web:dev .
   ```

**Most Likely Fix**:
```dockerfile
# Option A: Platform package contains database
RUN pnpm --filter @snapback/platform run generate

# Option B: No generation needed
# (Delete this line)

# Option C: Root-level database command
RUN pnpm run db:generate
```

**Effort**: 10-15 minutes
**Blockers**: None (can proceed independently)

---

### FIX 2: Turbo Cache Invalidation (P1.2)

**Status**: MEDIUM RISK - Cache won't bust on config changes

**File**: `turbo.json` (line 3)

**Current**:
```json
"globalDependencies": ["**/.env.*local", "biome.json", "tsconfig.json", "tsup.config.ts"]
```

**Required**:
```json
"globalDependencies": [
  "**/.env.*local",
  "biome.json",
  "tsconfig.json",
  "tsup.config.ts",
  "apps/web/next.config.mjs",      // ← ADD
  "apps/docs/next.config.mjs",      // ← ADD
  "apps/api/tsup.config.ts"         // ← Optional
]
```

**Why**: If you modify next.config.mjs, Turbo needs to know to invalidate cache

**Testing**:
```bash
# Modify a next.config.mjs file
echo "// test" >> apps/web/next.config.mjs

# Force rebuild - should not use cache
pnpm build --force

# Should show cache miss
```

**Effort**: 5 minutes
**Blockers**: None

---

### FIX 3: apps/docs Version Consistency (P1.3)

**Status**: LOW RISK - Works but violates monorepo pattern

**File**: `apps/docs/package.json`

**Current**:
```json
"@mdx-js/loader": "^3.1.1",
"@next/mdx": "^16.0.1",
"@vercel/analytics": "^1.5.0"
```

**Required**:
```json
"@mdx-js/loader": "catalog:",
"@next/mdx": "catalog:",
"@vercel/analytics": "catalog:"
```

**Why**: Single source of truth - all versions in pnpm-workspace.yaml

**Testing**:
```bash
pnpm install
# Should resolve to catalog versions without conflicts
```

**Effort**: 5 minutes
**Blockers**: None

---

### FIX 4: Consolidate Path Aliases (P1.4)

**Status**: MEDIUM EFFORT - Maintenance debt elimination

**Problem**: Path aliases defined in both places:
- `apps/web/tsconfig.json`
- `apps/web/next.config.mjs` (webpack section)

**Solution**: Remove webpack section, use tsconfig only

**Steps**:
1. Verify all aliases are in tsconfig.json (lines 10-26):
   ```json
   "@/*": ["./"],
   "@analytics/*": ["./modules/analytics/*"],
   "@marketing/*": ["./modules/marketing/*"],
   // ... all 8+ aliases
   ```

2. Delete webpack config from next.config.mjs (lines 122-149):
   ```javascript
   // DELETE THIS ENTIRE BLOCK:
   webpack: (config, { isServer }) => {
     config.resolve.alias = { ... };
     return config;
   }
   ```

3. Test that imports still work:
   ```bash
   pnpm build
   # All imports should resolve through tsconfig
   ```

**Why**: Single source of truth, reduced maintenance burden

**Effort**: 30 minutes
**Blockers**: Turbo fix (P1.2) should complete first

**Testing**:
```bash
# Verify all modules resolve correctly
grep -r "from ['\"]@" apps/web/src | head -10
# All should resolve via tsconfig

# Build should succeed
pnpm build --filter=@snapback/web
```

---

## Part 3: Build System Optimizations

### AUTH Integration (Phase 2)

**Current State**: Multiple auth implementations across apps

**Goal**: Centralized auth package usage

**Implementation**:
```typescript
// ✅ Use canonical auth
import { auth } from "@snapback/auth";
import { verifyApiKey } from "@snapback/auth";

// All services use same auth
const verified = await auth.api.verifyApiKey({ key: apiKey });
```

**Files Affected**:
- apps/api/src/middleware/auth.ts
- apps/mcp-server/src/auth/tierCheck.ts
- apps/web/src/lib/auth.ts
- apps/cli/src/commands/auth.ts

**Effort**: M (4-8 hours)

---

### TEST Strategy (Phase 3)

**Test Pyramid**:
```
      /\
     /  \ Unit Tests
    /────\
   /      \ Integration Tests
  /────────\
 /          \ E2E Tests
/────────────\
```

**Coverage Requirements**:
- Unit tests: 80%+ for business logic
- Integration tests: Critical user flows
- E2E tests: Playwright for frontend

**Test Command**:
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

---

## Part 4: Defense System Implementation (Optional Enhancement)

**Purpose**: Comprehensive error handling and validation

**Scope**:
- Input validation at API boundaries
- Error mapping and serialization
- User-friendly error messages
- Error tracking integration

**Implementation Checklist**:
- [ ] Input validation layer (Zod schemas)
- [ ] Error boundary setup
- [ ] Error tracking service integration
- [ ] User notification system

---

## Part 5: SEO Automation (Next.js 16 Feature)

**Leverage Next.js 16 Metadata API**:
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'SnapBack - AI-Powered File Protection',
  description: 'Protect your code with AI detection',
  openGraph: {
    title: 'SnapBack',
    description: 'Protect your code',
    images: ['/og-image.png'],
  },
};
```

**Dynamic Metadata**:
```typescript
// app/dashboard/[id]/page.tsx
export async function generateMetadata({ params }) {
  const snapshot = await getSnapshot(params.id);
  return {
    title: `Snapshot: ${snapshot.name}`,
  };
}
```

---

## Part 6: Sentry Integration (Monitoring)

**Setup**:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Error Capture**:
```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

---

## References

- **Next.js 16 Docs**: https://nextjs.org/docs
- **React 19 Migration**: See docs/implementation/NEXTJS-16-IMPLEMENTATION-GUIDE.md
- **Auth Strategy**: See docs_to_review/implementation_guides/AUTH_MSW_HANDLERS_FIXES.md
- **Test Strategy**: See docs_to_review/implementation_guides/AUTH_TEST_STRATEGY.md

**Alignment**: PHASE 2-3 of visual_flow.md (DESIGN → MIGRATE)
