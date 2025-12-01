# SnapBack Clients Migration Requirements

**Document Version**: 1.0
**Created**: 2025-10-01
**Purpose**: Ensure zero functionality loss when migrating from nested monorepo to flat structure

---

## Executive Summary

**Current State**: Nested monorepo at `clients/snapback-clients/` (3 apps, 5 packages, 101 test files)
**Target State**: Flat structure integrated into main monorepo (apps/ and packages/ at root)
**Risk Level**: MEDIUM - Multiple workspace protocol dependencies, complex build pipelines, VS Code marketplace integration
**Test Coverage**: 17,268 lines of test code across 101 files

---

## 1. Functionality Inventory

### 1.1 Applications

#### VS Code Extension (apps/vscode)

-   **Size**: 1.1M (largest component)
-   **Version**: 0.1.0
-   **Marketplace**: snapback-vscode
-   **Main Entry**: `dist/extension.js` (bundled via esbuild)

**Core Features**:

-   **Commands** (16 total):

    -   Checkpoint management (create, snapBack, timeline)
    -   Protection system (file protection, risk analysis)
    -   AI monitoring (toggle, status, auto-suggestions)
    -   MCP federation testing
    -   Workflow suggestions
    -   View refresh

-   **Views & UI Components**:

    -   Activity bar integration with shield icon
    -   Checkpoint Timeline view
    -   Risk Dashboard
    -   Notifications panel
    -   Workspace Context view
    -   Workflow Suggestions
    -   File Protection (explorer integration)
    -   Getting Started/Welcome view

-   **Context Menus**:
    -   Explorer context (checkpoint, snapBack, protection status)
    -   Editor context (protect file, analyze risk)
    -   SCM integration (auto-checkpoint branch)

**Build Pipeline**:

-   esbuild bundler (CJS format, Node20 target)
-   Production minification + sourcemaps
-   TypeScript compilation (dual: production + test configs)
-   VSIX packaging with workspace dependency resolution
-   VS Code test runner (separate from vitest)

**Dependencies**:

-   `@snapback/core`: 0.1.0 (workspace)
-   `@snapback/storage`: 0.1.0 (workspace)
-   `@snapback/telemetry`: workspace:^
-   External: async-lock, conf, node-notifier

**Test Infrastructure**:

-   **Total**: ~70 test files
-   **Types**: unit, integration, e2e, performance, security
-   **Frameworks**:
    -   Mocha (VS Code test runner)
    -   Playwright (E2E in chromium)
    -   Custom test runner (`out/test/runTest.js`)
-   **Test Directories**:
    -   `test/unit/` - Component unit tests
    -   `test/integration/` - Cross-component tests
    -   `test/e2e/` - Playwright browser tests
    -   `test/performance/` - Performance benchmarks
    -   `test/security/` - Security validation
    -   `test/helpers/` - Test utilities
    -   `test/errorHandling/` - Error scenarios

#### CLI Tool (apps/cli)

-   **Size**: 56K
-   **Version**: 0.1.0
-   **Package**: @snapback/cli
-   **Main Entry**: `dist/index.js` (bin command)

**Core Features**:

-   Interactive CLI with inquirer prompts
-   File tree selection
-   Colored output (chalk)
-   Spinner/progress (ora)
-   Checkpoint analysis commands
-   Git integration for snapshots

**Build Pipeline**:

-   TypeScript compilation only (no bundling)
-   Standard Node.js ESM output
-   Executable shebang support

**Dependencies**:

-   `@snapback/core`: workspace:\*
-   `@snapback/storage`: workspace:\*
-   External: chalk, commander, inquirer, ora, esprima

**Test Infrastructure**:

-   **Total**: 3 test files
-   **Framework**: Vitest with coverage
-   **Commands**: test, test:watch, test:coverage

#### MCP Server (apps/mcp-server)

-   **Size**: 28K
-   **Version**: 0.1.0
-   **Package**: @snapback/mcp-server (private)
-   **Main Entry**: `dist/index.js`
-   **Protocol**: Model Context Protocol SDK v0.5.0

**Core Features**:

-   MCP server implementation
-   Context protocol handling
-   Integration with core guardian logic
-   Storage abstraction layer

**Build Pipeline**:

-   TypeScript compilation
-   Node ESM with ts-node loader for dev
-   Standard Node.js deployment

**Dependencies**:

-   `@modelcontextprotocol/sdk`: ^0.5.0
-   `@snapback/contracts`: workspace:\*
-   `@snapback/core`: workspace:\*
-   `@snapback/storage`: workspace:\*

**Test Infrastructure**:

-   **Total**: 1 test file
-   **Framework**: Vitest with coverage
-   **Commands**: test, test:watch, test:coverage

### 1.2 Shared Packages

#### @snapback/core (packages/core)

-   **Size**: 360K (largest package)
-   **Version**: 0.1.0
-   **Purpose**: Core business logic and algorithms

**Exports** (from index.ts):

-   `ai-detection` - AI code detection
-   `dependency-analyzer` - Code dependency analysis
-   `guardian` - Core guardian logic (12KB file)
-   `feature-manager` - Feature flag management
-   `threat-detection` - Security threat detection
-   `circuit-breaker` - Resilience patterns
-   `git-integration` - Git operations (6KB)
-   `mcp-federation` - MCP server federation (13KB + 11KB tests)
-   `mcp-fallbacks` - Fallback strategies
-   `mcp-client` - MCP client implementation (10KB + 5KB tests)
-   `utils/circuit-breaker` - Circuit breaker utilities
-   `utils/concurrency` - Concurrency helpers
-   `utils/cache` - Caching utilities
-   `utils/watcher` - File watching
-   `utils/logger` - Logging (pino + pino-pretty)

**Dependencies**:

