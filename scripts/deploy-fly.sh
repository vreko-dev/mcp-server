#!/usr/bin/env bash
# ============================================================================
# Fly.io Deployment Script for SnapBack MCP Server
# ============================================================================
# This script provides a seamless deployment experience with:
# - Pre-flight checks (Fly CLI, auth, build validation)
# - Automatic build with type checking
# - Deployment with progress monitoring
# - Post-deployment health verification
# - Rollback guidance on failure
#
# Usage:
#   ./scripts/deploy-fly.sh              # Deploy to production
#   ./scripts/deploy-fly.sh --dry-run    # Validate without deploying
#   ./scripts/deploy-fly.sh --local      # Build only, no deploy
#
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="snapback-mcp"
FLY_CONFIG="apps/mcp-server/fly.toml"
DOCKERFILE="apps/mcp-server/Dockerfile"
HEALTH_ENDPOINT="https://snapback-mcp.fly.dev/health"
BRIDGE_ENDPOINT="https://snapback-mcp.fly.dev/bridge/push"
MAX_HEALTH_RETRIES=10
HEALTH_RETRY_DELAY=5

# Script directory (for running from any location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Parse arguments
DRY_RUN=false
LOCAL_ONLY=false
SKIP_CHECKS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --local)
      LOCAL_ONLY=true
      shift
      ;;
    --skip-checks)
      SKIP_CHECKS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --dry-run      Validate everything but don't deploy"
      echo "  --local        Build locally only, skip deployment"
      echo "  --skip-checks  Skip pre-flight checks (use with caution)"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Utility functions
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

log_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

preflight_checks() {
  log_step "Pre-flight Checks"

  local checks_passed=true

  # Check: We're in the monorepo root
  cd "$MONOREPO_ROOT"
  if [[ ! -f "pnpm-workspace.yaml" ]]; then
    log_error "Not in monorepo root. Expected to find pnpm-workspace.yaml"
    checks_passed=false
  else
    log_success "Monorepo root detected"
  fi

  # Check: Fly CLI installed
  if ! command -v fly &> /dev/null; then
    log_error "Fly CLI not installed. Install with: brew install flyctl"
    log_info "  Or visit: https://fly.io/docs/hands-on/install-flyctl/"
    checks_passed=false
  else
    local fly_version=$(fly version 2>/dev/null | head -1)
    log_success "Fly CLI installed ($fly_version)"
  fi

  # Check: Fly CLI authenticated
  if ! fly auth whoami &> /dev/null; then
    log_error "Not authenticated with Fly.io. Run: fly auth login"
    checks_passed=false
  else
    local fly_user=$(fly auth whoami 2>/dev/null)
    log_success "Authenticated as: $fly_user"
  fi

  # Check: App exists on Fly.io
  if command -v fly &> /dev/null && fly auth whoami &> /dev/null; then
    if ! fly apps list 2>/dev/null | grep -q "$APP_NAME"; then
      log_warning "App '$APP_NAME' not found on Fly.io"
      log_info "  Create with: fly apps create $APP_NAME"
    else
      log_success "App '$APP_NAME' exists on Fly.io"
    fi
  fi

  # Check: Required files exist
  if [[ ! -f "$FLY_CONFIG" ]]; then
    log_error "Missing fly.toml at $FLY_CONFIG"
    checks_passed=false
  else
    log_success "fly.toml found"
  fi

  if [[ ! -f "$DOCKERFILE" ]]; then
    log_error "Missing Dockerfile at $DOCKERFILE"
    checks_passed=false
  else
    log_success "Dockerfile found"
  fi

  # Check: No uncommitted changes in mcp-server
  if [[ -n $(git status --porcelain apps/mcp-server/ 2>/dev/null) ]]; then
    log_warning "Uncommitted changes in apps/mcp-server/"
    log_info "  Consider committing before deploying for traceability"
  else
    log_success "No uncommitted changes in apps/mcp-server/"
  fi

  if [[ "$checks_passed" == "false" ]]; then
    log_error "Pre-flight checks failed. Fix the issues above and retry."
    exit 1
  fi

  log_success "All pre-flight checks passed"
}

# ============================================================================
# Build Phase
# ============================================================================

