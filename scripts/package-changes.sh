#!/bin/bash

# Script to package uncommitted changes into logical commits
# Usage: ./scripts/package-changes.sh

set -e

echo "=== Packaging Uncommitted Changes ==="
echo

# Function to create a commit
create_commit() {
    local message="$1"
    echo "Creating commit: $message"
    git commit -m "$message"
    echo
}

# Function to add files to staging area
stage_files() {
    echo "Staging files:"
    for file in "$@"; do
        if [ -f "$file" ]; then
            echo "  $file"
            git add "$file" 2>/dev/null || echo "  Warning: Could not stage $file"
        elif [ -d "$file" ]; then
            echo "  $file/ (directory)"
            git add "$file" 2>/dev/null || echo "  Warning: Could not stage $file"
        else
            echo "  $file (not found, may be deleted)"
            # For deleted files, we need to use git rm
            git rm --cached "$file" 2>/dev/null || echo "  Note: File not in index"
        fi
    done
    echo
}

# Create backup branch before making changes
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BACKUP_BRANCH="backup/pre-packaging-$(date +%Y%m%d-%H%M)"
echo "Creating backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH" "$CURRENT_BRANCH"
echo

echo "=== Commit Group 1: VS Code Extension Core Improvements ==="
stage_files \
    apps/vscode/package.json \
    apps/vscode/src/extension.ts \
    apps/vscode/src/protection/ConfigFileManager.ts \
    apps/vscode/src/storage/SqliteCheckpointStorage.ts \
    apps/vscode/src/storage/SqliteStorageAdapter.ts

create_commit "feat(vscode): enhance extension with improved storage and configuration management"

echo "=== Commit Group 2: VS Code Extension Testing ==="
stage_files \
    apps/vscode/test/regression/issue-009-tree-header-branding.test.ts \
    apps/vscode/test/unit/ConfigFileManager.unit.test.ts \
    apps/vscode/test/unit/storage/SqliteStorageAdapterRestore.test.ts \
    apps/vscode/test/unit/storage/sqlite-storage.test.ts

create_commit "test(vscode): add comprehensive test coverage for storage and configuration features"

echo "=== Commit Group 3: Storage Package Improvements ==="
stage_files \
    packages/storage/src/adapters/fs.ts \
    packages/storage/test/restore-filesystem.test.ts

create_commit "feat(storage): enhance filesystem adapter with improved restore capabilities"

echo "=== Commit Group 4: VS Code Extension Configuration and Environment ==="
stage_files \
    apps/vscode/.env.example \
    apps/vscode/.snapbackrc.example \
    apps/vscode/biome.json \
    apps/vscode/media/vscode-icon.min.svg

create_commit "feat(vscode): update configuration files and assets"

echo "=== Commit Group 5: GitHub Actions Workflow Updates ==="
stage_files \
    .github/workflows/ci-cd.yml \
    .github/workflows/publish-extension.yml \
    .github/workflows/security-scan.yml \
    .github/workflows/vscode-performance.yml \
    .github/workflows/vscode-test.yml

create_commit "chore(ci): update GitHub Actions workflows for improved CI/CD"

echo "=== Commit Group 6: New GitHub Actions Workflows ==="
stage_files \
    .github/workflows/cli-validate.yml \
    .github/workflows/deploy-mcp.yml \
    .github/workflows/deploy-web.yml \
    .github/workflows/mcp-validate.yml \
    .github/workflows/publish-cli.yml \
    .github/workflows/publish-vscode-extension.yml \
    .github/workflows/vscode-validate.yml \
    .github/workflows/web-validate.yml

create_commit "feat(ci): add new GitHub Actions workflows for comprehensive validation"

echo "=== Commit Group 7: Documentation and Configuration Files ==="
stage_files \
    SDK_IMPLEMENTATION_GUIDE.md \
    apps/vscode/.gitignore \
    apps/vscode/claudedocs/SNAPBACKRC_ARCHITECTURE_REVIEW.md \
    apps/vscode/docs/ci-cd-best-practices.md \
    apps/vscode/docs/ci-cd-changes-summary.md \
    apps/vscode/docs/ci-cd-implementation-guide.md \
    apps/vscode/scripts/validate-manifest.js

create_commit "docs: add implementation guides and documentation for SDK and CI/CD"

echo "=== Commit Group 8: Development Scripts and Tools ==="
stage_files \
    scripts/analyze-commits.sh \
    scripts/auto-group-commits.sh \
    scripts/commit-grouping-guide.md \
    scripts/commit-grouping-quick-reference.md \
    scripts/group_commits.py \
    scripts/updated-commit-grouping.md

create_commit "chore(dev): add development tools for commit management and analysis"

echo "=== Commit Group 9: Removed Obsolete Workflows ==="
# Handle deleted files
git rm --cached .github/workflows/build-and-test.yml 2>/dev/null || true
git rm --cached .github/workflows/code-quality.yml 2>/dev/null || true
git rm --cached .github/workflows/e2e-tests.yml 2>/dev/null || true

create_commit "chore(ci): remove obsolete GitHub Actions workflows"

echo "=== Packaging Complete ==="
echo "All changes have been packaged into logical commits."
echo "Backup branch: $BACKUP_BRANCH"
echo
echo "Next steps:"
echo "1. Review your commits with: git log --oneline -10"
echo "2. Push changes if satisfied: git push origin $CURRENT_BRANCH"
echo "3. If you need to make changes: git reset --soft HEAD~9"