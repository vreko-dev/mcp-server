#!/bin/bash

set -e

echo "🧹 SnapBack Repository Cleanup"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fix hardcoded path - use git to determine repo root
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "📍 Working directory: $REPO_ROOT"

# Track changes
DELETED_ITEMS=()
MOVED_ITEMS=()

echo "📋 Cleanup Tasks:"
echo "  1. Remove .husky directory (replaced by lefthook)"
echo "  2. Clean up duplicate vscode app directories"
echo "  3. Move implementation summaries to archive"
echo "  4. Organize documentation"
echo ""

read -p "Proceed with cleanup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🗑️  Step 1: Removing dead code..."

# Remove .husky directory
if [ -d ".husky" ]; then
    rm -rf .husky
    DELETED_ITEMS+=(".husky/ (replaced by lefthook)")
    echo "  ✓ Removed .husky/"
fi

# Remove duplicate vscode directories
if [ -d "apps/vuscode" ]; then
    rm -rf apps/vuscode
    DELETED_ITEMS+=("apps/vuscode/ (duplicate)")
    echo "  ✓ Removed apps/vuscode/"
fi

if [ -d "apps/vvscode" ]; then
    rm -rf apps/vvscode
    DELETED_ITEMS+=("apps/vvscode/ (old version)")
    echo "  ✓ Removed apps/vvscode/"
fi

echo ""
echo "📦 Step 2: Organizing documentation..."

# Create archive directory if needed
mkdir -p .archive/implementation-notes

# Move implementation summaries to archive
SUMMARY_FILES=(
    "CHECKPOINT_CLEANUP_SUMMARY.md"
    "CI_CD_IMPLEMENTATION_SUMMARY.md"
    "FIXES_SUMMARY.md"
    "IMPLEMENTATION_REVIEW_CORRECTIONS.md"
    "IMPLEMENTATION_SUMMARY.md"
    "LEFTHOOK_SETUP.md"
    "PAYMENT_WEBHOOK_FIXES_SUMMARY.md"
    "RESOURCE_PATTERN_FINAL_STATUS.md"
    "RESOURCE_PATTERN_IMPLEMENTATION_PLAN.md"
    "RESOURCE_PATTERN_IMPLEMENTATION_SUMMARY.md"
    "SNAPSHOT_RENAMING_SUMMARY.md"
    "TDD_IMPLEMENTATION_COMPLETE.md"
    "TODO-checkpoint-refactoring.md"
    "PHENOMENALLY_ELEGANT_DX.md"
)

for file in "${SUMMARY_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" .archive/implementation-notes/
        MOVED_ITEMS+=("$file → .archive/implementation-notes/")
        echo "  ✓ Moved $file to archive"
    fi
done

# Move SDK guide to claudedocs
if [ -f "SDK_IMPLEMENTATION_GUIDE.md" ]; then
    mv SDK_IMPLEMENTATION_GUIDE.md claudedocs/
    MOVED_ITEMS+=("SDK_IMPLEMENTATION_GUIDE.md → claudedocs/")
    echo "  ✓ Moved SDK_IMPLEMENTATION_GUIDE.md to claudedocs/"
fi

echo ""
echo "✅ Cleanup Complete!"
echo ""

# Summary
if [ ${#DELETED_ITEMS[@]} -gt 0 ]; then
    echo "🗑️  Deleted (${#DELETED_ITEMS[@]} items):"
    for item in "${DELETED_ITEMS[@]}"; do
        echo "   - $item"
    done
    echo ""
fi

if [ ${#MOVED_ITEMS[@]} -gt 0 ]; then
    echo "📦 Moved (${#MOVED_ITEMS[@]} items):"
    for item in "${MOVED_ITEMS[@]}"; do
        echo "   - $item"
    done
    echo ""
fi

echo "📋 Next Steps:"
echo "  1. Review changes: git status"
echo "  2. Commit cleanup: git add . && git commit -m 'chore: clean up dead code and organize documentation'"
echo ""

# Check for any remaining temp files
TEMP_FILES=$(find . -maxdepth 1 -type f -name "*TEMP*" -o -name "*TODO*" -o -name "*OLD*" 2>/dev/null | grep -v node_modules || true)
if [ -n "$TEMP_FILES" ]; then
    echo "⚠️  Found additional temporary files:"
    echo "$TEMP_FILES"
    echo "   Consider reviewing these for cleanup"
fi
