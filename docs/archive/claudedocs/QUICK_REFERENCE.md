# SnapBack-Site Monorepo - Quick Reference Guide

**One-page reference for common tasks and decisions**

---

## Current State Issues (What's Wrong)

```
⚠️ 3 SEPARATE REPOSITORIES in one directory
⚠️ 2 DUPLICATE VS Code extensions
⚠️ 1 STANDALONE site not integrated
⚠️ BUILD TIMES: 2+ minutes for incremental changes
```

---

## Target State (What We Want)

```
✅ 1 UNIFIED REPOSITORY
✅ 1 VS Code extension (best version)
✅ ALL APPS in unified structure
✅ BUILD TIMES: ~20 seconds for incremental changes
```

---

## File Location Changes

### Current → Target

```
clients/snapback-clients/apps/cli/
    → apps/cli/

clients/snapback-clients/apps/mcp-server/
    → apps/mcp-server/

clients/snapback-clients/apps/vscode/
    → apps/extension/

extensions/vscode/
    → DELETED (duplicate)

sbapback.dev/
    → apps/marketing/

clients/snapback-clients/packages/core/
    → packages/snapback-core/

clients/snapback-clients/packages/contracts/
    → packages/snapback-contracts/

clients/snapback-clients/packages/telemetry/
    → packages/snapback-telemetry/
```

---

## Quick Commands

### Development

```bash
# Start all apps
pnpm dev

# Start specific app
pnpm --filter @snapback/web dev
pnpm --filter @snapback/marketing dev
pnpm --filter @snapback/cli dev
pnpm --filter @snapback/mcp-server dev

# Build everything
pnpm build

# Build specific package
pnpm --filter @snapback/database build
```

### Testing

```bash
# All tests
pnpm test

# Specific package tests
pnpm --filter @snapback/api test

# Watch mode
pnpm test:watch

# E2E tests
pnpm --filter @snapback/web test:e2e
```

### Code Quality

```bash
# Lint all
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format all
pnpm format

# Type check
pnpm type-check
```

### Cleanup

```bash
# Clean build artifacts
pnpm clean

# Full reset
pnpm clean && rm -rf node_modules && pnpm install
```

---

## Package Dependencies

### Build Order (Bottom-up)

```
1. Base packages (no dependencies)
   - utils
   - logs
   - i18n
   - snapback-contracts

2. Database layer
   - database

3. Core services
   - auth (depends on: database)
   - storage
   - snapback-core (depends on: snapback-contracts)

4. Business logic
   - mail
   - payments
   - api (depends on: database, auth)
   - snapback-telemetry

5. Applications
   - web (depends on: api, auth, database)
   - marketing (depends on: utils)
   - cli (depends on: snapback-core, storage)
   - mcp-server (depends on: snapback-core, snapback-contracts)
   - extension (depends on: snapback-core, snapback-telemetry)
```

---

## Migration Phases

### Phase 1: Consolidation (Week 1-2) ⚡ START HERE

-   [ ] Remove duplicate VS Code extension skeleton
-   [ ] Move sbapback.dev → apps/marketing
-   [ ] Update workspace config

**Risk**: LOW | **Time**: 5 days | **Rollback**: EASY

### Phase 2: Flatten Clients (Week 3-4)

-   [ ] Move apps (cli, mcp-server, vscode)
-   [ ] Move packages (core, contracts, telemetry)
-   [ ] Deduplicate storage & config
-   [ ] Remove clients/ directory

**Risk**: MEDIUM | **Time**: 7 days | **Rollback**: MODERATE

### Phase 3: Build Optimization (Week 5-6)

-   [ ] Enable TypeScript project references
-   [ ] Optimize turbo.json
-   [ ] Enhance vitest configuration

**Risk**: LOW | **Time**: 5 days | **Rollback**: EASY

### Phase 4: Polish (Week 7-8)

-   [ ] Update documentation
-   [ ] Add development tooling
-   [ ] Performance monitoring

**Risk**: LOW | **Time**: 3 days | **Rollback**: EASY

---

## Troubleshooting

### Build Fails After Changes

```bash
# 1. Clean everything
pnpm turbo clean
rm -rf .turbo

# 2. Reinstall
pnpm install

# 3. Rebuild
pnpm build
```

### TypeScript Errors

```bash
# 1. Clean TypeScript cache
find . -name "tsconfig.tsbuildinfo" -delete

# 2. Type check
pnpm type-check

# 3. If still errors, check tsconfig paths
```

### Workspace Dependency Issues

```bash
# Check dependency resolution
pnpm why <package-name>

# Verify workspace links
ls -la node_modules/@snapback
ls -la node_modules/@repo
```

### Tests Failing

```bash
# 1. Check vitest workspace config
cat vitest.workspace.ts

# 2. Run specific test file
pnpm vitest run path/to/test.ts

# 3. Update snapshots if needed
pnpm vitest -u
```

---

## Performance Benchmarks

### Expected Build Times (Target)

```
Cold build (from scratch):        ~6 minutes
Incremental build (1 file):       ~20 seconds
Incremental build (no changes):   ~2 seconds (cached)
Type check only:                  ~10 seconds
Test suite:                       ~30 seconds
```

### If Builds Are Slow

