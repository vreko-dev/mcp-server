# SnapBack Bundle Optimization - Implementation Guide

This guide provides step-by-step instructions to implement the P0 fixes identified in the architecture review.

**Estimated Time**: 14 hours
**Goal**: Reduce bundle from 5.2MB to 2MB, add quality gates

---

## Phase 1: Bundle Optimization (8 hours)

### Step 1: Add Selective Exports to @snapback/core (4 hours)

**Current Problem**: Extension bundles 2.5MB of unused code from `@snapback/core`

**Files to modify**:
1. `packages/core/package.json`
2. `apps/vscode/src/activation/phase1-services.ts`
3. `apps/vscode/src/commands/utilityCommands.ts`
4. `apps/vscode/src/editorDecorations.ts`

**Implementation**:

```bash
# 1. Backup current package.json
cp packages/core/package.json packages/core/package.json.backup

# 2. Replace with new version
mv packages/core/package.json.new packages/core/package.json

# 3. Update extension imports
```

**File: apps/vscode/src/activation/phase1-services.ts**
```typescript
// OLD:
import { ServiceFederation } from "@snapback/core";

// NEW:
import { ServiceFederation } from "@snapback/core/mcp";
```

**File: apps/vscode/src/commands/utilityCommands.ts**
```typescript
// OLD:
import { MCPFallbacks, ServiceFederation } from "@snapback/core";

// NEW:
import { MCPFallbacks } from "@snapback/core/mcp-fallbacks";
import { ServiceFederation } from "@snapback/core/mcp";
```

**File: apps/vscode/src/editorDecorations.ts**
```typescript
// OLD:
import { RiskAnalyzer } from "@snapback/core";

// NEW:
import { RiskAnalyzer } from "@snapback/core/risk";
```

**Rebuild and verify**:
```bash
# Rebuild core package
pnpm --filter @snapback/core build

# Rebuild extension
pnpm --filter @snapback/vscode run compile:skip-check

# Check bundle size (should be ~2.7MB now)
ls -lh apps/vscode/dist/extension.js
```

**Expected Savings**: -2.5MB (-48%)

---

### Step 2: Lazy Load simple-git (2 hours)

**Create lazy loader**:

**File: apps/vscode/src/utils/git-lazy.ts** (NEW)
```typescript
import type { SimpleGit } from 'simple-git';

let gitInstance: SimpleGit | null = null;

/**
 * Get git instance, lazy-loading it on first use
 * Saves ~200KB from initial bundle and ~200ms activation time
 */
export async function getGit(): Promise<SimpleGit> {
  if (!gitInstance) {
    const { default: simpleGit } = await import('simple-git');
    gitInstance = simpleGit();
  }
  return gitInstance;
}

/**
 * Reset git instance (useful for testing)
 */
export function resetGit(): void {
  gitInstance = null;
}
```

**Find and replace all git usages**:
```bash
# Find all imports of simple-git
grep -r "import.*simple-git" apps/vscode/src/

# Replace with lazy loader
# Example for SnapshotManager:
```

**File: apps/vscode/src/snapshot/SnapshotManager.ts**
```typescript
// OLD:
import simpleGit from 'simple-git';
const git = simpleGit();

// NEW:
import { getGit } from '../utils/git-lazy.js';

// In methods:
async someMethod() {
  const git = await getGit();
  const status = await git.status();
}
```

**Rebuild and verify**:
```bash
pnpm --filter @snapback/vscode run compile:skip-check

# Check bundle size (should be ~2.5MB now)
ls -lh apps/vscode/dist/extension.js
```

**Expected Savings**: -200KB (-7%)

---

### Step 3: Advanced Minification (1 hour)

**File: apps/vscode/esbuild.config.cjs**

Replace the existing config with optimized version:

