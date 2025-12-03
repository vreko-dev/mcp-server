#!/usr/bin/env bash
# Phase 1 - Master Execution Script
# Runs all migration steps in sequence with validation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Phase 1: OSS Package Migration - Master Execution"
echo "===================================================="
echo ""
echo "This script will:"
echo "1. Set up packages-oss/ directory structure"
echo "2. Split infrastructure package (logging → OSS, PostHog → private)"
echo "3. Filter contracts package (remove 4 IP-sensitive files)"
echo "4. Migrate SDK to OSS (update dependencies)"
echo "5. Run validation tests"
echo ""

# Safety confirmation
read -p "Continue with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Migration cancelled"
  exit 0
fi

cd "$ROOT_DIR"

# Function to run a step and handle errors
run_step() {
  local step_name="$1"
  local script_path="$2"
  local test_name="$3"

  echo ""
  echo "======================================"
  echo "Step: $step_name"
  echo "======================================"

  # Run the migration script
  if [ -f "$script_path" ]; then
    bash "$script_path"
  else
    echo "⚠️  Script not found: $script_path"
    return 1
  fi

  # Run tests if specified
  if [ -n "$test_name" ]; then
    echo ""
    echo "Running tests: modon$test_name"
    pnpm test -- "$test_name" || {
      echo "❌ Tests failed for $step_name"
      echo "Run rollback?: bash scripts/oss-migration/migration-rollback.sh"
      exit 1
    }
  fi

  echo "✅ $step_name complete"
}

# Step 1: Setup OSS packages directory
run_step \
  "Setup OSS Packages" \
  "scripts/oss-migration/setup-oss-packages.sh" \
  "validate-oss-structure"

# Step 2: Split infrastructure
run_step \
  "Split Infrastructure" \
  "scripts/oss-migration/split-infrastructure.sh" \
  "infrastructure-split"

# Manual intervention needed here
echo ""
echo "⚠️  MANUAL ACTION REQUIRED:"
echo "Review and update PostHog imports in private packages:"
echo "  grep -r \"@snapback/infrastructure.*posthog\" packages/ apps/"
echo ""
read -p "Have you updated PostHog imports? (yes/skip): " IMPORTS_UPDATED

if [ "$IMPORTS_UPDATED" != "yes" ] && [ "$IMPORTS_UPDATED" != "skip" ]; then
  echo "Please update imports before continuing"
  exit 1
fi

# Step 3: Filter contracts
run_step \
  "Filter Contracts" \
  "scripts/oss-migration/filter-contracts.sh" \
  "contracts-filter"

# Step 4: Migrate SDK
run_step \
  "Migrate SDK" \
  "scripts/oss-migration/migrate-sdk.sh" \
  "sdk-migration"

# Step 5: Update pnpm-workspace.yaml
echo ""
echo "======================================"
echo "Update Workspace Configuration"
echo "======================================"

if grep -q "packages-oss/\*" pnpm-workspace.yaml 2>/dev/null; then
  echo "✅ pnpm-workspace.yaml already includes packages-oss"
else
  echo "⚠️  Adding packages-oss/* to pnpm-workspace.yaml..."

  # Backup original
  cp pnpm-workspace.yaml pnpm-workspace.yaml.backup

  # Add packages-oss/* to packages list
  # TODO(phase1): Make this more robust with YAML parsing
  echo "   Manual edit recommended - adding line to end of packages:"
  echo "   - 'packages-oss/*'"

  # For now, append a comment as a reminder
  echo "# TODO: Add 'packages-oss/*' to packages list above" >> pnpm-workspace.yaml
fi

# Step 6: Install dependencies
echo ""
echo "======================================"
echo "Install Dependencies"
echo "======================================"
echo "Running: pnpm install..."
pnpm install

# Step 7: Build all OSS packages
echo ""
echo "======================================"
echo "Build OSS Packages"
echo "======================================"
echo "Building OSS packages..."
pnpm --filter "@snapback-oss/*" build

# Step 8: Run full test suite
echo ""
echo "======================================"
echo "Final Validation"
echo "======================================"
echo "Running full test suite..."
pnpm test

echo ""
echo "✅ ✅ ✅ Phase 1 Migration Complete! ✅ ✅ ✅"
echo ""
echo "📋 Summary:"
echo "   - Created packages-oss/ directory"
echo "   - Split infrastructure (logging → OSS, PostHog → analytics-infra)"
echo "   - Filtered contracts (removed 4 IP-sensitive files)"
echo "   - Migrated SDK to OSS"
echo ""
echo "📁 New packages:"
echo "   - @snapback-oss/infrastructure"
echo "   - @snapback-oss/contracts"
echo "   - @snapback-oss/sdk"
echo "   - @snapback/analytics-infra (private)"
echo ""
echo "📋 Next steps (Phase 2):"
echo "   1. Extract policy-engine (2 weeks)"
echo "   2. Create VSCode OSS variant (2 weeks)"
echo "   3. Set up CI/CD sync (1 week)"
echo ""
echo "📊 Validation commands:"
echo "   tree packages-oss -L 2"
echo "   pnpm --filter \"@snapback-oss/*\" build"
echo "   pnpm --filter \"@snapback-oss/*\" test"
echo ""
echo "If you need to rollback:"
echo "   bash scripts/oss-migration/migration-rollback.sh"
