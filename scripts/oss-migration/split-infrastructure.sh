#!/usr/bin/env bash
# Phase 1 - Split Infrastructure Package
# Copies logging/metrics/tracing to OSS, moves PostHog to analytics-infra

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔀 Phase 1: Splitting infrastructure package..."
cd "$ROOT_DIR"

# TODO(phase1): Add --dry-run and --verify flags

# Step 1: Copy logging utilities to OSS
echo "📋 Copying logging utilities to packages-oss/infrastructure..."
mkdir -p packages-oss/infrastructure/src/logging
cp -r packages/infrastructure/src/logging/* packages-oss/infrastructure/src/logging/

# Step 2: Copy metrics to OSS
echo "📋 Copying metrics to packages-oss/infrastructure..."
mkdir -p packages-oss/infrastructure/src/metrics
cp -r packages/infrastructure/src/metrics/* packages-oss/infrastructure/src/metrics/

# Step 3: Copy tracing to OSS
echo "📋 Copying tracing to packages-oss/infrastructure..."
mkdir -p packages-oss/infrastructure/src/tracing
cp -r packages/infrastructure/src/tracing/* packages-oss/infrastructure/src/tracing/

# Step 4: Create index.ts for OSS infrastructure (without PostHog)
echo "📝 Creating packages-oss/infrastructure/src/index.ts..."
cat > packages-oss/infrastructure/src/index.ts << 'EOF'
// OSS Infrastructure Exports
// NOTE: NO PostHog/analytics - that's in private @snapback/analytics-infra

export * from "./logging/logger.js";
export * from "./metrics/index.js";
export * from "./tracing/index.js";

// TODO(phase1): Verify these exports match what consumers need
EOF

# Step 5: Create analytics-infra package (private) for PostHog
echo "📁 Creating packages/analytics-infra for PostHog..."
mkdir -p packages/analytics-infra/src/posthog
mkdir -p packages/analytics-infra/test

# Copy PostHog code to analytics-infra
if [ -d "packages/infrastructure/src/posthog" ]; then
  echo "📋 Moving PostHog to analytics-infra..."
  cp -r packages/infrastructure/src/posthog/* packages/analytics-infra/src/posthog/
else
  echo "⚠️  PostHog directory not found in infrastructure - may already be split"
fi

# Step 6: Create package.json for analytics-infra
echo "📝 Creating packages/analytics-infra/package.json..."
cat > packages/analytics-infra/package.json << 'EOF'
{
  "name": "@snapback/analytics-infra",
  "version": "0.1.0",
  "description": "Internal analytics infrastructure (PostHog, metrics)",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsup && tsc --build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@snapback-oss/infrastructure": "workspace:*",
    "@snapback/contracts": "workspace:*",
    "posthog-node": "catalog:",
    "pino": "catalog:"
  },
  "devDependencies": {
    "@snapback/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "posthog-js": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
EOF

# Step 7: Create index.ts for analytics-infra
cat > packages/analytics-infra/src/index.ts << 'EOF'
// Private Analytics Infrastructure
export * from "./posthog/index.js";

// Re-export generic infrastructure for convenience
export * from "@snapback-oss/infrastructure";
EOF

# Step 8: Update imports in private packages
echo "🔄 Updating imports in private packages..."

# FIXME(phase1): This is a naive replacement - needs more sophisticated handling
# Should use AST transformation or manual review for complex cases

echo "⚠️  MANUAL ACTION REQUIRED:"
echo "   Find all imports of '@snapback/infrastructure' that use PostHog"
echo "   Update them to '@snapback/analytics-infra'"
echo ""
echo "   Search command:"
echo "   grep -r \"@snapback/infrastructure.*posthog\" packages/ apps/"
echo ""
echo "   After manual update, run:"
echo "   pnpm test -- infrastructure-split"

# TODO(phase1): Implement automated import rewriting with codemod
# Future: Use jscodeshift or ts-morph to rewrite imports automatically

# Step 9: Copy tsconfig
cp packages/infrastructure/tsconfig.json packages-oss/infrastructure/tsconfig.json 2>/dev/null || true
cp packages/infrastructure/tsconfig.build.json packages-oss/infrastructure/tsconfig.build.json 2>/dev/null || true
cp packages/infrastructure/tsup.config.ts packages-oss/infrastructure/tsup.config.ts 2>/dev/null || true

echo "✅ Infrastructure split complete!"
echo ""
echo "📋 Remaining manual steps:"
echo "1. Review and update imports in:"
echo "   - packages/platform"
echo "   - packages/analytics"
echo "   - apps/api"
echo "   - apps/web"
echo "2. Run: pnpm install"
echo "3. Run: pnpm build"
echo "4. Run: pnpm test -- infrastructure-split"
echo ""
echo "🔍 Validation:"
echo "   grep -r 'posthog' packages-oss/infrastructure/src  # Should be empty"
echo "   grep -r '@snapback/infrastructure.*posthog' packages/  # Find updates needed"
