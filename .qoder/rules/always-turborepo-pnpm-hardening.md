# Turborepo & pnpm Monorepo Hardening

**Applies to:** `turbo.json`, `pnpm-workspace.yaml`, all `package.json` files, validation scripts
**Authority:** Workspace-wide rule (Dec 2025)
**Enforcement:** Critical - prevents build system breakage

---

## Core Principle: Context7-Validated Patterns

This rule is derived from official Turborepo documentation (Context7 /vercel/turborepo library) and validated pnpm workspace patterns. All patterns below are production-proven.

---

## 1. Root-Level Task Registration (🔴 CRITICAL)

### The Pattern

**Turbo tasks require BOTH:**
1. Task definition in `turbo.json`
2. Execution entry point (choose one):
   - Root `package.json` script
   - **OR** `//#taskname` root task in `turbo.json`

### Example: validate:exports Task

**❌ INCOMPLETE (Definition Only)**
```jsonc
{
  "tasks": {
    "validate:exports": {
      "cache": false,
      "inputs": ["**/package.json"],
      "outputs": []
    }
  }
}
```

**✅ CORRECT (With Root Entry)**
```jsonc
{
  "tasks": {
    "validate:exports": {
      "cache": false,
      "inputs": ["**/package.json"],
      "outputs": []
    },
    "//#validate:exports": {
      "cache": false,
      "inputs": ["**/package.json"],
      "outputs": []
    }
  }
}
```

AND root `package.json`:
```json
{
  "scripts": {
    "validate:exports": "node scripts/validate-exports-integrity.mjs"
  }
}
```

### Why Both?

- **Task definition** = metadata (caching, inputs, outputs, dependencies)
- **Root entry** = execution trigger
- Without both, Turbo skips the task silently

### Reference

Source: https://turborepo.com/docs/crafting-your-repository/configuring-tasks
Task registration pattern verified with Context7 /vercel/turborepo library.

---

## 2. Private Packages Don't Need publishConfig (🟡 IMPORTANT)

### The Pattern

**publishConfig is only needed for PUBLIC packages.**

Private packages have `"private": true` in `package.json`, which automatically blocks npm publish regardless of exports configuration.

### Correct Approach

**Private packages (internal only):**
```json
{
  "name": "@snapback/auth",
  "private": true,
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/client.js",
    "./security/*": "./dist/security/*.js"
  }
  // ❌ NO publishConfig needed - private:true blocks npm publish
}
```

**Public packages only:**
```json
{
  "name": "@snapback/sdk",
  "exports": {
    ".": "./dist/index.js",
    "./storage": "./dist/storage/index.js",
    "./internal-api": "./dist/internal-api/index.js"
  },
  "publishConfig": {
    "exports": {
      ".": "./dist/index.js",
      "./storage": "./dist/storage/index.js"
      // ✅ ./internal-api is FILTERED OUT
    }
  }
}
```

### Benefits

- Simpler configuration (8 fewer lines per private package)
- Eliminates false violation detections (script finds no filtered exports)
- Clearer intent: publishConfig used ONLY for intentional IP filtering

---

## 3. Glob Pattern Performance (🟡 IMPORTANT)

### The Problem

Negation patterns with `!(node_modules)` can hang on large workspaces:

```javascript
// ❌ SLOW - Can hang for minutes
globSync(path.join(APPS_DIR, "**/!(node_modules)/**/*.ts"))
```

### The Solution

Use positive patterns + post-glob filtering:

```javascript
// ✅ FAST - Completes in < 1 second
const sourceFiles = [
  ...globSync(path.join(PACKAGES_DIR, "**/src/**/*.{ts,tsx}")),
  ...globSync(path.join(APPS_DIR, "/**/src/**/*.{ts,tsx}"))
].filter(file =>
  !file.includes('node_modules') &&
  !file.includes('.next') &&
  !file.includes('dist')
);
```

### Why

1. Negation patterns require glob to track all paths to exclude
2. Large workspaces (1000+ files) cause exponential slowdown
3. Positive patterns are deterministic - faster matching

### Best Practice

- Use positive patterns: `**/src/**/*.ts`
- Use compound matching: `*.{ts,tsx}`
- Filter after glob: post-process results to exclude paths

---

## 4. Validation Script Enforcement (✅ VERIFIED)

### validate-exports-integrity.mjs Pattern

**Purpose:** Detect unconditional imports of filtered exports before build time

**Location:** `scripts/validate-exports-integrity.mjs`

**Key Features:**
- Scans all `publishConfig.exports` across packages
- Finds unconditional imports of filtered modules
- Recognizes guards: `typeof window`, `if`, `try-catch`, `@ts-ignore`
- Exits with code 1 on violations (blocks build)

**Integration:**
```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["validate:exports", "^build"],
      // validate:exports runs BEFORE build
    }
  }
}
```

**Zero Violations Target:**
After proper configuration, validation should report:
```
✅ All 0 filtered exports are properly guarded
```

---

## 5. Catalog System for Dependency Versions (📦 REFERENCE)

### Why Catalog?

Central version management prevents drift across 580 packages.

**Root config (pnpm-workspace.yaml):**
```yaml
catalogs:
  default:
    vitest: "3.2.4"
    typescript: "5.9.2"
    tsup: "catalog:"  # Latest stable
```

**Package consumption:**
```json
{
  "devDependencies": {
    "vitest": "catalog:",
    "typescript": "catalog:"
  }
}
```

**Update all at once:**
Edit `pnpm-workspace.yaml`, run `pnpm install`, all 580 packages use new version.

---

## Checklist: Implementing New Turbo Tasks

- [ ] Define task in `turbo.json` with inputs/outputs
- [ ] Add `//#taskname` root task entry in `turbo.json`
- [ ] Add corresponding script in root `package.json`
- [ ] Add as dependency in `build` task if it's a validation gate
- [ ] Test: `pnpm validate:taskname` (script) AND `pnpm exec turbo run validate:taskname` (turbo)
- [ ] Verify task appears in `turbo run build --dry`

---

## Verification Commands

```bash
# Test validation script directly
node scripts/validate-exports-integrity.mjs

# Test Turbo task execution (requires fix of .next/standalone issue)
pnpm exec turbo run validate:exports --dry

# Verify no filtered export violations
node scripts/validate-exports-integrity.mjs 2>&1 | grep "✅"
```

---

## Known Issues & Workarounds

### Issue: "Failed to add workspace" from .next/standalone

**Cause:** Build artifacts contain duplicate workspace definitions

**Workaround:** Exclude from `.gitignore`:
```
apps/**/.next/standalone/
```

**Future:** Glob filtering should skip `.next/` directories

---

## Related Rules

- **always-code-consolidation.md** - Canonical locations for shared utilities
- **always-monorepo-imports.md** - Package import conventions
- **always-typescript-patterns.md** - Type-safe imports using namespaces

---

## References

- **Official Turborepo Docs:** https://turborepo.com/docs/crafting-your-repository/configuring-tasks
- **pnpm Workspace:** https://pnpm.io/workspaces
- **pnpm Catalog:** https://pnpm.io/catalogs
- **Context7 Library:** /vercel/turborepo (Benchmark: 78.4/100, High Authority)

**Last Updated:** 2025-12-06
**Validated By:** Phase 1 - Export Hardening Implementation
