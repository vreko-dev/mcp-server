# Import Violations - Technical Fix Guide

**This guide provides step-by-step implementations to fix the 255 import violations.**

---

## Quick Reference: What Needs Fixing

- **255 files** have relative imports crossing package boundaries
- **475 total import statements** need updating
- **Mostly test files** (200+) and **API procedures** (80+)
- **Solutions range from config-only to structural refactoring**

---

## Phase 1: Configuration-Based Fix (1-2 Hours)

### Step 1.1: Create vitest config for apps/vscode tests

**File:** `apps/vscode/vitest.config.ts`

```typescript
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Map test imports to source files
      "@snapback/vscode": path.resolve(__dirname, "./src"),
      "@snapback/vscode/config": path.resolve(__dirname, "./src/config"),
      "@snapback/vscode/services": path.resolve(__dirname, "./src/services"),
      "@snapback/vscode/storage": path.resolve(__dirname, "./src/storage"),
      "@snapback/vscode/types": path.resolve(__dirname, "./src/types"),
      "@snapback/vscode/utils": path.resolve(__dirname, "./src/utils"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "src"],
  },
});
```

**Then update test files from:**
```typescript
import { getProtectionLevel } from "../../../src/config/merge";
```

**To:**
```typescript
import { getProtectionLevel } from "@snapback/vscode/config/merge";
```

### Step 1.2: Configure apps/api TypeScript paths

**File:** `apps/api/tsconfig.json`

Add to `compilerOptions.paths`:
```json
{
  "compilerOptions": {
    "paths": {
      "@snapback/api": ["./src/index.ts"],
      "@snapback/api/lib": ["./src/lib/index.ts"],
      "@snapback/api/services": ["./src/services/index.ts"],
      "@snapback/api/orpc": ["./src/orpc/procedures.ts"],
      "@snapback/api/middleware": ["./src/middleware/index.ts"]
    }
  }
}
```

**Then update source files from:**
```typescript
import { adminProcedure } from "../../../orpc/procedures";
```

**To:**
```typescript
import { adminProcedure } from "@snapback/api/orpc";
```

### Step 1.3: Create tsconfig for test files in apps/api

**File:** `apps/api/tsconfig.test.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@snapback/api": ["./src/index.ts"],
      "@snapback/api/lib": ["./src/lib/index.ts"],
      "@snapback/api/services": ["./src/services/index.ts"]
    }
  },
  "include": ["**/*.test.ts", "**/*.spec.ts"]
}
```

### Step 1.4: Update web app Next.js config

**File:** `apps/web/next.config.js`

Ensure `@/` alias is configured:
```javascript
// next.config.js already has this, verify it:
const nextConfig = {
  // ... other config
};
```

**File:** `apps/web/tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@snapback/web": ["./src"]
    }
  }
}
```

### Step 1.5: Configure packages test vitest

**File:** `packages/core/vitest.config.ts`

```typescript
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@snapback/core": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
  },
});
```

**Repeat for:**
- `packages/sdk/vitest.config.ts`
- `packages/platform/vitest.config.ts`
- etc.

---

## Phase 2: Update Import Statements

### Option A: Automated Search & Replace

**This script updates the 10 most common violations:**

```bash
#!/bin/bash
cd /Users/user1/WebstormProjects/SnapBack-Site

# API orpc imports
find apps/api -name "*.ts" -type f | xargs sed -i '' \
  -e 's|from ['"'"'"]\.\./\.\./\.\./orpc/procedures['"'"'"]|from "@snapback/api/orpc"|g'

# API services/database
find apps/api -name "*.ts" -type f | xargs sed -i '' \
  -e 's|from ['"'"'"]\.\./\.\./\.\./src/services/database['"'"'"]|from "@snapback/api/services"|g'

# VSCode protected registry
find apps/vscode -name "*.ts" -type f | xargs sed -i '' \
  -e 's|from ['"'"'"]\.\./\.\./\.\./src/services/protectedFileRegistry['"'"'"]|from "@snapback/vscode/services"|g'

# VSCode types
find apps/vscode -name "*.ts" -type f | xargs sed -i '' \
  -e 's|from ['"'"'"]\.\./\.\./\.\./src/types/snapbackrc\.types['"'"'"]|from "@snapback/vscode/types"|g'

# VSCode storage
find apps/vscode -name "*.ts" -type f | xargs sed -i '' \
  -e 's|from ['"'"'"]\.\./\.\./\.\./src/storage/types['"'"'"]|from "@snapback/vscode/storage"|g'

echo "✅ Top 5 patterns updated!"
```

