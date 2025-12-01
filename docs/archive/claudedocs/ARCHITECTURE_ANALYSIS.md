# SnapBack-Site Monorepo Architecture Analysis

**Date**: October 1, 2025
**Analyzer**: System Architect Mode
**Scope**: Complete monorepo structure and organization analysis

---

## Executive Summary

This analysis reveals a **complex multi-repository architecture** with significant organizational challenges:

1. **Three distinct monorepos** coexisting in one directory structure
2. **clients/snapback-clients** is a nested git submodule with its own complete monorepo
3. **sbapback.dev** appears to be a standalone Next.js site that should be integrated
4. **extensions/vscode** duplicates functionality from clients/snapback-clients/apps/vscode
5. Multiple inconsistencies in build configuration and TypeScript setup

**Critical Finding**: The current structure violates monorepo best practices by nesting independent repositories and creating duplicate applications.

---

## 1. Current Architecture Map

### 1.1 Visual Structure

```
SnapBack-Site/ (Main Turborepo - Git Repo 1)
├── package.json (pnpm@10.14.0, turbo@2.5.6)
├── pnpm-workspace.yaml (packages: config, apps/*, packages/*, tooling/*)
├── turbo.json (Build pipeline configuration)
│
├── apps/
│   └── web/                          [Next.js 15 SaaS Application]
│       ├── app/ (App Router)
│       ├── modules/ (Feature modules)
│       └── package.json (@repo/web)
│
├── packages/                         [Shared Libraries - 9 packages]
│   ├── api/          (HONO + oRPC)
│   ├── auth/         (Better Auth)
│   ├── database/     (Drizzle ORM + PostgreSQL)
│   ├── i18n/         (next-intl)
│   ├── logs/         (Logging utilities)
│   ├── mail/         (Multi-provider email)
│   ├── payments/     (Multi-provider billing)
│   ├── storage/      (S3-compatible)
│   └── utils/        (Shared utilities)
│
├── config/                           [Application Configuration]
│   └── index.ts (Feature flags, plans, auth settings)
│
├── tooling/                          [Development Tools]
│   ├── typescript/   (@repo/tsconfig)
│   ├── tailwind/     (Shared Tailwind config)
│   └── scripts/      (Build scripts)
│
├── clients/                          ⚠️ ISSUE: Nested Monorepo
│   └── snapback-clients/             [Separate Git Repo 2]
│       ├── package.json (pnpm@9.12.0, turbo)
│       ├── pnpm-workspace.yaml
│       ├── apps/
│       │   ├── cli/          (@snapback/cli - CLI tool)
│       │   ├── mcp-server/   (@snapback/mcp-server)
│       │   └── vscode/       (VS Code extension v0.1.0)
│       └── packages/
│           ├── config/       (@snapback/config)
│           ├── contracts/    (@snapback/contracts - Zod schemas)
│           ├── core/         (@snapback/core - Guardian logic)
│           ├── storage/      (@snapback/storage)
│           └── telemetry/    (@snapback/telemetry)
│
├── extensions/                       ⚠️ ISSUE: Duplicate Extension
│   └── vscode/
│       └── package.json (snapback v0.0.1 - ESLint-based)
│
└── sbapback.dev/                     ⚠️ ISSUE: Standalone Site
    ├── package.json (@snapback/marketing)
    ├── app/ (Next.js App Router)
    ├── packages/
    │   └── guardian-engine/
    └── [Complete Next.js application structure]
```

### 1.2 Repository Status

| Location                     | Type                 | Git Status                                    | Package Manager    | Build Tool      |
| ---------------------------- | -------------------- | --------------------------------------------- | ------------------ | --------------- |
| **Root**                     | Turborepo Monorepo   | Main repo                                     | pnpm@10.14.0       | Turbo 2.5.6     |
| **clients/snapback-clients** | Nested Monorepo      | Submodule (github.com/Marcelle-Labs/SnapBack) | pnpm@9.12.0        | Turbo (minimal) |
| **sbapback.dev**             | Standalone Next.js   | Part of main repo                             | npm (no lock file) | Next.js only    |
| **extensions/vscode**        | Standalone Extension | Part of main repo                             | npm (no lock file) | TypeScript      |

