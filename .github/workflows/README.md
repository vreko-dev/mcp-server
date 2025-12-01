# GitHub Actions Workflows

This directory contains all the GitHub Actions workflows for the SnapBack project.

## Workflows Overview

### Continuous Integration (CI)

1. **[turborepo-ci.yml](turborepo-ci.yml)** - Main CI pipeline that tests all packages with proper database integration
2. **[ci.yml](ci.yml)** - Legacy workflow (redirects to turborepo-ci.yml)

### Continuous Deployment (CD)

1. **[publish-extension.yml](publish-extension.yml)** - Publishes the VS Code extension to the marketplace
2. **[update-version.yml](update-version.yml)** - Automatically updates version numbers when a release is created
3. **[dependency-update.yml](dependency-update.yml)** - Automatically updates dependencies weekly

## Primary CI Workflow (turborepo-ci.yml)

This is now the **primary and only required CI workflow** for the project. It includes:

-   Full test suite execution for all packages
-   PostgreSQL database service for integration tests
-   Coverage thresholds enforcement (70% lines, 70% functions, 65% branches, 70% statements)
-   Proper error handling (no --continue flags)
-   Pre-commit hooks and commit linting

## Required Secrets

For these workflows to function properly, you'll need to set the following secrets in your GitHub repository:

-   `TURBO_TOKEN` - Token for Turborepo remote caching
-   `TURBO_TEAM` - Team name for Turborepo remote caching
-   `CODECOV_TOKEN` - Token for Codecov coverage reporting (optional)
-   `STRIPE_TEST_KEY` - Stripe test key for payment integration tests

## Branch Protection

Configure branch protection rules to require the following status checks:

-   `Turborepo CI / ci-status` - Ensures all CI checks pass before merging

## Workflow Improvements

### Before (❌ Issues)

-   Payments package missing test script
-   No database service in CI
-   --continue flag allowing failures
-   Multiple confusing CI workflows
-   No coverage thresholds

### After (✅ Fixed)

-   Payments package now has proper test scripts
-   PostgreSQL service configured for integration tests
-   Removed --continue flags to block on failures
-   Consolidated CI workflows (turborepo-ci.yml is primary)
-   Coverage thresholds enforced (70% minimum)
-   Pre-commit hooks and commit linting
