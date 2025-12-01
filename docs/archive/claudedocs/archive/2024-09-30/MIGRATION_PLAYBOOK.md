# SnapBack-Site Monorepo Migration Playbook

**Version**: 1.0
**Date**: October 1, 2025
**Status**: Ready for Execution

---

## Overview

This playbook provides step-by-step instructions for migrating the SnapBack-Site repository from its current fragmented state to a unified, optimized monorepo structure.

**Total Estimated Time**: 6-8 weeks (can be done incrementally)

---

## Pre-Migration Checklist

-   [ ] Backup current repository state
-   [ ] Create migration tracking branch
-   [ ] Document current build times (baseline metrics)
-   [ ] Notify team of upcoming changes
-   [ ] Review and approve this migration plan
-   [ ] Set up monitoring for build performance

```bash
# Create backup
git branch backup-pre-migration
git push origin backup-pre-migration

# Create migration branch
git checkout -b migration/monorepo-consolidation
```

---

## Phase 1: Consolidation (Week 1-2)

**Goal**: Eliminate duplicate extensions and integrate standalone sites
**Risk Level**: Low
**Can Rollback**: Yes

### Step 1.1: Consolidate VS Code Extensions (Day 1)

**Current State**:

-   `clients/snapback-clients/apps/vscode/` (v0.1.0 - Full-featured)
-   `extensions/vscode/` (v0.0.1 - Skeleton)

**Action**: Keep clients version, delete skeleton

```bash
# 1. Verify clients version is complete
cd clients/snapback-clients/apps/vscode
cat package.json | grep version  # Should show 0.1.0
ls -la src/  # Should have extension.ts and comprehensive features

# 2. Remove skeleton extension
cd /Users/user1/WebstormProjects/SnapBack-Site
git rm -rf extensions/vscode

# 3. Commit removal
git add -A
git commit -m "chore: remove duplicate skeleton VS Code extension

- Keep clients/snapback-clients/apps/vscode (v0.1.0) as source of truth
- Remove extensions/vscode (v0.0.1) skeleton
- Reduces duplication and maintenance burden"
```

**Validation**:

```bash
# Verify extension still builds in clients
cd clients/snapback-clients/apps/vscode
pnpm install
pnpm run compile
pnpm run package

# Success if .vsix file is created
ls -la *.vsix
```

**Rollback** (if needed):

```bash
git revert HEAD
git checkout backup-pre-migration -- extensions/vscode
```

### Step 1.2: Integrate sbapback.dev as Marketing App (Day 2-3)

**Current State**: Standalone Next.js site not in workspace
**Target**: `apps/marketing` with proper workspace integration

```bash
# 1. Move directory
git mv sbapback.dev apps/marketing

# 2. Update package.json name and dependencies
cd apps/marketing
```

Edit `apps/marketing/package.json`:

```json
{
	"name": "@snapback/marketing",
	"version": "0.1.0",
	"private": true,
	"scripts": {
		"dev": "next dev --port 3001",
		"build": "next build",
		"start": "next start",
		"lint": "biome check .",
		"lint:fix": "biome check . --write",
		"format": "biome format . --write",
		"type-check": "tsc --noEmit",
		"test": "vitest run",
		"test:watch": "vitest"
	},
	"dependencies": {
		"@snapback/ui": "workspace:*",
		"@snapback/utils": "workspace:*"
		// ... existing dependencies
	},
	"devDependencies": {
		"@snapback/config-typescript": "workspace:*"
		// ... existing dev dependencies
	}
}
```

```bash
# 3. Update tsconfig.json
```

Edit `apps/marketing/tsconfig.json`:

```json
{
	"extends": "@repo/tsconfig/nextjs.json",
	"compilerOptions": {
		"baseUrl": ".",
		"paths": {
			"@/*": ["./*"],
			"@/components/*": ["./components/*"],
			"@/lib/*": ["./lib/*"]
		}
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"exclude": ["node_modules"]
}
```

```bash
# 4. Add to workspace configuration
cd /Users/user1/WebstormProjects/SnapBack-Site
```

Verify `pnpm-workspace.yaml` includes:

```yaml
packages:
    - config
    - apps/* # This now includes apps/marketing
    - packages/*
    - tooling/*
```