```javascript
const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ["./src/extension.ts"],
		bundle: true,
		format: "cjs",
		platform: "node",
		target: "node20",
		outfile: "dist/extension.js",

		// External dependencies
		external: [
			"vscode",
			"better-sqlite3",
		],

		// Minification (production only)
		minify: production,
		minifyWhitespace: production,
		minifyIdentifiers: production,
		minifySyntax: production,

		// Tree-shaking
		treeShaking: true,
		sideEffects: false,

		// Mangling
		mangleProps: production ? /^_/ : undefined,  // Mangle private props

		// Source maps (dev only)
		sourcemap: !production,
		sourcesContent: false,

		// Drop console/debugger in production
		drop: production ? ['console', 'debugger'] : [],

		// Legal comments
		legalComments: 'none',

		// Logging
		logLevel: "info",

		// Main fields for resolution
		mainFields: ["module", "main"],

		// Environment
		define: {
			"process.env.NODE_ENV": production ? '"production"' : '"development"',
			"process.env.VSCODE_EXTENSION": '"true"',
		},

		// Plugins
		plugins: [
			{
				name: "native-module-handler",
				setup(build) {
					// Handle better-sqlite3 (native module)
					build.onResolve({ filter: /^better-sqlite3/ }, (args) => {
						return { external: true, path: args.path };
					});

					// Handle pino-pretty (not needed in production)
					build.onResolve({ filter: /^pino-pretty$/ }, (args) => {
						return { path: args.path, namespace: "worker-stub" };
					});

					// Handle piscina (worker threads, not used)
					build.onResolve({ filter: /^piscina$/ }, (args) => {
						return { path: args.path, namespace: "worker-stub" };
					});

					// Stub for worker dependencies
					build.onLoad({ filter: /.*/, namespace: "worker-stub" }, () => {
						return { contents: "module.exports = {}", loader: "js" };
					});
				},
			},
		],
	});

	if (watch) {
		await ctx.watch();
		console.log("👀 Watching for changes...");
	} else {
		await ctx.rebuild();
		await ctx.dispose();

		// Log bundle size
		const fs = require("node:fs");
		const stats = fs.statSync("./dist/extension.js");
		const sizeKB = Math.round(stats.size / 1024);
		const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

		console.log("✅ Bundled successfully");
		console.log("📦 Output: dist/extension.js");
		console.log(`📊 Bundle size: ${sizeKB}KB (${sizeMB}MB)`);

		// Warn if over budget
		const budgetMB = 2;
		if (stats.size > budgetMB * 1024 * 1024) {
			console.warn(`⚠️  WARNING: Bundle exceeds ${budgetMB}MB budget`);
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
```

**Rebuild and verify**:
```bash
pnpm --filter @snapback/vscode run compile

# Check bundle size (should be ~2.0MB now)
ls -lh apps/vscode/dist/extension.js
```

**Expected Savings**: -500KB (-20%)

---

### Step 4: Add Bundle Size CI Check (1 hour)

**Already created**: `.github/workflows/bundle-size-check.yml`

**Test locally**:
```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act pull_request -W .github/workflows/bundle-size-check.yml
```

**Enable in repository**:
1. Push workflow file
2. Create a test PR
3. Verify workflow runs and comments on PR

---

## Phase 2: Quality Gates (3 hours)

### Step 5: Add Test Coverage Thresholds (1 hour)

**Replace vitest.config.ts**:
```bash
# Backup current config
cp vitest.config.ts vitest.config.ts.backup

# Use production config
cp vitest.config.production.ts vitest.config.ts
```

**Run tests with coverage**:
```bash
pnpm test:coverage

# Expected: Some tests might fail if coverage < 80%
```

**Add to CI** (`.github/workflows/test.yml`):
```yaml
- name: Run tests with coverage
  run: pnpm test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/coverage-final.json
```

---

### Step 6: Add Performance Budget Enforcement (1 hour)

**Already created**: `apps/vscode/scripts/enforce-performance-budget.js`

**Make executable**:
```bash
chmod +x apps/vscode/scripts/enforce-performance-budget.js
```

**Add to package.json**:

**File: apps/vscode/package.json**
```json
{
  "scripts": {
    "check:budget": "node scripts/enforce-performance-budget.js",
    "package": "pnpm run compile && pnpm run check:budget && ...",
  }
}
```

**Test**:
```bash
cd apps/vscode
pnpm run check:budget
```

---

### Step 7: Remove Ghost Storage Package (1 hour)

**Option A**: Implement the package (if needed)
```bash
mkdir packages/storage/src
# Add implementation
```

**Option B**: Remove it (RECOMMENDED)
```bash
# 1. Remove directory
rm -rf packages/storage

# 2. Remove from pnpm-workspace.yaml (if listed)
# Edit manually to remove "packages/storage"

# 3. Remove from dependencies
# Search all package.json files for "@snapback/storage"
grep -r '"@snapback/storage"' packages/ apps/

# 4. Update imports (if any)
# Move storage logic to @snapback/sdk
```

**Verify**:
```bash
pnpm install
pnpm build --filter="@snapback/*"
```

