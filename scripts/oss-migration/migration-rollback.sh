#!/usr/bin/env bash
# Phase 1 - Migration Rollback Script
# Safely reverts OSS migration changes if needed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "⚠️  Phase 1: Migration Rollback"
echo "This will remove packages-oss/ and revert changes"
echo ""

# Safety confirmation
read -p "Are you sure you want to rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

cd "$ROOT_DIR"

# Step 1: Remove packages-oss directory
if [ -d "packages-oss" ]; then
  echo "📁 Removing packages-oss/..."
  rm -rf packages-oss
  echo "   Removed packages-oss/"
else
  echo "   packages-oss/ not found (already removed)"
fi

# Step 2: Remove analytics-infra if it was created
if [ -d "packages/analytics-infra" ]; then
  echo "📁 Removing packages/analytics-infra..."
  rm -rf packages/analytics-infra
  echo "   Removed analytics-infra"
fi

# Step 3: Restore backups if they exist
echo "🔄 Restoring backups..."

BACKUP_FILES=(
  "packages-oss/contracts/src/events/index.ts.backup"
  "packages-oss/contracts/src/index.ts.backup"
)

for backup in "${BACKUP_FILES[@]}"; do
  if [ -f "$backup" ]; then
    ORIGINAL="${backup%.backup}"
    echo "   Restoring: $ORIGINAL"
    mv "$backup" "$ORIGINAL"
  fi
done

# Step 4: Clean node_modules and reinstall
echo "🧹 Cleaning dependencies..."
rm -rf node_modules/.pnpm/@snapback-oss 2>/dev/null || true

echo "📦 Reinstalling dependencies..."
pnpm install

# Step 5: Rebuild
echo "🔨 Rebuilding monorepo..."
pnpm build

echo "✅ Rollback complete!"
echo ""
echo "📋 Verification:"
echo "   ls packages-oss  # Should not exist"
echo "   pnpm test  # Should pass with original code"

# TODO(phase1): Add more sophisticated backup/restore mechanism
# FIXME(phase1): This doesn't restore import changes in private packages
echo ""
echo "⚠️  Note: This rollback does NOT restore:"
echo "   - Import changes in private packages (manual review needed)"
echo "   - pnpm-workspace.yaml changes (if any)"
echo "   - turbo.json changes (if any)"