```bash
# 5. Install dependencies and validate
pnpm install

# 6. Test build
pnpm --filter @snapback/marketing build

# 7. Commit integration
git add -A
git commit -m "feat: integrate sbapback.dev as apps/marketing

- Rename sbapback.dev → apps/marketing
- Update package name to @snapback/marketing
- Configure workspace dependencies
- Integrate with main monorepo build pipeline

Benefits:
- Shared dependencies with main app
- Unified build and dev workflows
- Consistent tooling (Biome, TypeScript)
"
```

**Validation**:

```bash
# All of these should work
pnpm --filter @snapback/marketing dev
pnpm --filter @snapback/marketing build
pnpm --filter @snapback/marketing lint
pnpm --filter @snapback/marketing type-check

# Test workspace dependency resolution
pnpm --filter @snapback/marketing exec pnpm why @snapback/utils
# Should show: workspace dependency
```

**Rollback** (if needed):

```bash
git revert HEAD~1..HEAD  # Revert both commits
git mv apps/marketing sbapback.dev
```

### Step 1.3: Update Vitest Workspace (Day 4)

Add new apps to test configuration:

Edit `vitest.workspace.ts`:

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	// Packages
	"packages/api",
	"packages/auth",
	"packages/database",
	"packages/payments",
	"packages/mail",
	"packages/storage",
	"packages/utils",
	"packages/i18n",
	"packages/logs",

	// Apps
	"apps/web",
	"apps/marketing", // ADDED
]);
```

```bash
# Test workspace configuration
pnpm test

# Commit
git add vitest.workspace.ts
git commit -m "chore: add marketing app to vitest workspace"
```

### Step 1.4: Update Documentation (Day 5)

Update `CLAUDE.md` and `README.md` to reflect new structure:

```bash
# Update documentation
# ... edit CLAUDE.md to remove references to sbapback.dev
# ... update README.md with new app structure

git add CLAUDE.md README.md
git commit -m "docs: update for Phase 1 consolidation"
```

**Phase 1 Validation Checklist**:

-   [ ] All apps build successfully
-   [ ] All tests pass
-   [ ] Type checking passes
-   [ ] No duplicate code paths
-   [ ] Documentation updated

---

## Phase 2: Flatten Clients Monorepo (Week 3-4)

**Goal**: Integrate clients/snapback-clients into main monorepo
**Risk Level**: Medium
**Can Rollback**: Yes (with some effort)

### Step 2.1: Preparation (Day 1)

```bash
# 1. Analyze dependencies
cd clients/snapback-clients
pnpm list --depth=0

# 2. Document current versions
cat package.json | grep packageManager  # pnpm@9.12.0

# 3. Audit for conflicts
cd ../..
grep -r "@snapback/" package.json pnpm-lock.yaml || true
```

### Step 2.2: Move CLI Application (Day 2)

```bash
# 1. Copy CLI to apps/
git mv clients/snapback-clients/apps/cli apps/cli

# 2. Update package.json
cd apps/cli
```

Edit `apps/cli/package.json`:

```json
{
	"name": "@snapback/cli",
	"version": "0.1.0",
	"type": "module",
	"bin": {
		"snapback": "dist/index.js"
	},
	"scripts": {
		"build": "tsc -p tsconfig.json",
		"dev": "tsx src/index.ts",
		"test": "vitest run",
		"test:watch": "vitest",
		"lint": "biome check .",
		"type-check": "tsc --noEmit"
	},
	"dependencies": {
		"@snapback/core": "workspace:*", // Will create in Step 2.4
		"@snapback/storage": "workspace:*", // Will deduplicate
		"chalk": "catalog:",
		"commander": "catalog:",
		"inquirer": "catalog:",
		"ora": "catalog:"
	},
	"devDependencies": {
		"@repo/tsconfig": "workspace:*",
		"tsx": "catalog:",
		"typescript": "catalog:",
		"vitest": "catalog:"
	}
}
```

```bash
# 3. Update tsconfig.json
```

Edit `apps/cli/tsconfig.json`:

```json
{
	"extends": "@repo/tsconfig/base.json",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "src",
		"module": "ESNext",
		"target": "ES2022"
	},
	"include": ["src/**/*"],
	"exclude": ["dist", "node_modules"]
}
```

```bash
# 4. Commit
cd /Users/user1/WebstormProjects/SnapBack-Site
git add -A
git commit -m "feat: move CLI to apps/cli

