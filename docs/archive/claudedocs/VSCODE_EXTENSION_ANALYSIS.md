# VSCode Extension Architecture Analysis

## Overview

**Size:** 2.1MB (source), 8,101 lines of TypeScript
**Structure:** Well-architected service-oriented design with dependency injection
**Build:** esbuild bundling to single `dist/extension.js`
**Dependencies:** Uses 3 monorepo packages + 4 external dependencies

---

## Current Architecture

### Monorepo Integration

**Workspace Dependencies:**

```json
{
	"@snapback/core": "workspace:*", // 420KB - Core business logic
	"@snapback/storage": "workspace:*", // 28KB - File system storage
	"@snapback/telemetry": "workspace:^" // 60KB - Analytics tracking
}
```

**External Dependencies:**

```json
{
	"async-lock": "^1.4.1", // Concurrency control
	"conf": "^15.0.0", // Configuration management
	"inquirer": "^12.9.6", // CLI prompts (⚠️ may not be needed in VSCode)
	"node-notifier": "^10.0.1" // System notifications
}
```

### @snapback/core Package Analysis

**Size:** 420KB
**Purpose:** Shared business logic between CLI, VSCode extension, and MCP server

**Key Features:**

-   MCP (Model Context Protocol) client integration
-   Service federation with circuit breakers
-   Git integration utilities
-   AI detection logic
-   Feature management
-   Guardian/protection framework

**Dependencies (20+ packages):**

```json
{
	"@modelcontextprotocol/sdk": "...", // MCP integration
	"simple-git": "...", // Git operations
	"pino": "...", // Logging
	"opossum": "...", // Circuit breaker
	"chokidar": "...", // File watching
	"madge": "...", // Dependency analysis
	"jscpd": "...", // Code duplication detection
	"mermaid": "..." // Diagram generation (❓ needed?)
	// ... 12 more
}
```

---

## Architecture Strengths ✅

### 1. Well-Designed Service Architecture

**Extension Entry Point** (`src/extension.ts`):

```typescript
// Excellent dependency injection pattern
const serviceFederation = new ServiceFederation(cwd);
const statusBar = new SnapBackStatusBar();
const notificationManager = new NotificationManager(context);
const operationCoordinator = new OperationCoordinator(
	serviceFederation,
	notificationManager,
	workspaceMemory
);
```

**Strengths:**

-   Clear separation of concerns
-   Proper dependency hierarchy
-   Well-documented initialization phases
-   Service-oriented design

### 2. Comprehensive Feature Set

**Views (7 total):**

-   Checkpoint Timeline
-   Risk Dashboard
-   Notifications
-   Workspace Context
-   Workflow Suggestions
-   Getting Started
-   File Protection

**Commands (14 total):**

-   Core: Create checkpoint, Snap back, Analyze risk
-   Advanced: Auto-checkpoint branch, Apply workflow suggestions
-   Monitoring: Toggle AI monitoring, Show status
-   Testing: MCP federation tests

### 3. Good Build Configuration

**esbuild config:**

```javascript
{
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  external: ["vscode"],  // ✅ Correctly excludes VSCode API
}
```

---

## Architecture Issues & Optimization Opportunities

### 🔴 CRITICAL: @snapback/core Package Bloat

**Problem:** Core package has 20+ dependencies for features not needed in VSCode extension.

**Unnecessary Dependencies for VSCode:**

```json
{
	"inquirer": "^12.9.6", // ❌ CLI prompts - VSCode has UI
	"mermaid": "^11.12.0", // ❌ Diagram generation - 5MB+ unused
	"madge": "...", // ❌ Dependency graphs - dev tool
	"jscpd": "...", // ❌ Code duplication - analyzer tool
	"yargs": "...", // ❌ CLI argument parsing - N/A in VSCode
	"listr2": "...", // ❌ CLI task lists - VSCode has progress API
	"pino-pretty": "..." // ❌ Pretty logging - VSCode has output channel
}
```

**Impact:**

-   Larger bundle size than necessary
-   Unused code in production
-   Slower extension activation
-   Increased memory footprint

**Recommendation:**

**Option 1: Split @snapback/core into focused packages**

```
packages/
├── core-shared/          # Truly shared logic (guardian, ai-detection)
├── core-cli/             # CLI-specific (inquirer, yargs, listr2)
├── core-vscode/          # VSCode-specific (no CLI deps)
└── core-mcp/             # MCP server-specific
```

