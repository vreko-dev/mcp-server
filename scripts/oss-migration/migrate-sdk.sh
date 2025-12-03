#!/usr/bin/env bash
# Phase 1 - Migrate SDK to OSS
# Copies SDK and updates imports to use OSS infrastructure/contracts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📦 Phase 1: Migrating SDK to packages-oss..."
cd "$ROOT_DIR"

# TODO(phase1): Add --dry-run flag

# Step 1: Copy SDK to OSS
echo "📋 Copying SDK to packages-oss..."
rsync -av --exclude='node_modules' --exclude='dist' --exclude='dist-types' \
  packages/sdk/ packages-oss/sdk/

# Step 2: Update package.json dependencies
echo "📝 Updating package.json dependencies..."
cat > packages-oss/sdk/package.json << 'EOF'
{
  "name": "@snapback-oss/sdk",
  "description": "SnapBack SDK for interacting with the SnapBack API",
  "version": "0.1.0",
  "author": "SnapBack Team",
  "license": "Apache-2.0",
  "main": "dist/index.js",
  "types": "dist-types/index.d.ts",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-s3": "catalog:",
    "@aws-sdk/s3-request-presigner": "catalog:",
    "@snapback-oss/contracts": "workspace:*",
    "@snapback-oss/infrastructure": "workspace:*",
    "ky": "catalog:",
    "minimatch": "catalog:",
    "ow": "catalog:",
    "p-retry": "catalog:",
    "quick-lru": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "exports": {
    ".": {
      "types": "./dist-types/index.d.ts",
      "default": "./dist/index.js"
    },
    "./storage": {
      "types": "./dist-types/storage/index.d.ts",
      "default": "./dist/storage/index.js"
    },
    "./session": {
      "types": "./dist-types/session/index.d.ts",
      "default": "./dist/session/index.js"
    }
  },
  "files": [
    "dist",
    "dist-types"
  ],
  "keywords": [
    "api",
    "client",
    "sdk",
    "snapback",
    "oss"
  ],
  "scripts": {
    "build": "tsup && tsc --emitDeclarationOnly --outDir dist-types -p tsconfig.build.json",
    "check": "biome check .",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --fix .",
    "test": "vitest run",
    "test:api": "vitest run tests/api/",
    "test:coverage": "vitest run --coverage",
    "test:coverage:integration": "vitest run tests/integration/ --coverage",
    "test:coverage:unit": "vitest run tests/ --coverage",
    "test:e2e": "vitest run tests/e2e/",
    "test:integration": "vitest run tests/integration/",
    "test:unit": "vitest run tests/",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
EOF

# Step 3: Update imports in source files
echo "🔄 Updating imports..."

# Find all TypeScript files and update imports
find packages-oss/sdk/src -type f -name "*.ts" -print0 | while IFS= read -r -d '' file; do
  # Replace @snapback/infrastructure with @snapback-oss/infrastructure
  sed -i.bak 's/@snapback\/infrastructure/@snapback-oss\/infrastructure/g' "$file"

  # Replace @snapback/contracts with @snapback-oss/contracts
  sed -i.bak 's/@snapback\/contracts/@snapback-oss\/contracts/g' "$file"

  # Remove .bak file
  rm "${file}.bak" 2>/dev/null || true
done

echo "   Updated imports in source files"

# Step 4: Remove better-sqlite3 postinstall script
echo "📝 Removing better-sqlite3 postinstall..."

# Remove postinstall script from package.json
if [ -f "packages-oss/sdk/package.json" ]; then
  # Check if scripts/postinstall.js exists and references better-sqlite3
  POSTINSTALL_SCRIPT="packages-oss/sdk/scripts/postinstall.js"
  if [ -f "$POSTINSTALL_SCRIPT" ]; then
    echo "   ⚠️  Found postinstall script - reviewing..."
    if grep -q "better-sqlite3" "$POSTINSTALL_SCRIPT"; then
      echo "   Removing better-sqlite3 postinstall script"
      rm "$POSTINSTALL_SCRIPT"
    fi
  fi
fi

# TODO(phase1): Remove better-sqlite3 dynamic import from source code
# FIXME(phase1): Search for dynamic imports and conditional requires
echo "⚠️  MANUAL ACTION REQUIRED:"
echo "   Search for better-sqlite3 dynamic imports in SDK:"
echo "   grep -r \"better-sqlite3\" packages-oss/sdk/src"
echo ""
echo "   If found, remove or make them conditional on a feature flag"

# Step 5: Update test files
echo "🧪 Updating test imports..."

if [ -d "packages-oss/sdk/tests" ]; then
  find packages-oss/sdk/tests -type f -name "*.ts" -print0 | while IFS= read -r -d '' file; do
    sed -i.bak 's/@snapback\/infrastructure/@snapback-oss\/infrastructure/g' "$file"
    sed -i.bak 's/@snapback\/contracts/@snapback-oss\/contracts/g' "$file"
    rm "${file}.bak" 2>/dev/null || true
  done
fi

# Step 6: Copy config files
echo "📋 Copying build configs..."
[ -f "packages/sdk/tsconfig.json" ] && cp packages/sdk/tsconfig.json packages-oss/sdk/
[ -f "packages/sdk/tsconfig.build.json" ] && cp packages/sdk/tsconfig.build.json packages-oss/sdk/
[ -f "packages/sdk/tsup.config.ts" ] && cp packages/sdk/tsup.config.ts packages-oss/sdk/

# Step 7: Create README
cat > packages-oss/sdk/README.md << 'EOF'
# @snapback-oss/sdk

SnapBack SDK for TypeScript/JavaScript.

## Installation

```bash
npm install @snapback-oss/sdk
# or
pnpm add @snapback-oss/sdk
```

## Usage

```typescript
import { Snapback, SnapshotClient } from "@snapback-oss/sdk";

const snapback = new Snapback({
  apiKey: process.env.SNAPBACK_API_KEY
});

// Create a snapshot
await snapback.snapshot.create({
  files: [...]
});
```

## Features

- Local snapshot storage
- File change analysis
- Risk analysis (configurable thresholds)
- Session management
- Cloud backup (S3 compatible)

## License

Apache-2.0

---

**Community Edition**: This is the open-source version. For advanced features like ML-powered risk detection and team collaboration, see [SnapBack Pro](https://snapback.dev).
EOF

echo "✅ SDK migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Search for better-sqlite3 usage: grep -r \"better-sqlite3\" packages-oss/sdk/src"
echo "2. Run: pnpm install"
echo "3. Run: pnpm --filter @snapback-oss/sdk build"
echo "4. Run: pnpm --filter @snapback-oss/sdk test"
echo "5. Run: pnpm test -- sdk-migration"
echo ""
echo "🔍 Validation:"
echo "   grep -r \"@snapback/infrastructure\" packages-oss/sdk/src  # Should be empty"
echo "   grep -r \"@snapback/contracts\" packages-oss/sdk/src  # Should be empty"
echo "   grep -r \"@snapback-oss\" packages-oss/sdk/src  # Should find matches"

# VALIDATE(phase1): Manual review of dynamic imports recommended
# TODO(phase1): Add automated check for private package imports