- Migrate from clients/snapback-clients/apps/cli
- Update dependencies to use workspace protocol
- Integrate with main build pipeline
"
```

### Step 2.3: Move MCP Server (Day 2)

```bash
# Follow same process as CLI
git mv clients/snapback-clients/apps/mcp-server apps/mcp-server

# Update package.json, tsconfig.json similar to CLI
# Commit
git add -A
git commit -m "feat: move MCP server to apps/mcp-server"
```

### Step 2.4: Move Core Packages (Day 3-4)

```bash
# 1. Move contracts (no dependencies)
git mv clients/snapback-clients/packages/contracts packages/snapback-contracts

# 2. Move core (depends on contracts)
git mv clients/snapback-clients/packages/core packages/snapback-core

# 3. Move telemetry
git mv clients/snapback-clients/packages/telemetry packages/snapback-telemetry

# 4. Update package.json for each
```

**For each moved package**, update `package.json`:

```json
{
	"name": "@snapback/[package-name]",
	"dependencies": {
		"@snapback/contracts": "workspace:*" // If needed
		// Other dependencies from catalog
	},
	"devDependencies": {
		"@repo/tsconfig": "workspace:*",
		"typescript": "catalog:",
		"vitest": "catalog:"
	}
}
```

```bash
# 5. Commit each move
git add -A
git commit -m "feat: migrate snapback packages to main monorepo

- Move contracts, core, telemetry to packages/
- Update dependencies to workspace protocol
- Prepare for unified build pipeline
"
```

### Step 2.5: Deduplicate Storage Package (Day 5)

**Issue**: Both monorepos have a storage package

```bash
# 1. Compare implementations
diff -r packages/storage clients/snapback-clients/packages/storage

# 2. Decide which to keep or merge
# Option A: Keep main repo version (S3-compatible)
# Option B: Merge features from clients version
# Option C: Create new unified version

# 3. Update clients apps to use main storage
cd apps/cli
# Update imports from @snapback/storage to reference main package

# 4. Remove clients storage package
rm -rf clients/snapback-clients/packages/storage

# 5. Commit
git add -A
git commit -m "chore: deduplicate storage package

- Use packages/storage as single source of truth
- Update CLI and MCP server imports
- Remove duplicate from clients
"
```

### Step 2.6: Deduplicate Config Package (Day 5)

Similar process to storage:

```bash
# 1. Compare configs
diff -r config clients/snapback-clients/packages/config

# 2. Merge necessary features
# 3. Update imports
# 4. Remove duplicate

git add -A
git commit -m "chore: deduplicate config package"
```

### Step 2.7: Move VS Code Extension to apps/extension (Day 6)

```bash
# 1. Move the full-featured extension
git mv clients/snapback-clients/apps/vscode apps/extension

# 2. Update package.json
cd apps/extension
```

Edit `apps/extension/package.json`:

```json
{
	"name": "@snapback/extension",
	"displayName": "SnapBack",
	"version": "0.1.0",
	"dependencies": {
		"@snapback/core": "workspace:*",
		"@snapback/storage": "workspace:*",
		"@snapback/telemetry": "workspace:*"
	}
}
```

```bash
# 3. Commit
cd /Users/user1/WebstormProjects/SnapBack-Site
git add -A
git commit -m "feat: move VS Code extension to apps/extension

- Consolidate as single extension in main monorepo
- Integrate with unified build pipeline
- Update workspace dependencies
"
```

### Step 2.8: Clean Up Clients Directory (Day 7)

```bash
# 1. Verify everything is moved
ls -la clients/snapback-clients/apps/      # Should be empty
ls -la clients/snapback-clients/packages/  # Should be empty

# 2. Remove clients directory
rm -rf clients/snapback-clients

# Or if it's a git submodule:
git rm -rf clients/snapback-clients

# 3. Update .gitmodules if needed
cat .gitmodules  # Check if clients was a submodule
# If yes, remove entry

# 4. Commit
git add -A
git commit -m "chore: remove clients/snapback-clients directory