**Option 2: Tree-shakeable exports with proper package.json**

```json
// packages/core/package.json
{
	"exports": {
		".": "./dist/index.js",
		"./guardian": "./dist/guardian.js",
		"./git": "./dist/git-integration.js",
		"./mcp": "./dist/mcp-client.js",
		"./ai": "./dist/ai-detection.js"
	},
	"sideEffects": false // Enable tree-shaking
}
```

**Estimated Savings:** 40-50% reduction in extension bundle size

---

### 🟡 IMPORTANT: Duplicate Dependencies

**Problem:** Extension package.json duplicates dependencies already in @snapback/core

**Duplicates:**

```
Extension package.json     @snapback/core package.json
├── conf: "^15.0.0"       ←→ cosmiconfig (similar purpose)
├── async-lock            ←→ (should be in core if needed)
└── inquirer              ←→ Already in core (unused in VSCode!)
```

**Recommendation:**

-   Remove `inquirer` from both (not needed in VSCode)
-   Consolidate config management to one approach
-   Move `async-lock` to core if it's shared logic

---

### 🟡 IMPORTANT: Missing from Monorepo Package Catalog

**Problem:** Extension uses external deps not in pnpm catalog

**Missing Catalog Entries:**

```yaml
# Should add to pnpm-workspace.yaml
catalogs:
    default:
        async-lock: 1.4.1
        async-retry: 1.3.3
        chokidar: 3.6.0
        cosmiconfig: 9.0.0
        "eslint-plugin-security": 3.0.1
        esprima: 4.0.1
        listr2: 8.3.0
        "lru-cache": 11.0.2
        madge: 8.0.0
        opossum: 8.1.4
        "p-limit": 6.1.0
        "pino-pretty": 13.0.0
        piscina: 4.8.0
        "simple-git": 3.27.0
        yargs: 17.7.2
```

---

### 🟢 RECOMMENDED: Build Optimization

**Current:** Single bundle includes everything

**Recommendation:** Optimize for extension size

```javascript
// esbuild.config.cjs enhancements
const ctx = await esbuild.context({
	// ... existing config ...

	// Add tree-shaking hints
	treeShaking: true,

	// Mark more as external if not needed
	external: [
		"vscode",
		"pino-pretty", // Use VSCode output channel instead
	],

	// Enable metafile for bundle analysis
	metafile: true,

	// Minify even in development for size
	minify: true,
	minifyWhitespace: true,
	minifyIdentifiers: production,
	minifySyntax: true,
});

// Analyze bundle
if (production) {
	const metafile = await ctx.rebuild();
	const analysis = await esbuild.analyzeMetafile(metafile.metafile);
	console.log(analysis);
}
```

---

### 🟢 RECOMMENDED: VSCode-Specific Optimizations

**Use VSCode APIs Instead of External Packages:**

**1. Replace `node-notifier` with VSCode notifications:**

```typescript
// CURRENT: External package
import notifier from "node-notifier";
notifier.notify({ title: "SnapBack", message: "Checkpoint created" });

// BETTER: Use VSCode API
vscode.window.showInformationMessage("Checkpoint created", {
	modal: false,
	detail: "Checkpoint saved successfully",
});
```

**2. Replace `conf` with VSCode workspace/global state:**

```typescript
// CURRENT: External package
import Conf from "conf";
const config = new Conf({ projectName: "snapback" });

// BETTER: Use VSCode state API
context.globalState.update("checkpointCount", count);
context.workspaceState.get("lastCheckpoint");
```

**3. Replace `pino` with VSCode output channel:**

```typescript
// CURRENT: External logger
import pino from "pino";
const logger = pino({ name: "snapback" });

// BETTER: Use VSCode output channel
const outputChannel = vscode.window.createOutputChannel("SnapBack");
outputChannel.appendLine("[INFO] Checkpoint created");
```

**Expected Savings:** Remove 3 external dependencies (~500KB)

---

## Test Coverage Analysis

**Total Test Files:** 29 test files

**Coverage:**

```
test/
├── unit/              15 tests (statusBar, notificationManager, etc.)
├── integration/       13 tests (MCP federation, git, fileSystem)
├── security/           1 test  (security validation)
└── errorHandling/      1 test  (error scenarios)
```