---

## 2. Clients Directory Deep Dive

### 2.1 Purpose & Contents

The `clients/snapback-clients` directory is a **complete independent monorepo** containing:

**Purpose**: Development tools and platform integrations for SnapBack

-   CLI tool for command-line interactions
-   MCP server for Model Context Protocol integration
-   VS Code extension for IDE integration
-   Core guardian logic and AI detection
-   Shared contracts and schemas

### 2.2 Current Placement Issues

❌ **Problems with Current Location**:

1. **Git Submodule Complexity**: Nested git repository creates workflow friction
2. **Dependency Isolation**: Cannot leverage shared packages from main monorepo
3. **Build Pipeline Disconnection**: Separate turbo.json, not integrated with main pipeline
4. **Version Skew**: Different pnpm versions (9.12.0 vs 10.14.0)
5. **Duplicate Functionality**: Storage package exists in both monorepos
6. **Developer Experience**: Requires separate install, build, and dev commands

### 2.3 Recommended Actions for Clients

**Option A: Full Integration (RECOMMENDED)**

Move applications into main monorepo structure:

```
SnapBack-Site/
├── apps/
│   ├── web/              (existing - SaaS app)
│   ├── cli/              (moved from clients)
│   ├── mcp-server/       (moved from clients)
│   └── extension/        (consolidated - see below)
│
└── packages/
    ├── ... (existing packages)
    ├── snapback-core/    (moved from clients)
    ├── snapback-contracts/ (moved from clients)
    └── snapback-telemetry/ (moved from clients)
```

**Benefits**:

-   Unified dependency management
-   Single build pipeline with Turbo caching
-   Shared TypeScript configuration
-   Consistent code quality tooling (Biome)
-   Simplified development workflow

**Option B: Keep as Submodule (NOT RECOMMENDED)**

If clients must remain separate:

-   Update pnpm to 10.14.0
-   Integrate turbo.json with main pipeline
-   Create shared dependency catalog
-   Document submodule workflow clearly

---

## 3. Critical Architectural Issues

### 3.1 Duplicate VS Code Extensions

**Issue**: Two VS Code extensions with different implementations:

| Location                                | Version | State         | Tech Stack                             |
| --------------------------------------- | ------- | ------------- | -------------------------------------- |
| `clients/snapback-clients/apps/vscode/` | v0.1.0  | Full-featured | Biome, esbuild, Comprehensive features |
| `extensions/vscode/`                    | v0.0.1  | Minimal       | ESLint, TypeScript, Basic skeleton     |

**Recommendation**:

-   **DELETE** `extensions/vscode/` (minimal skeleton)
-   **MOVE** `clients/snapback-clients/apps/vscode/` to `apps/extension/`
-   Consolidate as the single source of truth

### 3.2 sbapback.dev Standalone Site

**Issue**: Separate Next.js marketing site not integrated with monorepo

**Current Problems**:

-   Uses npm instead of pnpm (no lockfile in repo)
-   Not in pnpm-workspace.yaml
-   Duplicate packages directory with guardian-engine
-   Cannot leverage shared packages from main monorepo
-   Independent build configuration

**Recommendation**:

**Option A: Integrate as Marketing Site**

```
apps/
├── web/              (SaaS application)
└── marketing/        (rename from sbapback.dev)
    └── package.json  (@snapback/marketing or @repo/marketing)
```

**Option B: Use apps/web Marketing Routes**

The main `apps/web` already has marketing routes under `(marketing)/`. Consider:

-   Move sbapback.dev content into apps/web/(marketing)
-   Consolidate all marketing in one Next.js app
-   Use route groups for separation

### 3.3 Inconsistent Package Naming

**Current State**:

-   Main monorepo: `@repo/*` namespace
-   Clients monorepo: `@snapback/*` namespace
-   Config package: Both `@repo/config` and standalone `config`

**Recommendation**: Standardize on `@snapback/*` for all packages:

```typescript
// Unified namespace
@snapback/web
@snapback/api
@snapback/database
@snapback/cli
@snapback/extension
@snapback/core
@snapback/contracts
```