All applications and packages successfully migrated to main monorepo:
- apps/cli
- apps/mcp-server
- apps/extension
- packages/snapback-core
- packages/snapback-contracts
- packages/snapback-telemetry

Benefits:
- Single repository for all code
- Unified build and deployment pipeline
- Consistent tooling and dependencies
- Simplified developer workflow
"
```

### Step 2.9: Update Dependencies and Rebuild (Day 7)

```bash
# 1. Remove old lockfile sections
pnpm install

# 2. Add new apps to vitest workspace
```

Edit `vitest.workspace.ts`:

```typescript
export default defineWorkspace([
	"packages/*",
	"apps/web",
	"apps/marketing",
	"apps/cli", // ADDED
	"apps/mcp-server", // ADDED
	// Note: extension may not need vitest config
]);
```

```bash
# 3. Update turbo.json to include new apps
```

Edit `turbo.json`:

```json
{
	"pipeline": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"]
		},
		"dev": {
			"cache": false,
			"dependsOn": ["^generate"],
			"persistent": true
		},
		"test": {
			"dependsOn": ["^build"],
			"cache": true
		}
		// Turbo automatically discovers all packages
	}
}
```

```bash
# 4. Test all builds
pnpm build

# 5. Test individual packages
pnpm --filter @snapback/cli build
pnpm --filter @snapback/mcp-server build
pnpm --filter @snapback/extension compile

# 6. Commit
git add -A
git commit -m "chore: update build configuration for migrated packages"
```

**Phase 2 Validation Checklist**:

-   [ ] All apps moved to apps/
-   [ ] All packages moved to packages/
-   [ ] No duplicate packages
-   [ ] clients/ directory removed
-   [ ] All builds successful
-   [ ] All tests pass
-   [ ] Dependencies resolved correctly

---

## Phase 3: Build Optimization (Week 5-6)

**Goal**: Implement TypeScript project references and optimize build pipeline
**Risk Level**: Low
**Can Rollback**: Yes

### Step 3.1: Enable TypeScript Project References (Day 1-3)

**Background**: Project references enable incremental builds and parallel type checking

```bash
# 1. Update base tsconfig
```

Edit `tooling/typescript/base.json`:

```json
{
	"$schema": "https://json.schemastore.org/tsconfig",
	"compilerOptions": {
		"composite": true, // ADDED
		"declaration": true, // ADDED
		"declarationMap": true, // ADDED
		"incremental": true,
		"module": "ESNext",
		"target": "ES2022",
		"moduleResolution": "bundler",
		"strict": true,
		"skipLibCheck": true,
		"esModuleInterop": true,
		"resolveJsonModule": true,
		"isolatedModules": true,
		"forceConsistentCasingInFileNames": true
	},
	"exclude": ["node_modules", "dist", ".next", "build"]
}
```

Edit `tooling/typescript/library.json`:

```json
{
	"$schema": "https://json.schemastore.org/tsconfig",
	"extends": "./base.json",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "src",
		"composite": true
	},
	"include": ["src/**/*"],
	"exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules"]
}
```

```bash
# 2. Update each package tsconfig
```

**Template for library packages** (`packages/*/tsconfig.json`):

```json
{
	"extends": "@repo/tsconfig/library.json",
	"compilerOptions": {
		"composite": true,
		"outDir": "dist",
		"rootDir": "src"
	},
	"include": ["src/**/*"],
	"references": [
		// Add references to dependencies
		// Example for api package:
		{ "path": "../database" },
		{ "path": "../auth" }
	]
}
```

**Specific package references**:

`packages/snapback-core/tsconfig.json`:

```json
{
	"extends": "@repo/tsconfig/library.json",
	"compilerOptions": {
		"composite": true
	},
	"references": [{ "path": "../snapback-contracts" }]
}
```

`packages/api/tsconfig.json`:

```json
{
	"extends": "@repo/tsconfig/library.json",
	"compilerOptions": {
		"composite": true
	},
	"references": [
		{ "path": "../database" },
		{ "path": "../auth" },
		{ "path": "../utils" }
	]
}
```

`apps/cli/tsconfig.json`:

```json
{
	"extends": "@repo/tsconfig/base.json",
	"compilerOptions": {
		"composite": true,
		"outDir": "dist"
	},
	"references": [
		{ "path": "../../packages/snapback-core" },
		{ "path": "../../packages/storage" }
	]
}
```

```bash
# 3. Update root tsconfig.json
```

Edit `tsconfig.json`:

```json
{
	"files": [],
	"references": [
		// Packages (in dependency order)
		{ "path": "./packages/utils" },
		{ "path": "./packages/logs" },
		{ "path": "./packages/i18n" },
		{ "path": "./packages/database" },
		{ "path": "./packages/auth" },
		{ "path": "./packages/storage" },
		{ "path": "./packages/mail" },
		{ "path": "./packages/payments" },
		{ "path": "./packages/api" },
		{ "path": "./packages/snapback-contracts" },
		{ "path": "./packages/snapback-core" },
		{ "path": "./packages/snapback-telemetry" },

		// Apps
		{ "path": "./apps/web" },
		{ "path": "./apps/marketing" },
		{ "path": "./apps/cli" },
		{ "path": "./apps/mcp-server" },
		{ "path": "./apps/extension" },

		// Config
		{ "path": "./config" }
	]
}
```

```bash
# 4. Test incremental builds
pnpm type-check  # Should use project references

