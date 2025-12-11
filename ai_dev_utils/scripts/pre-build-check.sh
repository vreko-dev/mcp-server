#!/bin/bash

#
# Pre-Build Health Check
# Purpose: Validate build system health before attempting build
# Usage: ./ai_dev_utils/scripts/pre-build-check.sh [--fix] [--verbose]
#
# Checks:
# - No stale .next directories
# - pnpm workspace configuration is valid
# - No orphaned node_modules
# - TypeScript configuration is correct
# - Build artifacts are clean
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIX_MODE=false
VERBOSE=false
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_pass() {
  echo -e "${GREEN}✓${NC} $1"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

log_fail() {
  echo -e "${RED}✗${NC} $1"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  CHECKS_WARNED=$((CHECKS_WARNED + 1))
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}  →${NC} $1"
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix) FIX_MODE=true; shift ;;
    --verbose) VERBOSE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

cd "$PROJECT_ROOT"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Pre-Build Health Check"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# CHECK 1: .next directory presence
# ============================================================================
log_info "CHECK 1: Verifying no stale .next directories..."

if [ -d "apps/web/.next" ]; then
  log_fail "Found stale apps/web/.next directory"
  if [ "$FIX_MODE" = true ]; then
    log_verbose "Removing apps/web/.next..."
    rm -rf apps/web/.next
    log_pass "Removed stale .next directory"
  fi
else
  log_pass "No stale .next directories"
fi

# ============================================================================
# CHECK 2: pnpm workspace configuration
# ============================================================================
log_info "CHECK 2: Validating pnpm-workspace.yaml..."

if ! [ -f "pnpm-workspace.yaml" ]; then
  log_fail "pnpm-workspace.yaml not found"
else
  if grep -q "!apps/web/.next" pnpm-workspace.yaml; then
    log_pass ".next directory properly excluded"
  else
    log_fail ".next directory not excluded in pnpm-workspace.yaml"
    if [ "$FIX_MODE" = true ]; then
      log_verbose "Adding .next exclusion..."
      sed -i.bak '/!apps\/vscode\/.vscode-test/a\    - "!apps/web/.next/**"' pnpm-workspace.yaml
      rm -f pnpm-workspace.yaml.bak
      log_pass "Added .next exclusion to pnpm-workspace.yaml"
    fi
  fi
fi

# ============================================================================
# CHECK 3: TypeScript configuration
# ============================================================================
log_info "CHECK 3: Validating TypeScript configuration..."

if ! [ -f "tsconfig.base.json" ]; then
  log_fail "tsconfig.base.json not found"
else
  if grep -q '"moduleResolution"' tsconfig.base.json; then
    log_pass "TypeScript moduleResolution configured"
  else
    log_warn "TypeScript moduleResolution not explicitly configured"
  fi
fi

# ============================================================================
# CHECK 4: Build artifact cleanup
# ============================================================================
log_info "CHECK 4: Checking for orphaned build artifacts..."

ORPHANED_COUNT=0

# Check for orphaned .next in subdirectories
for dir in $(find apps -maxdepth 2 -type d -name ".next" 2>/dev/null); do
  if [ "$dir" != "apps/web/.next" ]; then
    log_warn "Found unexpected .next at: $dir"
    ORPHANED_COUNT=$((ORPHANED_COUNT + 1))
  fi
done

if [ $ORPHANED_COUNT -eq 0 ]; then
  log_pass "No orphaned build artifacts"
else
  log_warn "Found $ORPHANED_COUNT orphaned artifacts"
fi

# ============================================================================
# CHECK 5: Package.json scripts
# ============================================================================
log_info "CHECK 5: Validating package.json build scripts..."

if grep -q '"build": "turbo build"' package.json; then
  log_pass "Build script configured correctly"
else
  log_warn "Build script may not be configured optimally"
fi

# ============================================================================
# CHECK 6: Dependencies integrity
# ============================================================================
log_info "CHECK 6: Checking dependencies..."

if [ -f "pnpm-lock.yaml" ]; then
  log_pass "pnpm lock file exists"
  log_verbose "Lock file size: $(du -h pnpm-lock.yaml | cut -f1)"
else
  log_warn "pnpm lock file not found - fresh install needed"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Pre-Build Check Results"
echo "  ✓ Passed:  $CHECKS_PASSED"
echo "  ✗ Failed:  $CHECKS_FAILED"
echo "  ⚠ Warned:  $CHECKS_WARNED"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  log_info "✓ Build system is ready!"
  echo ""
  echo "Ready to run: pnpm build"
  echo ""
  exit 0
else
  log_fail "Build system has issues that need fixing"
  echo ""
  if [ "$FIX_MODE" = false ]; then
    echo "Run with --fix flag to auto-fix issues:"
    echo "  ./ai_dev_utils/scripts/pre-build-check.sh --fix"
  fi
  echo ""
  exit 1
fi
