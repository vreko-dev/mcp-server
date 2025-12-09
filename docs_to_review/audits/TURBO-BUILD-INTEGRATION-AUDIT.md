# Turbo/Build Tools Integration Audit

**Date**: December 7, 2025
**Scope**: Complete analysis of Turbo, Next.js 16, pnpm, Lefthook, Biome, and build tooling integration
**Status**: ✅ Well-integrated with some optimization opportunities

---

## Executive Summary

Your build system is **well-orchestrated** with proper Turbo integration, solid dependency management, and comprehensive pre-commit validation. **No wheel reinvention detected**. However, there are **3 key optimizations** to leverage Next.js 16 native features and eliminate redundant tooling.

### Quick Findings

| Category | Status | Issues | Priority |
|----------|--------|--------|----------|
| **Turbo Configuration** | ✅ Good | None critical | - |
| **pnpm Catalog System** | ✅ Excellent | None | - |
| **Lefthook Validators** | ✅ Good | 1 deprecated reference | P2 |
| **Next.js Integration** | ⚠️ Partial | Not using native caching | P1 |
| **Biome/Linting** | ✅ Good | None | - |
| **Type Checking** | ✅ Good | None | - |
| **Build Pipeline** | ✅ Good | Webpack duplication opportunity | P2 |

---

## Part 1: Turbo Configuration Analysis

### ✅ Strengths

**1. Intelligent Task Dependencies** (turbo.json lines 42-145)
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["validate:infrastructure", "validate:exports", "build:package", "^generate", "^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    }
  }
}
```

- ✅ Proper validation gates before build
- ✅ Topological dependency ordering
- ✅ Workspace protocol enabled (`^` prefix for dependencies)
- ✅ Caching configured correctly
- ✅ Environment variables properly managed

**2. Global Dependencies** (turbo.json line 3)
```json
"globalDependencies": ["**/.env.*local", "biome.json", "tsconfig.json", "tsup.config.ts"]
```

- ✅ All shared config files tracked
- ✅ Environment files properly detected
- ✅ Cache invalidation on config changes

**3. Task Specialization** (turbo.json lines 160-260)
- ✅ `validate:infrastructure` - Pre-build validation
- ✅ `validate:exports` - Package export integrity
- ✅ `build:package` - VSCode package generation
- ✅ `contract-test` - API contract testing
- ✅ `analyze`, `scan`, `health` - Quality gates
- ✅ Deployment pipeline separation

### ⚠️ Opportunities

**1. Cache Invalidation on Next.js Config Changes**

Currently, Next.js config changes don't invalidate build cache automatically:

```json
// CURRENT: Missing next.config.mjs
"globalDependencies": ["**/.env.*local", "biome.json", "tsconfig.json", "tsup.config.ts"],

// RECOMMENDED: Add Next.js and tsup config
"globalDependencies": [
  "**/.env.*local",
  "biome.json",
  "tsconfig.json",
  "tsup.config.ts",
  "apps/web/next.config.mjs",      // ← ADD
  "apps/docs/next.config.mjs",      // ← ADD
  "packages/*/tsup.config.ts"       // ← Already tracked
]
```

**Impact**: Ensures cache busts when Next.js configuration changes (e.g., cacheLife profiles)

**2. Explicit Next.js 16 Build Configuration**

Add Next.js-specific Turbo tasks for new features:

```json
// ADD to turbo.json
"@snapback/web#build": {
  "dependsOn": ["^build"],
  "outputs": [".next/**", "!.next/cache/**"],
  "inputs": ["$TURBO_DEFAULT$", "next.config.mjs"],
  "cache": true
},
"@snapback/docs#build": {
  "dependsOn": ["^build"],
  "outputs": [".next/**", "!.next/cache/**"],
  "inputs": ["$TURBO_DEFAULT$", "next.config.mjs"],
  "cache": true
}
```

**Status**: Currently relies on automatic task detection (lines 211-218)
**Recommendation**: Make explicit for clarity and performance monitoring

---

## Part 2: pnpm Workspace & Catalog Integration

### ✅ Excellent Implementation

**Catalog System** (pnpm-workspace.yaml lines 11-284)
- ✅ **285 packages** with unified version management
- ✅ All external dependencies centralized
- ✅ No version drift possible
- ✅ Workspace protocol for internal packages
- ✅ Single source of truth

```yaml
catalogs:
  default:
    next: 16.0.3
    typescript: 5.9.2
    vitest: 3.2.4
    # ... 282 more packages