# 5. Measure improvement
time pnpm build
# Make a small change in packages/database
echo "// test" >> packages/database/src/index.ts
time pnpm build  # Should be MUCH faster

# 6. Commit
git add -A
git commit -m "feat: enable TypeScript project references

Enables incremental compilation and parallel type checking:
- Add composite: true to all package tsconfigs
- Define references for inter-package dependencies
- Update root tsconfig with project references

Expected benefits:
- 3-4x faster incremental builds
- Parallel type checking
- Better IDE performance
"
```

### Step 3.2: Optimize Turbo Pipeline (Day 4)

Edit `turbo.json`:

```json
{
	"$schema": "https://turbo.build/schema.json",
	"globalDependencies": ["**/.env.*local", "tsconfig.json", "turbo.json"],
	"globalEnv": ["NODE_ENV", "DATABASE_URL", "NEXT_PUBLIC_*"],
	"pipeline": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": [
				"dist/**",
				".next/**",
				"!.next/cache/**",
				"tsconfig.tsbuildinfo"
			],
			"env": ["DATABASE_URL", "NEXT_PUBLIC_*", "AUTH_*"]
		},
		"dev": {
			"cache": false,
			"dependsOn": ["^generate", "^build"],
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
		"test:e2e": {
			"cache": false
		},
		"lint": {
			"cache": true,
			"outputs": []
		},
		"type-check": {
			"dependsOn": ["^build"],
			"cache": true,
			"outputs": ["**/*.tsbuildinfo"]
		},
		"generate": {
			"cache": false,
			"outputs": ["drizzle/**/*.ts", "**/*.generated.ts"]
		},
		"clean": {
			"cache": false
		}
	}
}
```

```bash
# Test optimized pipeline
turbo build --dry-run  # See what would execute
turbo build            # Run actual build
turbo build            # Second run should use cache

# Commit
git add turbo.json
git commit -m "feat: optimize Turbo build pipeline

