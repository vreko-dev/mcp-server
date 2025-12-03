#!/usr/bin/env bash
# Phase 1 - Setup OSS Packages Directory Structure
# Creates packages-oss/ with proper TypeScript/Turborepo configuration

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Phase 1: Setting up OSS packages directory structure..."
echo "Root: $ROOT_DIR"

# TODO(phase1): Add dry-run mode flag
# Usage: ./setup-oss-packages.sh --dry-run

cd "$ROOT_DIR"

# Step 1: Create packages-oss directory
echo "📁 Creating packages-oss/ directory..."
mkdir -p packages-oss

# Step 2: Create subdirectories for OSS packages
echo "📁 Creating package subdirectories..."
mkdir -p packages-oss/infrastructure/{src,test}
mkdir -p packages-oss/contracts/{src,test}
mkdir -p packages-oss/sdk/{src,test}
mkdir -p packages-oss/config/{src,test}
mkdir -p packages-oss/events/{src,test}

# Step 3: Create shared TypeScript config for OSS packages
echo "📝 Creating tsconfig.base.json for OSS packages..."
cat > packages-oss/tsconfig.base.json << 'EOF'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
EOF

# Step 4: Create package.json templates
echo "📝 Creating package.json for infrastructure..."
cat > packages-oss/infrastructure/package.json << 'EOF'
{
  "name": "@snapback-oss/infrastructure",
  "version": "0.1.0",
  "description": "Generic infrastructure utilities (logging, metrics, tracing)",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsup && tsc --build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pino": "catalog:",
    "nanoid": "catalog:"
  },
  "devDependencies": {
    "@snapback/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./logging": {
      "types": "./dist/logging/logger.d.ts",
      "default": "./dist/logging/logger.js"
    },
    "./metrics": {
      "types": "./dist/metrics/index.d.ts",
      "default": "./dist/metrics/index.js"
    },
    "./tracing": {
      "types": "./dist/tracing/index.d.ts",
      "default": "./dist/tracing/index.js"
    }
  }
}
EOF

# TODO(phase1): Create package.json for contracts
echo "📝 Creating package.json for contracts..."
cat > packages-oss/contracts/package.json << 'EOF'
{
  "name": "@snapback-oss/contracts",
  "version": "0.1.0",
  "description": "Type definitions and contracts for SnapBack OSS",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "node scripts/build.contracts.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "catalog:",
    "nanoid": "catalog:",
    "@asteasolutions/zod-to-openapi": "catalog:"
  },
  "devDependencies": {
    "@snapback/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
EOF

# TODO(phase1): Create package.json for sdk
echo "📝 Creating package.json for SDK..."
cat > packages-oss/sdk/package.json << 'EOF'
{
  "name": "@snapback-oss/sdk",
  "version": "0.1.0",
  "description": "SnapBack SDK for OSS users",
  "main": "dist/index.js",
  "types": "dist-types/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsup && tsc --emitDeclarationOnly --outDir dist-types -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@snapback-oss/contracts": "workspace:*",
    "@snapback-oss/infrastructure": "workspace:*",
    "zod": "catalog:",
    "ky": "catalog:",
    "minimatch": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
EOF

# Step 5: Update Turborepo configuration
echo "📝 Updating turbo.json..."
# TODO(phase1): This is a placeholder - actual turbo.json update needs to preserve existing config
if [ -f turbo.json ]; then
  echo "⚠️  Manual action required: Add packages-oss/* to turbo.json pipeline"
  echo "   Open turbo.json and ensure packages-oss packages are included"
fi

# Step 6: Update pnpm-workspace.yaml
echo "📝 Updating pnpm-workspace.yaml..."
if grep -q "packages-oss/\*" pnpm-workspace.yaml 2>/dev/null; then
  echo "✅ pnpm-workspace.yaml already includes packages-oss"
else
  echo "⚠️  Manual action required: Add 'packages-oss/*' to pnpm-workspace.yaml"
fi

# Step 7: Create README files
echo "📝 Creating README files..."
cat > packages-oss/README.md << 'EOF'
# SnapBack OSS Packages

This directory contains open-source packages that will be synced to the public `snapback-oss` repository.

## Packages

- **infrastructure** - Generic logging, metrics, and tracing utilities
- **contracts** - TypeScript types and Zod schemas (filtered from private repo)
- **sdk** - Client SDK for interacting with SnapBack
- **config** - Configuration utilities
- **events** - Event bus implementation

## Development

```bash
# Build all OSS packages
pnpm --filter "@snapback-oss/*" build

# Test all OSS packages
pnpm --filter "@snapback-oss/*" test

# Typecheck
pnpm --filter "@snapback-oss/*" typecheck
```

## Rules

**Never add**:
- Database schemas
- Proprietary algorithms
- Analytics/telemetry code
- Subscription/tier logic
- Internal platform code

All code here must be safe for public consumption.
EOF

echo "✅ Directory structure created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Run validation tests: pnpm test -- validate-oss-structure"
echo "2. Update pnpm-workspace.yaml to include 'packages-oss/*'"
echo "3. Update turbo.json to include packages-oss in pipeline"
echo "4. Run: pnpm install"
echo ""
echo "🔍 Validation:"
echo "   tree packages-oss -L 2"