-   `@snapback/config`: workspace:\*
-   `@snapback/contracts`: workspace:\*
-   Heavy external deps:
    -   `@modelcontextprotocol/sdk`: ^0.5.0
    -   `@typescript-eslint/parser`: ^8.44.1
    -   eslint ecosystem (v9.36.0 + security plugin)
    -   Code analysis: esprima, jscpd, madge
    -   Utilities: async-retry, chokidar, cosmiconfig, dotenv
    -   Performance: lru-cache, p-limit, piscina (worker threads)
    -   Visualization: mermaid
    -   Git: simple-git
    -   Resilience: opossum (circuit breaker)
    -   CLI: listr2, yargs
    -   Logging: pino, pino-pretty

**Test Infrastructure**:

-   **Total**: ~27 test files
-   Unit tests for all major modules
-   Integration tests for MCP components
-   Test files: `*.test.ts` pattern

#### @snapback/storage (packages/storage)

-   **Size**: 52K
-   **Version**: 0.1.0
-   **Purpose**: Storage abstraction layer

**Exports**:

-   `interface` - Storage interface contracts
-   `adapters/fs` - Filesystem adapter implementation

**Dependencies**:

-   `@snapback/contracts`: workspace:\*

**Test Infrastructure**:

-   Framework: Vitest with coverage

#### @snapback/contracts (packages/contracts)

-   **Size**: 36K
-   **Version**: 0.1.0
-   **Purpose**: Shared DTOs, schemas, event bus

**Exports**:

-   `schemas` - Zod schema definitions
-   `eventBus` - Event bus implementation
-   `features` - Feature flag schemas

**Dependencies**:

-   `zod`: ^3.23.0 (only external dependency)

**Test Infrastructure**:

-   Framework: Vitest with coverage

#### @snapback/config (packages/config)

-   **Size**: 16K
-   **Version**: 0.1.0
-   **Purpose**: Configuration defaults

**Exports**:

-   Configuration schemas and defaults

**Dependencies**:

-   `@snapback/contracts`: workspace:\*

**Build**:

-   TypeScript compilation only
-   No tests configured

#### @snapback/telemetry (packages/telemetry)

-   **Size**: 32K
-   **Version**: 1.0.0
-   **Purpose**: Telemetry and feature flags

**Exports**:

-   Telemetry collection
-   Feature flag management
-   Analytics integration

**Dependencies**:

-   `@snapback/contracts`: workspace:\*
-   `@snapback/core`: workspace:\*
-   `posthog-node`: ^3.6.3

**Test Infrastructure**:

-   Framework: Vitest with coverage

---

## 2. Dependency Mapping

### 2.1 Internal Dependency Graph

