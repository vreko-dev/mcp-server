# OSS Repository Migration Guide

## Quick Start

### Step 1: Create GitHub Repositories

```bash
# Make sure you're authenticated with GitHub CLI
gh auth status

# Create all public repositories
./scripts/create-oss-repos.sh
```

This creates 5 public repositories under `github.com/snapback-dev`:
- `contracts`
- `infrastructure`
- `sdk`
- `events`
- `config`

### Step 2: Set Up GitHub Token

1. Create a Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (all), `workflow`
   - Copy the token

2. Add to repository secrets:
   - Go to your private repo settings
   - Secrets and variables → Actions
   - New repository secret
   - Name: `OSS_SYNC_TOKEN`
   - Value: [paste token]

### Step 3: Run Initial Build

```bash
# Build OSS packages locally
pnpm build:oss

# Validate no IP leaks
pnpm validate:oss
```

### Step 4: Test GitHub Actions

```bash
# Push a small change to trigger workflow
git add .
git commit -m "test: trigger OSS sync"
git push
```

Check Actions tab to see if sync workflow runs successfully.

## Repository Structure

### snapback-dev/contracts
Type definitions and Zod schemas for SnapBack

**Contents:**
- Event types
- Snapshot types
- Session management
- ID generation

**Excludes:**
- Subscription types
- Tier definitions
- Dashboard schemas

### snapback-dev/infrastructure
Logging, metrics, and tracing utilities

**Contents:**
- Pino logger
- Generic metrics
- OpenTelemetry tracing

**Excludes:**
- PostHog integration
- Analytics events
- Proprietary telemetry

### snapback-dev/sdk
Client SDK for SnapBack API

**Contents:**
- Snapshot CRUD
- File protection
- HTTP client
- Type-safe API

**Excludes:**
- better-sqlite3 dependency
- Platform integrations
- Premium features

### snapback-dev/events
Event bus implementation

**Contents:**
- EventEmitter2 wrapper
- Type-safe events

### snapback-dev/config
Configuration utilities

**Contents:**
- Config loading
- Validation helpers

## Manual Sync Process

If you need to manually sync a package:

```bash
# Build OSS version
pnpm build:oss

# Clone public repo
gh repo clone snapback-dev/contracts /tmp/contracts

# Copy files
cp -r dist-oss/contracts/* /tmp/contracts/

# Update README
cp scripts/oss-templates/contracts-README.md /tmp/contracts/README.md

# Commit and push
cd /tmp/contracts
git add .
git commit -m "sync: manual sync from private repo"
git push
```

## Handling Community Contributions

### When someone opens a PR on a public repo:

1. **Review the PR** on GitHub
2. **If approved**, apply changes to your private repo:
   ```bash
   # Fetch the PR
   gh pr checkout PR_NUMBER

   # Copy changes to private repo's src/public/
   # Test locally
   pnpm build
   pnpm test

   # Commit to private repo
   git commit -m "feat: apply community contribution"
   git push
   ```
3. **Auto-sync** will push updated build to public repo
4. **Close PR** with comment thanking contributor

## Troubleshooting

### Sync workflow fails

**Check:**
- `OSS_SYNC_TOKEN` is set correctly
- Token has `repo` and `workflow` scopes
- Public repos exist and are accessible

### IP leak detected

**If validation fails:**
```bash
# Find the leak
grep -r "forbidden-word" dist-oss/

# Fix in src/private/ or update validation rules
```

### Build fails

```bash
# Check TypeScript errors
pnpm typecheck

# Check for missing deps
pnpm install

# Rebuild
pnpm build:oss
```

## Next Steps

After initial setup:

1. **Update package READMEs** with actual usage examples
2. **Add examples/** directories to public repos
3. **Set up npm publishing** (optional)
4. **Announce** to community
5. **Monitor issues** and PRs on public repos

## Resources

- [Main Migration Plan](./oss-migration-plan.md)
- [Optimal Architecture Doc](../brain/[id]/optimal-architecture.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