---

## 4. TypeScript & Build Configuration Analysis

### 4.1 TypeScript Configuration

**Base Configuration** (`tooling/typescript/base.json`):

```json
{
	"compilerOptions": {
		"module": "Preserve",
		"target": "ES6",
		"moduleResolution": "bundler",
		"strict": true
	}
}
```

**Issues Identified**:

1. **No Project References**: Monorepo not using TypeScript project references
2. **Inconsistent Paths**: Different path mapping across packages
3. **Missing Composite Builds**: No `composite: true` for faster builds

**Recommended Configuration**:

```json
// tooling/typescript/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "composite": true,              // Enable project references
    "declaration": true,             // Generate .d.ts files
    "declarationMap": true,          // Generate .d.ts.map
    "incremental": true,             // Enable incremental compilation
    "module": "ESNext",              // Modern module system
    "target": "ES2022",              // Modern JavaScript
    "moduleResolution": "bundler",   // For modern bundlers
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}

// tooling/typescript/library.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

// Root tsconfig.json
{
  "extends": "@repo/tsconfig/base.json",
  "references": [
    { "path": "./packages/utils" },
    { "path": "./packages/database" },
    { "path": "./packages/auth" },
    { "path": "./packages/api" },
    { "path": "./apps/web" }
  ]
}
```

### 4.2 Vite/Vitest Configuration

**Current Setup**:

-   Root vitest.config.ts for cross-package testing
-   vitest.workspace.ts defines workspace packages
-   Individual package vitest configs

**Issues**:

-   Not all packages listed in workspace
-   Inconsistent coverage configuration
-   Missing shared test utilities

**Recommended Structure**:

```typescript
// vitest.workspace.ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	// All packages
	"packages/*",

	// All apps
	"apps/*",

	// Shared test utilities
	{
		test: {
			name: "shared",
			include: ["__tests__/shared/**/*.test.ts"],
			environment: "node",
			globals: true,
		},
	},
]);
```

### 4.3 Turbo.json Optimization

**Current Configuration**:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^generate", "^build"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"]
		},
		"dev": {
			"cache": false,
			"dependsOn": ["^generate"],
			"persistent": true
		}
	}
}
```

**Recommended Enhancements**:

```json
{
	"$schema": "https://turbo.build/schema.json",
	"globalDependencies": ["**/.env.*local"],
	"globalEnv": ["NODE_ENV"],
	"pipeline": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"],
			"env": ["DATABASE_URL", "NEXT_PUBLIC_*"]
		},
		"dev": {
			"cache": false,
			"dependsOn": ["^generate"],
			"persistent": true
		},
		"test": {
			"dependsOn": ["^build"],
			"outputs": ["coverage/**"],
			"cache": true
		},
		"test:unit": {
			"cache": true,
			"outputs": ["coverage/**"]
		},
		"lint": {
			"cache": true,
			"outputs": []
		},
		"type-check": {
			"dependsOn": ["^build"],
			"cache": true,
			"outputs": []
		},
		"generate": {
			"cache": false,
			"outputs": ["drizzle/**/*.ts"]
		}
	}
}
```

---

## 5. Best Practices from Research

### 5.1 Turborepo Monorepo Patterns

**Key Principles**:

1. **Flat Package Structure**: Keep apps and packages at consistent depth
2. **Task Dependencies**: Use `^` prefix for upstream dependencies
3. **Selective Caching**: Cache only deterministic outputs
4. **Environment Variables**: Declare in globalEnv for proper cache invalidation

### 5.2 PNPM Workspace Configuration

**Optimal Setup**:

```yaml
# pnpm-workspace.yaml
packages:
    - "apps/*"
    - "packages/*"
    - "tooling/*"
    - "config"

# Use catalogs for version management
catalogs:
    default:
        react: 19.1.1
        typescript: 5.9.2
        # ... centralized version management