**Save as:** `/tmp/fix_top_imports.sh` and run:
```bash
chmod +x /tmp/fix_top_imports.sh
bash /tmp/fix_top_imports.sh
```

### Option B: Manual Updates for Critical Files

**Edit these files (covering 60% of violations):**

```
apps/api/modules/admin/procedures/*.ts          # 5 files
apps/api/modules/analytics/procedures/*.ts      # 12 files
apps/api/middleware/__tests__/*.ts               # 3 files
apps/vscode/test/unit/config/*.test.ts           # 8 files
apps/vscode/test/unit/services/*.test.ts         # 10 files
```

Example replacement:

```typescript
// BEFORE:
import { getDb } from "../../../src/services/database";

// AFTER:
import { getDb } from "@snapback/api/services";
```

---

## Phase 2B: Organize Tests (Recommended)

### Step 2B.1: Move test files to source directory

**Instead of:**
```
apps/vscode/
├── src/
│   ├── config/
│   │   └── merge.ts
└── test/
    └── unit/
        └── config/
            └── merge.test.ts
```

**Do this:**
```
apps/vscode/
└── src/
    ├── config/
    │   ├── merge.ts
    │   └── __tests__/
    │       └── merge.test.ts
```

**Script to move tests:**
```bash
#!/bin/bash

# For VSCode extension
cd /Users/user1/WebstormProjects/SnapBack-Site/apps/vscode

# Move config tests
mkdir -p src/config/__tests__
mv test/unit/config/*.test.ts src/config/__tests__/ 2>/dev/null

# Move services tests
mkdir -p src/services/__tests__
mv test/unit/services/*.test.ts src/services/__tests__/ 2>/dev/null

# Move storage tests
mkdir -p src/storage/__tests__
mv test/unit/storage/*.test.ts src/storage/__tests__/ 2>/dev/null

# Update imports in moved tests (remove ../)
find src -name "*.test.ts" -type f -exec sed -i '' \
  -e 's|from ['"'"'"]\.\.\/\.\./\.\./src/|from "@snapback/vscode/|g' {} \;

echo "✅ Tests relocated to src/__tests__"
```

---

## Phase 3: Create Public API Barrels

### Step 3.1: Create apps/api/src/index.ts

```typescript
// Public API exports from apps/api

// ORPC Procedures
export * from "./orpc/procedures";

// Services
export * from "./services/database";
export * from "./services/guardian";

// Lib
export * from "./lib/logger";
export * from "./lib/redis-client";

// Types
export * from "./types";

// Middleware
export * from "./middleware/api-key-scope";
export * from "./middleware/csrf-protection";
```

### Step 3.2: Create apps/vscode/src/index.ts

```typescript
// Public API exports from VSCode extension

// Config
export * from "./config/configurationManager";
export * from "./config/merge";

// Services
export * from "./services/protectionService";
export * from "./services/WorkspaceManager";

// Storage
export * from "./storage/SqliteStorageAdapter";

// Types
export * from "./types/snapbackrc.types";

// Utils
export * from "./utils/logger";
export * from "./utils/projectRoot";
```

### Step 3.3: Create apps/web/src/index.ts

```typescript
// Public API exports from web app

// Config
export * from "./config";

// Hooks
export * from "./hooks";

// Components
export * from "./components";

// Utils
export * from "./utils";
```

---

## Validation & Testing

### Step 4.1: Type checking

```bash
# Check all TypeScript compiles
pnpm type-check

# Or per-app:
cd apps/api && pnpm type-check
cd apps/vscode && pnpm type-check
cd apps/web && pnpm type-check
```

### Step 4.2: Run tests

```bash
# VSCode tests
pnpm --filter @snapback/vscode test

# API tests
pnpm --filter @snapback/api test

# Web tests
pnpm --filter @snapback/web test

# All packages
pnpm test
```

### Step 4.3: Verify no remaining violations

```bash
# Check for any remaining ../../.. imports
find apps packages -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/.next/*" \
  -exec grep -l "from ['\"]\.\.\/\.\.\/\.\.\/" {} \; | wc -l

# Should output: 0
```

---

## Rollback Plan

If issues arise during implementation:

### Before any changes, create a backup branch:
```bash
git checkout -b backup/pre-import-fix
git push origin backup/pre-import-fix
```

### If something breaks:
```bash
# Revert to backup
git reset --hard origin/backup/pre-import-fix

# Or selectively revert
git checkout origin/main -- apps/vscode/vitest.config.ts
```