**Strengths:**

-   Good coverage of core functionality
-   Integration tests for external services (MCP, Git)
-   Security-focused testing

**Gaps:**

-   No E2E tests with actual VSCode instance
-   Limited testing of UI views
-   No performance/load testing

**Recommendation:**

```bash
# Add E2E tests using @vscode/test-electron
test/
├── e2e/
│   ├── checkpoint-workflow.test.ts
│   ├── view-interactions.test.ts
│   └── command-palette.test.ts
```

---

## Dependency Version Mismatches

**Issue:** VSCode extension uses different ESLint version than monorepo

```json
// apps/vscode/package.json
"eslint": "^8.57.1"  // ⚠️ Deprecated

// Root and other packages use Biome
```

**Recommendation:** Remove ESLint, use Biome consistently

```json
// Remove from apps/vscode/package.json
{
	"devDependencies": {
		// ❌ Remove these
		"@typescript-eslint/eslint-plugin": "^6.21.0",
		"@typescript-eslint/parser": "^6.21.0",
		"eslint": "^8.57.1"
	}
}
```

---

## TypeScript Configuration

**Current:** Custom tsconfig without project references

**Recommendation:** Enable project references for faster builds

```json
// apps/vscode/tsconfig.json
{
	"extends": "../../tooling/typescript/base.json",
	"compilerOptions": {
		"composite": true,
		"outDir": "./dist",
		"rootDir": "./src",
		"types": ["vscode", "node"]
	},
	"references": [
		{ "path": "../../packages/core" },
		{ "path": "../../packages/storage" },
		{ "path": "../../packages/telemetry" }
	],
	"include": ["src/**/*"],
	"exclude": ["node_modules", "out", "dist", "test"]
}
```

---

## Monorepo Integration Improvements

### 1. Shared Build Scripts

**Current:** Custom scripts in each app

**Recommendation:** Centralize in turbo.json

```json
// turbo.json
{
	"tasks": {
		"build:vscode": {
			"dependsOn": ["^build"],
			"inputs": ["src/**/*.ts", "esbuild.config.cjs", "package.json"],
			"outputs": ["dist/**"],
			"cache": true
		},
		"package:vscode": {
			"dependsOn": ["build:vscode"],
			"outputs": ["*.vsix"],
			"cache": false
		}
	}
}
```

### 2. Shared Development Workflow

**Add to root package.json:**

```json
{
	"scripts": {
		"dev:vscode": "pnpm --filter snapback-vscode run watch",
		"build:vscode": "pnpm --filter snapback-vscode run package",
		"test:vscode": "pnpm --filter snapback-vscode run test"
	}
}
```

---

## Performance Recommendations

### 1. Lazy Load Heavy Dependencies

**Problem:** All services loaded on activation

**Recommendation:** Lazy load views and heavy features

```typescript
// extension.ts
export async function activate(context: vscode.ExtensionContext) {
	// Load core immediately
	const statusBar = new SnapBackStatusBar();

	// Register views but don't create until needed
	vscode.window.registerTreeDataProvider("snapback.checkpointTimeline", {
		getTreeItem: (element) => element,
		getChildren: async () => {
			// Lazy load CheckpointTimelineView only when view is opened
			const { CheckpointTimelineView } = await import(
				"./checkpointTimelineView"
			);
			const view = new CheckpointTimelineView();
			return view.getChildren();
		},
	});
}
```

### 2. Enable Activation Events

**Current:** May activate too early

**Recommendation:** Optimize activation events

```json
// package.json
{
	"activationEvents": [
		"onStartupFinished", // Defer until after VSCode startup
		"onCommand:snapback.createCheckpoint",
		"onView:snapback.checkpointTimeline",
		"workspaceContains:**/.snapback/**" // Only in SnapBack projects
	]
}
```

---

## Security Considerations

### Current State

-   ✅ Has security tests
-   ✅ Uses `eslint-plugin-security` in core package
-   ⚠️ No dependency scanning in CI

### Recommendations

**1. Add dependency scanning:**

```yaml
# .github/workflows/vscode-extension.yml
- name: Security audit
  run: pnpm audit --prod

- name: Check for vulnerable dependencies
  run: pnpm outdated
```

**2. Sign VSCode extension:**

```bash
# Add to publish workflow
vsce publish --pat $VSCE_PAT --sign
```