```

**Benefits of Catalogs**:

-   Single source of truth for versions
-   Easier dependency updates
-   Reduced version conflicts

### 5.3 TypeScript Project References

**Monorepo Benefits**:

-   3-4x faster incremental builds
-   Better IDE performance
-   Proper dependency tracking
-   Parallel type checking

**Implementation Requirements**:

1. Set `composite: true` in all package tsconfigs
2. Define `references` in consuming packages
3. Use `tsc --build` for coordinated compilation

### 5.4 Vite/Vitest in Monorepo

**Best Practices**:

-   Use workspace configuration for shared settings
-   Individual configs for package-specific needs
-   Shared test utilities in separate package
-   Coverage aggregation at root level

---

## 6. Comprehensive Recommendations

### 6.1 Immediate Actions (Priority 1 - High Impact)

#### A. Consolidate VS Code Extensions

```bash
# 1. Move fully-featured extension to apps/
git mv clients/snapback-clients/apps/vscode apps/extension

# 2. Remove skeleton extension
git rm -rf extensions/vscode

# 3. Update workspace configuration
# Add to pnpm-workspace.yaml: apps/extension
```

#### B. Integrate sbapback.dev

```bash
# Option A: Move to apps/marketing
git mv sbapback.dev apps/marketing

# Update apps/marketing/package.json:
{
  "name": "@snapback/marketing",
  "dependencies": {
    "@snapback/design-system": "workspace:*",
    "@snapback/ui": "workspace:*"
  }
}

# Add to pnpm-workspace.yaml
```

#### C. Flatten clients/snapback-clients

```bash
# 1. Move apps
git mv clients/snapback-clients/apps/cli apps/cli
git mv clients/snapback-clients/apps/mcp-server apps/mcp-server

# 2. Move packages
git mv clients/snapback-clients/packages/core packages/snapback-core
git mv clients/snapback-clients/packages/contracts packages/snapback-contracts
git mv clients/snapback-clients/packages/telemetry packages/snapback-telemetry

# 3. Merge or deduplicate overlapping packages
# - Evaluate storage, config duplication
```

### 6.2 Build System Improvements (Priority 2 - Medium Impact)

#### A. Enable TypeScript Project References

```json
// packages/database/tsconfig.json
{
  "extends": "@repo/tsconfig/library.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "references": []
}

