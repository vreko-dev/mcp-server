#!/usr/bin/env bash
#
# Config Refactor Cleanup Executor
#
# TDD_CORE.md Compliance:
# - Line 88: 7-day cooldown mandatory BEFORE cleanup
# - Line 51: Backup current state
# - Line 53: Implement rollback capability
#
# Purpose: Safely archive and remove v1 ConfigStore after validation
# Usage: ./ai_dev_utils/scripts/execute-cleanup.sh
#
# Safety: This script MUST only run after validate-rollout-prerequisites.sh passes
#
# Exit Codes:
#   0 = Cleanup successful
#   1 = Prerequisites not met
#   2 = Archival failed
#   3 = Deletion failed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$SCRIPT_DIR/../.."
CLEANUP_QUEUE="${SCRIPT_DIR}/../state/config-refactor/cleanup-queue.json"
ARCHIVE_DIR="$WORKSPACE_ROOT/.archive/$(date +%Y-%m-%d)"

echo "========================================="
echo "Config Refactor Cleanup Executor"
echo "========================================="
echo ""

# ============================================================================
# PREREQUISITE CHECK
# ============================================================================
echo "Running prerequisite validation..."
echo ""

if ! "$SCRIPT_DIR/validate-rollout-prerequisites.sh"; then
  echo ""
  echo -e "${RED}❌ PREREQUISITES NOT MET${NC}"
  echo -e "${RED}Cannot proceed with cleanup.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Prerequisites validated${NC}"
echo ""

# ============================================================================
# CONFIRM WITH USER
# ============================================================================
echo -e "${YELLOW}⚠️  WARNING: This will DELETE the following files:${NC}"
echo ""

FILES_TO_DELETE=$(jq -r '.items[0].files[]' "$CLEANUP_QUEUE")
echo "$FILES_TO_DELETE" | while IFS= read -r file; do
  FULL_PATH="$WORKSPACE_ROOT/$file"
  if [ -f "$FULL_PATH" ]; then
    LINES=$(wc -l < "$FULL_PATH" | tr -d ' ')
    echo "  - $file ($LINES lines)"
  else
    echo "  - $file (NOT FOUND)"
  fi
done

echo ""
read -p "Are you sure you want to proceed? (type 'DELETE' to confirm): " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE" ]; then
  echo ""
  echo -e "${YELLOW}Cleanup cancelled by user.${NC}"
  exit 0
fi

# ============================================================================
# CREATE ARCHIVE
# ============================================================================
echo ""
echo "Creating archive..."

mkdir -p "$ARCHIVE_DIR"

ARCHIVE_FILE="$ARCHIVE_DIR/ARC_OLD_CONFIG_STORE_V1.tar.gz"

# Archive files
TEMP_ARCHIVE_DIR=$(mktemp -d)
trap "rm -rf $TEMP_ARCHIVE_DIR" EXIT

echo "$FILES_TO_DELETE" | while IFS= read -r file; do
  FULL_PATH="$WORKSPACE_ROOT/$file"
  if [ -f "$FULL_PATH" ]; then
    DEST_DIR="$TEMP_ARCHIVE_DIR/$(dirname "$file")"
    mkdir -p "$DEST_DIR"
    cp "$FULL_PATH" "$DEST_DIR/"
    echo "  Archived: $file"
  fi
done

# Create tarball
cd "$TEMP_ARCHIVE_DIR"
tar -czf "$ARCHIVE_FILE" .
cd "$WORKSPACE_ROOT"

if [ ! -f "$ARCHIVE_FILE" ]; then
  echo -e "${RED}❌ Archive creation failed${NC}"
  exit 2
fi

ARCHIVE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
echo -e "${GREEN}✅ Archive created: $ARCHIVE_FILE ($ARCHIVE_SIZE)${NC}"

# ============================================================================
# DELETE FILES
# ============================================================================
echo ""
echo "Deleting files..."

DELETED_LINES=0

echo "$FILES_TO_DELETE" | while IFS= read -r file; do
  FULL_PATH="$WORKSPACE_ROOT/$file"
  if [ -f "$FULL_PATH" ]; then
    LINES=$(wc -l < "$FULL_PATH" | tr -d ' ')
    DELETED_LINES=$((DELETED_LINES + LINES))
    rm "$FULL_PATH"
    echo "  Deleted: $file ($LINES lines)"
  else
    echo "  Skipped: $file (not found)"
  fi
done

echo -e "${GREEN}✅ Files deleted ($DELETED_LINES lines removed)${NC}"

# ============================================================================
# UPDATE CLEANUP QUEUE
# ============================================================================
echo ""
echo "Updating cleanup queue..."

jq '.items[0].status = "COMPLETE" |
    .items[0].completed_at = now |
    .items[0].archive_location = "'"$ARCHIVE_FILE"'"' \
  "$CLEANUP_QUEUE" > "$CLEANUP_QUEUE.tmp"

mv "$CLEANUP_QUEUE.tmp" "$CLEANUP_QUEUE"

echo -e "${GREEN}✅ Cleanup queue updated${NC}"

# ============================================================================
# VERIFICATION
# ============================================================================
echo ""
echo "Verifying cleanup..."

# Check that files are actually gone
VERIFICATION_FAILED=false
echo "$FILES_TO_DELETE" | while IFS= read -r file; do
  FULL_PATH="$WORKSPACE_ROOT/$file"
  if [ -f "$FULL_PATH" ]; then
    echo -e "${RED}  ❌ File still exists: $file${NC}"
    VERIFICATION_FAILED=true
  fi
done

if [ "$VERIFICATION_FAILED" = true ]; then
  echo ""
  echo -e "${RED}❌ VERIFICATION FAILED${NC}"
  echo -e "${YELLOW}Some files were not deleted. Check permissions.${NC}"
  exit 3
fi

# Check that archive is accessible
if [ ! -r "$ARCHIVE_FILE" ]; then
  echo -e "${RED}❌ Archive not readable: $ARCHIVE_FILE${NC}"
  exit 2
fi

echo -e "${GREEN}✅ Cleanup verified${NC}"

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "========================================="
echo -e "${GREEN}✅ CLEANUP COMPLETE${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  - Files deleted: $(echo "$FILES_TO_DELETE" | wc -l | tr -d ' ')"
echo "  - Lines removed: $DELETED_LINES"
echo "  - Archive: $ARCHIVE_FILE ($ARCHIVE_SIZE)"
echo ""
echo "Next steps:"
echo "  1. Run tests: pnpm --filter @snapback/config test"
echo "  2. Check git status: git status"
echo "  3. Commit cleanup: git commit -m 'cleanup: Remove v1 ConfigStore after 7-day validation'"
echo ""
echo -e "${YELLOW}NOTE: Archive can be restored from: $ARCHIVE_FILE${NC}"