---

## Phase 3: DX Improvements (3 hours)

### Step 8: Add Recommended Extensions (15 min)

**Already created**: `.vscode/extensions.json`

**Commit and push**:
```bash
git add .vscode/extensions.json
git commit -m "chore: add recommended VSCode extensions"
```

---

### Step 9: Add GitHub Codespaces Config (30 min)

**Already created**: `.devcontainer/devcontainer.json`

**Test** (if you have Codespaces access):
1. Open repository in GitHub
2. Click "Code" → "Codespaces" → "New codespace"
3. Wait for environment to build
4. Run `pnpm build` to verify

---

### Step 10: Track TODOs as GitHub Issues (2 hours)

**Create script**:

**File: scripts/extract-todos.sh** (NEW)
```bash
#!/bin/bash
# Extract all TODO/FIXME markers and create GitHub issues

echo "# TODO Report - $(date)" > TODO_REPORT.md
echo "" >> TODO_REPORT.md

echo "Extracting TODOs..."
grep -rn "TODO\|FIXME\|HACK" apps/ packages/ --include="*.ts" --include="*.tsx" \
  | while IFS=: read -r file line content; do
    echo "- [ ] \`$file:$line\` - $content" >> TODO_REPORT.md
  done

echo "✅ TODO report generated: TODO_REPORT.md"
echo ""
echo "Next steps:"
echo "1. Review TODO_REPORT.md"
echo "2. Create GitHub issues for critical TODOs"
echo "3. Link TODOs to issue numbers in code"
echo "4. Remove or track all TODOs"
```

**Run**:
```bash
chmod +x scripts/extract-todos.sh
./scripts/extract-todos.sh

# Review
cat TODO_REPORT.md
```

**Create issues** (manual or via gh CLI):
```bash
# Install gh CLI
brew install gh  # macOS

# Authenticate
gh auth login

# Create issues from TODOs (example)
gh issue create \
  --title "TODO: Implement iteration tracking in SaveHandler" \
  --body "File: apps/vscode/src/extension.ts:213\nPriority: High" \
  --label "tech-debt,todo"
```

---

## Verification

### Final Bundle Size Check
```bash
# Clean and rebuild everything
pnpm clean
pnpm install
pnpm build --filter="@snapback/*" --filter="!@snapback/web"
pnpm --filter @snapback/vscode run compile

# Check size
ls -lh apps/vscode/dist/extension.js

# Run performance budget check
cd apps/vscode
pnpm run check:budget
```

**Expected Output**:
```
✅ Bundled successfully
📦 Output: dist/extension.js
📊 Bundle size: 2048KB (2.00MB)

🚀 SnapBack VSCode Extension - Performance Budget Enforcement

📦 Bundle Size Check
   Current: 2.00MB (2048KB)
   Budget:  2.00MB
   ✅ PASSED: 100.0% of budget used

✅ All performance budgets met!
```

---

## Success Criteria

- [ ] Bundle size ≤ 2MB
- [ ] CI workflow runs on PRs
- [ ] Test coverage thresholds enforced
- [ ] Performance budget check passes
- [ ] Storage package removed or implemented
- [ ] Recommended extensions configured
- [ ] Codespaces config working
- [ ] TODOs tracked in GitHub issues

---

## Timeline

| Day | Task | Hours | Status |
|-----|------|-------|--------|
| 1   | Selective exports + lazy git | 6 | ⬜ |
| 2   | Minification + CI | 2 | ⬜ |
| 3   | Quality gates | 3 | ⬜ |
| 4   | DX improvements | 3 | ⬜ |
| **Total** | | **14** | |

---

## Troubleshooting

### Bundle still > 2MB after selective exports

**Check what's being bundled**:
```bash
pnpm add -D esbuild-visualizer

# Add to esbuild.config.cjs:
const { visualizer } = require('esbuild-visualizer');
plugins: [visualizer({ filename: './bundle-analysis.html' })];

# Rebuild and open
pnpm build
open bundle-analysis.html
```

### Test coverage fails

**Temporarily lower thresholds**:
```typescript
// vitest.config.ts
thresholds: {
  lines: 60,  // Start lower, improve gradually
  functions: 60,
  branches: 50,
  statements: 60,
}
```

### CI workflow fails

**Run locally with act**:
```bash
act pull_request -W .github/workflows/bundle-size-check.yml --verbose
```

---

**Ready to implement?** Start with Phase 1, Step 1.