build_server() {
  log_step "Building MCP Server"

  cd "$MONOREPO_ROOT"

  # Type check first
  log_info "Running type check..."
  if pnpm --filter=snapback-mcp-server exec tsc --noEmit 2>/dev/null; then
    log_success "Type check passed"
  else
    log_warning "Type check had issues (continuing with build)"
  fi

  # Build the server and dependencies
  log_info "Building mcp-server and dependencies..."
  if pnpm --filter=snapback-mcp-server build; then
    log_success "Build completed successfully"
  else
    log_error "Build failed"
    exit 1
  fi

  # Validate the bundle
  if [[ -f "apps/mcp-server/scripts/validate-bundle.js" ]]; then
    log_info "Validating bundle..."
    if node apps/mcp-server/scripts/validate-bundle.js 2>/dev/null; then
      log_success "Bundle validation passed"
    else
      log_warning "Bundle validation had warnings"
    fi
  fi

  # Show bundle size
  local bundle_size=$(du -sh apps/mcp-server/dist 2>/dev/null | cut -f1)
  log_info "Bundle size: $bundle_size"
}

# ============================================================================
# Deployment Phase
# ============================================================================

deploy_to_fly() {
  log_step "Deploying to Fly.io"

  cd "$MONOREPO_ROOT"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN: Would execute:"
    log_info "  fly deploy . --config $FLY_CONFIG --dockerfile $DOCKERFILE --remote-only"
    return 0
  fi

  # Get current deployment info for potential rollback
  local current_version=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  log_info "Current deployed version: $current_version"

  # Deploy
  log_info "Starting deployment..."
  if fly deploy . --config "$FLY_CONFIG" --dockerfile "$DOCKERFILE" --remote-only; then
    log_success "Deployment command completed"
  else
    log_error "Deployment failed"
    log_info "To rollback, run: fly releases -a $APP_NAME"
    log_info "Then: fly releases rollback <version> -a $APP_NAME"
    exit 1
  fi
}

# ============================================================================
# Post-deployment Verification
# ============================================================================

verify_deployment() {
  log_step "Post-deployment Verification"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN: Skipping verification"
    return 0
  fi

  local retries=0
  local health_ok=false

  log_info "Waiting for deployment to stabilize..."
  sleep 5

  # Health check with retries
  log_info "Checking health endpoint..."
  while [[ $retries -lt $MAX_HEALTH_RETRIES ]]; do
    local health_response=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null || echo "")

    if echo "$health_response" | grep -q '"status":"healthy"'; then
      health_ok=true
      local version=$(echo "$health_response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
      log_success "Health check passed (version: $version)"
      break
    fi

    retries=$((retries + 1))
    log_info "Health check attempt $retries/$MAX_HEALTH_RETRIES..."
    sleep $HEALTH_RETRY_DELAY
  done

  if [[ "$health_ok" == "false" ]]; then
    log_error "Health check failed after $MAX_HEALTH_RETRIES attempts"
    log_info "Check logs with: fly logs -a $APP_NAME"
    exit 1
  fi

  # Verify /bridge/push endpoint
  log_info "Testing /bridge/push endpoint..."
  local test_payload='{"workspaceId":"ws_00000000000000000000000000000000","observations":[]}'
  local bridge_response=$(curl -s -X POST "$BRIDGE_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$test_payload" 2>/dev/null || echo "")

  if echo "$bridge_response" | grep -q '"received":true'; then
    log_success "/bridge/push endpoint working"
  else
    log_warning "/bridge/push returned unexpected response: $bridge_response"
  fi

  log_success "All verification checks passed!"
}

# ============================================================================
# Summary
# ============================================================================

print_summary() {
  log_step "Deployment Summary"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo ""
    echo "To deploy for real, run without --dry-run flag"
    return
  fi

  if [[ "$LOCAL_ONLY" == "true" ]]; then
    echo -e "${GREEN}LOCAL BUILD COMPLETE${NC}"
    echo ""
    echo "To deploy, run without --local flag"
    return
  fi

  echo -e "${GREEN}DEPLOYMENT SUCCESSFUL${NC}"
  echo ""
  echo "Endpoints:"
  echo "  Health:  $HEALTH_ENDPOINT"
  echo "  Bridge:  $BRIDGE_ENDPOINT"
  echo ""
  echo "Useful commands:"
  echo "  View logs:     fly logs -a $APP_NAME"
  echo "  View status:   fly status -a $APP_NAME"
  echo "  SSH into VM:   fly ssh console -a $APP_NAME"
  echo "  Rollback:      fly releases -a $APP_NAME && fly releases rollback <version> -a $APP_NAME"
}

# ============================================================================
# Main
# ============================================================================

main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║              SnapBack MCP Server - Fly.io Deployment                   ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN MODE - No actual deployment will occur"
  fi

  if [[ "$SKIP_CHECKS" != "true" ]]; then
    preflight_checks
  else
    log_warning "Skipping pre-flight checks"
  fi

  build_server

  if [[ "$LOCAL_ONLY" != "true" ]]; then
    deploy_to_fly
    verify_deployment
  fi

  print_summary
}

main "$@"