// packages/api/tsconfig.json
{
  "extends": "@repo/tsconfig/library.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../database" },
    { "path": "../auth" }
  ]
}
```

#### B. Optimize Turbo Pipeline

Add the enhanced turbo.json configuration from section 4.3

#### C. Standardize Testing

```typescript
// Root vitest.workspace.ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"packages/*",
	"apps/*",
	{
		test: {
			name: "integration",
			include: ["**/*.integration.test.ts"],
			environment: "node",
		},
	},
]);
```

### 6.3 Package Namespace Unification (Priority 3 - Low Impact)

Standardize all packages under `@snapback/*`:

```json
// Before
"@repo/api"
"@repo/database"
"@snapback/core"
"@snapback/contracts"

// After
"@snapback/api"
"@snapback/database"
"@snapback/core"
"@snapback/contracts"
```

**Migration Steps**:

1. Update package.json name fields
2. Update import statements across codebase
3. Update tsconfig.json path mappings
4. Update turbo.json references
5. Update documentation

---

## 7. Migration Strategy

### Phase 1: Consolidation (Week 1-2)

**Goals**: Eliminate duplicate extensions, integrate standalone sites

**Tasks**:

1. ✅ Audit current structure (this document)
2. Move sbapback.dev to apps/marketing
3. Consolidate VS Code extensions
4. Update pnpm-workspace.yaml
5. Run `pnpm install` to validate workspace
6. Update all cross-package dependencies

**Validation**:

```bash
pnpm build          # All packages build
pnpm test           # All tests pass
pnpm type-check     # No TypeScript errors
```

### Phase 2: Flatten Clients (Week 3-4)

**Goals**: Integrate clients/snapback-clients into main monorepo

**Tasks**:

1. Move CLI to apps/cli
2. Move MCP server to apps/mcp-server
3. Move extension to apps/extension (already done)
4. Move core packages to packages/
5. Resolve duplicate packages (storage, config)
6. Update all import paths
7. Merge turbo.json configurations
8. Update documentation

**Validation**:

```bash
pnpm build                    # All packages build
pnpm --filter @snapback/cli build
pnpm --filter @snapback/mcp-server build
```

### Phase 3: Build Optimization (Week 5-6)

**Goals**: Implement TypeScript project references, optimize build pipeline

**Tasks**:

1. Add composite: true to all packages
2. Configure project references
3. Update turbo.json with optimized pipeline
4. Implement shared test utilities
5. Optimize vitest workspace configuration
6. Add build performance monitoring

**Expected Gains**:

-   3-4x faster incremental builds
-   50%+ faster CI/CD pipeline
-   Better IDE responsiveness

### Phase 4: Polish & Documentation (Week 7-8)

**Goals**: Standardize naming, update documentation

**Tasks**:

1. Unify package namespace to @snapback/\*
2. Update README files
3. Create CONTRIBUTING.md with monorepo workflows
4. Document architecture decisions
5. Create migration guide for contributors
6. Set up automated dependency updates

---

## 8. Trade-offs and Considerations

### 8.1 Integration Trade-offs

| Aspect              | Keep Separate            | Integrate                   |
| ------------------- | ------------------------ | --------------------------- |
| **Complexity**      | Multiple repos to manage | Single unified structure    |
| **Dependencies**    | Independent versions     | Shared, consistent versions |
| **Build Time**      | Isolated builds          | Unified, cached builds      |
| **Release Cadence** | Independent releases     | Coordinated releases        |
| **Team Structure**  | Team autonomy            | Shared ownership            |
| **Git History**     | Preserved separately     | Merged history              |

**Recommendation**: Integration provides better DX and maintainability, but requires coordinated migration.

### 8.2 Build System Trade-offs

| Feature                | TypeScript Project Refs | Without         |
| ---------------------- | ----------------------- | --------------- |
| **Initial Setup**      | Complex configuration   | Simple setup    |
| **Incremental Builds** | 3-4x faster             | Standard speed  |
| **IDE Performance**    | Excellent               | Good            |
| **Debugging**          | More complex            | Straightforward |
| **Maintenance**        | Requires discipline     | Low overhead    |

**Recommendation**: Benefits outweigh setup cost for monorepo of this size.

### 8.3 Namespace Trade-offs

| Approach         | Pros                           | Cons                       |
| ---------------- | ------------------------------ | -------------------------- |
| **@snapback/\*** | Brand consistency, publishable | Breaking change to migrate |
| **@repo/\***     | Convention, private packages   | Not publishable, generic   |
| **Mixed**        | Flexibility                    | Confusing, inconsistent    |

**Recommendation**: Use @snapback/_ for publishable packages, internal-only can stay @repo/_.

---

## 9. Developer Experience Improvements

### 9.1 Unified Scripts

**Root package.json**:

```json
{
	"scripts": {
		"dev": "turbo dev --concurrency 15",
		"dev:web": "pnpm --filter @snapback/web dev",
		"dev:marketing": "pnpm --filter @snapback/marketing dev",
		"dev:cli": "pnpm --filter @snapback/cli dev",

		"build": "turbo build",
		"build:apps": "turbo build --filter='./apps/*'",
		"build:packages": "turbo build --filter='./packages/*'",

		"test": "vitest",
		"test:unit": "vitest run",
		"test:e2e": "pnpm --filter @snapback/web test:e2e",
		"test:ci": "turbo test --no-daemon",

		"lint": "biome check .",
		"lint:fix": "biome check . --write",
		"format": "biome format . --write",

		"type-check": "turbo type-check",
		"clean": "turbo clean && rm -rf node_modules",
		"reset": "pnpm clean && pnpm install"
	}
}
```

### 9.2 Documentation Structure

**Recommended Documentation**:

```
docs/
├── ARCHITECTURE.md           (This document)
├── CONTRIBUTING.md           (Contribution guidelines)
├── DEVELOPMENT.md            (Setup and workflows)
├── MONOREPO_GUIDE.md        (Monorepo patterns)
├── MIGRATION_GUIDE.md       (From old structure)
├── packages/
│   ├── api.md
│   ├── database.md
│   └── ...
└── apps/
    ├── web.md
    ├── cli.md
    └── ...
```

### 9.3 VS Code Workspace Configuration

**.vscode/workspace.code-workspace**:

```json
{
	"folders": [
		{ "path": ".", "name": "Root" },
		{ "path": "apps/web", "name": "App: Web" },
		{ "path": "apps/marketing", "name": "App: Marketing" },
		{ "path": "apps/cli", "name": "App: CLI" },
		{ "path": "apps/extension", "name": "App: Extension" },
		{ "path": "packages/api", "name": "Package: API" },
		{ "path": "packages/database", "name": "Package: Database" }
	],
	"settings": {
		"typescript.tsdk": "node_modules/typescript/lib",
		"typescript.enablePromptUseWorkspaceTsdk": true,
		"files.exclude": {
			"**/node_modules": true,
			"**/.next": true,
			"**/dist": true
		}
	}
}
```

---

## 10. Success Metrics

### 10.1 Build Performance

**Current Baseline** (to be measured):

-   Full build time: TBD
-   Incremental build time: TBD
-   CI/CD pipeline duration: TBD

**Target Improvements**:

-   Full build: 30-50% faster with Turbo caching
-   Incremental build: 3-4x faster with project references
-   CI/CD: 40-60% faster with optimized tasks

### 10.2 Developer Experience

**Metrics to Track**:

-   Time to first build for new developers
-   Number of commands needed for common tasks
-   IDE responsiveness (TypeScript language server)
-   Test execution time

**Targets**:

-   New developer setup: < 15 minutes
-   Single command for most workflows
-   IDE lag: < 1 second
-   Unit test suite: < 30 seconds

### 10.3 Maintenance Burden

**Current State**:

-   3 separate git repositories
-   2 package managers (pnpm, npm)
-   Duplicate extensions
-   Inconsistent dependencies

**Target State**:

-   1 unified monorepo
-   1 package manager (pnpm)
-   Single source of truth for all apps
-   Consistent dependencies via catalog

---

## 11. Conclusion

The SnapBack-Site monorepo has a solid foundation but suffers from:

1. **Structural Complexity**: Nested repositories and duplicate applications
2. **Build Inefficiency**: No TypeScript project references, basic Turbo configuration
3. **Inconsistent Naming**: Mixed package namespaces
4. **Isolated Development**: clients/snapback-clients separated from main infrastructure

**Recommended Path Forward**:

1. **Phase 1 (Immediate)**: Consolidate duplicate extensions and integrate sbapback.dev
2. **Phase 2 (Short-term)**: Flatten clients/snapback-clients into main monorepo
3. **Phase 3 (Medium-term)**: Implement build optimizations (project references, enhanced Turbo)
4. **Phase 4 (Long-term)**: Standardize naming and documentation

**Expected Outcomes**:

-   Single, unified monorepo with clear structure
-   3-4x faster incremental builds
-   40-60% faster CI/CD pipelines
-   Improved developer experience
-   Simplified maintenance and onboarding

**Risk Mitigation**:

-   Phased approach allows incremental validation
-   Git history preserved through careful migration
-   Each phase independently valuable
-   Rollback possible at each milestone

---

## Appendix A: File Structure Reference

### Current Structure

```
SnapBack-Site/
├── apps/web/
├── packages/[9]
├── clients/snapback-clients/  ⚠️ Nested monorepo
├── extensions/vscode/         ⚠️ Duplicate
├── sbapback.dev/              ⚠️ Standalone
├── config/
└── tooling/
```

### Recommended Structure

```
SnapBack-Site/
├── apps/
│   ├── web/               (SaaS application)
│   ├── marketing/         (moved from sbapback.dev)
│   ├── cli/               (moved from clients)
│   ├── mcp-server/        (moved from clients)
│   └── extension/         (consolidated VS Code ext)
├── packages/
│   ├── api/
│   ├── auth/
│   ├── database/
│   ├── snapback-core/     (moved from clients)
│   ├── snapback-contracts/ (moved from clients)
│   ├── snapback-telemetry/ (moved from clients)
│   └── ... [remaining packages]
├── config/
└── tooling/
```

---

**End of Analysis**