Improvements:
- Better cache invalidation with globalDependencies
- Explicit environment variable declarations
- Proper outputs configuration for all tasks
- Separate caching strategies for different task types
"
```

### Step 3.3: Optimize Vitest Configuration (Day 5)

Edit `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: [
			"packages/**/*.{test,spec}.{js,ts}",
			"apps/**/*.{test,spec}.{js,ts}",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/coverage/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"node_modules/**",
				"dist/**",
				".next/**",
				"**/*.config.*",
				"**/*.d.ts",
				"**/types/**",
				"**/__tests__/**",
				"**/test/**",
			],
			include: [
				"packages/*/src/**/*.{js,ts}",
				"apps/*/src/**/*.{js,ts}",
				"apps/*/lib/**/*.{js,ts}",
			],
		},
		// Enable parallel execution
		maxConcurrency: 10,
		// Faster test isolation
		isolate: true,
		// Pool options for better performance
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
				minThreads: 1,
				maxThreads: 4,
			},
		},
	},
});
```

Edit `vitest.workspace.ts`:

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	// All packages with unit tests
	{
		test: {
			name: "packages",
			include: ["packages/*/src/**/*.{test,spec}.ts"],
			environment: "node",
		},
	},

	// Apps with different test requirements
	{
		test: {
			name: "web",
			include: ["apps/web/**/*.{test,spec}.{ts,tsx}"],
			environment: "jsdom",
			setupFiles: ["apps/web/vitest.setup.ts"],
		},
	},

	{
		test: {
			name: "marketing",
			include: ["apps/marketing/**/*.{test,spec}.{ts,tsx}"],
			environment: "jsdom",
		},
	},

	{
		test: {
			name: "cli",
			include: ["apps/cli/**/*.{test,spec}.ts"],
			environment: "node",
		},
	},

	{
		test: {
			name: "mcp-server",
			include: ["apps/mcp-server/**/*.{test,spec}.ts"],
			environment: "node",
		},
	},

	// Integration tests
	{
		test: {
			name: "integration",
			include: ["**/*.integration.{test,spec}.ts"],
			environment: "node",
			testTimeout: 30000,
		},
	},
]);
```

```bash
# Test configuration
pnpm test

# Commit
git add -A
git commit -m "feat: optimize Vitest configuration

Improvements:
- Parallel test execution
- Workspace configuration for different test types
- Better coverage configuration
- Optimized thread pool settings
"
```

**Phase 3 Validation Checklist**:

-   [ ] TypeScript project references working
-   [ ] Incremental builds 3-4x faster
-   [ ] Turbo cache functioning correctly
-   [ ] All tests running in parallel
-   [ ] Build performance metrics documented

---

## Phase 4: Polish & Documentation (Week 7-8)

**Goal**: Standardize naming, update documentation
**Risk Level**: Low
**Can Rollback**: Yes

### Step 4.1: Unify Package Namespace (Optional) (Day 1-3)

**Decision Point**: Should we rename @repo/_ to @snapback/_?

**Considerations**:

-   **@snapback/\***: Better for publishable packages, brand consistency
-   **@repo/\***: Convention for private monorepo packages

**Recommendation**: Keep @repo/_ for internal packages, use @snapback/_ for publishable ones

**If you decide to unify to @snapback/\***:

```bash
# 1. Update package.json for each package
# Example for packages/api:
sed -i '' 's/"name": "@repo\/api"/"name": "@snapback\/api"/' packages/api/package.json

# 2. Update all imports across codebase
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/@repo\/api/@snapback\/api/g'

# 3. Update tsconfig.json paths
# 4. Update turbo.json references
# 5. Rebuild and test

git add -A
git commit -m "refactor: unify package namespace to @snapback/*"
```

### Step 4.2: Update Documentation (Day 4-5)

**Create/Update Key Documents**:

1. **README.md** (Root):

````markdown
# SnapBack Monorepo

Unified monorepo for SnapBack platform including web app, marketing site, CLI, MCP server, and VS Code extension.

## Repository Structure

-   `apps/` - Applications
    -   `web/` - Next.js SaaS application
    -   `marketing/` - Marketing website
    -   `cli/` - Command-line interface
    -   `mcp-server/` - Model Context Protocol server
    -   `extension/` - VS Code extension
-   `packages/` - Shared packages
-   `config/` - Configuration
-   `tooling/` - Development tools

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all apps in development
pnpm dev

# Build everything
pnpm build

# Run tests
pnpm test
```
````

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

````

2. **docs/DEVELOPMENT.md**:
```markdown
# Development Guide

## Prerequisites

- Node.js 20+
- pnpm 10.14.0+

## Installation

```bash
git clone ...
cd SnapBack-Site
pnpm install
````

## Development Workflows

### Working on Web App

```bash
pnpm --filter @snapback/web dev
```

### Working on CLI

```bash
pnpm --filter @snapback/cli dev
```

## Testing

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @snapback/api test

# Watch mode
pnpm test:watch
```

## Building

```bash
# Build everything
pnpm build

# Build specific package
pnpm --filter @snapback/database build
```

````

3. **docs/ARCHITECTURE.md** (Already created)

