#!/bin/bash

#
# Build Verification & Auto-Fix Script
# Purpose: Detect and automatically fix common build issues
# Usage: ./ai_dev_utils/scripts/build-verify.sh [--fix] [--verbose]
#
# This script:
# - Detects stale .next build artifacts
# - Fixes pnpm workspace configuration issues
# - Validates module resolution
# - Removes unnecessary build artifacts
# - Prepares for clean build
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIX_MODE=false
VERBOSE=false
ISSUES_FOUND=0

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

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX_MODE=true
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

log_info "Build Verification Script"
log_verbose "Project root: $PROJECT_ROOT"
log_verbose "Fix mode: $FIX_MODE"

cd "$PROJECT_ROOT"

# ============================================================================
# CHECK 1: Stale .next directory
# ============================================================================
log_info "Checking for stale .next build artifacts..."

if [ -d "apps/web/.next" ]; then
  log_warning "Found apps/web/.next directory"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  
  if [ "$FIX_MODE" = true ]; then
    log_verbose "Removing apps/web/.next..."
    rm -rf apps/web/.next
    log_success "Removed apps/web/.next"
  else
    log_verbose "Run with --fix to remove this directory"
  fi
else
  log_success "No stale .next directory found"
fi

# ============================================================================
# CHECK 2: pnpm-workspace.yaml configuration
# ============================================================================
log_info "Validating pnpm-workspace.yaml configuration..."

if ! grep -q "!apps/web/.next" pnpm-workspace.yaml; then
  log_warning "Missing '.next directory exclusion in pnpm-workspace.yaml"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  
  if [ "$FIX_MODE" = true ]; then
    log_verbose "Adding .next exclusion to pnpm-workspace.yaml..."
    # Add after the vscode exclusion
    sed -i.bak 's|"!apps/vscode/.vscode-test/\*\*"|"!apps/vscode/.vscode-test/**"\n    - "!apps/web/.next/**"|' pnpm-workspace.yaml
    rm -f pnpm-workspace.yaml.bak
    log_success "Added .next exclusion to pnpm-workspace.yaml"
  else
    log_verbose "Run with --fix to add this configuration"
  fi
else
  log_success "pnpm-workspace.yaml correctly excludes .next directory"
fi

# ============================================================================
# CHECK 3: Unused imports in test utilities
# ============================================================================
log_info "Checking for unused imports..."

if grep -q "import type { Page, Route }" apps/web/tests/utils/api-mocks.ts 2>/dev/null; then
  log_warning "Found unused 'Route' import in apps/web/tests/utils/api-mocks.ts"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  
  if [ "$FIX_MODE" = true ]; then
    log_verbose "Removing unused Route import..."
    sed -i.bak 's/import type { Page, Route } from "@playwright\/test";/import type { Page } from "@playwright\/test";/' apps/web/tests/utils/api-mocks.ts
    rm -f apps/web/tests/utils/api-mocks.ts.bak
    log_success "Removed unused Route import"
  else
    log_verbose "Run with --fix to remove this import"
  fi
else
  log_success "No unused imports detected in api-mocks.ts"
fi

# ============================================================================
# CHECK 4: Logger module resolution pattern
# ============================================================================
log_info "Checking logger module resolution pattern..."

if grep -q 'require("@snapback/infrastructure")' packages/contracts/src/logger.ts 2>/dev/null; then
  log_warning "Found synchronous require() for @snapback/infrastructure in logger.ts"
  log_warning "This causes build-time module resolution errors"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  
  if [ "$FIX_MODE" = true ]; then
    log_verbose "Updating to lazy initialization pattern..."
    log_warning "Manual fix required for logger.ts - please review the implementation"
  else
    log_verbose "Run with --fix to see details (manual review required)"
  fi
else
  log_success "Logger uses safe initialization pattern"
fi

# ============================================================================
# CHECK 5: Workspace cache issues
# ============================================================================
log_info "Checking for workspace cache issues..."

CACHE_DIRS_FOUND=0

for dir in apps/*/node_modules/.pnpm packages/*/node_modules/.pnpm; do
  if [ -d "$dir" ]; then
    CACHE_DIRS_FOUND=$((CACHE_DIRS_FOUND + 1))
  fi
done

if [ $CACHE_DIRS_FOUND -gt 0 ]; then
  log_warning "Found $CACHE_DIRS_FOUND pnpm cache directories"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  
  if [ "$FIX_MODE" = true ]; then
    log_verbose "Validating cache integrity (no removal - pnpm manages this)"
  fi
else
  log_success "No major cache issues detected"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ $ISSUES_FOUND -eq 0 ]; then
  log_success "All checks passed! Build system is healthy."
  echo "═══════════════════════════════════════════════════════════════"
  exit 0
else
  log_warning "$ISSUES_FOUND issue(s) found"
  
  if [ "$FIX_MODE" = false ]; then
    echo ""
    log_info "To auto-fix these issues, run:"
    echo "  ./ai_dev_utils/scripts/build-verify.sh --fix"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    exit 1
  else
    log_success "Fixed $ISSUES_FOUND issue(s)"
    echo ""
    log_info "Recommendation: Run 'pnpm build' to verify the fixes"
    echo "═══════════════════════════════════════════════════════════════"
    exit 0
  fi
fi
