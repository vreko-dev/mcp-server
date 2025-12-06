#!/bin/bash

# SnapBack Biome Auto-Fix Script
# Helps developers fix biome linting issues before commit
# Usage: ./scripts/fix-biome.sh

set -e

echo "🔧 Running Biome auto-fix on the entire codebase..."
echo "   This will apply 'safe' fixes only (no breaking changes)"
echo ""

# Run biome with write flag to auto-fix all issues
if pnpm biome check --write --max-diagnostics=5000; then
    echo ""
    echo "✅ Biome fixes applied successfully!"
    echo "📝 Review the changes and stage them:"
    echo "   git add -A && git commit"
else
    echo ""
    echo "⚠️  Some issues required manual fixes."
    echo "   Review the errors above and fix them manually."
    echo ""
    echo "Common fixes:"
    echo "  • Unused variables: Remove or prefix with _ to intentionally ignore"
    echo "  • Node.js imports: Use 'node:' prefix (e.g., import { promises as fs } from 'node:fs')"
    echo "  • Missing semicolons: Biome can auto-fix these"
    echo ""
    exit 1
fi
