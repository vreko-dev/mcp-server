# Autoversioning System

## Overview

This document explains the autoversioning system implemented for the SnapBack project to prevent version conflict issues going forward.

## Why Autoversioning?

Previously, version conflicts occurred due to:

1. Manual version management across multiple packages
2. Inconsistent versioning between related packages
3. Lack of automated version bumping during releases
4. No clear changelog generation

## Solution: Changesets

We've implemented [Changesets](https://github.com/changesets/changesets) to automate version management across our monorepo.

### How It Works

1. **During Development**: Developers create changesets when making changes that require version bumps
2. **During PR Review**: Changesets are reviewed as part of the code review process
3. **On Merge to Main**: Changesets are automatically processed to create version bump PRs
4. **On Version PR Merge**: Packages are automatically published with updated versions

### Benefits

-   **Consistent Versioning**: All related packages are versioned consistently
-   **Automated Process**: No manual version bumps needed
-   **Changelog Generation**: Automatic changelog creation based on changeset descriptions
-   **Traceability**: Clear connection between code changes and version bumps
-   **Reduced Conflicts**: Eliminates manual version conflicts

## Implementation Details

### Configuration

The system is configured in:

-   `.changeset/config.json` - Changesets configuration
-   `.github/workflows/release.yml` - Release automation workflow
-   `.github/workflows/snapshot-release.yml` - Snapshot release workflow

### Commands

Available commands in the root `package.json`:

-   `pnpm changeset` - Create a new changeset
-   `pnpm version-packages` - Apply version bumps from changesets
-   `pnpm release` - Publish packages to npm
-   `pnpm snapshot` - Create a snapshot release
-   `pnpm release-snapshot` - Publish a snapshot release

### Package Versioning Strategy

-   **Independent Versioning**: Each package can have its own version
-   **Linked Packages**: Related packages that should always have the same version (if needed)
-   **Access Control**: Packages are published as public by default

## Workflow

### 1. Making Changes

When making changes that require a version bump:

```bash
pnpm changeset
```

Follow the prompts to:

1. Select which packages have changed
2. Choose the type of version bump (major, minor, patch)
3. Describe the changes for the changelog

### 2. Submitting a PR

Include both your code changes and the generated changeset file in your PR.

### 3. Merging to Main

When your PR is merged to the main branch, the release workflow will:

1. Create a new PR with version bumps
2. Generate updated changelogs
3. Update package.json files

### 4. Publishing

When the version bump PR is merged, packages are automatically published to npm.

## Snapshot Releases

For beta/testing releases, we use snapshot releases:

1. Merge changes to the `beta` branch
2. Snapshot workflow automatically creates and publishes snapshot versions
3. Snapshot versions follow the pattern `beta-{tag}.{datetime}`

## Best Practices

1. **Create Changesets Early**: Create changesets as part of your development work
2. **Be Descriptive**: Write clear, concise changelog entries
3. **Choose Correct Version Bumps**: Follow semantic versioning principles
4. **Review Changesets**: Review changesets during PR review
5. **Keep Changesets Small**: One changeset per logical change

## Troubleshooting

### No Version Bump PR Created

-   Ensure changesets were included in the merge
-   Check the GitHub Actions workflow logs
-   Verify the base branch is `main`

### Publishing Failures

-   Check npm token permissions
-   Verify package names and scopes
-   Review GitHub Actions workflow logs

## Future Improvements

1. **Automated Version Bumping**: Based on commit message conventions
2. **Release Notes Generation**: Enhanced changelog formatting
3. **Multi-Channel Publishing**: Different release channels (alpha, beta, stable)
4. **Dependency Update Automation**: Automatic updates for internal dependencies