---

## Phase 1: Config-Only (Safe to commit immediately)

Files to commit:
```
apps/vscode/vitest.config.ts (new)
apps/api/tsconfig.test.json (new)
apps/web/tsconfig.json (updated paths)
```

These are **non-breaking** - old code still works, tests just have alias options.

---

## Phase 2: Search & Replace (Review carefully)

1. **Create feature branch:**
   ```bash
   git checkout -b refactor/fix-import-violations
   ```

2. **Run one automated fix at a time:**
   ```bash
   # Fix one pattern
   find apps/api -name "*.ts" | xargs sed -i '' \
     -e 's|from ['"'"'"]\.\./\.\./\.\./orpc/procedures['"'"'"]|from "@snapback/api/orpc"|g'

   # Test
   pnpm --filter @snapback/api test

   # Commit
   git commit -m "fix: update orpc imports to use path aliases"
   ```

3. **Repeat for each pattern** (don't do all at once)

---

## Phase 2B: Test Reorganization (Careful!)

1. **Create new test directories:**
   ```bash
   mkdir -p apps/vscode/src/config/__tests__
   ```

2. **Move ONE test at a time:**
   ```bash
   mv apps/vscode/test/unit/config/merge.test.ts \
      apps/vscode/src/config/__tests__/merge.test.ts
   ```

3. **Update its imports:**
   ```typescript
   // Old
   import { merge } from "../../../src/config/merge";

   // New
   import { merge } from "../merge";
   ```

4. **Run tests:**
   ```bash
   pnpm test
   ```

5. **Commit:**
   ```bash
   git commit -m "chore: move config tests to src/__tests__"
   ```

---

## Monitoring & Enforcement

### Add pre-commit hook validation

**File:** `.lefthook.yml` (update existing)

```yaml
pre-commit:
  commands:
    no-cross-package-imports:
      glob: "apps/**/*.ts" "packages/**/*.ts"
      run: |
        FILES=$(git diff --cached --name-only)
        VIOLATIONS=$(echo "$FILES" | xargs grep -l "from ['\"]\.\.\/\.\.\/\.\.\/\.\.\/" 2>/dev/null | wc -l)
        if [ $VIOLATIONS -gt 0 ]; then
          echo "❌ Cross-package relative imports detected in staged files!"
          echo "Use @snapback/* package aliases instead"
          exit 1
        fi
```

### Add ESLint rule (Optional, Phase 3)

```typescript
// .eslintrc.json
{
  "rules": {
    "no-relative-imports": [
      "error",
      {
        "basePath": ".",
        "patterns": [
          {
            "from": "apps/\\w+/src/",
            "toPattern": "@snapback/\\w+"
          }
        ]
      }
    ]
  }
}
```

---

## Estimated Time Per Phase

| Phase | Task | Time | Risk |
|-------|------|------|------|
| **1** | Create config files | 30 min | Low |
| **1** | Update top 5 patterns (automated) | 30 min | Low |
| **2** | Manual updates remaining patterns | 1-2 hrs | Medium |
| **2B** | Move test files | 2-3 hrs | Medium |
| **3** | Create barrel exports | 1-2 hrs | Low |
| **4** | Validation & testing | 1-2 hrs | Low |
| **Total** | | **6-10 hours** | **Medium** |

---

## For Each Developer

### If you want to help:

1. **Pick one location:**
   - `apps/api/modules/admin/procedures/` → Fix 5 files
   - `apps/vscode/test/unit/config/` → Move 8 tests
   - `packages/core/test/` → Update 3 test files

2. **Follow the pattern:**
   - Branch: `git checkout -b refactor/fix-imports-{area}`
   - Change: Apply fixes to that area only
   - Test: `pnpm test`
   - Commit: `git commit -m "fix: update {area} imports to use aliases"`

3. **Create PR with:**
   - Description of what area was fixed
   - Before/after import examples
   - Test results

---

## Questions?

**Reference files:**
- `IMPORT_VIOLATIONS_INVENTORY.md` - Full list of 255 files
- `IMPORT_VIOLATIONS_INVENTORY.csv` - Machine-readable format
- `IMPORT_VIOLATIONS_SUMMARY.md` - Decision guide
- `always-monorepo-imports.md` - Monorepo standards

**See commits:**
- Look for previous import standardization work
- Check `.lefthook.yml` for existing validation

---

**Status:** Ready to implement 🚀

**Next step:** Assign a developer to Phase 1 (configuration) - takes 1-2 hours and provides immediate value.