4. **CONTRIBUTING.md**:
```markdown
# Contributing Guide

## Monorepo Structure

This is a Turborepo monorepo managed with pnpm workspaces.

## Adding a New Package

1. Create directory in `packages/`
2. Add `package.json` with `"name": "@snapback/package-name"`
3. Run `pnpm install`
4. Add to `vitest.workspace.ts` if it has tests

## Making Changes

1. Create feature branch
2. Make changes
3. Run `pnpm lint && pnpm type-check && pnpm test`
4. Submit pull request
````

```bash
# Commit documentation
git add -A
git commit -m "docs: comprehensive documentation for unified monorepo"
```

### Step 4.3: Add Development Tooling (Day 6)

**VS Code Multi-root Workspace** (`.vscode/snapback.code-workspace`):

```json
{
	"folders": [
		{ "path": ".", "name": "📁 Root" },
		{ "path": "apps/web", "name": "🌐 Web App" },
		{ "path": "apps/marketing", "name": "📢 Marketing" },
		{ "path": "apps/cli", "name": "⌨️ CLI" },
		{ "path": "apps/mcp-server", "name": "🔌 MCP Server" },
		{ "path": "apps/extension", "name": "🔧 VS Code Extension" },
		{ "path": "packages/api", "name": "📦 API" },
		{ "path": "packages/database", "name": "📦 Database" },
		{ "path": "packages/snapback-core", "name": "📦 Core" }
	],
	"settings": {
		"typescript.tsdk": "node_modules/typescript/lib",
		"typescript.enablePromptUseWorkspaceTsdk": true,
		"editor.formatOnSave": true,
		"editor.defaultFormatter": "biomejs.biome",
		"files.exclude": {
			"**/node_modules": true,
			"**/.next": true,
			"**/dist": true,
			"**/.turbo": true,
			"**/coverage": true
		},
		"search.exclude": {
			"**/node_modules": true,
			"**/.next": true,
			"**/dist": true,
			"**/pnpm-lock.yaml": true
		}
	},
	"extensions": {
		"recommendations": [
			"biomejs.biome",
			"vitest.explorer",
			"ms-vscode.vscode-typescript-next"
		]
	}
}
```

**GitHub Actions CI/CD** (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
    push:
        branches: [main, migration/*]
    pull_request:

jobs:
    lint-and-type-check:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v3
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
                  cache: "pnpm"
            - run: pnpm install
            - run: pnpm lint
            - run: pnpm type-check

    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v3
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
                  cache: "pnpm"
            - run: pnpm install
            - run: pnpm test

    build:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v3
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
                  cache: "pnpm"
            - run: pnpm install
            - run: pnpm build
```

```bash
# Commit tooling
git add -A
git commit -m "chore: add development tooling and CI/CD"
```

### Step 4.4: Performance Monitoring (Day 7)

**Add build performance tracking**:

Create `scripts/measure-build-performance.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");

function measureBuild(label, command) {
	console.log(`\n📊 Measuring: ${label}`);
	const start = Date.now();

	try {
		execSync(command, { stdio: "inherit" });
		const duration = ((Date.now() - start) / 1000).toFixed(2);
		console.log(`✅ ${label}: ${duration}s`);
		return { label, duration: parseFloat(duration), success: true };
	} catch (error) {
		const duration = ((Date.now() - start) / 1000).toFixed(2);
		console.log(`❌ ${label}: ${duration}s (failed)`);
		return { label, duration: parseFloat(duration), success: false };
	}
}

const results = [];

// Clean build
execSync("pnpm turbo clean", { stdio: "inherit" });
results.push(measureBuild("Cold Build", "pnpm build"));

// Incremental build (no changes)
results.push(measureBuild("Incremental Build (no changes)", "pnpm build"));

// Incremental build (small change)
fs.appendFileSync("packages/utils/src/index.ts", "\n// test\n");
results.push(measureBuild("Incremental Build (1 file changed)", "pnpm build"));

// Clean up
execSync("git checkout packages/utils/src/index.ts", { stdio: "inherit" });

// Save results
const timestamp = new Date().toISOString();
const report = {
	timestamp,
	results,
	summary: {
		coldBuild: results[0].duration,
		cachedBuild: results[1].duration,
		incrementalBuild: results[2].duration,
		speedup: (results[0].duration / results[2].duration).toFixed(2) + "x",
	},
};

fs.writeFileSync("performance-report.json", JSON.stringify(report, null, 2));

console.log("\n📈 Summary:");
console.log(JSON.stringify(report.summary, null, 2));
```

