#!/usr/bin/env bash
# Phase 1 - Filter Contracts Package
# Removes IP-sensitive files and creates OSS-safe contracts package

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 Phase 1: Filtering contracts package for OSS..."
cd "$ROOT_DIR"

# Step 1: Copy entire contracts package to OSS
echo "📋 Copying contracts to packages-oss..."
rsync -av --exclude='node_modules' --exclude='dist' \
  packages/contracts/ packages-oss/contracts/

# Step 2: Remove IP-sensitive files
echo "🗑️  Removing IP-sensitive files..."

SENSITIVE_FILES=(
  "src/tiers.ts"
  "src/analytics.ts"
  "src/feature-manager.ts"
  "src/events/infrastructure.ts"
)

for file in "${SENSITIVE_FILES[@]}"; do
  FILE_PATH="packages-oss/contracts/$file"
  if [ -f "$FILE_PATH" ]; then
    echo "   Removing: $file"
    rm "$FILE_PATH"
  else
    echo "   ⚠️  Not found (may already be removed): $file"
  fi
done

# Step 3: Update events/index.ts to remove infrastructure export
echo "📝 Updating events/index.ts..."
EVENTS_INDEX="packages-oss/contracts/src/events/index.ts"

if [ -f "$EVENTS_INDEX" ]; then
  # Create backup
  cp "$EVENTS_INDEX" "$EVENTS_INDEX.backup"

  # Remove infrastructure export
  sed -i.bak '/infrastructure/d' "$EVENTS_INDEX"
  rm "$EVENTS_INDEX.bak"

  echo "   Updated: removed infrastructure exports"
fi

# Step 4: Update main index.ts to remove sensitive exports
echo "📝 Updating main index.ts..."
MAIN_INDEX="packages-oss/contracts/src/index.ts"

if [ -f "$MAIN_INDEX" ]; then
  cp "$MAIN_INDEX" "$MAIN_INDEX.backup"

  # TODO(phase1): This is naive - may need manual review
  # Remove exports for tiers, analytics, feature-manager
  sed -i.bak '/tiers/d' "$MAIN_INDEX"
  sed -i.bak '/analytics/d' "$MAIN_INDEX"
  sed -i.bak '/feature-manager/d' "$MAIN_INDEX"
  rm "$MAIN_INDEX.bak"

  echo "   Updated: removed sensitive exports"
fi

# Step 5: Update package.json
echo "📝 Updating package.json..."
cat > packages-oss/contracts/package.json << 'EOF'
{
  "name": "@snapback-oss/contracts",
  "description": "Type definitions and contracts for SnapBack OSS",
  "version": "0.1.0",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "license": "Apache-2.0",
  "scripts": {
    "build": "node scripts/build.contracts.mjs",
    "check": "biome check .",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --fix .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "catalog:",
    "nanoid": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "diff": "catalog:",
    "dotenv": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./events": {
      "types": "./dist/events/index.d.ts",
      "import": "./dist/events/index.js",
      "require": "./dist/events/index.cjs"
    },
    "./events/core": {
      "types": "./dist/events/core.d.ts",
      "import": "./dist/events/core.js",
      "require": "./dist/events/core.cjs"
    },
    "./events/legacy": {
      "types": "./dist/events/legacy.d.ts",
      "import": "./dist/events/legacy.js",
      "require": "./dist/events/legacy.cjs"
    },
    "./session": {
      "types": "./dist/session.d.ts",
      "import": "./dist/session.js",
      "require": "./dist/session.cjs"
    },
    "./id-generator": {
      "types": "./dist/id-generator.d.ts",
      "import": "./dist/id-generator.js",
      "require": "./dist/id-generator.cjs"
    }
  }
}
EOF

# Step 6: Validation
echo "🔍 Validating contracts package..."

# Check that sensitive files are gone
echo "   Checking for sensitive files..."
for file in "${SENSITIVE_FILES[@]}"; do
  if [ -f "packages-oss/contracts/$file" ]; then
    echo "   ❌ ERROR: $file still exists!"
    exit 1
  fi
done

echo "✅ Contracts filtering complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review packages-oss/contracts/src/index.ts for any remaining sensitive exports"
echo "2. Run: pnpm --filter @snapback-oss/contracts build"
echo "3. Run: pnpm test -- contracts-filter"
echo ""
echo "🔍 Validation commands:"
echo "   grep -r \"tier\" packages-oss/contracts/src  # Should find minimal/no matches"
echo "   grep -r \"subscription\" packages-oss/contracts/src  # Should find minimal/no matches"
echo "   grep -r \"analytics\" packages-oss/contracts/src  # Should find minimal/no matches"

# TODO(phase1): Add automated check for other sensitive patterns
# VALIDATE(phase1): Manual review of index.ts exports recommended