```
┌─────────────────────────────────────────────────┐
│ APPS                                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  vscode extension                               │
│  ├─→ @snapback/core (0.1.0)                    │
│  ├─→ @snapback/storage (0.1.0)                 │
│  └─→ @snapback/telemetry (workspace:^)         │
│                                                 │
│  cli                                            │
│  ├─→ @snapback/core (workspace:*)              │
│  └─→ @snapback/storage (workspace:*)           │
│                                                 │
│  mcp-server                                     │
│  ├─→ @snapback/contracts (workspace:*)         │
│  ├─→ @snapback/core (workspace:*)              │
│  └─→ @snapback/storage (workspace:*)           │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ PACKAGES                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  core (360K)                                    │
│  ├─→ @snapback/config (workspace:*)            │
│  └─→ @snapback/contracts (workspace:*)         │
│                                                 │
│  telemetry (32K)                                │
│  ├─→ @snapback/contracts (workspace:*)         │
│  └─→ @snapback/core (workspace:*)              │
│                                                 │
│  storage (52K)                                  │
│  └─→ @snapback/contracts (workspace:*)         │
│                                                 │
│  config (16K)                                   │
│  └─→ @snapback/contracts (workspace:*)         │
│                                                 │
│  contracts (36K)                                │
│  └─→ (no internal deps - foundation)           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 Build Order Dependencies

**Critical Build Order** (from turbo.json):

1. `contracts` - No dependencies, builds first
2. `config` - Depends on contracts
3. `storage` - Depends on contracts
4. `core` - Depends on config + contracts
5. `telemetry` - Depends on contracts + core
6. `mcp-server` - Depends on contracts + core + storage
7. `cli` - Depends on core + storage
8. `vscode` - Depends on core + storage + telemetry

### 2.3 Workspace Protocol Patterns

**All internal dependencies use workspace protocol**:

-   `workspace:*` - Most common (links to any version)
-   `workspace:^` - Used by vscode → telemetry (caret range)
-   Fixed versions (0.1.0) - Used by vscode for core/storage

**Import Resolution**:

-   All imports use `@snapback/` scope
-   TypeScript path mapping not used (relies on workspace resolution)
-   Example: `import { Guardian } from "@snapback/core"`

---

## 3. Build Requirements

### 3.1 Monorepo Configuration

**Root package.json**:

-   **Workspaces**: `packages/*`, `apps/*`
-   **Package Manager**: pnpm@9.12.0 (enforced via preinstall)
-   **Node Version**: >=20.0.0
-   **Build Command**: `pnpm -r --filter ./packages... --filter ./apps... run build`
-   **Dev Command**: `pnpm -r --parallel --filter ./apps... run dev`
-   **Test Commands**:
    -   `test`: Run all tests
    -   `test:coverage`: Coverage across all packages
    -   `test:unit`: Unit tests only
    -   `test:ci`: lint + typecheck + test:unit
    -   `test:full`: test:ci + test:coverage

**Turbo Configuration** (turbo.json):

```json
{
	"pipeline": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**"]
		},
		"test": {
			"dependsOn": ["build"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		}
	}
}
```

**Workspace Configuration** (pnpm-workspace.yaml):

```yaml
packages:
    - "apps/*"
    - "packages/*"
```

### 3.2 TypeScript Configuration

**Base Config** (tsconfig.base.json):

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ESNext",
		"moduleResolution": "Node",
		"allowSyntheticDefaultImports": true,
		"esModuleInterop": true,
		"declaration": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"strict": true,
		"noEmitOnError": false,
		"types": ["node"],
		"lib": ["ES2022"]
	}
}
```

**Package-Level Configs**:

-   All packages extend `tsconfig.base.json`
-   Each has own `tsconfig.json` with specific settings
-   VS Code has 3 configs:
    -   `tsconfig.json` - Main extension code
    -   `tsconfig.production.json` - Production builds
    -   `tsconfig.test.json` - Test compilation

### 3.3 Build Scripts by Component

#### VS Code Extension

```json
{
	"compile": "check-types && node esbuild.config.cjs",
	"watch": "npm-run-all -p watch:*",
	"watch:esbuild": "node esbuild.config.cjs --watch",
	"package": "check-types && node esbuild.config.cjs --production",
	"compile-tests": "tsc -p tsconfig.test.json --outDir out",
	"vscode:prepublish": "npm run package",
	"package-vsix": "node scripts/package-vsix.cjs"
}
```

**esbuild Configuration**:

-   Entry: `src/extension.ts`
-   Format: CJS (VS Code requirement)
-   Platform: node
-   Target: node20
-   External: Only `vscode` module
-   Bundle: true (bundles all @snapback/\* packages)
-   Output: `dist/extension.js`

**VSIX Packaging**:

-   Custom script resolves workspace:\* dependencies
-   Creates temporary package.json with fixed versions
-   Runs `vsce package --no-dependencies`
-   Restores original package.json
-   Output: `snapback-vscode-0.1.0.vsix`

#### CLI Tool

```json
{
	"build": "tsc -p tsconfig.json",
	"dev": "tsx src/index.ts"
}
```

-   No bundling, standard TypeScript compilation
-   ESM output to `dist/`
-   Executable via `bin` field

#### MCP Server

```json
{
	"build": "tsc -p tsconfig.json",
	"dev": "node --loader ts-node/esm src/index.ts",
	"start": "node dist/index.js"
}
```

-   No bundling, standard TypeScript compilation
-   ESM output to `dist/`
-   Stdio-based MCP protocol

#### Packages (All)

```json
{
	"build": "tsc"
}
```

-   Standard TypeScript compilation
-   ESM output to `dist/`
-   Declaration files generated

### 3.4 Code Quality Tools

**Biome** (replaces ESLint + Prettier):

-   Version: ^1.9.4
-   Commands available in all packages:
    -   `lint`: Check code quality
    -   `lint:fix`: Auto-fix issues
    -   `format`: Format code
    -   `check`: Lint + format
-   Configuration in root `biome.json` (not in clients dir)

**VS Code Specific**:

-   Still uses ESLint for extension code
-   `@typescript-eslint/eslint-plugin`: ^6.7.3
-   `eslint`: ^8.57.1

---

## 4. Testing Requirements

### 4.1 Test Statistics

**Total Test Coverage**:

-   **Files**: 101 test files in clients directory
-   **Lines**: 17,268 lines of test code
-   **Distribution**:
    -   VS Code: ~70 files (unit, integration, e2e, performance, security)
    -   Core package: ~27 files
    -   CLI: 3 files
    -   MCP server: 1 file
    -   Other packages: Test infrastructure present

### 4.2 Test Frameworks by Component

#### VS Code Extension

**Multiple Test Systems**:

1. **Unit/Integration Tests** (Mocha):

    - Runner: VS Code Test Runner
    - Entry: `out/test/runTest.js`
    - Config: `tsconfig.test.json`
    - Compilation: `tsc -p tsconfig.test.json --outDir out`
    - Command: `node ./out/test/runTest.js`
    - Test directories:
        - `test/unit/` - Component isolation
        - `test/integration/` - Component interaction
        - `test/errorHandling/` - Error scenarios
        - `test/helpers/` - Test utilities

2. **E2E Tests** (Playwright):

    - Config: `playwright.config.ts`
    - Directory: `test/e2e/`
    - Browser: Chromium
    - Commands:
        - `test:e2e`: Playwright UI mode
        - `test:e2e:ui`: Interactive mode
    - Timeout: 30s per test, 5s expectations
    - CI: Retries 2x, sequential workers

3. **Performance Tests**:

    - Directory: `test/performance/`
    - Focus: Extension performance benchmarks
    - Metrics: Activation time, memory usage

4. **Security Tests**:
    - Directory: `test/security/`
    - Focus: Security validation
    - Checks: Input validation, XSS, injection

**Test Dependencies**:

-   `@playwright/test`: ^1.55.1
-   `@types/mocha`: ^10.0.1
-   `mocha`: ^10.2.0
-   `@types/sinon`: ^17.0.4
-   `glob`: ^10.3.3

**Pre-test Requirements**:

-   Compile tests: `compile-tests`
-   Compile extension: `compile`
-   Run linting: `lint`

#### CLI, MCP, Packages (Vitest)

**Unified Test System**:

-   Framework: Vitest ^3.2.0
-   Coverage: @vitest/coverage-v8 ^3.2.4
-   UI: @vitest/ui ^3.2.0 (optional)
-   Commands (each package):
    -   `test`: `vitest run`
    -   `test:watch`: `vitest`
    -   `test:coverage`: `vitest run --coverage`

**Root-Level Test Commands**:

```json
{
	"test": "pnpm -r run test",
	"test:coverage": "pnpm -r run test:coverage",
	"test:unit": "pnpm -r run test:unit",
	"test:watch": "pnpm -r run test:watch",
	"test:ui": "pnpm -r run test:ui",
	"test:ci": "pnpm lint && pnpm typecheck && pnpm test:unit",
	"test:full": "pnpm test:ci && pnpm test:coverage"
}
```

### 4.3 Test Execution Dependencies

**Build Requirements**:

-   Tests depend on successful build (from turbo.json)
-   Must run `pnpm build` before tests
-   VS Code tests require both extension and test compilation

**Parallel Execution**:

-   Vitest tests can run in parallel across packages
-   VS Code tests run sequentially (VS Code Test Runner)
-   Playwright can parallelize within test suite

**CI Environment**:

-   GitHub Actions: ubuntu-latest, node 20.x
-   Test sequence: typecheck → lint → build → test
-   Coverage reports generated and uploaded

---

## 5. Deployment & Distribution

### 5.1 VS Code Extension Publishing

**Marketplace**:

-   **Name**: SnapBack
-   **Display Name**: SnapBack
-   **Description**: AI-Powered Code Guardian
-   **Version**: 0.1.0
-   **Engine**: vscode ^1.75.0
-   **Publisher**: (requires VSCE_PAT secret)

**Publishing Pipeline** (GitHub Actions):

```yaml
Workflow: publish-extension.yml
Trigger: Release published OR manual dispatch
Steps: 1. Checkout code
    2. Setup pnpm 9.12.0
    3. Setup Node.js 20.x
    4. Install dependencies
    5. Build extension (pnpm compile)
    6. Package VSIX (pnpm package-vsix)
    7. Publish to marketplace (vsce publish)
Environment: VSCE_PAT secret required
```

**Local Installation**:

1. Run `pnpm package-vsix` in apps/vscode
2. Install VSIX: `code --install-extension snapback-vscode-0.1.0.vsix`
3. Or via VS Code UI: Extensions → "..." → Install from VSIX

**VSIX Structure**:

-   Main bundle: `dist/extension.js` (bundled with dependencies)
-   Package metadata from `package.json`
-   Extension manifest: `contributes` section
-   Icon and assets (if present)

### 5.2 CLI Package Distribution

**NPM Package**:

-   **Name**: @snapback/cli
-   **Version**: 0.1.0
-   **Type**: module (ESM)
-   **Main**: dist/index.js
-   **Bin**: `snapback` → dist/index.js

**Distribution**:

-   Published to npm registry (requires npm token)
-   Users install: `npm install -g @snapback/cli`
-   Executable: `snapback <command>`

**Build for Distribution**:

1. Run `pnpm build` (compiles TypeScript)
2. Output to `dist/` directory
3. Include `dist/` in npm package
4. Shebang in index.js for executable

### 5.3 MCP Server Deployment

**Deployment Options**:

1. **Stdio Mode**: Direct process execution

    - Run: `node dist/index.js`
    - Used by MCP clients via stdio

2. **Docker**: Containerized deployment (potential)

    - Not currently configured
    - Would need Dockerfile

3. **Service**: System service deployment
    - Not currently configured
    - Would need systemd/init scripts

**Current Usage**:

-   Development: `pnpm --filter @snapback/mcp-server dev`
-   Production: `node dist/index.js` (after build)
-   Private package (not published to npm)

### 5.4 GitHub Actions CI/CD

**Workflow Files** (.github/workflows/):

1. **ci-cd.yml**: Master pipeline orchestrator

    - Calls other workflows in sequence
    - Deploy preview for PRs
    - Release on main branch push

2. **build-and-test.yml**: Build verification

    - Node 20.x matrix
    - Install → Typecheck → Lint → Build → Test
    - Build VS Code extension
    - Package VSIX
    - Upload artifact

3. **code-quality.yml**: Quality gates

    - Linting checks
    - Type checking
    - Format validation

4. **e2e-tests.yml**: End-to-end testing

    - VS Code extension E2E tests
    - Playwright execution
    - Browser-based validation

5. **security-scan.yml**: Security audit

    - Dependency auditing
    - Vulnerability scanning
    - Security validation

6. **dependency-update.yml**: Automated maintenance

    - Weekly dependency updates
    - Automated PR creation

7. **publish-extension.yml**: Marketplace publishing

    - Triggered on release or manual
    - Builds and publishes to VS Code Marketplace
    - Requires VSCE_PAT secret

8. **update-version.yml**: Version management
    - Automated version bumping
    - Release preparation

**Required Secrets**:

-   `VSCE_PAT`: VS Code Marketplace Personal Access Token
-   Potentially: `NPM_TOKEN` for CLI publishing

---

## 6. Risk Assessment

### 6.1 High-Risk Areas (⚠️ CRITICAL)

#### Workspace Protocol Resolution

**Risk**: Import path breakage when moving packages

-   **Impact**: Build failures, runtime errors
-   **Affected**: All apps depend on workspace:\* packages
-   **Mitigation Required**:
    -   Update all `workspace:*` references
    -   Verify package.json `name` fields match import paths
    -   Test with `pnpm install` after move
    -   Validate TypeScript can resolve all @snapback/\* imports

#### VS Code Extension Bundling

**Risk**: esbuild bundle resolution with new paths

-   **Impact**: Extension won't load or crashes at runtime
-   **Affected**: All bundled @snapback/\* packages in extension
-   **Mitigation Required**:
    -   Verify esbuild can resolve workspace packages from new location
    -   Test bundle output includes all dependencies
    -   Validate bundle size remains similar (~same KB)
    -   Test extension activation after migration

#### VSIX Packaging Script

**Risk**: `package-vsix.cjs` hardcodes workspace structure

-   **Impact**: Cannot create VSIX for marketplace publishing
-   **Code Location**: `apps/vscode/scripts/package-vsix.cjs:65-78`
-   **Current Logic**:
    ```javascript
    const depPackagePath = path.join(
    	this.workspaceRoot,
    	"packages", // ← HARDCODED PATH
    	depName.replace("@snapback/", ""),
    	"package.json"
    );
    ```
-   **Mitigation Required**:
    -   Update path resolution to find packages at root
    -   Change from `../../packages/` to `../../../packages/`
    -   Test VSIX creation after migration
    -   Verify workspace:\* resolution still works

#### GitHub Actions Workflow Paths

**Risk**: CI/CD workflows reference old directory structure

-   **Impact**: CI/CD pipelines fail, no automated builds/tests
-   **Affected Files**:
    -   `.github/workflows/build-and-test.yml` - `cd apps/vscode`
    -   `.github/workflows/publish-extension.yml` - `cd apps/vscode`
    -   All workflows that reference clients directory
-   **Mitigation Required**:
    -   Update all `cd` commands to new paths
    -   Verify workflow jobs reference correct directories
    -   Test workflows in PR before merge
    -   May need to update filter paths for workflow triggers

### 6.2 Medium-Risk Areas (⚡ IMPORTANT)

#### Test Path References

**Risk**: Test configurations reference old paths

-   **Impact**: Tests won't run or fail unexpectedly
-   **Affected**:
    -   `playwright.config.ts`: Test directory paths
    -   VS Code test runner: `out/test/runTest.js`
    -   Mocha test imports
-   **Mitigation Required**:
    -   Verify all test paths are relative to package root
    -   Update any absolute path references
    -   Run full test suite after migration

#### TypeScript Configuration Inheritance

**Risk**: tsconfig.base.json path resolution

-   **Impact**: Compilation errors, missing types
-   **Affected**: All packages extending base config
-   **Current**: `"extends": "../../tsconfig.base.json"`
-   **New**: `"extends": "../../tsconfig.base.json"` (same, but need to verify)
-   **Mitigation Required**:
    -   Verify tsconfig paths after move
    -   Check that all packages still extend correct base
    -   Test typecheck across all packages

#### Turbo Pipeline Configuration

**Risk**: Turbo cache invalidation with new paths

-   **Impact**: Build cache issues, slower builds
-   **Affected**: All build operations
-   **Mitigation Required**:
    -   Verify turbo.json outputs still correct
    -   Clear turbo cache after migration
    -   Test build performance after move

#### Import Path Consistency

**Risk**: Mixed import styles break after move

-   **Impact**: Runtime errors, missing modules
-   **Affected**: 10+ import statements using @snapback/\* scope
-   **Examples**:
    ```typescript
    import { ServiceFederation } from "@snapback/core";
    import { FileSystemStorage } from "@snapback/storage";
    import type { Guardian } from "@snapback/core";
    ```
-   **Mitigation Required**:
    -   Verify all imports use package scope (✓ already correct)
    -   Test runtime resolution in all apps
    -   Check for any relative imports between packages (should be none)

### 6.3 Low-Risk Areas (✓ ROUTINE)

#### Documentation Updates

**Risk**: README and docs reference old paths

-   **Impact**: Developer confusion, incorrect instructions
-   **Mitigation**: Update all markdown files with new structure

#### Biome Configuration

**Risk**: Linting/formatting config at wrong level

-   **Impact**: Inconsistent code style
-   **Note**: Main monorepo already has biome.json at root
-   **Mitigation**: Remove or merge clients biome config

#### Package Versions

**Risk**: Version number conflicts with main monorepo

-   **Impact**: Dependency resolution issues
-   **Note**: All client packages at 0.1.0 or 1.0.0
-   **Mitigation**: Review and align with monorepo versioning strategy

---

## 7. Migration Checklist

### 7.1 Pre-Migration Verification

**Environment Setup**:

-   [ ] Current branch clean (no uncommitted changes)
-   [ ] All tests passing in current structure
-   [ ] Record current test results:
    ```bash
    cd clients/snapback-clients
    pnpm test > /tmp/test-baseline.txt
    ```
-   [ ] Create backup branch: `git checkout -b backup-clients-$(date +%Y%m%d)`
-   [ ] Verify pnpm workspace configuration in root
-   [ ] Check for naming conflicts with existing packages

**Test Baseline Capture**:

-   [ ] Run and record all unit tests: `pnpm test:unit`
-   [ ] Run and record VS Code tests: `cd apps/vscode && npm test`
-   [ ] Run and record E2E tests: `cd apps/vscode && npm run test:e2e`
-   [ ] Run and record coverage: `pnpm test:coverage`
-   [ ] Verify all 101 test files found and executed
-   [ ] Note any existing test failures (should be none)

**Build Verification**:

-   [ ] Clean build all packages: `pnpm clean && pnpm build`
-   [ ] Verify all dist/ directories created
-   [ ] Record build times for comparison
-   [ ] Test VS Code extension VSIX creation: `cd apps/vscode && pnpm package-vsix`
-   [ ] Verify VSIX file created successfully

**Documentation Audit**:

-   [ ] List all files referencing directory structure
-   [ ] Identify hardcoded paths in source code
-   [ ] Document current import patterns
-   [ ] Review CI/CD workflow paths

### 7.2 Migration Steps

**Phase 1: Prepare Target Structure**

-   [ ] Create new directories at root (if not exist):
    -   `apps/` (likely exists)
    -   `packages/` (likely exists)
-   [ ] Verify root pnpm-workspace.yaml includes:
    -   `apps/*`
    -   `packages/*`
-   [ ] Check for naming conflicts:
    -   No existing `apps/cli`, `apps/mcp-server`, `apps/vscode`
    -   No existing packages with @snapback/\* names

**Phase 2: Move Applications**

-   [ ] Move with git to preserve history:
    ```bash
    # From repository root
    git mv clients/snapback-clients/apps/vscode apps/extension-vscode
    git mv clients/snapback-clients/apps/cli apps/cli
    git mv clients/snapback-clients/apps/mcp-server apps/mcp-server
    ```
-   [ ] Update package.json names if needed:
    -   `snapback-vscode` → keep or rename
    -   `@snapback/cli` → keep
    -   `@snapback/mcp-server` → keep

**Phase 3: Move Packages**

-   [ ] Move with git to preserve history:
    ```bash
    # From repository root
    git mv clients/snapback-clients/packages/core packages/client-core
    git mv clients/snapback-clients/packages/config packages/client-config
    git mv clients/snapback-clients/packages/contracts packages/client-contracts
    git mv clients/snapback-clients/packages/storage packages/client-storage
    git mv clients/snapback-clients/packages/telemetry packages/client-telemetry
    ```
-   [ ] Update package.json names:
    -   `@snapback/core` → `@snapback/client-core`
    -   `@snapback/config` → `@snapback/client-config`
    -   `@snapback/contracts` → `@snapback/client-contracts`
    -   `@snapback/storage` → `@snapback/client-storage`
    -   `@snapback/telemetry` → `@snapback/client-telemetry`

**Phase 4: Update Dependencies**

-   [ ] Update all app package.json dependencies:
    -   Replace `@snapback/core` → `@snapback/client-core`
    -   Replace `@snapback/storage` → `@snapback/client-storage`
    -   Replace `@snapback/contracts` → `@snapback/client-contracts`
    -   Replace `@snapback/config` → `@snapback/client-config`
    -   Replace `@snapback/telemetry` → `@snapback/client-telemetry`
-   [ ] Update all package internal dependencies
-   [ ] Keep `workspace:*` protocol intact

**Phase 5: Update Import Statements**

-   [ ] Find all imports:
    ```bash
    grep -r "@snapback/" apps/extension-vscode/src/
    grep -r "@snapback/" apps/cli/src/
    grep -r "@snapback/" apps/mcp-server/src/
    ```
-   [ ] Replace in all source files:
    -   `@snapback/core` → `@snapback/client-core`
    -   `@snapback/storage` → `@snapback/client-storage`
    -   `@snapback/contracts` → `@snapback/client-contracts`
    -   `@snapback/config` → `@snapback/client-config`
    -   `@snapback/telemetry` → `@snapback/client-telemetry`
-   [ ] Update test imports as well

**Phase 6: Update Build Configurations**

-   [ ] Update `package-vsix.cjs` in extension-vscode:
    ```javascript
    // Line 65-70: Update path resolution
    const depPackagePath = path.join(
    	this.workspaceRoot,
    	"packages", // Now resolves to root/packages
    	depName.replace("@snapback/", "client-"), // Updated prefix
    	"package.json"
    );
    ```
-   [ ] Update any tsconfig.json paths if they reference old structure
-   [ ] Verify esbuild.config.cjs doesn't hardcode paths (looks clean)

**Phase 7: Update CI/CD Workflows**

-   [ ] Update workflow paths in all .github/workflows files:
    -   `build-and-test.yml`: Update `cd apps/vscode` → `cd apps/extension-vscode`
    -   `publish-extension.yml`: Update paths
    -   Any workflow filters on `clients/**` paths
-   [ ] Update path filters for workflow triggers
-   [ ] Verify workflow environment variables

**Phase 8: Update Documentation**

-   [ ] Update main README.md with new structure
-   [ ] Update INSTALLATION_INSTRUCTIONS.md
-   [ ] Update any package-specific READMEs
-   [ ] Update contributor documentation
-   [ ] Update architecture diagrams if present

**Phase 9: Install Dependencies**

-   [ ] Clean install from root:
    ```bash
    pnpm clean:deps  # Remove all node_modules
    pnpm install     # Reinstall with new structure
    ```
-   [ ] Verify no installation errors
-   [ ] Check that workspace links created correctly

### 7.3 Post-Migration Validation

**Build Verification**:

-   [ ] Clean build all packages: `pnpm clean:build && pnpm build`
-   [ ] Verify all packages build successfully
-   [ ] Compare build times to baseline
-   [ ] Check all dist/ directories created
-   [ ] Verify no TypeScript errors: `pnpm typecheck`

**Test Suite Execution**:

-   [ ] Run all unit tests: `pnpm test:unit`
-   [ ] Compare results to baseline (all 101 files)
-   [ ] Run VS Code tests: `cd apps/extension-vscode && npm test`
-   [ ] Run Playwright E2E: `cd apps/extension-vscode && npm run test:e2e`
-   [ ] Run coverage: `pnpm test:coverage`
-   [ ] Verify test counts match baseline
-   [ ] All tests must pass (same as baseline)

**Application Testing**:

-   [ ] **VS Code Extension**:

    -   [ ] Build extension: `cd apps/extension-vscode && pnpm compile`
    -   [ ] Check bundle size (should be similar to before)
    -   [ ] Package VSIX: `pnpm package-vsix`
    -   [ ] Verify VSIX created successfully
    -   [ ] Install VSIX in VS Code
    -   [ ] Test extension activation
    -   [ ] Test all 16 commands
    -   [ ] Verify views render correctly
    -   [ ] Check for console errors

-   [ ] **CLI Tool**:

    -   [ ] Build: `cd apps/cli && pnpm build`
    -   [ ] Test CLI execution: `pnpm dev -- analyze ./README.md`
    -   [ ] Verify commands work
    -   [ ] Test interactive prompts

-   [ ] **MCP Server**:
    -   [ ] Build: `cd apps/mcp-server && pnpm build`
    -   [ ] Test server start: `pnpm start`
    -   [ ] Verify MCP protocol works
    -   [ ] Test with MCP client

**Code Quality**:

-   [ ] Run linting: `pnpm lint`
-   [ ] No new linting errors introduced
-   [ ] Run formatting check: `pnpm format`
-   [ ] Type checking: `pnpm typecheck`

**CI/CD Validation**:

-   [ ] Push migration to feature branch
-   [ ] Verify GitHub Actions workflows trigger
-   [ ] All workflow jobs pass
-   [ ] No path errors in logs
-   [ ] VSIX artifact created and uploaded
-   [ ] Test publish-extension workflow (dry run if possible)

**Integration Testing**:

-   [ ] Test workspace protocol resolution
-   [ ] Verify package interdependencies work
-   [ ] Test cross-package imports at runtime
-   [ ] Verify no circular dependency issues
-   [ ] Check that external dependencies resolve correctly

**Performance Comparison**:

-   [ ] Compare build times to baseline
-   [ ] Compare test execution times
-   [ ] Check bundle sizes haven't changed significantly
-   [ ] Verify no memory leaks or performance regressions

**Documentation Review**:

-   [ ] All documentation updated
-   [ ] Installation instructions tested
-   [ ] Developer setup guide validated
-   [ ] No references to old structure remain

### 7.4 Rollback Procedure

**If Critical Issues Found**:

1. **Stop immediately** - Don't commit broken state
2. **Document the issue** - Record what failed
3. **Revert git changes**:
    ```bash
    git reset --hard backup-clients-YYYYMMDD
    ```
4. **Clean workspace**:
    ```bash
    pnpm clean:deps
    pnpm install
    pnpm build
    ```
5. **Verify rollback successful**:
    ```bash
    pnpm test
    cd apps/vscode && pnpm package-vsix
    ```
6. **Analyze failure** - Review what went wrong
7. **Update migration plan** - Address gaps
8. **Retry migration** - With updated procedures

**Rollback Verification**:

-   [ ] All tests pass after rollback
-   [ ] Builds work correctly
-   [ ] VS Code extension packages successfully
-   [ ] No workspace or dependency errors

---

## 8. Acceptance Criteria

### 8.1 Functional Requirements

**All Tests Pass**:

-   ✓ 101 test files execute successfully
-   ✓ Same test count as baseline
-   ✓ No new test failures introduced
-   ✓ Coverage metrics maintained or improved
-   ✓ All test types run: unit, integration, e2e, performance, security

**All Applications Build**:

-   ✓ VS Code extension compiles and bundles
-   ✓ CLI tool builds and is executable
-   ✓ MCP server builds and runs
-   ✓ All packages build successfully
-   ✓ No TypeScript compilation errors

**All Applications Run**:

-   ✓ VS Code extension activates without errors
-   ✓ All 16 extension commands work
-   ✓ Extension views render correctly
-   ✓ CLI commands execute successfully
-   ✓ MCP server accepts connections and processes requests

**Dependencies Resolve**:

-   ✓ All workspace:\* dependencies link correctly
-   ✓ No missing module errors
-   ✓ Package interdependencies work
-   ✓ External dependencies install correctly
-   ✓ No version conflicts

### 8.2 Build Requirements

**Clean Builds**:

-   ✓ `pnpm clean:build && pnpm build` succeeds
-   ✓ All dist/ directories created
-   ✓ Build times within 10% of baseline
-   ✓ No build warnings or errors

**Type Safety**:

-   ✓ `pnpm typecheck` passes all packages
-   ✓ No TypeScript errors
-   ✓ Declaration files generated correctly

**Code Quality**:

-   ✓ `pnpm lint` passes (no new errors)
-   ✓ Code formatting consistent
-   ✓ No quality regressions

### 8.3 Distribution Requirements

**VS Code Extension**:

-   ✓ VSIX packages successfully
-   ✓ VSIX installs in VS Code
-   ✓ Extension loads without errors
-   ✓ Bundle size similar to baseline (within 5%)
-   ✓ All features functional post-install
-   ✓ Can publish to marketplace (test in staging if possible)

**CLI Package**:

-   ✓ Builds with correct bin entry
-   ✓ Can install globally
-   ✓ Commands execute correctly
-   ✓ Help and documentation work

**MCP Server**:

-   ✓ Starts successfully
-   ✓ Accepts MCP protocol connections
-   ✓ Processes requests correctly
-   ✓ Logging and error handling work

### 8.4 CI/CD Requirements

**GitHub Actions**:

-   ✓ All workflows trigger correctly
-   ✓ No path resolution errors
-   ✓ All jobs pass
-   ✓ Artifacts created and uploaded
-   ✓ No workflow failures

**Automated Testing**:

-   ✓ CI runs all test suites
-   ✓ Test results match local
-   ✓ Coverage reports generated
-   ✓ No CI-specific failures

**Publishing Pipeline**:

-   ✓ VSIX creation in CI works
-   ✓ Publishing workflow configured correctly
-   ✓ Secrets accessible
-   ✓ Can deploy to marketplace (manual verification)

### 8.5 Performance Requirements

**Build Performance**:

-   ✓ Total build time within 10% of baseline
-   ✓ No significant slowdowns
-   ✓ Turbo cache works correctly

**Test Performance**:

-   ✓ Test execution time within 10% of baseline
-   ✓ No test timeouts
-   ✓ Parallel execution works

**Runtime Performance**:

-   ✓ Extension activation time unchanged
-   ✓ No memory leaks introduced
-   ✓ Bundle size not significantly increased

### 8.6 Documentation Requirements

**Completeness**:

-   ✓ README.md updated with new structure
-   ✓ Installation instructions current
-   ✓ Developer setup guide accurate
-   ✓ Architecture diagrams updated
-   ✓ No references to old structure

**Accuracy**:

-   ✓ All paths correct in documentation
-   ✓ Commands work as documented
-   ✓ Installation steps verified

### 8.7 Zero Functionality Loss

**Critical Check**: No feature or capability should be lost

-   ✓ All VS Code commands present and working
-   ✓ All views and UI components render
-   ✓ All CLI commands functional
-   ✓ All MCP server endpoints working
-   ✓ All internal APIs available
-   ✓ All integrations functional (Git, filesystem, etc.)
-   ✓ All features accessible and testable
-   ✓ No regressions in existing functionality

**Sign-off**: Migration complete when all ✓ boxes checked

---

## 9. Migration Timeline Estimate

**Phase 1: Preparation** (2 hours)

-   Environment setup
-   Baseline capture
-   Branch creation
-   Documentation review

**Phase 2: Structural Migration** (3 hours)

-   Move directories with git
-   Update package.json files
-   Update import statements
-   Update configurations

**Phase 3: Validation** (4 hours)

-   Build verification
-   Test suite execution
-   Application testing
-   CI/CD validation

**Phase 4: Documentation & Cleanup** (1 hour)

-   Update documentation
-   Clean up old files
-   Final review

**Total Estimated Time**: 10 hours (1-2 days)

**Risk Buffer**: Add 50% (5 hours) for unexpected issues

**Total with Buffer**: 15 hours (2 days)

---

## 10. Contact & Ownership

**Document Owner**: Migration team
**Last Updated**: 2025-10-01
**Review Required**: Before starting migration
**Approval Required**: Tech lead sign-off

**Key Stakeholders**:

-   VS Code extension maintainers
-   CI/CD pipeline owners
-   Quality assurance team
-   Release management

---

## Appendix A: File Inventory

### A.1 Applications

```
apps/vscode/         (1.1M, 70 test files)
├── src/             (35 TypeScript files)
│   ├── extension.ts (52KB - main entry)
│   ├── test/        (Test suites)
│   └── [34 other source files]
├── dist/            (Build output)
├── scripts/         (package-vsix.cjs)
├── package.json
├── tsconfig.json
├── tsconfig.production.json
├── tsconfig.test.json
├── esbuild.config.cjs
└── playwright.config.ts

apps/cli/            (56K, 3 test files)
├── src/
│   └── index.ts     (10KB)
└── package.json

apps/mcp-server/     (28K, 1 test file)
├── src/
│   └── index.ts     (3KB)
└── package.json
```

### A.2 Packages

```
packages/core/       (360K, 27 test files)
├── src/
│   ├── guardian.ts  (12KB)
│   ├── mcp-federation.ts (13KB)
│   ├── git-integration.ts (6KB)
│   ├── mcp-client.ts (10KB)
│   ├── utils/       (8 utility files)
│   └── [12 other source files]
└── package.json

packages/storage/    (52K)
├── src/
│   ├── interface.ts
│   └── adapters/
│       └── fs.ts
└── package.json

packages/contracts/  (36K)
├── src/
│   ├── schemas.ts
│   ├── eventBus.ts
│   └── features.ts
└── package.json

packages/config/     (16K)
├── src/
│   └── index.ts
└── package.json

packages/telemetry/  (32K)
├── src/
│   └── [telemetry implementation]
└── package.json
```

### A.3 Configuration Files

```
Root:
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── .github/workflows/ (8 workflow files)

Preserved:
- biome.json (at main monorepo root)
- tsconfig.json (main monorepo root)
```

---

## Appendix B: External Dependencies

### B.1 Critical External Dependencies

-   `@modelcontextprotocol/sdk`: ^0.5.0 (core + mcp-server)
-   `vscode`: VS Code API (external to bundle)
-   `zod`: ^3.23.0 (schema validation)
-   `posthog-node`: ^3.6.3 (telemetry)

### B.2 Build-time Dependencies

-   `typescript`: ^5.4.0 / ^5.2.2 (varies by package)
-   `esbuild`: ^0.19.3 (VS Code bundling)
-   `vitest`: ^3.2.4 (testing)
-   `@playwright/test`: ^1.55.1 (E2E testing)
-   `@biomejs/biome`: ^1.9.4 (linting/formatting)

### B.3 Runtime Dependencies (Major)

-   `chalk`: ^5.3.0 (CLI coloring)
-   `commander`: ^12.0.0 (CLI framework)
-   `inquirer`: ^8.2.6 (CLI prompts)
-   `pino`: ^9.12.0 (logging)
-   `simple-git`: ^3.28.0 (Git operations)
-   `chokidar`: ^4.0.3 (file watching)

---

## Appendix C: Quick Reference Commands

### C.1 Pre-Migration

```bash
# Capture baseline
cd clients/snapback-clients
pnpm test > /tmp/test-baseline.txt
pnpm test:coverage > /tmp/coverage-baseline.txt

# Create backup
git checkout -b backup-clients-$(date +%Y%m%d)

# Clean build
pnpm clean && pnpm build
```

### C.2 Post-Migration

```bash
# Clean install
pnpm clean:deps && pnpm install

# Verify build
pnpm clean:build && pnpm build

# Run all tests
pnpm test:ci

# Package VS Code extension
cd apps/extension-vscode && pnpm package-vsix

# Compare tests
pnpm test > /tmp/test-migrated.txt
diff /tmp/test-baseline.txt /tmp/test-migrated.txt
```

### C.3 Validation

```bash
# Type check all
pnpm typecheck

# Lint all
pnpm lint

# Test all
pnpm test:full

# Build and test VS Code
cd apps/extension-vscode
pnpm compile && pnpm test && pnpm test:e2e
```

---

**END OF MIGRATION REQUIREMENTS DOCUMENT**
