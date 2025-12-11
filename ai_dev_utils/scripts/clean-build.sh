#!/bin/bash

#
# Enhanced Clean Build Script
# Purpose: Safely clean the entire build system without permission errors
# Usage: ./ai_dev_utils/scripts/clean-build.sh [--deep] [--verbose]
#
# Modes:
# - Default: Safe cleanup (removes build artifacts, preserves node_modules)
# - --deep: Full cleanup (removes everything including node_modules)
# - --verbose: Show detailed output
#

set +e  # Don't exit on errors - we want to attempt all cleanups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEEP_MODE=false
VERBOSE=false
CLEANUP_COUNT=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}  →${NC} $1"
  fi
}

# Safe directory removal function
safe_rm_rf() {
  local target="$1"
  local description="$2"
  
  if [ -z "$target" ] || [ "$target" = "/" ] || [ "$target" = "." ]; then
    log_error "Refusing to remove: $target (safety check failed)"
    return 1
  fi
  
  if [ -d "$target" ]; then
    log_verbose "Removing: $target"
    rm -rf "$target" 2>/dev/null
    if [ $? -eq 0 ]; then
      log_success "Cleaned: $description"
      CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
      return 0
    else
      log_warning "Could not fully clean: $description (may require manual cleanup)"
      return 1
    fi
  else
    log_verbose "Not found: $target"
    return 0
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --deep)
      DEEP_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

cd "$PROJECT_ROOT"

echo ""
echo "═══════════════════════════════════════════════════════════════"
log_info "Enhanced Build Cleanup Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ "$DEEP_MODE" = true ]; then
  log_warning "DEEP CLEANUP MODE: This will remove node_modules and reinstall"
  echo ""
fi

log_verbose "Project root: $PROJECT_ROOT"
log_verbose "Deep mode: $DEEP_MODE"

# ============================================================================
# STEP 1: Clean build artifacts
# ============================================================================
log_info "Step 1: Removing build artifacts..."

# Remove .next directories (Next.js)
for dir in apps/web/.next apps/docs/.next; do
  if [ -d "$dir" ]; then
    safe_rm_rf "$dir" ".next directory ($dir)"
  fi
done

# Remove dist directories
for dir in apps/*/dist packages/*/dist packages-config/*/dist packages-oss/*/dist; do
  if [ -d "$dir" ]; then
    safe_rm_rf "$dir" "dist directory ($dir)"
  fi
done

# Remove build directories
for dir in apps/*/build packages/*/build; do
  if [ -d "$dir" ]; then
    safe_rm_rf "$dir" "build directory ($dir)"
  fi
done

# ============================================================================
# STEP 2: Clean turbo cache
# ============================================================================
log_info "Step 2: Removing turbo cache..."

safe_rm_rf ".turbo" "turbo cache (.turbo)"

# Remove turbo cache files in all packages
find . -maxdepth 4 -type d -name .turbo 2>/dev/null | while read dir; do
  if [ -d "$dir" ]; then
    rm -rf "$dir" 2>/dev/null && log_verbose "Removed: $dir"
  fi
done

# ============================================================================
# STEP 3: Clean Next.js cache
# ============================================================================
log_info "Step 3: Removing Next.js caches..."

for dir in apps/web/.next/cache apps/docs/.next/cache; do
  if [ -d "$dir" ]; then
    safe_rm_rf "$dir" "Next.js cache ($dir)"
  fi
done

# ============================================================================
# STEP 4: Clean tsc incremental build state
# ============================================================================
log_info "Step 4: Removing TypeScript incremental build state..."

# Remove .tsbuildinfo files
find . -maxdepth 5 -name "*.tsbuildinfo" -type f 2>/dev/null | while read file; do
  rm -f "$file" && log_verbose "Removed: $file"
done

# ============================================================================
# STEP 5: Deep cleanup (optional)
# ============================================================================
if [ "$DEEP_MODE" = true ]; then
  log_info "Step 5: Deep cleanup (removing node_modules)..."
  
  # Remove all node_modules
  for dir in node_modules apps/*/node_modules packages/*/node_modules packages-config/*/node_modules packages-oss/*/node_modules tooling/*/node_modules; do
    if [ -d "$dir" ]; then
      safe_rm_rf "$dir" "node_modules ($dir)"
    fi
  done
  
  # Remove pnpm lock file to get fresh install
  log_verbose "Removing pnpm-lock.yaml..."
  rm -f pnpm-lock.yaml
  log_success "Cleaned: pnpm lock file"
  CLEANUP_COUNT=$((CLEANUP_COUNT + 1))
else
  log_info "Step 5: Skipping deep cleanup (use --deep flag to remove node_modules)"
fi

# ============================================================================
# STEP 6: Verify workspace health
# ============================================================================
log_info "Step 6: Verifying workspace health..."

# Check for orphaned .next directories
if find . -maxdepth 4 -type d -name ".next" 2>/dev/null | grep -q .; then
  log_warning "Warning: Found .next directories in workspace"
else
  log_success "No orphaned .next directories"
fi

# Check pnpm-workspace.yaml
if grep -q "!apps/web/.next" pnpm-workspace.yaml; then
  log_success "pnpm-workspace.yaml correctly excludes .next"
else
  log_warning "Warning: .next not properly excluded in pnpm-workspace.yaml"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════════"
log_success "Cleanup complete! Removed $CLEANUP_COUNT artifact groups"

if [ "$DEEP_MODE" = true ]; then
  echo ""
  log_info "Next steps:"
  echo "  1. Reinstall dependencies: pnpm install"
  echo "  2. Rebuild packages: pnpm build"
else
  echo ""
  log_info "Next steps:"
  echo "  1. Rebuild: pnpm build"
  echo "  2. For full cleanup, run: ./ai_dev_utils/scripts/clean-build.sh --deep"
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""

exit 0
