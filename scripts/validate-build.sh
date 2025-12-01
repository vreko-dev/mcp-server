#!/usr/bin/env bash
# Build validation script to ensure TypeScript builds produced actual output
# This catches the "up to date but no output" tsbuildinfo cache corruption issue

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Validating build outputs..."

FAILED_PACKAGES=()

# Check TypeScript packages that should have dist/ directories
TYPESCRIPT_PACKAGES=(
  "packages/contracts"
  "packages/events"
  "packages/storage"
  "packages/core"
  "packages/logs"
  "packages/analytics"
  "packages/sdk"
  "packages/telemetry"
  "packages/config"
  "apps/mcp-server"
  "apps/cli"
)

for pkg in "${TYPESCRIPT_PACKAGES[@]}"; do
  PKG_PATH="$PROJECT_ROOT/$pkg"
  DIST_PATH="$PKG_PATH/dist"

  # Check if package exists
  if [ ! -d "$PKG_PATH" ]; then
    continue
  fi

  # Check if package has a build script
  if ! grep -q '"build"' "$PKG_PATH/package.json" 2>/dev/null; then
    continue
  fi

  # Check if dist directory exists
  if [ ! -d "$DIST_PATH" ]; then
    echo "❌ $pkg: dist/ directory missing"
    FAILED_PACKAGES+=("$pkg")
    continue
  fi

  # Check if dist has any .js files
  JS_COUNT=$(find "$DIST_PATH" -name "*.js" -type f 2>/dev/null | wc -l | xargs)
  if [ "$JS_COUNT" -eq 0 ]; then
    echo "❌ $pkg: dist/ exists but contains no .js files"
    FAILED_PACKAGES+=("$pkg")
    continue
  fi

  echo "✅ $pkg: $JS_COUNT JS files"
done

# Report results
if [ ${#FAILED_PACKAGES[@]} -eq 0 ]; then
  echo ""
  echo "✅ All builds validated successfully!"
  exit 0
else
  echo ""
  echo "❌ Build validation failed for ${#FAILED_PACKAGES[@]} package(s):"
  for pkg in "${FAILED_PACKAGES[@]}"; do
    echo "   - $pkg"
  done
  echo ""
  echo "💡 This usually means tsbuildinfo cache is stale. Try:"
  echo "   pnpm run clean:tsbuildinfo && pnpm run build"
  echo "   or"
  echo "   pnpm run rebuild"
  exit 1
fi