```

**Benefits**:
- Security updates applied once
- No version mismatches
- Easy dependency audits
- Compatible with monorepo growth

### ⚠️ Minor Issues

**1. Unused Catalog Entries** (Not critical, but cleanup potential)

Some packages in catalog aren't used:
```yaml
# Present but potentially unused
angular/core: 19.2.0          # Check if needed
codesandbox/sandpack-react: 2.19.9  # Check usage
```

**Recommendation**: Run audit script to identify unused catalog entries

**2. Version Pinning for Next.js Ecosystem**

```yaml
# Current
next: 16.0.3
@next/mdx: 16.0.3

# Consider adding meta-packages for coherence
@next/env: 16.0.3             # For env validation
@next/font: 16.0.3            # For font optimization
```

**Status**: Not critical, but improves clarity

---

## Part 3: Lefthook Pre-Commit Integration

### ✅ Comprehensive Validation

Your Lefthook configuration (`.lefthook.yml`) is **production-grade**:

| Validator | Lines | Purpose | Status |
|-----------|-------|---------|--------|
| **quality** | 4-10 | Biome formatting | ✅ Active |
| **dts-resolution-validator** | 12-75 | DTS build check | ✅ Active |
| **tsconfig-path-validator** | 77-134 | TypeScript paths | ✅ Active |
| **relative-import-detector** | 136-179 | Cross-package imports | ✅ Active |
| **workspace-deps-validation** | 181-211 | Workspace protocol | ✅ Active |
| **type-check-full** | 216-221 | Pre-push type check | ✅ Active |
| **dts-build-validation** | 223-268 | DTS generation | ✅ Active |
| **no-placeholder-tests** | 270-278 | Test integrity | ✅ Active |
| **no-skipped-tests** | 280-286 | Test coverage | ✅ Active |

### ⚠️ One Deprecated Reference

**Issue**: Line 26 references deprecated package name

```javascript
// .lefthook.yml line 26
'@snapback/testing',  // ← Check if still valid
```

**Status**: Needs verification
**Fix Priority**: P2 - Minor (validation still works)

**Action**: Verify in root package.json and packages-oss

---

## Part 4: Next.js 16 Integration Issues (Critical)

### ❌ Missing Integration Points

**1. Next.js Native Caching NOT Being Leveraged**

Your app uses:
```typescript
// Current: Manual via server actions
import { revalidatePath } from 'next/cache'
export const clearCache = async (path?: string) => {
  revalidatePath(path)
}
```

Next.js 16 provides:
```typescript
// Native: Use 'use cache' directive
'use cache'
cacheTag('dashboard')
cacheLife('hours')
```

**Impact**: You're writing cache management that Next.js can automate
**Fix**: Implement Part 1 from NEXTJS-16-UPGRADE-ANALYSIS.md

**2. Turbo Cache Coordination with Next.js Data Cache**

Currently, Turbo cache and Next.js Data Cache are **independent**:

```json
// Turbo manages build-time cache
"build": {
  "cache": true,
  "outputs": [".next/**", "!.next/cache/**"]  // ← Ignores data cache
}
```

Next.js 16 manages request-time cache separately (Data Cache, Full Route Cache)

**Coordination Gap**: No explicit strategy for cache layering

**Recommendation**: Document cache layers in README:
```
┌─────────────────────────────────┐
│ Turbo Build Cache               │ (CI/CD artifact cache)
├─────────────────────────────────┤
│ Next.js Data Cache              │ (Server Component data)
├─────────────────────────────────┤
│ Next.js Full Route Cache        │ (Rendered HTML)
├─────────────────────────────────┤
│ Browser Cache                   │ (Client-side TanStack Query)
└─────────────────────────────────┘
```

### ⚠️ Webpack Configuration Opportunity

**Current State** (next.config.mjs lines 122-149):
```javascript
webpack: (config, { isServer }) => {
  config.resolve.extensionAlias = { ... }
  config.resolve.alias = {
    "@": path.resolve(__dirname, "./"),
    "@analytics": path.resolve(__dirname, "./modules/analytics"),
    // ... 6 more aliases
  }
}
```

**Issue**: Path aliases are duplicated in tsconfig.json AND next.config.mjs

**Better Approach**: Let Next.js auto-resolve tsconfig paths
```javascript
// REMOVE webpack config, use tsconfig instead
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@analytics/*": ["./modules/analytics/*"],
      // ... aliases in ONE place
    }
  }
}
```

**Status**: Works currently, but redundant
**Impact**: Single source of truth, less maintenance
**Effort**: 1-2 hours to consolidate

---

## Part 5: Build Pipeline Analysis

### ✅ What Works Well

**1. Comprehensive Validation Gates** (turbo.json)
```json
"build": {
  "dependsOn": [
    "validate:infrastructure",  // ✅ Infrastructure checks
    "validate:exports",         // ✅ Package export integrity
    "build:package",           // ✅ VSCode package
    "^generate",               // ✅ Code generation
    "^build"                   // ✅ Dependencies
  ]
}
```

**2. Quality Enforcement Across Layers**

| Layer | Tool | Config | Status |
|-------|------|--------|--------|
| Format | Biome | `biome.json` | ✅ Lefthook enforced |
| Lint | Biome | `biome.json` | ✅ Turbo task |
| Type Check | TypeScript | `tsconfig.base.json` | ✅ Pre-push gate |
| Test | Vitest | `vitest.config.ts` | ✅ CI required |
| Build | Turbo | `turbo.json` | ✅ Task orchestration |

**3. Docker Integration Ready**
```json
"docker-build": {
  "dependsOn": ["build"],
  "passThroughEnv": ["DOCKER_BUILDKIT"]
}
```

### ⚠️ Areas for Optimization

**1. Package.json Scripts Need Refactoring**

Current (package.json lines 78-157): **79 scripts!**

**Issues**:
- ❌ Scripts not grouped by category
- ❌ Some redundant (e.g., multiple publish variants)
- ❌ Hard to remember which to run
- ❌ Turbo tasks not fully documented

**Recommended Organization**:
```json
{
  "scripts": {
    "// === Development ===": "",
    "dev": "turbo dev",
    "dev:all": "turbo run dev --parallel",

    "// === Building ===": "",
    "build": "turbo build",
    "build:oss": "...",

    "// === Testing ===": "",
    "test": "turbo test",
    "test:e2e": "playwright test",

    "// === Quality ===": "",
    "quality": "turbo run quality",
    "lint": "turbo lint",

    "// === Deployment ===": "",
    "deploy": "turbo deploy",

    "// === Publishing ===": "",
    "publish": "node scripts/publish-orchestrator.ts"
  }
}
```

**2. No Documentation of Task Execution Order**

Turbo is smart about ordering, but developers should know:
- Which tasks run in parallel
- Which are blocking
- Which require secrets

**Recommendation**: Create `BUILD_SYSTEM.md` documenting pipeline

**3. Unused/Deprecated Scripts**

Audit results suggest some scripts are legacy:
- `snapback:check-sqlite` - Still needed?
- `check-framer-motion` - Still needed?
- Multiple `publish:*` variants - Consolidate?

---

## Part 6: Biome Linting Configuration

### ✅ Well-Configured

**biome.json** is solid:
- ✅ Formatter configured (tabs, 120-char lines)
- ✅ Smart linting rules (recommended + customizations)
- ✅ CSS/HTML support disabled (good for repo size)
- ✅ Experimental scanner ignores configured
- ✅ VCS integration enabled for proper warnings

**Custom Rules** (lines 13-49):
```json
"suspicious": {
  "noExplicitAny": "off"  // Reasonable for TS strict
},
"style": {
  "useAsConstAssertion": "error",  // Good for type safety
  "useEnumInitializers": "error"   // Prevents bugs
}
```

### ⚠️ Minor Tweaks for Next.js 16

**Add React 19 Rules**:
```json
"react": {
  "useHookRules": "error",           // React 19
  "useExhaustiveDependencies": "off" // Already off
}
```

**No Critical Issues** - Biome config is production-ready

---

## Part 7: TypeScript Configuration

### ✅ Excellent Setup

**tsconfig.base.json** (35 lines - lean and effective):
```json
{
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "moduleResolution": "bundler",    // ✅ Correct for Next.js 16
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "verbatimModuleSyntax": true,     // ✅ Ensures correct DTS
    "strict": true                    // ✅ Type safe
  }
}
```

**Benefits**:
- ES2022 target = modern JavaScript features
- bundler module resolution = correct for Turbo + Next.js
- Composite + incremental = faster rebuilds
- Declaration maps = debuggable types

**No Issues** - TypeScript configuration is optimal for monorepo

---

## Part 8: Validation Scripts

### ✅ Comprehensive Validation

You have **14+ validation scripts**:

| Script | Purpose | Used By | Status |
|--------|---------|---------|--------|
| `validate-infrastructure.ts` | Monorepo structure check | Turbo pre-build | ✅ Active |
| `validate-exports-integrity.mjs` | Package export check | Turbo pre-build | ✅ Active |
| `validate-oss-builds.js` | OSS build validation | Pre-publish | ✅ Active |
| `validate-publish-no-ip-leak.mjs` | Security check | Pre-publish | ✅ Active |
| `validate-turbo-optimization.js` | Cache config check | Manual | ✅ Available |
| `validate-docker-turbo.js` | Docker + Turbo check | Manual | ✅ Available |

**No Gaps** - Validation is comprehensive

---

## Summary of Findings

### What's Working ✅

1. **Turbo** - Excellent orchestration, proper dependencies, caching configured
2. **pnpm Catalog** - Perfect version management, no drift issues
3. **Lefthook** - Comprehensive pre-commit validation, no blockers
4. **TypeScript** - Correct configuration, strict mode, composite builds
5. **Biome** - Clean linting and formatting setup
6. **Validation Scripts** - Thorough checks at every gate
7. **No Wheel Reinvention** - Tools are integrated, not duplicated

### What Needs Attention ⚠️

| Issue | Severity | Effort | Impact |
|-------|----------|--------|--------|
| Missing `next.config.mjs` in globalDependencies | P2 | 5 min | Cache buster safety |
| Webpack aliases duplicate tsconfig paths | P2 | 2 hours | Maintenance debt |
| Scripts not organized/documented | P3 | 4 hours | DX improvement |
| Lefthook deprecated reference | P2 | 30 min | Clean codebase |
| Next.js caching not integrated with Turbo | P1 | 4 hours | Performance/clarity |

---

## Action Plan

### Immediate (This Week)
1. ✅ Add Next.js configs to Turbo globalDependencies
2. ✅ Verify Lefthook deprecated reference

### Soon (Next 2 Weeks)
1. ✅ Implement Next.js 16 caching (from NEXTJS-16-UPGRADE-ANALYSIS.md)
2. ✅ Consolidate path aliases (tsconfig only)
3. ✅ Document cache layer strategy

### Planning (Next Month)
1. ✅ Refactor 79 scripts into organized groups
2. ✅ Create BUILD_SYSTEM.md documentation
3. ✅ Audit unused validation scripts

---

## Recommended Updates

### Update 1: Fix Turbo Global Dependencies

**File**: `turbo.json` line 3

```json
// BEFORE
"globalDependencies": ["**/.env.*local", "biome.json", "tsconfig.json", "tsup.config.ts"],