---

## Recommendations Summary

### 🔴 High Priority (Immediate Impact)

1. **Split @snapback/core package** or enable tree-shaking

    - Remove unused dependencies (mermaid, madge, jscpd, inquirer)
    - **Impact:** 40-50% smaller extension bundle
    - **Effort:** 1-2 days

2. **Replace external deps with VSCode APIs**

    - Remove node-notifier → use VSCode notifications
    - Remove conf → use VSCode state API
    - Remove pino/pino-pretty → use output channel
    - **Impact:** -500KB, -3 dependencies
    - **Effort:** 0.5 days

3. **Add missing packages to catalog**
    - Ensure version consistency across monorepo
    - **Impact:** Better dependency management
    - **Effort:** 15 minutes

### 🟡 Medium Priority (Quality Improvements)

4. **Remove ESLint, use Biome**

    - Consistent with rest of monorepo
    - **Impact:** Faster linting
    - **Effort:** 0.5 days

5. **Enable TypeScript project references**

    - Faster incremental builds
    - **Impact:** 30% faster type checking
    - **Effort:** 1 day

6. **Optimize activation and lazy loading**
    - Faster extension startup
    - **Impact:** Better user experience
    - **Effort:** 1 day

### 🟢 Low Priority (Nice to Have)

7. **Add E2E tests**

    - Better coverage of UI interactions
    - **Effort:** 2 days

8. **Bundle size analysis**
    - Track and optimize over time
    - **Effort:** 0.5 days

---

## Current Bundle Analysis

**Estimated Current Bundle:**

```
dist/extension.js components:
├── Extension code (~50KB)
├── @snapback/core (~400KB with all deps)
├── @snapback/storage (~25KB)
├── @snapback/telemetry (~50KB)
├── async-lock (~5KB)
├── conf (~30KB)
├── inquirer (~200KB) ← UNUSED in VSCode!
└── node-notifier (~20KB)
---
Total: ~780KB (could be ~380KB with optimizations)
```

**After Optimizations:**

```
Optimized bundle:
├── Extension code (~50KB)
├── @snapback/core-vscode (~150KB - tree-shaken)
├── @snapback/storage (~25KB)
├── @snapback/telemetry (~50KB)
└── async-lock (~5KB)
---
Total: ~280KB (-64% reduction)
```

---

## Integration with Overall Monorepo

### Current State

-   ✅ Uses workspace protocol for internal deps
-   ✅ Separate build process with esbuild
-   ⚠️ Not integrated into main turbo.json tasks
-   ⚠️ Different tooling (ESLint vs Biome)
-   ⚠️ Manual testing (no CI integration)

### Recommended Integration

**1. Add to Turbo pipeline:**

```json
// turbo.json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**", ".vsix"]
		},
		"package:vscode": {
			"dependsOn": ["build"],
			"inputs": ["package.json", "README.md", "CHANGELOG.md"],
			"outputs": ["*.vsix"]
		}
	}
}
```

**2. Add to CI/CD:**

```yaml
# .github/workflows/ci.yml
jobs:
    test-vscode-extension:
        runs-on: ${{ matrix.os }}
        strategy:
            matrix:
                os: [ubuntu-latest, macos-latest, windows-latest]
        steps:
            - uses: actions/setup-node@v4
            - run: pnpm --filter snapback-vscode run test
            - run: pnpm --filter snapback-vscode run package
            - uses: actions/upload-artifact@v4
              with:
                  name: vscode-extension-${{ matrix.os }}
                  path: apps/vscode/*.vsix
```

---

## Conclusion

The VSCode extension is **well-architected** with good separation of concerns and comprehensive features. However, it suffers from **dependency bloat** inherited from the @snapback/core package and **inconsistent tooling** with the rest of the monorepo.

**Key Actions:**

1. Split or tree-shake @snapback/core to remove unused CLI/analyzer dependencies
2. Replace external dependencies with VSCode-native APIs
3. Integrate with monorepo tooling (Biome, Turbo, catalog)
4. Add to CI/CD pipeline for automated testing and building

**Expected Benefits:**

-   **64% smaller bundle** (780KB → 280KB)
-   **Faster extension activation** (lazy loading + smaller bundle)
-   **Better monorepo integration** (consistent tooling)
-   **Easier maintenance** (fewer dependencies to manage)
