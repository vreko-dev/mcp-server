# TypeScript Monorepo Configuration Cleanup Plan

**Task ID**: `task_mjo314nx_gb8bza`
**Created**: 2025-12-27
**Status**: Ready for Implementation
**Risk**: Low (configuration changes, no runtime behavior change)

## Executive Summary

The SnapBack monorepo has **tsconfig paths that bypass the proper package resolution system**. This causes:
- Broken incremental builds (TypeScript can't track dependencies properly)
- IDE navigation going to source instead of declarations
- Package exports being ignored
- Build order issues

The fix is simple: **remove cross-package paths and rely on pnpm workspace resolution**.

---

## Current Architecture (What's Working)

### ✅ Correct Setup Already in Place

1. **pnpm Workspace** (`pnpm-workspace.yaml`)
   - Packages linked via `workspace:*` protocol
   - Creates `node_modules/@snapback/*` symlinks automatically

2. **Package Exports** (e.g., `packages/infrastructure/package.json`)
   ```json
   "exports": {
     ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
     "./logging/logger": { "types": "./dist/logging/logger.d.ts", ... }
   }
   ```

3. **TypeScript Project References** (root `tsconfig.json`)
   ```json
   {
     "files": [],
     "references": [
       { "path": "./packages/infrastructure" },
       { "path": "./packages/core" },
       ...
     ]
   }
   ```

4. **Turborepo Build Order** (`turbo.json`)
   ```json
   {
     "build": {
       "dependsOn": ["^build"]  // Builds dependencies first
     }
   }
   ```

5. **Shared Base Configs** (`@snapback/tsconfig` in `tooling/typescript/`)
   - `base.json`, `app.json`, `cli.json`, `extension.json`

---

## The Problem: Paths Bypassing Resolution

### ❌ What's Wrong

Several packages have `paths` that point directly to sibling package source:

```json
// packages/core/tsconfig.json - CURRENT (WRONG)
{
  "paths": {
    "@snapback/infrastructure": ["../infrastructure/src"],
    "@snapback/infrastructure/*": ["../infrastructure/src/*"]
  }
}
```

This causes TypeScript to:
1. Read source files directly instead of compiled declarations
2. Ignore the package.json exports
3. Skip incremental build invalidation
4. Navigate IDE to source instead of declarations

---

## Packages Requiring Changes

### High Priority (Cross-Package Paths)

| Package | File | Problematic Paths | Action |
|---------|------|-------------------|--------|
| `packages/core` | `tsconfig.json` | `@snapback/infrastructure`, `@snapback/platform` | Remove |
| `packages/auth` | `tsconfig.json` | `@snapback/*`, `@config` | Remove |
| `apps/web` | `tsconfig.json` | `@/orpc/*`, `@legacy-config` | Remove/Refactor |
| `tooling/scripts` | `tsconfig.json` | `@snapback/*` | Remove |
| `scripts` | `tsconfig.json` | `@snapback/*` | Remove |

### Medium Priority (Internal Aliases - Keep)

These are fine and should remain:
- `@/*`: `["./src/*"]` - Internal package alias
- `@vscode/*`: `["./src/*"]` - VSCode extension internal
- `@/modules/*`: `["./modules/*"]` - Next.js app structure

---

## Cleanup Changes

### 1. `packages/core/tsconfig.json`

**Before:**
```json
{
  "extends": "@snapback/tsconfig/package",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM"],
    "paths": {
      "@snapback/infrastructure": ["../infrastructure/src"],
      "@snapback/infrastructure/*": ["../infrastructure/src/*"],
      "@snapback/platform": ["../platform/src"],
      "@snapback/platform/*": ["../platform/src/*"]
    }
  },
  "references": [
    { "path": "../contracts" },
    { "path": "../config" },
    { "path": "../infrastructure" },
    { "path": "../platform" }
  ]
}
```

**After:**
```json
{
  "extends": "@snapback/tsconfig/package",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build", "**/*.test.ts", "**/*.spec.ts"],
  "references": [
    { "path": "../contracts" },
    { "path": "../config" },
    { "path": "../infrastructure" },
    { "path": "../platform" }
  ]
}
```

### 2. `packages/auth/tsconfig.json`

**Before:**
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@snapback/config": ["../config/src"],
    "@snapback/*": ["../*/src"],
    "@config": ["../../config"]
  }
}
```

**After:**
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

### 3. `tooling/scripts/tsconfig.json`

**Before:**
```json
{
  "paths": {
    "@snapback/*": ["../../packages/*"]
  }
}
```

**After:**
```json
{
  // Remove paths entirely - use package imports
}
```

### 4. `scripts/tsconfig.json`

**Before:**
```json
{
  "paths": {
    "@snapback/*": ["../packages/*"]
  }
}
```

**After:**
```json
{
  // Remove paths entirely - use package imports
}
```

### 5. `apps/web/tsconfig.json`

**Before:**
```json
{
  "paths": {
    "@/*": ["./"],
    "@/orpc/*": ["../apps/api/orpc/*"],  // Cross-app reference
    "@legacy-config": ["../../packages/config/src"],  // Direct src reference
    ...
  }
}
```

**After:**
```json
{
  "paths": {
    "@/*": ["./"],
    "@/modules/*": ["./modules/*"],
    "@/components/*": ["./components/*"],
    "@/lib/*": ["./lib/*"],
    "@/hooks/*": ["./hooks/*"],
    "@/types/*": ["./types/*"],
    "@analytics": ["./modules/analytics"],
    "@analytics/*": ["./modules/analytics/*"],
    "@marketing/*": ["./modules/marketing/*"],
    "@saas/*": ["./modules/saas/*"],
    "@ui/*": ["./modules/ui/*"],
    "@shared/*": ["./modules/shared/*"],
    ".source": ["./.source"],
    ".source/*": ["./.source/*"]
  }
}
```

**Additional Action Required:**
- Move shared oRPC types from `apps/api` to `packages/contracts`
- Import as `@snapback/contracts/orpc` instead of cross-app path

---

## Implementation Steps

### Phase 1: Safe Changes (No Code Changes Required)

1. **Remove redundant paths from `packages/core`**
   - Imports already use `@snapback/contracts` (works via pnpm)
   - `@snapback/infrastructure` and `@snapback/platform` are listed but likely unused

2. **Remove wildcard paths from `packages/auth`**
   - Keep `@/*` for internal use
   - Remove `@snapback/*`, `@config`

3. **Remove paths from `tooling/scripts` and `scripts`**
   - These should import built packages, not source

### Phase 2: Requires Code/Export Changes

1. **Move oRPC types to contracts package**
   ```bash
   # Create new export in packages/contracts
   packages/contracts/src/orpc/index.ts
   ```

2. **Update web imports**
   ```typescript
   // Before
   import { SomeType } from "@/orpc/types";

   // After
   import { SomeType } from "@snapback/contracts/orpc";
   ```

3. **Remove `@legacy-config` from web**
   - Use `@snapback/config` instead

---

## Verification Steps

After each change:

```bash
# 1. Clean build cache
pnpm turbo clean

# 2. Rebuild from scratch
pnpm build

# 3. Type check
pnpm type-check

# 4. Run tests
pnpm test
```

---

## TypeScript Monorepo Best Practices (Reference)

### The Resolution Stack

```
Import: "@snapback/infrastructure"
         ↓
1. pnpm workspace → node_modules/@snapback/infrastructure (symlink)
         ↓
2. package.json exports → dist/index.js, dist/index.d.ts
         ↓
3. TypeScript reads declarations from dist/
         ↓
4. Project references ensure build order
```

### When to Use Each Feature

| Feature | Use For | Example |
|---------|---------|---------|
| `paths` | Internal aliases ONLY | `@/*: ["./src/*"]` |
| `references` | Build order between packages | `{ "path": "../contracts" }` |
| `workspace:*` | Package linking | `"@snapback/core": "workspace:*"` |
| `exports` | Public API surface | `".": { "types": "./dist/..." }` |
| `composite` | Incremental builds | `"composite": true` |

### Anti-Patterns to Avoid

```json
// ❌ WRONG: Path to sibling package source
"paths": {
  "@snapback/core": ["../core/src"]
}

// ❌ WRONG: Path to parent directories
"paths": {
  "@config": ["../../config"]
}

// ❌ WRONG: Wildcard matching package pattern
"paths": {
  "@snapback/*": ["../*/src"]
}

// ✅ CORRECT: Internal alias only
"paths": {
  "@/*": ["./src/*"]
}
```

### Correct Import Pattern

```typescript
// ✅ Use package name (resolved via pnpm workspace)
import { Logger } from "@snapback/infrastructure";

// ✅ Use subpath export
import { createLogger } from "@snapback/infrastructure/logging/logger";

// ❌ Don't use relative paths to other packages
import { Logger } from "../../infrastructure/src/logging/logger";
```

---

## Learning Captured

**Pitfall**: tsconfig paths pointing to `"../package-name/src"` instead of package imports

**Action**: Remove cross-package paths from tsconfig.json. Rely on:
1. pnpm `workspace:*` protocol for linking
2. package.json exports for subpaths
3. TypeScript project references for build order

Only use paths for internal aliases like `@/*: ["./src/*"]`.

---

## Success Criteria

- [ ] All packages build with `pnpm build`
- [ ] Type checking passes with `pnpm type-check`
- [ ] No tsconfig paths reference `../package/src`
- [ ] IDE navigation goes to `.d.ts` files, not source
- [ ] Incremental builds work (changing one package invalidates dependents)
- [ ] All 200+ tests pass