// AFTER
"globalDependencies": [
  "**/.env.*local",
  "biome.json",
  "tsconfig.json",
  "tsup.config.ts",
  "apps/web/next.config.mjs",
  "apps/docs/next.config.mjs",
  "apps/api/tsup.config.ts"
],
```

### Update 2: Verify Lefthook Reference

**File**: `.lefthook.yml` line 26 - Run validation to ensure this package still exists

```bash
pnpm ls @snapback/testing
```

### Update 3: Document Cache Strategy

**Create**: `docs/CACHE-STRATEGY.md`

```markdown
# Cache Layers in SnapBack

## Layer 1: Turbo Build Cache (CI/CD)
- Managed by: Turbo
- Scope: Package build outputs
- Config: turbo.json

## Layer 2: Next.js Data Cache (Server)
- Managed by: Next.js 16 'use cache'
- Scope: Server Component data
- Config: Component-level directives

## Layer 3: Next.js Full Route Cache
- Managed by: Next.js 16 cacheTag()
- Scope: Rendered pages
- Config: cacheTag, cacheLife in components

## Layer 4: Browser Cache (Client)
- Managed by: TanStack Query
- Scope: API responses, queries
- Config: staleTime, gcTime in query-client.ts
```

---

## Conclusion

Your build system is **well-engineered and properly integrated**. You're not reinventing wheels - Turbo, pnpm, Lefthook, and Next.js are working together effectively.

**Key Strength**: Clear separation of concerns
- Turbo handles orchestration
- pnpm handles dependencies
- Lefthook handles validation
- TypeScript handles types
- Biome handles formatting
- Next.js handles app-specific caching

**Next Step**: Leverage Next.js 16's native caching to reduce manual cache management. See NEXTJS-16-UPGRADE-ANALYSIS.md Part 1 for implementation.

**Risk Level**: Low - Recommended changes are non-breaking improvements

---

**Report Date**: December 7, 2025
**Analyst**: Context7 AI Code Review