```bash
# Make executable
chmod +x scripts/measure-build-performance.js

# Add to package.json scripts
# "perf:build": "node scripts/measure-build-performance.js"

# Run baseline measurement
pnpm perf:build

# Commit
git add -A
git commit -m "chore: add build performance monitoring"
```

**Phase 4 Validation Checklist**:

-   [ ] Documentation comprehensive and accurate
-   [ ] Development tooling configured
-   [ ] CI/CD pipeline functional
-   [ ] Performance metrics baseline established
-   [ ] Contributing guide clear

---

## Post-Migration Tasks

### Final Validation (Day 8)

```bash
# 1. Fresh clone test
cd /tmp
git clone <repo-url> snapback-test
cd snapback-test
pnpm install
pnpm build
pnpm test

# 2. Verify all apps work
pnpm --filter @snapback/web dev &
pnpm --filter @snapback/marketing dev &
pnpm --filter @snapback/cli dev

# 3. Check build performance
pnpm perf:build

# 4. Generate final report
```

### Create Migration Summary

Document the migration in `claudedocs/MIGRATION_SUMMARY.md`:

```markdown
# Migration Summary

**Completion Date**: [DATE]
**Duration**: [X weeks]

## What Changed

1. Consolidated duplicate VS Code extensions
2. Integrated sbapback.dev as apps/marketing
3. Flattened clients/snapback-clients into main monorepo
4. Enabled TypeScript project references
5. Optimized Turbo build pipeline
6. Unified package namespace (optional)

## Performance Improvements

| Metric            | Before | After | Improvement |
| ----------------- | ------ | ----- | ----------- |
| Cold Build        | Xm Ys  | Am Bs | C%          |
| Incremental Build | Xm Ys  | Am Bs | Cx faster   |
| CI/CD Duration    | Xm Ys  | Am Bs | C%          |

## Breaking Changes

[List any breaking changes]

## Migration Lessons

[Document lessons learned]
```

---

## Rollback Procedures

### Full Rollback to Pre-Migration State

```bash
# Option 1: Reset to backup branch
git checkout backup-pre-migration
git branch -D migration/monorepo-consolidation

# Option 2: Revert commits
git log --oneline  # Find migration commits
git revert <commit-range>
```

### Partial Rollback (Phase-by-Phase)

**Phase 4 Rollback**:

```bash
git revert <phase-4-commits>
```

**Phase 3 Rollback**:

```bash
# Remove TypeScript project references
git revert <phase-3-commits>
# Rebuild without project refs
pnpm build
```

**Phase 2 Rollback**:

```bash
# Most complex - requires restoring clients directory
git revert <phase-2-commits>
# May need manual cleanup
```

**Phase 1 Rollback**:

```bash
git revert <phase-1-commits>
git mv apps/marketing sbapback.dev
git checkout backup-pre-migration -- extensions/vscode
```

---

## Success Criteria

### Technical Metrics

-   [ ] All builds successful
-   [ ] All tests passing
-   [ ] Type checking passing
-   [ ] Incremental build time < 30 seconds
-   [ ] CI/CD pipeline < 10 minutes

### Developer Experience

-   [ ] Single command for common workflows
-   [ ] Clear documentation
-   [ ] Working VS Code workspace
-   [ ] Effective caching

### Code Quality

-   [ ] No duplicate code
-   [ ] Consistent tooling
-   [ ] Unified dependencies
-   [ ] Clear ownership

---

## Support and Questions

**For issues during migration**:

1. Check this playbook
2. Review ARCHITECTURE_ANALYSIS.md
3. Check git history for similar work
4. Create issue with "migration" label

**Common Issues**:

**Issue**: TypeScript errors after moving packages
**Solution**: Run `pnpm install` and clear `.turbo` cache

**Issue**: Build failures in apps
**Solution**: Check workspace dependencies are correct

**Issue**: Test failures
**Solution**: Update vitest.workspace.ts includes

---

**End of Playbook**

Good luck with the migration! 🚀