1. Check Turbo cache: `ls -la .turbo/cache/`
2. Verify project references: `pnpm type-check`
3. Check parallel execution: `turbo build --dry-run`
4. Measure performance: `pnpm perf:build`

---

## Common File Patterns

### Package Structure

```
packages/[package-name]/
├── src/
│   ├── index.ts          # Main entry point
│   ├── types.ts          # Type definitions
│   └── ...
├── __tests__/            # Tests
├── package.json
├── tsconfig.json
└── vitest.config.ts      # Optional
```

### App Structure

```
apps/[app-name]/
├── src/ or app/          # Source code
├── public/               # Static assets (if applicable)
├── package.json
├── tsconfig.json
├── next.config.ts        # For Next.js apps
└── vitest.config.ts      # If has tests
```

---

## Important Configuration Files

| File                   | Purpose               | When to Edit                |
| ---------------------- | --------------------- | --------------------------- |
| `pnpm-workspace.yaml`  | Workspace packages    | Adding new package/app      |
| `turbo.json`           | Build pipeline        | Changing build dependencies |
| `tsconfig.json` (root) | TS project references | Adding new package          |
| `vitest.workspace.ts`  | Test configuration    | Adding new testable package |
| `package.json` (root)  | Scripts & versions    | Adding global scripts       |

---

## Decision Trees

### Should I Create a New Package?

```
Is it shared by 2+ apps/packages?
├─ YES → Create in packages/
└─ NO
   └─ Is it app-specific logic?
      ├─ YES → Keep in app directory
      └─ NO → Consider if really needed
```

### Should I Use @snapback/_ or @repo/_?

```
Will it be published to npm?
├─ YES → Use @snapback/*
└─ NO
   └─ Is it product-specific?
      ├─ YES → Use @snapback/*
      └─ NO → Use @repo/* (tooling)
```

### Where Should I Put This File?

```
What type of file?
├─ Test → __tests__/ or tests/
├─ Documentation → docs/ or claudedocs/
├─ Build script → scripts/
├─ Config → Root or package-specific
├─ Types → src/types/ or types/
└─ Source → src/
```

---

## Key Contacts & Resources

### Documentation

-   **Architecture Analysis**: `claudedocs/ARCHITECTURE_ANALYSIS.md`
-   **Migration Guide**: `claudedocs/MIGRATION_PLAYBOOK.md`
-   **Visualizations**: `claudedocs/ARCHITECTURE_VISUALIZATION.md`
-   **This Guide**: `claudedocs/QUICK_REFERENCE.md`

### External Resources

-   **Turborepo Docs**: https://turbo.build/repo/docs
-   **pnpm Workspaces**: https://pnpm.io/workspaces
-   **TypeScript Project Refs**: https://www.typescriptlang.org/docs/handbook/project-references.html
-   **Vitest Workspace**: https://vitest.dev/guide/workspace

---

## Before You Commit Checklist

```bash
# Run these before every commit
✓ pnpm lint           # No linting errors
✓ pnpm type-check     # No TypeScript errors
✓ pnpm test           # All tests pass
✓ pnpm build          # Everything builds
```

### Pre-Push Checklist

```bash
✓ All commits have clear messages
✓ No merge conflicts
✓ CI/CD will pass (run checks locally)
✓ Documentation updated if needed
```

---

## Emergency Procedures

### Rollback Migration Phase

```bash
# Find the phase start commit
git log --oneline --grep="Phase [X]"

# Revert all commits since then
git revert <commit-hash>..HEAD

# Or hard reset (DESTRUCTIVE)
git reset --hard <commit-hash>
```

### Restore From Backup

```bash
# Switch to backup branch
git checkout backup-pre-migration

# Create new branch from backup
git checkout -b restore-from-backup

# Cherry-pick wanted commits
git cherry-pick <commit-hash>
```

### Fix Broken Build

```bash
# 1. Clean everything
pnpm clean
rm -rf node_modules .turbo
find . -name "tsconfig.tsbuildinfo" -delete

# 2. Fresh install
pnpm install

# 3. Rebuild from scratch
pnpm build

# 4. If still broken, check git status
git status
git diff
```

---

## Performance Tips

### Speed Up Development

1. **Use filters**: `pnpm --filter @snapback/web dev` (only what you need)
2. **Parallel builds**: Turbo does this automatically
3. **Project references**: TypeScript reuses compiled outputs
4. **Turbo cache**: Don't clean unless necessary

### Speed Up CI/CD

1. **Cache dependencies**: Use GitHub Actions cache
2. **Turbo remote cache**: Consider Vercel Remote Cache
3. **Parallel jobs**: Run lint, test, build in parallel
4. **Smart triggers**: Only build affected packages

---

## Glossary

-   **Monorepo**: Single repository containing multiple packages/apps
-   **Workspace**: pnpm's way of managing monorepo packages
-   **Turbo**: Build system for monorepos (caching, orchestration)
-   **Project References**: TypeScript's way of linking related projects
-   **Catalog**: pnpm's centralized dependency version management
-   **Filter**: pnpm flag to target specific packages (`--filter`)
-   **Composite**: TypeScript compiler option for project references

---

**Last Updated**: October 1, 2025
**Version**: 1.0
**Status**: Current for main branch

**Need help?** Check the detailed documentation in `claudedocs/`
