# Pre-Publish Automation Guide

Comprehensive workflow for preparing packages for npm publication.

## Overview

The pre-publish automation handles:
1. ✅ **File cleanup** - Archives non-essential files
2. ✅ **SEO validation** - Validates content for optimal SEO
3. ✅ **Changeset versioning** - Bumps versions and generates CHANGELOGs
4. ✅ **OSS sync** - Syncs open-source packages (filtered)
5. ✅ **Documentation updates** - Checks for version references
6. ✅ **Build validation** - Ensures all OSS packages build successfully
7. ✅ **Publish readiness** - Final checklist before npm publish

## Quick Start

```bash
# Dry run (safe preview)
pnpm pre-publish:dry-run

# Execute full workflow
pnpm pre-publish

# Skip specific steps
pnpm pre-publish --skip-seo --skip-cleanup
```

## Workflow Steps

### 1. File Cleanup (Archival)

**Archives 43+ files** to `.archive/` organized by category:
- `planning/` - Architecture docs, design files
- `deprecated/` - Old versions (*.v1.ts, *.old, etc.)
- `implementation-guides/` - Internal guides
- `reviews/` - Code review files
- `dev-notes/` - Scratch files, TODOs
- `test-artifacts/` - Non-essential fixtures

**Files archived**:
- `ARCHITECTURE_*.md`
- `*_REVIEW.md`
- `*.v1.ts`, `*.old.ts`
- `TODO.md`, `scratch.*`
- `*.STUB.tsx`

### 2. SEO Validation

Validates content files for:
- ✅ Metadata schema (title, description, keywords)
- ✅ Minimum word count (300 words)
- ✅ Heading hierarchy (proper H1→H2→H3)
- ✅ Keyword density (<3% to avoid over-optimization)
- ✅ Reading time calculation

**Skipped in dry-run** due to current validation errors.

### 3. Changeset Version Bump

**Current changeset**: `major-repo-reorg.md`

Bumps versions for:
- `@snapback/sdk`
- `@snapback/contracts`
- `@snapback/core`
- `@snapback/events`
- `@snapback/infrastructure`
- `@snapback/integrations`
- `@snapback/platform`
- `@snapback/config`
- `@snapback/web`
- `snapback-vscode`
- `@snapback/cli`
- `@snapback/mcp-server`

**Generates**:
- Updated `package.json` versions
- `CHANGELOG.md` entries for each package

### 4. OSS Package Sync

**Two-phase sync**:

1. **Version sync from npm** - Private packages pull latest OSS versions from npm registry
2. **OSS source sync** - Update OSS packages with latest changes (filtered)

**Why this matters**:
- Private packages (@snapback/core, @snapback/auth) depend on published OSS packages from npm
- Ensures version consistency across workspace
- Allows independent versioning of OSS packages

**OSS Packages (published to npm)**:
- `@snapback/contracts`
- `@snapback/infrastructure`
- `@snapback/sdk`
- `@snapback/events`
- `@snapback/config`

**OSS Apps**:
- `@snapback/mcp-server`
- `@snapback/cli`

**Filtering applied**:
- Excludes proprietary packages (`@snapback/auth`, `@snapback/platform`)
- Removes sensitive content (tier logic, analytics, pricing)
- Per `@repo_polish.md` rules

**Version synchronization**:
```bash
# Pull latest OSS versions from npm and update private packages
pnpm sync-oss-versions

# Preview changes
pnpm sync-oss-versions:dry-run
```

**Example**: After publishing `@snapback/contracts@0.4.0` to npm:
- Private packages automatically update to `"@snapback-oss/contracts": "^0.4.0"`
- Ensures consistency across workspace

**Version overrides** (optional):
```json
// .version-overrides.json
{
  "@snapback/contracts": "0.3.0",  // Pin to specific version
  "@snapback/sdk": "^0.4.0"        // Use range
}
```

### 5. Documentation Updates

Checks for version references in:
- Package `README.md` files
- Installation instructions
- API documentation

**Current warnings** (manual review needed):
- `@snapback-oss/contracts` README
- `@snapback-oss/infrastructure` README
- `@snapback-oss/sdk` README
- `@snapback-oss/events` README
- `@snapback-oss/config` README

### 6. Build Validation

Builds all OSS packages:
```bash
pnpm build:oss
pnpm validate:oss
```

