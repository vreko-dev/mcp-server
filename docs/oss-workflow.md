# OSS Package Sync Workflow

> Internal documentation for SnapBack team on managing open-source packages

## Overview

SnapBack uses an **open-core model** with separate public repositories under `github.com/snapback-dev`. This guide explains how to maintain the OSS packages while keeping IP protected.

## Architecture

```
Private Monorepo (snapback.dev)           Public Repos (snapback-dev/*)
├── packages/                             ├── contracts/
│   ├── contracts/                        ├── infrastructure/
│   │   ├── src/public/  ───────────────→ ├── sdk/
│   │   └── src/private/ (NOT synced)     ├── events/
│   ├── infrastructure/                   └── config/
│   └── ...
└── packages-oss/
    └── (deprecated - being phased out)
```

## Daily Workflow

### Making Changes to OSS Code

**Rule**: All OSS code lives in `packages/*/src/public/` directories.

1. **Edit code** in the appropriate public directory:
   ```bash
   # Good: Edit in private repo's public/ directory
   vim packages/contracts/src/public/events/core.ts

   # Bad: Don't edit packages-oss/ (will be removed)
   ```

2. **Test locally**:
   ```bash
   pnpm build
   pnpm test
   pnpm typecheck
   ```

3. **Create changeset** (for version tracking):
   ```bash
   pnpm changeset
   # Select affected OSS packages
   # Choose version bump type (major/minor/patch)
   # Write clear description of PUBLIC changes
   ```

4. **Commit** using conventional commits:
   ```bash
   git add .
   git commit -m "feat(contracts): add webhook event types"
   git push
   ```

5. **Automatic sync** happens via GitHub Actions on push to `main`

### Manual Sync (if needed)

```bash
# Sync all OSS packages to public repos
./scripts/initial-oss-sync.sh

# Or sync specific package
cd scripts && ./sync-single-package.sh contracts
```

## OSS Package Boundaries

### ✅ What Goes in Public (`src/public/`)

- Generic utilities (logging, tracing, metrics)
- Public type definitions (events, snapshots, sessions)
- Framework-agnostic code
- Well-documented APIs
- No business logic

### ❌ What Stays Private (`src/private/`)

- PostHog analytics integration
- Subscription/tier logic
- Dashboard schemas
- Payment processing
- Proprietary algorithms
- Customer data handling
- Analytics correlation

## Validation & Safety

### Automated Checks

Every commit triggers:
1. **IP Leak Detection**: Scans for forbidden patterns
   - `subscription`, `tier`, `stripe`, `posthog`, `dashboard`, `payment`
2. **Type Checking**: Ensures no type errors
3. **Build Verification**: Confirms packages build successfully

### Pre-commit Hook

Lefthook runs automatically:
```yaml
# .lefthook.yml
pre-commit:
  commands:
    oss-validation:
      run: node scripts/validate-oss-boundaries.js
```

### CI Validation

GitHub Actions on every PR:
- Build OSS packages
- Run IP leak scanner
- Verify no private imports in public code

## Release Process

### Version Bumping

1. **Accumulate changesets** on main branch
2. **Create version PR** (automated by changesets):
   ```bash
   pnpm changeset version
   ```
   This updates:
   - `CHANGELOG.md` for each package
   - `package.json` versions
   - Lock files

3. **Review and merge** version PR

4. **Publish** (automated after merge):
   - Builds OSS packages
   - Validates no leaks
   - Syncs to public repos
   - Publishes to npm as `@snapback-oss/*`

### Manual Release

If automation fails:
```bash
# Build OSS versions
pnpm build:oss

# Validate
pnpm validate:oss

# Sync to public repos
./scripts/initial-oss-sync.sh

# Publish to npm (from public repo)
cd /path/to/public/contracts
npm publish
```

## Handling Community Contributions

### When someone opens a PR on a public repo:

1. **Review PR** on GitHub public repo
   - Check code quality
   - Verify tests pass
   - Ensure no breaking changes

2. **Apply to private repo**:
   ```bash
   # Fetch the PR
   gh pr checkout PR_NUMBER --repo snapback-dev/contracts

   # Copy changes to private repo's src/public/
   cp -r src/* ~/snapback.dev/packages/contracts/src/public/

   # Test in private repo
   cd ~/snapback.dev
   pnpm build
   pnpm test

   # Commit
   git add packages/contracts/src/public
   git commit -m "feat: apply community contribution from @username"
   git push
   ```

3. **Auto-sync** pushes updated build to public repo

4. **Thank contributor** on original PR:
   ```
   Thank you @username! This has been merged and will be included in the next release.

   Changes applied in: [link to private repo commit]
   ```

## Troubleshooting

### IP Leak Detected

```bash
# Find the leak
grep -r "forbidden-word" packages/*/src/public/

# Fix by moving to src/private/ or refactoring
```

### Build Fails

```bash
# Check TypeScript errors
pnpm typecheck

# Check for missing dependencies in OSS packages
cd packages-oss/contracts
pnpm install
```

### Sync Fails

```bash
# Check GitHub token
gh auth status

# Verify public repos exist
gh repo view snapback-dev/contracts

# Check network connection
ping github.com
```

## Directory Reference

### Private Repo Structure

```
packages/
├── contracts/
│   ├── src/
│   │   ├── public/          ← OSS code
│   │   │   ├── events/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── private/         ← Proprietary code
│   │   │   ├── subscription/
│   │   │   ├── tiers/
│   │   │   └── dashboard/
│   │   └── index.ts         ← Full exports (private use)
│   ├── package.json
│   └── tsup.config.ts       ← Dual build config
```

### Public Repo Structure (Auto-generated)

```
snapback-dev/contracts/
├── src/                     ← Synced from packages/contracts/src/public/
├── dist/                    ← Built artifacts
├── package.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── CONTRIBUTING.md
```

## Commands Cheat Sheet

```bash
# Build OSS packages only
pnpm build:oss

# Validate no IP leaks
pnpm validate:oss

# Create changeset
pnpm changeset

# Sync to public repos
./scripts/initial-oss-sync.sh

# Check GitHub auth
gh auth status

# View public repo
gh repo view snapback-dev/contracts --web
```

## Security Best Practices

1. **Never** commit API keys or secrets to OSS packages
2. **Always** review diffs before syncing to public
3. **Use** environment variables for configuration
4. **Validate** all inputs in public APIs
5. **Sanitize** error messages (no stack traces with internal paths)

## Support

- **Questions**: Ask in #dev-oss Slack channel
- **Issues**: Report to engineering lead
- **Security**: security@snapback.dev (private)

---

Last updated: 2025-12-04
