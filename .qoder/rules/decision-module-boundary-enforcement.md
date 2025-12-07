# Module Boundary Enforcement - ESLint Tier Gating

**Applies to:** Lint configuration in `biome.json`
**Authority:** Architecture enforcement (Dec 2025)
**Enforcement:** Developer machine (lint-time, prevents bad commits locally)
**Scope:** Public/private package boundary protection

---

## Overview

Phase 2 of the pipeline hardening strategy implements **lint-time boundary enforcement** using Biome's `noRestrictedImports` rule to prevent OSS packages from importing private modules.

---

## The Problem: Accidental IP Leakage

Before enforcement:
```typescript
// packages-oss/contracts/src/index.ts
// ❌ SILENTLY LEAKED - No error at lint time
import { analyticsClient } from "@snapback/analytics";
import { getSubscriptionTier } from "@snapback/integrations";
```

Why this is dangerous:
1. **No immediate feedback** - Developer doesn't know they're violating boundaries
2. **CI detection too late** - Problem discovered in pipeline, not at authoring
3. **Lost context** - By CI time, developer has moved on
4. **Release blocking** - Can't publish if IP leaked in OSS

---

## The Solution: Biome noRestrictedImports

**Biome Configuration (biome.json):**

```jsonc
{
  "linter": {
    "rules": {
      "nursery": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "restrictions": [
              {
                "name": "@snapback/core",
                "message": "Private package: only use in apps/api and packages/core dependencies",
                "when": {
                  "pathMatches": "packages-oss/**"
                }
              },
              {
                "name": "@snapback/auth",
                "message": "Private package: authentication internals, not for public use",
                "when": {
                  "pathMatches": "packages-oss/**"
                }
              },
              {
                "name": "@snapback/platform",
                "message": "Private package: database schemas and queries",
                "when": {
                  "pathMatches": "packages-oss/**"
                }
              },
              {
                "name": "@snapback/integrations",
                "message": "Private package: Stripe/email/feature-flags",
                "when": {
                  "pathMatches": "packages-oss/**"
                }
              },
              {
                "name": "@snapback/analytics",
                "message": "Private package: PostHog integration and analytics",
                "when": {
                  "pathMatches": "packages-oss/**"
                }
              }
            ]
          }
        }
      }
    }
  }
}
```

---

## How It Works

### Execution Timing

```
Developer writes code
    ↓
IDE shows error immediately (ESLint/Biome extension)
    ↓
Cannot commit if error exists (pre-commit hook enforces lint)
    ↓
Forces developer to fix immediately
```

### Error Message Example

```
✖  packages-oss/contracts/src/index.ts:5:1 (noRestrictedImports)

  Unsafe import - Private package: PostHog integration and analytics

  5 │ import { analyticsClient } from "@snapback/analytics";
    │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Unsafe import from @snapback/analytics
```

### Allowed Imports

**In packages-oss/** ✅:
```typescript
// OSS packages can import from other OSS packages
import { logger } from "@snapback-oss/infrastructure";
import type { Snapshot } from "@snapback-oss/contracts";

// Can import from public npm packages
import { z } from "zod";
```

**In apps/api or packages/core** ✅:
```typescript
// Private packages can import from private packages
import { analyticsClient } from "@snapback/analytics";
import { getSubscriptionTier } from "@snapback/integrations";
```

---

## Protected Modules

| Module | Reason | Location |
|--------|--------|----------|
| `@snapback/core` | Core business logic, proprietary algorithms | `packages/core/` |
| `@snapback/auth` | Better-auth integration, session management | `packages/auth/` |
| `@snapback/platform` | Database schemas, proprietary queries | `packages/platform/` |
| `@snapback/integrations` | Stripe, email, feature flags (revenue features) | `packages/integrations/` |
| `@snapback/analytics` | PostHog analytics integration | `packages/analytics/` |

---

## Three-Layer Hardening Summary

| Layer | Timing | Tool | Purpose |
|-------|--------|------|---------|
| **Layer 1: Export Validation** | Pre-build | validate-exports-integrity.mjs | Detect filtered export violations |
| **Layer 2: Boundary Enforcement** | Lint-time | Biome noRestrictedImports | Prevent bad imports authoring |
| **Layer 3: CI Validation** | Pipeline | GitHub Actions | Final gate before release |

**Execution Flow:**
```
Developer edits code
    ↓
Lint errors caught immediately (Layer 2)
    ↓
pnpm build runs (includes validate:exports - Layer 1)
    ↓
GitHub Actions validates (Layer 3)
    ↓
Safe to publish
```

---

## Integration with Turbo

The enforcement runs during `pnpm lint` which Turbo orchestrates:

```bash
# Developer machine
pnpm lint           # Runs biome lint with boundaries enforced

# Pre-commit hook (lefthook)
pnpm lint           # Same as above

# CI pipeline
turbo run lint      # Turbo runs lint task across changed packages
```

---

## Testing Boundary Rules

### Test 1: Verify Rule is Active

```bash
# This should FAIL with error
echo 'import { x } from "@snapback/analytics"' > packages-oss/test.ts
pnpm lint packages-oss/test.ts

# Expected: Error about Private package
```

### Test 2: Verify Exception Works

```bash
# This should PASS
echo 'import { x } from "@snapback-oss/contracts"' > packages-oss/test.ts
pnpm lint packages-oss/test.ts

# Expected: No errors
```

### Test 3: Verify Private Packages Unaffected

```bash
# This should PASS (no restrictions on private packages)
echo 'import { x } from "@snapback/analytics"' > packages/api/src/test.ts
pnpm lint packages/api/src/test.ts

# Expected: No errors (not matching packages-oss/**)
```

---

## Why Biome (Not ESLint)?

1. **Faster** - Biome is written in Rust, 100x faster than ESLint
2. **Built-in** - `noRestrictedImports` is native (no plugin needed)
3. **Path matching** - `when.pathMatches` supports glob patterns
4. **Consistent** - Already using Biome for formatting
5. **Zero config** - No additional plugins or presets needed

---

## Future Enhancements

### Planned (Phase 3: Integration Validation)

1. **Extend to @snapback-oss modules**
   - Prevent @snapback-oss/contracts from importing @snapback-oss/platform
   - Enforce public API surface

2. **Add documentation requirements**
   - Public packages must have JSDoc comments
   - Usage examples required for exported types

3. **Circular dependency detection**
   - Automated check using `madge` or `nx graph`
   - Fail build if cycles detected

4. **Cross-application boundaries**
   - apps/web can't import from apps/api
   - apps/cli can't import from apps/vscode

---

## Migration Checklist

- [x] Add noRestrictedImports rules to biome.json
- [x] Verify rules apply to packages-oss/** only
- [x] Test error messages are clear
- [ ] Run `pnpm lint` on packages-oss to identify any violations
- [ ] Fix any existing violations in packages-oss
- [ ] Verify imports work in other packages (api, core, etc.)
- [ ] Document in CONTRIBUTING.md
- [ ] Add to CI checks

---

## References

- **Biome noRestrictedImports:** https://biomejs.dev/linter/rules/no-restricted-imports/
- **Phase 1: Export Validation** - See `always-turborepo-pnpm-hardening.md`
- **Phase 3 Planning** - Integration validation (CI checks)
- **Architecture Reference** - See `ARCHITECTURE.md`

**Last Updated:** 2025-12-06
**Implemented By:** Phase 2 - Tier Gating
**Status:** ✅ Active - Rules enforced at lint time