**Ensures**:
- TypeScript compilation succeeds
- No missing dependencies
- Exports are valid
- Package structure is correct

### 7. Publish Readiness Check

**Final checklist**:
- ✅ Git status (staged vs unstaged)
- ✅ Package count (5 packages + 2 apps)
- ✅ Next steps guidance

## Manual Steps After Automation

### 1. Review Git Changes

```bash
git status
git diff
```

**Expected changes**:
- `package.json` versions bumped
- `CHANGELOG.md` entries added
- `.archive/` directory created (gitignored)

### 2. Commit Release

```bash
git add .
git commit -m "chore: release

- @snapback/contracts@X.Y.Z
- @snapback/infrastructure@X.Y.Z
- @snapback/sdk@X.Y.Z
- @snapback/events@X.Y.Z
- @snapback/config@X.Y.Z
- @snapback/mcp-server@X.Y.Z
- @snapback/cli@X.Y.Z

Major repository reorganization: consolidated 10 packages into 4."
```

### 3. Push to Remote

```bash
git push origin main
```

### 4. Publish to npm

```bash
# All OSS packages + apps
pnpm publish:oss

# Individual packages
pnpm publish:mcp
pnpm publish:cli
```

## Troubleshooting

### Error: "Found changeset for package X which is not in the workspace"

**Fix**: Update `.changeset/*.md` to use correct package name from `package.json`

Example:
```diff
-"@snapback/vscode": minor
+"snapback-vscode": minor
```

### Error: "Build failed for package X"

**Fix**:
1. Check TypeScript errors: `pnpm type-check`
2. Install missing dependencies: `pnpm install`
3. Build dependencies first: `pnpm build:oss`

### Warning: "README version may need update"

**Manual fix**:
1. Open `packages-oss/[package]/README.md`
2. Update version references
3. Commit: `git commit -m "docs: update README versions"`

### SEO Validation Fails

**Skip for now**:
```bash
pnpm pre-publish --skip-seo
```

**Or fix validation errors**:
1. Check `tooling/seo-automation/src/validate-all.ts` errors
2. Fix metadata schema in content frontmatter
3. Re-run validation

## Configuration

### Skip Steps

```bash
pnpm pre-publish \
  --skip-cleanup \
  --skip-seo \
  --skip-changeset \
  --skip-oss-sync \
  --skip-docs
```

### Dry Run (Always Safe)

```bash
pnpm pre-publish:dry-run
```

## OSS Package Filters

Defined in `scripts/pre-publish.ts`:

```typescript
const OSS_PACKAGES = [
  '@snapback/contracts',
  '@snapback/infrastructure',
  '@snapback/sdk',
  '@snapback/events',
  '@snapback/config',
];

const OSS_APPS = [
  '@snapback/mcp-server',
  '@snapback/cli',
];
```

## Changeset Workflow

### Create Changeset

```bash
pnpm changeset
```

**Prompts**:
1. Select packages to include
2. Choose bump type (patch/minor/major)
3. Write changelog message

### Version Packages

```bash
pnpm version-packages
```

**Creates**:
- Updated `package.json` versions
- `CHANGELOG.md` entries
- Git tags (optional)

### Publish Packages

```bash
pnpm changeset publish
```

**Alternative** (manual):
```bash
pnpm publish:oss
```

## Best Practices

1. **Always run dry-run first**: `pnpm pre-publish:dry-run`
2. **Review git diff before committing**: Ensure no proprietary content leaked
3. **Test published packages**: Install from npm in test project
4. **Update documentation**: Sync version numbers in README files
5. **Create GitHub release**: Tag release with changelog

## Integration with CI/CD

### GitHub Actions

```yaml
name: Publish OSS Packages

on:
  push:
    branches:
      - main
    paths:
      - '.changeset/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - name: Install dependencies
        run: pnpm install
      - name: Pre-publish automation
        run: pnpm pre-publish
      - name: Publish to npm
        run: pnpm publish:oss
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [pnpm Publish Documentation](https://pnpm.io/cli/publish)
- [Open-Core Architecture](./OPEN_CORE_ARCHITECTURE.md)
- [SEO Automation](../../tooling/seo-automation/README.md)
- [File Archival](../../tooling/seo-automation/ARCHIVE_GUIDE.md)

---

**Last Updated**: 2025-12-05  
**Maintainer**: SnapBack Team
