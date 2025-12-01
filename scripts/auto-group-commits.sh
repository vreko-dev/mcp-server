#!/bin/bash

# Script to help with commit grouping
# Usage: ./scripts/auto-group-commits.sh [number_of_commits]

set -e

NUMBER_OF_COMMITS=${1:-20}  # Default to 20 commits if not specified

echo "=== SnapBack Commit Grouping Helper ==="
echo "This script will help you group the last $NUMBER_OF_COMMITS commits"
echo

# Check if we're on the right branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "recovery/protection-levels-tdd" ]]; then
    echo "Warning: You are not on the recovery/protection-levels-tdd branch"
    echo "Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create backup branch
echo "Creating backup branch..."
git branch "backup/grouping-$(date +%Y%m%d-%H%M)" "$CURRENT_BRANCH" 2>/dev/null || true
echo "Backup branch created: backup/grouping-$(date +%Y%m%d-%H%M)"
echo

# Show recent commits
echo "=== Recent $NUMBER_OF_COMMITS commits ==="
git log --oneline -"$NUMBER_OF_COMMITS"
echo

# Show commit categories
echo "=== Commit Analysis ==="
echo "VS Code extension commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "vscode" || echo "0"
echo

echo "Web application commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "web" || echo "0"
echo

echo "Marketing commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "marketing" || echo "0"
echo

echo "Test commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "test" || echo "0"
echo

echo "Documentation commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "docs" || echo "0"
echo

echo "Dependency commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "deps" || echo "0"
echo

echo "Refactor commits:"
git log --oneline -"$NUMBER_OF_COMMITS" | grep -c "refactor" || echo "0"
echo

# Instructions
echo "=== Next Steps ==="
echo "1. Run: git rebase -i HEAD~$NUMBER_OF_COMMITS"
echo "2. Use the grouping strategy in scripts/updated-commit-grouping.md"
echo "3. Replace 'pick' with 'squash' for commits you want to combine"
echo "4. Save and close the editor to begin the rebase"
echo
echo "Remember to:"
echo "- Create meaningful commit messages when squashing"
echo "- Test your changes after grouping"
echo "- Use 'git rebase --abort' if something goes wrong"